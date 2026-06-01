import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useMixStore, useMix } from '@/store/useMixStore'
import { ValidationField } from '@/components/ui/ValidationField'
import { validateLTV, MAX_LTV } from '@/utils/validation'
import { formatNumber } from '@/utils/format'
import type { MixId } from '@/types/mix'
import type { PurchaseStatus } from '@/types/macro'

// ---------------------------------------------------------------------------
// Purchase status config
// ---------------------------------------------------------------------------
const PURCHASE_OPTIONS: { value: PurchaseStatus; label: string; limit: number }[] = [
  { value: 'first',       label: 'דירה יחידה / ראשונה', limit: 75 },
  { value: 'replacement', label: 'דירה חליפית',          limit: 70 },
  { value: 'investment',  label: 'דירה להשקעה',          limit: 50 },
]

// ---------------------------------------------------------------------------
// NumberInput — shows formatted number when blurred, raw when focused
// ---------------------------------------------------------------------------
interface NumberInputProps {
  value:       number
  onChange:    (n: number) => void
  placeholder?: string
  hasError?:   boolean
}

function NumberInput({ value, onChange, placeholder, hasError = false }: NumberInputProps) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw]         = useState('')

  const handleFocus = () => {
    setFocused(true)
    setRaw(String(Math.round(value)))
  }

  const handleBlur = () => {
    setFocused(false)
    const parsed = parseInt(raw.replace(/\D/g, ''), 10)
    if (!isNaN(parsed) && parsed > 0) onChange(parsed)
    else onChange(value) // revert to previous if invalid
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRaw(e.target.value.replace(/\D/g, ''))
  }

  return (
    <div className="relative flex items-center">
      {/* ₪ prefix — left side, LTR-aligned */}
      <span className="absolute left-3 text-sm text-kumu-navy-light dark:text-kumu-blue-lighter pointer-events-none select-none">
        ₪
      </span>
      <input
        type="text"
        inputMode="numeric"
        dir="ltr"
        value={focused ? raw : formatNumber(Math.round(value))}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        placeholder={placeholder}
        className={[
          'w-full h-10 rounded-xl bg-transparent pl-7 pr-3 text-sm',
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
  const over  = ltv > limit
  const near  = ltv > limit * 0.9 && !over

  const bg = over  ? 'bg-red-50 dark:bg-red-900/20 text-kumu-error border-red-200 dark:border-red-800'
           : near  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-kumu-yellow border-amber-200 dark:border-amber-700'
           :         'bg-emerald-50 dark:bg-emerald-900/20 text-kumu-green border-emerald-200 dark:border-emerald-700'

  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${bg}`}>
      <span className="text-xs font-medium">אחוז מימון</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums">
          {ltv.toFixed(1)}%
        </span>
        <span className="text-xs opacity-70">/ מקס׳ {limit}%</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GlobalInputs
// ---------------------------------------------------------------------------
interface GlobalInputsProps {
  mixId: MixId
}

export function GlobalInputs({ mixId }: GlobalInputsProps) {
  const { globalInputs }      = useMix(mixId)
  const updateGlobalInputs    = useMixStore((s) => s.updateGlobalInputs)
  const [isManual, setIsManual] = useState(false)

  const { propertyValue, equity, purchaseStatus, mortgageAmount } = globalInputs
  const ltv      = propertyValue > 0 ? (mortgageAmount / propertyValue) * 100 : 0
  const maxLTV   = MAX_LTV[purchaseStatus]
  const ltvResult = validateLTV(ltv, purchaseStatus)

  // -------- handlers --------
  const setProperty = (v: number) => {
    updateGlobalInputs(mixId, {
      propertyValue: v,
      ...(!isManual && { mortgageAmount: v - equity }),
    })
  }

  const setEquity = (v: number) => {
    updateGlobalInputs(mixId, {
      equity: v,
      ...(!isManual && { mortgageAmount: propertyValue - v }),
    })
  }

  const setMortgage = (v: number) => {
    setIsManual(true)
    updateGlobalInputs(mixId, { mortgageAmount: v })
  }

  const resetMortgage = () => {
    setIsManual(false)
    updateGlobalInputs(mixId, { mortgageAmount: propertyValue - equity })
  }

  const setPurchaseStatus = (v: PurchaseStatus) => {
    updateGlobalInputs(mixId, { purchaseStatus: v })
  }

  // -------- render --------
  return (
    <div className="flex flex-col gap-4 p-4 bg-white dark:bg-kumu-surface-dark rounded-xl border border-gray-100 dark:border-kumu-navy-light">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue">
        נתוני הנכס
      </h2>

      {/* Property value */}
      <ValidationField result={{ status: 'ok' }} label="שווי הנכס">
        <NumberInput
          value={propertyValue}
          onChange={setProperty}
          placeholder="2,000,000"
        />
      </ValidationField>

      {/* Equity */}
      <ValidationField result={{ status: 'ok' }} label="הון עצמי">
        <NumberInput
          value={equity}
          onChange={setEquity}
          placeholder="600,000"
        />
      </ValidationField>

      {/* Purchase status */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-kumu-navy dark:text-kumu-blue-lighter">
          סטטוס רכישה
        </span>
        <select
          value={purchaseStatus}
          onChange={(e) => setPurchaseStatus(e.target.value as PurchaseStatus)}
          className={[
            'w-full h-10 rounded-xl border border-gray-200 dark:border-kumu-navy-light',
            'bg-white dark:bg-kumu-surface-dark px-3 text-sm',
            'text-kumu-navy dark:text-white outline-none',
            'focus:border-kumu-blue focus:ring-2 focus:ring-kumu-blue/20 transition-all',
          ].join(' ')}
        >
          {PURCHASE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} (עד {o.limit}%)
            </option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-100 dark:bg-kumu-navy-light" />

      {/* Mortgage amount — computed or manual */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-kumu-navy dark:text-kumu-blue-lighter">
            סכום המשכנתא
            {isManual && (
              <span className="mr-1.5 text-[10px] text-kumu-coral">(ידני)</span>
            )}
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
        <ValidationField result={ltvResult}>
          <NumberInput
            value={mortgageAmount}
            onChange={setMortgage}
            hasError={ltvResult.status === 'error'}
          />
        </ValidationField>
      </div>

      {/* LTV badge — always visible */}
      <LTVBadge ltv={ltv} limit={maxLTV} />

      {/* Regulation error message shown separately below badge */}
      {ltvResult.status === 'error' && ltvResult.message && (
        <p className="text-xs text-kumu-error leading-snug -mt-2">
          {ltvResult.message}
        </p>
      )}
    </div>
  )
}
