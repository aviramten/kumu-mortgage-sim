/**
 * calculateTrack — pure financial engine for a single loan track.
 *
 * Stage 4b: handles all 9 track types, 5 grace types, and prepayments
 * (shortenTerm + reducePayment).
 *
 * Rounding rule (PRD §4.0):
 *   All intermediate calculations run at full IEEE-754 precision.
 *   roundMoney() is called ONLY when pushing to output rows or returning totals.
 *   The `balance` variable carried between loop iterations is NEVER rounded.
 */

import type { LoanTrack, PrepaymentEvent, MonthlyRow, TrackResult } from '@/types/track'
import type { MacroForecasts } from '@/types/macro'
import { roundMoney } from '@/utils/format'
import {
  applyPartialGrace,
  applyFullGrace,
  applyBalloonPartial,
  applyBalloonFull,
} from './grace'
import { findPrepayment, applyPrepaymentBalance, spitzerPMTForPrepayment } from './prepayments'
import { getMonthlyFxFactor, fxEffectiveRate } from './fxTrack'

// ---------------------------------------------------------------------------
// Track type helpers
// ---------------------------------------------------------------------------

/** Track types whose principal is indexed to CPI each month */
const CPI_LINKED = new Set<LoanTrack['type']>([
  'fixed-linked',
  'variable-linked',
  'eligibility',
])

/** Track types whose principal is indexed to an FX rate each month */
const FX_LINKED = new Set<LoanTrack['type']>(['usd', 'eur'])

/** Balloon grace types — normal amortisation loop is suppressed */
const BALLOON_TYPES = new Set<LoanTrack['graceType']>([
  'balloon-partial',
  'balloon-full',
])

/**
 * How often (in months) the interest rate resets for variable tracks.
 * Returns null for fixed-rate tracks (rate never changes).
 */
function rateChangePeriodFor(track: LoanTrack): number | null {
  switch (track.type) {
    case 'prime':
    case 'variable-makam':
      return 12
    case 'variable-linked':
    case 'variable-unlinked':
      return track.rateChangePeriod ?? 60
    default:
      return null   // fixed rate
  }
}

/**
 * Effective annual rate at a given 1-based month.
 *
 * For FX tracks, delegates to fxEffectiveRate.
 * For variable shekel tracks, the rate increments by annualPrimeChange per year elapsed.
 */
function effectiveAnnualRate(
  track: LoanTrack,
  month: number,
  macro: MacroForecasts,
): number {
  if (track.type === 'usd' || track.type === 'eur') {
    return fxEffectiveRate(track.type, track.annualRate, month, macro)
  }

  const period = rateChangePeriodFor(track)
  if (period === null) return track.annualRate

  const periodsElapsed = Math.floor((month - 1) / period)
  const yearsElapsed   = periodsElapsed * (period / 12)
  return track.annualRate + yearsElapsed * macro.annualPrimeChange
}

// ---------------------------------------------------------------------------
// Spitzer PMT helper (module-local)
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

