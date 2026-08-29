import { useRef, useState } from 'react'
import type { ChecklistItem, Flashcard, NoteBlock } from '@/core/types'
import { uid, cn } from '@/core/utils'
import { Icon } from './Icon'
import { useStoredFile } from '@/core/fileStore'
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
  const addInput = useRef<HTMLInputElement | null>(null)

  const update = (next: ChecklistItem[]) => onChange?.(next)
  const toggle = (id: string) => update(items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)))
  const setText = (id: string, text: string) => update(items.map((i) => (i.id === id ? { ...i, text } : i)))
  const remove = (id: string) => update(items.filter((i) => i.id !== id))

  const addAfter = (afterId?: string) => {
    const item: ChecklistItem = { id: uid('i_'), text: '', checked: false }
    if (!afterId) {
      update([...items, item])
    } else {
      const idx = items.findIndex((i) => i.id === afterId)
      const next = [...items]
      next.splice(idx + 1, 0, item)
      update(next)
    }
    // focus the freshly created input
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-check-id="${item.id}"]`)
      el?.focus()
    })
  }

  const addFromDraft = () => {
    const text = draft.trim()
    if (!text) return
    update([...items, { id: uid('i_'), text, checked: false }])
    setDraft('')
    requestAnimationFrame(() => addInput.current?.blur())
  }

  const done = items.filter((i) => i.checked).length

  if (readOnly) {
    return (
      <div className="checklist checklist-readonly">
        {items.map((i) => (
          <div key={i.id} className={cn('check-item', i.checked && 'checked')}>
            <span className="check-box">{i.checked && <Icon name="check" size={12} strokeWidth={3} />}</span>
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
          <span>
            {done}/{items.length}
          </span>
        </div>
      )}
      {items.map((i) => (
        <div key={i.id} className={cn('check-item', i.checked && 'checked')}>
          <button className="check-box" onClick={() => toggle(i.id)} aria-label="Toggle">
            {i.checked && <Icon name="check" size={12} strokeWidth={3} />}
          </button>
          <input
            className="check-text"
            data-check-id={i.id}
            value={i.text}
            placeholder="Item"
            onChange={(e) => setText(i.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addAfter(i.id)
              }
              if (e.key === 'Backspace' && i.text === '' && items.length > 1) {
                e.preventDefault()
                const idx = items.findIndex((x) => x.id === i.id)
                remove(i.id)
                requestAnimationFrame(() => {
                  const prev = items[idx - 1] ?? items[items.length - 1]
                  if (prev && prev.id !== i.id) {
                    document.querySelector<HTMLInputElement>(`[data-check-id="${prev.id}"]`)?.focus()
                  }
                })
              }
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
          ref={addInput}
          className="check-text"
          placeholder="Add item…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addFromDraft()
            }
          }}
          onBlur={addFromDraft}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Flashcards block — preview (card stack) ⇄ edit                     */
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
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <FlashcardsPreview
        cards={cards}
        noteId={noteId}
        onEdit={() => setEditing(true)}
      />
    )
  }

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
        <span className="cards-head-actions">
          <a className="cards-study-link" href={`/note/${noteId}/study`}>
            <Icon name="play" size={12} /> Study
          </a>
          <button className="cards-done-link" onClick={() => setEditing(false)}>
            <Icon name="check" size={13} /> Done
          </button>
        </span>
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

function FlashcardsPreview({
  cards,
  noteId,
  onEdit,
}: {
  cards: Flashcard[]
  noteId: string
  onEdit: () => void
}) {
  const first = cards[0]
  return (
    <div className="cards-preview">
      <div className="cards-stack">
        <span className="cards-ghost cards-ghost-2" />
        <span className="cards-ghost cards-ghost-1" />
        <div className="cards-top">
          {first ? (
            <>
              <span className="cards-q">{first.front || 'Empty card'}</span>
              <span className="cards-a">{first.back || 'Tap edit to fill'}</span>
            </>
          ) : (
            <span className="cards-q">No cards yet</span>
          )}
        </div>
      </div>
      <div className="cards-preview-actions">
        <span className="cards-count">
          {cards.length} card{cards.length === 1 ? '' : 's'}
        </span>
        <span className="cards-head-actions">
          <a className="cards-study-link" href={`/note/${noteId}/study`}>
            <Icon name="play" size={12} /> Study
          </a>
          <button className="cards-done-link" onClick={onEdit}>
            <Icon name="edit" size={13} /> Edit
          </button>
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Read-only block renderer — used by export                          */
/* ------------------------------------------------------------------ */

export function ExportBlock({ block }: { block: NoteBlock }) {
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
          <Icon name="headphones" size={14} /> Voice note
          {block.transcript ? ` — ${block.transcript.slice(0, 80)}` : ''}
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
  const [url, setUrl] = useState<string | null>(null)
  useEffectOnce(() => {
    void import('@/core/fileStore').then(({ fileURL }) => void fileURL(fileId).then(setUrl))
  }, [fileId])
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

function useEffectOnce(fn: () => void, deps: unknown[]) {
  const ref = useRef(false)
  const [tick, setTick] = useState(0)
  if (!ref.current) {
    ref.current = true
    Promise.resolve().then(fn)
  }
  void deps
  void tick
  void setTick
}
