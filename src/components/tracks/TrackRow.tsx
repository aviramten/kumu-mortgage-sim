import { useState } from 'react'
import { Trash2, Banknote } from 'lucide-react'
import { useMixStore } from '@/store/useMixStore'
import { validateTrackAmount, validateTrackMonths, validateAnnualRate } from '@/utils/validation'
import { formatNumber, formatCurrencyWhole, roundMoney } from '@/utils/format'
import { MAX_LOAN_MONTHS } from '@/utils/constants'
import type { LoanTrack, TrackType, GraceType, RateChangePeriod, TrackResult } from '@/types/track'
import type { MacroForecasts } from '@/types/macro'
import type { MixId } from '@/types/mix'

/* ── Option lists ──────────────────────────────────────────────────────────── */

const TRACK_TYPE_OPTIONS: { value: TrackType; label: string }[] = [
  { value: 'prime',             label: 'פריים'    },
  { value: 'fixed-unlinked',    label: 'קל"צ'     },
  { value: 'fixed-linked',      label: 'ק"צ'      },
  { value: 'variable-linked',   label: 'מ"צ'      },
  { value: 'variable-unlinked', label: 'מל"צ'     },
  { value: 'eligibility',       label: 'זכאות'    },
  { value: 'variable-makam',    label: 'מק"מ'     },
  { value: 'usd',               label: 'דולר $'   },
  { value: 'eur',               label: 'יורו €'   },
]

const PERIOD_OPTIONS: { value: RateChangePeriod; label: string }[] = [
  { value: 18,  label: '18 חודשים'  },
  { value: 24,  label: '24 חודשים'  },
  { value: 36,  label: '36 חודשים'  },
  { value: 60,  label: '60 חודשים'  },
  { value: 84,  label: '84 חודשים'  },
  { value: 120, label: '120 חודשים' },
]

/** Types that expose a periodic rate-change selector */
const PERIOD_TYPES: TrackType[] = ['variable-linked', 'variable-unlinked']

/* ── Combined schedule + balloon display type ──────────────────────────────── */

type ScheduleDisplay = 'spitzer' | 'equalPrincipal' | 'balloon-partial' | 'balloon-full'

function getScheduleDisplay(track: LoanTrack): ScheduleDisplay {
  if (track.graceType === 'balloon-partial') return 'balloon-partial'
  if (track.graceType === 'balloon-full')    return 'balloon-full'
  return track.schedule
}

/* ── CSS class constants ─────────────────────────────────────────────────── */

/** Compact select */
const S = [
  'h-[26px] w-full rounded border border-transparent',
  'px-1 text-[11px] leading-none',
  'bg-gray-50 dark:bg-kumu-navy/60 text-kumu-navy dark:text-white',
  'hover:border-kumu-blue/30 focus:border-kumu-blue focus:bg-white dark:focus:bg-kumu-navy-dark',
  'outline-none focus:ring-1 focus:ring-kumu-blue/20 transition-all cursor-pointer',
].join(' ')

/** Compact number / text input */
const I = [
  'h-[26px] w-full rounded border border-transparent',
  'px-1 text-[11px] text-center leading-none',
  'bg-gray-50 dark:bg-kumu-navy/60 text-kumu-navy dark:text-white',
  'hover:border-kumu-blue/30 focus:border-kumu-blue focus:bg-white dark:focus:bg-kumu-navy-dark',
  'outline-none focus:ring-1 focus:ring-kumu-blue/20 transition-all',
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
].join(' ')

/** Read-only computed output */
const RO = [
  'h-[26px] w-full flex items-center justify-center',
  'text-[11px] text-kumu-navy dark:text-white tabular-nums font-medium select-none',
].join(' ')

/** Disabled / N/A placeholder */
const NA = [
  'h-[26px] w-full flex items-center justify-center',
  'text-[11px] text-gray-300 dark:text-kumu-navy-light/60 select-none',
].join(' ')

const ERR = 'border-kumu-error/60 bg-red-50 dark:bg-red-900/10'
const TD  = 'px-[3px] py-[3px] align-middle'

