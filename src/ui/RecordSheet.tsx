import { useEffect, useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { formatDuration, cn, vibrate } from '@/core/utils'
import type { PendingSave } from '@/screens/pending'

/* ------------------------------------------------------------------ */
/* Voice capture: record from the home screen, review, optionally add */
/* a transcript, then continue to the Save-to flow. The transcript    */
/* field is designed to be filled by an external/local transcription  */
/* service later — the data model already stores it per audio block.  */
/* ------------------------------------------------------------------ */

function pickMime(): string | undefined {
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c
    } catch {
      /* keep looking */
    }
  }
  return undefined
}

export function RecordSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: (payload: PendingSave) => void
}) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'preview'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [mime, setMime] = useState('audio/webm')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<number | undefined>(undefined)
  const stream = useRef<MediaStream | null>(null)

  const cleanup = () => {
    window.clearInterval(timer.current)
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    recorder.current = null
  }

  useEffect(() => {
    if (!open) {
      cleanup()
      setPhase('idle')
      setElapsed(0)
      setBlob(null)
      setPreviewUrl(null)
      setTranscript('')
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const start = async () => {
    try {
      setError(null)
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickMime()
      const rec = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined)
      chunks.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }
      rec.onstop = () => {
        const b = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' })
        setMime(rec.mimeType || 'audio/webm')
        setBlob(b)
        setPreviewUrl(URL.createObjectURL(b))
        setPhase('preview')
        cleanup()
      }
      recorder.current = rec
      rec.start(250)
      setPhase('recording')
      setElapsed(0)
      vibrate(10)
      timer.current = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    } catch {
      setError('Microphone access is required to record. Check permissions and try again.')
    }
  }

  const stop = () => {
    recorder.current?.stop()
    vibrate(6)
  }

  const retake = () => {
    setBlob(null)
    setPreviewUrl(null)
    setPhase('idle')
  }

  const save = () => {
    if (!blob) return
    onSaved({
      kind: 'audio',
      audio: {
        blob,
        mime,
        name: `Voice note · ${new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.audio`,
        duration: elapsed || undefined,
        transcript: transcript.trim() || undefined,
      },
    })
  }

  return (
    <Sheet open={open} onClose={onClose} title={phase === 'preview' ? 'Voice note ready' : 'Voice note'}>
      {error && <div className="form-error"><Icon name="alert" size={15} /> {error}</div>}

      {phase === 'idle' && (
        <div className="record-idle">
          <p className="record-hint">Tap to start recording</p>
          <button className="record-btn" onClick={start} aria-label="Start recording">
            <Icon name="mic" size={34} />
          </button>
        </div>
      )}

      {phase === 'recording' && (
        <div className="record-idle">
          <div className="record-wave" aria-hidden>
            {Array.from({ length: 24 }).map((_, i) => (
              <i key={i} style={{ animationDelay: `${i * 70}ms` }} />
            ))}
          </div>
          <div className="record-timer">{formatDuration(elapsed)}</div>
          <button className="record-btn record-btn-stop" onClick={stop} aria-label="Stop recording">
            <Icon name="stop" size={26} />
          </button>
        </div>
      )}

      {phase === 'preview' && previewUrl && (
        <div className="record-preview">
          <audio src={previewUrl} controls />
          <textarea
            className="input record-transcript"
            placeholder="Transcript (optional)…"
            rows={3}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
          <div className="sheet-actions">
            <button className="btn btn-ghost" onClick={retake}>
              Retake
            </button>
            <button className={cn('btn btn-primary')} onClick={save} disabled={!blob}>
              Continue
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
