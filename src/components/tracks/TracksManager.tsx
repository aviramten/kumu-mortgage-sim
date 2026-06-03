import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useMix, useMixStore } from '@/store/useMixStore'
import { calculateMix } from '@/engine/calculateMix'
import { formatNumber } from '@/utils/format'
import { BALANCE_OK_THRESHOLD, BALANCE_WARN_THRESHOLD } from '@/utils/constants'
import { TrackRow } from './TrackRow'
import type { LoanTrack } from '@/types/track'
import type { MixId } from '@/types/mix'

/* ── Balance indicator ─────────────────────────────────────────────────────── */

function BalanceIndicator({
  mortgageAmount, tracks,
}: { mortgageAmount: number; tracks: LoanTrack[] }) {
  const allocated = tracks.reduce((s, t) => s + t.amount, 0)
  const gap       = mortgageAmount - allocated
  const absGap    = Math.abs(gap)

  // Any overrun (gap < 0) is always a hard error, regardless of amount
  const tier =
    gap < 0                          ? 'error' :
    absGap <= BALANCE_OK_THRESHOLD   ? 'ok'    :
    absGap <= BALANCE_WARN_THRESHOLD ? 'warn'  : 'error'

  const cls = {
    ok:    'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-kumu-green',
    warn:  'bg-amber-50  dark:bg-amber-900/20  border-amber-200  dark:border-amber-700  text-amber-700 dark:text-kumu-yellow',
    error: 'bg-red-50    dark:bg-red-900/20    border-red-200    dark:border-red-800    text-kumu-error',
  }[tier]

  const overrunPct = mortgageAmount > 0
    ? ((allocated / mortgageAmount - 1) * 100).toFixed(1)
    : '0'

  const label =
    gap === 0 ? 'כל סכום המשכנתא מוקצה ✓' :
    gap  > 0  ? `נותר להקצאה: ₪${formatNumber(gap)}` :
                `⚠ חריגה — ${overrunPct}% מעל סכום המשכנתא. יש להקטין מסלול.`

  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs font-medium ${cls}`}>
      <span>{label}</span>
      <span className="tabular-nums">
        ₪{formatNumber(allocated)} / ₪{formatNumber(mortgageAmount)}
      </span>
    </div>
  )
}

/* ── Column header definitions ─────────────────────────────────────────────── */

const HEADERS: { label: string; title?: string; cls?: string }[] = [
  { label: '',                cls: 'w-7' },
  { label: 'מסלול',           cls: 'w-[84px]' },
  { label: 'לוח סילוקין',     cls: 'w-[90px]' },
  { label: '%',               title: 'הזן אחוז — מחשב ₪ אוטומטית',  cls: 'w-[58px] text-center' },
  { label: 'סכום ₪',         title: 'סכום בשקלים',                cls: 'w-[90px] text-center'  },
  { label: 'חודשים',          title: 'תקופה בחודשים',            cls: 'w-[52px] text-center' },
  { label: 'ריבית %',         cls: 'w-[56px] text-center' },
  { label: 'תדירות עדכון',    title: 'תדירות עדכון ריבית',       cls: 'w-[78px] text-center' },
  { label: 'גרייס חלקי',     title: 'גרייס חלקי — מספר חודשים', cls: 'w-[60px] text-center' },
  { label: 'גרייס מלא',      title: 'גרייס מלא — מספר חודשים',  cls: 'w-[56px] text-center' },
  { label: 'תשלום חודשי',    title: 'החזר לאחר גרייס (שורה קטנה = בגרייס)', cls: 'w-[86px] text-center' },
  { label: 'עלות לשקל',      title: 'סה"כ עלות לכל ₪ מוקצה',    cls: 'w-[58px] text-center' },
  { label: '',                cls: 'w-7' },  // פירעון
  { label: '',                cls: 'w-7' },  // מחיקה
]

/* ── TracksManager ─────────────────────────────────────────────────────────── */

interface TracksManagerProps { mixId: MixId }

export function TracksManager({ mixId }: TracksManagerProps) {
  const { tracks, globalInputs, macroForecasts, prepayments } = useMix(mixId)
  const addTrack = useMixStore(s => s.addTrack)

  /* Run the engine so each row can show שוט"פ + ₪/שקל */
  const mixResult = useMemo(
    () => calculateMix(tracks, macroForecasts, prepayments),
    [tracks, macroForecasts, prepayments],
  )

  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">

      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-kumu-navy-light">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue">
          מסלולי המשכנתא
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-kumu-navy-light dark:text-kumu-blue-lighter">
            {tracks.length} {tracks.length === 1 ? 'מסלול' : 'מסלולים'}
          </span>
          <button
            type="button"
            onClick={() => addTrack(mixId)}
            className="flex items-center gap-1 h-7 px-3 rounded-lg bg-kumu-blue text-white text-xs font-semibold hover:bg-kumu-blue-light active:scale-95 transition-all"
          >
            <Plus size={12} />
            הוסף מסלול
          </button>
        </div>
      </div>

      {/* ── Balance indicator ───────────────────────────────────────────────── */}
      <div className="px-3 pt-2.5 pb-1">
        <BalanceIndicator
          mortgageAmount={globalInputs.mortgageAmount}
          tracks={tracks}
        />
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {tracks.length === 0 && (
        <p className="text-xs text-center text-kumu-navy-light dark:text-kumu-blue-lighter py-5">
          לחץ על "הוסף מסלול" כדי להתחיל לבנות את התמהיל.
        </p>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {tracks.length > 0 && (
        <div className="overflow-x-auto px-3 pb-3 pt-1">
          <table
            className="w-full border-collapse text-right"
            style={{ minWidth: 910 }}
            dir="rtl"
          >
            {/* Column headers */}
            <thead>
              <tr className="bg-gray-50 dark:bg-kumu-navy-dark/50">
                {HEADERS.map((h, i) => (
                  <th
                    key={i}
                    title={h.title}
                    className={[
                      'px-[3px] py-1.5',
                      'text-[10px] font-semibold uppercase tracking-wide',
                      'text-kumu-navy-light dark:text-kumu-blue-lighter',
                      h.cls ?? '',
                    ].join(' ')}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Track rows */}
            <tbody>
              {tracks.map((track, idx) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  mixId={mixId}
                  index={idx + 1}
                  mortgageAmount={globalInputs.mortgageAmount}
                  macro={macroForecasts}
                  trackResult={mixResult.trackResults.find(r => r.trackId === track.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
