import { JSX } from 'react'

const PATHS: Record<string, JSX.Element> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7.5" />
      <path d="M21 21l-4.7-4.7" />
    </>
  ),
  settings: (
    <>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M1.5 14h5M9.5 8h5M17.5 16h5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M18 6L6 18M6 6l12 12" />,
  check: <path d="M20 6L9 17l-5-5" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.9" />
    </>
  ),
  'chevron-left': <path d="M15 18l-6-6 6-6" />,
  'chevron-right': <path d="M9 18l6-6-6-6" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'chevron-up': <path d="M18 15l-6-6-6 6" />,
  'arrow-left': (
    <>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </>
  ),
  'more-v': (
    <g fill="currentColor" stroke="none">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </g>
  ),
  'more-h': (
    <g fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </g>
  ),
  pin: (
    <>
      <path d="M9 3.5h6M10 3.5v5.2L7.5 12h9L14 8.7V3.5" />
      <path d="M12 12v8.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V7.5a4 4 0 018 0V11" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V7.5a4 4 0 017.7-1.5" />
    </>
  ),
  mic: (
    <>
      <path d="M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" />
      <path d="M19 11a7 7 0 01-14 0M12 18v3.5" />
    </>
  ),
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />,
  play: <path d="M8 5.5l11 6.5-11 6.5z" fill="currentColor" stroke="none" />,
  pause: (
    <g fill="currentColor" stroke="none">
      <rect x="7" y="5" width="3.6" height="14" rx="1.2" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1.2" />
    </g>
  ),
  file: (
    <>
      <path d="M13.5 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8.5z" />
      <path d="M13.5 3v5.5H19" />
    </>
  ),
  'file-text': (
    <>
      <path d="M13.5 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8.5z" />
      <path d="M13.5 3v5.5H19M9 13h6M9 17h6" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.8" cy="8.8" r="1.7" />
      <path d="M21 15.5l-4.8-4.8L5.5 21" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 15v-3a8 8 0 0116 0v3" />
      <path d="M20.5 18.5a2 2 0 01-2 2H18a1.5 1.5 0 01-1.5-1.5v-3A1.5 1.5 0 0118 14.5h2.5zM3.5 18.5a2 2 0 002 2H6a1.5 1.5 0 001.5-1.5v-3A1.5 1.5 0 006 14.5H3.5z" />
    </>
  ),
  link: (
    <>
      <path d="M10 13.2a5 5 0 007.5.5l2.6-2.6a5 5 0 00-7.1-7.1L11.6 5.4" />
      <path d="M14 10.8a5 5 0 00-7.5-.5l-2.6 2.6a5 5 0 007.1 7.1l1.4-1.4" />
    </>
  ),
  cards: (
    <>
      <path d="M12 3L3 7.5l9 4.5 9-4.5z" />
      <path d="M3 12.5L12 17l9-4.5M3 17l9 4.5 9-4.5" />
    </>
  ),
  folder: <path d="M21.5 19a2 2 0 01-2 2h-15a2 2 0 01-2-2V5.5a2 2 0 012-2H9l2 3h8.5a2 2 0 012 2z" />,
  'folder-plus': (
    <>
      <path d="M21.5 19a2 2 0 01-2 2h-15a2 2 0 01-2-2V5.5a2 2 0 012-2H9l2 3h8.5a2 2 0 012 2z" />
      <path d="M12 10.5v5M9.5 13h5" />
    </>
  ),
  edit: (
    <>
      <path d="M17 3.5a2.6 2.6 0 013.7 3.7L8 19.9 3 21l1.1-5L17 3.5z" />
    </>
  ),
  type: <path d="M4 7V4h16v3M9.5 20h5M12 4v16" />,
  checklist: (
    <>
      <path d="M9.5 11.5l2 2L21 4" />
      <path d="M20.5 11.5V19a2 2 0 01-2 2h-13a2 2 0 01-2-2V6a2 2 0 012-2H14" />
    </>
  ),
  list: (
    <>
      <path d="M8.5 6h12M8.5 12h12M8.5 18h12" />
      <g fill="currentColor" stroke="none">
        <circle cx="4" cy="6" r="1.4" />
        <circle cx="4" cy="12" r="1.4" />
        <circle cx="4" cy="18" r="1.4" />
      </g>
    </>
  ),
  'list-ordered': (
    <>
      <path d="M10 6h11M10 12h11M10 18h11" />
      <path d="M4.5 5.5L6 4.7V9M3.8 13.5h2.4l-2.4 3h2.4M3.8 18.6h2.4c0-1-2.4-.6-2.4-1.9 0-.9 2.4-.9 2.4.3" />
    </>
  ),
  bold: <path d="M7 4h5.5a3.75 3.75 0 010 7.5H7zM7 11.5h6.5a4.25 4.25 0 010 8.5H7z" />,
  italic: (
    <>
      <path d="M19 4h-9M14 20H5M15 4L9 20" />
    </>
  ),
  underline: (
    <>
      <path d="M6 3.5V11a6 6 0 0012 0V3.5" />
      <path d="M4.5 21h15" />
    </>
  ),
  highlighter: (
    <>
      <path d="M12.5 15.5l-8 8H2V21l8-8" />
      <path d="M16 3.5l4.5 4.5-9 9L7 12.5z" />
    </>
  ),
  droplet: <path d="M12 2.8l5.7 5.6a8 8 0 11-11.3 0z" />,
  bell: (
    <>
      <path d="M18 8.5a6 6 0 10-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5" />
      <path d="M13.8 20.5a2 2 0 01-3.6 0" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12.5" height="12.5" rx="2.5" />
      <path d="M5.5 15H4.5A2.5 2.5 0 012 12.5v-8A2.5 2.5 0 014.5 2h8A2.5 2.5 0 0115 4.5v1" />
    </>
  ),
  archive: (
    <>
      <path d="M20.5 8.5V19a2 2 0 01-2 2h-13a2 2 0 01-2-2V8.5" />
      <rect x="2.5" y="3" width="19" height="5.5" rx="1.5" />
      <path d="M10 12.5h4" />
    </>
  ),
  trash: (
    <>
      <path d="M3.5 6h17M8.5 6V4.5a2 2 0 012-2h3a2 2 0 012 2V6" />
      <path d="M18.5 6v13a2 2 0 01-2 2h-9a2 2 0 01-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  share: (
    <>
      <path d="M4.5 12v7a2 2 0 002 2h11a2 2 0 002-2v-7" />
      <path d="M16 6.5l-4-4-4 4M12 2.5v13" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M7 10l5 5 5-5M12 15V3" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M7 8l5-5 5 5M12 3v12" />
    </>
  ),
  'folder-move': (
    <>
      <path d="M21.5 19a2 2 0 01-2 2h-15a2 2 0 01-2-2V5.5a2 2 0 012-2H9l2 3h8.5a2 2 0 012 2z" />
      <path d="M9.5 14.5H16M13.5 11.5l3 3-3 3" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 015.5 5.5v.5" />
    </>
  ),
  redo: (
    <>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H9.5A5.5 5.5 0 004 14.5v.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
    </>
  ),
  moon: <path d="M20.5 13.5A8.5 8.5 0 1110.5 3.5a7 7 0 0010 10z" />,
  grid: (
    <g>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </g>
  ),
  rows: (
    <g>
      <rect x="3" y="4" width="18" height="6.5" rx="2" />
      <rect x="3" y="13.5" width="18" height="6.5" rx="2" />
    </g>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.5V12l3.5 2" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <path d="M1 1l22 22" />
    </>
  ),
  refresh: (
    <>
      <path d="M2.5 5v5.5H8" />
      <path d="M4 15a8.5 8.5 0 102-8.7L2.5 10.5" />
    </>
  ),
  shield: <path d="M12 22s8-3.5 8-10V5.5L12 2 4 5.5V12c0 6.5 8 10 8 10z" />,
  cloud: <path d="M18 10h-1.3A7.5 7.5 0 104 16.5a5.5 5.5 0 005.5 5.5H18a5 5 0 000-10z" />,
  cloudOff: (
    <>
      <path d="M18 10h-1.3A7.5 7.5 0 008.5 5.3M4.8 8A7.5 7.5 0 009.5 22H18a5 5 0 002.6-9.3" />
      <path d="M2 2l20 20" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16.5v-5M12 8h.01" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
      <path d="M16 2.5v4M8 2.5v4M3 10h18" />
    </>
  ),
  repeat: (
    <>
      <path d="M17 2.5l4 4-4 4" />
      <path d="M3 11.5v-1a4 4 0 014-4h14" />
      <path d="M7 21.5l-4-4 4-4" />
      <path d="M21 12.5v1a4 4 0 01-4 4H3" />
    </>
  ),
  external: (
    <>
      <path d="M18 13.5V19a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h5.5" />
      <path d="M15 3h6v6M10 14L21 3" />
    </>
  ),
  grip: (
    <g fill="currentColor" stroke="none">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </g>
  ),
  'plus-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
  key: (
    <>
      <path d="M21 2l-2 2m-7.6 7.6a5.5 5.5 0 11-7.8 7.8 5.5 5.5 0 017.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </>
  ),
  video: (
    <>
      <path d="M23 7.5l-6 4.5 6 4.5z" />
      <rect x="1" y="5.5" width="15" height="13" rx="2.5" />
    </>
  ),
  star: <path d="M12 2.8l2.9 5.8 6.4 1-4.6 4.5 1.1 6.4L12 17.5l-5.8 3l1.1-6.4L2.7 9.6l6.4-1z" />,
  shuffle: (
    <>
      <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
    </>
  ),
  media: (
    <>
      <rect x="7" y="3" width="14" height="14" rx="3" fill="currentColor" stroke="none" opacity="0.45" />
      <rect x="3" y="7" width="14" height="14" rx="3" fill="currentColor" stroke="none" />
      <path d="M6.5 17.5l3-3.4 2.2 2.3 2-2.2 2.8 3.3z" fill="#fff" stroke="none" />
      <circle cx="7.8" cy="11" r="1.3" fill="#fff" stroke="none" />
    </>
  ),
  heading: <path d="M5 4v16M19 4v16M5 12h14" />,
  superscript: (
    <>
      <path d="M4 19L12 7l8 12M6.2 15h11.6" />
      <path d="M17.5 6.5c0-1 .8-1.7 1.75-1.7S21 5.5 21 6.4c0 1.4-3.5 2.1-3.5 4.1h3.7" strokeWidth="1.5" />
    </>
  ),
  subscript: (
    <>
      <path d="M4 5l8 12 8-12M6.2 9h11.6" />
      <path d="M17.5 15.5c0-1 .8-1.7 1.75-1.7S21 14.5 21 15.4c0 1.4-3.5 2.1-3.5 4.1h3.7" strokeWidth="1.5" />
    </>
  ),
  'text-clear': (
    <>
      <path d="M4 7V5h13v2M10.5 5v14M13 19h-5" />
      <path d="M15.5 15.5l5 5m0-5l-5 5" />
    </>
  ),
  selectAll: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" stroke-dasharray="3.2 2.6" />
      <path d="M8.7 12.2l2.3 2.3 4.5-4.8" />
    </>
  ),
  bookmark: <path d="M6.8 3.2h10.4a1.3 1.3 0 011.3 1.3v16.3l-6.5-4.2-6.5 4.2V4.5a1.3 1.3 0 011.3-1.3z" />,
  offline: (
    <>
      <path d="M18 10h-1.3A7.5 7.5 0 104 16.5a5.5 5.5 0 005.5 5.5H18a5 5 0 000-10z" />
      <path d="M9.5 15.5h5" />
    </>
  ),
  'scan-face': (
    <>
      <path d="M3 7.5V5a2 2 0 012-2h2.5M14.5 3H17a2 2 0 012 2v2.5M21 14.5V17a2 2 0 01-2 2h-2.5M9.5 21H5a2 2 0 01-2-2v-2.5" />
      <path d="M8.5 9.5h.01M15.5 9.5h.01M8.5 14.2s1.2 1.6 3.5 1.6 3.5-1.6 3.5-1.6" />
    </>
  ),
}

