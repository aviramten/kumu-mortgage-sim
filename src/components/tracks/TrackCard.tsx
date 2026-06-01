import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react'
import { useMixStore } from '@/store/useMixStore'
import { ValidationField } from '@/components/ui/ValidationField'
import { validateTrackAmount, validateTrackMonths, validateAnnualRate } from '@/utils/validation'
import { formatNumber } from '@/utils/format'
import type { LoanTrack, TrackType, GraceType, RateChangePeriod } from '@/types/track'
import type { MixId } from '@/types/mix'

// ---------------------------------------------------------------------------
// Static option lists
// ---------------------------------------------------------------------------
const TRACK_TYPE_OPTIONS: { value: TrackType; label: string; short: string }[] = [
  { value: 'prime',             label: 'פריים',                   short: 'פריים'   },
  { value: 'fixed-unlinked',    label: 'קל"צ — קבועה לא צמודה',  short: 'קל"צ'    },
  { value: 'fixed-linked',      label: 'ק"צ — קבועה צמודה',      short: 'ק"צ'     },
  { value: 'variable-linked',   label: 'מ"צ — משתנה צמודה',      short: 'מ"צ'     },
  { value: 'variable-unlinked', label: 'מל"צ — משתנה לא צמודה',  short: 'מל"צ'    },
  { value: 'eligibility',       label: 'זכאות',                   short: 'זכאות'   },
  { value: 'variable-makam',    label: 'משתנה מק"מ (לאומי)',      short: 'מק"מ'    },
  { value: 'usd',               label: 'צמודת דולר ($)',          short: 'דולר'    },
  { value: 'eur',               label: 'צמודת יורו (€)',          short: 'יורו'    },
]

const RATE_CHANGE_OPTIONS: { value: RateChangePeriod; label: string }[] = [
  { value: 18,  label: 'כל 18 חודשים' },
  { value: 24,  label: 'כל 24 חודשים' },
  { value: 36,  label: 'כל 3 שנים'    },
  { value: 60,  label: 'כל 5 שנים'    },
  { value: 84,  label: 'כל 7 שנים'    },
  { value: 120, label: 'כל 10 שנים'   },
]

const GRACE_TYPE_OPTIONS: { value: GraceType; label: string }[] = [
  { value: 'none',            label: 'ללא גרייס'                     },
  { value: 'partial',         label: 'גרייס חלקי — ריבית בלבד'       },
  { value: 'full',            label: 'גרייס מלא — ריבית נצברת לקרן'  },
  { value: 'balloon-partial', label: 'בלון חלקי — קרן בסוף'          },
  { value: 'balloon-full',    label: 'בלון מלא — הכל בסוף'           },
]

/** Track types that expose a rate-change period selector */
const VARIABLE_TYPES: TrackType[] = ['variable-linked', 'variable-unlinked']

// ---------------------------------------------------------------------------
// Shared input class constants
// ---------------------------------------------------------------------------
const selectCls = [
  'w-full h-8 rounded-xl border border-gray-200 dark:border-kumu-navy-light',
  'bg-white dark:bg-kumu-surface-dark px-3 text-sm',
  'text-kumu-navy dark:text-white outline-none',
  'focus:border-kumu-blue focus:ring-2 focus:ring-kumu-blue/20 transition-all',
].join(' ')

const numInputCls = [
  'w-full h-8 bg-transparent px-3 text-sm',
  'text-kumu-navy dark:text-white outline-none',
  '[appearance:textfield]',
  '[&::-webkit-outer-spin-button]:appearance-none',
  '[&::-webkit-inner-spin-button]:appearance-none',
].join(' ')

// ---------------------------------------------------------------------------
// FieldLabel
// ---------------------------------------------------------------------------
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium text-kumu-navy dark:text-kumu-blue-lighter">
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// AmountInput — text field with ₪ prefix, formatted on blur
// ---------------------------------------------------------------------------
interface AmountInputProps {
  value:    number
  onChange: (n: number) => void
  hasError?: boolean
}

