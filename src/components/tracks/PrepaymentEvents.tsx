import { useMemo, useState } from 'react'
import { Info, Plus, Trash2 } from 'lucide-react'
import { useMix, useMixStore } from '@/store/useMixStore'
import { useToastStore } from '@/store/useToastStore'
import { calculateMix } from '@/engine/calculateMix'
import { formatNumber } from '@/utils/format'
import type { PrepaymentEvent, PrepaymentMode } from '@/types/track'
import type { MixId } from '@/types/mix'
import type { MixResult } from '@/types/calculation'

// ---------------------------------------------------------------------------
// Estimated balance lookup — the track's projected opening balance at the
// event's month, per the mix's current calculation (other prepayments included)
// ---------------------------------------------------------------------------
function getEstimatedBalance(mixResult: MixResult, trackId: string, month: number): number | null {
  const tr = mixResult.trackResults.find((r) => r.trackId === trackId)
  if (!tr || tr.rows.length === 0) return null
  const row = tr.rows.find((r) => r.month === month) ?? tr.rows[tr.rows.length - 1]
  return row.openingBalance
}

// ---------------------------------------------------------------------------
// Prepayment outcome — what actually changes on the track after this event:
//  shortenTerm   → the new effective payoff length (all of the track's
//                  prepayments combined), vs. the originally planned term
//  reducePayment → the new monthly payment starting the month after the event
// ---------------------------------------------------------------------------
function getPrepaymentOutcome(
  mixResult:      MixResult,
  event:          PrepaymentEvent,
  originalMonths: number,
): string | null {
  const tr = mixResult.trackResults.find((r) => r.trackId === event.trackId)
  if (!tr) return null

  if (event.mode === 'shortenTerm') {
    if (tr.effectiveMonths <= 0 || tr.effectiveMonths >= originalMonths) return null
    const years  = Math.floor(tr.effectiveMonths / 12)
    const months = tr.effectiveMonths % 12
    const periodLabel = months > 0 ? `${years} שנים ו-${months} חודשים` : `${years} שנים`
    return `המסלול צפוי להסתיים אחרי ${tr.effectiveMonths} חודשים (${periodLabel}) במקום ${originalMonths} חודשים`
  }

  // reducePayment — the row right after the event month reflects the recalculated PMT
  const nextRow = tr.rows[event.month]
  if (!nextRow) return null
  return `ההחזר החודשי החדש (מהחודש שאחרי הפירעון): ₪${formatNumber(Math.round(nextRow.totalPayment))}`
}

// ---------------------------------------------------------------------------
// Shared input class
// ---------------------------------------------------------------------------
const numInputCls = [
  'w-full h-8 bg-transparent px-3 text-sm dir-ltr',
  'text-kumu-navy dark:text-white outline-none',
  '[appearance:textfield]',
  '[&::-webkit-outer-spin-button]:appearance-none',
  '[&::-webkit-inner-spin-button]:appearance-none',
].join(' ')

// ---------------------------------------------------------------------------
// PrepaymentRow — a single prepayment event
// ---------------------------------------------------------------------------
interface PrepaymentRowProps {
  event:            PrepaymentEvent
  mixId:            MixId
  tracks:           { id: string; label: string }[]
  estimatedBalance: number | null
  outcome:          string | null
}

