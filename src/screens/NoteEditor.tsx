import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import * as repo from '@/core/repo'
import { storeFile } from '@/core/repo'
import type { Note, NoteBlock, ChecklistItem, Flashcard } from '@/core/types'
import { uid, stripHtml, debounce, cn } from '@/core/utils'
import { Icon } from '@/ui/Icon'
import { TopBar } from '@/ui/TopBar'
import { RichText } from '@/ui/RichText'
import { ChecklistView, FlashcardsEditor } from '@/ui/blocks'
import { AudioPlayer, FileCard, ImageView, LinkCard } from '@/ui/media'
import { NoteActionsSheet } from '@/ui/sheets'
import { RecordSheet } from '@/ui/RecordSheet'
import { useDragSort } from '@/ui/useDragSort'
import { useDialogs, useToast } from '@/ui/Dialogs'
import { useLock } from '@/ui/Lock'
import { EmptyState } from '@/ui/cards'

export function NoteEditor() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const dialogs = useDialogs()
  const toast = useToast()
  const { ensureUnlocked, unlocked, gateFailed, retry } = useGate()

  const note = useLiveQuery(() => db.notes.get(id), [id], undefined)

  const [title, setTitle] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<NoteBlock[] | null>(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const lastPersisted = useRef('')
  const imageInput = useRef<HTMLInputElement | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)

  // Initialize local editing state once the note loads
  useEffect(() => {
    if (note && (title === null || blocks === null)) {
      setTitle(note.title)
      setBlocks(note.blocks)
      lastPersisted.current = JSON.stringify([note.title, note.blocks])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id])

  const persist = useMemo(
    () =>
      debounce(async (nextTitle: string, nextBlocks: NoteBlock[]) => {
        await repo.updateNote(id, { title: nextTitle, blocks: nextBlocks })
        lastPersisted.current = JSON.stringify([nextTitle, nextBlocks])
      }, 450),
    [id]
  )

  // Flush any pending debounced save when leaving the note
  useEffect(() => {
    return () => {
      persist.cancel()
      const pendingTitle = titleRef.current
      const pendingBlocks = blocksRef.current
      if (
        pendingTitle !== null &&
        pendingBlocks !== null &&
        JSON.stringify([pendingTitle, pendingBlocks]) !== lastPersisted.current
      ) {
        void repo.updateNote(id, { title: pendingTitle, blocks: pendingBlocks })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const titleRef = useRef<string | null>(null)
  const blocksRef = useRef<NoteBlock[] | null>(null)
  titleRef.current = title
  blocksRef.current = blocks

  const onLocalChange = (nextTitle: string, nextBlocks: NoteBlock[]) => {
    setTitle(nextTitle)
    setBlocks(nextBlocks)
    if (JSON.stringify([nextTitle, nextBlocks]) !== lastPersisted.current) {
      persist(nextTitle, nextBlocks)
    }
  }

  const updateBlock = (blockId: string, patch: Partial<NoteBlock>) => {
    if (!blocks) return
    onLocalChange(
      title ?? '',
      blocks.map((b) => (b.id === blockId ? ({ ...b, ...patch } as NoteBlock) : b))
    )
  }

  const removeBlock = (blockId: string) => {
    if (!blocks) return
    const target = blocks.find((b) => b.id === blockId)
    if (target && (target.type === 'image' || target.type === 'file' || target.type === 'audio')) {
      void db.files.delete(target.fileId)
    }
    onLocalChange(
      title ?? '',
      blocks.filter((b) => b.id !== blockId)
    )
  }

  const addBlock = (block: NoteBlock) => {
    if (!blocks) return
    onLocalChange(title ?? '', [...blocks, block])
  }

  const convertTextToChecklist = (blockId: string) => {
    const b = blocks?.find((x) => x.id === blockId)
    if (!b || b.type !== 'text') return
    const lines = stripHtml(b.html)
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const items: ChecklistItem[] = (
      lines.length ? lines : ['']
    ).map((l) => ({ id: uid('i_'), text: l.replace(/^(\[ \]|\[x\]|☐)\s*/i, ''), checked: false }))
    updateBlock(blockId, { type: 'checklist', items } as NoteBlock)
  }

  const sort = useDragSort(blocks?.length ?? 0, (from, to) => {
    if (!blocks) return
    const next = [...blocks]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onLocalChange(title ?? '', next)
  })

  const addFiles = async (files: FileList | null, as: 'image' | 'file') => {
    if (!files || files.length === 0) return
    const newBlocks: NoteBlock[] = []
    for (const f of Array.from(files)) {
      const stored = await storeFile(f, f.name, f.type)
      newBlocks.push(
        as === 'image' && f.type.startsWith('image/')
          ? { id: uid('b_'), type: 'image', fileId: stored.id }
          : { id: uid('b_'), type: 'file', fileId: stored.id }
      )
    }
    addBlocksAndFocus(newBlocks)
  }

  const addBlocksAndFocus = (newBlocks: NoteBlock[]) => {
    if (!blocks) return
    onLocalChange(title ?? '', [...blocks, ...newBlocks])
    requestAnimationFrame(() => {
      document.querySelector('.editor-scroll')?.scrollTo({ top: 999999, behavior: 'smooth' })
    })
  }

  const addLink = async () => {
    const url = await dialogs.prompt({ title: 'Add a link', placeholder: 'https://…', confirmLabel: 'Add' })
    if (!url) return
    addBlock({ id: uid('b_'), type: 'link', url })
  }

  const addAudio = async (payload: { blob: Blob; mime: string; name: string; duration?: number; transcript?: string }) => {
    setRecordOpen(false)
    const stored = await storeFile(payload.blob, payload.name, payload.mime)
    addBlock({
      id: uid('b_'),
      type: 'audio',
      fileId: stored.id,
      duration: payload.duration,
      transcript: payload.transcript,
    })
  }

  /* ---------------- gates ---------------- */

  useEffect(() => {
    if (note?.locked && !unlocked) void ensureUnlocked()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id, note?.locked])

  if (!note) {
    return (
      <div className="screen">
        <TopBar back />
        <EmptyState icon="file" title="Note not found" sub="It may have been deleted." />
      </div>
    )
  }

  if (note.locked && !unlocked) {
    if (gateFailed) {
      return (
        <div className="screen">
          <TopBar back />
          <EmptyState
            icon="lock"
            title="Locked note"
            sub="Authenticate to view this note."
            action={
              <button className="btn btn-primary" onClick={retry}>
                Try again
              </button>
            }
          />
        </div>
      )
    }
    return (
      <div className="screen">
        <TopBar back />
        <div className="gate gate-inline">
          <div className="gate-icon">
            <Icon name="lock" size={28} />
          </div>
          <h2>Locked note</h2>
          <p>Unlock to view and edit.</p>
        </div>
      </div>
    )
  }

  const ready = title !== null && blocks !== null

  return (
    <div className="screen editor-screen" style={note.color ? { background: 'var(--bg-1)' } : undefined}>
      <TopBar
        back
        title={
          <span className="editor-top-title">
            {note.locked && <Icon name="lock" size={13} />}
            {note.folderId ? '' : 'Unfiled'}
          </span>
        }
        right={
          <>
            <button
              className={cn('icon-btn', note.pinned && 'icon-btn-active')}
              onClick={() => void repo.updateNote(note.id, { pinned: !note.pinned })}
              aria-label="Pin note"
            >
              <Icon name="pin" size={19} />
            </button>
            <button className="icon-btn" onClick={() => setActionsOpen(true)} aria-label="Note actions">
              <Icon name="more-h" size={21} />
            </button>
          </>
        }
      />

      {ready ? (
        <div className="editor-scroll">
          <input
            className="editor-title"
            placeholder="Title"
            value={title ?? ''}
            onChange={(e) => onLocalChange(e.target.value, blocks!)}
          />

          <div className="blocks">
            {blocks!.map((b, i) => (
              <div key={b.id} className="block" {...sort.itemProps(i)}>
                <div className="block-controls">
                  <button className="block-handle" {...sort.handleProps(i)} aria-label="Drag to reorder">
                    <Icon name="grip" size={16} />
                  </button>
                  <button className="block-remove" onClick={() => removeBlock(b.id)} aria-label="Remove block">
                    <Icon name="x" size={14} />
                  </button>
                </div>
                <div className="block-body">
                  {b.type === 'text' && (
                    <RichText
                      html={b.html}
                      onChange={(html) => updateBlock(b.id, { html })}
                      onConvertToChecklist={() => convertTextToChecklist(b.id)}
                      placeholder={i === 0 && !title ? 'Start writing…' : 'Write something…'}
                    />
                  )}
                  {b.type === 'checklist' && (
                    <ChecklistView items={b.items} onChange={(items) => updateBlock(b.id, { items })} />
                  )}
                  {b.type === 'image' && (
                    <ImageView
                      fileId={b.fileId}
                      caption={b.caption}
                      onCaptionChange={(caption) => updateBlock(b.id, { caption })}
                    />
                  )}
                  {b.type === 'file' && <FileCard fileId={b.fileId} onDelete={() => removeBlock(b.id)} />}
                  {b.type === 'audio' && (
                    <AudioPlayer
                      fileId={b.fileId}
                      duration={b.duration}
                      transcript={b.transcript}
                      onTranscriptChange={(transcript) => updateBlock(b.id, { transcript })}
                    />
                  )}
                  {b.type === 'link' && <LinkCard url={b.url} title={b.title} />}
                  {b.type === 'flashcards' && (
                    <FlashcardsEditor
                      cards={b.cards}
                      noteId={note.id}
                      onChange={(cards: Flashcard[]) => updateBlock(b.id, { cards })}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {blocks!.length === 0 && (
            <p className="editor-hint">Add text, photos, files, audio or checklists below ↓</p>
          )}
          <div className="editor-bottom-space" />
        </div>
      ) : (
        <div className="editor-loading">Loading…</div>
      )}

      {/* Add-block bar */}
      <div className="add-bar">
        <button className="add-btn" onClick={() => addBlock({ id: uid('b_'), type: 'text', html: '' })}>
          <Icon name="type" size={18} /> Text
        </button>
        <button
          className="add-btn"
          onClick={() => addBlock({ id: uid('b_'), type: 'checklist', items: [{ id: uid('i_'), text: '', checked: false }] })}
        >
          <Icon name="checklist" size={18} /> List
        </button>
        <button className="add-btn" onClick={() => imageInput.current?.click()}>
          <Icon name="image" size={18} /> Image
        </button>
        <button className="add-btn" onClick={() => fileInput.current?.click()}>
          <Icon name="file" size={18} /> File
        </button>
        <button className="add-btn" onClick={() => setRecordOpen(true)}>
          <Icon name="mic" size={18} /> Audio
        </button>
        <button className="add-btn" onClick={addLink}>
          <Icon name="link" size={18} /> Link
        </button>
        <button
          className="add-btn"
          onClick={() => addBlock({ id: uid('b_'), type: 'flashcards', cards: [{ id: uid('c_'), front: '', back: '' }] })}
        >
          <Icon name="cards" size={18} /> Cards
        </button>
      </div>

      <NoteActionsSheet
        note={note}
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        onDeleted={() => navigate('/')}
      />

      <RecordSheet
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onSaved={(p) => {
          if (p.audio) void addAudio(p.audio)
        }}
      />

      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void addFiles(e.target.files, 'image')
          e.target.value = ''
        }}
      />
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          void addFiles(e.target.files, 'file')
          e.target.value = ''
        }}
      />
    </div>
  )
}

/* Small helper to distinguish "user cancelled the unlock gate". */
function useGate() {
  const { ensureUnlocked, unlocked } = useLock()
  const [gateFailed, setGateFailed] = useState(false)

  useEffect(() => {
    setGateFailed(false)
  }, [unlocked])

  const retry = () => {
    setGateFailed(false)
    void ensureUnlocked().then((ok) => {
      if (!ok) setGateFailed(true)
    })
  }

  const guardedEnsure = () =>
    ensureUnlocked().then((ok) => {
      if (!ok) setGateFailed(true)
      return ok
    })

  return { ensureUnlocked: guardedEnsure, unlocked, gateFailed, retry }
}
