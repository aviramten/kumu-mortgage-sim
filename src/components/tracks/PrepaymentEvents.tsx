import { Info, Plus, Trash2 } from 'lucide-react'
import { useMix, useMixStore } from '@/store/useMixStore'
import { formatNumber } from '@/utils/format'
import type { PrepaymentEvent, PrepaymentMode } from '@/types/track'
import type { MixId } from '@/types/mix'

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
  event:  PrepaymentEvent
  mixId:  MixId
  tracks: { id: string; label: string }[]
}

function PrepaymentRow({ event, mixId, tracks }: PrepaymentRowProps) {
  const updatePrepayment = useMixStore((s) => s.updatePrepayment)
  const removePrepayment = useMixStore((s) => s.removePrepayment)

  const upd = (partial: Partial<PrepaymentEvent>) =>
    updatePrepayment(mixId, event.id, partial)

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
              type="number"
              value={event.month}
              min={1}
              max={360}
              step={1}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v) && v >= 1 && v <= 360) upd({ month: v })
              }}
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
              type="number"
              value={event.amount}
              min={1000}
              step={1000}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v) && v > 0) upd({ amount: v })
              }}
              className={[numInputCls, 'pl-7'].join(' ')}
            />
          </div>
        </div>
      </div>

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
  const { tracks, prepayments } = useMix(mixId)
  const addPrepayment           = useMixStore((s) => s.addPrepayment)

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
          prepayments.map((event) => (
            <PrepaymentRow
              key={event.id}
              event={event}
              mixId={mixId}
              tracks={trackOptions}
            />
          ))
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
