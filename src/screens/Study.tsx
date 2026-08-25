import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import type { Flashcard, NoteBlock } from '@/core/types'
import { cn, vibrate } from '@/core/utils'
import { useFileURL } from '@/core/fileStore'
import { Icon } from '@/ui/Icon'
import { TopBar } from '@/ui/TopBar'
import { EmptyState } from '@/ui/cards'
import { useLock } from '@/ui/Lock'

/* ------------------------------------------------------------------ */
/* Flashcard study mode: tap to flip, swipe or arrows to move.        */
/* Minimal animation on purpose.                                      */
/* ------------------------------------------------------------------ */

export function Study() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { ensureUnlocked, unlocked } = useLock()
  const note = useLiveQuery(() => db.notes.get(id), [id], undefined)

  const cards = useMemo<Flashcard[]>(
    () =>
      (note?.blocks ?? [])
        .filter((b): b is Extract<NoteBlock, { type: 'flashcards' }> => b.type === 'flashcards')
        .flatMap((b) => b.cards)
        .filter((c) => c.front.trim() || c.back.trim() || c.frontImageId || c.backImageId),
    [note]
  )

  const [order, setOrder] = useState<number[] | null>(null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [dragX, setDragX] = useState(0)
  const startRef = useRef<number | null>(null)

  const deckOrder = order ?? cards.map((_, i) => i)
  const current = cards[deckOrder[index]]

  useEffect(() => {
    if (note?.locked && !unlocked) void ensureUnlocked()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id, note?.locked, unlocked])

  if (!note) {
    return (
      <div className="screen">
        <TopBar back />
        <EmptyState icon="cards" title="Note not found" />
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="screen">
        <TopBar back title="Study" />
        <EmptyState
          icon="cards"
          title="No cards yet"
          sub="Add flashcards to this note to study them here."
          action={
            <button className="btn btn-primary" onClick={() => navigate(`/note/${id}`)}>
              Edit note
            </button>
          }
        />
      </div>
    )
  }

  const shuffle = () => {
    const next = [...deckOrder]
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[next[i], next[j]] = [next[j], next[i]]
    }
    setOrder(next)
    setIndex(0)
    setFlipped(false)
  }

  const go = (dir: 1 | -1) => {
    setFlipped(false)
    setDragX(0)
    setIndex((i) => Math.min(cards.length - 1, Math.max(0, i + dir)))
  }

  return (
    <div className="screen study-screen">
      <TopBar
        back
        title={note.title || 'Study'}
        subtitle={`${index + 1} of ${cards.length}`}
        right={
          <button className="icon-btn" onClick={shuffle} aria-label="Shuffle">
            <Icon name="refresh" size={19} />
          </button>
        }
      />

      <div
        className="study-stage"
        onPointerDown={(e) => {
          startRef.current = e.clientX
        }}
        onPointerMove={(e) => {
          if (startRef.current !== null) setDragX(e.clientX - startRef.current)
        }}
        onPointerUp={(e) => {
          if (startRef.current === null) return
          const dx = e.clientX - startRef.current
          startRef.current = null
          if (dx < -60) go(1)
          else if (dx > 60) go(-1)
          else setDragX(0)
        }}
      >
        <div
          key={deckOrder[index]}
          className={cn('study-card', flipped && 'flipped')}
          style={dragX ? { transform: `translateX(${dragX * 0.4}px) rotate(${dragX * 0.02}deg)` } : undefined}
          onClick={() => {
            setFlipped((f) => !f)
            vibrate(6)
          }}
        >
          <div className="study-card-face study-card-front">
            <CardFace text={current.front} imageId={current.frontImageId} placeholder="Empty front" />
            <span className="study-card-hint">{flipped ? '' : 'Tap to reveal'}</span>
          </div>
          <div className="study-card-face study-card-back">
            <CardFace text={current.back} imageId={current.backImageId} placeholder="Empty back" />
          </div>
        </div>
      </div>

      <div className="study-controls">
        <button className="study-btn" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous">
          <Icon name="chevron-left" size={22} />
        </button>
        <button className="study-btn study-btn-flip" onClick={() => setFlipped((f) => !f)}>
          <Icon name="refresh" size={18} /> Flip
        </button>
        <button
          className="study-btn"
          onClick={() => go(1)}
          disabled={index === cards.length - 1}
          aria-label="Next"
        >
          <Icon name="chevron-right" size={22} />
        </button>
      </div>

      <div className="study-progress">
        <span style={{ width: `${((index + 1) / cards.length) * 100}%` }} />
      </div>
    </div>
  )
}

function CardFace({ text, imageId, placeholder }: { text: string; imageId?: string; placeholder: string }) {
  const url = useFileURL(imageId)
  return (
    <div className="study-face-content">
      {url && <img src={url} alt="" />}
      {text ? <p>{text}</p> : !url ? <p className="study-empty-face">{placeholder}</p> : null}
    </div>
  )
}
