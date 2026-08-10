export type PurchaseStatus = 'first' | 'replacement' | 'investment'

export interface GlobalInputs {
  propertyValue: number
  equity: number
  purchaseStatus: PurchaseStatus
  /** Computed as propertyValue - equity, but user-overridable */
  mortgageAmount: number
}

/**
 * A single point on a rate-change schedule.
 *
 * `period` is a 1-based index whose meaning depends on the schedule:
 *  - prime / makam schedules: number of full years elapsed since origination
 *  - variable-linked/unlinked schedules: update-station index (1 = first reset)
 *
 * `cumulativeDelta` is the total % change from the track's origination rate
 * that applies from this period onward, until superseded by a later point
 * (step function — no interpolation). Periods not covered by any point use
 * a cumulative delta of 0.
 */
export interface RateSchedulePoint {
  period: number
  cumulativeDelta: number
}

export interface MacroForecasts {
  annualCPI: number
  /** Prime-rate cumulative change schedule, replaces the old linear annualPrimeChange */
  primeChangeSchedule: RateSchedulePoint[]
  /** מק"מ cumulative change schedule (separate from prime) */
  makamChangeSchedule: RateSchedulePoint[]
  /** מ"צ/מל"צ cumulative change schedule, indexed by update station rather than year */
  variableRateChangeSchedule: RateSchedulePoint[]
  annualUSDChange: number
  annualEURChange: number
  sofrRate: number
  euriborRate: number
  bankMarginUSD: number
  bankMarginEUR: number
  /** Annual % change forecast for SOFR rate (Stage 4b) */
  annualSOFRChange: number
  /** Annual % change forecast for EURIBOR rate (Stage 4b) */
  annualEURIBORChange: number
}
