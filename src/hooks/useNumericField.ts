/**
 * useNumericField — shared behavior for every formatted numeric/currency
 * input in the app (₪ amounts, rates, months, years, %).
 *
 * Centralizes:
 *  - display formatting while blurred vs. raw digits while focused
 *    (the <input>'s `value` stays a controlled React prop throughout, so it
 *    is always in sync with what's rendered — there's no separate
 *    "display-only" layer that can drift from the real value)
 *  - select-all on focus, so clicking into a field with an existing value
 *    and typing REPLACES it instead of the new digits getting appended to
 *    the old ones (e.g. 22,000 + typing "4000" silently becoming 400,022,000)
 *  - optional non-blocking "does this look like a typo" warning for fields
 *    where an absurdly large value would otherwise flow straight into
 *    calculations unnoticed
 */
import { useState } from 'react'
import type { ChangeEvent, FocusEvent } from 'react'
import { useToastStore } from '@/store/useToastStore'
import { formatNumber } from '@/utils/format'

export interface UseNumericFieldOptions {
  value:    number
  onChange: (n: number) => void
  /** 'integer' (default) formats with thousand separators, digits only.
   *  'decimal' allows a single decimal point (rates, %). */
  format?:  'integer' | 'decimal'
  min?:     number
  max?:     number
  /** Values above this are still accepted, but trigger a warning toast. */
  maxReasonable?: number
  maxReasonableMessage?: (n: number) => string
  /** When true, an empty/zero/invalid entry reverts to the previous value
   *  instead of committing 0 — for fields where 0 isn't a meaningful state
   *  (e.g. property value, equity). Default false. */
  revertOnInvalid?: boolean
}

export interface NumericFieldBindings {
  value:   string
  onFocus: (e: FocusEvent<HTMLInputElement>) => void
  onBlur:  () => void
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}

export function useNumericField({
  value, onChange, format = 'integer', min, max, maxReasonable, maxReasonableMessage,
  revertOnInvalid = false,
}: UseNumericFieldOptions): NumericFieldBindings {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw]         = useState('')
  const showToast = useToastStore((s) => s.show)

  const displayValue = format === 'decimal'
    ? (value === 0 ? '' : String(value))
    : (value === 0 ? '' : formatNumber(Math.round(value)))

  return {
    value: focused ? raw : displayValue,

    onFocus: (e) => {
      setFocused(true)
      setRaw(value === 0 ? '' : String(value))
      // Deferred so the selection is applied to the raw (unformatted) value
      // React is about to commit, not the formatted display being replaced.
      const el = e.currentTarget
      requestAnimationFrame(() => el.select())
    },

    onBlur: () => {
      setFocused(false)
      let n = format === 'decimal' ? parseFloat(raw) : parseInt(raw.replace(/\D/g, ''), 10)
      if (isNaN(n) || (revertOnInvalid && n <= 0)) {
        onChange(value)
        return
      }
      if (min !== undefined) n = Math.max(min, n)
      if (max !== undefined) n = Math.min(max, n)
      if (maxReasonable !== undefined && n > maxReasonable) {
        showToast({
          message: maxReasonableMessage
            ? maxReasonableMessage(n)
            : `הערך שהוזן (${formatNumber(n)}) גבוה במיוחד — כדאי לוודא שזה הסכום הנכון.`,
          variant: 'yellow',
        })
      }
      onChange(n)
    },

    onChange: (e) => {
      // 'decimal' keeps a leading "-" so negative deltas (e.g. a forecast
      // rate decrease) can be typed at all — parseFloat on blur handles the
      // rest, a stray "-" elsewhere in the string just gets ignored.
      const v = format === 'decimal'
        ? e.target.value.replace(/[^\d.-]/g, '')
        : e.target.value.replace(/\D/g, '')
      setRaw(v)
    },
  }
}
