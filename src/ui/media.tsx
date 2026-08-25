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
  compact,
}: {
  fileId: string
  duration?: number
  transcript?: string
  onTranscriptChange?: (t: string) => void
  compact?: boolean
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
    <div className={cn('audio-card', compact && 'audio-compact')}>
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
      {!onTranscriptChange && transcript && (
        <p className="audio-transcript-view">{transcript}</p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* File card (PDFs, documents, anything else)                         */
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

  return (
    <div className="file-card">
      <button className="file-icon" style={{ background: meta.tint }} onClick={open}>
        <Icon name={meta.icon} size={20} />
      </button>
      <button className="file-info" onClick={open}>
        <span className="file-name">{file.name}</span>
        <span className="file-sub">
          {meta.label} · {formatBytes(file.size)}
        </span>
      </button>
      <div className="file-actions">
        <button className="icon-btn" onClick={share} aria-label="Share file">
          <Icon name="share" size={17} />
        </button>
        <button
          className="icon-btn"
          onClick={() => downloadBlob(file.blob, file.name)}
          aria-label="Download"
        >
          <Icon name="download" size={17} />
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
            <Icon name="trash" size={17} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Image + lightbox                                                   */
/* ------------------------------------------------------------------ */

export function ImageView({
  fileId,
  caption,
  onCaptionChange,
}: {
  fileId: string
  caption?: string
  onCaptionChange?: (c: string) => void
}) {
  const url = useFileURL(fileId)
  const [zoom, setZoom] = useState(false)

  return (
    <div className="image-block">
      <div
        className={cn('image-frame', onCaptionChange && 'image-frame-editable')}
        onClick={() => onCaptionChange && setZoom(true)}
      >
        {url && <img src={url} alt={caption || 'Image'} loading="lazy" />}
      </div>
      {onCaptionChange !== undefined && (
        <input
          className="image-caption"
          placeholder="Add a caption…"
          value={caption ?? ''}
          onChange={(e) => onCaptionChange(e.target.value)}
        />
      )}
      {!onCaptionChange && caption && <p className="image-caption-view">{caption}</p>}
      {zoom && url && (
        <div className="lightbox" onClick={() => setZoom(false)}>
          <img src={url} alt={caption || 'Image'} onClick={(e) => e.stopPropagation()} />
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
            <button className="btn btn-glass" onClick={() => setZoom(false)}>
              <Icon name="x" size={16} /> Close
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
