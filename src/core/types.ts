/* Core content model — UI-agnostic, shared by storage, sync and export layers. */

export type ID = string

export type ColorKey =
  | 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'yellow' | 'teal'
  | 'coral' | 'mint' | 'gray'

export interface Folder {
  id: ID
  name: string
  /** null = no color selected (neutral). */
  color: ColorKey | null
  pinned: boolean
  locked: boolean
  archived: boolean
  offline: boolean
  createdAt: number
  updatedAt: number
}

export interface ChecklistItem {
  id: ID
  text: string
  checked: boolean
}

export interface Flashcard {
  id: ID
  front: string
  back: string
  frontImageId?: ID
  backImageId?: ID
}

export type NoteBlock =
  | { id: ID; type: 'text'; html: string }
  | { id: ID; type: 'image'; fileId: ID; caption?: string; width?: number }
  | { id: ID; type: 'file'; fileId: ID }
  | { id: ID; type: 'audio'; fileId: ID; transcript?: string; duration?: number }
  | { id: ID; type: 'checklist'; items: ChecklistItem[] }
  | { id: ID; type: 'link'; url: string; title?: string }
  | { id: ID; type: 'flashcards'; cards: Flashcard[] }

export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Reminder {
  at: number
  recurrence: ReminderRecurrence
  lastFired?: number
}

export interface Note {
  id: ID
  folderId: ID | null
  title: string
  blocks: NoteBlock[]
  color: ColorKey | null
  pinned: boolean
  locked: boolean
  archived: boolean
  offline: boolean
  reminder: Reminder | null
  /** Denormalized index for reminder queries; maintained by the repo layer. */
  reminderAt?: number | null
  createdAt: number
  updatedAt: number
}

export interface StoredFile {
  id: ID
  name: string
  mime: string
  size: number
  blob: Blob
  /** Future: extracted text for full-text indexing of documents/transcripts. */
  text?: string
  createdAt: number
}

export type ThemeMode = 'system' | 'light' | 'dark'

export interface Settings {
  theme: ThemeMode
  foldersCollapsed: boolean
  lastFolderId: ID | null
  remindersEnabled: boolean
}

export interface OutboxEntry {
  id?: number
  ts: number
  entity: 'note' | 'folder' | 'file'
  op: 'upsert' | 'delete'
  entityId: ID
}

/** User-created template: a frozen note layout. */
export interface CustomTemplate {
  id: ID
  name: string
  emoji: string
  blocks: NoteBlock[]
  createdAt: number
}

export type SyncProviderId = 'local' | 'drive'

export interface SyncStatus {
  provider: SyncProviderId
  signedIn: boolean
  pending: number
  lastSyncAt: number | null
  message?: string
}
