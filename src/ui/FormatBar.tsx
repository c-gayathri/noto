import { useState } from 'react'
import { cn } from '@/core/utils'
import { Icon } from './Icon'
import { useDialogs } from './Dialogs'
import type { RichTextHandle } from './RichText'

/* ------------------------------------------------------------------ */
/* Formatting controls that live in the editor's bottom bar.          */
/* Every command re-reads innerHTML and pushes it up, which is what   */
/* makes highlight/color/etc. persist correctly.                      */
/* ------------------------------------------------------------------ */

const TEXT_COLORS = ['#e03131', '#e8890c', '#2b8a3e', '#1971c2', '#7048e8', '#d6336c']

export function execOnHandle(handle: RichTextHandle | null, cmd: string, value?: string): string | null {
  if (!handle) return null
  const sel = window.getSelection()
  const hadFocus = document.activeElement === handle.el
  if (!hadFocus) {
    handle.el.focus()
    // restore last selection if the browser dropped it
    if (!sel || sel.rangeCount === 0 || !handle.el.contains(sel.anchorNode)) {
      const range = document.createRange()
      range.selectNodeContents(handle.el)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }
  document.execCommand('styleWithCSS', false, 'true')
  try {
    document.execCommand(cmd, false, value)
  } catch {
    /* command unsupported */
  }
  return handle.el.innerHTML
}

export function FormatBar({
  getHandle,
  onHtmlChange,
  onConvertToChecklist,
}: {
  getHandle: () => RichTextHandle | null
  onHtmlChange: (html: string) => void
  onConvertToChecklist: () => void
}) {
  const dialogs = useDialogs()
  const [colorOpen, setColorOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const apply = (cmd: string, value?: string) => {
    const html = execOnHandle(getHandle(), cmd, value)
    if (html !== null) onHtmlChange(html)
  }

  const heading = () => {
    const h = getHandle()
    if (!h) return
    const current = (document.queryCommandValue('formatBlock') || 'p').toLowerCase()
    const next = current === 'p' || current === 'div' ? 'h2' : current === 'h2' ? 'h3' : 'p'
    apply('formatBlock', next)
  }

  const addLink = async () => {
    const h = getHandle()
    if (!h) return
    const sel = window.getSelection()
    const selected = sel?.toString().trim()
    const url = await dialogs.prompt({ title: 'Link URL', placeholder: 'https://…', confirmLabel: 'Add link' })
    if (!url) return
    const full = url.startsWith('http') ? url : `https://${url}`
    if (selected) apply('createLink', full)
    else {
      h.el.focus()
      document.execCommand('insertHTML', false, `<a href="${full}">${full}</a>`)
      onHtmlChange(h.el.innerHTML)
    }
  }

  const btn = (icon: string, label: string, action: () => void) => (
    <button
      key={label}
      className="fmt-btn"
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
    >
      <Icon name={icon} size={18} />
    </button>
  )

  return (
    <div className="format-bar">
      <div className="fmt-row">
        {btn('bold', 'Bold', () => apply('bold'))}
        {btn('italic', 'Italic', () => apply('italic'))}
        {btn('underline', 'Underline', () => apply('underline'))}
        {btn('heading', 'Heading', heading)}
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
                    apply('foreColor', c)
                    setColorOpen(false)
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <button
          className="fmt-btn fmt-highlight"
          title="Highlight"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => apply('hiliteColor', '#ffe066')}
        >
          <span className="hl-demo" />
        </button>
        {btn('list', 'Bullets', () => apply('insertUnorderedList'))}
        {btn('list-ordered', 'Numbered', () => apply('insertOrderedList'))}
        {btn('link', 'Link', addLink)}
        <div className="fmt-color-wrap">
          {btn('more-h', 'More', () => setMoreOpen((o) => !o))}
          {moreOpen && (
            <div className="fmt-more">
              {btn('superscript', 'Superscript', () => apply('superscript'))}
              {btn('subscript', 'Subscript', () => apply('subscript'))}
              {btn('checklist', 'To checklist', onConvertToChecklist)}
              {btn('text-clear', 'Clear formatting', () => apply('removeFormat'))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
