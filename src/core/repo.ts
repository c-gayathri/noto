import { db } from './db'
import type { Folder, Note, StoredFile, NoteBlock, ID, ReminderRecurrence, OutboxEntry } from './types'
import { uid } from './utils'

/* ------------------------------------------------------------------ */
/* Outbox: records pending changes so a future sync service can push  */
/* them without touching feature code.                                */
/* ------------------------------------------------------------------ */

async function record(entity: OutboxEntry['entity'], op: OutboxEntry['op'], entityId: ID) {
  try {
    await db.outbox.add({ ts: Date.now(), entity, op, entityId })
  } catch {
    /* outbox is best-effort */
  }
}

/* ------------------------------------------------------------------ */
/* Folders                                                            */
/* ------------------------------------------------------------------ */

export async function createFolder(init: Partial<Folder> = {}): Promise<Folder> {
  const now = Date.now()
  const folder: Folder = {
    id: uid('f_'),
    name: init.name?.trim() || 'Untitled folder',
    color: init.color ?? 'blue',
    pinned: init.pinned ?? false,
    locked: init.locked ?? false,
    archived: false,
    offline: init.offline ?? false,
    createdAt: now,
    updatedAt: now,
  }
  await db.folders.add(folder)
  await record('folder', 'upsert', folder.id)
  return folder
}

export async function updateFolder(id: ID, patch: Partial<Folder>): Promise<void> {
  await db.folders.update(id, { ...patch, updatedAt: Date.now() })
  await record('folder', 'upsert', id)
}

/** Deletes a folder; its notes become unfiled (nothing is lost). */
export async function deleteFolder(id: ID): Promise<void> {
  await db.transaction('rw', db.folders, db.notes, db.outbox, async () => {
    const notes = await db.notes.where('folderId').equals(id).toArray()
    await Promise.all(
      notes.map((n) => db.notes.update(n.id, { folderId: null, updatedAt: Date.now() }))
    )
    await db.folders.delete(id)
    await record('folder', 'delete', id)
  })
}

/* ------------------------------------------------------------------ */
/* Notes                                                              */
/* ------------------------------------------------------------------ */

export function emptyNote(folderId: ID | null = null): Note {
  const now = Date.now()
  return {
    id: uid('n_'),
    folderId,
    title: '',
    blocks: [],
    color: null,
    pinned: false,
    locked: false,
    archived: false,
    offline: false,
    reminder: null,
    createdAt: now,
    updatedAt: now,
  }
}

export async function createNote(init: Partial<Note> = {}): Promise<Note> {
  const note = { ...emptyNote(init.folderId ?? null), ...init }
  note.updatedAt = Date.now()
  await db.notes.add(note)
  await syncReminderIndex(note)
  await record('note', 'upsert', note.id)
  return note
}

export async function updateNote(id: ID, patch: Partial<Note>): Promise<void> {
  await db.notes.update(id, { ...patch, updatedAt: Date.now() })
  const note = await db.notes.get(id)
  if (note) await syncReminderIndex(note)
  await record('note', 'upsert', id)
}

async function syncReminderIndex(note: Note) {
  const at = note.reminder && !note.archived ? note.reminder.at : null
  await db.notes.update(note.id, { reminderAt: at } as Partial<Note>)
}

export async function deleteNote(id: ID): Promise<void> {
  const note = await db.notes.get(id)
  if (!note) return
  const fileIds = collectFileIds(note.blocks)
  await db.notes.delete(id)
  await Promise.all(fileIds.map((fid) => db.files.delete(fid)))
  await record('note', 'delete', id)
}

export async function duplicateNote(id: ID): Promise<Note | null> {
  const src = await db.notes.get(id)
  if (!src) return null
  const copy: Note = {
    ...structuredClone(src),
    id: uid('n_'),
    title: src.title ? `${src.title} (copy)` : 'Copy',
    pinned: false,
    locked: false,
    reminder: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  copy.blocks = copy.blocks.map((b) => ({ ...b, id: uid('b_') }))
  await db.notes.add(copy)
  await record('note', 'upsert', copy.id)
  return copy
}

export async function moveNote(id: ID, folderId: ID | null): Promise<void> {
  await updateNote(id, { folderId })
}

export async function setReminder(
  id: ID,
  at: number | null,
  recurrence: ReminderRecurrence = 'none'
): Promise<void> {
  await updateNote(id, { reminder: at ? { at, recurrence } : null })
}

export function collectFileIds(blocks: NoteBlock[]): ID[] {
  const ids: ID[] = []
  for (const b of blocks) {
    if (b.type === 'image' || b.type === 'file' || b.type === 'audio') ids.push(b.fileId)
    if (b.type === 'flashcards') {
      for (const c of b.cards) {
        if (c.frontImageId) ids.push(c.frontImageId)
        if (c.backImageId) ids.push(c.backImageId)
      }
    }
  }
  return ids
}

/* ------------------------------------------------------------------ */
/* Files                                                              */
/* ------------------------------------------------------------------ */

export async function storeFile(blob: Blob, name: string, mime?: string): Promise<StoredFile> {
  const file: StoredFile = {
    id: uid('fl_'),
    name: name || 'file',
    mime: mime || blob.type || 'application/octet-stream',
    size: blob.size,
    blob,
    createdAt: Date.now(),
  }
  await db.files.add(file)
  await record('file', 'upsert', file.id)
  return file
}
