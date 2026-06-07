/**
 * AffordabilityTab — income/liability input + simple PTI notification per mix.
 *
 * Layout (RTL):
 *   Row 1 — two columns: IncomeSection (right) | LiabilitiesSection (left)
 *   Row 2 — full-width PTI summary card (one row per mix, warning when > 40%)
 *
 * Liabilities with remainingMonths 1–17 are excluded from totalLiabilityPayments
 * (handled in the store — Bank of Israel practice for near-expiry obligations).
 */

import { useMemo, useState } from 'react'
import { Plus, X, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAffordabilityStore } from '@/store/useAffordabilityStore'
import { useMix } from '@/store/useMixStore'
import { calculateMix } from '@/engine/calculateMix'
import { calculatePTI } from '@/engine/pti'
import { formatNumber } from '@/utils/format'
import type { IncomeRow, LiabilityRow } from '@/types/affordability'
import type { MixId } from '@/types/mix'

// ---------------------------------------------------------------------------
// Shared numeric input
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
// Section card shell
// ---------------------------------------------------------------------------
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark shadow-sm overflow-hidden">
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
                  <LabelInput value={row.label} onChange={(v) => updateIncomeLabel(row.id, v)} />
                )}
              </div>
              <NumericInput value={row.amount} onChange={(v) => updateIncomeAmount(row.id, v)} />
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

      {liabilityRows.map((row: LiabilityRow, idx) => {
        const isShortTerm = row.remainingMonths >= 1 && row.remainingMonths < 18
        return (
          <div key={row.id}>
            {hasCustomRows && idx === lastFixedIdx + 1 && (
              <div className="mx-4 my-0.5 border-t-2 border-dashed border-gray-200 dark:border-kumu-navy-light/60" />
            )}
            <div className="border-b border-gray-50 dark:border-kumu-navy/50 last:border-0">
              <div
                className={[
                  'grid items-center gap-2 px-4 py-2 group',
                  isShortTerm ? 'opacity-50' : '',
                ].join(' ')}
                style={{ gridTemplateColumns: '1fr 90px 90px 72px 28px' }}
                title={isShortTerm ? 'פחות מ-18 חודשים — לא נכלל בחישוב' : undefined}
              >
                <div className="text-sm text-right">
                  {row.isFixed ? (
                    <span className="text-kumu-navy dark:text-white">{row.label}</span>
                  ) : (
                    <LabelInput value={row.label} onChange={(v) => updateLiabilityLabel(row.id, v)} />
                  )}
                </div>
                <NumericInput value={row.monthlyPayment} onChange={(v) => updateLiability(row.id, 'monthlyPayment', v)} />
                <NumericInput value={row.balance} onChange={(v) => updateLiability(row.id, 'balance', v)} />
                <NumericInput value={row.remainingMonths} onChange={(v) => updateLiability(row.id, 'remainingMonths', v)} />
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
        )
      })}

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
// PTI summary — one row per mix, warning only when exceeds 40%
// ---------------------------------------------------------------------------
const MIX_DEFS: { id: MixId; label: string }[] = [
  { id: 'a', label: "תמהיל א'" },
  { id: 'b', label: "תמהיל ב'" },
  { id: 'c', label: "תמהיל ג'" },
]