function PrepaymentRow({ event, mixId, tracks, estimatedBalance, outcome }: PrepaymentRowProps) {
  const updatePrepayment = useMixStore((s) => s.updatePrepayment)
  const removePrepayment = useMixStore((s) => s.removePrepayment)
  const showToast        = useToastStore((s) => s.show)

  const upd = (partial: Partial<PrepaymentEvent>) =>
    updatePrepayment(mixId, event.id, partial)

  const [monthFocused, setMonthFocused] = useState(false)
  const [monthRaw,     setMonthRaw]     = useState('')

  const [amountFocused, setAmountFocused] = useState(false)
  const [amountRaw,     setAmountRaw]     = useState('')

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-gray-50 dark:bg-kumu-navy/30">

      {/* Row 1: Month | Amount */}
      <div className="grid grid-cols-2 gap-2">
        {/* Month */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-kumu-navy dark:text-kumu-blue-lighter">
            חודש
          </span>
          <div className="rounded-xl border border-gray-200 dark:border-kumu-navy-light focus-within:border-kumu-blue focus-within:ring-2 focus-within:ring-kumu-blue/20 transition-all">
            <input
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={monthFocused ? monthRaw : (event.month === 0 ? '' : String(event.month))}
              onFocus={() => { setMonthFocused(true); setMonthRaw(event.month === 0 ? '' : String(event.month)) }}
              onBlur={() => {
                setMonthFocused(false)
                const v = parseInt(monthRaw.replace(/\D/g, ''), 10)
                if (!isNaN(v) && v >= 1) upd({ month: Math.min(360, v) })
              }}
              onChange={(e) => setMonthRaw(e.target.value.replace(/\D/g, ''))}
              className={numInputCls}
            />
          </div>
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-kumu-navy dark:text-kumu-blue-lighter">
            סכום (₪)
          </span>
          <div className="relative rounded-xl border border-gray-200 dark:border-kumu-navy-light focus-within:border-kumu-blue focus-within:ring-2 focus-within:ring-kumu-blue/20 transition-all flex items-center">
            <span className="absolute left-3 text-xs text-kumu-navy-light dark:text-kumu-blue-lighter pointer-events-none select-none">
              ₪
            </span>
            <input
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={amountFocused ? amountRaw : (event.amount === 0 ? '' : String(event.amount))}
              onFocus={() => { setAmountFocused(true); setAmountRaw(event.amount === 0 ? '' : String(event.amount)) }}
              onBlur={() => {
                setAmountFocused(false)
                const v = parseInt(amountRaw.replace(/\D/g, ''), 10)
                if (!isNaN(v) && v > 0) {
                  const clampedBalance = estimatedBalance !== null ? Math.floor(estimatedBalance) : null
                  if (clampedBalance !== null && v > clampedBalance) {
                    upd({ amount: clampedBalance })
                    showToast({
                      message: `הסכום שהוזן (₪${formatNumber(v)}) גבוה מיתרת הקרן המשוערת לחודש זה. הסכום צומצם ל-₪${formatNumber(clampedBalance)}.`,
                      variant: 'yellow',
                    })
                  } else {
                    upd({ amount: v })
                  }
                }
              }}
              onChange={(e) => setAmountRaw(e.target.value.replace(/\D/g, ''))}
              className={[numInputCls, 'pl-7'].join(' ')}
            />
          </div>
        </div>
      </div>

      {/* Estimated balance at this month, for reference */}
      {estimatedBalance !== null && (
        <p className="text-[11px] text-kumu-navy-light dark:text-kumu-blue-lighter">
          יתרת קרן משוערת בחודש {event.month}: ₪{formatNumber(Math.round(estimatedBalance))}
        </p>
      )}

      {/* Outcome of this prepayment — new term or new monthly payment */}
      {outcome !== null && (
        <p className="text-[11px] font-medium text-kumu-green">
          {outcome}
        </p>
      )}

      {/* Row 2: Track selector */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-kumu-navy dark:text-kumu-blue-lighter">
          מסלול
        </span>
        <select
          value={event.trackId}
          onChange={(e) => upd({ trackId: e.target.value })}
          className={[
            'w-full h-8 rounded-xl border border-gray-200 dark:border-kumu-navy-light',
            'bg-white dark:bg-kumu-surface-dark px-3 text-sm',
            'text-kumu-navy dark:text-white outline-none',
            'focus:border-kumu-blue focus:ring-2 focus:ring-kumu-blue/20 transition-all',
          ].join(' ')}
        >
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Row 3: Mode buttons + delete */}
      <div className="flex items-center gap-2">
        {/* Mode toggle */}
        <div className="flex flex-1 rounded-xl border border-gray-200 dark:border-kumu-navy-light overflow-hidden text-xs">
          {(
            [
              { value: 'shortenTerm',    label: 'קיצור תקופה'    },
              { value: 'reducePayment',  label: 'הקטנת תשלום'   },
            ] as { value: PrepaymentMode; label: string }[]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => upd({ mode: opt.value })}
              className={[
                'flex-1 py-1.5 px-2 text-center transition-colors',
                event.mode === opt.value
                  ? 'bg-kumu-blue text-white font-medium'
                  : 'text-kumu-navy-light dark:text-kumu-blue-lighter hover:bg-gray-100 dark:hover:bg-kumu-navy',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={() => removePrepayment(mixId, event.id)}
          title="מחק אירוע"
          className="flex-shrink-0 p-1.5 rounded-lg text-kumu-navy-light dark:text-kumu-blue-lighter hover:text-kumu-error transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

    </div>
  )
}

// ---------------------------------------------------------------------------
// PrepaymentEvents — panel with full list + add button
// ---------------------------------------------------------------------------
interface PrepaymentEventsProps {
  mixId: MixId
}

export function PrepaymentEvents({ mixId }: PrepaymentEventsProps) {
  const { tracks, prepayments, macroForecasts } = useMix(mixId)
  const addPrepayment                           = useMixStore((s) => s.addPrepayment)

  const mixResult = useMemo(
    () => calculateMix(tracks, macroForecasts, prepayments),
    [tracks, macroForecasts, prepayments],
  )

  // Build labelled list for the track selector inside each row
  const trackOptions = tracks.map((t, idx) => {
    const TYPE_SHORT: Record<string, string> = {
      prime: 'פריים', 'fixed-unlinked': 'קל"צ', 'fixed-linked': 'ק"צ',
      'variable-linked': 'מ"צ', 'variable-unlinked': 'מל"צ', eligibility: 'זכאות',
      'variable-makam': 'מק"מ', usd: 'דולר', eur: 'יורו',
    }
    return {
      id:    t.id,
      label: `מסלול ${idx + 1} — ${TYPE_SHORT[t.type] ?? t.type} (₪${formatNumber(t.amount)})`,
    }
  })

  const handleAdd = () => {
    if (tracks.length === 0) return
    addPrepayment(mixId, {
      month:   12,
      amount:  50_000,
      trackId: tracks[0].id,
      mode:    'shortenTerm',
    })
  }

  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">

      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue">
          פירעונות מוקדמים
        </h2>
        <span className="text-[11px] text-kumu-navy-light dark:text-kumu-blue-lighter">
          {prepayments.length} {prepayments.length === 1 ? 'אירוע' : 'אירועים'}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-3">

        {/* Disclaimer */}
        <div className="flex items-start gap-2 rounded-xl bg-kumu-blue/5 dark:bg-kumu-blue/10 px-3 py-2.5">
          <Info size={13} className="flex-shrink-0 mt-0.5 text-kumu-blue dark:text-kumu-blue-lighter" />
          <p className="text-[11px] leading-relaxed text-kumu-navy-light dark:text-kumu-blue-lighter">
            אירועי פירעון חלקי שאתם מתכננים לבצע במהלך תקופת המשכנתא. החישוב אינו כולל עמלות פירעון מוקדם של הבנק.
          </p>
        </div>

        {/* Event list or empty state */}
        {prepayments.length === 0 ? (
          <p className="text-xs text-center text-kumu-navy-light dark:text-kumu-blue-lighter py-3">
            טרם הוגדרו אירועי פירעון מוקדם.
          </p>
        ) : (
          prepayments.map((event) => {
            const track = tracks.find((t) => t.id === event.trackId)
            return (
              <PrepaymentRow
                key={event.id}
                event={event}
                mixId={mixId}
                tracks={trackOptions}
                estimatedBalance={getEstimatedBalance(mixResult, event.trackId, event.month)}
                outcome={track ? getPrepaymentOutcome(mixResult, event, track.months) : null}
              />
            )
          })
        )}

        {/* Add event button */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={tracks.length === 0}
          title={tracks.length === 0 ? 'הוסף מסלול לפני הגדרת אירוע' : undefined}
          className={[
            'flex items-center justify-center gap-2 w-full h-9 rounded-xl border-2 border-dashed',
            'text-xs font-medium transition-all duration-150',
            tracks.length === 0
              ? 'border-gray-200 dark:border-kumu-navy-light text-gray-300 dark:text-kumu-navy-light cursor-not-allowed'
              : 'border-kumu-blue/30 dark:border-kumu-blue-lighter/30 text-kumu-blue dark:text-kumu-blue-lighter hover:border-kumu-blue hover:bg-kumu-blue/5 dark:hover:border-kumu-blue-lighter dark:hover:bg-kumu-blue/10',
          ].join(' ')}
        >
          <Plus size={14} />
          הוסף פירעון מוקדם
        </button>

      </div>
    </div>
  )
}
