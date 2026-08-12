/**
 * CostBreakdownBars — two-column layout:
 *   LEFT  (visually in RTL = second DOM child): compact stacked bar chart
 *   RIGHT (visually in RTL = first DOM child):  summary table with exact cost numbers
 */

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useMix } from '@/store/useMixStore'
import { useThemeStore } from '@/store/useThemeStore'
import { calculateMix } from '@/engine/calculateMix'
import {
  KUMU_KPI_COLORS, getChartTooltipStyle, getChartAxisStyle,
  CHART_GRID_COLOR_LIGHT, CHART_GRID_COLOR_DARK,
} from '@/utils/chartTheme'
import { formatCurrencyWhole } from '@/utils/format'
import type { MixId } from '@/types/mix'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MixSummary {
  label:      string
  principal:  number
  interest:   number
  indexation: number
  total:      number
  perShekel:  number
}

interface BarRow {
  name:       string
  principal:  number
  interest:   number
  indexation: number
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
      {[...payload].reverse().map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-[12px]">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span style={{ color: isDark ? '#A5B8FF' : '#6B7280' }}>{layerLabel[p.name] ?? p.name}:</span>
          <span style={{ color: isDark ? '#F4F7FB' : '#1A2456' }}>{formatCurrencyWhole(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Summary table
// ---------------------------------------------------------------------------
const TABLE_ROWS: { key: keyof MixSummary; label: string; color?: string; highlight?: boolean }[] = [
  { key: 'principal',  label: 'קרן',           color: KUMU_KPI_COLORS.principal  },
  { key: 'interest',   label: 'ריבית',          color: KUMU_KPI_COLORS.interest   },
  { key: 'indexation', label: 'הצמדה / שע"ח',  color: KUMU_KPI_COLORS.indexation },
  { key: 'total',      label: 'סה"כ',           highlight: true },
  { key: 'perShekel',  label: 'עלות לשקל',      highlight: true },
]

function formatCell(key: keyof MixSummary, value: number): string {
  if (key === 'perShekel') return value.toFixed(3)
  return formatCurrencyWhole(value)
}

function SummaryTable({ summaries }: { summaries: MixSummary[] }) {
  return (
    <table className="w-full text-right" style={{ fontFamily: 'Heebo, sans-serif' }}>
      <thead>
        <tr>
          <th className="pb-2 text-[11px] font-medium text-kumu-navy-light dark:text-kumu-blue-lighter w-[110px]" />
          {summaries.map((s) => (
            <th
              key={s.label}
              className="pb-2 text-[11px] font-semibold text-kumu-navy dark:text-white text-center"
            >
              {s.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {TABLE_ROWS.map((row) => {
          const isSeparator = row.key === 'total'
          return (
            <tr
              key={row.key}
              className={[
                isSeparator ? 'border-t border-gray-200 dark:border-kumu-navy-light' : '',
                row.highlight ? '' : 'opacity-90',
              ].join(' ')}
            >
              {/* Row label */}
              <td className={[
                'py-1.5 text-[11px]',
                row.highlight
                  ? 'font-semibold text-kumu-navy dark:text-white'
                  : 'text-kumu-navy-light dark:text-kumu-blue-lighter',
              ].join(' ')}>
                <span className="flex items-center gap-1.5">
                  {row.color && (
                    <span
                      className="inline-block w-2 h-2 rounded-sm flex-shrink-0"
                      style={{ background: row.color }}
                    />
                  )}
                  {row.label}
                </span>
              </td>

              {/* Value columns */}
              {summaries.map((s) => {
                const val = s[row.key] as number
                const isPerShekel = row.key === 'perShekel'
                const isTotal     = row.key === 'total'

                return (
                  <td
                    key={s.label}
                    className={[
                      'py-1.5 text-center tabular-nums text-[12px]',
                      isTotal || isPerShekel
                        ? 'font-bold'
                        : 'font-medium',
                      isPerShekel
                        ? 'text-kumu-blue dark:text-kumu-blue-lighter'
                        : isTotal
                          ? 'text-kumu-navy dark:text-white'
                          : 'text-kumu-navy dark:text-kumu-blue-lighter/80',
                    ].join(' ')}
                  >
                    {formatCell(row.key, val)}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------
// Mix label lookup
// ---------------------------------------------------------------------------
const MIX_LABELS: Record<MixId, string> = {
  a: "תמהיל א'",
  b: "תמהיל ב'",
  c: "תמהיל ג'",
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
interface CostBreakdownBarsProps {
  mixId: MixId
}

export function CostBreakdownBars({ mixId }: CostBreakdownBarsProps) {
  const mix    = useMix(mixId)
  const { theme } = useThemeStore()
  const isDark = theme === 'dark'

  const result = useMemo(
    () => calculateMix(mix.tracks, mix.macroForecasts, mix.prepayments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mix.tracks, mix.macroForecasts, mix.prepayments],
  )

  const principal = mix.tracks.reduce((s, t) => s + t.amount, 0)

  const summaries = useMemo<MixSummary[]>(() => [{
    label:      MIX_LABELS[mixId],
    principal,
    interest:   result.kpis.totalInterest,
    indexation: result.kpis.totalIndexation,
    total:      result.kpis.totalCost,
    perShekel:  principal > 0 ? result.kpis.totalCost / principal : 0,
  }], [mixId, principal, result.kpis])

  const barData = useMemo<BarRow[]>(() => summaries.map((s) => ({
    name:       s.label,
    principal:  s.principal,
    interest:   s.interest,
    indexation: s.indexation,
  })), [summaries])

  const axisStyle = getChartAxisStyle(isDark)
  const gridColor = isDark ? CHART_GRID_COLOR_DARK : CHART_GRID_COLOR_LIGHT

  const isEmpty = result.trackResults.length === 0

  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
          הרכב העלות הכוללת
        </h2>
      </div>

      <div className="p-4">
        {isEmpty ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter">
              הגרף יוצג לאחר הוספת מסלולים
            </p>
          </div>
        ) : (
          /* Two-column: summary table (right in RTL) + bar chart (left in RTL) */
          <div className="flex gap-6 items-start">

            {/* ── Summary table — appears RIGHT in RTL (first DOM child) ── */}
            <div className="flex-1 min-w-0">
              <SummaryTable summaries={summaries} />
            </div>

            {/* ── Bar chart — appears LEFT in RTL (second DOM child) ── */}
            <div style={{ width: 200, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={barData}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  barSize={60}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={gridColor}
                    strokeOpacity={0.5}
                    horizontal
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ ...axisStyle, fontSize: 11 }}
                  />

                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ ...axisStyle, fontSize: 9 }}
                    tickFormatter={(v: number) => `${Math.round(v / 1_000)}K`}
                    width={36}
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

                  <Bar dataKey="principal"  stackId="cost" fill={KUMU_KPI_COLORS.principal}  />
                  <Bar dataKey="interest"   stackId="cost" fill={KUMU_KPI_COLORS.interest}   />
                  <Bar dataKey="indexation" stackId="cost" fill={KUMU_KPI_COLORS.indexation} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* Legend below chart */}
              <div className="flex flex-col gap-1 mt-2 pr-1">
                {[
                  { color: KUMU_KPI_COLORS.principal,  label: 'קרן'           },
                  { color: KUMU_KPI_COLORS.interest,   label: 'ריבית'          },
                  { color: KUMU_KPI_COLORS.indexation, label: 'הצמדה / שע"ח'  },
                ].map((item) => (
                  <span
                    key={item.label}
                    className="flex items-center gap-1.5 text-[10px] text-kumu-navy-light dark:text-kumu-blue-lighter"
                    style={{ fontFamily: 'Heebo, sans-serif' }}
                  >
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: item.color }} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