/* ── Amount cell — ₪ or % mode with toggle ───────────────────────────────── */

function AmountCell({
  value, onChange, mortgageAmount, hasError,
}: {
  value: number; onChange: (n: number) => void; mortgageAmount: number; hasError?: boolean
}) {
  const [mode, setMode]   = useState<'₪' | '%'>('₪')
  const [focused, setFocused] = useState(false)
  const [raw, setRaw]         = useState('')

  const pct = mortgageAmount > 0 ? (value / mortgageAmount) * 100 : 0

  const displayValue = focused
    ? raw
    : mode === '₪'
      ? formatNumber(Math.round(value))
      : pct.toFixed(2)

  const handleFocus = () => {
    setFocused(true)
    setRaw(mode === '₪' ? String(Math.round(value)) : pct.toFixed(2))
  }

  const handleBlur = () => {
    setFocused(false)
    if (mode === '₪') {
      const n = parseInt(raw.replace(/[^\d]/g, ''), 10)
      onChange(!isNaN(n) && n >= 0 ? n : value)
    } else {
      const p = parseFloat(raw.replace(/[^\d.]/g, ''))
      if (!isNaN(p) && p >= 0 && mortgageAmount > 0) {
        onChange(Math.round(roundMoney(mortgageAmount * p / 100)))
      }
    }
  }

  return (
    <div className="flex items-center gap-[2px]">
      <input
        type="text"
        inputMode="decimal"
        dir="ltr"
        value={displayValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={e => setRaw(e.target.value)}
        className={[I, 'flex-1 min-w-0', hasError ? ERR : ''].join(' ')}
      />
      {/* ₪ / % mode toggle */}
      <button
        type="button"
        onClick={() => setMode(m => m === '₪' ? '%' : '₪')}
        title={mode === '₪' ? 'עבור להזנה באחוזים' : 'עבור להזנה בשקלים'}
        className={[
          'flex-shrink-0 h-[26px] w-[20px] flex items-center justify-center',
          'rounded text-[9px] font-bold leading-none transition-colors select-none',
          mode === '%'
            ? 'bg-kumu-blue/15 dark:bg-kumu-blue/25 text-kumu-blue dark:text-kumu-blue-lighter'
            : 'bg-gray-100 dark:bg-kumu-navy/80 text-kumu-navy-light dark:text-kumu-blue-lighter/70 hover:bg-kumu-blue/10 hover:text-kumu-blue',
        ].join(' ')}
      >
        {mode === '₪' ? '%' : '₪'}
      </button>
    </div>
  )
}

/* ── Grace column — partial or full (validates grace < track months) ─────── */

function GraceCell({ track, forGrace, upd }: {
  track:    LoanTrack
  forGrace: 'partial' | 'full'
  upd:      (p: Partial<LoanTrack>) => void
}) {
  const isActive  = track.graceType === forGrace
  const activates = forGrace as GraceType

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10)
    if (!isNaN(v) && v > 0) {
      upd({ graceType: activates, graceMonths: v })
    } else {
      upd({ graceType: 'none', graceMonths: 0 })
    }
  }

  // Disable grace inputs when a balloon schedule is active
  const isBalloon = track.graceType === 'balloon-partial' || track.graceType === 'balloon-full'
  if (isBalloon) return <div className={NA}>—</div>

  // Validate: grace period must be strictly less than total months
  const graceErr = isActive && track.graceMonths > 0 && track.graceMonths >= track.months

  return (
    <input
      type="number"
      value={isActive && track.graceMonths > 0 ? track.graceMonths : ''}
      placeholder="חודשים"
      min={1}
      max={track.months - 1}
      onChange={handleChange}
      title={`גרייס — תקופה בחודשים (מקסימום ${track.months - 1})`}
      className={[
        I,
        !isActive ? 'placeholder:text-gray-300 dark:placeholder:text-kumu-navy-light/40' : '',
        graceErr ? ERR : '',
      ].join(' ')}
    />
  )
}

