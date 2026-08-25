/* Payload handed to the Save-to screen after a capture flow
   (share target, voice recording, file import). */

export interface PendingSave {
  kind: 'files' | 'text' | 'audio'
  title?: string
  text?: string
  files?: { blob: Blob; name: string; mime: string }[]
  audio?: {
    blob: Blob
    mime: string
    name: string
    duration?: number
    transcript?: string
  }
}
