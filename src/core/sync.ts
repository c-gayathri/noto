import type { Folder, Note, SyncProviderId, SyncStatus } from './types'
import { db } from './db'

/* ------------------------------------------------------------------ */
/* Synchronization layer.                                             */
/*                                                                    */
/* The app never talks to a cloud API directly: feature code writes   */
/* to local storage + the outbox (see repo.ts), and a SyncService is  */
/* the only component that moves data off-device. Adding Google Drive */
/* later means implementing SyncService below — no UI rewrites.       */
/* ------------------------------------------------------------------ */

export interface SyncService {
  readonly id: SyncProviderId
  readonly label: string
  isAvailable(): Promise<boolean>
  signIn(): Promise<void>
  signOut(): Promise<void>
  /** Push outbox entries to the remote. Returns ids that were pushed. */
  push(entries: { id?: number; entity: string; op: string; entityId: string }[]): Promise<number[]>
  /** Pull remote changes newer than `since` and merge into local db. */
  pull(since: number | null): Promise<{ notes: Note[]; folders: Folder[]; cursor: number }>
}

/** MVP service: device-only storage. Everything is already "synced". */
export const localSync: SyncService = {
  id: 'local',
  label: 'This device only',
  async isAvailable() {
    return true
  },
  async signIn() {
    /* no-op */
  },
  async signOut() {
    /* no-op */
  },
  async push(entries) {
    // Local storage is the source of truth — nothing to push.
    return entries.map((e) => e.id!).filter(Boolean)
  },
  async pull(_since) {
    return { notes: [], folders: [], cursor: Date.now() }
  },
}

/**
 * Google Drive service — intentional stub showing the integration seam.
 * Implementation sketch (kept out of the MVP on purpose):
 *   1. OAuth token via Google Identity Services (drive.appdata scope).
 *   2. push(): PUT changed blobs to appDataFolder, mirror IndexedDB file
 *      blobs to Drive files, store remote ids in meta table.
 *   3. pull(): list appDataFolder changes since cursor, merge by
 *      updatedAt (last-writer-wins), respect per-note/folder offline
 *      flags to decide what stays cached on device.
 */
export const driveSync: SyncService = {
  id: 'drive',
  label: 'Google Drive',
  async isAvailable() {
    return false // becomes true once OAuth client id is configured
  },
  async signIn() {
    throw new Error('Google Drive sync arrives in the next milestone.')
  },
  async signOut() {
    /* no-op */
  },
  async push() {
    return []
  },
  async pull(_since) {
    return { notes: [], folders: [], cursor: Date.now() }
  },
}

export function getSyncService(id: SyncProviderId): SyncService {
  return id === 'drive' ? driveSync : localSync
}

/* ------------------------------------------------------------------ */
/* Engine: tiny coordinator the Settings screen can call into.        */
/* ------------------------------------------------------------------ */

export async function getSyncStatus(): Promise<SyncStatus> {
  const provider = (await db.meta.get('sync.provider'))?.value as SyncProviderId | undefined
  const pending = await db.outbox.count()
  const lastSyncAt = ((await db.meta.get('sync.lastSyncAt'))?.value as number) ?? null
  const service = getSyncService(provider ?? 'local')
  const available = await service.isAvailable()
  return {
    provider: service.id,
    signedIn: service.id === 'local',
    pending: service.id === 'local' ? 0 : pending,
    lastSyncAt,
    message:
      service.id === 'local'
        ? 'All data lives on this device.'
        : available
          ? undefined
          : 'Sign-in not configured yet.',
  }
}