/* ── TrackRow ──────────────────────────────────────────────────────────────── */

export interface TrackRowProps {
  track:          LoanTrack
  mixId:          MixId
  index:          number
  mortgageAmount: number
  macro:          MacroForecasts   // available for future anchor display
  trackResult?:   TrackResult
}

export function TrackRow({
  track, mixId, index, mortgageAmount, trackResult,
}: TrackRowProps) {
  const updateTrack   = useMixStore(s => s.updateTrack)
  const removeTrack   = useMixStore(s => s.removeTrack)
  const addPrepayment = useMixStore(s => s.addPrepayment)
  const upd = (partial: Partial<LoanTrack>) => updateTrack(mixId, track.id, partial)

  /* ── Validation ── */
  const amtErr  = validateTrackAmount(track.amount).status   === 'error'
  const monErr  = validateTrackMonths(track.months).status   === 'error'
  const rateErr = validateAnnualRate(track.annualRate).status === 'error'
  const hasErr  = amtErr || monErr || rateErr

  const isPeriodType    = PERIOD_TYPES.includes(track.type)
  const scheduleDisplay = getScheduleDisplay(track)

  const handleTypeChange = (type: TrackType) => {
    const patch: Partial<LoanTrack> = { type }
    if (!PERIOD_TYPES.includes(type)) patch.rateChangePeriod = undefined
    else if (!track.rateChangePeriod) patch.rateChangePeriod = 60
    upd(patch)
  }

  const handleScheduleChange = (val: ScheduleDisplay) => {
    switch (val) {
      case 'spitzer':
        upd({ schedule: 'spitzer',        graceType: 'none',            graceMonths: 0             })
        break
      case 'equalPrincipal':
        upd({ schedule: 'equalPrincipal', graceType: 'none',            graceMonths: 0             })
        break
      case 'balloon-partial':
        upd({ schedule: 'spitzer',        graceType: 'balloon-partial', graceMonths: track.months  })
        break
      case 'balloon-full':
        upd({ schedule: 'spitzer',        graceType: 'balloon-full',    graceMonths: track.months  })
        break
    }
  }

  /* ── Computed outputs ── */
  const monthlyPmt = trackResult?.rows[0]?.totalPayment ?? null
  const perShekel  = trackResult && track.amount > 0
    ? trackResult.totalPayment / track.amount
    : null

  /* ── Allocation % (read-only display) ── */
  const allocPct = mortgageAmount > 0
    ? ((track.amount / mortgageAmount) * 100).toFixed(1) + '%'
    : '—'

  /* ── Row stripe ── */
  const rowCls = [
    'border-t border-gray-100 dark:border-kumu-navy-light/40',
    'hover:bg-kumu-blue/[.03] dark:hover:bg-kumu-blue/[.06] transition-colors',
    index % 2 === 0 ? 'bg-gray-50/40 dark:bg-white/[.02]' : '',
  ].join(' ')

  return (
    <tr className={rowCls}>

      {/* 1 ── מספר */}
      <td className={`${TD} text-center w-7`}>
        <span className={[
          'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold',
          hasErr ? 'bg-kumu-error/15 text-kumu-error' : 'bg-kumu-blue/10 text-kumu-blue',
        ].join(' ')}>
          {index}
        </span>
      </td>

      {/* 2 ── מסלול */}
      <td className={`${TD} w-[84px]`}>
        <select value={track.type} onChange={e => handleTypeChange(e.target.value as TrackType)} className={S}>
          {TRACK_TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </td>

      {/* 3 ── לוח סילוקין (כולל בלון) */}
      <td className={`${TD} w-[90px]`}>
        <select
          value={scheduleDisplay}
          onChange={e => handleScheduleChange(e.target.value as ScheduleDisplay)}
          className={S}
        >
          <option value="spitzer">שפיצר</option>
          <option value="equalPrincipal">קרן שווה</option>
          <option value="balloon-partial">בלון חלקי</option>
          <option value="balloon-full">בלון מלא</option>
        </select>
      </td>

      {/* 4 ── % מהמשכנתא (read-only) */}
      <td className={`${TD} w-[46px]`}>
        <div className={RO + ' text-kumu-navy-light dark:text-kumu-blue-lighter/80 font-normal text-[10px]'}>
          {allocPct}
        </div>
      </td>

      {/* 5 ── סכום ₪ / % — dual-mode input with toggle */}
      <td className={`${TD} w-[110px]`}>
        <AmountCell
          value={track.amount}
          onChange={v => upd({ amount: v })}
          mortgageAmount={mortgageAmount}
          hasError={amtErr}
        />
      </td>

      {/* 6 ── חודשים — hard-capped at MAX_LOAN_MONTHS */}
      <td className={`${TD} w-[52px]`}>
        <input
          type="number"
          value={track.months}
          min={48}
          max={MAX_LOAN_MONTHS}
          step={12}
          onChange={e => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v)) upd({ months: Math.min(MAX_LOAN_MONTHS, Math.max(48, v)) })
          }}
          className={[I, monErr ? ERR : ''].join(' ')}
        />
      </td>

      {/* 7 ── ריבית % */}
      <td className={`${TD} w-[56px]`}>
        <input
          type="number" value={track.annualRate} min={0} max={30} step={0.05} dir="ltr"
          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) upd({ annualRate: v }) }}
          className={[I, rateErr ? ERR : ''].join(' ')}
        />
      </td>

      {/* 8 ── תדירות עדכון ריבית (מסלולים משתנים בלבד) */}
      <td className={`${TD} w-[78px]`}>
        {isPeriodType ? (
          <select
            value={track.rateChangePeriod ?? 60}
            onChange={e => upd({ rateChangePeriod: Number(e.target.value) as RateChangePeriod })}
            className={S}
          >
            {PERIOD_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <div className={NA}>—</div>
        )}
      </td>

      {/* 9 ── גרייס חלקי (חודשים, עם ולידציה) */}
      <td className={`${TD} w-[60px]`}>
        <GraceCell track={track} forGrace="partial" upd={upd} />
      </td>

      {/* 10 ── גרייס מלא (חודשים, עם ולידציה) */}
      <td className={`${TD} w-[56px]`}>
        <GraceCell track={track} forGrace="full" upd={upd} />
      </td>

      {/* 11 ── תשלום חודשי (חישוב חי, חודש 1) */}
      <td className={`${TD} w-[86px]`}>
        {monthlyPmt !== null
          ? <div className={RO}>{formatCurrencyWhole(monthlyPmt)}</div>
          : <div className={NA}>—</div>
        }
      </td>

      {/* 12 ── עלות לשקל (סה"כ / קרן) */}
      <td className={`${TD} w-[58px]`}>
        {perShekel !== null
          ? <div className={[RO, 'text-kumu-blue dark:text-kumu-blue-lighter font-semibold'].join(' ')}>
              {perShekel.toFixed(3)}
            </div>
          : <div className={NA}>—</div>
        }
      </td>

      {/* 13 ── פירעון מוקדם — מוסיף ישירות ל-Store עם ברירת מחדל */}
      <td className={`${TD} w-7 text-center`}>
        <button
          type="button"
          title="הוסף פירעון מוקדם למסלול זה"
          onClick={() => addPrepayment(mixId, {
            month:   12,
            amount:  50_000,
            trackId: track.id,
            mode:    'shortenTerm',
          })}
          className="p-1 rounded text-kumu-navy-light dark:text-kumu-blue-lighter/50 hover:text-kumu-blue hover:bg-kumu-blue/10 transition-colors"
        >
          <Banknote size={12} />
        </button>
      </td>

      {/* 14 ── מחיקה */}
      <td className={`${TD} w-7 text-center`}>
        <button
          type="button"
          title="מחק מסלול"
          onClick={() => removeTrack(mixId, track.id)}
          className="p-1 rounded text-kumu-navy-light dark:text-kumu-blue-lighter/50 hover:text-kumu-error hover:bg-kumu-error/10 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </td>

    </tr>
  )
}
