import { useState } from 'react'
import { Trash2, Banknote } from 'lucide-react'
import { useMixStore } from '@/store/useMixStore'
import { validateTrackAmount, validateTrackMonths, validateAnnualRate } from '@/utils/validation'
import { formatNumber, formatCurrencyWhole } from '@/utils/format'
import { DEFAULT_PRIME_RATE } from '@/utils/constants'
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
  { value: 18,  label: "18ח'" },
  { value: 24,  label: "24ח'" },
  { value: 36,  label: '3ש'   },
  { value: 60,  label: '5ש'   },
  { value: 84,  label: '7ש'   },
  { value: 120, label: '10ש'  },
]

/** Types where interest = anchor benchmark + bank spread */
const ANCHOR_TYPES: TrackType[] = ['prime', 'variable-makam', 'usd', 'eur']
/** Types that have a periodic rate-change selector */
const PERIOD_TYPES: TrackType[] = ['variable-linked', 'variable-unlinked']

/** Return the current benchmark anchor rate for a track type (null = N/A) */
function anchorOf(type: TrackType, m: MacroForecasts): number | null {
  switch (type) {
    case 'prime':          return DEFAULT_PRIME_RATE
    case 'variable-makam': return parseFloat((DEFAULT_PRIME_RATE - 1.5).toFixed(2))
    case 'usd':            return m.sofrRate
    case 'eur':            return m.euriborRate
    default:               return null
  }
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

/** Read-only output cell */
const RO = [
  'h-[26px] w-full flex items-center justify-center',
  'text-[11px] text-kumu-navy dark:text-white tabular-nums font-medium select-none',
].join(' ')

/** Disabled / N/A display */
const NA = [
  'h-[26px] w-full flex items-center justify-center',
  'text-[11px] text-gray-300 dark:text-kumu-navy-light select-none',
].join(' ')

const ERR = 'border-kumu-error/60 bg-red-50 dark:bg-red-900/10'
const TD  = 'px-[3px] py-[3px] align-middle'

/* ── Amount input (formatted on blur) ─────────────────────────────────────── */

function AmountCell({ value, onChange, hasError }: {
  value: number; onChange: (n: number) => void; hasError?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw]         = useState('')
  return (
    <input
      type="text" inputMode="numeric" dir="ltr"
      value={focused ? raw : formatNumber(Math.round(value))}
      onFocus={() => { setFocused(true); setRaw(String(Math.round(value))) }}
      onBlur={() => {
        setFocused(false)
        const n = parseInt(raw.replace(/\D/g, ''), 10)
        onChange(!isNaN(n) && n >= 0 ? n : value)
      }}
      onChange={e => setRaw(e.target.value.replace(/\D/g, ''))}
      className={[I, hasError ? ERR : ''].join(' ')}
    />
  )
}

/* ── Grace column cell ─────────────────────────────────────────────────────── */
/**
 * Shows a number input when `forGrace` matches the track's active grace type.
 * Entering > 0 activates that grace; entering 0 / clearing deactivates.
 */
function GraceCell({ track, forGrace, upd }: {
  track: LoanTrack
  forGrace: 'partial' | 'full' | 'balloon'
  upd: (p: Partial<LoanTrack>) => void
}) {
  const activeFor: GraceType[] =
    forGrace === 'partial' ? ['partial']                     :
    forGrace === 'full'    ? ['full']                        :
                             ['balloon-partial', 'balloon-full']

  const isActive  = activeFor.includes(track.graceType)
  const activates: GraceType =
    forGrace === 'partial' ? 'partial' :
    forGrace === 'full'    ? 'full'    : 'balloon-partial'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10)
    if (!isNaN(v) && v > 0) {
      upd({ graceType: activates, graceMonths: v })
    } else {
      upd({ graceType: 'none', graceMonths: 0 })
    }
  }

  return (
    <input
      type="number"
      value={isActive && track.graceMonths > 0 ? track.graceMonths : ''}
      placeholder="—"
      min={0}
      max={track.months - 1}
      onChange={handleChange}
      className={[
        I,
        !isActive ? 'text-gray-300 dark:text-kumu-navy-light placeholder:text-gray-300' : '',
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
  macro:          MacroForecasts
  trackResult?:   TrackResult
}

export function TrackRow({
  track, mixId, index, mortgageAmount, macro, trackResult,
}: TrackRowProps) {
  const updateTrack = useMixStore(s => s.updateTrack)
  const removeTrack = useMixStore(s => s.removeTrack)
  const upd = (partial: Partial<LoanTrack>) => updateTrack(mixId, track.id, partial)

  /* ── Validation ── */
  const amtErr  = validateTrackAmount(track.amount).status   === 'error'
  const monErr  = validateTrackMonths(track.months).status   === 'error'
  const rateErr = validateAnnualRate(track.annualRate).status === 'error'
  const hasErr  = amtErr || monErr || rateErr

  /* ── Anchor / spread logic ── */
  const anchor      = anchorOf(track.type, macro)              // null for fixed types
  const isAnchorType = ANCHOR_TYPES.includes(track.type)
  const spread      = anchor !== null ? +(track.annualRate - anchor).toFixed(4) : null
  const isPeriodType = PERIOD_TYPES.includes(track.type)

  const handleTypeChange = (type: TrackType) => {
    const patch: Partial<LoanTrack> = { type }
    if (!PERIOD_TYPES.includes(type)) patch.rateChangePeriod = undefined
    else if (!track.rateChangePeriod) patch.rateChangePeriod = 60
    upd(patch)
  }

  /* ── Computed outputs ── */
  const monthlyPmt  = trackResult?.rows[0]?.totalPayment ?? null
  const perShekel   = (trackResult && track.amount > 0)
    ? trackResult.totalPayment / track.amount : null

  /* ── Allocation % ── */
  const allocPct = mortgageAmount > 0
    ? ((track.amount / mortgageAmount) * 100).toFixed(1)
    : '—'

  /* ── Row stripe ── */
  const rowCls = [
    'border-t border-gray-100 dark:border-kumu-navy-light/40',
    'hover:bg-kumu-blue/[.035] dark:hover:bg-kumu-blue/[.06] transition-colors',
    index % 2 === 0 ? 'bg-gray-50/50 dark:bg-kumu-navy/10' : '',
  ].join(' ')

  return (
    <tr className={rowCls}>

      {/* 1 ── Index badge */}
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
          {TRACK_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>

      {/* 3 ── לוח סילוקין */}
      <td className={`${TD} w-[64px]`}>
        <select
          value={track.schedule}
          onChange={e => upd({ schedule: e.target.value as LoanTrack['schedule'] })}
          className={S}
        >
          <option value="spitzer">שפיצר</option>
          <option value="equalPrincipal">ק"ש</option>
        </select>
      </td>

      {/* 4 ── % מהמשכנתא */}
      <td className={`${TD} w-[42px]`}>
        <div className={RO + ' text-kumu-navy-light dark:text-kumu-blue-lighter font-normal'}>
          {allocPct}%
        </div>
      </td>

      {/* 5 ── סכום ₪ */}
      <td className={`${TD} w-[88px]`}>
        <AmountCell value={track.amount} onChange={v => upd({ amount: v })} hasError={amtErr} />
      </td>

      {/* 6 ── תקופה */}
      <td className={`${TD} w-[44px]`}>
        <input
          type="number" value={track.months} min={48} max={360} step={12}
          onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) upd({ months: v }) }}
          className={[I, monErr ? ERR : ''].join(' ')}
        />
      </td>

      {/* 7 ── עוגן (anchor — read-only) */}
      <td className={`${TD} w-[50px]`}>
        {anchor !== null
          ? <div className={RO + ' text-kumu-blue/70 dark:text-kumu-blue-lighter/80'}>{anchor}%</div>
          : <div className={NA}>—</div>
        }
      </td>

      {/* 8 ── תוספת (spread — editable for anchor types) */}
      <td className={`${TD} w-[52px]`}>
        {isAnchorType && anchor !== null ? (
          <input
            type="number"
            value={spread ?? 0}
            min={-5} max={10} step={0.05} dir="ltr"
            onChange={e => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v) && anchor !== null) upd({ annualRate: +(anchor + v).toFixed(4) })
            }}
            className={I}
          />
        ) : (
          <div className={NA}>—</div>
        )}
      </td>

      {/* 9 ── ריבית % */}
      <td className={`${TD} w-[52px]`}>
        {isAnchorType ? (
          /* For anchor types, ריבית = anchor + spread (read-only) */
          <div className={[RO, rateErr ? 'text-kumu-error' : ''].join(' ')}>
            {track.annualRate.toFixed(2)}%
          </div>
        ) : (
          /* For fixed/variable types, directly editable */
          <input
            type="number" value={track.annualRate} min={0} max={30} step={0.05} dir="ltr"
            onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) upd({ annualRate: v }) }}
            className={[I, rateErr ? ERR : ''].join(' ')}
          />
        )}
      </td>

      {/* 10 ── תדירות עדכון */}
      <td className={`${TD} w-[62px]`}>
        {isPeriodType ? (
          <select
            value={track.rateChangePeriod ?? 60}
            onChange={e => upd({ rateChangePeriod: Number(e.target.value) as RateChangePeriod })}
            className={S}
          >
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <div className={NA}>—</div>
        )}
      </td>

      {/* 11 ── גרייס חלקי */}
      <td className={`${TD} w-[44px]`}>
        <GraceCell track={track} forGrace="partial" upd={upd} />
      </td>

      {/* 12 ── גרייס מלא */}
      <td className={`${TD} w-[44px]`}>
        <GraceCell track={track} forGrace="full" upd={upd} />
      </td>

      {/* 13 ── מועד לשחרור (balloon) */}
      <td className={`${TD} w-[44px]`}>
        <GraceCell track={track} forGrace="balloon" upd={upd} />
      </td>

      {/* 14 ── שוט"פ (month-1 payment) */}
      <td className={`${TD} w-[76px]`}>
        {monthlyPmt !== null
          ? <div className={RO}>{formatCurrencyWhole(monthlyPmt)}</div>
          : <div className={NA}>—</div>
        }
      </td>

      {/* 15 ── החזר לשקל */}
      <td className={`${TD} w-[52px]`}>
        {perShekel !== null
          ? <div className={RO}>{perShekel.toFixed(3)}</div>
          : <div className={NA}>—</div>
        }
      </td>

      {/* 16 ── פירעון (placeholder — opens future prepayment modal) */}
      <td className={`${TD} w-7 text-center`}>
        <button
          type="button"
          title="הוסף פירעון מוקדם"
          className="p-1 rounded text-kumu-navy-light dark:text-kumu-blue-lighter/60 hover:text-kumu-blue hover:bg-kumu-blue/10 transition-colors"
        >
          <Banknote size={12} />
        </button>
      </td>

      {/* 17 ── מחיקה */}
      <td className={`${TD} w-7 text-center`}>
        <button
          type="button"
          title="מחק מסלול"
          onClick={() => removeTrack(mixId, track.id)}
          className="p-1 rounded text-kumu-navy-light dark:text-kumu-blue-lighter/60 hover:text-kumu-error hover:bg-kumu-error/10 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </td>

    </tr>
  )
}
