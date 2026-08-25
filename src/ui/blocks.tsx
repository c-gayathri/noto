import { useState } from 'react'
import type { ChecklistItem, Flashcard } from '@/core/types'
import { uid, cn } from '@/core/utils'
import { Icon } from './Icon'
import { useFileURL, useStoredFile } from '@/core/fileStore'
import { RichTextView } from './RichText'

/* ------------------------------------------------------------------ */
/* Checklist block                                                    */
/* ------------------------------------------------------------------ */

export function ChecklistView({
  items,
  onChange,
  readOnly,
}: {
  items: ChecklistItem[]
  onChange?: (items: ChecklistItem[]) => void
  readOnly?: boolean
}) {
  const [draft, setDraft] = useState('')

  const update = (next: ChecklistItem[]) => onChange?.(next)
  const toggle = (id: string) =>
    update(items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)))
  const setText = (id: string, text: string) =>
    update(items.map((i) => (i.id === id ? { ...i, text } : i)))
  const remove = (id: string) => update(items.filter((i) => i.id !== id))
  const add = () => {
    const text = draft.trim()
    if (!text) return
    update([...items, { id: uid('i_'), text, checked: false }])
    setDraft('')
  }

  const done = items.filter((i) => i.checked).length

  if (readOnly) {
    return (
      <div className="checklist checklist-readonly">
        {items.map((i) => (
          <div key={i.id} className={cn('check-item', i.checked && 'checked')}>
            <span className="check-box">
              {i.checked && <Icon name="check" size={12} strokeWidth={3} />}
            </span>
            <span className="check-text">{i.text}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="checklist">
      {items.length > 1 && (
        <div className="check-progress">
          <span>{done}/{items.length}</span>
        </div>
      )}
      {items.map((i) => (
        <div key={i.id} className={cn('check-item', i.checked && 'checked')}>
          <button className="check-box" onClick={() => toggle(i.id)} aria-label="Toggle">
            {i.checked && <Icon name="check" size={12} strokeWidth={3} />}
          </button>
          <input
            className="check-text"
            value={i.text}
            placeholder="Item"
            onChange={(e) => setText(i.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.target as HTMLInputElement).blur()
                add()
              }
              if (e.key === 'Backspace' && i.text === '') remove(i.id)
            }}
          />
          <button className="check-remove" onClick={() => remove(i.id)} aria-label="Remove item">
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
      <div className="check-item check-add">
        <span className="check-box check-box-plus">
          <Icon name="plus" size={12} strokeWidth={2.4} />
        </span>
        <input
          className="check-text"
          placeholder="Add item…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
          onBlur={add}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Flashcards block (editor)                                          */
/* ------------------------------------------------------------------ */

export function FlashcardsEditor({
  cards,
  onChange,
  noteId,
}: {
  cards: Flashcard[]
  onChange?: (cards: Flashcard[]) => void
  noteId: string
}) {
  const update = (next: Flashcard[]) => onChange?.(next)
  const setCard = (id: string, patch: Partial<Flashcard>) =>
    update(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const remove = (id: string) => update(cards.filter((c) => c.id !== id))
  const add = () => update([...cards, { id: uid('c_'), front: '', back: '' }])

  return (
    <div className="cards-editor">
      <div className="cards-editor-head">
        <span className="cards-count">
          {cards.length} card{cards.length === 1 ? '' : 's'}
        </span>
        <a className="cards-study-link" href={`/note/${noteId}/study`}>
          <Icon name="play" size={13} /> Study
        </a>
      </div>
      {cards.map((c, idx) => (
        <div key={c.id} className="card-edit">
          <span className="card-edit-num">{idx + 1}</span>
          <div className="card-edit-fields">
            <textarea
              className="card-edit-input"
              placeholder="Front — question"
              rows={1}
              value={c.front}
              onChange={(e) => setCard(c.id, { front: e.target.value })}
            />
            <div className="card-edit-divider" />
            <textarea
              className="card-edit-input"
              placeholder="Back — answer"
              rows={1}
              value={c.back}
              onChange={(e) => setCard(c.id, { back: e.target.value })}
            />
          </div>
          <button className="check-remove" onClick={() => remove(c.id)} aria-label="Delete card">
            <Icon name="trash" size={14} />
          </button>
        </div>
      ))}
      <button className="card-add" onClick={add}>
        <Icon name="plus" size={15} /> Add card
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Read-only block renderer — used by export (PDF/image/text prep)    */
/* ------------------------------------------------------------------ */

export function ExportBlock({ block }: { block: import('@/core/types').NoteBlock }) {
  switch (block.type) {
    case 'text':
      return <RichTextView html={block.html} />
    case 'checklist':
      return <ChecklistView items={block.items} readOnly />
    case 'image':
      return <ExportImage fileId={block.fileId} caption={block.caption} />
    case 'file':
      return <ExportFileChip fileId={block.fileId} />
    case 'audio':
      return (
        <div className="export-chip">
          <Icon name="headphones" size={14} /> Voice note{block.transcript ? ` — ${block.transcript.slice(0, 80)}` : ''}
        </div>
      )
    case 'link':
      return (
        <div className="export-chip">
          <Icon name="link" size={14} /> {block.title || block.url}
        </div>
      )
    case 'flashcards':
      return (
        <div className="export-cards">
          {block.cards.map((c) => (
            <div key={c.id} className="export-card-qa">
              <b>Q: {c.front}</b>
              <span>A: {c.back}</span>
            </div>
          ))}
        </div>
      )
    default:
      return null
  }
}

function ExportImage({ fileId, caption }: { fileId: string; caption?: string }) {
  const url = useFileURL(fileId)
  if (!url) return null
  return (
    <figure className="export-image">
      <img src={url} alt={caption || ''} />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

function ExportFileChip({ fileId }: { fileId: string }) {
  const file = useStoredFile(fileId)
  if (!file) return null
  return (
    <div className="export-chip">
      <Icon name="file-text" size={14} /> {file.name}
    </div>
  )
}
