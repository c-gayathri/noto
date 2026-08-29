import { liveQuery } from 'dexie'
import { db } from './db'
import type { Note } from './types'
import { nextOccurrence } from './utils'

/* ------------------------------------------------------------------ */
/* Notification layer. A lightweight in-app scheduler polls for due   */
/* reminders while the app is open and raises native notifications    */
/* (permission permitting) plus an in-app banner via a subscriber.    */
/* ------------------------------------------------------------------ */

type Listener = (note: Note) => void
const listeners = new Set<Listener>()

export function onReminderFired(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function fire(note: Note) {
  const body = note.title || 'Reminder'
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(body, {
        body: 'Reminder from Nimbus',
        tag: `noto-reminder-${note.id}-${note.reminder?.at}`,
      })
    } catch {
      /* some platforms require SW registration for notifications */
    }
  }
  listeners.forEach((l) => l(note))
}

let started = false

export function startReminderEngine() {
  if (started) return
  started = true

  const tick = async () => {
    try {
      const now = Date.now()
      const due = await db.notes
        .filter((n) => !n.archived && !!n.reminder && n.reminder.at <= now)
        .toArray()
      for (const note of due) {
        if (!note.reminder) continue
        if (note.reminder.lastFired && note.reminder.lastFired >= note.reminder.at) continue
        fire(note)
        const next = nextOccurrence(note.reminder.at, note.reminder.recurrence)
        await db.notes.update(note.id, {
          reminder: next
            ? { at: next, recurrence: note.reminder.recurrence, lastFired: note.reminder.at }
            : null,
          reminderAt: next,
        } as Partial<Note>)
      }
    } catch {
      /* keep the engine resilient */
    }
  }

  setInterval(tick, 20_000)
  setTimeout(tick, 1_500)
}

export function subscribeDueReminders() {
  return liveQuery(() =>
    db.notes
      .filter((n) => !n.archived && !!n.reminder && n.reminder.at > Date.now())
      .toArray()
  )
}