function AmountInput({ value, onChange, hasError = false }: AmountInputProps) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw]         = useState('')

  const handleFocus = () => { setFocused(true); setRaw(String(Math.round(value))) }
  const handleBlur  = () => {
    setFocused(false)
    const parsed = parseInt(raw.replace(/\D/g, ''), 10)
    onChange(!isNaN(parsed) && parsed >= 0 ? parsed : value)
  }

  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-xs text-kumu-navy-light dark:text-kumu-blue-lighter pointer-events-none select-none">
        ₪
      </span>
      <input
        type="text"
        inputMode="numeric"
        dir="ltr"
        value={focused ? raw : formatNumber(Math.round(value))}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(e) => setRaw(e.target.value.replace(/\D/g, ''))}
        className={[
          'w-full h-8 bg-transparent pl-7 pr-3 text-sm',
          'text-kumu-navy dark:text-white outline-none',
          hasError ? 'placeholder:text-kumu-error/50' : '',
        ].join(' ')}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// TrackCard
// ---------------------------------------------------------------------------
export interface TrackCardProps {
  track:  LoanTrack
  mixId:  MixId
  index:  number   // 1-based display index
}

export function TrackCard({ track, mixId, index }: TrackCardProps) {
  const [open,      setOpen]      = useState(true)
  const [graceOpen, setGraceOpen] = useState(track.graceType !== 'none')

  const updateTrack    = useMixStore((s) => s.updateTrack)
  const removeTrack    = useMixStore((s) => s.removeTrack)
  const duplicateTrack = useMixStore((s) => s.duplicateTrack)

  const upd = (partial: Partial<LoanTrack>) => updateTrack(mixId, track.id, partial)

  // When track type changes, clear fields that don't apply
  const handleTypeChange = (type: TrackType) => {
    const partial: Partial<LoanTrack> = { type }
    if (!VARIABLE_TYPES.includes(type)) {
      partial.rateChangePeriod = undefined
    } else if (!track.rateChangePeriod) {
      partial.rateChangePeriod = 60
    }
    upd(partial)
  }

  // When grace type changes to 'none', zero out graceMonths
  const handleGraceTypeChange = (graceType: GraceType) => {
    upd({ graceType, graceMonths: graceType === 'none' ? 0 : Math.max(track.graceMonths, 1) })
    if (graceType !== 'none') setGraceOpen(true)
  }

  const amountResult  = validateTrackAmount(track.amount)
  const monthsResult  = validateTrackMonths(track.months)
  const rateResult    = validateAnnualRate(track.annualRate)

  const graceMonthsError =
    track.graceType !== 'none' && (track.graceMonths < 1 || track.graceMonths >= track.months)
      ? 'חודשי הגרייס חייבים להיות בין 1 לתקופת המסלול'
      : undefined

  const shortLabel = TRACK_TYPE_OPTIONS.find((o) => o.value === track.type)?.short ?? track.type
  const hasError   = amountResult.status === 'error' || monthsResult.status === 'error' || rateResult.status === 'error'

  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">

      {/* ---- Header / toggle ---- */}
      <div className="flex items-center px-3 py-2.5 gap-2">
        {/* Index badge */}
        <span className={[
          'flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center',
          hasError
            ? 'bg-kumu-error/15 text-kumu-error'
            : 'bg-kumu-blue/10 text-kumu-blue',
        ].join(' ')}>
          {index}
        </span>

        {/* Summary — click to toggle */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center gap-2 text-right min-w-0"
        >
          <span className="text-xs font-semibold text-kumu-navy dark:text-white truncate">
            {shortLabel}
          </span>
          <span className="text-xs text-kumu-navy-light dark:text-kumu-blue-lighter tabular-nums">
            ₪{formatNumber(track.amount)}
          </span>
          <span className="mr-auto text-kumu-navy-light dark:text-kumu-blue-lighter">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </button>

        {/* Action buttons */}
        <button
          type="button"
          onClick={() => duplicateTrack(mixId, track.id)}
          title="שכפל מסלול"
          className="flex-shrink-0 p-1 rounded-lg text-kumu-navy-light dark:text-kumu-blue-lighter hover:text-kumu-blue dark:hover:text-white transition-colors"
        >
          <Copy size={13} />
        </button>
        <button
          type="button"
          onClick={() => removeTrack(mixId, track.id)}
          title="מחק מסלול"
          className="flex-shrink-0 p-1 rounded-lg text-kumu-navy-light dark:text-kumu-blue-lighter hover:text-kumu-error dark:hover:text-kumu-error transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* ---- Collapsible body ---- */}
      {open && (
        <div className="flex flex-col gap-3 px-3 pb-3 border-t border-gray-100 dark:border-kumu-navy-light pt-3">

          {/* Track type */}
          <div className="flex flex-col gap-1">
            <FieldLabel>סוג מסלול</FieldLabel>
            <select
              value={track.type}
              onChange={(e) => handleTypeChange(e.target.value as TrackType)}
              className={selectCls}
            >
              {TRACK_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Amount | Months */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <FieldLabel>סכום (₪)</FieldLabel>
              <ValidationField result={amountResult}>
                <AmountInput
                  value={track.amount}
                  onChange={(v) => upd({ amount: v })}
                  hasError={amountResult.status === 'error'}
                />
              </ValidationField>
            </div>

            <div className="flex flex-col gap-1">
              <FieldLabel>תקופה (חודשים)</FieldLabel>
              <ValidationField result={monthsResult}>
                <input
                  type="number"
                  value={track.months}
                  min={48}
                  max={360}
                  step={12}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    if (!isNaN(v)) upd({ months: v })
                  }}
                  className={numInputCls}
                />
              </ValidationField>
            </div>
          </div>

          {/* Rate | Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <FieldLabel>ריבית שנתית (%)</FieldLabel>
              <ValidationField result={rateResult}>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={track.annualRate}
                    min={0}
                    max={30}
                    step={0.05}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      if (!isNaN(v)) upd({ annualRate: v })
                    }}
                    className={[numInputCls, 'pr-7'].join(' ')}
                    dir="ltr"
                  />
                  <span className="absolute right-2.5 text-xs text-kumu-navy-light dark:text-kumu-blue-lighter pointer-events-none select-none">
                    %
                  </span>
                </div>
              </ValidationField>
            </div>

            <div className="flex flex-col gap-1">
              <FieldLabel>שיטת פירעון</FieldLabel>
              <select
                value={track.schedule}
                onChange={(e) => upd({ schedule: e.target.value as LoanTrack['schedule'] })}
                className={selectCls}
              >
                <option value="spitzer">שפיצר</option>
                <option value="equalPrincipal">קרן שווה</option>
              </select>
            </div>
          </div>

          {/* Rate change period — variable-linked and variable-unlinked only */}
          {VARIABLE_TYPES.includes(track.type) && (
            <div className="flex flex-col gap-1">
              <FieldLabel>תדירות שינוי ריבית</FieldLabel>
              <select
                value={track.rateChangePeriod ?? 60}
                onChange={(e) => upd({ rateChangePeriod: Number(e.target.value) as RateChangePeriod })}
                className={selectCls}
              >
                {RATE_CHANGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* ---- Grace section ---- */}
          <div className="flex flex-col gap-2 border-t border-gray-100 dark:border-kumu-navy-light pt-2">
            {/* Grace toggle header */}
            <button
              type="button"
              onClick={() => setGraceOpen((o) => !o)}
              className="flex items-center justify-between w-full text-right"
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest text-kumu-blue/70 dark:text-kumu-blue-lighter/60">
                גרייס / בלון
              </span>
              <span className="text-kumu-navy-light dark:text-kumu-blue-lighter">
                {graceOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </span>
            </button>

            {graceOpen && (
              <div className="flex flex-col gap-3">
                {/* Grace type */}
                <div className="flex flex-col gap-1">
                  <FieldLabel>סוג גרייס</FieldLabel>
                  <select
                    value={track.graceType}
                    onChange={(e) => handleGraceTypeChange(e.target.value as GraceType)}
                    className={selectCls}
                  >
                    {GRACE_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Grace months — shown only when grace is active */}
                {track.graceType !== 'none' && (
                  <div className="flex flex-col gap-1">
                    <FieldLabel>חודשי גרייס</FieldLabel>
                    <ValidationField
                      result={
                        graceMonthsError
                          ? { status: 'error', message: graceMonthsError }
                          : { status: 'ok' }
                      }
                    >
                      <input
                        type="number"
                        value={track.graceMonths}
                        min={1}
                        max={track.months - 1}
                        step={1}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          if (!isNaN(v)) upd({ graceMonths: v })
                        }}
                        className={numInputCls}
                      />
                    </ValidationField>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
