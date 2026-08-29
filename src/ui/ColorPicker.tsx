import { COLOR_KEYS, COLOR_LABELS, HEX, palClass } from '@/core/palette'
import type { ColorKey } from '@/core/types'
import { cn } from '@/core/utils'
import { Icon } from './Icon'

export function ColorPicker({
  value,
  onChange,
  allowNone,
}: {
  value: ColorKey | null
  onChange: (c: ColorKey | null) => void
  allowNone?: boolean
}) {
  return (
    <div className="color-picker">
      {allowNone && (
        <button
          className={cn('color-dot', 'color-none', !value && 'color-dot-active')}
          onClick={() => onChange(null)}
          aria-label="No color"
        >
          {!value ? <Icon name="check" size={13} strokeWidth={2.6} /> : <Icon name="x" size={13} />}
        </button>
      )}
      {COLOR_KEYS.map((k) => (
        <button
          key={k}
          className={cn('color-dot', value === k && 'color-dot-active', palClass(k))}
          style={{ background: HEX[k].bg }}
          onClick={() => onChange(k)}
          aria-label={COLOR_LABELS[k]}
        >
          {value === k && (
            <Icon name="check" size={13} style={{ color: HEX[k].fg }} strokeWidth={2.6} />
          )}
        </button>
      ))}
    </div>
  )
}
