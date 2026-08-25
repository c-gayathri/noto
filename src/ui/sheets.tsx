import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import * as repo from '@/core/repo'
import * as lock from '@/core/lock'
import { exportImage, exportPDF, exportText, noteToPlainText, type ExportLayout } from '@/core/export'
import { shareFiles } from '@/core/fileStore'
import { colorOf } from '@/core/palette'
import { TEMPLATES } from '@/core/templates'
import { formatDateTime, formatBytes } from '@/core/utils'
import type { Folder, Note, ReminderRecurrence } from '@/core/types'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ColorPicker } from './ColorPicker'
import { useDialogs, useToast } from './Dialogs'
import { useLock } from './Lock'
import { ExportBlock } from './blocks'
import { FolderRow } from './cards'
import { cn } from '@/core/utils'

/* ------------------------------------------------------------------ */
/* Shared row primitives                                              */
/* ------------------------------------------------------------------ */

export function ActionRow({
  icon,
  label,
  onClick,
  danger,
  trailing,
  sub,
}: {
  icon?: string
  label: string
  onClick?: () => void
  danger?: boolean
  trailing?: React.ReactNode
  sub?: string
}) {
  return (
    <button className={cn('action-row', danger && 'action-row-danger')} onClick={onClick}>
      {icon && (
        <span className="action-row-icon">
          <Icon name={icon} size={18} />
        </span>
      )}
      <span className="action-row-label">
        {label}
        {sub && <span className="action-row-sub">{sub}</span>}
      </span>
      {trailing}
    </button>
  )
}

export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <span
      className={cn('switch', on && 'switch-on')}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
    >
      <span className="switch-knob" />
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="sheet-section">{children}</div>
}

/* ------------------------------------------------------------------ */
/* Note actions                                                       */
/* ------------------------------------------------------------------ */

