import { Plus } from 'lucide-react'
import { useMix, useMixStore } from '@/store/useMixStore'
import { formatNumber } from '@/utils/format'
import { BALANCE_OK_THRESHOLD, BALANCE_WARN_THRESHOLD } from '@/utils/constants'
import { TrackCard } from './TrackCard'
import type { LoanTrack } from '@/types/track'
import type { MixId } from '@/types/mix'

// ---------------------------------------------------------------------------
// BalanceIndicator — shows real-time allocation vs mortgage amount
// ---------------------------------------------------------------------------
interface BalanceIndicatorProps {
  mortgageAmount: number
  tracks:         LoanTrack[]
}

function BalanceIndicator({ mortgageAmount, tracks }: BalanceIndicatorProps) {
  const allocated = tracks.reduce((sum, t) => sum + t.amount, 0)
  const gap       = mortgageAmount - allocated
  const absGap    = Math.abs(gap)

  // Color tiers: green ≤ 100₪ | yellow ≤ 10,000₪ | orange/red > 10,000₪
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
      ? 'כל סכום המשכנתא מוקצה'
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

      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue">
          מסלולי המשכנתא
        </h2>
        <span className="text-[11px] text-kumu-navy-light dark:text-kumu-blue-lighter">
          {tracks.length} {tracks.length === 1 ? 'מסלול' : 'מסלולים'}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-3">

        {/* Balance indicator — always visible */}
        <BalanceIndicator
          mortgageAmount={globalInputs.mortgageAmount}
          tracks={tracks}
        />

        {/* Track list */}
        {tracks.length === 0 ? (
          <p className="text-xs text-center text-kumu-navy-light dark:text-kumu-blue-lighter py-4">
            טרם נוספו מסלולים. לחץ על "הוסף מסלול" כדי להתחיל.
          </p>
        ) : (
          tracks.map((track, idx) => (
            <TrackCard
              key={track.id}
              track={track}
              mixId={mixId}
              index={idx + 1}
            />
          ))
        )}

        {/* Add track button */}
        <button
          type="button"
          onClick={() => addTrack(mixId)}
          className={[
            'flex items-center justify-center gap-2 w-full h-9 rounded-xl border-2 border-dashed',
            'border-kumu-blue/30 dark:border-kumu-blue-lighter/30',
            'text-xs font-medium text-kumu-blue dark:text-kumu-blue-lighter',
            'hover:border-kumu-blue hover:bg-kumu-blue/5 dark:hover:border-kumu-blue-lighter dark:hover:bg-kumu-blue/10',
            'transition-all duration-150',
          ].join(' ')}
        >
          <Plus size={14} />
          הוסף מסלול
        </button>

      </div>
    </div>
  )
}
