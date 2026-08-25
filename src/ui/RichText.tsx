import { useEffect, useRef, useState } from 'react'
import { cn } from '@/core/utils'
import { Icon } from './Icon'
import { useDialogs } from './Dialogs'

/* ------------------------------------------------------------------ */
/* Lightweight rich text on contentEditable + execCommand.            */
/* Covers: bold, italic, underline, highlight, text color, bullets,   */
/* numbered lists, links, undo/redo. Deliberately not a word          */
/* processor.                                                         */
/* ------------------------------------------------------------------ */

const TEXT_COLORS = ['#e03131', '#e8890c', '#2b8a3e', '#1971c2', '#7048e8', '#1a2230']

function exec(cmd: string, value?: string) {
  document.execCommand('styleWithCSS', false, 'true')
  document.execCommand(cmd, false, value)
}

export function RichText({
  html,
  onChange,
  onConvertToChecklist,
  placeholder = 'Start writing…',
  className,
  autoFocus,
}: {
  html: string
  onChange: (html: string) => void
  onConvertToChecklist?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [focused, setFocused] = useState(false)
  const dialogs = useDialogs()

  // Sync external html → DOM only when not focused (avoid caret jumps)
  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.innerHTML !== html) {
      el.innerHTML = html
    }
  }, [html])

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
    <div className={cn('rich-wrap', className, focused && 'rich-focused')}>
      <div
        ref={ref}
        className="rich"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          onChange(ref.current?.innerHTML ?? '')
        }}
        onInput={() => onChange(ref.current?.innerHTML ?? '')}
      />
      {focused && (
        <FormatToolbar onConvertToChecklist={onConvertToChecklist} dialogs={dialogs} />
      )}
    </div>
  )
}

function FormatToolbar({
  onConvertToChecklist,
  dialogs,
}: {
  onConvertToChecklist?: () => void
  dialogs: { prompt: (o: { title: string; placeholder?: string; confirmLabel?: string }) => Promise<string | null> }
}) {
  const [colorOpen, setColorOpen] = useState(false)

  const btn = (icon: string, label: string, action: () => void, activeClass?: string) => (
    <button
      key={label}
      className={cn('fmt-btn', activeClass)}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
    >
      <Icon name={icon} size={17} />
    </button>
  )

  const addLink = async () => {
    const sel = window.getSelection()
    const selected = sel?.toString().trim()
    const url = await dialogs.prompt({
      title: 'Link URL',
      placeholder: 'https://…',
      confirmLabel: 'Add link',
    })
    if (!url) return
    const full = url.startsWith('http') ? url : `https://${url}`
    if (selected) {
      exec('createLink', full)
    } else {
      exec('insertHTML', `<a href="${full}">${full}</a>`)
    }
  }

  return (
    <div className="fmt-toolbar" contentEditable={false}>
      <div className="fmt-row">
        {btn('bold', 'Bold', () => exec('bold'))}
        {btn('italic', 'Italic', () => exec('italic'))}
        {btn('underline', 'Underline', () => exec('underline'))}
        {btn('highlighter', 'Highlight', () => exec('hiliteColor', '#ffe066'))}
        <div className="fmt-color-wrap">
          {btn('droplet', 'Text color', () => setColorOpen((o) => !o))}
          {colorOpen && (
            <div className="fmt-colors">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  className="fmt-color"
                  style={{ background: c }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    exec('foreColor', c)
                    setColorOpen(false)
                  }}
                />
              ))}
            </div>
          )}
        </div>
        {btn('list', 'Bullets', () => exec('insertUnorderedList'))}
        {btn('list-ordered', 'Numbered', () => exec('insertOrderedList'))}
        {onConvertToChecklist && btn('checklist', 'Checklist', onConvertToChecklist)}
        {btn('link', 'Link', addLink)}
        <span className="fmt-sep" />
        {btn('undo', 'Undo', () => exec('undo'))}
        {btn('redo', 'Redo', () => exec('redo'))}
      </div>
    </div>
  )
}

/** Read-only rich text (export card). */
export function RichTextView({ html }: { html: string }) {
  return <div className="rich rich-view" dangerouslySetInnerHTML={{ __html: html }} />
}
