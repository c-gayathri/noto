import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'

export function TopBar({
  title,
  back,
  left,
  right,
  subtitle,
}: {
  title?: ReactNode
  back?: boolean
  left?: ReactNode
  right?: ReactNode
  subtitle?: string
}) {
  const navigate = useNavigate()
  return (
    <header className="topbar">
      <div className="topbar-side">
        {back ? (
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
            <Icon name="chevron-left" size={24} />
          </button>
        ) : (
          left
        )}
      </div>
      <div className="topbar-center">
        {typeof title === 'string' ? <h1 className="topbar-title">{title}</h1> : title}
        {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
      </div>
      <div className="topbar-side topbar-right">{right}</div>
    </header>
  )
}
