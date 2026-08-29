import { useEffect, useState } from 'react'
import type { Folder, Note } from '@/core/types'
import { palClass } from '@/core/palette'
import { firstSnippet, cn } from '@/core/utils'
import { Icon } from './Icon'

/* ------------------------------------------------------------------ */
/* Note preview content — Google Keep style: show the content itself, */
/* no dates, no "Untitled". Voice-note transcripts come first.        */
/* ------------------------------------------------------------------ */

export function NotePreview({ note, compact }: { note: Note; compact?: boolean }) {
  const segments: React.ReactNode[] = []

  // Transcripts first
  for (const b of note.blocks) {
    if (b.type === 'audio' && b.transcript?.trim()) {
      segments.push(
        <p key={b.id} className="np-text np-transcript">
          <Icon name="headphones" size={12} /> {firstSnippet(b.transcript, compact ? 60 : 120)}
        </p>
      )
    }
  }

  for (const b of note.blocks) {
    switch (b.type) {
      case 'text': {
        const t = firstSnippet(b.html, compact ? 80 : 160)
        if (t) segments.push(
          <p key={b.id} className="np-text">
            {t}
          </p>
        )
        break
      }
      case 'checklist': {
        const items = b.items.slice(0, compact ? 2 : 4)
        if (items.length)
          segments.push(
            <div key={b.id} className="np-checks">
              {items.map((i) => (
                <span key={i.id} className={cn('np-check', i.checked && 'done')}>
                  <i>{i.checked ? '✓' : ''}</i>
                  {i.text || '—'}
                </span>
              ))}
            </div>
          )
        break
      }
      case 'image':
        segments.push(<ImageThumb key={b.id} fileId={b.fileId} />)
        break
      case 'audio':
        segments.push(
          <span key={b.id} className="np-chip">
            <Icon name="headphones" size={12} /> Voice note
          </span>
        )
        break
      case 'file':
        segments.push(
          <span key={b.id} className="np-chip">
            <Icon name="file-text" size={12} />
            <FileName fileId={b.fileId} />
          </span>
        )
        break
      case 'link':
        segments.push(
          <span key={b.id} className="np-chip np-link">
            <Icon name="link" size={12} /> {b.title || safeHost(b.url)}
          </span>
        )
        break
      case 'flashcards':
        segments.push(
          <span key={b.id} className="np-chip">
            <Icon name="cards" size={12} /> {b.cards.length} card{b.cards.length === 1 ? '' : 's'}
          </span>
        )
        break
    }
  }

  if (segments.length === 0) return null
  return <div className="np">{segments.slice(0, compact ? 3 : 6)}</div>
}

function safeHost(url: string) {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url.slice(0, 40)
  }
}

function FileName({ fileId }: { fileId: string }) {
  const [name, setName] = useState('')
  useEffect(() => {
    let alive = true
    void import('@/core/db').then(({ db }) =>
      db.files.get(fileId).then((f) => {
        if (alive && f) setName(f.name)
      })
    )
    return () => {
      alive = false
    }
  }, [fileId])
  return <>{name || 'File'}</>
}

function ImageThumb({ fileId }: { fileId: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void import('@/core/fileStore').then(({ fileURL }) =>
      fileURL(fileId).then((u) => {
        if (alive) setUrl(u)
      })
    )
    return () => {
      alive = false
    }
  }, [fileId])
  if (!url) return null
  return (
    <span className="np-img">
      <img src={url} alt="" loading="lazy" />
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Note card                                                          */
/* ------------------------------------------------------------------ */

export function hasMedia(note: Note): boolean {
  return note.blocks.some(
    (b) => b.type === 'image' || b.type === 'file' || b.type === 'audio' || b.type === 'flashcards'
  )
}

export function NoteCard({
  note,
  onOpen,
  grid,
  selectMode,
  selected,
  onToggleSelect,
}: {
  note: Note
  onOpen: () => void
  grid?: boolean
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}) {
  const pal = palClass(note.color)

  const inner = (
    <>
      {selectMode && (
        <span className={cn('pick', selected && 'pick-on')} aria-hidden>
          {selected && <Icon name="check" size={12} strokeWidth={3} />}
        </span>
      )}
      {note.locked ? (
        <>
          <span className="locked-glyph">
            <Icon name="lock" size={16} />
          </span>
          <span className="note-title">Locked note</span>
        </>
      ) : (
        <>
          {note.title && <span className="note-title">{note.title}</span>}
          <NotePreview note={note} compact={grid} />
          <span className="note-flags">
            {note.pinned && <Icon name="pin" size={13} className="note-pin" />}
            {note.reminder && <Icon name="bell" size={13} className="note-rem" />}
            {hasMedia(note) && <Icon name="media" size={14} className="note-media" />}
          </span>
        </>
      )}
    </>
  )

  const cls = cn('note-card', pal, grid && 'note-card-grid', note.locked && 'note-card-locked', selectMode && 'note-card-select', selected && 'note-card-selected')

  if (selectMode) {
    return (
      <button className={cls} onClick={onToggleSelect}>
        {inner}
      </button>
    )
  }
  return (
    <button className={cls} onClick={onOpen} data-note-id={note.id}>
      {inner}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Folder cards — compact, solid icon, nullable color                 */
/* ------------------------------------------------------------------ */

export function FolderCard({
  folder,
  count,
  onOpen,
  locked,
}: {
  folder: Folder
  count?: number
  onOpen: () => void
  locked?: boolean
}) {
  return (
    <button
      className={cn('folder-card', palClass(folder.color), locked && 'folder-card-locked')}
      onClick={onOpen}
      data-drop-folder={locked ? undefined : folder.id}
    >
      <span className="folder-glyph">
        <Icon name={locked ? 'lock' : 'folder'} size={17} />
      </span>
      <span className="folder-meta">
        <span className="folder-name">{folder.name}</span>
        {!locked && <span className="folder-count">{count ?? 0}</span>}
      </span>
    </button>
  )
}

/** Compact folder row used in pickers + search results. */
export function FolderRow({
  folder,
  count,
  onOpen,
  trailing,
  locked,
}: {
  folder: Folder
  count?: number
  onOpen: () => void
  trailing?: React.ReactNode
  locked?: boolean
}) {
  return (
    <button className="folder-row" onClick={onOpen} data-drop-folder={locked ? undefined : folder.id}>
      <span className={cn('folder-row-glyph', palClass(folder.color))}>
        <Icon name={locked ? 'lock' : 'folder'} size={16} />
      </span>
      <span className="folder-row-name">{folder.name}</span>
      <span className="folder-row-count">{locked ? 'Locked' : count !== undefined ? count : ''}</span>
      {trailing}
    </button>
  )
}

/** Small color dot shown next to folder titles. */
export function ColorDot({ color, size = 12 }: { color: Folder['color']; size?: number }) {
  if (!color) return <span className="color-dot-empty" style={{ width: size, height: size }} />
  return <span className={cn('color-dot-solid', palClass(color))} style={{ width: size, height: size }} />
}

export function EmptyState({
  icon = 'edit',
  title,
  sub,
  action,
}: {
  icon?: string
  title: string
  sub?: string
  action?: React.ReactNode
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      {sub && <p>{sub}</p>}
      {action}
    </div>
  )
}
