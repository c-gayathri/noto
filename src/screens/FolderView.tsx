import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import * as repo from '@/core/repo'
import type { Folder, Note, ID } from '@/core/types'
import { cn } from '@/core/utils'
import { Icon } from '@/ui/Icon'
import { TopBar } from '@/ui/TopBar'
import { NoteCard, EmptyState, ColorDot } from '@/ui/cards'
import { FolderActionsSheet } from '@/ui/sheets'
import { Sheet, FolderRow } from '@/ui/sheets'
import { useNoteDrag } from '@/ui/useNoteDrag'
import { useDialogs, useToast } from '@/ui/Dialogs'
import { useLock } from '@/ui/Lock'

type Filter = 'all' | 'notes' | 'files' | 'audio' | 'cards'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'notes', label: 'Notes' },
  { key: 'files', label: 'Files' },
  { key: 'audio', label: 'Audio' },
  { key: 'cards', label: 'Cards' },
]

function matchesFilter(note: Note, filter: Filter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'notes':
      return note.blocks.some((b) => b.type === 'text' || b.type === 'checklist')
    case 'files':
      return note.blocks.some((b) => b.type === 'image' || b.type === 'file')
    case 'audio':
      return note.blocks.some((b) => b.type === 'audio')
    case 'cards':
      return note.blocks.some((b) => b.type === 'flashcards')
  }
}

