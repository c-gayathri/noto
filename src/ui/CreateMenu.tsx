import { Icon, type IconName } from './Icon'

export type CreateOptionKind = 'text' | 'voice' | 'file' | 'folder' | 'flashcards' | 'templates'

interface CreateOption {
  kind: CreateOptionKind
  icon: IconName
  tint: string
  title: string
  subtitle: string
}

const ALL_OPTIONS: Record<CreateOptionKind, CreateOption> = {
  text: { kind: 'text', icon: 'edit', tint: 'var(--t-blue)', title: 'Text Note', subtitle: 'Write something' },
  voice: { kind: 'voice', icon: 'mic', tint: 'var(--t-purple)', title: 'Voice Note', subtitle: 'Record your thoughts' },
  file: { kind: 'file', icon: 'file', tint: 'var(--t-orange)', title: 'File', subtitle: 'Add photos, docs or files' },
  folder: { kind: 'folder', icon: 'folder', tint: 'var(--t-teal)', title: 'Folder', subtitle: 'Organize your notes' },
  flashcards: { kind: 'flashcards', icon: 'cards', tint: 'var(--t-pink)', title: 'Flashcards', subtitle: 'Study and remember' },
  templates: { kind: 'templates', icon: 'copy', tint: 'var(--t-green)', title: 'From Template', subtitle: 'Start from a layout' },
}

export function CreateMenu({
  open,
  onClose,
  kinds,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  kinds: CreateOptionKind[]
  onSelect: (kind: CreateOptionKind) => void
}) {
  if (!open) return <span />

  const options = kinds.map((k) => ALL_OPTIONS[k])

  return (
    <div className="scrim scrim-dark" onClick={onClose}>
      <div className="create-menu" onClick={(e) => e.stopPropagation()}>
        <div className="create-menu-card">
          <h3 className="create-menu-title">What would you like to create?</h3>
          <div className="create-menu-list">
            {options.map((o) => (
              <button
                key={o.kind}
                className="create-option"
                onClick={() => {
                  onSelect(o.kind)
                  onClose()
                }}
              >
                <span className="create-option-icon" style={{ background: o.tint }}>
                  <Icon name={o.icon} size={20} />
                </span>
                <span className="create-option-text">
                  <span className="create-option-title">{o.title}</span>
                  <span className="create-option-sub">{o.subtitle}</span>
                </span>
              </button>
            ))}
          </div>
          <button className="create-menu-close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={22} />
          </button>
        </div>
      </div>
    </div>
  )
}
