import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import { createNote, updateNote, storeFile } from '@/core/repo'
import { setSetting, getSetting, SETTINGS } from '@/core/settings'
import type { Folder, Note, NoteBlock } from '@/core/types'
import { uid, escapeHtml, firstSnippet } from '@/core/utils'
import { Icon } from '@/ui/Icon'
import { TopBar } from '@/ui/TopBar'
import { FolderRow } from '@/ui/cards'
import { useToast } from '@/ui/Dialogs'
import type { PendingSave } from './pending'

/* ------------------------------------------------------------------ */
/* Save-to: the single destination screen for shared/imported content.*/
/* Receive file → Share → Noto → pick destination → Save.             */
/* Multiple files ask: existing note, new note, or separate files.    */
/* ------------------------------------------------------------------ */

type Mode = 'choose' | 'dest' | 'pickNote'

export function SaveTo() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [params] = useSearchParams()
  const folders = useLiveQuery(() => db.folders.filter((f) => !f.archived && !f.locked).toArray(), [], [] as Folder[])
  const notes = useLiveQuery(() => db.notes.filter((n) => !n.archived && !n.locked).toArray(), [], [] as Note[])

  const [pending, setPending] = useState<PendingSave | null>(
    (location.state as { pending?: PendingSave } | null)?.pending ?? null
  )
  const [loadingShare, setLoadingShare] = useState(params.get('shared') === '1')
  const [mode, setMode] = useState<Mode>('choose')
  const [selected, setSelected] = useState<string | null>(null)
  const [targetNoteId, setTargetNoteId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const multiFiles = !!pending?.files && pending.files.length > 1

  useEffect(() => {
    void getSetting<string | null>(SETTINGS.lastFolderId, null).then((last) => {
      setSelected((s) => s ?? last)
    })
  }, [])

  // Consume a Web Share Target payload delivered through the service worker
  useEffect(() => {
    if (params.get('shared') !== '1') return
    let alive = true
    ;(async () => {
      try {
        const metaRes = await fetch('/__share/meta')
        if (!metaRes.ok) throw new Error('no share')
        const meta = (await metaRes.json()) as {
          title: string
          text: string
          url: string
          files: { key: string; name: string; type: string }[]
        }
        const files: PendingSave['files'] = []
        for (const f of meta.files) {
          const fr = await fetch(f.key)
          if (fr.ok) {
            files.push({ blob: await fr.blob(), name: f.name, mime: f.type || 'application/octet-stream' })
          }
        }
        navigator.serviceWorker?.controller?.postMessage('noto:clear-share')
        if (!alive) return
        const text = meta.text || meta.url || ''
        setPending({
          kind: files.length ? 'files' : 'text',
          title: meta.title || (files[0] ? files[0].name.replace(/\.[^.]+$/, '') : undefined),
          text: text || undefined,
          files: files.length ? files : undefined,
        })
      } catch {
        if (alive) toast.show('Nothing shared')
      } finally {
        if (alive) setLoadingShare(false)
        window.history.replaceState(null, '', '/save')
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name)),
    [folders]
  )
  const visibleFolders = sortedFolders.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()))

  const notesForFolder = useMemo(
    () =>
      notes
        .filter((n) => n.folderId === selected)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .filter((n) => !query.trim() || n.title.toLowerCase().includes(query.trim().toLowerCase())),
    [notes, selected, query]
  )

  const describe = (p: PendingSave): string => {
    if (p.kind === 'audio' && p.audio) return `Voice note · ${p.audio.name.replace(/\.[^.]+$/, '')}`
    if (p.files?.length) {
      const names = p.files.map((f) => f.name)
      return names.length === 1 ? names[0] : `${names[0]} + ${names.length - 1} more`
    }
    return p.text?.slice(0, 90) ?? 'Shared content'
  }

  const buildBlocks = async (): Promise<{ blocks: NoteBlock[]; title: string }> => {
    if (!pending) return { blocks: [], title: '' }
    const blocks: NoteBlock[] = []
    let title = pending.title?.trim() ?? ''

    if (pending.kind === 'audio' && pending.audio) {
      const stored = await storeFile(pending.audio.blob, pending.audio.name, pending.audio.mime)
      blocks.push({
        id: uid('b_'),
        type: 'audio',
        fileId: stored.id,
        duration: pending.audio.duration,
        transcript: pending.audio.transcript,
      })
      title = title || 'Voice note'
    }

    if (pending.files?.length) {
      for (const f of pending.files) {
        const stored = await storeFile(f.blob, f.name, f.mime)
        if (f.mime.startsWith('image/')) {
          blocks.push({ id: uid('b_'), type: 'image', fileId: stored.id })
        } else {
          blocks.push({ id: uid('b_'), type: 'file', fileId: stored.id })
        }
        if (!title) title = f.name.replace(/\.[^.]+$/, '')
      }
    }

    if (pending.text?.trim()) {
      const paragraphs = pending.text
        .split(/\n{2,}|\n/)
        .map((t) => t.trim())
        .filter(Boolean)
      blocks.push({
        id: uid('b_'),
        type: 'text',
        html: paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join(''),
      })
      if (!title) title = paragraphs[0]?.slice(0, 48) ?? 'Note'
    }

    return { blocks, title }
  }

  const saveToNewNote = async () => {
    const { blocks, title } = await buildBlocks()
    if (blocks.length === 0) {
      toast.show('Nothing to save')
      navigate('/')
      return
    }
    await createNote({ folderId: selected, title, blocks })
    await setSetting(SETTINGS.lastFolderId, selected)
    const target = folders.find((f) => f.id === selected)
    toast.show(`Saved to ${target ? target.name : 'Unfiled'}`, 'check-circle')
    navigate('/')
  }

  const saveToExistingNote = async () => {
    if (!targetNoteId) return
    const note = await db.notes.get(targetNoteId)
    if (!note) return
    const { blocks } = await buildBlocks()
    if (blocks.length === 0) {
      toast.show('Nothing to save')
      navigate('/')
      return
    }
    await updateNote(note.id, { blocks: [...note.blocks, ...blocks] })
    toast.show(`Added to “${note.title || 'note'}”`, 'check-circle')
    navigate(`/note/${note.id}`)
  }

  const saveAsSeparateFiles = async () => {
    if (!pending) return
    let n = 0
    if (pending.kind === 'audio' && pending.audio) {
      await storeFile(pending.audio.blob, pending.audio.name, pending.audio.mime)
      n++
    }
    for (const f of pending.files ?? []) {
      await storeFile(f.blob, f.name, f.mime)
      n++
    }
    if (pending.text?.trim()) {
      const blob = new Blob([pending.text], { type: 'text/plain' })
      await storeFile(blob, pending.title ? `${pending.title}.txt` : 'Shared text.txt', 'text/plain')
      n++
    }
    toast.show(n === 1 ? 'File saved to Files' : `${n} files saved to Files`, 'check-circle')
    navigate('/')
  }

  const save = async () => {
    if (!pending || saving) return
    setSaving(true)
    try {
      if (mode === 'pickNote') await saveToExistingNote()
      else await saveToNewNote()
    } finally {
      setSaving(false)
    }
  }

  const destLabel = selected ? folders.find((f) => f.id === selected)?.name ?? 'Folder' : 'Unfiled'

  return (
    <div className="screen save-screen">
      <TopBar
        left={
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            Cancel
          </button>
        }
        title={mode === 'pickNote' ? 'Add to note' : 'Save to'}
      />

      {loadingShare ? (
        <div className="editor-loading">Receiving shared content…</div>
      ) : !pending ? (
        <div className="editor-loading">Nothing to save.</div>
      ) : mode === 'choose' && multiFiles ? (
        /* -------- step 1 (multi-file): where should these go? -------- */
        <>
          <div className="save-preview">
            <span className="save-preview-icon">
              <Icon name="file" size={19} />
            </span>
            <span className="save-preview-text">{describe(pending)}</span>
          </div>
          <div className="save-choices">
            <button className="save-choice" onClick={() => setMode('pickNote')}>
              <span className="save-choice-icon" style={{ background: 'var(--t-blue)' }}>
                <Icon name="file-text" size={19} />
              </span>
              <b>Existing note</b>
              <span>Append all files to a note you pick</span>
            </button>
            <button className="save-choice" onClick={() => setMode('dest')}>
              <span className="save-choice-icon" style={{ background: 'var(--t-green)' }}>
                <Icon name="plus" size={19} />
              </span>
              <b>New note</b>
              <span>One note containing all the files</span>
            </button>
            <button className="save-choice" onClick={() => void saveAsSeparateFiles()}>
              <span className="save-choice-icon" style={{ background: 'var(--t-orange)' }}>
                <Icon name="copy" size={19} />
              </span>
              <b>Separate files</b>
              <span>Save each as its own file, shown in Files</span>
            </button>
          </div>
        </>
      ) : mode === 'pickNote' ? (
        /* -------- step 2a: pick the note to append into -------- */
        <>
          <div className="save-preview">
            <span className="save-preview-icon">
              <Icon name="file" size={19} />
            </span>
            <span className="save-preview-text">{describe(pending)}</span>
          </div>

          <div className="search-pill search-pill-static">
            <Icon name="search" size={17} />
            <input placeholder="Search notes" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          <div className="save-list">
            <div className="list-label">Folder · {destLabel}</div>
            {notesForFolder.length === 0 && <p className="settings-note">No notes in this folder.</p>}
            {notesForFolder.map((n: Note) => (
              <button
                key={n.id}
                className={targetNoteId === n.id ? 'save-note-row radio-on' : 'save-note-row'}
                onClick={() => {
                  setTargetNoteId(n.id)
                  void save()
                }}
              >
                <span className="locked-glyph">
                  <Icon name="file-text" size={15} />
                </span>
                <span className="note-card-main">
                  <span className="note-title">{n.title || firstSnippet(n.blocks[0]?.type === 'text' ? n.blocks[0].html : '', 40) || 'Note'}</span>
                  <span className="note-sub">{n.blocks.length} block{n.blocks.length === 1 ? '' : 's'}</span>
                </span>
              </button>
            ))}
            <button className="btn btn-ghost btn-block" onClick={() => setMode('dest')}>
              <Icon name="plus" size={15} /> New note instead
            </button>
          </div>
        </>
      ) : (
        /* -------- default: pick folder, save as new note -------- */
        <>
          <div className="save-preview">
            <span className="save-preview-icon">
              <Icon name={pending.kind === 'audio' ? 'headphones' : pending.files?.length ? 'file' : 'type'} size={19} />
            </span>
            <span className="save-preview-text">{describe(pending)}</span>
          </div>

          <div className="search-pill search-pill-static">
            <Icon name="search" size={17} />
            <input placeholder="Search folders" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          <div className="save-list">
            <FolderRow
              folder={{
                id: '__unfile__',
                name: 'Unfiled Note',
                color: null,
                pinned: false,
                locked: false,
                archived: false,
                offline: false,
                createdAt: 0,
                updatedAt: 0,
              }}
              locked={false}
              onOpen={() => setSelected(null)}
              trailing={
                <span className={`radio ${selected === null ? 'radio-on' : ''}`}>
                  {selected === null && <Icon name="check" size={12} strokeWidth={3} />}
                </span>
              }
            />
            {visibleFolders.length > 0 && <div className="list-label">Folders</div>}
            {visibleFolders.map((f) => (
              <FolderRow
                key={f.id}
                folder={f}
                onOpen={() => setSelected(f.id)}
                trailing={
                  <span className={`radio ${selected === f.id ? 'radio-on' : ''}`}>
                    {selected === f.id && <Icon name="check" size={12} strokeWidth={3} />}
                  </span>
                }
              />
            ))}
          </div>

          <div className="save-footer">
            <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
