/**
 * AffordabilityTab — PTI (Payment-to-Income) calculator.
 *
 * Layout (RTL):
 *   Row 1 — two columns: IncomeSection (right) | LiabilitiesSection (left)
 *   Row 2 — full-width PTI results card
 *
 * Reads income / liability data from useAffordabilityStore.
 * Computes PTI against Mix A via calculateMix + calculatePTI.
 * PRD §3.10 + §שלב 9
 */

import { useMemo, useState } from 'react'
import { Plus, X, ShieldCheck } from 'lucide-react'
import { useAffordabilityStore } from '@/store/useAffordabilityStore'
import { useMix } from '@/store/useMixStore'
import { calculateMix } from '@/engine/calculateMix'
import { calculatePTI } from '@/engine/pti'
import { formatNumber } from '@/utils/format'
import type { IncomeRow, LiabilityRow } from '@/types/affordability'

// ---------------------------------------------------------------------------
// Shared numeric input (same pattern as TransactionCostsTab AmountInput)
// ---------------------------------------------------------------------------
function NumericInput({
  value,
  onChange,
  placeholder = '0',
}: {
  value: number
  onChange: (v: number) => void
  placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw]         = useState('')

  return (
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      placeholder={placeholder}
      value={focused ? raw : (value === 0 ? '' : formatNumber(value))}
      onFocus={() => {
        setFocused(true)
        setRaw(value === 0 ? '' : String(value))
      }}
      onBlur={() => {
        setFocused(false)
        const n = parseInt(raw.replace(/\D/g, ''), 10)
        onChange(isNaN(n) ? 0 : n)
      }}
      onChange={(e) => setRaw(e.target.value.replace(/\D/g, ''))}
      className={[
        'w-full h-9 rounded-lg border border-transparent',
        'px-3 text-sm text-right tabular-nums',
        'bg-gray-50 dark:bg-kumu-navy/60 text-kumu-navy dark:text-white',
        'placeholder:text-gray-300 dark:placeholder:text-kumu-navy-light/50',
        'hover:border-kumu-blue/30 focus:border-kumu-blue focus:bg-white dark:focus:bg-kumu-navy-dark',
        'outline-none focus:ring-1 focus:ring-kumu-blue/20 transition-all',
      ].join(' ')}
    />
  )
}

// ---------------------------------------------------------------------------
// Editable label input for custom rows
// ---------------------------------------------------------------------------
function LabelInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={[
        'w-full bg-transparent border-b border-gray-200 dark:border-kumu-navy-light',
        'focus:border-kumu-blue outline-none text-sm text-kumu-navy dark:text-white',
        'px-1 py-1 transition-colors',
      ].join(' ')}
    />
  )
}

// ---------------------------------------------------------------------------
// Card shell (consistent section wrapper)
// ---------------------------------------------------------------------------
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-kumu-navy-dark/50 border-b border-gray-100 dark:border-kumu-navy-light">
        <span className="text-sm font-semibold text-kumu-navy dark:text-white">{title}</span>
      </div>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Income section
