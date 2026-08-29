import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import * as repo from '@/core/repo'
import { storeFile } from '@/core/repo'
import type { Note, NoteBlock, ChecklistItem, Flashcard } from '@/core/types'
import { uid, stripHtml, debounce, cn } from '@/core/utils'
import { palClass } from '@/core/palette'
import { Icon } from '@/ui/Icon'
import { TopBar } from '@/ui/TopBar'
import { RichText, type RichTextHandle } from '@/ui/RichText'
import { FormatBar, execOnHandle } from '@/ui/FormatBar'
import { ChecklistView, FlashcardsEditor } from '@/ui/blocks'
import { AudioPlayer, FileCard, ImageView } from '@/ui/media'
import { NoteActionsSheet } from '@/ui/sheets'
import { RecordSheet } from '@/ui/RecordSheet'
import { useDragSort } from '@/ui/useDragSort'
import { useDialogs, useToast } from '@/ui/Dialogs'
import { useLock } from '@/ui/Lock'
import { EmptyState } from '@/ui/cards'

interface BlockHandle extends RichTextHandle {
  blockId: string
}

export function NoteEditor() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { ensureUnlocked, unlocked, gateFailed, retry } = useGate()

  const note = useLiveQuery(() => db.notes.get(id), [id], undefined)

  const [title, setTitle] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<NoteBlock[] | null>(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [formatOpen, setFormatOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const lastPersisted = useRef('')
  const imageInput = useRef<HTMLInputElement | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)

  // Registered rich-text handles (one per text block) + the last focused one
  const handles = useRef(new Map<string, BlockHandle>())
  const focusedId = useRef<string | null>(null)
  const lastHandle = useRef<BlockHandle | null>(null)

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

  const removeBlocks = (ids: string[]) => {
    if (!blocks) return
    const doomed = blocks.filter((b) => ids.includes(b.id))
    for (const t of doomed) {
      if (t.type === 'image' || t.type === 'file' || t.type === 'audio') void db.files.delete(t.fileId)
    }
    onLocalChange(
      title ?? '',
      blocks.filter((b) => !ids.includes(b.id))
    )
  }

  const removeBlock = (blockId: string) => removeBlocks([blockId])

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

  const sort = useDragSort(
    blocks?.length ?? 0,
    (from, to) => {
      if (!blocks) return
      const next = [...blocks]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      onLocalChange(title ?? '', next)
    },
    [
      { selector: '[data-drop="trash"]', id: 'trash' },
      { selector: '[data-drop="select"]', id: 'select' },
    ],
    (index, zone) => {
      const blockId = blocks?.[index]?.id
      if (!blockId) return
      if (zone === 'trash') removeBlock(blockId)
      if (zone === 'select') {
        setSelected(new Set([blockId]))
        setSelectMode(true)
      }
    }
  )

  /* ---------------- format commands (always-visible undo/redo) ---------------- */

  const execLast = (cmd: string, value?: string) => {
    const h = lastHandle.current
    if (!h) {
      toast.show('Tap into some text first')
      return
    }
    const html = execOnHandle(h, cmd, value)
    if (html !== null) updateBlock(h.blockId, { html })
  }

  const registerBlock = (blockId: string) => (h: RichTextHandle | null) => {
    if (h) {
      const entry: BlockHandle = { ...h, blockId }
      handles.current.set(h.id, entry)
      if (focusedId.current === h.id) lastHandle.current = entry
    } else {
      for (const [k, v] of handles.current) if (v.blockId === blockId) handles.current.delete(k)
      if (lastHandle.current?.blockId === blockId) lastHandle.current = null
    }
  }

  const onFocusChange = (hid: string | null) => {
    focusedId.current = hid
    if (hid) {
      const h = handles.current.get(hid)
      if (h) lastHandle.current = h
    }
  }

  /* ---------------- add content ---------------- */

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

  const toggleBlockSelect = (blockId: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(blockId)) next.delete(blockId)
      else next.add(blockId)
      return next
    })

  return (
    <div className={cn('screen editor-screen', palClass(note.color))}>
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
            <button className="icon-btn" onClick={() => execLast('undo')} aria-label="Undo">
              <Icon name="undo" size={18} />
            </button>
            <button className="icon-btn" onClick={() => execLast('redo')} aria-label="Redo">
              <Icon name="redo" size={18} />
            </button>
            <button
              className={cn('icon-btn', note.pinned && 'icon-btn-active')}
              onClick={() => void repo.updateNote(note.id, { pinned: !note.pinned })}
              aria-label="Pin note"
            >
              <Icon name="pin" size={18} />
            </button>
            <button className="icon-btn" onClick={() => setActionsOpen(true)} aria-label="Note actions">
              <Icon name="more-h" size={20} />
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
              <div
                key={b.id}
                className={cn(
                  'block',
                  selectMode && 'block-selectable',
                  selectMode && selected.has(b.id) && 'block-selected'
                )}
                {...sort.itemProps(i)}
                onClick={selectMode ? () => toggleBlockSelect(b.id) : undefined}
              >
                <div className={cn('block-controls', selectMode && 'block-controls-hidden')}>
                  <button className="block-handle" {...sort.handleProps(i)} aria-label="Drag block">
                    <Icon name="grip" size={16} />
                  </button>
                </div>
                {selectMode && (
                  <span className="pick block-pick" aria-hidden>
                    {selected.has(b.id) && <Icon name="check" size={12} strokeWidth={3} />}
                  </span>
                )}
                <div className="block-body">
                  {b.type === 'text' && (
                    <RichText
                      html={b.html}
                      onChange={(html) => updateBlock(b.id, { html })}
                      onFocusChange={onFocusChange}
                      register={registerBlock(b.id)}
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
                      width={b.width}
                      onCaptionChange={(caption) => updateBlock(b.id, { caption })}
                      onWidthChange={(w) => updateBlock(b.id, { width: w })}
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
                  {b.type === 'link' && <LinkRow url={b.url} title={b.title} />}
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
            <p className="editor-hint">Tap anywhere and start writing — or use + below to add photos, files and audio.</p>
          )}
          <div className="editor-bottom-space" />
        </div>
      ) : (
        <div className="editor-loading">Loading…</div>
      )}

      {/* Floating drop targets while a block is being dragged */}
      {sort.dragging && !selectMode && (
        <>
          <button className="float-target float-trash" data-drop="trash" aria-label="Delete block">
            <Icon name="trash" size={20} />
          </button>
          <button className="float-target float-select" data-drop="select" aria-label="Select more blocks">
            <Icon name="selectAll" size={18} />
          </button>
          <div className="drop-hint">
            <Icon name="grip" size={14} /> Drop in the bin to delete · top-right to multi-select
          </div>
        </>
      )}

      {/* ---------------- bottom bar: format ⇄ add ---------------- */}
      {selectMode ? (
        <div className="bulk-bar bulk-bar-static editor-bulk">
          <div className="bulk-bar-info">
            <button
              className="icon-btn"
              onClick={() => {
                setSelectMode(false)
                setSelected(new Set())
              }}
              aria-label="Exit selection"
            >
              <Icon name="x" size={18} />
            </button>
            <span>
              {selected.size} selected
              <button
                className="bulk-selectall"
                onClick={() => setSelected(new Set((blocks ?? []).map((b) => b.id)))}
              >
                Select all
              </button>
            </span>
          </div>
          <div className="bulk-bar-actions">
            <button
              className="icon-btn"
              aria-label="Duplicate selected"
              onClick={() => {
                const copies: NoteBlock[] = (blocks ?? [])
                  .filter((b) => selected.has(b.id))
                  .map((b) => structuredClone(b))
                  .map((b) => ({ ...b, id: uid('b_') }))
                if (blocks) onLocalChange(title ?? '', [...blocks, ...copies])
                setSelectMode(false)
                setSelected(new Set())
              }}
            >
              <Icon name="copy" size={17} />
            </button>
            <button
              className="icon-btn"
              aria-label="Delete selected"
              onClick={() => {
                removeBlocks([...selected])
                setSelectMode(false)
                setSelected(new Set())
              }}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        </div>
      ) : formatOpen ? (
        <FormatBar
          getHandle={() => lastHandle.current}
          onHtmlChange={(html) => {
            if (lastHandle.current) updateBlock(lastHandle.current.blockId, { html })
          }}
          onConvertToChecklist={() => {
            if (lastHandle.current) convertTextToChecklist(lastHandle.current.blockId)
          }}
        />
      ) : (
        <div className="add-bar">
          <button className="add-btn" onClick={() => setFormatOpen(true)} aria-label="Text formatting">
            <Icon name="type" size={18} /> <span className="add-btn-fx">Aa</span>
          </button>
          <button className="add-btn" onClick={() => setAddOpen((o) => !o)} aria-label="Insert content">
            <Icon name={addOpen ? 'x' : 'plus'} size={18} /> More
          </button>
          <button className="add-btn" onClick={() => setRecordOpen(true)} aria-label="Record audio">
            <Icon name="mic" size={18} /> Audio
          </button>
        </div>
      )}

      {addOpen && !formatOpen && !selectMode && (
        <div className="add-pop">
          <button
            className="add-pop-btn"
            onClick={() => {
              imageInput.current?.click()
              setAddOpen(false)
            }}
          >
            <Icon name="image" size={17} /> Image
          </button>
          <button
            className="add-pop-btn"
            onClick={() => {
              fileInput.current?.click()
              setAddOpen(false)
            }}
          >
            <Icon name="file" size={17} /> File
          </button>
          <button
            className="add-pop-btn"
            onClick={() => {
              setRecordOpen(true)
              setAddOpen(false)
            }}
          >
            <Icon name="mic" size={17} /> Audio
          </button>
          <button
            className="add-pop-btn"
            onClick={() => {
              addBlock({
                id: uid('b_'),
                type: 'checklist',
                items: [{ id: uid('i_'), text: '', checked: false }],
              })
              setAddOpen(false)
            }}
          >
            <Icon name="checklist" size={17} /> Checklist
          </button>
          <button
            className="add-pop-btn"
            onClick={() => {
              addBlock({
                id: uid('b_'),
                type: 'flashcards',
                cards: [{ id: uid('c_'), front: '', back: '' }],
              })
              setAddOpen(false)
            }}
          >
            <Icon name="cards" size={17} /> Flashcards
          </button>
        </div>
      )}

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

/* Pasted/kept links: compact row, title from URL host when absent. */
function LinkRow({ url, title }: { url: string; title?: string }) {
  let host = url
  try {
    host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    /* keep raw */
  }
  return (
    <a className="link-row" href={url} target="_blank" rel="noreferrer">
      <Icon name="link" size={15} />
      <span className="link-row-text">
        <b>{title || host}</b>
        <span>{url}</span>
      </span>
    </a>
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
