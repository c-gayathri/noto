import { useEffect, useRef, useState } from 'react'
import { db } from '@/core/db'
import { useFileURL, useStoredFile, downloadBlob, shareFiles } from '@/core/fileStore'
import { fileKind, formatBytes, formatDuration, cn } from '@/core/utils'
import { Icon } from './Icon'
import { useDialogs } from './Dialogs'

/* ------------------------------------------------------------------ */
/* Audio player                                                       */
/* ------------------------------------------------------------------ */

const BARS = Array.from({ length: 34 }, (_, i) => 30 + Math.abs(Math.sin(i * 1.7)) * 55 + (i % 3) * 8)

export function AudioPlayer({
  fileId,
  duration,
  transcript,
  onTranscriptChange,
}: {
  fileId: string
  duration?: number
  transcript?: string
  onTranscriptChange?: (t: string) => void
}) {
  const url = useFileURL(fileId)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [total, setTotal] = useState(duration ?? 0)
  const [showTranscript, setShowTranscript] = useState(false)

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) el.pause()
    else void el.play()
  }

  return (
    <div className="audio-card">
      <audio
        ref={audioRef}
        src={url ?? undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d) && d > 0) setTotal(d)
        }}
      />
      <button className="audio-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
        <Icon name={playing ? 'pause' : 'play'} size={20} />
      </button>
      <div className="audio-main">
        <input
          className="audio-seek"
          type="range"
          min={0}
          max={total || 1}
          step={0.1}
          value={Math.min(current, total || 1)}
          onChange={(e) => {
            const t = Number(e.target.value)
            setCurrent(t)
            if (audioRef.current) audioRef.current.currentTime = t
          }}
        />
        <div className="audio-times">
          <span className="audio-wave" aria-hidden>
            {BARS.map((h, i) => (
              <i
                key={i}
                style={{
                  height: `${h}%`,
                  opacity: total > 0 && i / BARS.length <= current / total ? 1 : 0.3,
                }}
              />
            ))}
          </span>
          <span className="audio-time">{formatDuration(total || current)}</span>
        </div>
      </div>
      {onTranscriptChange !== undefined && (
        <button
          className="audio-transcript-toggle"
          onClick={() => setShowTranscript((s) => !s)}
          title="Transcript"
        >
          <Icon name="type" size={16} />
        </button>
      )}
      {showTranscript && onTranscriptChange && (
        <textarea
          className="audio-transcript"
          placeholder="Transcript (optional) — editable, or paste one from a transcription service later"
          value={transcript ?? ''}
          onChange={(e) => onTranscriptChange(e.target.value)}
        />
      )}
      {!onTranscriptChange && transcript && <p className="audio-transcript-view">{transcript}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* File card (PDFs get an inline preview; docs get rename + actions)  */
/* ------------------------------------------------------------------ */

const KIND_META: Record<string, { icon: string; tint: string; label: string }> = {
  pdf: { icon: 'file-text', tint: 'var(--t-red)', label: 'PDF' },
  doc: { icon: 'file-text', tint: 'var(--t-blue)', label: 'Document' },
  video: { icon: 'video', tint: 'var(--t-purple)', label: 'Video' },
  other: { icon: 'file', tint: 'var(--t-gray)', label: 'File' },
}

export function FileCard({ fileId, onDelete }: { fileId: string; onDelete?: () => void }) {
  const file = useStoredFile(fileId)
  const url = useFileURL(fileId)
  const dialogs = useDialogs()
  if (!file) return null
  const kind = fileKind(file.mime, file.name)
  if (kind === 'image') return null
  const meta = KIND_META[kind] ?? KIND_META.other

  const open = () => {
    if (url) window.open(url, '_blank')
  }
  const share = async () => {
    const f = new File([file.blob], file.name, { type: file.mime })
    const ok = await shareFiles([f], file.name)
    if (!ok) downloadBlob(file.blob, file.name)
  }
  const rename = async () => {
    const name = await dialogs.prompt({ title: 'Rename file', initial: file.name, confirmLabel: 'Rename' })
    if (name) await db.files.update(fileId, { name })
  }

  return (
    <div className="file-card-wrap">
      {kind === 'pdf' && url && (
        <button className="pdf-preview" onClick={open} title={`Open ${file.name}`}>
          <iframe src={`${url}#toolbar=0&navpanes=0`} title={file.name} loading="lazy" />
          <span className="pdf-preview-hint">
            <Icon name="external" size={13} /> Preview · tap to open
          </span>
        </button>
      )}
      <div className="file-card">
        <button className="file-icon" style={{ background: meta.tint }} onClick={open}>
          <Icon name={meta.icon} size={19} />
        </button>
        <button className="file-info" onClick={open}>
          <span className="file-name">{file.name}</span>
          <span className="file-sub">
            {meta.label} · {formatBytes(file.size)}
          </span>
        </button>
        <div className="file-actions">
          <button className="icon-btn" onClick={rename} aria-label="Rename file" title="Rename">
            <Icon name="edit" size={16} />
          </button>
          <button className="icon-btn" onClick={share} aria-label="Share file">
            <Icon name="share" size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={() => downloadBlob(file.blob, file.name)}
            aria-label="Download"
          >
            <Icon name="download" size={16} />
          </button>
          {onDelete && (
            <button
              className="icon-btn icon-btn-danger"
              aria-label="Delete file"
              onClick={async () => {
                const ok = await dialogs.confirm({
                  title: 'Delete file?',
                  message: `“${file.name}” will be removed from this note.`,
                  confirmLabel: 'Delete',
                  destructive: true,
                })
                if (ok) onDelete()
              }}
            >
              <Icon name="trash" size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Image + lightbox + resize                                          */
/* ------------------------------------------------------------------ */

const WIDTHS = [
  { key: 40, label: 'S' },
  { key: 60, label: 'M' },
  { key: 80, label: 'L' },
  { key: 100, label: 'Full' },
]

export function ImageView({
  fileId,
  caption,
  width,
  onCaptionChange,
  onWidthChange,
}: {
  fileId: string
  caption?: string
  width?: number
  onCaptionChange?: (c: string) => void
  onWidthChange?: (w: number) => void
}) {
  const url = useFileURL(fileId)
  const file = useStoredFile(fileId)
  const [zoom, setZoom] = useState(false)
  const editable = onCaptionChange !== undefined
  const w = width ?? 100

  return (
    <div className="image-block">
      <div
        className={cn('image-frame', editable && 'image-frame-editable')}
        style={{ width: `${w}%` }}
        onClick={() => editable && setZoom(true)}
      >
        {url && <img src={url} alt={caption || file?.name || 'Image'} loading="lazy" />}
      </div>

      {editable && (
        <div className="image-tools">
          <div className="image-sizes">
            {WIDTHS.map((opt) => (
              <button
                key={opt.key}
                className={cn('size-chip', w === opt.key && 'size-chip-on')}
                onClick={() => onWidthChange?.(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={() => setZoom(true)} aria-label="Zoom">
            <Icon name="search" size={15} />
          </button>
        </div>
      )}

      {onCaptionChange !== undefined ? (
        <input
          className="image-caption"
          placeholder="Add a caption…"
          value={caption ?? ''}
          onChange={(e) => onCaptionChange(e.target.value)}
        />
      ) : (
        caption && <p className="image-caption-view">{caption}</p>
      )}

      {zoom && url && (
        <div className="lightbox" onClick={() => setZoom(false)}>
          <div className="lightbox-head" onClick={(e) => e.stopPropagation()}>
            <span className="lightbox-name">
              <Icon name="image" size={14} /> {file?.name ?? 'Image'}
            </span>
            <button className="icon-btn btn-glass" onClick={() => setZoom(false)} aria-label="Close">
              <Icon name="x" size={18} />
            </button>
          </div>
          <img src={url} alt={caption || file?.name || 'Image'} onClick={(e) => e.stopPropagation()} />
          <div className="lightbox-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-glass"
              onClick={async () => {
                const stored = await db.files.get(fileId)
                if (!stored) return
                const f = new File([stored.blob], stored.name, { type: stored.mime })
                const ok = await shareFiles([f], stored.name)
                if (!ok) downloadBlob(stored.blob, stored.name)
              }}
            >
              <Icon name="share" size={16} /> Share
            </button>
            <button
              className="btn btn-glass"
              onClick={async () => {
                const stored = await db.files.get(fileId)
                if (stored) downloadBlob(stored.blob, stored.name)
              }}
            >
              <Icon name="download" size={16} /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Link card                                                          */
/* ------------------------------------------------------------------ */

export function LinkCard({ url, title }: { url: string; title?: string }) {
  let host = url
  try {
    host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    /* keep raw */
  }
  const open = () => window.open(url.startsWith('http') ? url : `https://${url}`, '_blank')
  return (
    <button className="link-card" onClick={open}>
      <span className="link-icon">
        <Icon name="link" size={17} />
      </span>
      <span className="link-text">
        <span className="link-title">{title || host}</span>
        <span className="link-sub">{host}</span>
      </span>
      <Icon name="external" size={16} className="link-open" />
    </button>
  )
}
