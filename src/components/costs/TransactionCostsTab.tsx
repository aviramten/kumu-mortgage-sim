/**
 * TransactionCostsTab — standalone calculator for all ancillary purchase costs.
 * No automatic connection to the mixes; the equity callout is informational only.
 */

import { useState } from 'react'
import { Plus, X, ArrowLeftRight, Receipt } from 'lucide-react'
import { useCostsStore } from '@/store/useCostsStore'
import { useMix } from '@/store/useMixStore'
import { formatNumber } from '@/utils/format'
import type { CostRow } from '@/types/costs'

// ---------------------------------------------------------------------------
// Amount input cell
// Displays 0 as empty string (placeholder "0"), formats non-zero on blur.
// ---------------------------------------------------------------------------
function AmountInput({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw]         = useState('')

  return (
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      placeholder="0"
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
// Editable label input (for custom/non-fixed rows only)
// ---------------------------------------------------------------------------
function LabelInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
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
// Single cost row
// ---------------------------------------------------------------------------
interface CostRowItemProps {
  row:           CostRow
  onAmountChange: (id: string, amount: number) => void
  onLabelChange:  (id: string, label: string)  => void
  onDelete:       (id: string) => void
}

function CostRowItem({ row, onAmountChange, onLabelChange, onDelete }: CostRowItemProps) {
  return (
    <div className="grid items-center gap-3 px-4 py-2.5 group"
      style={{ gridTemplateColumns: '1fr 140px 32px' }}>
      {/* Label */}
      <div className="text-sm text-right">
        {row.isFixed ? (
          <span className="text-kumu-navy dark:text-white">{row.label}</span>
        ) : (
          <LabelInput
            value={row.label}
            onChange={(v) => onLabelChange(row.id, v)}
          />
        )}
      </div>

      {/* Amount */}
      <AmountInput
        value={row.amount}
        onChange={(v) => onAmountChange(row.id, v)}
      />

      {/* Delete — only for custom rows */}
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
// Main component
// ---------------------------------------------------------------------------
export function TransactionCostsTab() {
  const {
    rows,
    updateAmount,
    addRow,
    removeRow,
    updateLabel,
    totalCosts,
  } = useCostsStore()

  const mixA        = useMix('a')
  const [showCallout, setShowCallout] = useState(false)

  const total           = totalCosts()
  const equity          = mixA.globalInputs.equity
  const effectiveEquity = equity - total
  const equityShortfall = effectiveEquity < 0

  // Separator: insert a dashed divider between fixed rows and custom rows
  const lastFixedIdx = rows.reduce((last, r, i) => (r.isFixed ? i : last), -1)
  const hasCustomRows = rows.some((r) => !r.isFixed)

  return (
    <div className="flex-1 p-6 overflow-y-auto">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-kumu-blue/10 dark:bg-kumu-blue/20 flex items-center justify-center">
            <Receipt size={18} className="text-kumu-blue" />
          </div>
          <h1 className="text-xl font-semibold text-kumu-navy dark:text-white">
            הוצאות עסקה
          </h1>
        </div>
        <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter leading-relaxed">
          מחיר הדירה הוא רק חלק מהסיפור. כאן תוכלו למפות את כל ההוצאות הנלוות לפני שמגיעים לבנק.
        </p>
      </div>

      {/* ── Main card ─────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark shadow-sm overflow-hidden">

        {/* Column header */}
        <div
          className="grid items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-kumu-navy-dark/50 border-b border-gray-100 dark:border-kumu-navy-light"
          style={{ gridTemplateColumns: '1fr 140px 32px' }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter text-right">
            סעיף
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-kumu-navy-light dark:text-kumu-blue-lighter text-right">
            סכום (₪)
          </span>
          <span />
        </div>

        {/* Rows */}
        {rows.map((row, idx) => (
          <div key={row.id}>
            {/* Dashed separator before first custom row */}
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

        {/* Add row button */}
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

        {/* Total row */}
        <div
          className="grid items-center gap-3 px-4 py-3.5 bg-kumu-bg-light dark:bg-kumu-navy rounded-b-xl border-t-2 border-gray-100 dark:border-kumu-navy-light"
          style={{ gridTemplateColumns: '1fr 140px 32px' }}
        >
          <span className="text-sm font-semibold text-kumu-navy dark:text-white text-right">
            סה"כ הוצאות עסקה
          </span>
          <span
            className="text-xl font-bold text-kumu-navy dark:text-white tabular-nums text-right"
            dir="ltr"
          >
            {total === 0 ? '—' : `₪${formatNumber(total)}`}
          </span>
          <span />
        </div>
      </div>

      {/* ── Equity callout section ─────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto mt-5 flex flex-col items-center gap-3">
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
          <div
            className={[
              'w-full rounded-xl border p-5 text-sm leading-relaxed',
              equityShortfall
                ? 'border-kumu-coral/40 bg-kumu-coral/5 dark:bg-kumu-coral/10'
                : 'border-kumu-blue/20 dark:border-kumu-blue/30 bg-kumu-blue/5 dark:bg-kumu-blue/10',
            ].join(' ')}
          >
            <div className="flex flex-col gap-2 text-right">
              <div className="flex justify-between">
                <span className="tabular-nums font-medium text-kumu-navy dark:text-white" dir="ltr">
                  ₪{formatNumber(total)}
                </span>
                <span className="text-kumu-navy-light dark:text-kumu-blue-lighter">
                  הוצאות עסקה משוערות:
                </span>
              </div>

              <div className="flex justify-between">
                <span className="tabular-nums font-medium text-kumu-navy dark:text-white" dir="ltr">
                  ₪{formatNumber(equity)}
                </span>
                <span className="text-kumu-navy-light dark:text-kumu-blue-lighter">
                  הון עצמי בתמהיל א' (נוכחי):
                </span>
              </div>

              <div className="h-px bg-gray-200 dark:bg-kumu-navy-light/40 my-1" />

              <div className="flex justify-between items-center">
                <span
                  className={[
                    'tabular-nums text-base font-bold',
                    equityShortfall ? 'text-kumu-coral' : 'text-kumu-green',
                  ].join(' ')}
                  dir="ltr"
                >
                  ₪{formatNumber(effectiveEquity)}
                </span>
                <span className="text-kumu-navy dark:text-white font-medium">
                  → הון עצמי אפקטיבי:
                </span>
              </div>

              {equityShortfall && (
                <p className="text-xs text-kumu-coral mt-1">
                  הוצאות העסקה עולות על ההון העצמי שהוזן בתמהיל א'. שווה לבדוק את המספרים שוב.
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
