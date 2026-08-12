/**
 * TransactionTab — merged tab for global transaction inputs + deal costs.
 * Route: /transaction
 */

import { useState, useEffect, useRef } from 'react'
import { RotateCcw, Plus, X, ArrowLeftRight, FileText, Trash2 } from 'lucide-react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCostsStore } from '@/store/useCostsStore'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { validateLTV, MAX_LTV } from '@/utils/validation'
import { formatNumber } from '@/utils/format'
import type { PurchaseStatus } from '@/types/macro'
import type { CostRow } from '@/types/costs'

// ---------------------------------------------------------------------------
// Purchase status options
// ---------------------------------------------------------------------------
const PURCHASE_OPTIONS: { value: PurchaseStatus; label: string; limit: number }[] = [
  { value: 'first',       label: 'דירה יחידה / ראשונה', limit: 75 },
  { value: 'replacement', label: 'דירה חליפית',          limit: 70 },
  { value: 'investment',  label: 'דירה להשקעה',          limit: 50 },
]

// ---------------------------------------------------------------------------
// Shared NumberInput
// ---------------------------------------------------------------------------
function NumberInput({
  value,
  onChange,
  placeholder,
  hasError = false,
  testId,
}: {
  value:       number
  onChange:    (n: number) => void
  placeholder?: string
  hasError?:   boolean
  testId?:     string
}) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw]         = useState('')

  const handleFocus = () => { setFocused(true); setRaw(value === 0 ? '' : String(Math.round(value))) }
  const handleBlur  = () => {
    setFocused(false)
    const n = parseInt(raw.replace(/\D/g, ''), 10)
    onChange(isNaN(n) ? 0 : n)
  }

  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-sm text-kumu-navy-light dark:text-kumu-blue-lighter pointer-events-none select-none">
        ₪
      </span>
      <input
        type="text"
        inputMode="numeric"
        dir="ltr"
        data-testid={testId}
        value={focused ? raw : (value === 0 ? '' : formatNumber(Math.round(value)))}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(e) => setRaw(e.target.value.replace(/\D/g, ''))}
        placeholder={placeholder}
        className={[
          'w-full h-9 rounded-xl bg-transparent pl-7 pr-3 text-sm',
          'text-kumu-navy dark:text-white outline-none',
          hasError ? 'placeholder:text-kumu-error/50' : 'placeholder:text-gray-300',
        ].join(' ')}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// LTV badge
