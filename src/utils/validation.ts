import type { PurchaseStatus } from '@/types/macro'
import {
  MAX_LTV_FIRST_HOME,
  MAX_LTV_INVESTMENT,
  MAX_LTV_REPLACEMENT,
  MIN_LOAN_MONTHS,
  MAX_LOAN_MONTHS,
  MIN_TRACK_AMOUNT,
} from '@/utils/constants'

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------
export type ValidationStatus = 'ok' | 'warning' | 'error'

export interface ValidationResult {
  status: ValidationStatus
  message?: string
}

export interface ValidationRule {
  /** Returns true when this rule is violated */
  check: (value: number) => boolean
  status: ValidationStatus
  /** KUMU-tone message — full sentence, no exclamation marks */
  message: string
}

/**
 * Evaluates rules in order (put errors before warnings).
 * Returns the first violated rule, or { status: 'ok' } if all pass.
 */
export const validateField = (
  value: number,
  rules: ValidationRule[],
): ValidationResult => {
  for (const rule of rules) {
    if (rule.check(value)) {
      return { status: rule.status, message: rule.message }
    }
  }
  return { status: 'ok' }
}

// ---------------------------------------------------------------------------
// Bank of Israel LTV regulation
// ---------------------------------------------------------------------------
export const MAX_LTV: Record<PurchaseStatus, number> = {
  first:       MAX_LTV_FIRST_HOME,
  replacement: MAX_LTV_REPLACEMENT,
  investment:  MAX_LTV_INVESTMENT,
}

export const validateLTV = (
  ltv: number,
  purchaseStatus: PurchaseStatus,
): ValidationResult => {
  const limit = MAX_LTV[purchaseStatus]
  if (ltv > limit) {
    return {
      status:  'error',
      message: `אחוז המימון חורג ממגבלת בנק ישראל לסטטוס זה (${limit}%) — יש להגדיל את ההון העצמי או להקטין את סכום המשכנתא`,
    }
  }
  return { status: 'ok' }
}

// ---------------------------------------------------------------------------
// Macro forecast range warnings
// ---------------------------------------------------------------------------
export const validateCPI = (value: number): ValidationResult =>
  validateField(value, [
    {
      check:   (v) => v < 0 || v > 20,
      status:  'error',
      message: 'תחזית האינפלציה חורגת מהטווח הפיזי הסביר',
    },
    {
      check:   (v) => v < 0 || v > 5,
      status:  'warning',
      message: 'תחזית האינפלציה חורגת מהטווח ההיסטורי המקובל (0%–5%) — שווה לוודא שזה הערך המכוון',
    },
  ])

export const validatePrimeChange = (value: number): ValidationResult =>
  validateField(value, [
    {
      check:   (v) => v < -3 || v > 10,
      status:  'error',
      message: 'שינוי ריבית הפריים חורג מהטווח הפיזי הסביר',
    },
    {
      check:   (v) => v < -1 || v > 3,
      status:  'warning',
      message: 'שינוי ריבית הפריים חורג מהטווח הסביר (−1% עד +3%) — שווה לוודא שזה הערך המכוון',
    },
  ])

export const validateFXChange = (value: number): ValidationResult =>
  validateField(value, [
    {
      check:   (v) => v < -20 || v > 20,
      status:  'error',
      message: 'שינוי שע"ח חורג מהטווח המותר (−20% עד +20%)',
    },
  ])

// ---------------------------------------------------------------------------
// Track-level validations (used in Stage 3)
// ---------------------------------------------------------------------------
export const validateTrackMonths = (value: number): ValidationResult =>
  validateField(value, [
    {
      check:   (v) => !Number.isInteger(v) || v < MIN_LOAN_MONTHS || v > MAX_LOAN_MONTHS,
      status:  'error',
      message: `תקופת המסלול חייבת להיות מספר שלם בין ${MIN_LOAN_MONTHS} ל-${MAX_LOAN_MONTHS} חודשים`,
    },
  ])

export const validateTrackAmount = (value: number): ValidationResult =>
  validateField(value, [
    {
      check:   (v) => v < MIN_TRACK_AMOUNT || !Number.isInteger(v),
      status:  'error',
      message: `סכום המסלול חייב להיות מספר שלם של לפחות ${MIN_TRACK_AMOUNT.toLocaleString('he-IL')} ₪`,
    },
  ])

export const validateAnnualRate = (value: number): ValidationResult =>
  validateField(value, [
    {
      check:   (v) => v <= 0,
      status:  'error',
      message: 'ריבית שנתית חייבת להיות גדולה מאפס',
    },
    {
      check:   (v) => v > 25,
      status:  'warning',
      message: `ריבית של ${value.toFixed(2)}% היא גבוהה במיוחד — שווה לוודא שזה המספר הנכון`,
    },
  ])
