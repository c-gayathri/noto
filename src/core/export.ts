import type { Note, NoteBlock } from './types'
import { getFile, downloadBlob, shareFiles } from './fileStore'
import { stripHtml, formatDateTime } from './utils'
import { HEX } from './palette'

/* ------------------------------------------------------------------ */
/* Export layer: plain text, PDF (via print), image (via canvas       */
/* raster of a rendered card). Mixed notes offer Square / Document    */
/* layouts for the image export only — no design editor.              */
/* ------------------------------------------------------------------ */

export type ExportFormat = 'pdf' | 'image' | 'text'
export type ExportLayout = 'document' | 'square'

function safeName(note: Note): string {
  return (note.title || 'note').replace(/[^\w\d -]+/g, '').trim().replace(/\s+/g, '-').toLowerCase()
}

function blocksToPlainText(blocks: NoteBlock[]): string {
  const lines: string[] = []
  for (const b of blocks) {
    switch (b.type) {
      case 'text':
        lines.push(stripHtml(b.html))
        break
      case 'checklist':
        lines.push(...b.items.map((i) => `${i.checked ? '[x]' : '[ ]'} ${i.text}`))
        break
      case 'image':
        lines.push(`[image] ${b.caption || ''}`.trim())
        break
      case 'file':
        lines.push(`[file] (see attachment)`)
        break
      case 'audio':
        lines.push(`[voice note]${b.transcript ? `\n${b.transcript}` : ''}`)
        break
      case 'link':
        lines.push(`[link] ${b.title || b.url}\n${b.url}`)
        break
      case 'flashcards':
        lines.push(...b.cards.map((c) => `Q: ${c.front}\nA: ${c.back}`))
        break
    }
  }
  return lines.filter((l) => l !== '').join('\n\n')
}

export function noteToPlainText(note: Note): string {
  const header = note.title ? `${note.title}\n${'-'.repeat(Math.min(note.title.length, 48))}\n\n` : ''
  return `${header}${blocksToPlainText(note.blocks)}\n`
}

export async function exportText(note: Note): Promise<void> {
  const blob = new Blob([noteToPlainText(note)], { type: 'text/plain;charset=utf-8' })
  downloadBlob(blob, `${safeName(note)}.txt`)
}

export async function exportPDF(note: Note): Promise<void> {
  const color = HEX[note.color ?? 'gray']
  const body = blocksToPlainText(note.blocks)
    .split('\n\n')
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(note.title)}</title>
<style>
  body { font: 15px/1.6 -apple-system, 'Segoe UI', Roboto, sans-serif; color:#1a2230; max-width: 640px; margin: 48px auto; padding: 0 24px; }
  h1 { font-size: 26px; margin: 0 0 4px; }
  .meta { color:#8a93a2; font-size: 12px; margin-bottom: 24px; }
  .accent { height: 6px; width: 56px; border-radius: 3px; background: ${color.fg}; margin-bottom: 20px; }
  p { margin: 0 0 14px; white-space: pre-wrap; }
  @media print { body { margin: 24px auto; } }
</style></head><body>
<h1>${escapeHtml(note.title || 'Note')}</h1>
<div class="meta">${formatDateTime(note.updatedAt)}</div>
<div class="accent"></div>
${body || '<p><em>Empty note</em></p>'}
<script>window.onload=()=>{setTimeout(()=>window.print(),150)}</script>
</body></html>`
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
}

export async function exportImage(
  node: HTMLElement,
  note: Note,
  layout: ExportLayout
): Promise<void> {
  const { toPng } = await import('html-to-image')
  const width = layout === 'square' ? 720 : 760
  const dataUrl = await toPng(node, {
    width,
    height: layout === 'square' ? 720 : undefined,
    pixelRatio: 2,
    backgroundColor: HEX[note.color ?? 'gray'].soft,
    style: { width: `${width}px` },
  })
  const blob = await (await fetch(dataUrl)).blob()
  const file = new File([blob], `${safeName(note)}.png`, { type: 'image/png' })
  const shared = await shareFiles([file], note.title)
  if (!shared) downloadBlob(blob, file.name)
}

export async function exportNoteFile(fileId: string): Promise<void> {
  const file = await getFile(fileId)
  if (!file) return
  const f = new File([file.blob], file.name, { type: file.mime })
  const shared = await shareFiles([f], file.name)
  if (!shared) downloadBlob(file.blob, file.name)
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
