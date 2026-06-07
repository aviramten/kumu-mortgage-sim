/**
 * calculatePTI — Payment-to-Income ratio calculator.
 *
 * PRD §3.10: PTI = relevantPayment / disposableIncome × 100
 * where relevantPayment = Math.max(firstPayment, firstNonGracePayment).
 *
 * Thresholds (Bank of Israel guideline):
 *   ≤ 33%  → ok      (comfortable range)
 *   ≤ 40%  → warning (approaching limit)
 *   > 40%  → exceeds (above accepted limit)
 */

import type { MixKPIs } from '@/types/calculation'

export interface PTIResult {
  disposableIncome: number
  relevantPayment:  number   // Math.max(firstPayment, firstNonGracePayment)
  ptiRatio:         number   // 0–∞ (percentage, e.g. 26.7)
  status:           'ok' | 'warning' | 'exceeds'
  label:            string   // KUMU-tone explanation
}

export function calculatePTI(
  disposableIncome: number,
  mixKPIs: MixKPIs,
): PTIResult {
  if (disposableIncome <= 0) {
    return {
      disposableIncome: 0,
      relevantPayment:  0,
      ptiRatio:         0,
      status:           'ok',
      label:            'הזינו נתוני הכנסות כדי לחשב את יחס ההחזר.',
    }
  }

  const relevantPayment = Math.max(mixKPIs.firstPayment, mixKPIs.firstNonGracePayment)
  const ptiRatio        = (relevantPayment / disposableIncome) * 100

  let status: PTIResult['status']
  let label:  string

  if (ptiRatio <= 33) {
    status = 'ok'
    label  = `יחס ההחזר עומד על ${ptiRatio.toFixed(1)}% — בטווח הנוח. יש מרווח פיננסי סביר.`
  } else if (ptiRatio <= 40) {
    status = 'warning'
    label  = `יחס ההחזר עומד על ${ptiRatio.toFixed(1)}% — קרוב לגבול המקובל של 40%. שווי לבחון אם יש גמישות בגובה המשכנתא או בתקופה.`
  } else {
    status = 'exceeds'
    label  = `יחס ההחזר עומד על ${ptiRatio.toFixed(1)}% — חורג מהגבול המקובל של 40%. בנקים רבים יתקשו לאשר משכנתא בתנאים אלה.`
  }

  return { disposableIncome, relevantPayment, ptiRatio, status, label }
}
