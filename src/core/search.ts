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

export async function searchAll(rawQuery: string): Promise<SearchResults> {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return { notes: [], folders: [], files: [] }

  const [notes, folders, files] = await Promise.all([
    db.notes.filter((n) => !n.archived).toArray(),
    db.folders.filter((f) => !f.archived).toArray(),
    db.files.toArray(),
  ])

  const matchedFolders = folders.filter((f) => f.name.toLowerCase().includes(q))

  const noteMatches = (n: Note): boolean => {
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
