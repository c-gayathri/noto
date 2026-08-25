import type { ColorKey } from './types'

export interface PaletteEntry {
  key: ColorKey
  label: string
  bg: string
  fg: string
  soft: string
}

export const PALETTE: PaletteEntry[] = [
  { key: 'blue', label: 'Blue', bg: '#e3ecff', fg: '#2b5ce6', soft: '#f1f5ff' },
  { key: 'green', label: 'Green', bg: '#e0f5e9', fg: '#1e8e4e', soft: '#effaf3' },
  { key: 'purple', label: 'Purple', bg: '#ece5fb', fg: '#7443d6', soft: '#f5f1fd' },
  { key: 'orange', label: 'Orange', bg: '#fdeadd', fg: '#d9730d', soft: '#fef4ec' },
  { key: 'pink', label: 'Pink', bg: '#fce3ec', fg: '#d6336c', soft: '#fdf0f5' },
  { key: 'yellow', label: 'Yellow', bg: '#fdf5d7', fg: '#b28a04', soft: '#fefae9' },
  { key: 'teal', label: 'Teal', bg: '#dcf3f0', fg: '#0f8f80', soft: '#eef9f7' },
  { key: 'gray', label: 'Gray', bg: '#eceef1', fg: '#5b6472', soft: '#f4f5f7' },
]

const MAP = new Map(PALETTE.map((p) => [p.key, p]))

export function colorOf(key: ColorKey | null | undefined): PaletteEntry {
  return (key && MAP.get(key)) || MAP.get('blue')!
}
