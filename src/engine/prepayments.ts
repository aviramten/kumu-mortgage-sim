/**
 * prepayments.ts — Early repayment event helpers (PRD §4.5).
 *
 * Two modes:
 *  shortenTerm   — reduce balance; keep same PMT; stop early when balance = 0
 *  reducePayment — reduce balance; recalculate PMT for the same remaining months
 */

import type { PrepaymentEvent } from '@/types/track'

// ---------------------------------------------------------------------------
// Look up any prepayment for the current month and track
// ---------------------------------------------------------------------------
export function findPrepayment(
  prepayments: PrepaymentEvent[],
  month:       number,
): PrepaymentEvent | undefined {
  return prepayments.find((p) => p.month === month)
}

// ---------------------------------------------------------------------------
// Apply prepayment to the current balance
// Returns the reduced balance and the effective mode.
// ---------------------------------------------------------------------------
export function applyPrepaymentBalance(
  balance:    number,
  event:      PrepaymentEvent,
): number {
  return Math.max(0, balance - event.amount)
}

// ---------------------------------------------------------------------------
// Spitzer PMT helper (duplicated here to avoid circular dep on calculateTrack)
// ---------------------------------------------------------------------------
export function spitzerPMTForPrepayment(
  principal:   number,
  monthlyRate: number,
  months:      number,
): number {
  if (months <= 0) return 0
  if (monthlyRate === 0) return principal / months
  const compound = Math.pow(1 + monthlyRate, months)
  return (principal * monthlyRate * compound) / (compound - 1)
}
