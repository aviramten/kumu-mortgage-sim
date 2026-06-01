// ---------------------------------------------------------------------------
// Core amortization helper functions
// ---------------------------------------------------------------------------

/**
 * Spitzer (equal-installment) payment formula:
 *   PMT = P × [r × (1+r)^n] / [(1+r)^n − 1]
 *
 * Edge cases:
 *  – r ≈ 0  → simple division  P / n
 *  – n = 0  → returns 0 (should not happen in normal flow)
 */
export function calculateSpitzerPMT(
  principal:   number,
  annualRate:  number,   // percent, e.g. 4.0 for 4 %
  months:      number,
): number {
  if (months <= 0) return 0
  const r = annualRate / 100 / 12
  if (r === 0) return principal / months
  const compound = Math.pow(1 + r, months)
  return (principal * r * compound) / (compound - 1)
}

/**
 * Monthly indexation factor from an annual percentage.
 *   factor = (1 + annualPct / 100) ^ (1/12)
 *
 * Examples:
 *   annualPct = 2.5  → ≈ 1.002063  (CPI)
 *   annualPct = 0    → 1.000000    (no indexation)
 */
export function monthlyIndexationFactor(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12)
}
