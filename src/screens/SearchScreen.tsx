import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchAll, type SearchResults } from '@/core/search'
import { fileKind } from '@/core/utils'
import { useStoredFile } from '@/core/fileStore'
import { Icon } from '@/ui/Icon'
import { TopBar } from '@/ui/TopBar'
import { NoteCard, FolderRow, EmptyState } from '@/ui/cards'
import { cn } from '@/core/utils'

type Scope = 'all' | 'notes' | 'files' | 'folders'

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'notes', label: 'Notes' },
  { key: 'files', label: 'Files' },
  { key: 'folders', label: 'Folders' },
]

export function SearchScreen() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [results, setResults] = useState<SearchResults>({ notes: [], folders: [], files: [] })
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setResults({ notes: [], folders: [], files: [] })
        setSearched(false)
        return
      }
      const r = await searchAll(query)
      setResults(r)
      setSearched(true)
    }, 180)
    return () => clearTimeout(t)
  }, [query])

  const showNotes = (scope === 'all' || scope === 'notes') && results.notes.length > 0
  const showFolders = (scope === 'all' || scope === 'folders') && results.folders.length > 0
  const showFiles = (scope === 'all' || scope === 'files') && results.files.length > 0
  const empty = searched && !showNotes && !showFolders && !showFiles

  return (
    <div className="screen">
      <TopBar
        back
        title="Search"
      />
      <div className="search-pill search-pill-static search-focus">
        <Icon name="search" size={17} />
        <input
          autoFocus
          placeholder="Titles, text, folders, files…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button className="icon-btn" onClick={() => setQuery('')} aria-label="Clear">
            <Icon name="x" size={15} />
          </button>
        )}
      </div>

      <div className="chip-row">
        {SCOPES.map((s) => (
          <button key={s.key} className={cn('chip', scope === s.key && 'chip-active')} onClick={() => setScope(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      <section className="section">
        {showFolders && (
          <>
            <div className="list-label">Folders</div>
            <div className="save-list">
              {results.folders.map((f) => (
                <FolderRow
                  key={f.id}
                  folder={f}
                  locked={f.locked}
                  onOpen={() => navigate(`/folder/${f.id}`)}
                />
              ))}
            </div>
          </>
        )}

        {showNotes && (
          <>
            <div className="list-label">Notes</div>
            <div className="note-list">
              {results.notes.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  onOpen={() => navigate(`/note/${n.id}`)}
                />
              ))}
            </div>
          </>
        )}

        {showFiles && (
          <>
            <div className="list-label">Files</div>
            <div className="note-list">
              {results.files.map(({ file, note }) => (
                <FileResultRow
                  key={file.id}
                  fileId={file.id}
                  noteTitle={note?.title}
                  onOpen={() => (note ? navigate(`/note/${note.id}`) : undefined)}
                />
              ))}
            </div>
          </>
        )}

        {empty && (
          <EmptyState icon="search" title="No matches" sub={`Nothing found for “${query}”.`} />
        )}
        {!searched && (
          <p className="search-hint">Search across note titles, note text, folder names and file names. Transcripts and document text are indexed automatically as they become available.</p>
        )}
      </section>
    </div>
  )
}

function FileResultRow({
  fileId,
  noteTitle,
  onOpen,
}: {
  fileId: string
  noteTitle?: string
  onOpen: () => void
}) {
  const file = useStoredFile(fileId)
  if (!file) return null
  const kind = fileKind(file.mime, file.name)
  const icon = kind === 'image' ? 'image' : kind === 'audio' ? 'headphones' : kind === 'video' ? 'video' : 'file-text'
  return (
    <button className="note-card" onClick={onOpen}>
      <span className="locked-glyph">
        <Icon name={icon} size={16} />
      </span>
      <span className="note-card-main">
        <span className="note-title">{file.name}</span>
        <span className="note-meta">{noteTitle ? `In “${noteTitle}”` : 'File'}</span>
      </span>
    </button>
  )
}
