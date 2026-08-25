import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import * as repo from '@/core/repo'
import type { Folder, Note } from '@/core/types'
import { colorOf } from '@/core/palette'
import { cn, formatDate } from '@/core/utils'
import { Icon } from '@/ui/Icon'
import { TopBar } from '@/ui/TopBar'
import { NoteCard, EmptyState } from '@/ui/cards'
import { FolderActionsSheet } from '@/ui/sheets'
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
  const { ensureUnlocked, unlocked, configured: lockConfigured } = useLock()

  const folder = useLiveQuery(() => db.folders.get(id), [id], undefined)
  const notes = useLiveQuery(
    () => db.notes.filter((n) => n.folderId === id && !n.archived).toArray(),
    [id],
    [] as Note[]
  )

  const [actionsOpen, setActionsOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

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

  const pinned = filtered.filter((n) => n.pinned)
  const rest = filtered.filter((n) => !n.pinned)

  const openNote = async (n: Note) => {
    if (n.locked) {
      const ok = await ensureUnlocked()
      if (!ok) return
    }
    navigate(`/note/${n.id}`)
  }

  const drag = useNoteDrag(async (noteId) => {
    await repo.moveNote(noteId, null)
    toast.show('Moved to Unfiled', 'folder-move')
  })

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
        <LockedFolderGate
          folder={folder}
          onUnlock={async () => {
            const ok = await ensureUnlocked()
            return ok
          }}
          onCancel={() => navigate('/')}
        />
      </div>
    )
  }

  const color = colorOf(folder.color)
  const visibleCount = notes.filter((n) => !n.locked).length

  return (
    <div className="screen">
      <TopBar
        back
        title={folder.name}
        subtitle={`${visibleCount} note${visibleCount === 1 ? '' : 's'}`}
        right={
          <button className="icon-btn" onClick={() => setActionsOpen(true)} aria-label="Folder actions">
            <Icon name="more-h" size={21} />
          </button>
        }
      />

      <div className="folder-hero" style={{ background: color.bg }}>
        <span style={{ color: color.fg }}>
          <Icon name={folder.locked ? 'lock' : 'folder'} size={22} />
        </span>
        <span className="folder-hero-name" style={{ color: color.fg }}>
          {folder.name}
        </span>
        {folder.pinned && <Icon name="pin" size={15} style={{ color: color.fg }} />}
      </div>

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
        {filtered.length === 0 ? (
          <EmptyState
            icon="edit"
            title={query ? 'No matches' : 'Empty folder'}
            sub={query ? 'Try a different search.' : 'Add a note with the + button.'}
          />
        ) : (
          <div className="note-list">
            {pinned.length > 0 && (
              <>
                <div className="list-label">
                  <Icon name="pin" size={13} /> Pinned
                </div>
                {pinned.map((n) => (
                  <NoteCard key={n.id} note={n} onOpen={() => void openNote(n)} {...drag.bind(n.id)} />
                ))}
              </>
            )}
            {pinned.length > 0 && rest.length > 0 && <div className="list-label">Notes</div>}
            {rest.map((n) => (
              <NoteCard key={n.id} note={n} onOpen={() => void openNote(n)} {...drag.bind(n.id)} />
            ))}
          </div>
        )}
      </section>

      {drag.draggingId && (
        <div className="drop-hint">
          <Icon name="folder-move" size={16} /> Drag up to the Unfile chip — or drop here to keep
        </div>
      )}
      {drag.draggingId && (
        <button
          className="unfile-target"
          data-drop-folder={drag.unfileKey}
          aria-label="Move to unfiled"
        >
          <Icon name="upload" size={18} /> Unfile
        </button>
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
    </div>
  )
}

function LockedFolderGate({
  folder,
  onUnlock,
  onCancel,
}: {
  folder: Folder
  onUnlock: () => Promise<boolean>
  onCancel: () => void
}) {
  const [busy, setBusy] = useState(false)
  const { configured: lockConfigured } = useLock()
  const color = colorOf(folder.color)
  return (
    <div className="gate">
      <div className="gate-icon" style={{ background: color.bg, color: color.fg }}>
        <Icon name="lock" size={30} />
      </div>
      <h2>{folder.name}</h2>
      <p>This folder is private. Unlock with your passcode or biometrics to view its notes.</p>
      <div className="gate-actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          Go back
        </button>
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await onUnlock()
            setBusy(false)
          }}
        >
          <Icon name="unlock" size={17} /> Unlock
        </button>
      </div>
      {!lockConfigured && (
        <p className="gate-hint">Tip: set up App Lock in Settings → Privacy to use private folders.</p>
      )}
      <span className="gate-date">{formatDate(folder.updatedAt)}</span>
    </div>
  )
}