export function NoteActionsSheet({
  note,
  open,
  onClose,
  onDeleted,
}: {
  note: Note
  open: boolean
  onClose: () => void
  onDeleted?: () => void
}) {
  const dialogs = useDialogs()
  const toast = useToast()
  const navigate = useNavigate()
  const { configured: lockConfigured, ensureUnlocked } = useLock()
  const [showReminder, setShowReminder] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const [showExport, setShowExport] = useState(false)

  const guard = async (fn: () => void) => {
    if (note.locked) {
      const ok = await ensureUnlocked()
      if (!ok) return
    }
    fn()
  }

  return (
    <Sheet open={open} onClose={onClose} title={note.locked ? 'Locked note' : note.title || 'Note actions'}>
      {!showReminder && !showMove && !showExport && (
        <>
          <ActionRow
            icon="pin"
            label={note.pinned ? 'Unpin' : 'Pin'}
            onClick={() => {
              void repo.updateNote(note.id, { pinned: !note.pinned })
              onClose()
            }}
          />
          <ActionRow
            icon={note.locked ? 'unlock' : 'lock'}
            label={note.locked ? 'Remove lock' : 'Lock note'}
            sub={note.locked ? undefined : 'Requires passcode or biometrics'}
            onClick={async () => {
              if (!note.locked && !lockConfigured) {
                onClose()
                toast.show('Set a passcode first', 'lock')
                navigate('/settings?section=privacy')
                return
              }
              if (note.locked) {
                const ok = await ensureUnlocked()
                if (!ok) return
              }
              await repo.updateNote(note.id, { locked: !note.locked })
              toast.show(note.locked ? 'Note unlocked' : 'Note locked', note.locked ? 'unlock' : 'lock')
              onClose()
            }}
          />
          <ActionRow
            icon="bell"
            label="Reminder"
            sub={note.reminder ? `Set · ${formatDateTime(note.reminder.at)}` : undefined}
            onClick={() => guard(() => setShowReminder(true))}
          />
          <ActionRow icon="folder-move" label="Move to folder" onClick={() => guard(() => setShowMove(true))} />
          <SectionLabel>Background</SectionLabel>
          <div className="sheet-pad">
            <ColorPicker
              value={note.color}
              onChange={(c) => void repo.updateNote(note.id, { color: c })}
            />
          </div>
          <SectionLabel>More</SectionLabel>
          <ActionRow
            icon="offline"
            label="Available offline"
            sub="Keep files on this device"
            trailing={<Switch on={note.offline} onChange={(v) => void repo.updateNote(note.id, { offline: v })} />}
          />
          <ActionRow icon="share" label="Share" onClick={() => guard(async () => {
            const text = noteToPlainText(note)
            const ok = await shareFiles([], note.title || 'Note', text)
            if (!ok) {
              await navigator.clipboard?.writeText(text).catch(() => {})
              toast.show('Copied as text', 'copy')
            }
            onClose()
          })} />
          <ActionRow icon="download" label="Export" onClick={() => guard(() => setShowExport(true))} />
          <ActionRow
            icon="copy"
            label="Duplicate"
            onClick={async () => {
              await repo.duplicateNote(note.id)
              toast.show('Note duplicated', 'copy')
              onClose()
            }}
          />
          <ActionRow
            icon="archive"
            label={note.archived ? 'Unarchive' : 'Archive'}
            onClick={async () => {
              await repo.updateNote(note.id, { archived: !note.archived, pinned: false })
              toast.show(note.archived ? 'Unarchived' : 'Archived', 'archive')
              onClose()
            }}
          />
          <ActionRow
            icon="trash"
            label="Delete"
            danger
            onClick={async () => {
              const ok = await dialogs.confirm({
                title: 'Delete this note?',
                message: 'This cannot be undone.',
                confirmLabel: 'Delete',
                destructive: true,
              })
              if (!ok) return
              await repo.deleteNote(note.id)
              toast.show('Note deleted', 'trash')
              onClose()
              onDeleted?.()
            }}
          />
        </>
      )}
      {showReminder && (
        <ReminderEditor
          note={note}
          onDone={() => {
            setShowReminder(false)
            onClose()
          }}
        />
      )}
      {showMove && <MoveEditor note={note} onDone={() => { setShowMove(false); onClose() }} />}
      {showExport && <ExportEditor note={note} onDone={() => { setShowExport(false); onClose() }} />}
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* Reminder                                                           */
/* ------------------------------------------------------------------ */

function toLocalInput(ts: number): string {
  const d = new Date(ts - new Date().getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 16)
}

function ReminderEditor({ note, onDone }: { note: Note; onDone: () => void }) {
  const toast = useToast()
  const [when, setWhen] = useState(note.reminder ? toLocalInput(note.reminder.at) : toLocalInput(Date.now() + 3600_000))
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>(note.reminder?.recurrence ?? 'none')

  const save = async () => {
    const at = new Date(when).getTime()
    if (Number.isNaN(at)) return
    await repo.setReminder(note.id, at, recurrence)
    toast.show('Reminder set', 'bell')
    onDone()
  }

  return (
    <div className="reminder-editor">
      <SectionLabel>Remind me at</SectionLabel>
      <input
        className="input"
        type="datetime-local"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
      />
      <SectionLabel>Repeat</SectionLabel>
      <div className="chip-row">
        {(['none', 'daily', 'weekly', 'monthly'] as ReminderRecurrence[]).map((r) => (
          <button
            key={r}
            className={cn('chip', recurrence === r && 'chip-active')}
            onClick={() => setRecurrence(r)}
          >
            {r === 'none' ? 'Once' : r[0].toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>
      <div className="sheet-actions">
        {note.reminder && (
          <button
            className="btn btn-danger-soft"
            onClick={async () => {
              await repo.setReminder(note.id, null)
              toast.show('Reminder removed')
              onDone()
            }}
          >
            Remove
          </button>
        )}
        <button className="btn btn-primary" onClick={save}>
          Set reminder
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Move to folder                                                     */
/* ------------------------------------------------------------------ */

function MoveEditor({ note, onDone }: { note: Note; onDone: () => void }) {
  const folders = useLiveQuery(() => db.folders.filter((f) => !f.archived).toArray(), [], [] as Folder[])
  const counts = useLiveQuery(async () => {
    const notes = await db.notes.filter((n) => !n.archived && !n.locked).toArray()
    const map = new Map<string, number>()
    for (const n of notes) if (n.folderId) map.set(n.folderId, (map.get(n.folderId) ?? 0) + 1)
    return map
  }, [], new Map<string, number>())
  const [selected, setSelected] = useState<string | null>(note.folderId)
  const toast = useToast()

  const sorted = [...(folders ?? [])].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name)
  )

  return (
    <div>
      <SectionLabel>Choose a destination</SectionLabel>
      <FolderRow
        folder={{ id: '__unfile__', name: 'Unfiled', color: 'gray', pinned: false, locked: false, archived: false, offline: false, createdAt: 0, updatedAt: 0 }}
        count={undefined}
        locked={false}
        onOpen={() => setSelected(null)}
        trailing={
          <span className={cn('radio', selected === null && 'radio-on')}>
            {selected === null && <Icon name="check" size={12} strokeWidth={3} />}
          </span>
        }
      />
      {sorted.map((f) => (
        <FolderRow
          key={f.id}
          folder={f}
          count={counts?.get(f.id) ?? 0}
          onOpen={() => setSelected(f.id)}
          trailing={
            <span className={cn('radio', selected === f.id && 'radio-on')}>
              {selected === f.id && <Icon name="check" size={12} strokeWidth={3} />}
            </span>
          }
        />
      ))}
      <div className="sheet-actions">
        <button
          className="btn btn-primary"
          onClick={async () => {
            await repo.moveNote(note.id, selected)
            toast.show(selected ? 'Moved' : 'Moved to Unfiled', 'folder-move')
            onDone()
          }}
        >
          Move note
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Export                                                             */
/* ------------------------------------------------------------------ */

function ExportEditor({ note, onDone }: { note: Note; onDone: () => void }) {
  const toast = useToast()
  const [layout, setLayout] = useState<ExportLayout>('document')
  const exportRef = useRef<HTMLDivElement | null>(null)
  const color = colorOf(note.color)

  const doImage = async () => {
    toast.show('Rendering image…')
    await new Promise((r) => setTimeout(r, 120))
    if (exportRef.current) {
      await exportImage(exportRef.current, note, layout)
      toast.show('Image exported', 'download')
    }
    onDone()
  }

  return (
    <div>
      <SectionLabel>Export as</SectionLabel>
      <div className="export-options">
        <button className="export-option" onClick={() => { void exportPDF(note); toast.show('Opening print…'); onDone() }}>
          <Icon name="file-text" size={20} />
          <span>PDF</span>
          <small>Print-ready document</small>
        </button>
        <button className="export-option" onClick={doImage}>
          <Icon name="image" size={20} />
          <span>Image</span>
          <small>PNG · share or save</small>
        </button>
        <button className="export-option" onClick={() => { void exportText(note); toast.show('Text saved', 'download'); onDone() }}>
          <Icon name="type" size={20} />
          <span>Text</span>
          <small>Plain .txt file</small>
        </button>
      </div>
      <SectionLabel>Image layout</SectionLabel>
      <div className="chip-row">
        <button className={cn('chip', layout === 'document' && 'chip-active')} onClick={() => setLayout('document')}>
          Document
        </button>
        <button className={cn('chip', layout === 'square' && 'chip-active')} onClick={() => setLayout('square')}>
          Square
        </button>
      </div>
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={onDone}>Done</button>
      </div>

      {/* Off-screen render node used for the image export */}
      <div className="export-stage" aria-hidden>
        <div ref={exportRef} className="export-note" style={{ background: color.soft }}>
          <div className="export-note-accent" style={{ background: color.fg }} />
          <h1>{note.title || 'Untitled'}</h1>
          <div className="export-note-date">{formatDateTime(note.updatedAt)}</div>
          <div className="export-note-blocks">
            {note.blocks.map((b) => (
              <ExportBlock key={b.id} block={b} />
            ))}
          </div>
          <div className="export-note-brand">Nimbus</div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Folder actions                                                     */
/* ------------------------------------------------------------------ */

export function FolderActionsSheet({
  folder,
  open,
  onClose,
}: {
  folder: Folder
  open: boolean
  onClose: () => void
}) {
  const dialogs = useDialogs()
  const toast = useToast()
  const navigate = useNavigate()
  const { configured: lockConfigured, ensureUnlocked } = useLock()

  return (
    <Sheet open={open} onClose={onClose} title={folder.name}>
      <ActionRow
        icon="edit"
        label="Rename"
        onClick={async () => {
          const name = await dialogs.prompt({
            title: 'Rename folder',
            initial: folder.name,
            confirmLabel: 'Rename',
          })
          if (name) {
            await repo.updateFolder(folder.id, { name })
            toast.show('Folder renamed', 'check')
          }
          onClose()
        }}
      />
      <SectionLabel>Color</SectionLabel>
      <div className="sheet-pad">
        <ColorPicker value={folder.color} onChange={(c) => void repo.updateFolder(folder.id, { color: c })} />
      </div>
      <ActionRow
        icon="pin"
        label={folder.pinned ? 'Unpin' : 'Pin to top'}
        onClick={() => {
          void repo.updateFolder(folder.id, { pinned: !folder.pinned })
          onClose()
        }}
      />
      <ActionRow
        icon={folder.locked ? 'unlock' : 'lock'}
        label={folder.locked ? 'Remove lock' : 'Lock folder'}
        sub={folder.locked ? undefined : 'Hide contents behind passcode or biometrics'}
        onClick={async () => {
          if (!folder.locked && !lockConfigured) {
            onClose()
            toast.show('Set a passcode first', 'lock')
            navigate('/settings?section=privacy')
            return
          }
          if (folder.locked) {
            const ok = await ensureUnlocked()
            if (!ok) return
          }
          await repo.updateFolder(folder.id, { locked: !folder.locked })
          toast.show(folder.locked ? 'Folder unlocked' : 'Folder locked', folder.locked ? 'unlock' : 'lock')
          onClose()
        }}
      />
      <ActionRow
        icon="offline"
        label="Available offline"
        sub="Keep this folder on the device"
        trailing={<Switch on={folder.offline} onChange={(v) => void repo.updateFolder(folder.id, { offline: v })} />}
      />
      <ActionRow
        icon="share"
        label="Share as text"
        onClick={async () => {
          const notes = await db.notes.filter((n) => n.folderId === folder.id && !n.archived && !n.locked).toArray()
          const lines = notes
            .sort((a, b) => Number(b.pinned) - Number(a.pinned))
            .map((n) => `• ${n.title || 'Untitled'}`)
          const ok = await shareFiles([], folder.name, `${folder.name}\n\n${lines.join('\n')}`)
          if (!ok) {
            await navigator.clipboard?.writeText(`${folder.name}\n\n${lines.join('\n')}`).catch(() => {})
            toast.show('Copied as text', 'copy')
          }
          onClose()
        }}
      />
      <ActionRow
        icon="trash"
        label="Delete folder"
        danger
        sub="Notes move to Unfiled"
        onClick={async () => {
          const ok = await dialogs.confirm({
            title: `Delete “${folder.name}”?`,
            message: 'The folder is removed. Its notes are kept and become unfiled.',
            confirmLabel: 'Delete folder',
            destructive: true,
          })
          if (!ok) return
          await repo.deleteFolder(folder.id)
          toast.show('Folder deleted', 'trash')
          onClose()
          navigate('/')
        }}
      />
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* Template picker                                                    */
/* ------------------------------------------------------------------ */

export function TemplatePickerSheet({
  open,
  onClose,
  folderId,
}: {
  open: boolean
  onClose: () => void
  folderId: string | null
}) {
  const navigate = useNavigate()
  const toast = useToast()

  const pick = async (templateId: string) => {
    const t = TEMPLATES.find((x) => x.id === templateId)
    if (!t) return
    const note = await repo.createNote({
      folderId,
      title: t.name,
      color: t.color,
      blocks: t.build(),
    })
    onClose()
    toast.show(`New ${t.name}`, 'check')
    navigate(`/note/${note.id}`)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Start from a template">
      <div className="template-grid">
        {TEMPLATES.map((t) => (
          <button key={t.id} className="template-card" onClick={() => void pick(t.id)}>
            <span className="template-emoji">{t.emoji}</span>
            <span>{t.name}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* Storage helper used by Settings                                    */
/* ------------------------------------------------------------------ */

export function useFolderCounts() {
  return useLiveQuery(async () => {
    const notes = await db.notes.filter((n) => !n.archived && !n.locked).toArray()
    const map = new Map<string, number>()
    for (const n of notes) if (n.folderId) map.set(n.folderId, (map.get(n.folderId) ?? 0) + 1)
    return map
  }, [], new Map<string, number>())
}

export { formatBytes }
