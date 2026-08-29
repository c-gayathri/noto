import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import * as repo from '@/core/repo'
import type { Folder, Note, ID, StoredFile } from '@/core/types'
import { useSetting, SETTINGS, setSetting } from '@/core/settings'
import { cn, fileKind, formatBytes } from '@/core/utils'
import { useFileURL, useStoredFile, downloadBlob, shareFiles } from '@/core/fileStore'
import { Icon } from '@/ui/Icon'
import { CreateMenu, type CreateOptionKind } from '@/ui/CreateMenu'
import { NoteCard, FolderCard, EmptyState } from '@/ui/cards'
import { useNoteDrag } from '@/ui/useNoteDrag'
import { RecordSheet } from '@/ui/RecordSheet'
import { TemplatePickerSheet, useFolderCounts, Sheet, FolderRow } from '@/ui/sheets'
import { useDialogs, useToast } from '@/ui/Dialogs'
import type { PendingSave } from './pending'

const PINNED_FOLDERS_ROW = 8
const PINNED_NOTES_MAX = 3

export function Home() {
  const navigate = useNavigate()
  const dialogs = useDialogs()
  const toast = useToast()

  const folders = useLiveQuery(() => db.folders.filter((f) => !f.archived).toArray(), [], [] as Folder[])
  const notes = useLiveQuery(() => db.notes.filter((n) => !n.archived).toArray(), [], [] as Note[])
  const allNotes = useLiveQuery(() => db.notes.toArray(), [], [] as Note[])
  const files = useLiveQuery(() => db.files.toArray(), [], [] as StoredFile[])
  const counts = useFolderCounts()
  const collapsed = useSetting<boolean>(SETTINGS.foldersCollapsed, false)

  const [menuOpen, setMenuOpen] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [view, setView] = useState<'list' | 'grid'>(() => (localStorage.getItem('noto.view') as 'grid') === 'grid' ? 'grid' : 'list')
  const [selected, setSelected] = useState<Set<ID>>(new Set())
  const [moveOpen, setMoveOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)

  const setViewMode = (v: 'list' | 'grid') => {
    setView(v)
    localStorage.setItem('noto.view', v)
  }

  const lockedFolders = folders.filter((f) => f.locked)
  const lockedNotes = notes.filter((n) => n.locked)
  const visibleNotes = notes.filter((n) => !n.locked)
  const unfiled = visibleNotes.filter((n) => !n.folderId)
  const unfiledPinned = unfiled.filter((n) => n.pinned).sort((a, b) => b.updatedAt - a.updatedAt)
  const unfiledRecent = unfiled.filter((n) => !n.pinned).sort((a, b) => b.updatedAt - a.updatedAt)

  /* Standalone files: stored but not referenced by any note block. */
  const standaloneFiles = useMemo(() => {
    const referenced = new Set<string>()
    for (const n of allNotes) {
      for (const b of n.blocks) {
        if (b.type === 'image' || b.type === 'file' || b.type === 'audio') referenced.add(b.fileId)
        if (b.type === 'flashcards') {
          for (const c of b.cards) {
            if (c.frontImageId) referenced.add(c.frontImageId)
            if (c.backImageId) referenced.add(c.backImageId)
          }
        }
      }
    }
    return files.filter((f) => !referenced.has(f.id)).sort((a, b) => b.createdAt - a.createdAt)
  }, [files, allNotes])

  const sortedFolders = useMemo(
    () =>
      [...folders].sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          (b.pinned ? b.updatedAt - a.updatedAt : 0) ||
          a.name.localeCompare(b.name)
      ),
    [folders]
  )
  const pinnedFolders = sortedFolders.filter((f) => f.pinned).slice(0, PINNED_FOLDERS_ROW)
  const otherFolders = sortedFolders.filter((f) => !pinnedFolders.includes(f))

  const openFolder = (f: Folder) => navigate(`/folder/${f.id}`)
  const openNote = (n: Note) => navigate(`/note/${n.id}`)

  const drag = useNoteDrag(
    async (noteId, folderId) => {
      await repo.moveNote(noteId, folderId)
      const target = folders.find((f) => f.id === folderId)
      toast.show(target ? `Moved to ${target.name}` : 'Moved to Unfiled', 'folder-move')
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
  const toggleSelect = (id: ID) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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

  /* ---------------- create flows ---------------- */

  const createText = async () => {
    const note = await repo.createNote({})
    navigate(`/note/${note.id}`)
  }

  const createFolder = async () => {
    const name = await dialogs.prompt({ title: 'New folder', placeholder: 'Folder name', confirmLabel: 'Create' })
    if (!name) return
    const folder = await repo.createFolder({ name })
    toast.show(`Folder “${name}” created`, 'folder')
    navigate(`/folder/${folder.id}`)
  }

  const onCreate = async (kind: CreateOptionKind) => {
    if (kind === 'folder') return void createFolder()
    if (kind === 'templates') return setTemplatesOpen(true)
    if (kind === 'file') return fileInput.current?.click()
    if (kind === 'flashcards') {
      const note = await repo.createNote({
        title: 'Flashcards',
        blocks: [
          {
            id: `b_${Date.now().toString(36)}`,
            type: 'flashcards',
            cards: [
              { id: 'c_1', front: '', back: '' },
              { id: 'c_2', front: '', back: '' },
            ],
          },
        ],
      })
      navigate(`/note/${note.id}`)
    }
  }

  const onFilesPicked = (list: FileList | null) => {
    if (!list || list.length === 0) return
    const payload: PendingSave = {
      kind: 'files',
      title: list.length === 1 ? list[0].name.replace(/\.[^.]+$/, '') : undefined,
      files: Array.from(list).map((f) => ({ blob: f, name: f.name, mime: f.type || 'application/octet-stream' })),
    }
    navigate('/save', { state: { pending: payload } })
  }

  const noteCard = (n: Note) => (
    <NoteCard
      key={n.id}
      note={n}
      onOpen={() => {
        if (inSelect) toggleSelect(n.id)
        else openNote(n)
      }}
      grid={view === 'grid'}
      selectMode={inSelect}
      selected={selected.has(n.id)}
      onToggleSelect={() => toggleSelect(n.id)}
      {...(inSelect ? {} : drag.bind(n.id))}
    />
  )

  return (
    <div className="screen">
      <header className="home-header">
        <h1 className="brand">Noto</h1>
        <button className="search-mini" onClick={() => navigate('/search')} aria-label="Search">
          <Icon name="search" size={15} />
        </button>
        <span className="home-header-space" />
        <button
          className={cn('icon-btn', view === 'grid' && 'icon-btn-active')}
          onClick={() => setViewMode(view === 'grid' ? 'list' : 'grid')}
          aria-label={view === 'grid' ? 'List view' : 'Grid view'}
        >
          <Icon name={view === 'grid' ? 'rows' : 'grid'} size={19} />
        </button>
        <button className="icon-btn" onClick={() => navigate('/settings')} aria-label="Settings">
          <Icon name="settings" size={20} />
        </button>
      </header>

      {/* ---------------- Folders: pinned row above, rest below ---------------- */}
      <section className="section section-folders">
        <div className="section-head" style={{ marginBottom: 2 }}>
          <h2>Folders</h2>
          <button
            className="icon-btn"
            aria-label={collapsed ? 'Expand folders' : 'Collapse folders'}
            onClick={() => void setSetting(SETTINGS.foldersCollapsed, !collapsed)}
          >
            <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={19} />
          </button>
        </div>
        {!collapsed && (
          <>
            {pinnedFolders.length > 0 && (
              <div className="folder-row-scroller" data-drop-folder-row>
                {pinnedFolders.map((f) => (
                  <FolderCard
                    key={f.id}
                    folder={f}
                    count={f.locked ? undefined : counts.get(f.id) ?? 0}
                    locked={f.locked}
                    onOpen={() => openFolder(f)}
                  />
                ))}
              </div>
            )}
            <div className="folder-row-scroller" data-drop-folder-row>
              {otherFolders.map((f) => (
                <FolderCard
                  key={f.id}
                  folder={f}
                  count={f.locked ? undefined : counts.get(f.id) ?? 0}
                  locked={f.locked}
                  onOpen={() => openFolder(f)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ---------------- Locked box: one entry point to private content ---------------- */}
      <button className="locked-box" onClick={() => navigate('/locked')}>
        <Icon name="lock" size={16} />
        <span>Locked</span>
        {lockedFolders.length + lockedNotes.length > 0 && (
          <span className="locked-box-count">{lockedFolders.length + lockedNotes.length}</span>
        )}
      </button>

      {/* ---------------- Standalone files ---------------- */}
      {standaloneFiles.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Files</h2>
            <span className="section-count">{standaloneFiles.length}</span>
          </div>
          <div className={cn(standaloneFiles.length > 2 ? 'file-strip' : 'note-list')}>
            {standaloneFiles.slice(0, 6).map((f) => (
              <StandaloneFileCard key={f.id} fileId={f.id} />
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Unfiled notes ---------------- */}
      <section className="section">
        <div className="section-head">
          <h2>Notes</h2>
          <span className="section-count">{unfiled.length}</span>
        </div>
        {unfiled.length === 0 ? (
          <EmptyState
            icon="edit"
            title="Nothing here yet"
            sub="Share anything to Noto from any app, or tap + to create."
          />
        ) : (
          <>
            {unfiledPinned.length > 0 && (
              <>
                <div className="list-label">
                  <Icon name="pin" size={13} /> Pinned
                </div>
                <div className={cn('pinned-panel', view === 'grid' && 'note-grid', view === 'list' && 'note-list')}>
                  {unfiledPinned.map(noteCard)}
                </div>
              </>
            )}
            {unfiledPinned.length > 0 && unfiledRecent.length > 0 && <div className="list-label">Recent</div>}
            <div className={view === 'grid' ? 'note-grid' : 'note-list'}>{unfiledRecent.map(noteCard)}</div>
          </>
        )}
      </section>

      {drag.draggingId && (
        <div className="drop-hint">
          <Icon name="folder-move" size={16} /> Drop on a folder to file this note
        </div>
      )}
      {drag.draggingId && (
        <button className="float-target float-trash" data-drop="trash" aria-label="Delete note">
          <Icon name="trash" size={20} />
        </button>
      )}

      {/* ---------------- Bulk action bar ---------------- */}
      {inSelect && (
        <div className="bulk-bar">
          <div className="bulk-bar-info">
            <button className="icon-btn" onClick={() => setSelected(new Set())} aria-label="Exit selection">
              <Icon name="x" size={18} />
            </button>
            <span>
              {selected.size} selected
              <button className="bulk-selectall" onClick={() => setSelected(new Set(visibleNotes.map((n) => n.id)))}>
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

      {/* ---------------- FAB stack: + · mic · more ---------------- */}
      <div className="fab-stack">
        <button className="fab fab-small fab-more" onClick={() => setMenuOpen(true)} aria-label="More create options">
          <Icon name="more-h" size={18} />
        </button>
        <button className="fab fab-small" onClick={() => setRecordOpen(true)} aria-label="Record voice note">
          <Icon name="mic" size={18} />
        </button>
        <button className="fab" onClick={() => void createText()} aria-label="New note">
          <Icon name="plus" size={26} strokeWidth={2.2} />
        </button>
      </div>

      <CreateMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        kinds={['folder', 'file', 'flashcards', 'templates']}
        onSelect={(k) => void onCreate(k)}
      />

      <RecordSheet open={recordOpen} onClose={() => setRecordOpen(false)} onSaved={(p) => {
        setRecordOpen(false)
        navigate('/save', { state: { pending: p } })
      }} />
      <TemplatePickerSheet open={templatesOpen} onClose={() => setTemplatesOpen(false)} folderId={null} />

      <MoveSelectedSheet
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        folders={folders.filter((f) => !f.locked)}
        onPick={async (folderId) => {
          setMoveOpen(false)
          await bulk((n) => repo.moveNote(n.id, folderId), 'Moved')
        }}
      />

      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          onFilesPicked(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Standalone file card: thumbnail preview + rename from the preview  */
/* ------------------------------------------------------------------ */

function StandaloneFileCard({ fileId }: { fileId: string }) {
  const file = useStoredFile(fileId)
  const url = useFileURL(fileId)
  const dialogs = useDialogs()
  const toast = useToast()
  const navigate = useNavigate()
  if (!file) return null
  const kind = fileKind(file.mime, file.name)

  const rename = async () => {
    const name = await dialogs.prompt({ title: 'Rename file', initial: file.name, confirmLabel: 'Rename' })
    if (name) {
      await db.files.update(fileId, { name })
      toast.show('File renamed', 'check')
    }
  }

  const open = () => {
    if (kind === 'image' && url) {
      window.open(url, '_blank')
    } else if (url) {
      downloadBlob(file.blob, file.name)
    }
  }

  return (
    <div className="file-chip-card">
      <button className="file-chip-preview" onClick={open} aria-label={`Open ${file.name}`}>
        {kind === 'image' && url ? (
          <img src={url} alt={file.name} loading="lazy" />
        ) : (
          <Icon name={kind === 'audio' ? 'headphones' : kind === 'video' ? 'video' : 'file-text'} size={20} />
        )}
      </button>
      <span className="file-chip-name">{file.name}</span>
      <span className="file-chip-size">{formatBytes(file.size)}</span>
      <span className="file-chip-actions">
        <button className="icon-btn" onClick={rename} aria-label="Rename file">
          <Icon name="edit" size={14} />
        </button>
        <button
          className="icon-btn"
          onClick={() => void shareFiles([new File([file.blob], file.name, { type: file.mime })], file.name)}
          aria-label="Share file"
        >
          <Icon name="share" size={14} />
        </button>
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Move-selected sheet                                                 */
/* ------------------------------------------------------------------ */

function MoveSelectedSheet({
  open,
  onClose,
  folders,
  onPick,
}: {
  open: boolean
  onClose: () => void
  folders: Folder[]
  onPick: (folderId: ID | null) => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Move to folder">
      <FolderRow
        folder={{ id: '__unfile__', name: 'Unfiled', color: null, pinned: false, locked: false, archived: false, offline: false, createdAt: 0, updatedAt: 0 }}
        onOpen={() => onPick(null)}
      />
      {[...folders]
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name))
        .map((f) => (
          <FolderRow key={f.id} folder={f} onOpen={() => onPick(f.id)} />
        ))}
    </Sheet>
  )
}
