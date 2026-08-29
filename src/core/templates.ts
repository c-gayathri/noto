import type { CustomTemplate, NoteBlock } from './types'
import { uid } from './utils'
import { getMeta, setMeta } from './db'

/* ------------------------------------------------------------------ */
/* Templates are just notes with pre-filled content. Three built-ins  */
/* showcase different structures (rich text, checklist, flashcards);  */
/* users can save any of their own notes as a template.               */
/* ------------------------------------------------------------------ */

function text(html: string): NoteBlock {
  return { id: uid('b_'), type: 'text', html }
}

function checklist(items: string[]): NoteBlock {
  return {
    id: uid('b_'),
    type: 'checklist',
    items: items.map((t) => ({ id: uid('i_'), text: t, checked: false })),
  }
}

export interface Template {
  id: string
  name: string
  emoji: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'yellow' | 'teal' | 'coral' | 'mint' | 'gray'
  custom?: boolean
  build: () => NoteBlock[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'meeting',
    name: 'Meeting Notes',
    emoji: '🗓️',
    color: 'blue',
    build: () => [
      text('<h2><b>Meeting</b></h2><br><b>Date</b> ·<br><b>Attendees</b> ·'),
      text('<h3><b>Discussion</b></h3><ul><li>&nbsp;</li><li>&nbsp;</li></ul>'),
      text('<h3><b>Key decisions</b></h3>'),
      checklist(['Follow-up']),
    ],
  },
  {
    id: 'journal',
    name: 'Daily Journal',
    emoji: '🌤️',
    color: 'yellow',
    build: () => [
      text('<span style="background-color: #ffe066">&nbsp;Mood&nbsp;</span> &nbsp;<span style="background-color: #d0ebff">&nbsp;Energy&nbsp;</span><br><br><b>Highlight of the day</b><br>'),
      text('<b>Grateful for</b><ul><li>&nbsp;</li><li>&nbsp;</li><li>&nbsp;</li></ul>'),
      text('<b>Tomorrow</b><br>'),
    ],
  },
  {
    id: 'study',
    name: 'Study Sheet',
    emoji: '⚡',
    color: 'orange',
    build: () => [
      text('<h2><b>Topic</b></h2><h3><b>Definitions</b></h3><ul><li>&nbsp;</li></ul>'),
      text('<h3><b>Formulas / facts to memorise</b></h3>'),
      {
        id: uid('b_'),
        type: 'flashcards',
        cards: [{ id: uid('c_'), front: 'Question', back: 'Answer' }],
      },
      checklist(['Revise once', 'Revise again in 3 days']),
    ],
  },
]

/* ------------------------- custom templates ------------------------ */

const KEY = 'templates.custom'

export async function getCustomTemplates(): Promise<CustomTemplate[]> {
  return getMeta<CustomTemplate[]>(KEY, [])
}

export async function saveNoteAsTemplate(name: string, blocks: NoteBlock[], emoji = '📄'): Promise<CustomTemplate> {
  const list = await getCustomTemplates()
  const tpl: CustomTemplate = {
    id: uid('t_'),
    name,
    emoji,
    blocks: structuredClone(blocks),
    createdAt: Date.now(),
  }
  await setMeta(KEY, [tpl, ...list])
  return tpl
}

export async function deleteCustomTemplate(id: string): Promise<void> {
  const list = await getCustomTemplates()
  await setMeta(
    KEY,
    list.filter((t) => t.id !== id)
  )
}
