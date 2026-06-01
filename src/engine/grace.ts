/**
 * grace.ts — Grace period and balloon payment helpers.
 *
 * Grace types (PRD §4.4):
 *
 *  partial        — Interest-only payments during grace. Principal unchanged.
 *  full           — No payments. Interest accrues into principal each month.
 *  balloon-partial — Interest-only throughout ENTIRE term; full principal on last month.
 *  balloon-full   — No payments throughout; all principal + compounded interest last month.
 *
 * For CPI-linked / FX-linked tracks the balance is indexed FIRST, then grace logic applies.
 */

export type GraceResult = {
  /** Payment made this month (0 for full grace, interest-only for partial) */
  payment: number
  /** Balance to carry into the next month */
  newBalance: number
  /** Interest component (for row output) */
  interestPayment: number
  /** Principal payment this month (0 during grace) */
  principalPayment: number
}

// ---------------------------------------------------------------------------
// Partial grace — pay interest only, principal unchanged
// ---------------------------------------------------------------------------
export function applyPartialGrace(
  indexedBalance: number,
  monthlyRate:    number,
): GraceResult {
  const interestPayment  = indexedBalance * monthlyRate
  return {
    payment:          interestPayment,
    newBalance:       indexedBalance,
    interestPayment,
    principalPayment: 0,
  }
}

// ---------------------------------------------------------------------------
// Full grace — nothing paid, interest rolls into principal
// ---------------------------------------------------------------------------
export function applyFullGrace(
  indexedBalance: number,
  monthlyRate:    number,
): GraceResult {
  const interestPayment = indexedBalance * monthlyRate
  // Interest accrues (capitalised) — no payment at all
  return {
    payment:          0,
    newBalance:       indexedBalance + interestPayment,
    interestPayment,
    principalPayment: 0,
  }
}

// ---------------------------------------------------------------------------
// Balloon-partial — interest only every month, full principal on last month
// ---------------------------------------------------------------------------
export function applyBalloonPartial(
  indexedBalance: number,
  monthlyRate:    number,
  isLastMonth:    boolean,
): GraceResult {
  const interestPayment = indexedBalance * monthlyRate
  if (isLastMonth) {
    return {
      payment:          interestPayment + indexedBalance,
      newBalance:       0,
      interestPayment,
      principalPayment: indexedBalance,
    }
  }
  return {
    payment:          interestPayment,
    newBalance:       indexedBalance,
    interestPayment,
    principalPayment: 0,
  }
}

// ---------------------------------------------------------------------------
// Balloon-full — nothing paid at all; giant lump sum on last month
// ---------------------------------------------------------------------------
/**
 * During the loan, no payments are made.
 * Interest accrues (capitalises) each month.
 * On the final month the entire accumulated balance is paid.
 */
export function applyBalloonFull(
  indexedBalance: number,
  monthlyRate:    number,
  isLastMonth:    boolean,
): GraceResult {
  const interestPayment = indexedBalance * monthlyRate
  if (isLastMonth) {
    const totalDue = indexedBalance + interestPayment
    return {
      payment:          totalDue,
      newBalance:       0,
      interestPayment,
      principalPayment: indexedBalance,
    }
  }
  // Accrue; no payment
  return {
    payment:          0,
    newBalance:       indexedBalance + interestPayment,
    interestPayment,
    principalPayment: 0,
  }
}
