/**
 * fxTrack — helpers for FX-indexed loan tracks (USD and EUR).
 *
 * FX tracks work like CPI-linked tracks but use the relevant exchange-rate
 * change forecast instead of annualCPI.  The benchmark rate (SOFR / EURIBOR)
 * is updated every 12 months in the same way as prime/makam.
 */

import type { MacroForecasts } from '@/types/macro'

// ---------------------------------------------------------------------------
// Monthly FX indexation factor
// ---------------------------------------------------------------------------

/**
 * Returns the multiplicative factor applied to the loan balance each month
 * for a given annual FX change percentage.
 *
 * Example: annualChangePct = 3 → factor ≈ 1.002466  (balance grows 3%/yr)
 *          annualChangePct = 0 → factor = 1.0        (no FX movement)
 */
export function getMonthlyFxFactor(annualChangePct: number): number {
  return Math.pow(1 + annualChangePct / 100, 1 / 12)
}

// ---------------------------------------------------------------------------
// Effective FX-track annual rate at a given 1-based month
// ---------------------------------------------------------------------------

/**
 * For USD tracks: rate = SOFR_current + bankMarginUSD
 * For EUR tracks: rate = EURIBOR_current + bankMarginEUR
 *
 * SOFR / EURIBOR update every 12 months multiplicatively:
 *   baseRate_k = initialBase × (1 + annualChange/100)^k
 * where k = number of full 12-month periods elapsed.
 *
 * @param trackType    'usd' or 'eur'
 * @param initialRate  The track's annualRate at origination
 * @param month        Current month (1-based)
 * @param macro        Macro forecasts
 */
export function fxEffectiveRate(
  trackType:   'usd' | 'eur',
  initialRate: number,
  month:       number,
  macro:       MacroForecasts,
): number {
  const periodsElapsed = Math.floor((month - 1) / 12)

  if (trackType === 'usd') {
    const initialBase = initialRate - macro.bankMarginUSD
    const currentBase = initialBase * Math.pow(1 + macro.annualSOFRChange / 100, periodsElapsed)
    return currentBase + macro.bankMarginUSD
  } else {
    const initialBase = initialRate - macro.bankMarginEUR
    const currentBase = initialBase * Math.pow(1 + macro.annualEURIBORChange / 100, periodsElapsed)
    return currentBase + macro.bankMarginEUR
  }
}
