import type { NoteBlock } from './types'
import { uid } from './utils'

/* ------------------------------------------------------------------ */
/* Templates are just notes with pre-filled content — no separate     */
/* template system, no special tables.                                */
/* ------------------------------------------------------------------ */

export interface Template {
  id: string
  name: string
  emoji: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'yellow' | 'teal' | 'gray'
  build: () => NoteBlock[]
}

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

export const TEMPLATES: Template[] = [
  {
    id: 'journal',
    name: 'Journal',
    emoji: '🌤️',
    color: 'yellow',
    build: () => [
      text('<b>How am I feeling today?</b><br><br>'),
      text('<b>Three good things</b><br>1.<br>2.<br>3.'),
    ],
  },
  {
    id: 'grocery',
    name: 'Grocery List',
    emoji: '🛒',
    color: 'green',
    build: () => [
      checklist(['Fruit', 'Vegetables', 'Milk', 'Bread', 'Coffee']),
    ],
  },
  {
    id: 'meeting',
    name: 'Meeting Notes',
    emoji: '🗓️',
    color: 'blue',
    build: () => [
      text('<b>Attendees</b><br>'),
      text('<b>Discussion</b><br>'),
      checklist(['Action items']),
    ],
  },
  {
    id: 'cheatsheet',
    name: 'Study Cheat Sheet',
    emoji: '⚡',
    color: 'orange',
    build: () => [
      text('<b>Key definitions</b><br>'),
      text('<b>Formulas</b><br>'),
      text('<b>Common mistakes to avoid</b><br>'),
    ],
  },
  {
    id: 'reading',
    name: 'Reading Notes',
    emoji: '📚',
    color: 'purple',
    build: () => [
      text('<b>Source</b><br>Title · Author'),
      text('<b>Big ideas</b><br>'),
      text('<b>Quotes I liked</b><br>'),
      text('<b>What I will do with this</b><br>'),
    ],
  },
  {
    id: 'todo',
    name: 'To-do List',
    emoji: '✅',
    color: 'teal',
    build: () => [checklist(['First task', 'Second task', 'Third task'])],
  },
  {
    id: 'flashcards',
    name: 'Flashcards',
    emoji: '🃏',
    color: 'pink',
    build: () => [
      {
        id: uid('b_'),
        type: 'flashcards',
        cards: [
          { id: uid('c_'), front: '', back: '' },
          { id: uid('c_'), front: '', back: '' },
        ],
      },
    ],
  },
]
