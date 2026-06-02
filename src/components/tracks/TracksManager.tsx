import { Plus } from 'lucide-react'
import { useMix, useMixStore } from '@/store/useMixStore'
import { formatNumber } from '@/utils/format'
import { BALANCE_OK_THRESHOLD, BALANCE_WARN_THRESHOLD } from '@/utils/constants'
import { TrackRow } from './TrackRow'
import type { LoanTrack } from '@/types/track'
import type { MixId } from '@/types/mix'

// ---------------------------------------------------------------------------
// BalanceIndicator — real-time allocation vs mortgage amount
// ---------------------------------------------------------------------------
interface BalanceIndicatorProps {
  mortgageAmount: number
  tracks:         LoanTrack[]
}

function BalanceIndicator({ mortgageAmount, tracks }: BalanceIndicatorProps) {
  const allocated = tracks.reduce((sum, t) => sum + t.amount, 0)
  const gap       = mortgageAmount - allocated
  const absGap    = Math.abs(gap)

  const tier =
    absGap <= BALANCE_OK_THRESHOLD   ? 'ok'   :
    absGap <= BALANCE_WARN_THRESHOLD ? 'warn' : 'error'

  const colorMap = {
    ok:    'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-kumu-green',
    warn:  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-kumu-yellow',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-kumu-error',
  }

  const label =
    gap === 0
      ? 'כל סכום המשכנתא מוקצה ✓'
      : gap > 0
        ? `נותר להקצאה: ₪${formatNumber(gap)}`
        : `חריגה של ₪${formatNumber(absGap)} מסכום המשכנתא`

  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${colorMap[tier]}`}>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-xs tabular-nums font-medium">
        ₪{formatNumber(allocated)} / ₪{formatNumber(mortgageAmount)}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TracksManager
// ---------------------------------------------------------------------------
interface TracksManagerProps {
  mixId: MixId
}

export function TracksManager({ mixId }: TracksManagerProps) {
  const { tracks, globalInputs } = useMix(mixId)
  const addTrack                 = useMixStore((s) => s.addTrack)

  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
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
            className={[
              'flex items-center gap-1 h-7 px-2.5 rounded-lg',
              'bg-kumu-blue text-white text-xs font-semibold',
              'hover:bg-kumu-blue-light active:scale-95 transition-all duration-100',
            ].join(' ')}
          >
            <Plus size={12} />
            הוסף מסלול
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 p-3">

        {/* Balance indicator */}
        <BalanceIndicator
          mortgageAmount={globalInputs.mortgageAmount}
          tracks={tracks}
        />

        {/* Empty state */}
        {tracks.length === 0 && (
          <p className="text-xs text-center text-kumu-navy-light dark:text-kumu-blue-lighter py-6">
            טרם נוספו מסלולים. לחץ על "הוסף מסלול" כדי להתחיל.
          </p>
        )}

        {/* Tracks table */}
        {tracks.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-kumu-navy-light/40">
            <table
              className="w-full min-w-[520px] border-collapse text-right"
              dir="rtl"
            >
              {/* Column header */}
              <thead>
                <tr className="bg-gray-50 dark:bg-kumu-navy-dark/50">
                  {/* # */}
                  <th className="px-1 py-1.5 w-6" />
                  {/* Type */}
                  <th className="px-1 py-1.5 w-[88px] text-[10px] font-semibold uppercase tracking-wider text-kumu-navy-light dark:text-kumu-blue-lighter text-right">
                    סוג
                  </th>
                  {/* Schedule */}
                  <th className="px-1 py-1.5 w-[76px] text-[10px] font-semibold uppercase tracking-wider text-kumu-navy-light dark:text-kumu-blue-lighter text-right">
                    שיטה
                  </th>
                  {/* Amount */}
                  <th className="px-1 py-1.5 w-[84px] text-[10px] font-semibold uppercase tracking-wider text-kumu-navy-light dark:text-kumu-blue-lighter text-center">
                    סכום ₪
                  </th>
                  {/* Months */}
                  <th className="px-1 py-1.5 w-[52px] text-[10px] font-semibold uppercase tracking-wider text-kumu-navy-light dark:text-kumu-blue-lighter text-center">
                    ח׳
                  </th>
                  {/* Rate */}
                  <th className="px-1 py-1.5 w-[52px] text-[10px] font-semibold uppercase tracking-wider text-kumu-navy-light dark:text-kumu-blue-lighter text-center">
                    ריבית %
                  </th>
                  {/* Grace type */}
                  <th className="px-1 py-1.5 w-[76px] text-[10px] font-semibold uppercase tracking-wider text-kumu-navy-light dark:text-kumu-blue-lighter text-right">
                    גרייס
                  </th>
                  {/* Grace months */}
                  <th className="px-1 py-1.5 w-[44px] text-[10px] font-semibold uppercase tracking-wider text-kumu-navy-light dark:text-kumu-blue-lighter text-center">
                    ח"ג
                  </th>
                  {/* Actions */}
                  <th className="px-1 py-1.5 w-10" />
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
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}
