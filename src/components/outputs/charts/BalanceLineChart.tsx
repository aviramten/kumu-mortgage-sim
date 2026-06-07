/**
 * BalanceLineChart — outstanding principal balance over the full loan life.
 *
 * Plots the SUM of closingBalance across all tracks at each month.
 * The line descends from the total principal to 0, so any prepayments
 * appear as a steeper drop.
 */

import { useMemo } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useMix } from '@/store/useMixStore'
import { useThemeStore } from '@/store/useThemeStore'
import { calculateMix } from '@/engine/calculateMix'
import {
  getChartTooltipStyle, getChartAxisStyle,
  CHART_GRID_COLOR_LIGHT, CHART_GRID_COLOR_DARK,
} from '@/utils/chartTheme'
import { formatNumber } from '@/utils/format'
import type { MixId } from '@/types/mix'

// ---------------------------------------------------------------------------
// Y-axis tick formatter — ₪1.2M / ₪500K / ₪80K
// ---------------------------------------------------------------------------
function formatBalanceTick(v: number): string {
  if (v >= 1_000_000) return `₪${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `₪${Math.round(v / 1_000)}K`
  return `₪${v}`
}

// ---------------------------------------------------------------------------
// Y-axis ticks for large ₪ balance values
// ---------------------------------------------------------------------------
function computeBalanceTicks(maxVal: number): { ticks: number[]; domain: [number, number] } {
  if (maxVal <= 0) return { ticks: [0], domain: [0, 100_000] }

  let step = 50_000
  if      (maxVal > 2_000_000) step = 500_000
  else if (maxVal > 1_000_000) step = 200_000
  else if (maxVal >   500_000) step = 100_000
  else if (maxVal >   200_000) step =  50_000
  else if (maxVal >   100_000) step =  20_000
  else                         step =  10_000

  const hi = Math.ceil(maxVal / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= hi; v += step) ticks.push(v)
  return { ticks, domain: [0, hi] }
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
        חודש {month} · שנה {year}
      </p>
      <p className="text-[12px]" style={{ color: isDark ? '#A5B8FF' : '#6B7280' }}>
        יתרת חוב: ₪{formatNumber(Math.round(payload[0].value ?? 0))}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
interface BalanceLineChartProps {
  mixId: MixId
}

export function BalanceLineChart({ mixId }: BalanceLineChartProps) {
  const mix    = useMix(mixId)
  const { theme } = useThemeStore()
  const isDark = theme === 'dark'

  const result = useMemo(
    () => calculateMix(mix.tracks, mix.macroForecasts, mix.prepayments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mix.tracks, mix.macroForecasts, mix.prepayments],
  )

  // Sum closingBalance across all tracks per month
  const chartData = useMemo(() => {
    const map = new Map<number, number>()
    for (const tr of result.trackResults) {
      for (const row of tr.rows) {
        map.set(row.month, (map.get(row.month) ?? 0) + row.closingBalance)
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([month, balance]) => ({ month, balance: Math.max(0, balance) }))
  }, [result.trackResults])

  const xTicks = useMemo(() => {
    if (chartData.length === 0) return []
    const maxMonth = chartData[chartData.length - 1]?.month ?? 0
    const ticks: number[] = []
    for (let m = 12; m <= maxMonth; m += 12) ticks.push(m)
    return ticks
  }, [chartData])

  const maxBalance = useMemo(
    () => chartData.length > 0 ? Math.max(...chartData.map(d => d.balance)) : 0,
    [chartData],
  )

  const { ticks: yTicks, domain: yDomain } = useMemo(
    () => computeBalanceTicks(maxBalance),
    [maxBalance],
  )

  const axisStyle = getChartAxisStyle(isDark)
  const gridColor = isDark ? CHART_GRID_COLOR_DARK : CHART_GRID_COLOR_LIGHT
  const isEmpty   = chartData.length === 0

  const tickStyle = {
    fontFamily: 'Heebo, sans-serif',
    fontSize:   10,
    fill:       axisStyle.fill,
    fontWeight: 400,
  }

  // Coral colour for balance (distinct from the blue payment chart)
  const COLOR = '#E87A5D'

  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-kumu-coral dark:text-kumu-coral">
          יתרת החוב לאורך הזמן
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
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 20, left: 8, bottom: 20 }}>
              <defs>
                <linearGradient id={`balGrad-${mixId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor={COLOR} stopOpacity={0.10} />
                  <stop offset="90%" stopColor={COLOR} stopOpacity={0.00} />
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
                ticks={xTicks}
                tickLine={false}
                axisLine={{ stroke: gridColor, strokeWidth: 1.5, strokeOpacity: 0.9 }}
                tick={{ ...tickStyle, dy: 6 }}
                tickFormatter={(m: number) => String(Math.ceil(m / 12))}
                padding={{ left: 24, right: 16 }}
                label={{
                  value: 'שנה',
                  position: 'insideBottomLeft',
                  offset: -4,
                  style: { fontFamily: 'Heebo, sans-serif', fontSize: 10, fill: axisStyle.fill },
                }}
              />

              <YAxis
                ticks={yTicks}
                domain={yDomain}
                tickLine={false}
                axisLine={{ stroke: gridColor, strokeWidth: 1.5, strokeOpacity: 0.9 }}
                tick={{ ...tickStyle, dx: -4 }}
                tickFormatter={formatBalanceTick}
                width={76}
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

              {/* Area fill */}
              <Area
                type="monotone"
                dataKey="balance"
                stroke="none"
                fill={`url(#balGrad-${mixId})`}
                isAnimationActive={false}
              />

              {/* Main descending line */}
              <Line
                type="monotone"
                dataKey="balance"
                stroke={COLOR}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: COLOR, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
