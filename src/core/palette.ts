import type { ColorKey } from './types'

/* Colors are applied via CSS classes so light/dark themes get tuned
   values (see .pal-* rules in index.css). The hex map below is only
   used by contexts without theme awareness, e.g. image export. */

export const COLOR_KEYS: ColorKey[] = [
  'blue', 'green', 'purple', 'orange', 'pink', 'yellow', 'teal', 'coral', 'mint', 'gray',
]

export const COLOR_LABELS: Record<ColorKey, string> = {
  blue: 'Blue',
  green: 'Green',
  purple: 'Purple',
  orange: 'Orange',
  pink: 'Pink',
  yellow: 'Yellow',
  teal: 'Teal',
  coral: 'Coral',
  mint: 'Mint',
  gray: 'Gray',
}

/** Light-theme hex values — used for PDF/image export rendering. */
export const HEX: Record<ColorKey, { bg: string; fg: string; soft: string }> = {
  blue: { bg: '#dbe7ff', fg: '#2b5ce6', soft: '#eef3ff' },
  green: { bg: '#d3f1de', fg: '#177c43', soft: '#ebf8f0' },
  purple: { bg: '#e7dcfa', fg: '#6f3ed4', soft: '#f4effc' },
  orange: { bg: '#fce2cc', fg: '#c96a08', soft: '#fef2e7' },
  pink: { bg: '#fadbe7', fg: '#cf2f66', soft: '#fdedf3' },
  yellow: { bg: '#faf0c4', fg: '#a07f00', soft: '#fdf8e4' },
  teal: { bg: '#cfeeea', fg: '#0b8072', soft: '#e9f7f5' },
  coral: { bg: '#fddcd2', fg: '#cf4a26', soft: '#feece7' },
  mint: { bg: '#d2f0df', fg: '#158f5b', soft: '#ecf8f1' },
  gray: { bg: '#e6e8ee', fg: '#525c6b', soft: '#f2f4f7' },
}

export function palClass(key: ColorKey | null | undefined): string {
  return key ? `pal pal-${key}` : 'pal pal-none'
}
