import Dexie, { type Table } from 'dexie'
import type { Folder, Note, StoredFile, OutboxEntry } from './types'

export interface MetaRow {
  key: string
  value: unknown
}

class NimbusDB extends Dexie {
  folders!: Table<Folder, string>
  notes!: Table<Note, string>
  files!: Table<StoredFile, string>
  meta!: Table<MetaRow, string>
  outbox!: Table<OutboxEntry, number>

  constructor() {
    super('nimbus-notes')
    this.version(1).stores({
      folders: 'id, name, pinned, locked, archived, updatedAt',
      // reminderAt is a denormalized index maintained by the repo layer
      notes: 'id, folderId, pinned, locked, archived, updatedAt, reminderAt',
      files: 'id, name, createdAt',
      meta: 'key',
      outbox: '++id, ts, entityId',
    })
  }
}

export const db = new NimbusDB()

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const row = await db.meta.get(key)
  return row ? (row.value as T) : fallback
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}
