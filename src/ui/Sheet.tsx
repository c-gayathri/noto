import { useEffect, type ReactNode } from 'react'
import { cn } from '@/core/utils'
import { Icon } from './Icon'

export function Sheet({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="scrim" onClick={onClose}>
      <div
        className={cn('sheet', wide && 'sheet-wide')}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <div className="sheet-handle" />
        {title && (
          <div className="sheet-title">
            <span>{title}</span>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="x" size={20} />
            </button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

export function Modal({
  open,
  onClose,
  children,
  center,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  center?: boolean
}) {
  if (!open) return null
  return (
    <div className="scrim scrim-dark" onClick={onClose}>
      <div
        className={cn('modal', center && 'modal-center')}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        {children}
      </div>
    </div>
  )
}
