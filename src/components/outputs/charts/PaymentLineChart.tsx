/**
 * PaymentLineChart — monthly total payment over the full loan life.
 * X-axis: years (1, 2, 3 …).  Y-axis: ₪ in clean 1 K-step ticks.
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
import { formatCurrencyWhole, formatNumber } from '@/utils/format'
import type { MixId } from '@/types/mix'

// ---------------------------------------------------------------------------
// Notable months — prepayments only (rate-change lines removed for clarity)
// ---------------------------------------------------------------------------
function getPrepaymentMonths(prepayments: { month: number }[]): Set<number> {
  return new Set(prepayments.map((p) => p.month))
}

// ---------------------------------------------------------------------------
// Y-axis tick computation — adaptive step so there are 5-8 ticks
// ---------------------------------------------------------------------------
function computeYTicks(values: number[]): { ticks: number[]; domain: [number, number] } {
  if (values.length === 0) return { ticks: [], domain: [0, 10_000] }
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range  = maxVal - minVal || 1_000

  // Pick a nice step that yields ~5-8 ticks
  let step = 1_000
  if      (range > 80_000) step = 20_000
  else if (range > 40_000) step = 10_000
  else if (range > 20_000) step =  5_000
  else if (range > 10_000) step =  2_000

  // Never start below ₪1,000 — avoids ticks at 0 / 500 etc.
  const lo = Math.max(1_000, Math.floor(minVal / step) * step)
  const hi = Math.ceil(maxVal  / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi; v += step) ticks.push(v)
  return { ticks, domain: [lo, hi] }
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

  const prepaymentMonths = useMemo(
    () => getPrepaymentMonths(mix.prepayments),
    [mix.prepayments],
  )

  // ── X-axis: one tick per year (every 12 months) ──
  const xTicks = useMemo(() => {
    if (chartData.length === 0) return []
    const maxMonth = chartData[chartData.length - 1]?.month ?? 0
    const ticks: number[] = []
    for (let m = 12; m <= maxMonth; m += 12) ticks.push(m)
    return ticks
  }, [chartData])

  // ── Y-axis: adaptive 1 K-step ticks ──
  const { ticks: yTicks, domain: yDomain } = useMemo(
    () => computeYTicks(chartData.map(d => d.payment)),
    [chartData],
  )

  const axisStyle = getChartAxisStyle(isDark)
  const gridColor = isDark ? CHART_GRID_COLOR_DARK : CHART_GRID_COLOR_LIGHT

  const isEmpty = chartData.length === 0

  // Shared tick style — Heebo, clean, no bold
  const tickStyle = {
    fontFamily: 'Heebo, sans-serif',
    fontSize:   10,
    fill:       axisStyle.fill,
    fontWeight: 400,
  }

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
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 20, left: 8, bottom: 20 }}>
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

              {/* X-axis — year numbers, with a separating border line */}
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

              {/* Y-axis — ₪ values in clean K-steps, with a separating border line */}
              <YAxis
                ticks={yTicks}
                domain={yDomain}
                tickLine={false}
                axisLine={{ stroke: gridColor, strokeWidth: 1.5, strokeOpacity: 0.9 }}
                tick={{ ...tickStyle, dx: -4 }}
                tickFormatter={(v: number) => `₪${formatNumber(v)}`}
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


