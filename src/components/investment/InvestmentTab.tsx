/**
 * InvestmentTab — investment calculator comparing portfolio growth vs mortgage cost.
 *
 * Layout: split panel (RTL)
 *   Right column → inputs
 *   Left  column → KPI cards + Area chart + Decision matrix
 */

import { useState, useMemo, useCallback } from 'react'
import { RefreshCw, Link2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useMix } from '@/store/useMixStore'
import { useThemeStore } from '@/store/useThemeStore'
import { calculateMix } from '@/engine/calculateMix'
import {
  calculateInvestment,
  buildDecisionMatrix,
} from '@/engine/calculateInvestment'
import type { InvestmentInputs } from '@/engine/calculateInvestment'
import {
  MIX_A_COLOR, MIX_B_COLOR,
  getChartTooltipStyle, getChartAxisStyle,
  CHART_GRID_COLOR_LIGHT, CHART_GRID_COLOR_DARK,
} from '@/utils/chartTheme'
import { formatCurrencyWhole } from '@/utils/format'
import {
  DEFAULT_EXPECTED_RETURN,
  DEFAULT_CAPITAL_GAINS_TAX,
} from '@/utils/constants'

// ---------------------------------------------------------------------------
// Default investment inputs
// ---------------------------------------------------------------------------
const DEFAULT_INPUTS: InvestmentInputs = {
  initialCapital:  200_000,
  monthlyDeposit:  2_000,
  years:           20,
  annualReturn:    DEFAULT_EXPECTED_RETURN,
  capitalGainsTax: DEFAULT_CAPITAL_GAINS_TAX,
}

