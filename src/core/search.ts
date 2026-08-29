import { db } from './db'
import type { Folder, Note, StoredFile } from './types'
import { stripHtml } from './utils'

/* ------------------------------------------------------------------ */
/* Search across note titles, note text, folder names and filenames.  */
/* Transcript text and document text (`file.text`) are indexed        */
/* automatically as soon as those fields are populated (e.g. by a     */
/* future transcription service), with zero changes here.             */
/* ------------------------------------------------------------------ */

export interface SearchResults {
  notes: Note[]
  folders: Folder[]
  files: { file: StoredFile; note: Note | null }[]
}

/**
 * Everything visible, used as the initial state of the search screen:
 * opening search shows all folders, notes and standalone files; typing
 * filters them down (see searchAll).
 */
export async function browseAll(): Promise<SearchResults> {
  const [notes, folders, files] = await Promise.all([
    db.notes.filter((n) => !n.archived && !n.locked).toArray(),
    db.folders.filter((f) => !f.archived && !f.locked).toArray(),
    db.files.toArray(),
  ])

  const referenced = new Set<string>()
  for (const n of notes) {
    for (const b of n.blocks) {
      if (b.type === 'image' || b.type === 'file' || b.type === 'audio') referenced.add(b.fileId)
      if (b.type === 'flashcards') {
        for (const c of b.cards) {
          if (c.frontImageId) referenced.add(c.frontImageId)
          if (c.backImageId) referenced.add(c.backImageId)
        }
      }
    }
  }

  const noteForFile = new Map<string, Note>()
  for (const n of notes) {
    for (const b of n.blocks) {
      if ((b.type === 'image' || b.type === 'file' || b.type === 'audio') && !noteForFile.has(b.fileId)) {
        noteForFile.set(b.fileId, n)
      }
    }
  }

  const standalone = files
    .filter((f) => !referenced.has(f.id))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((f) => ({ file: f, note: noteForFile.get(f.id) ?? null }))

  return {
    folders: folders.sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name)),
    notes: notes.sort((a, b) => b.updatedAt - a.updatedAt),
    files: standalone,
  }
}

export async function searchAll(rawQuery: string): Promise<SearchResults> {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return browseAll()

  const [notes, folders, files] = await Promise.all([
    db.notes.filter((n) => !n.archived && !n.locked).toArray(),
    db.folders.filter((f) => !f.archived && !f.locked).toArray(),
    db.files.toArray(),
  ])

  const matchedFolders = folders.filter((f) => f.name.toLowerCase().includes(q))

  const noteMatches = (n: Note): boolean => {
    if (n.locked) return false
    if (n.title.toLowerCase().includes(q)) return true
    for (const b of n.blocks) {
      switch (b.type) {
        case 'text':
          if (stripHtml(b.html).toLowerCase().includes(q)) return true
          break
        case 'checklist':
          if (b.items.some((i) => i.text.toLowerCase().includes(q))) return true
          break
        case 'audio':
          if (b.transcript?.toLowerCase().includes(q)) return true
          break
        case 'link':
          if ((b.title || '').toLowerCase().includes(q) || b.url.toLowerCase().includes(q)) return true
          break
        case 'flashcards':
          if (b.cards.some((c) => c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q)))
            return true
          break
        default:
          break
      }
    }
    return false
  }

  const matchedNotes = notes.filter(noteMatches)

  const noteForFile = new Map<string, Note>()
  for (const n of notes) {
    for (const b of n.blocks) {
      if ((b.type === 'image' || b.type === 'file' || b.type === 'audio') && !noteForFile.has(b.fileId)) {
        noteForFile.set(b.fileId, n)
      }
    }
  }

  const matchedFiles: SearchResults['files'] = files
    .filter((f) => f.name.toLowerCase().includes(q) || (f.text && f.text.toLowerCase().includes(q)))
    .map((f) => ({ file: f, note: noteForFile.get(f.id) ?? null }))
    .slice(0, 30)

  // Notes whose file matched but whose text did not should surface too.
  const viaFileNotes = matchedFiles
    .map((m) => m.note)
    .filter((n): n is Note => !!n && !matchedNotes.some((m) => m.id === n.id))

  return {
    notes: [...matchedNotes, ...viaFileNotes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 40),
    folders: matchedFolders,
    files: matchedFiles,
  }
}
