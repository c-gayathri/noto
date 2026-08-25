import { PALETTE } from '@/core/palette'
import type { ColorKey } from '@/core/types'
import { cn } from '@/core/utils'
import { Icon } from './Icon'

export function ColorPicker({
  value,
  onChange,
  allowNone,
}: {
  value: ColorKey | null
  onChange: (c: ColorKey) => void
  allowNone?: boolean
}) {
  return (
    <div className="color-picker">
      {allowNone && (
        <button
          className={cn('color-dot', 'color-none', !value && 'color-dot-active')}
          onClick={() => onChange('gray')}
          aria-label="Default"
        >
          <Icon name="x" size={13} />
        </button>
      )}
      {PALETTE.map((p) => (
        <button
          key={p.key}
          className={cn('color-dot', value === p.key && 'color-dot-active')}
          style={{ background: p.bg }}
          onClick={() => onChange(p.key)}
          aria-label={p.label}
        >
          {value === p.key && (
            <Icon name="check" size={13} style={{ color: p.fg }} strokeWidth={2.6} />
          )}
        </button>
      ))}
    </div>
  )
}
