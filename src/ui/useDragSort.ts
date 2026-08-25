import { useCallback, useEffect, useRef, useState } from 'react'
import { vibrate } from '@/core/utils'

/* ------------------------------------------------------------------ */
/* Minimal pointer-based vertical drag-to-reorder.                    */
/* Works with touch + mouse via a grab handle. No dependencies.       */
/* ------------------------------------------------------------------ */

interface DragState {
  index: number
  target: number
  startY: number
  y: number
  height: number
}

export function useDragSort(count: number, onReorder: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag

  const setItemRef = useCallback((i: number) => (el: HTMLElement | null) => {
    itemRefs.current[i] = el
  }, [])

  const onHandleDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const el = itemRefs.current[index]
      if (!el) return
      const rect = el.getBoundingClientRect()
      const state: DragState = {
        index,
        target: index,
        startY: e.clientY,
        y: e.clientY,
        height: rect.height,
      }
      setDrag(state)
      vibrate(8)

      const move = (ev: PointerEvent) => {
        const cur = dragRef.current
        if (!cur) return
        const y = ev.clientY
        let target = cur.index
        const midY = y
        for (let i = 0; i < itemRefs.current.length; i++) {
          if (i === cur.index) continue
          const r = itemRefs.current[i]?.getBoundingClientRect()
          if (!r) continue
          if (i < cur.index && midY < r.top + r.height / 2) {
            target = Math.min(target, i)
          } else if (i > cur.index && midY > r.top + r.height / 2) {
            target = Math.max(target, i)
          }
        }
        setDrag({ ...cur, y, target })
      }

      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
        setDrag((cur) => {
          if (cur && cur.target !== cur.index) onReorder(cur.index, cur.target)
          return null
        })
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
    },
    [onReorder]
  )

  useEffect(() => {
    if (count !== itemRefs.current.length) itemRefs.current.length = count
  }, [count])

  /** Props to spread on each item wrapper. */
  const itemProps = (index: number) => {
    if (!drag || drag.index === index) {
      return {
        ref: setItemRef(index) as (el: HTMLDivElement | null) => void,
        style: {
          ...(drag && drag.index === index
            ? { opacity: 0.35, transform: `translateY(${drag.y - drag.startY}px)`, zIndex: 10 }
            : {}),
        } as React.CSSProperties,
      }
    }
    const shift = index > drag.index && index <= drag.target
      ? -drag.height
      : index < drag.index && index >= drag.target
        ? drag.height
        : 0
    return {
      ref: setItemRef(index) as (el: HTMLDivElement | null) => void,
      style: { transform: `translateY(${shift}px)`, transition: 'transform 160ms ease' } as React.CSSProperties,
    }
  }

  const handleProps = (index: number) => ({
    onPointerDown: (e: React.PointerEvent) => onHandleDown(index, e),
    style: { touchAction: 'none' } as React.CSSProperties,
  })

  return { itemProps, handleProps, dragging: !!drag }
}
