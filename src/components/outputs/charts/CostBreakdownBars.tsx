/**
 * CostBreakdownBars — stacked bar chart showing total cost composition.
 * Shows one bar per populated mix (mix A always; mix B if it has tracks).
 */

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList,
} from 'recharts'
import { useMix, useMixStore } from '@/store/useMixStore'
import { useThemeStore } from '@/store/useThemeStore'
import { calculateMix } from '@/engine/calculateMix'
import {
  KUMU_KPI_COLORS, getChartTooltipStyle, getChartAxisStyle,
  CHART_GRID_COLOR_LIGHT, CHART_GRID_COLOR_DARK,
} from '@/utils/chartTheme'
import { formatCurrencyWhole } from '@/utils/format'
import type { MixId } from '@/types/mix'

// ---------------------------------------------------------------------------
// Data builder
// ---------------------------------------------------------------------------
function buildBarData(
  labelA: string, principalA: number, interestA: number, indexationA: number,
  labelB?: string, principalB?: number, interestB?: number, indexationB?: number,
) {
  const rows = [
    {
      name: labelA,
      principal:  principalA,
      interest:   interestA,
      indexation: indexationA,
    },
  ]
  if (labelB !== undefined && principalB !== undefined) {
    rows.push({
      name: labelB,
      principal:  principalB  ?? 0,
      interest:   interestB   ?? 0,
      indexation: indexationB ?? 0,
    })
  }
  return rows
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------
function CustomTooltip({
  active, payload, label, isDark,
}: {
  active?: boolean
  payload?: { name: string; value: number; fill: string }[]
  label?: string
  isDark: boolean
}) {
  if (!active || !payload?.length) return null
  const layerLabel: Record<string, string> = {
    principal:  'קרן',
    interest:   'ריבית',
    indexation: 'הצמדה / שע"ח',
  }
  return (
    <div style={getChartTooltipStyle(isDark)}>
      <p className="font-semibold text-[13px] mb-1" style={{ color: isDark ? '#F4F7FB' : '#1A2456' }}>
        {label}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-[12px]">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: p.fill }}
          />
          <span style={{ color: isDark ? '#A5B8FF' : '#6B7280' }}>
            {layerLabel[p.name] ?? p.name}:
          </span>
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
interface CostBreakdownBarsProps {
  mixId: MixId
}

export function CostBreakdownBars({ mixId: _mixId }: CostBreakdownBarsProps) {
  const mixA   = useMix('a')
  const mixB   = useMix('b')
  const { theme } = useThemeStore()
  const isDark = theme === 'dark'
  // read cloneMixAtoB / clearMixB (not used here, but keeps dep consistent)
  void useMixStore

  const resultA = useMemo(
    () => calculateMix(mixA.tracks, mixA.macroForecasts, mixA.prepayments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mixA.tracks, mixA.macroForecasts, mixA.prepayments],
  )

  const resultB = useMemo(
    () => mixB.tracks.length > 0
      ? calculateMix(mixB.tracks, mixB.macroForecasts, mixB.prepayments)
      : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mixB.tracks, mixB.macroForecasts, mixB.prepayments],
  )

  const principalA = mixA.tracks.reduce((s, t) => s + t.amount, 0)
  const principalB = mixB.tracks.reduce((s, t) => s + t.amount, 0)

  const data = useMemo(() => buildBarData(
    "תמהיל א'", principalA, resultA.kpis.totalInterest, resultA.kpis.totalIndexation,
    resultB ? "תמהיל ב'" : undefined,
    resultB ? principalB            : undefined,
    resultB ? resultB.kpis.totalInterest   : undefined,
    resultB ? resultB.kpis.totalIndexation : undefined,
  ), [principalA, principalB, resultA.kpis, resultB])

  const axisStyle = getChartAxisStyle(isDark)
  const gridColor = isDark ? CHART_GRID_COLOR_DARK : CHART_GRID_COLOR_LIGHT

  const isEmpty = resultA.trackResults.length === 0

  const legendPayload = [
    { value: 'קרן',            type: 'square' as const, color: KUMU_KPI_COLORS.principal },
    { value: 'ריבית',          type: 'square' as const, color: KUMU_KPI_COLORS.interest  },
    { value: 'הצמדה / שע"ח', type: 'square' as const, color: KUMU_KPI_COLORS.indexation },
  ]

  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
          הרכב העלות הכוללת
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
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal vertical={false} />

              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ ...axisStyle, fontSize: 12 }}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ ...axisStyle, fontSize: 10 }}
                tickFormatter={(v: number) => `₪${Math.round(v / 1_000)}K`}
                width={52}
              />

              <Tooltip
                content={(props) => (
                  <CustomTooltip
                    active={props.active}
                    payload={props.payload as unknown as { name: string; value: number; fill: string }[]}
                    label={props.label as string}
                    isDark={isDark}
                  />
                )}
              />

              <Legend
                verticalAlign="top"
                align="right"
                content={() => (
                  <div className="flex gap-3 justify-end pr-1 pb-1">
                    {legendPayload.map((item) => (
                      <span key={item.value} className="flex items-center gap-1" style={{ fontFamily: 'Heebo, sans-serif', fontSize: 11, color: axisStyle.fill }}>
                        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: item.color }} />
                        {item.value}
                      </span>
                    ))}
                  </div>
                )}
              />

              <Bar dataKey="principal" stackId="cost" fill={KUMU_KPI_COLORS.principal} radius={[0, 0, 0, 0]}>
                <LabelList
                  dataKey="principal"
                  position="insideBottom"
                  formatter={(v: unknown) => {
                    const n = typeof v === 'number' ? v : 0
                    return n > 50_000 ? formatCurrencyWhole(n) : ''
                  }}
                  style={{ fontSize: 9, fill: '#fff', fontFamily: 'Heebo, sans-serif' }}
                />
              </Bar>

              <Bar dataKey="interest" stackId="cost" fill={KUMU_KPI_COLORS.interest}>
                <LabelList
                  dataKey="interest"
                  position="center"
                  formatter={(v: unknown) => {
                    const n = typeof v === 'number' ? v : 0
                    return n > 50_000 ? formatCurrencyWhole(n) : ''
                  }}
                  style={{ fontSize: 9, fill: '#fff', fontFamily: 'Heebo, sans-serif' }}
                />
              </Bar>

              <Bar dataKey="indexation" stackId="cost" fill={KUMU_KPI_COLORS.indexation} radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="indexation"
                  position="center"
                  formatter={(v: unknown) => {
                    const n = typeof v === 'number' ? v : 0
                    return n > 50_000 ? formatCurrencyWhole(n) : ''
                  }}
                  style={{ fontSize: 9, fill: '#fff', fontFamily: 'Heebo, sans-serif' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
