import { useRef, useState } from 'react'
import type { ID } from '@/core/types'
import { vibrate } from '@/core/utils'

/* ------------------------------------------------------------------ */
/* Long-press drag of a note card onto a folder drop target.          */
/* Drop targets declare: data-drop-folder="<folderId | __unfile__>".  */
/* Works on touch + mouse. Deliberately small and dependency-free.    */
/* ------------------------------------------------------------------ */

const UNFILE = '__unfile__'
const LONG_PRESS_MS = 240
const MOVE_TOLERANCE = 8

export function useNoteDrag(onDrop: (noteId: ID, folderId: ID | null) => void) {
  const [draggingId, setDraggingId] = useState<ID | null>(null)
  const [overTarget, setOverTarget] = useState<string | null>(null)
  const press = useRef<{
    id: ID
    timer: number
    startX: number
    startY: number
    active: boolean
    justDropped: boolean
  } | null>(null)
  const ghost = useRef<HTMLElement | null>(null)

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
      if (!ghost.current) return
      ghost.current.style.transform = `translate(${ev.clientX - rect.width / 2}px,${ev.clientY - 28}px) rotate(2deg)`
      ghost.current.style.display = 'none'
      const under = document.elementFromPoint(ev.clientX, ev.clientY)
      ghost.current.style.display = ''
      const target = under?.closest('[data-drop-folder]') as HTMLElement | null
      document.querySelectorAll('.drop-hover').forEach((n) => n.classList.remove('drop-hover'))
      if (target) {
        target.classList.add('drop-hover')
        setOverTarget(target.dataset.dropFolder ?? null)
      } else {
        setOverTarget(null)
      }
    }

    const finish = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      const wasActive = press.current?.active
      const targetId = overTargetRef.current
      el.classList.remove('drag-origin')
      clearGhost()
      setDraggingId(null)
      setOverTarget(null)
      if (wasActive && targetId) {
        if (press.current) press.current.justDropped = true
        onDrop(p.id, targetId === UNFILE ? null : targetId)
        setTimeout(() => {
          if (press.current) press.current.justDropped = false
        }, 300)
      } else if (wasActive) {
        // tapped-and-held without a target: treat as a no-op
        if (press.current) press.current.justDropped = true
        setTimeout(() => {
          if (press.current) press.current.justDropped = false
        }, 300)
      }
      press.current = null
      void ev
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }

  const overTargetRef = useRef<string | null>(null)
  overTargetRef.current = overTarget

  const bind = (noteId: ID) => ({
    'data-note-id': noteId,
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      const el = e.currentTarget
      const startX = e.clientX
      const startY = e.clientY
      const timer = window.setTimeout(() => activate(el, e.nativeEvent), LONG_PRESS_MS)
      press.current = { id: noteId, timer, startX, startY, active: false, justDropped: false }

      const interrupt = (ev: PointerEvent) => {
        const p = press.current
        if (!p || p.active) return
        if (Math.abs(ev.clientX - startX) > MOVE_TOLERANCE || Math.abs(ev.clientY - startY) > MOVE_TOLERANCE) {
          clearTimeout(timer)
          window.removeEventListener('pointermove', interrupt)
        }
      }
      window.addEventListener('pointermove', interrupt)
      const cleanupInterrupt = () => window.removeEventListener('pointermove', interrupt)
      window.addEventListener('pointerup', cleanupInterrupt, { once: true })
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (press.current?.justDropped || press.current?.active) {
        e.preventDefault()
        e.stopPropagation()
      }
    },
  })

  return { bind, draggingId, overTarget, unfileKey: UNFILE }
}
