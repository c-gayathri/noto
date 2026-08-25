import type { Folder, Note } from '@/core/types'
import { colorOf } from '@/core/palette'
import { firstSnippet, formatDate, cn } from '@/core/utils'
import { Icon } from './Icon'

export function NoteCard({
  note,
  onOpen,
  onMenu,
  folderLabel,
}: {
  note: Note
  onOpen: () => void
  onMenu?: (e: React.MouseEvent) => void
  folderLabel?: string
}) {
  const color = colorOf(note.color)

  if (note.locked) {
    return (
      <button className="note-card note-card-locked" onClick={onOpen} data-note-id={note.id}>
        <span className="locked-glyph">
          <Icon name="lock" size={17} />
        </span>
        <span className="note-card-main">
          <span className="note-title">Locked note</span>
          <span className="note-sub">Tap to unlock with passcode or biometrics</span>
        </span>
      </button>
    )
  }

  const snippet = note.blocks.find((b) => b.type === 'text') as
    | { type: 'text'; html: string }
    | undefined
  const hasMedia = note.blocks.some(
    (b) => b.type === 'image' || b.type === 'file' || b.type === 'audio' || b.type === 'flashcards'
  )

  return (
    <button
      className={cn('note-card')}
      style={note.color ? { background: color.soft, borderColor: color.bg } : undefined}
      onClick={onOpen}
      data-note-id={note.id}
    >
      <span className="note-card-main">
        <span className="note-title">{note.title || 'Untitled'}</span>
        {snippet && <span className="note-snippet">{firstSnippet(snippet.html)}</span>}
        <span className="note-meta">
          {formatDate(note.updatedAt)}
          {folderLabel ? ` · ${folderLabel}` : ''}
          {hasMedia ? ' · 📎' : ''}
        </span>
      </span>
      <span className="note-card-side">
        {note.pinned && <Icon name="pin" size={15} className="note-pin" />}
        {note.reminder && <Icon name="bell" size={14} className="note-rem" />}
        {onMenu && (
          <button className="icon-btn note-menu" onClick={onMenu} aria-label="Note actions">
            <Icon name="more-v" size={17} />
          </button>
        )}
      </span>
    </button>
  )
}

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
  const color = colorOf(folder.color)
  return (
    <button
      className={cn('folder-card', locked && 'folder-card-locked')}
      style={locked ? undefined : { background: color.bg }}
      onClick={onOpen}
      data-drop-folder={locked ? undefined : folder.id}
    >
      <span className="folder-glyph" style={locked ? undefined : { color: color.fg }}>
        <Icon name={locked ? 'lock' : 'folder'} size={20} />
      </span>
      <span className="folder-name">{folder.name}</span>
      {!locked && <span className="folder-count">{count ?? 0} notes</span>}
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
  const color = colorOf(folder.color)
  return (
    <button className="folder-row" onClick={onOpen} data-drop-folder={locked ? undefined : folder.id}>
      <span
        className="folder-row-glyph"
        style={{ background: locked ? 'var(--bg-3)' : color.bg, color: locked ? 'var(--text-3)' : color.fg }}
      >
        <Icon name={locked ? 'lock' : 'folder'} size={18} />
      </span>
      <span className="folder-row-name">{folder.name}</span>
      <span className="folder-row-count">{locked ? 'Locked' : `${count ?? 0}`}</span>
      {trailing}
    </button>
  )
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