export function calculateTrack(
  track:       LoanTrack,
  macro:       MacroForecasts,
  prepayments: PrepaymentEvent[] = [],
): TrackResult {
  const { id, months, schedule } = track

  // -- Indexation factors ---------------------------------------------------
  const isCpiLinked = CPI_LINKED.has(track.type)
  const isFxLinked  = FX_LINKED.has(track.type)

  const cpiMonthlyFactor = isCpiLinked
    ? Math.pow(1 + macro.annualCPI / 100, 1 / 12)
    : 1.0

  // For FX tracks the monthly factor is derived each month from the annual FX change
  const fxAnnualChangePct = track.type === 'usd'
    ? macro.annualUSDChange
    : track.type === 'eur'
      ? macro.annualEURChange
      : 0

  const fxMonthlyFactor = isFxLinked ? getMonthlyFxFactor(fxAnnualChangePct) : 1.0

  const indexFactor = isCpiLinked ? cpiMonthlyFactor : isFxLinked ? fxMonthlyFactor : 1.0

  // -- Grace period setup ---------------------------------------------------
  const isBalloon      = BALLOON_TYPES.has(track.graceType)
  const graceMonths    = track.graceType === 'none' ? 0 : track.graceMonths
  const effectiveTotal = isBalloon ? months : months  // total months unchanged

  // -- Balloon pre-computation: compounded balance at start of amortisation -
  // For balloon-full the balance grows each month (interest accrues); for
  // balloon-partial it stays flat.  We simulate the grace/balloon period
  // through the main loop and let the row output handle it naturally.

  const rows: MonthlyRow[] = []

  let balance         = track.amount
  let totalInterest   = 0
  let totalIndexation = 0
  let totalCost       = 0
  let effectiveMonths = 0

  // shortenTerm: frozen PMT captured at first prepayment
  let frozenPMT: number | null = null

  for (let i = 0; i < effectiveTotal; i++) {
    const month     = i + 1
    const isLastMonth = (i === effectiveTotal - 1)

    if (balance < 0.005) break
    effectiveMonths = month

    const openingBalance = balance

    // ── 1. Apply indexation (CPI or FX) ─────────────────────────────────
    const indexedBalance     = openingBalance * indexFactor
    const inflationComponent = indexedBalance - openingBalance

    // ── 2. Current effective rate ─────────────────────────────────────────
    const annualRate  = effectiveAnnualRate(track, month, macro)
    const monthlyRate = annualRate / 100 / 12

    // ── 3. Determine if we are in a grace phase ───────────────────────────
    const inGrace = month <= graceMonths

    let interestPayment:  number
    let principalPayment: number
    let monthlyTotal:     number
    let newBalance:       number

    if (isBalloon) {
      // --- Balloon modes: no standard amortisation at all ------------------
      if (track.graceType === 'balloon-partial') {
        const g = applyBalloonPartial(indexedBalance, monthlyRate, isLastMonth)
        interestPayment  = g.interestPayment
        principalPayment = g.principalPayment
        monthlyTotal     = g.payment
        newBalance       = g.newBalance
      } else {
        // balloon-full
        const g = applyBalloonFull(indexedBalance, monthlyRate, isLastMonth)
        interestPayment  = g.interestPayment
        principalPayment = g.principalPayment
        monthlyTotal     = g.payment
        newBalance       = g.newBalance
      }
    } else if (inGrace) {
      // --- Standard grace period -------------------------------------------
      if (track.graceType === 'partial') {
        const g = applyPartialGrace(indexedBalance, monthlyRate)
        interestPayment  = g.interestPayment
        principalPayment = g.principalPayment
        monthlyTotal     = g.payment
        newBalance       = g.newBalance
      } else {
        // full grace
        const g = applyFullGrace(indexedBalance, monthlyRate)
        interestPayment  = g.interestPayment
        principalPayment = g.principalPayment
        monthlyTotal     = g.payment
        newBalance       = g.newBalance
      }
    } else {
      // --- Normal amortisation ---------------------------------------------
      const remainingMonths = effectiveTotal - i   // months including this one

      if (schedule === 'spitzer') {
        // Use frozen PMT if shortenTerm is in effect
        const pmt =
          frozenPMT !== null
            ? frozenPMT
            : spitzerPMT(indexedBalance, monthlyRate, remainingMonths)

        interestPayment  = indexedBalance * monthlyRate
        principalPayment = pmt - interestPayment
        monthlyTotal     = pmt
      } else {
        // equalPrincipal
        principalPayment = indexedBalance / remainingMonths
        interestPayment  = indexedBalance * monthlyRate
        monthlyTotal     = principalPayment + interestPayment
      }

      newBalance = indexedBalance - principalPayment

      // Final-month correction
      if (newBalance < 0.005 || isLastMonth) {
        principalPayment = indexedBalance
        monthlyTotal     = principalPayment + interestPayment
        newBalance       = 0
      }
    }

    // ── 4. Apply prepayment (if any) ──────────────────────────────────────
    const prepayment = findPrepayment(prepayments, month)
    if (prepayment && newBalance > 0.005) {
      const balanceBefore = newBalance

      if (prepayment.mode === 'shortenTerm') {
        // Capture frozen PMT BEFORE reducing balance
        if (frozenPMT === null) {
          const remainingAfterThis = effectiveTotal - i - 1
          frozenPMT = spitzerPMTForPrepayment(balanceBefore, monthlyRate, remainingAfterThis)
        }
        newBalance = applyPrepaymentBalance(balanceBefore, prepayment)
      } else {
        // reducePayment — recalculate PMT for same remaining months
        newBalance  = applyPrepaymentBalance(balanceBefore, prepayment)
        frozenPMT   = null  // clear any previous frozen PMT; next month recalculates
      }

      // Add prepayment amount to principal this month
      principalPayment += balanceBefore - newBalance
      monthlyTotal     += balanceBefore - newBalance
    }

    // ── 5. Accumulate running totals ──────────────────────────────────────
    totalInterest   += interestPayment
    totalIndexation += inflationComponent
    totalCost       += monthlyTotal

    // ── 6. Push row (rounding only here) ─────────────────────────────────
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

    // ── 7. Carry unrounded balance ────────────────────────────────────────
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
