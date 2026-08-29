import { useRef, useState } from 'react'
import type { ID } from '@/core/types'
import { vibrate } from '@/core/utils'

/* ------------------------------------------------------------------ */
/* Long-press gestures on note cards:                                 */
/*   · hold + drag     → drop onto a folder ([data-drop-folder]) or   */
/*                       the trash bubble ([data-drop="trash"])       */
/*   · hold + release  → enter multi-select (callback)                */
/* Works on touch + mouse. Dependency-free.                           */
/* ------------------------------------------------------------------ */

const UNFILE = '__unfile__'
const LONG_PRESS_MS = 260
const MOVE_TOLERANCE = 8

export function useNoteDrag(
  onDrop: (noteId: ID, folderId: ID | null) => void,
  onTrash?: (noteId: ID) => void,
  onLongPressRelease?: (noteId: ID) => void
) {
  const [draggingId, setDraggingId] = useState<ID | null>(null)
  const [overTarget, setOverTarget] = useState<string | null>(null)
  const press = useRef<{
    id: ID
    timer: number
    startX: number
    startY: number
    active: boolean
    moved: boolean
    suppressClick: boolean
  } | null>(null)
  const ghost = useRef<HTMLElement | null>(null)
  const overRef = useRef<string | null>(null)
  overRef.current = overTarget

  const clearGhost = () => {
    ghost.current?.remove()
    ghost.current = null
    document.querySelectorAll('.drop-hover').forEach((el) => el.classList.remove('drop-hover'))
    document.body.classList.remove('note-drag-active')
  }

  const activate = (el: HTMLElement, e: PointerEvent) => {
    const p = press.current
    if (!p) return
    p.active = true
    setDraggingId(p.id)
    vibrate(12)
    document.body.classList.add('note-drag-active')

    const rect = el.getBoundingClientRect()
    const clone = el.cloneNode(true) as HTMLElement
    clone.className = `${el.className} drag-ghost`
    clone.style.cssText += `position:fixed;left:0;top:0;width:${rect.width}px;margin:0;z-index:999;pointer-events:none;transform:translate(${e.clientX - rect.width / 2}px,${e.clientY - 28}px) rotate(2deg);box-shadow:0 12px 32px rgba(16,24,40,.22);`
    document.body.appendChild(clone)
    ghost.current = clone
    el.classList.add('drag-origin')

    const move = (ev: PointerEvent) => {
      if (!press.current) return
      press.current.moved = true
      if (!ghost.current) return
      ghost.current.style.transform = `translate(${ev.clientX - rect.width / 2}px,${ev.clientY - 28}px) rotate(2deg)`
      ghost.current.style.display = 'none'
      const under = document.elementFromPoint(ev.clientX, ev.clientY)
      ghost.current.style.display = ''
      const target =
        under?.closest('[data-drop-folder],[data-drop="trash"]') as HTMLElement | null
      document.querySelectorAll('.drop-hover').forEach((n) => n.classList.remove('drop-hover'))
      const key = target
        ? target.dataset.drop === 'trash'
          ? 'trash'
          : target.dataset.dropFolder ?? null
        : null
      if (target) {
        target.classList.add('drop-hover')
      }
      setOverTarget(key)
    }

    const finish = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      const cur = press.current
      el.classList.remove('drag-origin')
      clearGhost()
      setDraggingId(null)
      setOverTarget(null)
      if (!cur) return
      cur.suppressClick = true
      setTimeout(() => {
        if (press.current === cur) press.current = null
        else cur.suppressClick = false
      }, 350)

      if (cur.moved && overRef.current === 'trash' && onTrash) {
        onTrash(cur.id)
      } else if (cur.moved && overRef.current && overRef.current !== 'trash') {
        onDrop(cur.id, overRef.current === UNFILE ? null : overRef.current)
      } else if (!cur.moved && onLongPressRelease) {
        // held, then released without dragging → multi-select gesture
        onLongPressRelease(cur.id)
      }
      press.current = null
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }

  const bind = (noteId: ID) => ({
    'data-note-id': noteId,
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      const el = e.currentTarget
      const startX = e.clientX
      const startY = e.clientY
      const timer = window.setTimeout(() => activate(el, e.nativeEvent), LONG_PRESS_MS)
      press.current = {
        id: noteId,
        timer,
        startX,
        startY,
        active: false,
        moved: false,
        suppressClick: false,
      }

      const interrupt = (ev: PointerEvent) => {
        const p = press.current
        if (!p || p.active) return
        if (
          Math.abs(ev.clientX - startX) > MOVE_TOLERANCE ||
          Math.abs(ev.clientY - startY) > MOVE_TOLERANCE
        ) {
          clearTimeout(timer)
          window.removeEventListener('pointermove', interrupt)
        }
      }
      window.addEventListener('pointermove', interrupt)
      window.addEventListener(
        'pointerup',
        () => window.removeEventListener('pointermove', interrupt),
        { once: true }
      )
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (press.current?.suppressClick) {
        e.preventDefault()
        e.stopPropagation()
      }
    },
  })

  return { bind, draggingId, overTarget, unfileKey: UNFILE }
}
