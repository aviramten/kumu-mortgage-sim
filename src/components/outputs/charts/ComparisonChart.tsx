/**
 * ComparisonChart — line chart showing monthly payment for up to 3 mixes.
 * Used exclusively inside ComparisonTab.
 */

import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { useThemeStore } from '@/store/useThemeStore'
import {
  getChartTooltipStyle, getChartAxisStyle,
  CHART_GRID_COLOR_LIGHT, CHART_GRID_COLOR_DARK,
} from '@/utils/chartTheme'
import { formatCurrencyWhole } from '@/utils/format'
import type { MixResult } from '@/types/calculation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ComparisonEntry {
  result: MixResult
  label:  string
  color:  string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildComparisonData(entries: ComparisonEntry[]) {
  const maps: Map<number, number>[] = entries.map(() => new Map())

  entries.forEach(({ result }, i) => {
    for (const tr of result.trackResults) {
      for (const row of tr.rows) {
        maps[i].set(row.month, (maps[i].get(row.month) ?? 0) + row.totalPayment)
      }
    }
  })

  const allMonths = new Set<number>()
  maps.forEach((m) => m.forEach((_, month) => allMonths.add(month)))

  return Array.from(allMonths)
    .sort((a, b) => a - b)
    .map((month) => {
      const point: Record<string, number> = { month }
      entries.forEach((_, i) => {
        point[`mix${i}`] = maps[i].get(month) ?? 0
      })
      return point
    })
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------
interface TooltipPayloadItem {
  name:  string
  value: number
  color: string
}

function CustomTooltip({
  active, payload, label, isDark,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: number
  isDark: boolean
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={getChartTooltipStyle(isDark)}>
      <p className="font-semibold text-[12px] mb-1.5" style={{ color: isDark ? '#F4F7FB' : '#1A2456' }}>
        חודש {label ?? 0}
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
  entries: ComparisonEntry[]
}

export function ComparisonChart({ entries }: ComparisonChartProps) {
  const { theme } = useThemeStore()
  const isDark    = theme === 'dark'

  const chartData = useMemo(() => buildComparisonData(entries), [entries])

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
              payload={props.payload as unknown as TooltipPayloadItem[]}
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

        {entries.map((entry, i) => (
          <Line
            key={entry.label}
            type="monotone"
            dataKey={`mix${i}`}
            name={entry.label}
            stroke={entry.color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
