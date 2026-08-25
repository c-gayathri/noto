import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import * as repo from '@/core/repo'
import type { Folder, Note, ID } from '@/core/types'
import { useSetting, SETTINGS, setSetting } from '@/core/settings'
import { cn } from '@/core/utils'
import { Icon } from '@/ui/Icon'
import { CreateMenu } from '@/ui/CreateMenu'
import { NoteCard, FolderCard, EmptyState } from '@/ui/cards'
import { useNoteDrag } from '@/ui/useNoteDrag'
import { RecordSheet } from '@/ui/RecordSheet'
import { TemplatePickerSheet } from '@/ui/sheets'
import { useDialogs, useToast } from '@/ui/Dialogs'
import { useLock } from '@/ui/Lock'
import type { PendingSave } from './pending'

const INITIAL_FOLDERS = 10

export function Home() {
  const navigate = useNavigate()
  const dialogs = useDialogs()
  const toast = useToast()
  const { ensureUnlocked, configured: lockConfigured, unlocked } = useLock()

  const folders = useLiveQuery(() => db.folders.filter((f) => !f.archived).toArray(), [], [] as Folder[])
  const notes = useLiveQuery(() => db.notes.filter((n) => !n.archived).toArray(), [], [] as Note[])
  const collapsed = useSetting<boolean>(SETTINGS.foldersCollapsed, false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [showAllFolders, setShowAllFolders] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)

  const visibleNotes = notes.filter((n) => !n.locked)
  const unfiled = visibleNotes.filter((n) => !n.folderId)
  const unfiledPinned = unfiled.filter((n) => n.pinned).sort((a, b) => b.updatedAt - a.updatedAt)
  const unfiledRecent = unfiled
    .filter((n) => !n.pinned)
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const counts = useMemo(() => {
    const map = new Map<ID, number>()
    for (const n of visibleNotes) if (n.folderId) map.set(n.folderId, (map.get(n.folderId) ?? 0) + 1)
    return map
  }, [visibleNotes])

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

  const lockedFolders = folders.filter((f) => f.locked)
  const lockedNotes = notes.filter((n) => n.locked && !n.folderId)
  const hasLockedContent = lockedFolders.length > 0 || lockedNotes.length > 0

  const scrollerFolders = showAllFolders ? sortedFolders : sortedFolders.slice(0, INITIAL_FOLDERS)

  const openFolder = async (f: Folder) => {
    if (f.locked) {
      const ok = await ensureUnlocked()
      if (!ok) return
    }
    navigate(`/folder/${f.id}`)
  }

  const openNote = async (n: Note) => {
    if (n.locked) {
      const ok = await ensureUnlocked()
      if (!ok) return
    }
    navigate(`/note/${n.id}`)
  }

  const drag = useNoteDrag(async (noteId, folderId) => {
    await repo.moveNote(noteId, folderId)
    const target = folders.find((f) => f.id === folderId)
    toast.show(target ? `Moved to ${target.name}` : 'Moved to Unfiled', 'folder-move')
  })

  /* ---------------- create flows ---------------- */

  const createText = async () => {
    const note = await repo.createNote({})
    navigate(`/note/${note.id}`)
  }

  const createFlashcards = async () => {
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

  const createFolder = async () => {
    const name = await dialogs.prompt({ title: 'New folder', placeholder: 'Folder name', confirmLabel: 'Create' })
    if (!name) return
    const folder = await repo.createFolder({ name })
    toast.show(`Folder “${name}” created`, 'folder')
    navigate(`/folder/${folder.id}`)
  }

  const onFilesPicked = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const payload: PendingSave = {
      kind: 'files',
      title: files.length === 1 ? files[0].name.replace(/\.[^.]+$/, '') : undefined,
      files: Array.from(files).map((f) => ({ blob: f, name: f.name, mime: f.type || 'application/octet-stream' })),
    }
    navigate('/save', { state: { pending: payload } })
  }

  const onVoiceSaved = (payload: PendingSave) => {
    setRecordOpen(false)
    navigate('/save', { state: { pending: payload } })
  }

  return (
    <div className="screen">
      <header className="home-header">
        <h1 className="brand">Nimbus</h1>
        <button className="icon-btn" onClick={() => navigate('/settings')} aria-label="Settings">
          <Icon name="settings" size={21} />
        </button>
      </header>

      <button className="search-pill" onClick={() => navigate('/search')}>
        <Icon name="search" size={18} />
        <span>Search notes</span>
      </button>

      {/* ---------------- Folders ---------------- */}
      <section className="section">
        <div className="section-head">
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
            <div className="folder-scroller">
              {scrollerFolders.map((f) => (
                <FolderCard
                  key={f.id}
                  folder={f}
                  count={f.locked ? undefined : counts.get(f.id) ?? 0}
                  locked={f.locked}
                  onOpen={() => void openFolder(f)}
                />
              ))}
              {sortedFolders.length > INITIAL_FOLDERS && !showAllFolders && (
                <button className="folder-card folder-card-more" onClick={() => setShowAllFolders(true)}>
                  <span className="folder-glyph">
                    <Icon name="plus" size={20} />
                  </span>
                  <span className="folder-name">{sortedFolders.length - INITIAL_FOLDERS} more</span>
                  <span className="folder-count">Show all</span>
                </button>
              )}
              {/* Locked section is always rendered last, even when empty,
                  so its presence reveals nothing. */}
              <button
                className="folder-card folder-card-locked"
                onClick={async () => {
                  if (!lockConfigured) {
                    navigate('/settings?section=privacy')
                    return
                  }
                  if (!unlocked) await ensureUnlocked()
                }}
              >
                <span className="folder-glyph">
                  <Icon name={unlocked && lockConfigured ? 'unlock' : 'lock'} size={20} />
                </span>
                <span className="folder-name">Locked</span>
                <span className="folder-count">
                  {lockConfigured && unlocked ? 'Private items' : 'Tap to unlock'}
                </span>
              </button>
            </div>

            {showAllFolders && (
              <div className="folder-grid">
                {sortedFolders.map((f) => (
                  <FolderCard
                    key={f.id}
                    folder={f}
                    count={f.locked ? undefined : counts.get(f.id) ?? 0}
                    locked={f.locked}
                    onOpen={() => void openFolder(f)}
                  />
                ))}
                <button className="folder-card folder-card-more" onClick={() => setShowAllFolders(false)}>
                  <span className="folder-glyph">
                    <Icon name="chevron-up" size={20} />
                  </span>
                  <span className="folder-name">Collapse</span>
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ---------------- Locked content (after unlock) ---------------- */}
      {lockConfigured && unlocked && hasLockedContent && (
        <section className="section">
          <div className="section-head">
            <h2>
              <Icon name="lock" size={14} /> Private
            </h2>
          </div>
          {lockedFolders.length > 0 && (
            <div className="folder-grid folder-grid-compact">
              {lockedFolders.map((f) => (
                <FolderCard key={f.id} folder={f} locked onOpen={() => void openFolder(f)} />
              ))}
            </div>
          )}
          <div className="note-list">
            {lockedNotes.map((n) => (
              <NoteCard key={n.id} note={n} onOpen={() => void openNote(n)} />
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Unfiled notes ---------------- */}
      <section className="section">
        <div className="section-head">
          <h2>Unfiled Notes</h2>
          <span className="section-count">{unfiled.length}</span>
        </div>
        {unfiled.length === 0 ? (
          <EmptyState
            icon="edit"
            title="Nothing here yet"
            sub="Share anything to Nimbus from any app, or tap + to create."
          />
        ) : (
          <div className="note-list">
            {unfiledPinned.length > 0 && (
              <>
                <div className="list-label">
                  <Icon name="pin" size={13} /> Pinned
                </div>
                {unfiledPinned.map((n) => (
                  <NoteCard key={n.id} note={n} onOpen={() => void openNote(n)} {...drag.bind(n.id)} />
                ))}
              </>
            )}
            {unfiledPinned.length > 0 && unfiledRecent.length > 0 && (
              <div className="list-label">Recent</div>
            )}
            {unfiledRecent.map((n) => (
              <NoteCard key={n.id} note={n} onOpen={() => void openNote(n)} {...drag.bind(n.id)} />
            ))}
          </div>
        )}
      </section>

      {drag.draggingId && (
        <div className="drop-hint">
          <Icon name="folder-move" size={16} /> Drop on a folder to file this note
        </div>
      )}

      {/* ---------------- FAB ---------------- */}
      <button className="fab" onClick={() => setMenuOpen(true)} aria-label="Create">
        <Icon name="plus" size={26} strokeWidth={2.2} />
      </button>

      <CreateMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onText={() => void createText()}
        onVoice={() => setRecordOpen(true)}
        onFile={() => fileInput.current?.click()}
        onFolder={() => void createFolder()}
        onFlashcards={() => void createFlashcards()}
        onTemplates={() => setTemplatesOpen(true)}
      />

      <RecordSheet open={recordOpen} onClose={() => setRecordOpen(false)} onSaved={onVoiceSaved} />
      <TemplatePickerSheet open={templatesOpen} onClose={() => setTemplatesOpen(false)} folderId={null} />

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
