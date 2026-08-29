import { useEffect, useRef, useState } from 'react'
import { cn } from '@/core/utils'

/* ------------------------------------------------------------------ */
/* Lightweight rich text on contentEditable. Formatting controls live */
/* in the editor's bottom bar (FormatBar), not next to the cursor.    */
/* This component exposes the live element + html so the bar can      */
/* apply commands to the focused block.                               */
/* ------------------------------------------------------------------ */

export interface RichTextHandle {
  id: string
  el: HTMLElement
}

export function RichText({
  html,
  onChange,
  onFocusChange,
  register,
  placeholder = 'Start writing…',
  className,
  autoFocus,
}: {
  html: string
  onChange: (html: string) => void
  onFocusChange?: (id: string | null) => void
  register?: (handle: RichTextHandle | null) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [focused, setFocused] = useState(false)
  const idRef = useRef(`rt_${Math.random().toString(36).slice(2, 8)}`)

  // Sync external html → DOM only when not focused (avoid caret jumps)
  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.innerHTML !== html) {
      el.innerHTML = html
    }
  }, [html])

  useEffect(() => {
    const handle = { id: idRef.current, el: ref.current as HTMLElement }
    register?.(handle)
    return () => register?.(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus()
      const sel = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(ref.current)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={cn('rich-wrap', className)}>
      <div
        ref={ref}
        className="rich"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onFocus={() => {
          setFocused(true)
          onFocusChange?.(idRef.current)
        }}
        onBlur={() => {
          setFocused(false)
          onFocusChange?.(null)
          onChange(ref.current?.innerHTML ?? '')
        }}
        onInput={() => onChange(ref.current?.innerHTML ?? '')}
      />
      {focused && <span className="rich-focus-ring" aria-hidden />}
    </div>
  )
}

/** Read-only rich text (export card). */
export function RichTextView({ html }: { html: string }) {
  return <div className="rich rich-view" dangerouslySetInnerHTML={{ __html: html }} />
}