// ---------------------------------------------------------------------------
function IncomeSection() {
  const {
    incomeRows,
    updateIncomeAmount,
    addIncomeRow,
    removeIncomeRow,
    updateIncomeLabel,
    totalIncome,
  } = useAffordabilityStore()

  const total         = totalIncome()
  const lastFixedIdx  = incomeRows.reduce((last, r, i) => (r.isFixed ? i : last), -1)
  const hasCustomRows = incomeRows.some((r) => !r.isFixed)

  return (
    <SectionCard title='הכנסות חודשיות'>
      {/* Column header */}
      <div
        className="grid items-center gap-3 px-4 py-1.5 border-b border-gray-50 dark:border-kumu-navy/50"
        style={{ gridTemplateColumns: '1fr 130px 28px' }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter text-right">
          מקור הכנסה
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter text-right">
          נטו חודשי (₪)
        </span>
        <span />
      </div>

      {/* Rows */}
      {incomeRows.map((row: IncomeRow, idx) => (
        <div key={row.id}>
          {hasCustomRows && idx === lastFixedIdx + 1 && (
            <div className="mx-4 my-0.5 border-t-2 border-dashed border-gray-200 dark:border-kumu-navy-light/60" />
          )}
          <div className="border-b border-gray-50 dark:border-kumu-navy/50 last:border-0">
            <div
              className="grid items-center gap-3 px-4 py-2 group"
              style={{ gridTemplateColumns: '1fr 130px 28px' }}
            >
              <div className="text-sm text-right">
                {row.isFixed ? (
                  <span className="text-kumu-navy dark:text-white">{row.label}</span>
                ) : (
                  <LabelInput
                    value={row.label}
                    onChange={(v) => updateIncomeLabel(row.id, v)}
                  />
                )}
              </div>
              <NumericInput
                value={row.amount}
                onChange={(v) => updateIncomeAmount(row.id, v)}
              />
              <div className="flex justify-center">
                {!row.isFixed && (
                  <button
                    type="button"
                    onClick={() => removeIncomeRow(row.id)}
                    title="מחק שורה"
                    className="p-1 rounded text-gray-300 dark:text-kumu-navy-light/40 hover:text-kumu-coral hover:bg-kumu-coral/10 transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Add row button */}
      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-kumu-navy-light">
        <button
          type="button"
          onClick={addIncomeRow}
          className="flex items-center gap-1.5 text-xs font-medium text-kumu-blue hover:text-kumu-blue-light transition-colors"
        >
          <Plus size={13} />
          הוסף הכנסה
        </button>
      </div>

      {/* Total row */}
      <div
        className="grid items-center gap-3 px-4 py-3 bg-kumu-bg-light dark:bg-kumu-navy rounded-b-xl border-t-2 border-gray-100 dark:border-kumu-navy-light"
        style={{ gridTemplateColumns: '1fr 130px 28px' }}
      >
        <span className="text-sm font-semibold text-kumu-navy dark:text-white text-right">
          סה"כ הכנסות
        </span>
        <span className="text-lg font-bold text-kumu-navy dark:text-white tabular-nums text-right" dir="ltr">
          {total === 0 ? '—' : `₪${formatNumber(total)}`}
        </span>
        <span />
      </div>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Liabilities section
// ---------------------------------------------------------------------------
function LiabilitiesSection() {
  const {
    liabilityRows,
    updateLiability,
    addLiabilityRow,
    removeLiabilityRow,
    updateLiabilityLabel,
    totalLiabilityPayments,
  } = useAffordabilityStore()

  const total         = totalLiabilityPayments()
  const lastFixedIdx  = liabilityRows.reduce((last, r, i) => (r.isFixed ? i : last), -1)
  const hasCustomRows = liabilityRows.some((r) => !r.isFixed)

  return (
    <SectionCard title='התחייבויות קיימות'>
      {/* Column header */}
      <div
        className="grid items-center gap-2 px-4 py-1.5 border-b border-gray-50 dark:border-kumu-navy/50"
        style={{ gridTemplateColumns: '1fr 90px 90px 72px 28px' }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter text-right">
          התחייבות
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter text-right">
          החזר חודשי
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter text-right">
          יתרת חוב
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter text-right">
          יתרת תקופה
        </span>
        <span />
      </div>

      {/* Rows */}
      {liabilityRows.map((row: LiabilityRow, idx) => (
        <div key={row.id}>
          {hasCustomRows && idx === lastFixedIdx + 1 && (
            <div className="mx-4 my-0.5 border-t-2 border-dashed border-gray-200 dark:border-kumu-navy-light/60" />
          )}
          <div className="border-b border-gray-50 dark:border-kumu-navy/50 last:border-0">
            <div
              className="grid items-center gap-2 px-4 py-2 group"
              style={{ gridTemplateColumns: '1fr 90px 90px 72px 28px' }}
            >
              {/* Label */}
              <div className="text-sm text-right">
                {row.isFixed ? (
                  <span className="text-kumu-navy dark:text-white">{row.label}</span>
                ) : (
                  <LabelInput
                    value={row.label}
                    onChange={(v) => updateLiabilityLabel(row.id, v)}
                  />
                )}
              </div>

              {/* Monthly payment */}
              <NumericInput
                value={row.monthlyPayment}
                onChange={(v) => updateLiability(row.id, 'monthlyPayment', v)}
              />

              {/* Balance */}
              <NumericInput
                value={row.balance}
                onChange={(v) => updateLiability(row.id, 'balance', v)}
              />

              {/* Remaining months */}
              <NumericInput
                value={row.remainingMonths}
                onChange={(v) => updateLiability(row.id, 'remainingMonths', v)}
                placeholder="0"
              />

              {/* Delete */}
              <div className="flex justify-center">
                {!row.isFixed && (
                  <button
                    type="button"
                    onClick={() => removeLiabilityRow(row.id)}
                    title="מחק שורה"
                    className="p-1 rounded text-gray-300 dark:text-kumu-navy-light/40 hover:text-kumu-coral hover:bg-kumu-coral/10 transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Add row button */}
      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-kumu-navy-light">
        <button
          type="button"
          onClick={addLiabilityRow}
          className="flex items-center gap-1.5 text-xs font-medium text-kumu-blue hover:text-kumu-blue-light transition-colors"
        >
          <Plus size={13} />
          הוסף התחייבות
        </button>
      </div>

      {/* Total row */}
      <div
        className="grid items-center gap-2 px-4 py-3 bg-kumu-bg-light dark:bg-kumu-navy rounded-b-xl border-t-2 border-gray-100 dark:border-kumu-navy-light"
        style={{ gridTemplateColumns: '1fr 90px 90px 72px 28px' }}
      >
        <span className="text-sm font-semibold text-kumu-navy dark:text-white text-right">
          סה"כ החזרים חודשיים
        </span>
        <span className="text-lg font-bold text-kumu-navy dark:text-white tabular-nums text-right" dir="ltr">
          {total === 0 ? '—' : `₪${formatNumber(total)}`}
        </span>
        <span /><span /><span />
      </div>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// KPI box — one of the four summary boxes in the PTI results card
// ---------------------------------------------------------------------------
function KPIBox({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: 'green' | 'coral' | 'default'
}) {
  const valueColor =
    highlight === 'green'
      ? 'text-kumu-green'
      : highlight === 'coral'
        ? 'text-kumu-coral'
        : 'text-kumu-navy dark:text-white'

  return (
    <div className="flex flex-col items-end gap-1 bg-gray-50 dark:bg-kumu-navy/50 rounded-xl px-4 py-3 border border-gray-100 dark:border-kumu-navy-light">
      <span className="text-[11px] text-kumu-navy-light dark:text-kumu-blue-lighter font-medium">
        {label}
      </span>
      <span className={`text-xl font-bold tabular-nums ${valueColor}`} dir="ltr">
        {value === 0 ? '—' : `₪${formatNumber(Math.round(value))}`}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PTI results card (full-width, below the two columns)
// ---------------------------------------------------------------------------
function PTIResultsCard() {
  const {
    totalIncome,
    totalLiabilityPayments,
    disposableIncome,
  } = useAffordabilityStore()

  const mixA = useMix('a')

  const ptiResult = useMemo(() => {
    const dispIncome = disposableIncome()
    const { kpis }   = calculateMix(mixA.tracks, mixA.macroForecasts, mixA.prepayments)
    return calculatePTI(dispIncome, kpis)
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    mixA.tracks,
    mixA.macroForecasts,
    mixA.prepayments,
    // disposableIncome is a getter — depend on its inputs instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
    totalIncome(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    totalLiabilityPayments(),
  ])

  const { ptiRatio, status, label, relevantPayment } = ptiResult
  const income      = totalIncome()
  const liabilities = totalLiabilityPayments()
  const dispIncome  = disposableIncome()

  // Progress bar fill: cap at 100%, show at least a sliver so the bar isn't invisible
  const barWidth = income === 0 ? 0 : Math.min(ptiRatio, 100)

  // Colour tokens by status
  const barColor =
    status === 'ok'      ? 'bg-kumu-green' :
    status === 'warning' ? 'bg-yellow-400' :
    'bg-red-500'

  const statusTextColor =
    status === 'ok'      ? 'text-kumu-green' :
    status === 'warning' ? 'text-yellow-500 dark:text-yellow-400' :
    'text-red-500'

  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-kumu-navy-dark/50 border-b border-gray-100 dark:border-kumu-navy-light flex items-center justify-between">
        <span className="text-sm font-semibold text-kumu-navy dark:text-white">
          יחס ההחזר (PTI) — לפי תמהיל א'
        </span>
        {income > 0 && (
          <span
            className={`text-sm font-bold tabular-nums ${statusTextColor}`}
          >
            {ptiRatio.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col gap-5">

        {/* 4 KPI boxes */}
        <div className="grid grid-cols-4 gap-3">
          <KPIBox label='סה"כ הכנסות'       value={income}         />
          <KPIBox label='סה"כ התחייבויות'   value={liabilities}    highlight={liabilities > 0 ? 'coral' : 'default'} />
          <KPIBox label='הכנסה פנויה'        value={dispIncome}     highlight={dispIncome > 0 ? 'green' : dispIncome < 0 ? 'coral' : 'default'} />
          <KPIBox label='החזר חודשי משוער'   value={relevantPayment} />
        </div>

        {/* Progress bar */}
        <div>
          {/* Label above bar */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-kumu-navy-light dark:text-kumu-blue-lighter">
              מגבלת בנק ישראל: 40%
            </span>
            <span className="text-sm font-semibold text-kumu-navy dark:text-white">
              {income === 0 ? 'יחס ההחזר: —' : `יחס ההחזר: ${ptiRatio.toFixed(1)}%`}
            </span>
          </div>

          {/* Bar track */}
          <div className="relative w-full bg-gray-200 dark:bg-kumu-navy rounded-full h-4">
            {/* Fill */}
            <div
              className={`h-4 rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${barWidth}%` }}
            />
            {/* 40% marker line */}
            <div
              className="absolute top-0 bottom-0 w-px bg-kumu-navy/30 dark:bg-white/30"
              style={{ left: '40%' }}
            />
          </div>

          {/* 40% tick label */}
          <div className="relative mt-1" style={{ height: '16px' }}>
            <span
              className="absolute text-[10px] text-kumu-navy-light dark:text-kumu-blue-lighter transform -translate-x-1/2"
              style={{ left: '40%' }}
            >
              40%
            </span>
          </div>
        </div>

        {/* KUMU-tone label */}
        <p className={`text-sm leading-relaxed font-medium ${statusTextColor}`}>
          {label}
        </p>

      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function AffordabilityTab() {
  return (
    <div className="flex-1 p-6 overflow-y-auto">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-kumu-blue/10 dark:bg-kumu-blue/20 flex items-center justify-center">
            <ShieldCheck size={18} className="text-kumu-blue" />
          </div>
          <h1 className="text-xl font-semibold text-kumu-navy dark:text-white">
            כושר החזר
          </h1>
        </div>
        <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter leading-relaxed max-w-2xl">
          לפני שמחליטים על גובה המשכנתא — כדאי לוודא שההחזר החודשי מתאים לתמונה הכלכלית המלאה שלכם.
        </p>
      </div>

      {/* ── Two-column grid: income (right) + liabilities (left) in RTL ───── */}
      <div className="grid grid-cols-2 gap-5 items-start">
        <IncomeSection />
        <LiabilitiesSection />
      </div>

      {/* ── PTI results (full width, below) ───────────────────────────────── */}
      <div className="mt-5">
        <PTIResultsCard />
      </div>

    </div>
  )
}
