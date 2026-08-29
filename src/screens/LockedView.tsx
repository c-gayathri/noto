import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import type { Folder, Note } from '@/core/types'
import { Icon } from '@/ui/Icon'
import { TopBar } from '@/ui/TopBar'
import { NoteCard, FolderCard, EmptyState } from '@/ui/cards'
import { useLock } from '@/ui/Lock'

/* ------------------------------------------------------------------ */
/* Locked: the single private area. Reached from the home "Locked"    */
/* box — asks for the passcode, then lists locked folders and notes.  */
/* ------------------------------------------------------------------ */

export function LockedView() {
  const navigate = useNavigate()
  const { configured, unlocked, ensureUnlocked } = useLock()
  const [checked, setChecked] = useState(false)

  const folders = useLiveQuery(() => db.folders.filter((f) => f.locked && !f.archived).toArray(), [], [] as Folder[])
  const notes = useLiveQuery(() => db.notes.filter((n) => n.locked && !n.archived).toArray(), [], [] as Note[])

  useEffect(() => {
    if (!configured) {
      navigate('/', { replace: true })
      return
    }
    if (unlocked) {
      setChecked(true)
      return
    }
    void ensureUnlocked().then((ok) => {
      if (!ok) navigate('/', { replace: true })
      else setChecked(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, unlocked])

  if (!checked) {
    return (
      <div className="screen">
        <TopBar back />
        <div className="editor-loading">Checking lock…</div>
      </div>
    )
  }

  return (
    <div className="screen">
      <TopBar back title="Locked" subtitle="Private folders and notes" />
      <section className="section">
        {folders.length === 0 && notes.length === 0 ? (
          <EmptyState icon="lock" title="Nothing locked" sub="Lock notes or folders to keep them here." />
        ) : (
          <>
            {folders.length > 0 && (
              <>
                <div className="list-label">
                  <Icon name="folder" size={13} /> Folders
                </div>
                <div className="folder-row-scroller">
                  {folders.map((f) => (
                    <FolderCard key={f.id} folder={f} locked onOpen={() => navigate(`/folder/${f.id}`)} />
                  ))}
                </div>
              </>
            )}
            {notes.length > 0 && (
              <>
                <div className="list-label">
                  <Icon name="lock" size={13} /> Notes
                </div>
                <div className="note-list">
                  {notes.map((n) => (
                    <NoteCard key={n.id} note={n} onOpen={() => navigate(`/note/${n.id}`)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>
      <p className="settings-note">
        Tap an item to open it. Lock it again anytime from Settings → Lock now, or from its ··· menu.
      </p>
    </div>
  )
}
