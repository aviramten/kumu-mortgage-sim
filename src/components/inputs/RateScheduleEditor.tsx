import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { RateSchedulePoint } from '@/types/macro'
import { validateSchedulePeriod, validateCumulativeDelta } from '@/utils/validation'

// ---------------------------------------------------------------------------
// RateScheduleEditor — editable step-function table of {period, cumulativeDelta}
// Used for prime / makam (period = year) and variable-linked/unlinked
// (period = update-station index) rate-change forecasts.
// ---------------------------------------------------------------------------
interface RateScheduleEditorProps {
  points:      RateSchedulePoint[]
  onChange:    (points: RateSchedulePoint[]) => void
  periodLabel: string
}

const fieldBorder = {
  ok:      'border-gray-200 dark:border-kumu-navy-light focus-within:border-kumu-blue focus-within:ring-2 focus-within:ring-kumu-blue/20',
  warning: 'border-kumu-yellow focus-within:ring-2 focus-within:ring-kumu-yellow/20',
  error:   'border-kumu-error  focus-within:ring-2 focus-within:ring-kumu-error/20',
}

// ---------------------------------------------------------------------------
// SchedulePointRow — its own component so each row can hold its own
// focused/raw text-editing state (needed for free typing: backspacing to
// empty or typing a leading "-" would otherwise get rejected by a bare
// <input type="number"> bound directly to the committed numeric value).
// ---------------------------------------------------------------------------
function SchedulePointRow({
  point, periodLabel, onUpdate, onRemove,
}: {
  point:       RateSchedulePoint
  periodLabel: string
  onUpdate:    (partial: Partial<RateSchedulePoint>) => void
  onRemove:    () => void
}) {
  const periodResult = validateSchedulePeriod(point.period, periodLabel)
  const deltaResult  = validateCumulativeDelta(point.cumulativeDelta)

  const [periodFocused, setPeriodFocused] = useState(false)
  const [periodRaw,     setPeriodRaw]     = useState('')

  const [deltaFocused, setDeltaFocused] = useState(false)
  const [deltaRaw,     setDeltaRaw]     = useState('')

  return (
    <div className="flex items-center gap-2">
      <div className={['w-16 h-9 rounded-xl border bg-transparent transition-all duration-200', fieldBorder[periodResult.status]].join(' ')}>
        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={periodFocused ? periodRaw : String(point.period)}
          onFocus={() => { setPeriodFocused(true); setPeriodRaw(String(point.period)) }}
          onBlur={() => {
            setPeriodFocused(false)
            const parsed = parseInt(periodRaw.replace(/\D/g, ''), 10)
            if (!isNaN(parsed) && parsed >= 1) onUpdate({ period: parsed })
          }}
          onChange={(e) => setPeriodRaw(e.target.value.replace(/\D/g, ''))}
          className={[
            'w-full h-full rounded-xl bg-transparent px-2 text-center text-sm dir-ltr',
            'text-kumu-navy dark:text-white outline-none',
          ].join(' ')}
        />
      </div>

      <span className="text-[11px] text-kumu-navy-light dark:text-kumu-blue-lighter shrink-0">
        {periodLabel}
      </span>

      <div className={['relative flex-1 h-9 rounded-xl border bg-transparent transition-all duration-200', fieldBorder[deltaResult.status]].join(' ')}>
        <input
          type="text"
          inputMode="decimal"
          dir="ltr"
          value={deltaFocused ? deltaRaw : (point.cumulativeDelta === 0 ? '' : String(point.cumulativeDelta))}
          onFocus={() => { setDeltaFocused(true); setDeltaRaw(point.cumulativeDelta === 0 ? '' : String(point.cumulativeDelta)) }}
          onBlur={() => {
            setDeltaFocused(false)
            const parsed = parseFloat(deltaRaw)
            if (!isNaN(parsed)) onUpdate({ cumulativeDelta: parsed })
          }}
          onChange={(e) => setDeltaRaw(e.target.value)}
          className={[
            'w-full h-full rounded-xl bg-transparent pr-3 pl-7 text-sm dir-ltr',
            'text-kumu-navy dark:text-white outline-none',
          ].join(' ')}
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-kumu-navy-light dark:text-kumu-blue-lighter pointer-events-none select-none">
          %
        </span>
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="הסר נקודה"
        className="shrink-0 p-1.5 rounded-lg text-kumu-navy-light hover:text-kumu-error hover:bg-kumu-error/10 dark:text-kumu-blue-lighter/60 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export function RateScheduleEditor({ points, onChange, periodLabel }: RateScheduleEditorProps) {
  const sorted = [...points].sort((a, b) => a.period - b.period)

  const updatePoint = (index: number, partial: Partial<RateSchedulePoint>) => {
    onChange(sorted.map((p, i) => (i === index ? { ...p, ...partial } : p)))
  }

  const removePoint = (index: number) => {
    onChange(sorted.filter((_, i) => i !== index))
  }

  const addPoint = () => {
    const lastPeriod = sorted.length > 0 ? sorted[sorted.length - 1].period : 0
    onChange([...sorted, { period: lastPeriod + 1, cumulativeDelta: 0 }])
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.length === 0 && (
        <p className="text-[11px] text-kumu-navy-light dark:text-kumu-blue-lighter/70">
          אין נקודות בלוח — הריבית תישאר קבועה לכל אורך התקופה.
        </p>
      )}

      {sorted.map((point, i) => (
        <SchedulePointRow
          key={i}
          point={point}
          periodLabel={periodLabel}
          onUpdate={(partial) => updatePoint(i, partial)}
          onRemove={() => removePoint(i)}
        />
      ))}

      <button
        type="button"
        onClick={addPoint}
        className={[
          'flex items-center justify-center gap-1 h-8 rounded-xl border border-dashed',
          'border-gray-300 dark:border-kumu-navy-light text-[11px] text-kumu-blue',
          'hover:bg-kumu-blue/5 transition-colors',
        ].join(' ')}
      >
        <Plus size={13} />
        הוסף נקודה
      </button>
    </div>
  )
}
