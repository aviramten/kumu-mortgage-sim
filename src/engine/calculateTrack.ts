/**
 * calculateTrack — pure financial engine for a single loan track.
 *
 * Stage 4a: handles all 5 shekel track types (prime, fixed-unlinked,
 * fixed-linked, variable-linked, variable-unlinked) plus eligibility
 * and variable-makam.  Grace periods and prepayments are Stage 4b.
 *
 * Rounding rule (PRD §4.0):
 *   All intermediate calculations run at full IEEE-754 precision.
 *   roundMoney() is called ONLY when writing a row to the output array.
 *   The `balance` variable carried between iterations is NEVER rounded.
 */

import type { LoanTrack, PrepaymentEvent, MonthlyRow, TrackResult } from '@/types/track'
import type { MacroForecasts } from '@/types/macro'
import { roundMoney } from '@/utils/format'

// ---------------------------------------------------------------------------
// Track type helpers
// ---------------------------------------------------------------------------

/** Track types whose principal is indexed to CPI each month */
const CPI_LINKED = new Set<LoanTrack['type']>(['fixed-linked', 'variable-linked'])

/**
 * How often (in months) the interest rate resets for variable tracks.
 * Returns null for fixed-rate tracks (rate never changes).
 */
function rateChangePeriodFor(track: LoanTrack): number | null {
  switch (track.type) {
    case 'prime':              return 12
    case 'variable-makam':     return 12
    case 'variable-linked':
    case 'variable-unlinked':  return track.rateChangePeriod ?? 60
    default:                   return null   // fixed rate
  }
}

/**
 * Effective annual rate at a given 1-based month.
 *
 * For variable tracks, the rate increments by annualPrimeChange per year
 * elapsed since the loan started.  The first reset happens after one full
 * period; before that the initial rate applies.
 *
 * Example: period = 24, month 24 → periodsElapsed = 0 (no change yet)
 *                        month 25 → periodsElapsed = 1 (first reset)
 */
function effectiveAnnualRate(
  track:  LoanTrack,
  month:  number,          // 1-based
  macro:  MacroForecasts,
): number {
  const period = rateChangePeriodFor(track)
  if (period === null) return track.annualRate

  const periodsElapsed = Math.floor((month - 1) / period)
  const yearsElapsed   = periodsElapsed * (period / 12)
  return track.annualRate + yearsElapsed * macro.annualPrimeChange
}

// ---------------------------------------------------------------------------
// Spitzer PMT helper (module-local, not exported — use amortization.ts for tests)
// ---------------------------------------------------------------------------
function spitzerPMT(principal: number, monthlyRate: number, months: number): number {
  if (months <= 0) return 0
  if (monthlyRate === 0) return principal / months
  const compound = Math.pow(1 + monthlyRate, months)
  return (principal * monthlyRate * compound) / (compound - 1)
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Calculate the full amortisation schedule for a single loan track.
 *
 * @param track       - the loan track to calculate
 * @param macro       - macro-economic forecasts (CPI, prime change, …)
 * @param _prepayments - reserved for Stage 4b; ignored here
 */
export function calculateTrack(
  track:        LoanTrack,
  macro:        MacroForecasts,
  _prepayments: PrepaymentEvent[] = [],
): TrackResult {
  const { id, months, schedule } = track

  const isCpiLinked      = CPI_LINKED.has(track.type)
  const cpiMonthlyFactor = isCpiLinked
    ? Math.pow(1 + macro.annualCPI / 100, 1 / 12)
    : 1.0

  const rows: MonthlyRow[] = []

  // --- full-precision working balance (NEVER rounded mid-loop) ---
  let balance = track.amount

  // Running totals at full precision; rounded once when returned
  let totalInterest   = 0
  let totalIndexation = 0
  let totalCost       = 0
  let effectiveMonths = 0

  for (let i = 0; i < months; i++) {
    const month     = i + 1
    const remaining = months - i   // months remaining including this one

    if (balance < 0.005) break
    effectiveMonths = month

    const openingBalance = balance

    // ── 1. Apply CPI indexation at start of month (PRD §4.2 step 2) ──────
    const indexedBalance     = openingBalance * cpiMonthlyFactor
    const inflationComponent = indexedBalance - openingBalance

    // ── 2. Current effective rate (handles rate-change stations) ──────────
    const annualRate  = effectiveAnnualRate(track, month, macro)
    const monthlyRate = annualRate / 100 / 12

    // ── 3. Payment amounts (full precision) ───────────────────────────────
    let interestPayment:  number
    let principalPayment: number
    let monthlyTotal:     number

    if (schedule === 'spitzer') {
      // For indexed tracks PMT is recalculated from the current indexed balance
      // each month (PRD §4.2 step 3).  For non-indexed constant-rate tracks
      // the formula produces the same PMT every iteration — mathematically
      // equivalent to computing it once.
      const pmt    = spitzerPMT(indexedBalance, monthlyRate, remaining)
      interestPayment  = indexedBalance * monthlyRate
      principalPayment = pmt - interestPayment
      monthlyTotal     = pmt
    } else {
      // equalPrincipal: fixed principal slice of the CURRENT indexed balance
      principalPayment = indexedBalance / remaining
      interestPayment  = indexedBalance * monthlyRate
      monthlyTotal     = principalPayment + interestPayment
    }

    // ── 4. Closing balance (full precision for next iteration) ────────────
    let newBalance = indexedBalance - principalPayment

    // ── 5. Final-month correction — guarantee exact closure ───────────────
    if (newBalance < 0.005 || i === months - 1) {
      principalPayment = indexedBalance
      monthlyTotal     = principalPayment + interestPayment
      newBalance       = 0
    }

    // Accumulate at full precision
    totalInterest   += interestPayment
    totalIndexation += inflationComponent
    totalCost       += monthlyTotal

    // ── 6. Push row — rounding happens here and only here (PRD §4.0) ──────
    rows.push({
      month,
      openingBalance:     roundMoney(openingBalance),
      indexedBalance:     roundMoney(indexedBalance),
      interestPayment:    roundMoney(interestPayment),
      principalPayment:   roundMoney(principalPayment),
      inflationComponent: roundMoney(inflationComponent),
      totalPayment:       roundMoney(monthlyTotal),
      closingBalance:     roundMoney(newBalance),
    })

    // ── 7. Carry UNROUNDED balance to next iteration ──────────────────────
    balance = newBalance
    if (newBalance < 0.005) break
  }

  return {
    trackId:         id,
    rows,
    totalInterest:   roundMoney(totalInterest),
    totalIndexation: roundMoney(totalIndexation),
    totalPayment:    roundMoney(totalCost),
    effectiveMonths,
  }
}
