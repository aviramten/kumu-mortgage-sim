import { useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { useMix } from '@/store/useMixStore'
import { calculateMix } from '@/engine/calculateMix'
import { formatCurrencyWhole, formatNumber } from '@/utils/format'
import type { MixId } from '@/types/mix'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface KpiCardProps {
  label:   string
  value:   string
  tooltip: string
  accent?: 'default' | 'highlight'
}

// ---------------------------------------------------------------------------
// Tooltip helper — hover card
// ---------------------------------------------------------------------------
function TooltipHover({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="text-kumu-navy-light dark:text-kumu-blue-lighter hover:text-kumu-blue dark:hover:text-kumu-blue-lighter transition-colors"
        aria-label="מידע נוסף"
      >
        <Info size={12} />
      </button>

      {visible && (
        <div
          className={[
            'absolute z-20 bottom-full mb-1.5 right-0 w-56',
            'bg-white dark:bg-kumu-surface-dark',
            'border border-gray-100 dark:border-kumu-navy-light',
            'rounded-xl shadow-lg p-2.5',
            'text-[11px] leading-relaxed text-kumu-navy dark:text-kumu-blue-lighter',
          ].join(' ')}
        >
          {text}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single KPI card
// ---------------------------------------------------------------------------
function KpiCard({ label, value, tooltip, accent = 'default' }: KpiCardProps) {
  return (
    <div
      className={[
        'flex flex-col gap-1.5 rounded-xl border p-3',
        accent === 'highlight'
          ? 'border-kumu-blue/20 dark:border-kumu-blue/30 bg-kumu-blue/5 dark:bg-kumu-blue/10'
          : 'border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark',
      ].join(' ')}
    >
      {/* Label row */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter truncate">
          {label}
        </span>
        <TooltipHover text={tooltip} />
      </div>

      {/* Value */}
      <p
        className={[
          'text-lg font-semibold tabular-nums',
          accent === 'highlight'
            ? 'text-kumu-blue'
            : 'text-kumu-navy dark:text-white',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
      <p className="text-sm font-medium text-kumu-navy-light dark:text-kumu-blue-lighter">
        אין מסלולים לחישוב
      </p>
      <p className="text-xs text-kumu-navy-light dark:text-kumu-blue-lighter/70">
        הוסף מסלול אחד או יותר כדי לראות את מדדי המפתח
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPIDashboard — public component
// ---------------------------------------------------------------------------
interface KPIDashboardProps {
  mixId: MixId
}

export function KPIDashboard({ mixId }: KPIDashboardProps) {
  const mix = useMix(mixId)

  // useMemo — deps: tracks, macroForecasts, prepayments (PRD §4.0)
  const result = useMemo(
    () => calculateMix(mix.tracks, mix.macroForecasts, mix.prepayments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mix.tracks, mix.macroForecasts, mix.prepayments],
  )

  const hasCalculableTracks = result.trackResults.length > 0

  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue">
          מדדי מפתח
        </h2>
        {hasCalculableTracks && (
          <span className="text-[11px] text-kumu-navy-light dark:text-kumu-blue-lighter">
            {result.trackResults.length} מסלולים מחושבים
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3">
        {!hasCalculableTracks ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-2.5">

            <KpiCard
              label="החזר ראשון"
              value={formatCurrencyWhole(result.kpis.firstPayment)}
              tooltip="סכום התשלומים לבנק בחודש הראשון של המשכנתא — ריבית ועיקרון מכל המסלולים."
              accent="highlight"
            />

            <KpiCard
              label="החזר מקסימלי"
              value={formatCurrencyWhole(result.kpis.maxPayment)}
              tooltip="התשלום החודשי הגבוה ביותר לאורך כל חיי המשכנתא, לאחר שהמדד מצטבר."
            />

            <KpiCard
              label="סך ריבית"
              value={formatCurrencyWhole(result.kpis.totalInterest)}
              tooltip="סכום כל תשלומי הריבית לאורך חיי המשכנתא — לא כולל הצמדה."
            />

            <KpiCard
              label="סך הצמדה"
              value={formatCurrencyWhole(result.kpis.totalIndexation)}
              tooltip="סכום כל תוספות ההצמדה למדד שנצברו על יתרת הקרן לאורך השנים."
            />

            <KpiCard
              label="עלות כוללת"
              value={formatCurrencyWhole(result.kpis.totalCost)}
              tooltip="סך כל התשלומים לבנק — קרן, ריבית והצמדה — מהחודש הראשון עד האחרון."
              accent="highlight"
            />

            <KpiCard
              label="עלות לכל ₪"
              value={`${formatNumber(result.kpis.costPerShekel)} ₪`}
              tooltip="על כל שקל שלווית, תחזיר לבנק סכום זה בסוף הדרך. פחות = עסקה טובה יותר."
            />

          </div>
        )}
      </div>

    </div>
  )
}