// ---------------------------------------------------------------------------
function LTVBadge({ ltv, limit }: { ltv: number; limit: number }) {
  const over = ltv > limit || ltv < 0
  const near = ltv > limit * 0.9 && !over
  const bg   = over  ? 'bg-red-50 dark:bg-red-900/20 text-kumu-error border-red-200 dark:border-red-800'
             : near  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-kumu-yellow border-amber-200 dark:border-amber-700'
             :         'bg-emerald-50 dark:bg-emerald-900/20 text-kumu-green border-emerald-200 dark:border-emerald-700'
  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${bg}`}>
      <span className="text-xs font-medium">אחוז מימון</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums">{ltv.toFixed(1)}%</span>
        <span className="text-xs opacity-70">/ מקס׳ {limit}%</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Transaction inputs section
// ---------------------------------------------------------------------------
function TransactionInputs() {
  const tx = useTransactionStore()
  // Subscribe to the computed total directly so re-renders fire when rows change
  const costs = useCostsStore((s) => s.rows.reduce((sum, r) => sum + (r.amount || 0), 0))
  const [isManual, setIsManual] = useState(false)

  const { propertyValue, equity, purchaseStatus, mortgageAmount, update } = tx
  const netEquity = equity - costs
  const ltv      = propertyValue > 0 ? (mortgageAmount / propertyValue) * 100 : 0
  const maxLTV   = MAX_LTV[purchaseStatus]
  const ltvResult = validateLTV(ltv, purchaseStatus)

  // Always keep a fresh ref so the costs-change effect doesn't suffer stale closures
  const stateRef = useRef({ propertyValue, equity, isManual })
  stateRef.current = { propertyValue, equity, isManual }

  // Auto-recalculate mortgage when the costs table changes
  const isMounted = useRef(false)
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return }
    const { propertyValue: pv, equity: eq, isManual: manual } = stateRef.current
    if (manual) return
    update({ mortgageAmount: Math.max(0, pv - Math.max(0, eq - costs)) })
    // update is a stable Zustand action — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costs])

  const autoMortgage = (pv: number, eq: number) => Math.max(0, pv - Math.max(0, eq - costs))

  const setProperty  = (v: number) => {
    update({ propertyValue: v, ...(!isManual && { mortgageAmount: autoMortgage(v, equity) }) })
  }
  const setEquity    = (v: number) => {
    update({ equity: v, ...(!isManual && { mortgageAmount: autoMortgage(propertyValue, v) }) })
  }
  // Editing net equity reverse-calculates gross equity so the display stays consistent
  const setNetEquity = (v: number) => {
    const newEquity = Math.max(0, v + costs)
    update({ equity: newEquity, ...(!isManual && { mortgageAmount: Math.max(0, propertyValue - v) }) })
  }
  const setMortgage   = (v: number) => { setIsManual(true); update({ mortgageAmount: v }) }
  const resetMortgage = () => {
    setIsManual(false)
    update({ mortgageAmount: autoMortgage(propertyValue, equity) })
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-white dark:bg-kumu-surface-dark rounded-xl border border-gray-100 dark:border-kumu-navy-light">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue px-1">
        נתוני העסקה
      </h2>

      {/* Property value */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-kumu-navy dark:text-kumu-blue-lighter">שווי הנכס</span>
        <div className="rounded-xl border border-gray-200 dark:border-kumu-navy-light bg-gray-50 dark:bg-kumu-navy/30">
          <NumberInput value={propertyValue} onChange={setProperty} placeholder="2,000,000" testId="tx-property-value" />
        </div>
      </div>

      {/* Equity — total */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-kumu-navy dark:text-kumu-blue-lighter">הון עצמי כולל</span>
        <div className="rounded-xl border border-gray-200 dark:border-kumu-navy-light bg-gray-50 dark:bg-kumu-navy/30">
          <NumberInput value={equity} onChange={setEquity} placeholder="600,000" testId="tx-equity" />
        </div>
      </div>

      {/* Net equity — editable; typing here back-calculates gross equity */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-kumu-navy dark:text-kumu-blue-lighter">
            הון עצמי נטו לאחר ניכוי הוצאות נלוות
          </span>
          {costs > 0 && (
            <span className="text-[10px] text-kumu-navy-light dark:text-kumu-blue-lighter/70">
              ניכוי ₪{formatNumber(costs)}
            </span>
          )}
        </div>
        <div className={[
          'rounded-xl border bg-gray-50 dark:bg-kumu-navy/30',
          netEquity < 0 && costs > 0
            ? 'border-kumu-error/60'
            : 'border-gray-200 dark:border-kumu-navy-light',
        ].join(' ')}>
          <NumberInput
            value={Math.max(0, netEquity)}
            onChange={setNetEquity}
            testId="tx-net-equity"
          />
        </div>
        {netEquity < 0 && costs > 0 && (
          <p className="text-xs text-kumu-error leading-snug">
            ההוצאות הנלוות עולות על ההון העצמי
          </p>
        )}
      </div>

      {/* Purchase status */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-kumu-navy dark:text-kumu-blue-lighter">סטטוס רכישה</span>
        <select
          value={purchaseStatus}
          onChange={(e) => update({ purchaseStatus: e.target.value as PurchaseStatus })}
          className={[
            'w-full h-9 rounded-xl border border-gray-200 dark:border-kumu-navy-light',
            'bg-white dark:bg-kumu-navy px-3 text-sm',
            'text-kumu-navy dark:text-white outline-none',
            'focus:border-kumu-blue focus:ring-2 focus:ring-kumu-blue/20 transition-all',
          ].join(' ')}
        >
          {PURCHASE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label} (עד {o.limit}%)</option>
          ))}
        </select>
      </div>

      <div className="h-px bg-gray-100 dark:bg-kumu-navy-light" />

      {/* Mortgage amount */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-kumu-navy dark:text-kumu-blue-lighter">
            סכום המשכנתא
            {isManual && <span className="mr-1.5 text-[10px] text-kumu-coral">(ידני)</span>}
          </span>
          {isManual && (
            <button
              type="button"
              onClick={resetMortgage}
              className="flex items-center gap-1 text-[11px] text-kumu-blue hover:text-kumu-blue-light transition-colors"
            >
              <RotateCcw size={11} />
              חישוב אוטומטי
            </button>
          )}
        </div>
        <div className={[
          'rounded-xl border bg-gray-50 dark:bg-kumu-navy/30',
          ltvResult.status === 'error'
            ? 'border-kumu-error/60'
            : 'border-gray-200 dark:border-kumu-navy-light',
        ].join(' ')}>
          <NumberInput value={mortgageAmount} onChange={setMortgage} hasError={ltvResult.status === 'error'} />
        </div>
        {ltvResult.status === 'error' && ltvResult.message && (
          <p className="text-xs text-kumu-error leading-snug">{ltvResult.message}</p>
        )}
      </div>

      <LTVBadge ltv={ltv} limit={maxLTV} />
      <p className="text-xs text-gray-500 dark:text-kumu-blue-lighter/60 leading-snug -mt-1">
        אחוז המימון מחושב לפי ההון העצמי בפועל — לאחר ניכוי הוצאות העסקה.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Amount input for costs
// ---------------------------------------------------------------------------
function AmountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw]         = useState('')
  return (
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

function CostRowItem({
  row,
  onAmountChange,
  onLabelChange,
  onDelete,
}: {
  row:            CostRow
  onAmountChange: (id: string, amount: number) => void
  onLabelChange:  (id: string, label: string)  => void
  onDelete:       (id: string) => void
}) {
  return (
    <div className="grid items-center gap-3 px-4 py-2.5 group" style={{ gridTemplateColumns: 'minmax(0,1fr) 140px 32px' }}>
      <div className="min-w-0 text-sm text-right">
        {row.isFixed ? (
          <span className="text-kumu-navy dark:text-white">{row.label}</span>
        ) : (
          <LabelInput value={row.label} onChange={(v) => onLabelChange(row.id, v)} />
        )}
      </div>
      <AmountInput value={row.amount} onChange={(v) => onAmountChange(row.id, v)} />
      <div className="flex justify-center">
        {!row.isFixed && (
          <button
            type="button"
            onClick={() => onDelete(row.id)}
            title="מחק שורה"
            className="p-1 rounded text-gray-300 dark:text-kumu-navy-light/40 hover:text-kumu-coral hover:bg-kumu-coral/10 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Costs section (card only, no page header)
// ---------------------------------------------------------------------------
function CostsSection() {
  const { rows, updateAmount, addRow, removeRow, updateLabel, totalCosts } = useCostsStore()
  const equity = useTransactionStore((s) => s.equity)
  const [showCallout, setShowCallout] = useState(false)

  const total           = totalCosts()
  const effectiveEquity = equity - total
  const equityShortfall = effectiveEquity < 0
  const lastFixedIdx    = rows.reduce((last, r, i) => (r.isFixed ? i : last), -1)
  const hasCustomRows   = rows.some((r) => !r.isFixed)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue px-1">
        הוצאות עסקה
      </h2>

      <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark shadow-sm overflow-hidden">
        {/* Column header */}
        <div
          className="grid items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-kumu-navy-dark/50 border-b border-gray-100 dark:border-kumu-navy-light"
          style={{ gridTemplateColumns: 'minmax(0,1fr) 140px 32px' }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter text-right">סעיף</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter text-right">סכום (₪)</span>
          <span />
        </div>

        {rows.map((row, idx) => (
          <div key={row.id}>
            {hasCustomRows && idx === lastFixedIdx + 1 && (
              <div className="mx-4 my-0.5 border-t-2 border-dashed border-gray-200 dark:border-kumu-navy-light/60" />
            )}
            <div className="border-b border-gray-50 dark:border-kumu-navy/50 last:border-0">
              <CostRowItem
                row={row}
                onAmountChange={updateAmount}
                onLabelChange={updateLabel}
                onDelete={removeRow}
              />
            </div>
          </div>
        ))}

        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-kumu-navy-light">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs font-medium text-kumu-blue hover:text-kumu-blue-light transition-colors"
          >
            <Plus size={13} />
            הוסף סעיף
          </button>
        </div>

        <div
          className="grid items-center gap-3 px-4 py-3.5 bg-kumu-bg-light dark:bg-kumu-navy rounded-b-xl border-t-2 border-gray-100 dark:border-kumu-navy-light"
          style={{ gridTemplateColumns: 'minmax(0,1fr) 140px 32px' }}
        >
          <span className="text-sm font-semibold text-kumu-navy dark:text-white text-right">סה"כ הוצאות עסקה</span>
          <span className="text-xl font-bold text-kumu-navy dark:text-white tabular-nums text-right" dir="ltr">
            {total === 0 ? '—' : `₪${formatNumber(total)}`}
          </span>
          <span />
        </div>
      </div>

      {/* Equity callout */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setShowCallout((v) => !v)}
          className={[
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors',
            'border border-gray-200 dark:border-kumu-navy-light',
            'text-kumu-navy-light dark:text-kumu-blue-lighter',
            'hover:border-kumu-blue hover:text-kumu-blue dark:hover:text-kumu-blue-light',
          ].join(' ')}
        >
          <ArrowLeftRight size={15} />
          הצג הון עצמי לאחר קיזוז הוצאות
        </button>

        {showCallout && (
          <div className={[
            'w-full rounded-xl border p-5 text-sm leading-relaxed',
            equityShortfall
              ? 'border-kumu-coral/40 bg-kumu-coral/5 dark:bg-kumu-coral/10'
              : 'border-kumu-blue/20 dark:border-kumu-blue/30 bg-kumu-blue/5 dark:bg-kumu-blue/10',
          ].join(' ')}>
            <div className="flex flex-col gap-2 text-right">
              <div className="flex justify-between">
                <span className="tabular-nums font-medium text-kumu-navy dark:text-white" dir="ltr">₪{formatNumber(total)}</span>
                <span className="text-kumu-navy-light dark:text-kumu-blue-lighter">הוצאות עסקה משוערות:</span>
              </div>
              <div className="flex justify-between">
                <span className="tabular-nums font-medium text-kumu-navy dark:text-white" dir="ltr">₪{formatNumber(equity)}</span>
                <span className="text-kumu-navy-light dark:text-kumu-blue-lighter">הון עצמי (נוכחי):</span>
              </div>
              <div className="h-px bg-gray-200 dark:bg-kumu-navy-light/40 my-1" />
              <div className="flex justify-between items-center">
                <span className={['tabular-nums text-base font-bold', equityShortfall ? 'text-kumu-coral' : 'text-kumu-green'].join(' ')} dir="ltr">
                  ₪{formatNumber(effectiveEquity)}
                </span>
                <span className="text-kumu-navy dark:text-white font-medium">→ הון עצמי אפקטיבי:</span>
              </div>
              {equityShortfall && (
                <p className="text-xs text-kumu-coral mt-1">
                  הוצאות העסקה עולות על ההון העצמי שהוזן. שווה לבדוק את המספרים שוב.
                </p>
              )}
              <p className="text-xs text-kumu-navy-light dark:text-kumu-blue-lighter mt-2 border-t border-gray-100 dark:border-kumu-navy-light/40 pt-3">
                שימו לב: זהו חישוב לדוגמה בלבד. עדכנו את שדה ההון העצמי בתמהיל ידנית אם רלוונטי.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Clear transaction button
// ---------------------------------------------------------------------------
function ClearTransactionButton() {
  const reset         = useTransactionStore((s) => s.reset)
  const resetAllCosts = useCostsStore((s) => s.resetAll)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleClear = () => {
    reset()
    resetAllCosts()
    setConfirmOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        title="נקה נתוני עסקה"
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-kumu-navy-light dark:text-kumu-blue-lighter border border-gray-200 dark:border-kumu-navy-light hover:border-kumu-coral hover:text-kumu-coral dark:hover:text-kumu-coral transition-colors"
      >
        <Trash2 size={13} />
        נקה נתוני עסקה
      </button>
      <ConfirmDialog
        isOpen={confirmOpen}
        title="נקה נתוני עסקה"
        message="לנקות את כל נתוני העסקה וההוצאות?"
        variant="danger"
        onConfirm={handleClear}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function TransactionTab() {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden max-w-full p-6">
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-kumu-blue/10 dark:bg-kumu-blue/20 flex items-center justify-center">
              <FileText size={18} className="text-kumu-blue" />
            </div>
            <h1 className="text-xl font-semibold text-kumu-navy dark:text-white">
              נתוני עסקה
            </h1>
          </div>
          <ClearTransactionButton />
        </div>
        <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter leading-relaxed">
          הגדירו את פרטי העסקה הבסיסיים כאן — הנתונים זמינים בכל תמהיל כברירת מחדל.
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
        {/* Right: global inputs */}
        <TransactionInputs />

        {/* Left: costs */}
        <CostsSection />
      </div>
    </div>
  )
}
