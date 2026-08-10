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

      {sorted.map((point, i) => {
        const periodResult = validateSchedulePeriod(point.period, periodLabel)
        const deltaResult  = validateCumulativeDelta(point.cumulativeDelta)

        return (
          <div key={i} className="flex items-center gap-2">
            <div className={['w-16 h-9 rounded-xl border bg-transparent transition-all duration-200', fieldBorder[periodResult.status]].join(' ')}>
              <input
                type="number"
                value={point.period}
                step={1}
                min={1}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10)
                  if (!isNaN(parsed)) updatePoint(i, { period: parsed })
                }}
                className={[
                  'w-full h-full rounded-xl bg-transparent px-2 text-center text-sm dir-ltr',
                  'text-kumu-navy dark:text-white outline-none',
                  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none',
                  '[&::-webkit-inner-spin-button]:appearance-none',
                ].join(' ')}
              />
            </div>

            <span className="text-[11px] text-kumu-navy-light dark:text-kumu-blue-lighter shrink-0">
              {periodLabel}
            </span>

            <div className={['relative flex-1 h-9 rounded-xl border bg-transparent transition-all duration-200', fieldBorder[deltaResult.status]].join(' ')}>
              <input
                type="number"
                value={point.cumulativeDelta === 0 ? '' : point.cumulativeDelta}
                step={0.1}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value)
                  if (!isNaN(parsed)) updatePoint(i, { cumulativeDelta: parsed })
                }}
                className={[
                  'w-full h-full rounded-xl bg-transparent pr-3 pl-7 text-sm dir-ltr',
                  'text-kumu-navy dark:text-white outline-none',
                  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none',
                  '[&::-webkit-inner-spin-button]:appearance-none',
                ].join(' ')}
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-kumu-navy-light dark:text-kumu-blue-lighter pointer-events-none select-none">
                %
              </span>
            </div>

            <button
              type="button"
              onClick={() => removePoint(i)}
              aria-label="הסר נקודה"
              className="shrink-0 p-1.5 rounded-lg text-kumu-navy-light hover:text-kumu-error hover:bg-kumu-error/10 dark:text-kumu-blue-lighter/60 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )
      })}

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