/* Filled counterparts used across lists, cards and nav for a more solid look. */
const FILLED: Record<string, JSX.Element> = {
  folder: (
    <path
      d="M10.6 3.2c.5-.75 1.35-1.2 2.25-1.2H19a3 3 0 013 3v1H6.2zM3 8.25A3.25 3.25 0 016.25 5h11.5A3.25 3.25 0 0121 8.25v9A3.75 3.75 0 0117.25 21H6.75A3.75 3.75 0 013 17.25z"
      fill="currentColor"
      stroke="none"
    />
  ),
  pin: (
    <path
      d="M14.6 2.3a1.6 1.6 0 00-2.26 0l-.62.62a1.6 1.6 0 000 2.26l.18.18-4.06 2.9a2.4 2.4 0 00-2.98.33l-.53.53a1.2 1.2 0 000 1.7L8.6 15.1l-5.4 5.4a.85.85 0 001.2 1.2l5.4-5.4 4.28 4.27a1.2 1.2 0 001.7 0l.53-.53a2.4 2.4 0 00.33-2.98l2.9-4.06.18.18a1.6 1.6 0 002.26 0l.62-.62a1.6 1.6 0 000-2.26z"
      fill="currentColor"
      stroke="none"
    />
  ),
  mic: (
    <>
      <rect x="9" y="2.5" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
      <path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3.2" strokeWidth="2" />
    </>
  ),
  file: (
    <path
      d="M13.4 2.2H7A2.8 2.8 0 004.2 5v14A2.8 2.8 0 007 21.8h10a2.8 2.8 0 002.8-2.8V8.6zM13.4 2.2V7a1.6 1.6 0 001.6 1.6h4.8z"
      fill="currentColor"
      stroke="none"
    />
  ),
  'file-text': (
    <>
      <path
        d="M13.4 2.2H7A2.8 2.8 0 004.2 5v14A2.8 2.8 0 007 21.8h10a2.8 2.8 0 002.8-2.8V8.6zM13.4 2.2V7a1.6 1.6 0 001.6 1.6h4.8z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M8.5 13h7M8.5 16.5h7" strokeWidth="1.7" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" stroke="none" />
      <circle cx="9" cy="9" r="1.8" fill="#fff" stroke="none" />
      <path d="M5 18.5l4.6-5 3.2 3.4 2.6-2.8L20 18.7a2.5 2.5 0 01-2 1.3H7a2.5 2.5 0 01-2-1.5z" fill="#fff" stroke="none" opacity="0.9" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 15v-3.5a8 8 0 0116 0V15" strokeWidth="2" />
      <rect x="2.8" y="13.5" width="5" height="8" rx="2.4" fill="currentColor" stroke="none" />
      <rect x="16.2" y="13.5" width="5" height="8" rx="2.4" fill="currentColor" stroke="none" />
    </>
  ),
  cards: (
    <>
      <path d="M11.1 2.5a2 2 0 011.8 0l8 4a1.2 1.2 0 010 2.15l-8 4a2 2 0 01-1.8 0l-8-4a1.2 1.2 0 010-2.15z" fill="currentColor" stroke="none" />
      <path d="M3.4 12.4l7.7 3.85a2 2 0 001.8 0l7.7-3.85a1.15 1.15 0 011.03 2.05l-8.73 4.37a2 2 0 01-1.8 0L2.37 14.45A1.15 1.15 0 013.4 12.4z" fill="currentColor" stroke="none" opacity="0.55" />
      <path d="M3.4 16.9l7.7 3.85a2 2 0 001.8 0l7.7-3.85a1.15 1.15 0 011.03 2.05l-8.73 4.37a2 2 0 01-1.8 0L2.37 18.95A1.15 1.15 0 013.4 16.9z" fill="currentColor" stroke="none" opacity="0.3" transform="translate(0 -1.2)" />
    </>
  ),
  bell: (
    <>
      <path
        d="M12 2.2a6.6 6.6 0 00-6.6 6.6c0 5.6-2.1 7.4-2.1 7.4a.9.9 0 00.7 1.5h16a.9.9 0 00.7-1.5s-2.1-1.8-2.1-7.4A6.6 6.6 0 0012 2.2z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M9.9 20.2a2.2 2.2 0 004.2 0z" fill="currentColor" stroke="none" />
    </>
  ),
  lock: (
    <>
      <rect x="4.6" y="10.4" width="14.8" height="10.8" rx="3" fill="currentColor" stroke="none" />
      <path d="M8.2 10.4V7.6a3.8 3.8 0 017.6 0v2.8" strokeWidth="2.2" />
    </>
  ),
  trash: (
    <>
      <path d="M9 3.8h6a1 1 0 011 1V6H8V4.8a1 1 0 011-1z" fill="currentColor" stroke="none" />
      <path
        d="M4.5 6h15a1 1 0 010 2h-.6l-.9 11a2.4 2.4 0 01-2.4 2.2H8.4A2.4 2.4 0 016 19l-.9-11h-.6a1 1 0 110-2zm5 4.5v7.2m5-7.2v7.2"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  checklist: (
    <>
      <rect x="2.5" y="3" width="7" height="7" rx="2" fill="currentColor" stroke="none" />
      <path d="M4.4 6.4l1.3 1.3 2.2-2.4" stroke="#fff" strokeWidth="1.6" />
      <rect x="2.5" y="14" width="7" height="7" rx="2" fill="currentColor" stroke="none" />
      <path d="M4.4 17.4l1.3 1.3 2.2-2.4" stroke="#fff" strokeWidth="1.6" />
      <path d="M13 6.5h8.5M13 17.5h8.5" strokeWidth="2" />
    </>
  ),
}

export type IconName = keyof typeof PATHS

export function Icon({
  name,
  size = 22,
  strokeWidth = 1.8,
  className,
  style,
}: {
  name: IconName | string
  size?: number
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}) {
  const filled = FILLED[name]
  if (filled) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
        aria-hidden
      >
        {filled}
      </svg>
    )
  }
  const path = PATHS[name] ?? PATHS['file']
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      {path}
    </svg>
  )
}
