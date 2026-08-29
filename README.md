# Noto — mobile-first notes & documentation app

> Anything you can share from your phone should be something you can save here immediately.

Noto is a local-first notes app for people who currently use WhatsApp chats as an
informal storage system. Share a PDF, photo, link, audio or text from any app →
pick a folder → done. No account required, works fully offline.

Built as a **React + TypeScript PWA** (Vite). The Web Share Target API makes
"Share → Noto" work on Android/installed PWA; IndexedDB keeps everything on
device; the sync layer is isolated so Google Drive can be added later without
touching UI or storage code.

## Run it

```bash
npm install
npm run dev        # develop (host-exposed for phone testing)
npm run build      # typecheck + production build
npm run preview    # serve the production build
```

For the real "Share → Noto" flow, deploy over HTTPS and install the PWA
(Android Chrome: Install app). The service worker (`public/sw.js`) receives
shared files and hands them to the Save-to screen.

## Architecture

Strict separation between UI and infrastructure — each layer is replaceable:

```
src/
  core/               # no React, no DOM assumptions beyond Web APIs
    types.ts          # note/content model (Note, NoteBlock, Folder, StoredFile…)
    db.ts             # IndexedDB schema (Dexie) + meta/settings store
    repo.ts           # repositories: all writes go through here (+ sync outbox)
    fileStore.ts      # blob storage, object URLs, share/download helpers
    lock.ts           # auth: WebAuthn biometrics + passcode fallback
    sync.ts           # SyncService interface; local impl + Drive stub
    reminders.ts      # notification scheduler (one-time + recurring)
    export.ts         # PDF (print), image (html-to-image), plain text
    search.ts         # titles, note text, folder names, filenames,
                      #   transcripts & document text (auto-indexed when present)
    templates.ts      # templates = plain notes with initial content
    settings.ts       # typed key-value settings (theme, collapse state…)
  ui/                 # shared components (sheets, cards, editor, players…)
  screens/            # Home, Folder, NoteEditor, SaveTo, Search, Settings, Study
  App.tsx             # router, providers (toast/dialogs/lock), theme, reminders
```

### Data model highlights

- A **note** is an ordered list of typed **blocks**: `text | image | file | audio |
  checklist | link | flashcards` — reorderable by drag.
- **Files** are stored as blobs next to structured data; blocks reference file ids.
- **Audio blocks** carry an optional `transcript` — ready for an external/local
  transcription service to fill in; search picks it up automatically.
- The **outbox** table records every change, so a future sync service can push
  deltas without feature code knowing about it.

### Privacy

Locked notes/folders are gated by WebAuthn platform biometrics with a device-style
passcode fallback (hashed, local). Locked folders always render a section at the
end of Home — present even when empty — so the UI never reveals whether private
content exists. Locked notes never show titles or previews.

## Milestone roadmap

- [x] Fast capture: share target, voice, files, text, flashcards, templates
- [x] Folders (pin/lock/color/rename/archive, drag notes in & out)
- [x] Mixed-content notes with drag-reorder + rich text editing
- [x] Search, export (PDF/PNG/TXT), reminders, flashcard study mode
- [x] Local-first storage, offline PWA shell, backup export/import
- [ ] Google Drive sync (implement `SyncService` in `src/core/sync.ts`)
- [ ] Transcription service hook for voice notes
- [ ] Document text extraction for full-text search