// ---------------------------------------------------------------------------
// Labelled number input
// ---------------------------------------------------------------------------
function InputRow({
  label, value, onChange, min, max, step, suffix,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={min}
          max={max}
          step={step ?? 1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-kumu-navy-light bg-transparent text-kumu-navy dark:text-white px-3 py-2 outline-none focus:border-kumu-blue transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix && (
          <span className="text-xs text-kumu-navy-light dark:text-kumu-blue-lighter w-6 text-center shrink-0">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------
function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark p-3 flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
        {label}
      </span>
      <span className="text-base font-bold tabular-nums text-kumu-navy dark:text-white">
        {value}
      </span>
      {sub && (
        <span className="text-[10px] text-kumu-navy-light dark:text-kumu-blue-lighter">
          {sub}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custom chart tooltip
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
  return (
    <div style={getChartTooltipStyle(isDark)}>
      <p className="font-semibold text-[12px] mb-1.5" style={{ color: isDark ? '#F4F7FB' : '#1A2456' }}>
        שנה {label ?? 0}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-[12px]">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span style={{ color: isDark ? '#A5B8FF' : '#6B7280' }}>{p.name}:</span>
          <span style={{ color: isDark ? '#F4F7FB' : '#1A2456' }}>{formatCurrencyWhole(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
export function InvestmentTab() {
  const mixA       = useMix('a')
  const { theme }  = useThemeStore()
  const isDark     = theme === 'dark'

  const [inputs, setInputs] = useState<InvestmentInputs>(DEFAULT_INPUTS)

  const update = useCallback(
    <K extends keyof InvestmentInputs>(key: K, value: InvestmentInputs[K]) =>
      setInputs((prev) => ({ ...prev, [key]: value })),
    [],
  )

  // Adapt to Mix A: use equity as initial capital + loan term as years
  const handleAdaptToMixA = useCallback(() => {
    const maxMonths = mixA.tracks.length > 0
      ? Math.max(...mixA.tracks.map((t) => t.months))
      : 240
    setInputs((prev) => ({
      ...prev,
      initialCapital: mixA.globalInputs.equity,
      years:          Math.round(maxMonths / 12),
    }))
  }, [mixA])

  // Mortgage cumulative cost per year from Mix A
  const mixAResult = useMemo(
    () => calculateMix(mixA.tracks, mixA.macroForecasts, mixA.prepayments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mixA.tracks, mixA.macroForecasts, mixA.prepayments],
  )

  const cumulativeMortgageByYear = useMemo(() => {
    const monthlyMap = new Map<number, number>()
    for (const tr of mixAResult.trackResults) {
      for (const row of tr.rows) {
        monthlyMap.set(row.month, (monthlyMap.get(row.month) ?? 0) + row.totalPayment)
      }
    }
    const sorted = Array.from(monthlyMap.entries()).sort(([a], [b]) => a - b)
    let cumulative = 0
    const result: { year: number; cost: number }[] = []
    for (const [month, payment] of sorted) {
      cumulative += payment
      if (month % 12 === 0) {
        result.push({ year: month / 12, cost: cumulative })
      }
    }
    return result
  }, [mixAResult.trackResults])

  // Investment calculation
  const investResult = useMemo(
    () => calculateInvestment(inputs),
    [inputs],
  )

  // Decision matrix
  const matrix = useMemo(
    () => buildDecisionMatrix(
      mixAResult.kpis.totalInterest,
      mixAResult.kpis.totalIndexation,
      investResult.netProfit,
    ),
    [mixAResult.kpis, investResult.netProfit],
  )

  // Chart data: merge yearly portfolio vs cumulative mortgage
  const chartData = useMemo(() => {
    const mortgageMap = new Map(cumulativeMortgageByYear.map((p) => [p.year, p.cost]))
    const maxYear = Math.max(
      inputs.years,
      cumulativeMortgageByYear.length > 0
        ? cumulativeMortgageByYear[cumulativeMortgageByYear.length - 1].year
        : 0,
    )
    return investResult.yearlyPortfolio
      .filter((p) => p.year <= maxYear)
      .map((p) => ({
        year: p.year,
        portfolio:       Math.round(p.value),
        mortgageCost:    Math.round(mortgageMap.get(p.year) ?? 0),
      }))
  }, [investResult.yearlyPortfolio, cumulativeMortgageByYear, inputs.years])

  const axisStyle = getChartAxisStyle(isDark)
  const gridColor = isDark ? CHART_GRID_COLOR_DARK : CHART_GRID_COLOR_LIGHT

  // Decision matrix icon
  const MatrixIcon = matrix.netDiff > 0 ? TrendingUp : matrix.netDiff < 0 ? TrendingDown : Minus
  const matrixAccent = matrix.netDiff > 0 ? 'text-kumu-green' : matrix.netDiff < 0 ? 'text-kumu-coral' : 'text-kumu-blue'

  return (
    <div className="flex-1 grid grid-cols-[2fr_3fr] gap-4 p-4 min-h-0 overflow-hidden">

      {/* ── Inputs column (RIGHT in RTL) ── */}
      <div className="flex flex-col gap-3 overflow-y-auto">
        <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
              פרמטרי ההשקעה
            </h2>
          </div>

          <div className="p-4 flex flex-col gap-4">
            <InputRow
              label="הון ראשוני (₪)"
              value={inputs.initialCapital}
              onChange={(v) => update('initialCapital', v)}
              min={0}
              step={10_000}
            />
            <InputRow
              label="הפקדה חודשית (₪)"
              value={inputs.monthlyDeposit}
              onChange={(v) => update('monthlyDeposit', v)}
              min={0}
              step={500}
            />
            <InputRow
              label="תקופה (שנים)"
              value={inputs.years}
              onChange={(v) => update('years', Math.max(1, Math.min(40, v)))}
              min={1}
              max={40}
              step={1}
            />
            <InputRow
              label="תשואה שנתית צפויה"
              value={inputs.annualReturn}
              onChange={(v) => update('annualReturn', v)}
              min={0}
              max={30}
              step={0.5}
              suffix="%"
            />
            <InputRow
              label="מס רווחי הון"
              value={inputs.capitalGainsTax}
              onChange={(v) => update('capitalGainsTax', Math.max(0, Math.min(50, v)))}
              min={0}
              max={50}
              step={1}
              suffix="%"
            />

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setInputs(DEFAULT_INPUTS)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-kumu-navy-light text-kumu-navy-light dark:text-kumu-blue-lighter text-xs py-2 hover:bg-gray-50 dark:hover:bg-kumu-navy transition-colors"
              >
                <RefreshCw size={12} />
                אפס לברירת מחדל
              </button>
              <button
                type="button"
                onClick={handleAdaptToMixA}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-kumu-blue/10 text-kumu-blue text-xs py-2 hover:bg-kumu-blue/20 transition-colors"
              >
                <Link2 size={12} />
                התאם לתמהיל א'
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Outputs column (LEFT in RTL) ── */}
      <div className="flex flex-col gap-3 overflow-y-auto">

        {/* 4 KPI cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <KpiCard
            label="שווי ברוטו"
            value={formatCurrencyWhole(investResult.grossValue)}
            sub="לפני מס רווחי הון"
          />
          <KpiCard
            label="שווי נטו"
            value={formatCurrencyWhole(investResult.netValue)}
            sub="לאחר ניכוי מס"
          />
          <KpiCard
            label="סך הפקדות"
            value={formatCurrencyWhole(investResult.totalDeposits)}
            sub="קרן בלבד"
          />
          <KpiCard
            label="רווח נטו"
            value={formatCurrencyWhole(Math.max(0, investResult.netProfit))}
            sub="מעבר לקרן, אחרי מס"
          />
        </div>

        {/* Area chart */}
        {chartData.length > 0 && (
          <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
                תיק השקעות מול עלות משכנתא מצטברת
              </h3>
            </div>
            <div className="p-3">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={MIX_A_COLOR} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={MIX_A_COLOR} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradMortgage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={MIX_B_COLOR} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={MIX_B_COLOR} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />

                  <XAxis
                    dataKey="year"
                    tickLine={false}
                    axisLine={false}
                    tick={{ ...axisStyle, fontSize: 10 }}
                    tickFormatter={(y: number) => `${y}ש'`}
                    interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
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
                        payload={props.payload as unknown as { name: string; value: number; color: string }[]}
                        label={props.label as number}
                        isDark={isDark}
                      />
                    )}
                  />

                  <Legend
                    formatter={(v) => (
                      <span style={{ fontFamily: 'Heebo, sans-serif', fontSize: 11, color: axisStyle.fill }}>
                        {v}
                      </span>
                    )}
                  />

                  <Area
                    type="monotone"
                    dataKey="portfolio"
                    name="ערך תיק (ברוטו)"
                    stroke={MIX_A_COLOR}
                    strokeWidth={2.5}
                    fill="url(#gradPortfolio)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />

                  <Area
                    type="monotone"
                    dataKey="mortgageCost"
                    name="עלות משכנתא מצטברת"
                    stroke={MIX_B_COLOR}
                    strokeWidth={2.5}
                    fill="url(#gradMortgage)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Decision matrix card */}
        <div className="rounded-xl border border-kumu-blue/20 dark:border-kumu-blue/30 bg-kumu-blue/5 dark:bg-kumu-blue/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-kumu-blue/10 dark:border-kumu-blue/20 flex items-center gap-2">
            <MatrixIcon size={15} className={matrixAccent} />
            <h3 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
              מטריצת ההחלטה
            </h3>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {/* Summary numbers */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-kumu-navy-light dark:text-kumu-blue-lighter mb-0.5">עלות משכנתא</p>
                <p className="text-sm font-semibold tabular-nums text-kumu-coral">
                  {formatCurrencyWhole(matrix.mortgageCost)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-kumu-navy-light dark:text-kumu-blue-lighter mb-0.5">רווח השקעה נטו</p>
                <p className="text-sm font-semibold tabular-nums text-kumu-green">
                  {formatCurrencyWhole(matrix.investmentGain)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-kumu-navy-light dark:text-kumu-blue-lighter mb-0.5">פער נטו</p>
                <p className={`text-sm font-semibold tabular-nums ${matrixAccent}`}>
                  {matrix.netDiff >= 0 ? '+' : ''}{formatCurrencyWhole(matrix.netDiff)}
                </p>
              </div>
            </div>
            {/* Recommendation */}
            <p className="text-sm text-kumu-navy dark:text-white leading-relaxed border-t border-kumu-blue/10 dark:border-kumu-blue/20 pt-3">
              {matrix.recommendation}
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
