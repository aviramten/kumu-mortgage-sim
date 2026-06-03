/**
 * PaymentLineChart — monthly total payment over the full loan life.
 * Includes vertical reference lines for rate-change stations and prepayments.
 */

import { useMemo } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { useMix } from '@/store/useMixStore'
import { useThemeStore } from '@/store/useThemeStore'
import { calculateMix } from '@/engine/calculateMix'
import {
  getChartTooltipStyle, getChartAxisStyle,
  CHART_GRID_COLOR_LIGHT, CHART_GRID_COLOR_DARK,
} from '@/utils/chartTheme'
import { formatCurrencyWhole } from '@/utils/format'
import type { MixId } from '@/types/mix'
import type { LoanTrack } from '@/types/track'

// ---------------------------------------------------------------------------
// Helpers — derive notable months
// ---------------------------------------------------------------------------
function getRateChangePeriod(track: LoanTrack): number | null {
  switch (track.type) {
    case 'prime':
    case 'variable-makam':
    case 'usd':
    case 'eur':
      return 12
    case 'variable-linked':
    case 'variable-unlinked':
      return track.rateChangePeriod ?? 60
    default:
      return null
  }
}

interface NotableMonths {
  rateChanges: Set<number>
  prepaymentMonths: Set<number>
}

function getNotableMonths(
  tracks: LoanTrack[],
  prepayments: { month: number }[],
): NotableMonths {
  const rateChanges = new Set<number>()
  for (const t of tracks) {
    const period = getRateChangePeriod(t)
    if (period) {
      for (let m = period + 1; m <= t.months; m += period) {
        rateChanges.add(m)
      }
    }
  }
  const prepaymentMonths = new Set(prepayments.map((p) => p.month))
  return { rateChanges, prepaymentMonths }
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------
function CustomTooltip({
  active, payload, label, isDark,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: number
  isDark: boolean
}) {
  if (!active || !payload?.length) return null
  const month = label ?? 0
  const year  = Math.ceil(month / 12)
  return (
    <div style={getChartTooltipStyle(isDark)}>
      <p className="font-medium text-[13px]" style={{ color: isDark ? '#F4F7FB' : '#1A2456' }}>
        חודש {month} (שנה {year})
      </p>
      <p className="text-[12px]" style={{ color: isDark ? '#A5B8FF' : '#6B7280' }}>
        החזר: {formatCurrencyWhole(payload[0].value ?? 0)}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
interface PaymentLineChartProps {
  mixId: MixId
}

export function PaymentLineChart({ mixId }: PaymentLineChartProps) {
  const mix    = useMix(mixId)
  const { theme } = useThemeStore()
  const isDark = theme === 'dark'

  const result = useMemo(
    () => calculateMix(mix.tracks, mix.macroForecasts, mix.prepayments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mix.tracks, mix.macroForecasts, mix.prepayments],
  )

  // Aggregate monthly totals across all tracks
  const chartData = useMemo(() => {
    const map = new Map<number, number>()
    for (const tr of result.trackResults) {
      for (const row of tr.rows) {
        map.set(row.month, (map.get(row.month) ?? 0) + row.totalPayment)
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([month, payment]) => ({ month, payment }))
  }, [result.trackResults])

  const { prepaymentMonths } = useMemo(
    () => getNotableMonths(mix.tracks, mix.prepayments),
    [mix.tracks, mix.prepayments],
  )

  const axisStyle = getChartAxisStyle(isDark)
  const gridColor = isDark ? CHART_GRID_COLOR_DARK : CHART_GRID_COLOR_LIGHT

  const isEmpty = chartData.length === 0

  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
          התפתחות ההחזר החודשי
        </h2>
      </div>

      <div className="p-3">
        {isEmpty ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter">
              הגרף יוצג לאחר הוספת מסלולים
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`lineGrad-${mixId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#3B5BDB" stopOpacity={0.08} />
                  <stop offset="90%" stopColor="#3B5BDB" stopOpacity={0.00} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="4 4"
                stroke={gridColor}
                strokeOpacity={0.5}
                vertical={false}
              />

              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ ...axisStyle, fontSize: 10 }}
                tickFormatter={(m: number) => `${Math.ceil(m / 12)}ש'`}
                interval={Math.floor(chartData.length / 8)}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ ...axisStyle, fontSize: 10 }}
                tickFormatter={(v: number) => `₪${Math.round(v / 1000)}K`}
                width={46}
              />

              <Tooltip
                content={(props) => (
                  <CustomTooltip
                    active={props.active}
                    payload={props.payload as unknown as { value: number }[]}
                    label={props.label as number}
                    isDark={isDark}
                  />
                )}
              />

              {/* Prepayment reference lines — subtle, no label */}
              {Array.from(prepaymentMonths).map((m) => (
                <ReferenceLine
                  key={`pp-${m}`}
                  x={m}
                  stroke="#5BB572"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  strokeOpacity={0.6}
                />
              ))}

              {/* Area fill */}
              <Area
                type="monotone"
                dataKey="payment"
                stroke="none"
                fill={`url(#lineGrad-${mixId})`}
                isAnimationActive={false}
              />

              {/* Main line */}
              <Line
                type="monotone"
                dataKey="payment"
                stroke="#3B5BDB"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#3B5BDB', strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
