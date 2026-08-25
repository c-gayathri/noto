import { useState } from 'react'
import { Icon, type IconName } from './Icon'

interface CreateOption {
  icon: IconName
  tint: string
  title: string
  subtitle: string
  onSelect: () => void
}

export function CreateMenu({
  open,
  onClose,
  onText,
  onVoice,
  onFile,
  onFolder,
  onFlashcards,
  onTemplates,
}: {
  open: boolean
  onClose: () => void
  onText: () => void
  onVoice: () => void
  onFile: () => void
  onFolder: () => void
  onFlashcards: () => void
  onTemplates: () => void
}) {
  const [closing, setClosing] = useState(false)
  if (!open) return <span />

  const options: CreateOption[] = [
    { icon: 'edit', tint: 'var(--t-blue)', title: 'Text Note', subtitle: 'Write something', onSelect: onText },
    { icon: 'mic', tint: 'var(--t-purple)', title: 'Voice Note', subtitle: 'Record your thoughts', onSelect: onVoice },
    { icon: 'file', tint: 'var(--t-orange)', title: 'File', subtitle: 'Add photos, docs or files', onSelect: onFile },
    { icon: 'folder', tint: 'var(--t-teal)', title: 'Folder', subtitle: 'Organize your notes', onSelect: onFolder },
    { icon: 'cards', tint: 'var(--t-pink)', title: 'Flashcards', subtitle: 'Study and remember', onSelect: onFlashcards },
    { icon: 'copy', tint: 'var(--t-green)', title: 'From Template', subtitle: 'Journal, list, meeting…', onSelect: onTemplates },
  ]

  const close = (fn?: () => void) => {
    if (fn) fn()
    onClose()
  }

  return (
    <div className="scrim scrim-dark" onClick={onClose}>
      <div className="create-menu" onClick={(e) => e.stopPropagation()}>
        <div className="create-menu-card">
          <h3 className="create-menu-title">What would you like to create?</h3>
          <div className="create-menu-list">
            {options.map((o) => (
              <button key={o.title} className="create-option" onClick={() => close(o.onSelect)}>
                <span className="create-option-icon" style={{ background: o.tint }}>
                  <Icon name={o.icon} size={21} />
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
