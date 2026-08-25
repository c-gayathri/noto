import { getMeta, setMeta } from './db'
import { liveQuery } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import type { ThemeMode } from './types'

/* Small typed key-value settings on top of the meta table. */

export const SETTINGS = {
  theme: 'theme',
  foldersCollapsed: 'folders.collapsed',
  lastFolderId: 'save.lastFolderId',
  remindersEnabled: 'reminders.enabled',
} as const

export function useSetting<T>(key: string, fallback: T): T {
  const value = useLiveQuery(() => getMeta<T>(key, fallback), [key], fallback)
  return value ?? fallback
}

export { setMeta as setSetting, getMeta as getSetting, liveQuery }
export type { ThemeMode }
