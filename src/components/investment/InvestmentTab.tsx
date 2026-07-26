/**
 * InvestmentTab — investment calculator.
 *
 * Layout: split panel (RTL)
 *   Right column → inputs
 *   Left  column → KPI cards + Area chart + comparison summary
 */

import { useState, useMemo, useCallback } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { useThemeStore } from '@/store/useThemeStore'
import {
  calculateInvestment,
} from '@/engine/calculateInvestment'
import type { InvestmentInputs } from '@/engine/calculateInvestment'
import {
  MIX_A_COLOR,
  getChartTooltipStyle, getChartAxisStyle,
  CHART_GRID_COLOR_LIGHT, CHART_GRID_COLOR_DARK,
} from '@/utils/chartTheme'
import { formatCurrencyWhole, formatNumber } from '@/utils/format'
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
// Comparison amount input (₪ prefix, blur-committed)
// ---------------------------------------------------------------------------
function ComparisonInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw]         = useState('')

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter">
        סכום להשוואה (חסכון במשכנתא)
      </label>
      <div className="relative flex items-center">
        <span className="absolute right-3 text-xs text-kumu-navy-light dark:text-kumu-blue-lighter pointer-events-none">
          ₪
        </span>
        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          placeholder="0"
          value={focused ? raw : (value === 0 ? '' : formatNumber(value))}
          onFocus={() => { setFocused(true); setRaw(value === 0 ? '' : String(value)) }}
          onBlur={() => {
            setFocused(false)
            const n = parseInt(raw.replace(/\D/g, ''), 10)
            onChange(isNaN(n) ? 0 : n)
          }}
          onChange={(e) => setRaw(e.target.value.replace(/\D/g, ''))}
          className="w-full text-sm rounded-lg border border-gray-200 dark:border-kumu-navy-light bg-transparent text-kumu-navy dark:text-white px-3 pr-7 py-2 outline-none focus:border-kumu-blue transition-colors"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Risk disclaimer modal
// ---------------------------------------------------------------------------
function RiskModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full mx-4 rounded-2xl bg-white dark:bg-kumu-surface-dark border border-gray-100 dark:border-kumu-navy-light shadow-2xl p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-kumu-yellow text-lg">
            ⚠
          </div>
          <div>
            <h3 className="text-sm font-semibold text-kumu-navy dark:text-white mb-1">
              שים לב לפני שממשיכים
            </h3>
            <p className="text-sm text-kumu-navy dark:text-white/90 leading-relaxed">
              חשוב לזכור שהחסכון במשכנתא הינו ברמה גבוהה של ודאות, והתשואה על ההשקעה כרוכה בסיכון בהתאם לאופי ההשקעה.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="self-end px-5 py-2 rounded-xl bg-kumu-blue text-white text-sm font-medium hover:bg-kumu-blue-light transition-colors"
        >
          הבנתי
        </button>
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
  const { theme }  = useThemeStore()
  const isDark     = theme === 'dark'

  const [inputs, setInputs]               = useState<InvestmentInputs>(DEFAULT_INPUTS)
  const [comparisonAmount, setComparison] = useState(0)
  const [showRiskModal, setShowRiskModal] = useState(false)

  const update = useCallback(
    <K extends keyof InvestmentInputs>(key: K, value: InvestmentInputs[K]) =>
      setInputs((prev) => ({ ...prev, [key]: value })),
    [],
  )

  const handleAnnualReturnChange = useCallback((v: number) => {
    update('annualReturn', v)
    if (v > 0) setShowRiskModal(true)
  }, [update])

  // Investment calculation
  const investResult = useMemo(
    () => calculateInvestment(inputs),
    [inputs],
  )

  // Chart data: portfolio growth per year
  const chartData = useMemo(
    () => investResult.yearlyPortfolio.map((p) => ({
      year:      p.year,
      portfolio: Math.round(p.value),
    })),
    [investResult.yearlyPortfolio],
  )

  const axisStyle = getChartAxisStyle(isDark)
  const gridColor = isDark ? CHART_GRID_COLOR_DARK : CHART_GRID_COLOR_LIGHT

  // Comparison summary
  const netDiff = investResult.netProfit - comparisonAmount
  const hasComparison = comparisonAmount > 0
  const CompIcon = netDiff > 0 ? TrendingUp : netDiff < 0 ? TrendingDown : Minus
  const compAccent = netDiff > 0 ? 'text-kumu-green' : netDiff < 0 ? 'text-kumu-coral' : 'text-kumu-blue'

  return (
    <>
    {showRiskModal && <RiskModal onClose={() => setShowRiskModal(false)} />}
    <div className="flex-1 grid grid-cols-[2fr_3fr] gap-4 p-4 min-h-0 overflow-hidden">

      {/* ── Inputs column (RIGHT in RTL) ── */}
      <div className="flex flex-col gap-3 overflow-y-auto">
        <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
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
              onChange={handleAnnualReturnChange}
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

            {/* Reset button */}
            <button
              type="button"
              onClick={() => setInputs(DEFAULT_INPUTS)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-kumu-navy-light text-kumu-navy-light dark:text-kumu-blue-lighter text-xs py-2 hover:bg-gray-50 dark:hover:bg-kumu-navy transition-colors"
            >
              <RefreshCw size={12} />
              אפס לברירת מחדל
            </button>

            {/* Divider */}
            <div className="h-px bg-gray-100 dark:bg-kumu-navy-light" />

            {/* Comparison amount */}
            <ComparisonInput value={comparisonAmount} onChange={setComparison} />
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
                צמיחת תיק ההשקעות לאורך הזמן
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

                  {hasComparison && (
                    <ReferenceLine
                      y={comparisonAmount}
                      stroke="#E87A5D"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      label={{
                        value: `סכום להשוואה: ₪${formatNumber(comparisonAmount)}`,
                        position: 'insideTopRight',
                        fontSize: 10,
                        fill: '#E87A5D',
                        fontFamily: 'Heebo, sans-serif',
                      }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Comparison summary — only when comparisonAmount > 0 */}
        {hasComparison && (
          <div className="rounded-xl border border-kumu-blue/20 dark:border-kumu-blue/30 bg-kumu-blue/5 dark:bg-kumu-blue/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-kumu-blue/10 dark:border-kumu-blue/20 flex items-center gap-2">
              <CompIcon size={15} className={compAccent} />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
                מטריצת ההחלטה
              </h3>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-kumu-navy-light dark:text-kumu-blue-lighter mb-0.5">חסכון במשכנתא</p>
                  <p className="text-sm font-semibold tabular-nums text-kumu-coral">
                    {formatCurrencyWhole(comparisonAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-kumu-navy-light dark:text-kumu-blue-lighter mb-0.5">רווח השקעה נטו</p>
                  <p className="text-sm font-semibold tabular-nums text-kumu-green">
                    {formatCurrencyWhole(Math.max(0, investResult.netProfit))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-kumu-navy-light dark:text-kumu-blue-lighter mb-0.5">פער נטו</p>
                  <p className={`text-sm font-semibold tabular-nums ${compAccent}`}>
                    {netDiff >= 0 ? '+' : ''}{formatCurrencyWhole(netDiff)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
    </>
  )
}