export function FolderView() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const dialogs = useDialogs()
  const toast = useToast()
  const { ensureUnlocked, unlocked } = useLock()

  const folder = useLiveQuery(() => db.folders.get(id), [id], undefined)
  const notes = useLiveQuery(
    () => db.notes.filter((n) => n.folderId === id && !n.archived).toArray(),
    [id],
    [] as Note[]
  )

  const [actionsOpen, setActionsOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [selected, setSelected] = useState<Set<ID>>(new Set())
  const [moveOpen, setMoveOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes
      .filter((n) => matchesFilter(n, filter))
      .filter((n) => {
        if (!q) return true
        if (n.locked) return false
        if (n.title.toLowerCase().includes(q)) return true
        return JSON.stringify(n.blocks).toLowerCase().includes(q)
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
  }, [notes, filter, query])

  const pinned = filtered.filter((n) => n.pinned && !n.locked)
  const rest = filtered.filter((n) => !n.pinned && !n.locked)

  const openNote = async (n: Note) => {
    if (n.locked) {
      const ok = await ensureUnlocked()
      if (!ok) return
    }
    navigate(`/note/${n.id}`)
  }

  const drag = useNoteDrag(
    async (noteId) => {
      await repo.moveNote(noteId, null)
      toast.show('Moved to Unfiled', 'folder-move')
    },
    async (noteId) => {
      await repo.deleteNote(noteId)
      toast.show('Note deleted', 'trash')
    },
    (noteId) => setSelected((s) => new Set(s).add(noteId))
  )

  /* ---------------- bulk selection ---------------- */

  const inSelect = selected.size > 0
  const selectedNotes = notes.filter((n) => selected.has(n.id))
  const toggleSelect = (nid: ID) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(nid)) next.delete(nid)
      else next.add(nid)
      return next
    })

  const bulk = async (fn: (n: Note) => Promise<unknown>, msg: string) => {
    for (const n of selectedNotes) await fn(n)
    toast.show(msg)
    setSelected(new Set())
  }

  const bulkDelete = async () => {
    const ok = await dialogs.confirm({
      title: `Delete ${selected.size} note${selected.size === 1 ? '' : 's'}?`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    await bulk((n) => repo.deleteNote(n.id), `${selected.size} deleted`)
  }

  const noteCard = (n: Note) => (
    <NoteCard
      key={n.id}
      note={n}
      onOpen={() => {
        if (inSelect) toggleSelect(n.id)
        else void openNote(n)
      }}
      grid={view === 'grid'}
      selectMode={inSelect}
      selected={selected.has(n.id)}
      onToggleSelect={() => toggleSelect(n.id)}
      {...(inSelect ? {} : drag.bind(n.id))}
    />
  )

  if (folder === undefined) {
    return (
      <div className="screen screen-center">
        <EmptyState icon="folder" title="Folder not found" sub="It may have been deleted." />
      </div>
    )
  }

  // Locked gate
  if (folder.locked && !unlocked) {
    return (
      <div className="screen">
        <TopBar back />
        <div className="gate">
          <div className="gate-icon">
            <Icon name="lock" size={30} />
          </div>
          <h2>{folder.name}</h2>
          <p>This folder is private. Unlock with your passcode or biometrics to view its notes.</p>
          <div className="gate-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              Go back
            </button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                const ok = await ensureUnlocked()
                if (!ok) toast.show('Unlock cancelled', 'lock')
              }}
            >
              <Icon name="unlock" size={17} /> Unlock
            </button>
          </div>
        </div>
      </div>
    )
  }

  const visibleCount = notes.filter((n) => !n.locked).length

  return (
    <div className="screen">
      <TopBar
        back
        title={
          <span className="topbar-title-with-dot">
            <ColorDot color={folder.color} size={11} />
            {folder.name}
          </span>
        }
        subtitle={`${visibleCount} note${visibleCount === 1 ? '' : 's'}`}
        right={
          <>
            <button
              className={cn('icon-btn', view === 'grid' && 'icon-btn-active')}
              onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
              aria-label={view === 'grid' ? 'List view' : 'Grid view'}
            >
              <Icon name={view === 'grid' ? 'rows' : 'grid'} size={19} />
            </button>
            <button
              className={cn('icon-btn', folder.pinned && 'icon-btn-active')}
              onClick={() => void repo.updateFolder(folder.id, { pinned: !folder.pinned })}
              aria-label="Pin folder"
            >
              <Icon name="pin" size={19} />
            </button>
            <button className="icon-btn" onClick={() => setActionsOpen(true)} aria-label="Folder actions">
              <Icon name="more-h" size={21} />
            </button>
          </>
        }
      />

      <div className="search-pill search-pill-static">
        <Icon name="search" size={17} />
        <input placeholder="Search in folder" value={query} onChange={(e) => setQuery(e.target.value)} />
        {query && (
          <button className="icon-btn" onClick={() => setQuery('')} aria-label="Clear">
            <Icon name="x" size={15} />
          </button>
        )}
      </div>

      <div className="chip-row">
        {FILTERS.map((f) => (
          <button key={f.key} className={cn('chip', filter === f.key && 'chip-active')} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <section className="section">
        {inSelect && (
          <div className="bulk-bar bulk-bar-static">
            <div className="bulk-bar-info">
              <button className="icon-btn" onClick={() => setSelected(new Set())} aria-label="Exit selection">
                <Icon name="x" size={18} />
              </button>
              <span>
                {selected.size} selected
                <button
                  className="bulk-selectall"
                  onClick={() => setSelected(new Set(filtered.filter((n) => !n.locked).map((n) => n.id)))}
                >
                  Select all
                </button>
              </span>
            </div>
            <div className="bulk-bar-actions">
              <button className="icon-btn" onClick={() => void bulkDelete()} aria-label="Delete selected">
                <Icon name="trash" size={18} />
              </button>
              <button
                className="icon-btn"
                onClick={() => void bulk((n) => repo.updateNote(n.id, { pinned: true }), 'Pinned')}
                aria-label="Pin selected"
              >
                <Icon name="pin" size={18} />
              </button>
              <button className="icon-btn" onClick={() => setMoveOpen(true)} aria-label="Move selected">
                <Icon name="folder-move" size={18} />
              </button>
              <button
                className="icon-btn"
                onClick={() => void bulk((n) => repo.updateNote(n.id, { locked: true }), 'Locked')}
                aria-label="Lock selected"
              >
                <Icon name="lock" size={18} />
              </button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon="edit"
            title={query ? 'No matches' : 'Empty folder'}
            sub={query ? 'Try a different search.' : 'Add a note with the + button.'}
          />
        ) : (
          <>
            {pinned.length > 0 && (
              <>
                <div className="list-label">
                  <Icon name="pin" size={13} /> Pinned
                </div>
                <div className={view === 'grid' ? 'note-grid' : 'note-list'}>{pinned.map(noteCard)}</div>
              </>
            )}
            {pinned.length > 0 && rest.length > 0 && <div className="list-label">Notes</div>}
            <div className={view === 'grid' ? 'note-grid' : 'note-list'}>{rest.map(noteCard)}</div>
          </>
        )}
      </section>

      {drag.draggingId && (
        <div className="drop-hint">
          <Icon name="folder-move" size={16} /> Drop on Unfile — or the bin to delete
        </div>
      )}
      {drag.draggingId && (
        <>
          <button className="float-target float-unfile" data-drop-folder="__unfile__" aria-label="Move to unfiled">
            <Icon name="upload" size={18} />
          </button>
          <button className="float-target float-trash" data-drop="trash" aria-label="Delete note">
            <Icon name="trash" size={20} />
          </button>
        </>
      )}

      <button
        className="fab"
        onClick={async () => {
          const note = await repo.createNote({ folderId: id })
          navigate(`/note/${note.id}`)
        }}
        aria-label="New note in folder"
      >
        <Icon name="plus" size={26} strokeWidth={2.2} />
      </button>

      <FolderActionsSheet folder={folder} open={actionsOpen} onClose={() => setActionsOpen(false)} />

      <MoveSelectedSheet
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        onPick={(folderId) => {
          setMoveOpen(false)
          void bulk((n) => repo.moveNote(n.id, folderId), folderId ? 'Moved' : 'Moved to Unfiled')
        }}
      />
    </div>
  )
}

function MoveSelectedSheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (folderId: ID | null) => void
}) {
  const folders = useLiveQuery(() => db.folders.filter((f) => !f.archived && !f.locked).toArray(), [], [] as Folder[])
  return (
    <Sheet open={open} onClose={onClose} title="Move to folder">
      <FolderRow
        folder={{ id: '__unfile__', name: 'Unfiled', color: null, pinned: false, locked: false, archived: false, offline: false, createdAt: 0, updatedAt: 0 }}
        onOpen={() => onPick(null)}
      />
      {[...(folders ?? [])]
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name))
        .map((f) => (
          <FolderRow key={f.id} folder={f} onOpen={() => onPick(f.id)} />
        ))}
    </Sheet>
  )
}
