/**
 * InvestmentTab — standalone investment growth calculator, with an optional
 * manual comparison against mortgage savings (e.g. figures the user worked
 * out on the mix-comparison page — a higher-payment track that saves
 * interest, extra equity, or a bigger monthly payment).
 *
 * Layout: split panel (RTL)
 *   Right column → inputs (mortgage-savings comparison + investment parameters)
 *   Left  column → outputs (break-even card, KPI row, chart, sensitivity table)
 */

import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useThemeStore }  from '@/store/useThemeStore'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { useNumericField } from '@/hooks/useNumericField'
import {
  calculateInvestment,
  buildSensitivityTable,
} from '@/engine/calculateInvestment'
import type { SensitivityRow } from '@/engine/calculateInvestment'
import {
  MIX_A_COLOR,
  getChartTooltipStyle, getChartAxisStyle,
  CHART_GRID_COLOR_LIGHT, CHART_GRID_COLOR_DARK,
} from '@/utils/chartTheme'
import { formatCurrencyWhole } from '@/utils/format'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SENSITIVITY_RATES = [4, 6, 8, 10]

// ---------------------------------------------------------------------------
// Spitzer savings curve
// Approximates cumulative interest saved using a fixed 5% rate for curve shape.
// ---------------------------------------------------------------------------
function buildSpitzerSavingsCurve(totalSavings: number, years: number): Map<number, number> {
  const result = new Map<number, number>()
  if (totalSavings <= 0 || years <= 0) return result

  const N = years * 12
  const r = 0.05 / 12

  const discountFactor = 1 - Math.pow(1 + r, -N)
  const paymentFactor  = r / discountFactor
  const interestFactor = paymentFactor * N - 1

  if (interestFactor <= 0) return result

  const principal      = totalSavings / interestFactor
  const monthlyPayment = principal * paymentFactor

  let balance            = principal
  let cumulativeInterest = 0

  for (let m = 1; m <= N; m++) {
    const interestPmt   = balance * r
    const principalPmt  = monthlyPayment - interestPmt
    cumulativeInterest += interestPmt
    balance             = Math.max(0, balance - principalPmt)

    if (m % 12 === 0) {
      result.set(m / 12, Math.round(cumulativeInterest))
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InputRow({
  label, value, onChange, min, max, suffix, disabled,
}: {
  label:    string
  value:    number
  onChange: (v: number) => void
  min?:     number
  max?:     number
  suffix?:  string
  disabled?: boolean
}) {
  const field = useNumericField({ value, onChange, format: 'decimal', min, max })

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          disabled={disabled}
          {...field}
          className={[
            'flex-1 text-sm rounded-lg border bg-transparent px-3 py-2 outline-none transition-colors',
            disabled
              ? 'border-gray-100 dark:border-kumu-navy-light/50 text-kumu-navy-light dark:text-kumu-blue-lighter/70 cursor-not-allowed'
              : 'border-gray-200 dark:border-kumu-navy-light text-kumu-navy dark:text-white focus:border-kumu-blue',
          ].join(' ')}
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

function ComparisonInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const field = useNumericField({ value, onChange, maxReasonable: 50_000_000 })

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter">
        חסכון מצטבר במשכנתא (₪)
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
          {...field}
          className="w-full text-sm rounded-lg border border-gray-200 dark:border-kumu-navy-light bg-transparent text-kumu-navy dark:text-white px-3 pr-7 py-2 outline-none focus:border-kumu-blue transition-colors"
        />
      </div>
    </div>
  )
}

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

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark p-3 flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
        {label}
      </span>
      <span className={`text-base font-bold tabular-nums ${accent ?? 'text-kumu-navy dark:text-white'}`}>
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

function SensitivityTable({
  rows,
  isDark,
}: {
  rows:   SensitivityRow[]
  isDark: boolean
}) {
  void isDark
  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
          ניתוח רגישות — תשואות שונות
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-kumu-navy-dark/50 border-b border-gray-100 dark:border-kumu-navy-light">
              <th className="text-right px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter">
                תשואה שנתית
              </th>
              <th className="text-right px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter">
                ערך תיק נטו
              </th>
              <th className="text-right px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter">
                פער מול משכנתא
              </th>
              <th className="text-right px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter">
                מי גובר?
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.rate}
                className={[
                  'border-b border-gray-50 dark:border-kumu-navy/50 last:border-0',
                  row.investmentWins
                    ? 'bg-emerald-50/50 dark:bg-emerald-900/10'
                    : 'bg-red-50/30 dark:bg-red-900/5',
                  i % 2 === 0 ? '' : '',
                ].join(' ')}
              >
                <td className="px-4 py-2.5 tabular-nums font-medium text-kumu-navy dark:text-white">
                  {row.rate}%
                </td>
                <td className="px-4 py-2.5 tabular-nums text-kumu-navy dark:text-white">
                  {formatCurrencyWhole(row.netValue)}
                </td>
                <td className={`px-4 py-2.5 tabular-nums font-medium ${row.investmentWins ? 'text-kumu-green' : 'text-kumu-coral'}`}>
                  {row.diff >= 0 ? '+' : ''}{formatCurrencyWhole(row.diff)}
                </td>
                <td className={`px-4 py-2.5 text-xs font-semibold ${row.investmentWins ? 'text-kumu-green' : 'text-kumu-coral'}`}>
                  {row.investmentWins ? 'השקעה ✓' : 'משכנתא ✓'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function InvestmentTab() {
  const { theme } = useThemeStore()
  const isDark    = theme === 'dark'

  // State — persisted so it survives navigating away and back
  const {
    inputs, manualComparison, comparisonYears,
    updateInput: update, setManualComparison, setComparisonYears, reset,
  } = useInvestmentStore()
  const [showRiskModal, setShowRiskModal] = useState(false)

  const comparisonAmount = manualComparison
  const hasComparison    = comparisonAmount > 0

  const handleAnnualReturnChange = (v: number) => {
    update('annualReturn', v)
    if (v > 0) setShowRiskModal(true)
  }

  // Investment result
  const investResult = useMemo(
    () => calculateInvestment(inputs),
    [inputs],
  )

  // Sensitivity table
  const sensitivityRows = useMemo(
    () => hasComparison ? buildSensitivityTable(inputs, comparisonAmount, SENSITIVITY_RATES) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputs.initialCapital, inputs.monthlyDeposit, inputs.years,
     inputs.capitalGainsTax, comparisonAmount, hasComparison],
  )

  // Chart data — the mortgage-savings curve runs over its own comparison
  // period, independent of the investment horizon (inputs.years).
  const savingsCurve = useMemo(
    () => buildSpitzerSavingsCurve(comparisonAmount, comparisonYears),
    [comparisonAmount, comparisonYears],
  )

  // Spans the longer of the two periods, so neither curve gets silently cut
  // off when the investment horizon and the mortgage-comparison period differ.
  const chartData = useMemo(() => {
    const portfolioByYear = new Map(investResult.yearlyPortfolio.map((p) => [p.year, p.value]))
    const maxYear = Math.max(inputs.years, hasComparison ? comparisonYears : 0)
    const data: { year: number; portfolio: number | null; mortgageSavings: number | null }[] = []
    for (let year = 1; year <= maxYear; year++) {
      const portfolio = portfolioByYear.get(year)
      data.push({
        year,
        portfolio:       portfolio !== undefined ? Math.round(portfolio) : null,
        mortgageSavings: hasComparison ? (savingsCurve.get(year) ?? null) : null,
      })
    }
    return data
  }, [investResult.yearlyPortfolio, inputs.years, savingsCurve, comparisonYears, hasComparison])

  // Comparison summary
  const netDiff   = investResult.netValue - comparisonAmount
  const CompIcon  = netDiff > 0 ? TrendingUp : netDiff < 0 ? TrendingDown : Minus
  const compAccent = netDiff > 0
    ? 'text-kumu-green'
    : netDiff < 0 ? 'text-kumu-coral' : 'text-kumu-blue'

  const axisStyle = getChartAxisStyle(isDark)
  const gridColor = isDark ? CHART_GRID_COLOR_DARK : CHART_GRID_COLOR_LIGHT

  // Recommendation text
  function getRecommendation(): string {
    const ratio = comparisonAmount > 0 ? Math.abs(netDiff) / comparisonAmount : 1
    if (netDiff > 0 && ratio > 0.10) {
      return 'יתרת תיק ההשקעות צפויה לגבור על סך הריביות שתחסכו במשכנתא — בהנחות הנוכחיות, השקעה בשוק ההון עשויה להיות עדיפה. זכרו: חיסכון הריבית ודאי; תשואות שוק ההון — לא.'
    }
    if (netDiff < 0 && ratio > 0.10) {
      return 'עלות המשכנתא עולה על ערך תיק ההשקעות הצפוי. פירעון מוקדם / הקטנת קרן נותן "תשואה" בטוחה ומובטחת — ללא תנודתיות ושקט נפשי מובנה.'
    }
    return 'ההפרש קטן יחסית. ההחלטה תלויה יותר ברמת הסיכון, הנזילות הנדרשת, והשקט הנפשי שמשרה עליכם היד הפנויה.'
  }

  return (
    <>
      {showRiskModal && <RiskModal onClose={() => setShowRiskModal(false)} />}

      <div className="flex-1 grid grid-cols-[2fr_3fr] gap-4 p-4 min-h-0 overflow-hidden">

        {/* ── Inputs column (RIGHT in RTL) ── */}
        <div className="flex flex-col gap-3 overflow-y-auto">

          {/* Mortgage-savings comparison (manual) */}
          <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
                השוואה מול חיסכון במשכנתא
              </h2>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <p className="text-xs text-kumu-navy-light dark:text-kumu-blue-lighter leading-relaxed">
                השוו בין 2 תמהילים בעמוד ההשוואה — למשל מסלול עם החזר חודשי גבוה יותר שחוסך ריבית, או תמהיל עם הון עצמי גדול יותר — והזינו כאן כמה כסף זה חוסך במצטבר.
              </p>
              <ComparisonInput value={manualComparison} onChange={setManualComparison} />
              <InputRow
                label="תקופת החיסכון (שנים)"
                value={comparisonYears}
                onChange={(v) => setComparisonYears(Math.max(1, Math.min(40, v)))}
                min={1}
                max={40}
              />
            </div>
          </div>

          {/* Investment parameters */}
          <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
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
              />
              <InputRow
                label="הפקדה חודשית (₪)"
                value={inputs.monthlyDeposit}
                onChange={(v) => update('monthlyDeposit', v)}
                min={0}
              />
              <InputRow
                label="תקופה (שנים)"
                value={inputs.years}
                onChange={(v) => update('years', Math.max(1, Math.min(40, v)))}
                min={1}
                max={40}
              />
              <InputRow
                label="תשואה שנתית צפויה"
                value={inputs.annualReturn}
                onChange={handleAnnualReturnChange}
                min={0}
                max={30}
                suffix="%"
              />
              <InputRow
                label="מס רווחי הון"
                value={inputs.capitalGainsTax}
                onChange={(v) => update('capitalGainsTax', Math.max(0, Math.min(50, v)))}
                min={0}
                max={50}
                suffix="%"
              />

              <button
                type="button"
                onClick={reset}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-kumu-navy-light text-kumu-navy-light dark:text-kumu-blue-lighter text-xs py-2 hover:bg-gray-50 dark:hover:bg-kumu-navy transition-colors"
              >
                <RefreshCw size={12} />
                אפס לברירת מחדל
              </button>
            </div>
          </div>
        </div>

        {/* ── Outputs column (LEFT in RTL) ── */}
        <div className="flex flex-col gap-3 overflow-y-auto">

          {/* KPI cards */}
          {hasComparison ? (
            <div className="grid grid-cols-3 gap-2.5">
              <KpiCard
                label="יתרת תיק נטו"
                value={formatCurrencyWhole(investResult.netValue)}
                sub="אחרי מס"
                accent="text-kumu-green"
              />
              <KpiCard
                label="חסכון במשכנתא"
                value={formatCurrencyWhole(comparisonAmount)}
                sub="הזנה ידנית"
                accent="text-kumu-coral"
              />
              <KpiCard
                label="פער נטו"
                value={`${netDiff >= 0 ? '+' : ''}${formatCurrencyWhole(netDiff)}`}
                sub={netDiff >= 0 ? 'השקעה גוברת' : 'משכנתא גוברת'}
                accent={compAccent}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <KpiCard
                label="שווי ברוטו"
                value={formatCurrencyWhole(investResult.grossValue)}
                sub="לפני מס רווחי הון"
              />
              <KpiCard
                label="שווי נטו"
                value={formatCurrencyWhole(investResult.netValue)}
                sub="לאחר מס רווחי הון"
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
          )}

          {/* Area chart */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
                  צמיחת תיק ההשקעות לאורך הזמן
                </h3>
              </div>
              <div className="p-3">
                <ResponsiveContainer width="100%" height={200}>
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
                      <Area
                        type="monotone"
                        dataKey="mortgageSavings"
                        name="חסכון במשכנתא (משוער)"
                        stroke="#E87A5D"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        fill="none"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        isAnimationActive={false}
                        connectNulls
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {hasComparison && (
                <p className="px-4 pb-3 text-[10px] text-kumu-navy-light dark:text-kumu-blue-lighter/80 leading-snug">
                  * עקומת החסכון במשכנתא היא אומדן גס המבוסס על לוח שפיצר ב-5% ואינה מחושבת לפי פרמטרי התמהיל שלכם.
                </p>
              )}
            </div>
          )}

          {/* Sensitivity table */}
          {hasComparison && sensitivityRows.length > 0 && (
            <SensitivityTable
              rows={sensitivityRows}
              isDark={isDark}
            />
          )}

          {/* Comparison decision box */}
          {hasComparison && (
            <div className="rounded-xl border border-kumu-blue/20 dark:border-kumu-blue/30 bg-kumu-blue/5 dark:bg-kumu-blue/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-kumu-blue/10 dark:border-kumu-blue/20 flex items-center gap-2">
                <CompIcon size={15} className={compAccent} />
                <h3 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
                  מסקנה
                </h3>
              </div>
              <p className="px-4 py-3 text-sm text-kumu-navy dark:text-white/90 leading-relaxed">
                {getRecommendation()}
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
