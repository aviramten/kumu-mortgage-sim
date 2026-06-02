/**
 * ComparisonChart — dual-line chart showing monthly payment for Mix A vs Mix B.
 * Used exclusively inside ComparisonTab.
 */

import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { useThemeStore } from '@/store/useThemeStore'
import {
  MIX_A_COLOR, MIX_B_COLOR,
  getChartTooltipStyle, getChartAxisStyle,
  CHART_GRID_COLOR_LIGHT, CHART_GRID_COLOR_DARK,
} from '@/utils/chartTheme'
import { formatCurrencyWhole } from '@/utils/format'
import type { MixResult } from '@/types/calculation'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildComparisonData(resultA: MixResult, resultB: MixResult) {
  const mapA = new Map<number, number>()
  const mapB = new Map<number, number>()

  for (const tr of resultA.trackResults) {
    for (const row of tr.rows) {
      mapA.set(row.month, (mapA.get(row.month) ?? 0) + row.totalPayment)
    }
  }
  for (const tr of resultB.trackResults) {
    for (const row of tr.rows) {
      mapB.set(row.month, (mapB.get(row.month) ?? 0) + row.totalPayment)
    }
  }

  const allMonths = new Set([...mapA.keys(), ...mapB.keys()])
  return Array.from(allMonths)
    .sort((a, b) => a - b)
    .map((month) => ({
      month,
      mixA: mapA.get(month) ?? 0,
      mixB: mapB.get(month) ?? 0,
    }))
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------
function CustomTooltip({
  active, payload, label, isDark,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: number
  isDark: boolean
}) {
  if (!active || !payload?.length) return null
  const month = label ?? 0
  return (
    <div style={getChartTooltipStyle(isDark)}>
      <p className="font-semibold text-[12px] mb-1.5" style={{ color: isDark ? '#F4F7FB' : '#1A2456' }}>
        חודש {month}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-[12px]">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span style={{ color: isDark ? '#A5B8FF' : '#6B7280' }}>{p.name}:</span>
          <span style={{ color: isDark ? '#F4F7FB' : '#1A2456' }}>
            {formatCurrencyWhole(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
interface ComparisonChartProps {
  resultA: MixResult
  resultB: MixResult
}

export function ComparisonChart({ resultA, resultB }: ComparisonChartProps) {
  const { theme } = useThemeStore()
  const isDark    = theme === 'dark'

  const chartData = useMemo(
    () => buildComparisonData(resultA, resultB),
    [resultA, resultB],
  )

  const axisStyle = getChartAxisStyle(isDark)
  const gridColor = isDark ? CHART_GRID_COLOR_DARK : CHART_GRID_COLOR_LIGHT

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />

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
          tickFormatter={(v: number) => `₪${Math.round(v / 1_000)}K`}
          width={48}
        />

        <Tooltip
          content={(props) => (
            <CustomTooltip
              active={props.active}
              payload={props.payload as unknown as { name: string; value: number; color: string }[]}
              label={props.label as number}
              isDark={isDark}
            />
          )}
        />

        <Legend
          formatter={(v) => (
            <span style={{ fontFamily: 'Heebo, sans-serif', fontSize: 12, color: axisStyle.fill }}>
              {v}
            </span>
          )}
        />

        <Line
          type="monotone"
          dataKey="mixA"
          name="תמהיל א'"
          stroke={MIX_A_COLOR}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />

        <Line
          type="monotone"
          dataKey="mixB"
          name="תמהיל ב'"
          stroke={MIX_B_COLOR}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