function PTISummaryCard() {
  const { totalIncome, totalLiabilityPayments, disposableIncome } = useAffordabilityStore()

  const mixA = useMix('a')
  const mixB = useMix('b')
  const mixC = useMix('c')

  const income      = totalIncome()
  const liabilities = totalLiabilityPayments()
  const dispIncome  = disposableIncome()
  const threshold   = Math.round(dispIncome * 0.4)

  const mixes = [
    { ...MIX_DEFS[0], mix: mixA },
    { ...MIX_DEFS[1], mix: mixB },
    { ...MIX_DEFS[2], mix: mixC },
  ]

  const ptiResults = useMemo(
    () =>
      mixes.map(({ id, label, mix }) => {
        if (mix.tracks.length === 0) return { id, label, pti: null }
        const { kpis } = calculateMix(mix.tracks, mix.macroForecasts, mix.prepayments)
        return { id, label, pti: calculatePTI(dispIncome, kpis) }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      mixA.tracks, mixA.macroForecasts, mixA.prepayments,
      mixB.tracks, mixB.macroForecasts, mixB.prepayments,
      mixC.tracks, mixC.macroForecasts, mixC.prepayments,
      dispIncome,
    ],
  )

  const anyExceeds = ptiResults.some((r) => r.pti?.status === 'exceeds')

  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 dark:bg-kumu-navy-dark/50 border-b border-gray-100 dark:border-kumu-navy-light flex items-center gap-2">
        <ShieldCheck size={15} className="text-kumu-blue" />
        <span className="text-sm font-semibold text-kumu-navy dark:text-white">
          בדיקת כושר החזר (PTI)
        </span>
      </div>

      {income === 0 ? (
        <p className="px-5 py-5 text-sm text-kumu-navy-light dark:text-kumu-blue-lighter">
          הזינו נתוני הכנסות כדי לבדוק את יחס ההחזר לכל תמהיל.
        </p>
      ) : (
        <div className="p-5 flex flex-col gap-4">

          {/* Income context line */}
          <div className="flex items-center gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-kumu-navy-light dark:text-kumu-blue-lighter">הכנסה פנויה:</span>
              <span className="font-semibold tabular-nums text-kumu-navy dark:text-white" dir="ltr">
                ₪{formatNumber(Math.round(dispIncome))}
              </span>
              {liabilities > 0 && (
                <span className="text-kumu-navy-light dark:text-kumu-blue-lighter text-xs">
                  ({formatNumber(Math.round(income))} הכנסות − {formatNumber(Math.round(liabilities))} התחייבויות)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-kumu-navy-light dark:text-kumu-blue-lighter">רף 40%:</span>
              <span className="font-semibold tabular-nums text-kumu-navy dark:text-white" dir="ltr">
                ₪{formatNumber(threshold)}
              </span>
            </div>
          </div>

          {/* Per-mix rows */}
          <div className="flex flex-col gap-2">
            {ptiResults.map(({ id, label, pti }) => {
              if (pti === null) {
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-kumu-navy/40"
                  >
                    <span className="text-sm font-medium text-kumu-navy dark:text-white">{label}</span>
                    <span className="text-xs text-kumu-navy-light dark:text-kumu-blue-lighter">לא מוגדר</span>
                  </div>
                )
              }

              const isExceeds = pti.status === 'exceeds'
              const isWarning = pti.status === 'warning'

              return (
                <div
                  key={id}
                  className={[
                    'flex items-center justify-between px-4 py-2.5 rounded-lg',
                    isExceeds
                      ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20'
                      : isWarning
                        ? 'bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20'
                        : 'bg-green-50 dark:bg-kumu-green/10 border border-green-200 dark:border-kumu-green/20',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2.5">
                    {isExceeds ? (
                      <AlertCircle size={15} className="text-red-500 shrink-0" />
                    ) : (
                      <CheckCircle2 size={15} className={isWarning ? 'text-yellow-500' : 'text-kumu-green'} />
                    )}
                    <span className="text-sm font-medium text-kumu-navy dark:text-white">{label}</span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span className="tabular-nums text-kumu-navy-light dark:text-kumu-blue-lighter" dir="ltr">
                      ₪{formatNumber(Math.round(pti.relevantPayment))}
                    </span>
                    <span
                      className={[
                        'font-bold tabular-nums w-14 text-left',
                        isExceeds ? 'text-red-500' :
                        isWarning ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-kumu-green',
                      ].join(' ')}
                      dir="ltr"
                    >
                      {pti.ptiRatio.toFixed(1)}%
                    </span>
                    {isExceeds && (
                      <span className="text-xs text-red-500 font-medium">חורג מ-40%</span>
                    )}
                    {isWarning && (
                      <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">קרוב ל-40%</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary warning when any mix exceeds */}
          {anyExceeds && (
            <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-sm text-red-700 dark:text-red-400 leading-relaxed">
              אחד או יותר מהתמהילים חורג מ-40% מההכנסה הפנויה — בנקים רבים יתקשו לאשר משכנתא בתנאים אלה. שווה לבחון הפחתה בסכום המשכנתא או הארכת תקופה.
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function AffordabilityTab() {
  return (
    <div className="flex-1 p-6 overflow-y-auto">

      {/* Page header */}
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

      {/* Two-column: income (right) + liabilities (left) in RTL */}
      <div className="grid grid-cols-2 gap-5 items-start">
        <IncomeSection />
        <LiabilitiesSection />
      </div>

      {/* PTI summary — full width, below */}
      <div className="mt-5">
        <PTISummaryCard />
      </div>

    </div>
  )
}
