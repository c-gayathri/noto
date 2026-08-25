import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'
import { db } from './db'
import type { StoredFile } from './types'

/* ------------------------------------------------------------------ */
/* File storage layer. Blobs live in IndexedDB next to the structured */
/* data; UI consumes stable object URLs through these helpers. A      */
/* future Drive-backed implementation swaps this module only.         */
/* ------------------------------------------------------------------ */

const urlCache = new Map<string, string>()

export async function getFile(id: string): Promise<StoredFile | undefined> {
  return db.files.get(id)
}

export async function fileURL(id: string): Promise<string | null> {
  const cached = urlCache.get(id)
  if (cached) return cached
  const file = await db.files.get(id)
  if (!file) return null
  const url = URL.createObjectURL(file.blob)
  urlCache.set(id, url)
  return url
}

export function releaseFileURL(id: string) {
  const url = urlCache.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    urlCache.delete(id)
  }
}

/** React hook: resolve a stored file blob to an object URL. */
export function useFileURL(fileId: string | undefined | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    if (!fileId) {
      setUrl(null)
      return
    }
    fileURL(fileId).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [fileId])
  return url
}

/** React hook: full stored-file metadata + blob. */
export function useStoredFile(fileId: string | undefined | null): StoredFile | null {
  const [file, setFile] = useState<StoredFile | null>(null)
  useEffect(() => {
    let alive = true
    if (!fileId) {
      setFile(null)
      return
    }
    db.files.get(fileId).then((f) => {
      if (alive) setFile(f ?? null)
    })
    return () => {
      alive = false
    }
  }, [fileId])
  return file
}

/** Live count of stored bytes, used by Settings. */
export function useStorageUsage() {
  const [usage, setUsage] = useState<{ files: number; bytes: number }>({ files: 0, bytes: 0 })
  useEffect(() => {
    const sub = liveQuery(async () => {
      const files = await db.files.toArray()
      return { files: files.length, bytes: files.reduce((a, f) => a + f.size, 0) }
    }).subscribe(setUsage)
    return () => sub.unsubscribe()
  }, [])
  return usage
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export async function shareFiles(files: File[], title?: string, text?: string): Promise<boolean> {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
    share?: (data: ShareData) => Promise<void>
  }
  try {
    if (files.length && nav.canShare?.({ files }) && nav.share) {
      await nav.share({ files, title, text })
      return true
    }
    if (nav.share) {
      await nav.share({ title, text: text || title })
      return true
    }
  } catch {
    /* user cancelled or unsupported */
  }
  return false
}
