import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import { createNote, storeFile } from '@/core/repo'
import { setSetting, getSetting, SETTINGS } from '@/core/settings'
import type { Folder, NoteBlock } from '@/core/types'
import { uid, escapeHtml } from '@/core/utils'
import { Icon } from '@/ui/Icon'
import { TopBar } from '@/ui/TopBar'
import { FolderRow } from '@/ui/cards'
import { useToast } from '@/ui/Dialogs'
import type { PendingSave } from './pending'

/* ------------------------------------------------------------------ */
/* Save-to: the single destination screen for shared/imported content.*/
/* Receive file → Share → Nimbus → pick folder → Save. Two taps.      */
/* ------------------------------------------------------------------ */

export function SaveTo() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [params] = useSearchParams()
  const folders = useLiveQuery(() => db.folders.filter((f) => !f.archived).toArray(), [], [] as Folder[])

  const [pending, setPending] = useState<PendingSave | null>(
    (location.state as { pending?: PendingSave } | null)?.pending ?? null
  )
  const [loadingShare, setLoadingShare] = useState(params.get('shared') === '1')
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)

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
        navigator.serviceWorker?.controller?.postMessage('nimbus:clear-share')
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

  const describe = (p: PendingSave): string => {
    if (p.kind === 'audio' && p.audio) return `Voice note · ${p.audio.name.replace(/\.[^.]+$/, '')}`
    if (p.files?.length) {
      const names = p.files.map((f) => f.name)
      return names.length === 1 ? names[0] : `${names[0]} + ${names.length - 1} more`
    }
    return p.text?.slice(0, 90) ?? 'Shared content'
  }

  const save = async () => {
    if (!pending || saving) return
    setSaving(true)
    try {
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

      if (blocks.length === 0) {
        toast.show('Nothing to save')
        navigate('/')
        return
      }

      const note = await createNote({ folderId: selected, title, blocks })
      await setSetting(SETTINGS.lastFolderId, selected)
      const target = folders.find((f) => f.id === selected)
      toast.show(`Saved to ${target ? target.name : 'Unfiled'}`, 'check-circle')
      navigate('/')
      void note
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="screen save-screen">
      <TopBar
        left={
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            Cancel
          </button>
        }
        title="Save to"
      />

      {loadingShare ? (
        <div className="editor-loading">Receiving shared content…</div>
      ) : !pending ? (
        <div className="editor-loading">Nothing to save.</div>
      ) : (
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
                color: 'gray',
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
