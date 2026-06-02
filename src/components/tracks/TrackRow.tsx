import { useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { useMixStore } from '@/store/useMixStore'
import { validateTrackAmount, validateTrackMonths, validateAnnualRate } from '@/utils/validation'
import { formatNumber } from '@/utils/format'
import type { LoanTrack, TrackType, GraceType, RateChangePeriod } from '@/types/track'
import type { MixId } from '@/types/mix'

/* ── Option lists ──────────────────────────────────────────────────────────── */

const TRACK_TYPE_OPTIONS: { value: TrackType; label: string }[] = [
  { value: 'prime',             label: 'פריים'   },
  { value: 'fixed-unlinked',    label: 'קל"צ'    },
  { value: 'fixed-linked',      label: 'ק"צ'     },
  { value: 'variable-linked',   label: 'מ"צ'     },
  { value: 'variable-unlinked', label: 'מל"צ'    },
  { value: 'eligibility',       label: 'זכאות'   },
  { value: 'variable-makam',    label: 'מק"מ'    },
  { value: 'usd',               label: 'דולר $'  },
  { value: 'eur',               label: 'יורו €'  },
]

const RATE_CHANGE_OPTIONS: { value: RateChangePeriod; label: string }[] = [
  { value: 18,  label: "18 ח'"   },
  { value: 24,  label: "24 ח'"   },
  { value: 36,  label: '3 שנים'  },
  { value: 60,  label: '5 שנים'  },
  { value: 84,  label: '7 שנים'  },
  { value: 120, label: '10 שנים' },
]

const GRACE_OPTIONS: { value: GraceType; label: string }[] = [
  { value: 'none',            label: 'ללא'       },
  { value: 'partial',         label: 'חלקי'      },
  { value: 'full',            label: 'מלא'       },
  { value: 'balloon-partial', label: "בלון ח'"   },
  { value: 'balloon-full',    label: 'בלון מלא'  },
]

const VARIABLE_TYPES: TrackType[] = ['variable-linked', 'variable-unlinked']

/* ── Shared cell class builders ────────────────────────────────────────────── */

const BASE_SEL = [
  'w-full h-7 rounded-md border border-transparent px-1 text-xs',
  'bg-gray-50 dark:bg-kumu-navy/60',
  'text-kumu-navy dark:text-white outline-none cursor-pointer',
  'hover:border-kumu-blue/30 focus:border-kumu-blue',
  'focus:bg-white dark:focus:bg-kumu-navy-dark',
  'focus:ring-1 focus:ring-kumu-blue/20 transition-all duration-100',
].join(' ')

const BASE_INP = [
  'w-full h-7 rounded-md border border-transparent px-1 text-xs text-center',
  'bg-gray-50 dark:bg-kumu-navy/60',
  'text-kumu-navy dark:text-white outline-none',
  'hover:border-kumu-blue/30 focus:border-kumu-blue',
  'focus:bg-white dark:focus:bg-kumu-navy-dark',
  'focus:ring-1 focus:ring-kumu-blue/20 transition-all duration-100',
  '[appearance:textfield]',
  '[&::-webkit-inner-spin-button]:appearance-none',
  '[&::-webkit-outer-spin-button]:appearance-none',
].join(' ')

const ERR_CLS = 'border-kumu-error/60 bg-red-50 dark:bg-red-900/10'

const TD = 'px-1 py-1 align-middle'

/* ── AmountCell — formatted on blur, raw on focus ──────────────────────────── */

interface AmountCellProps {
  value:    number
  onChange: (n: number) => void
  hasError: boolean
}

function AmountCell({ value, onChange, hasError }: AmountCellProps) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw]         = useState('')

  return (
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      value={focused ? raw : formatNumber(Math.round(value))}
      onFocus={() => { setFocused(true); setRaw(String(Math.round(value))) }}
      onBlur={() => {
        setFocused(false)
        const n = parseInt(raw.replace(/\D/g, ''), 10)
        onChange(!isNaN(n) && n >= 0 ? n : value)
      }}
      onChange={(e) => setRaw(e.target.value.replace(/\D/g, ''))}
      className={[BASE_INP, hasError ? ERR_CLS : ''].join(' ')}
      title={hasError ? 'יש להזין סכום תקין (מינימום ₪10,000)' : undefined}
    />
  )
}

/* ── TrackRow ──────────────────────────────────────────────────────────────── */

export interface TrackRowProps {
  track: LoanTrack
  mixId: MixId
  index: number
}

export function TrackRow({ track, mixId, index }: TrackRowProps) {
  const updateTrack    = useMixStore((s) => s.updateTrack)
  const removeTrack    = useMixStore((s) => s.removeTrack)
  const duplicateTrack = useMixStore((s) => s.duplicateTrack)

  const upd = (partial: Partial<LoanTrack>) => updateTrack(mixId, track.id, partial)

  const handleTypeChange = (type: TrackType) => {
    const patch: Partial<LoanTrack> = { type }
    if (!VARIABLE_TYPES.includes(type)) {
      patch.rateChangePeriod = undefined
    } else if (!track.rateChangePeriod) {
      patch.rateChangePeriod = 60
    }
    upd(patch)
  }

  const handleGraceTypeChange = (graceType: GraceType) => {
    upd({
      graceType,
      graceMonths: graceType === 'none' ? 0 : Math.max(track.graceMonths, 1),
    })
  }

  const amountErr = validateTrackAmount(track.amount).status  === 'error'
  const monthsErr = validateTrackMonths(track.months).status  === 'error'
  const rateErr   = validateAnnualRate(track.annualRate).status === 'error'
  const hasError  = amountErr || monthsErr || rateErr
  const isVar     = VARIABLE_TYPES.includes(track.type)
  const hasGrace  = track.graceType !== 'none'

  return (
    <>
      {/* ── Main row ─────────────────────────────────────────────────────── */}
      <tr className="group border-t border-gray-100 dark:border-kumu-navy-light/40 hover:bg-kumu-blue/[0.03] dark:hover:bg-kumu-blue/[0.06] transition-colors">

        {/* Index badge */}
        <td className={`${TD} text-center w-6`}>
          <span className={[
            'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold',
            hasError ? 'bg-kumu-error/15 text-kumu-error' : 'bg-kumu-blue/10 text-kumu-blue',
          ].join(' ')}>
            {index}
          </span>
        </td>

        {/* Track type */}
        <td className={`${TD} w-[88px]`}>
          <select
            value={track.type}
            onChange={(e) => handleTypeChange(e.target.value as TrackType)}
            className={BASE_SEL}
          >
            {TRACK_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </td>

        {/* Schedule */}
        <td className={`${TD} w-[76px]`}>
          <select
            value={track.schedule}
            onChange={(e) => upd({ schedule: e.target.value as LoanTrack['schedule'] })}
            className={BASE_SEL}
          >
            <option value="spitzer">שפיצר</option>
            <option value="equalPrincipal">ק"ש</option>
          </select>
        </td>

        {/* Amount */}
        <td className={`${TD} w-[84px]`}>
          <AmountCell
            value={track.amount}
            onChange={(v) => upd({ amount: v })}
            hasError={amountErr}
          />
        </td>

        {/* Months */}
        <td className={`${TD} w-[52px]`}>
          <input
            type="number"
            value={track.months}
            min={48} max={360} step={12}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v)) upd({ months: v })
            }}
            className={[BASE_INP, monthsErr ? ERR_CLS : ''].join(' ')}
            title={monthsErr ? 'תקופה: 48–360 חודשים' : undefined}
          />
        </td>

        {/* Annual rate */}
        <td className={`${TD} w-[52px]`}>
          <input
            type="number"
            value={track.annualRate}
            min={0} max={30} step={0.05}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v)) upd({ annualRate: v })
            }}
            className={[BASE_INP, rateErr ? ERR_CLS : ''].join(' ')}
            dir="ltr"
            title={rateErr ? 'ריבית: 0–30%' : undefined}
          />
        </td>

        {/* Grace type */}
        <td className={`${TD} w-[76px]`}>
          <select
            value={track.graceType}
            onChange={(e) => handleGraceTypeChange(e.target.value as GraceType)}
            className={BASE_SEL}
          >
            {GRACE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </td>

        {/* Grace months */}
        <td className={`${TD} w-[44px]`}>
          {hasGrace ? (
            <input
              type="number"
              value={track.graceMonths}
              min={1}
              max={track.months - 1}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v)) upd({ graceMonths: v })
              }}
              className={BASE_INP}
            />
          ) : (
            <span className="block text-center text-[11px] text-gray-300 dark:text-kumu-navy-light select-none">
              —
            </span>
          )}
        </td>

        {/* Action buttons */}
        <td className={`${TD} w-10 text-center`}>
          <div className="flex items-center justify-center gap-0">
            <button
              type="button"
              onClick={() => duplicateTrack(mixId, track.id)}
              title="שכפל מסלול"
              className="p-1 rounded text-kumu-navy-light dark:text-kumu-blue-lighter hover:text-kumu-blue dark:hover:text-white hover:bg-kumu-blue/10 transition-colors"
            >
              <Copy size={12} />
            </button>
            <button
              type="button"
              onClick={() => removeTrack(mixId, track.id)}
              title="מחק מסלול"
              className="p-1 rounded text-kumu-navy-light dark:text-kumu-blue-lighter hover:text-kumu-error hover:bg-kumu-error/10 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </td>
      </tr>

      {/* ── Sub-row: rate-change period for variable types ───────────────── */}
      {isVar && (
        <tr className="border-b border-dashed border-kumu-blue/15 dark:border-kumu-blue/20 bg-kumu-blue/[0.025] dark:bg-kumu-blue/[0.05]">
          <td />
          <td colSpan={8} className="px-2 pb-1.5 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-kumu-blue/60 dark:text-kumu-blue-lighter/50 whitespace-nowrap">
                תדירות שינוי ריבית:
              </span>
              <select
                value={track.rateChangePeriod ?? 60}
                onChange={(e) =>
                  upd({ rateChangePeriod: Number(e.target.value) as RateChangePeriod })
                }
                className={[BASE_SEL, 'max-w-[110px]'].join(' ')}
              >
                {RATE_CHANGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
