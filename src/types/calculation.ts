import type { TrackResult } from './track'

// ---------------------------------------------------------------------------
// KPI aggregates — six headline metrics for the KPI dashboard
// ---------------------------------------------------------------------------
export interface MixKPIs {
  /** Sum of all tracks' month-1 total payments */
  firstPayment: number
  /** Maximum combined monthly payment across all months */
  maxPayment: number
  /** Sum of every payment over the full loan life (rounded to ₪) */
  totalCost: number
  /** Sum of every interest_payment row (rounded to ₪) */
  totalInterest: number
  /** Sum of every inflation_component row (rounded to ₪) */
  totalIndexation: number
  /** totalCost ÷ total mortgage principal  (e.g. 1.48) */
  costPerShekel: number
  /** Total interest saved vs. no-prepayment baseline (0 when no prepayments) */
  prepaymentSavings: number
  /** Months eliminated from the longest track by prepayments (0 when no prepayments) */
  monthsSaved: number
  /**
   * Combined monthly payment in the first month where ALL standard grace
   * periods (partial / full) across all tracks have ended.
   * Equals firstPayment when no grace periods exist.
   * Used for PTI (Payment-to-Income) calculations — PRD §3.10.
   */
  firstNonGracePayment: number
}

// ---------------------------------------------------------------------------
// Full calculation result returned by calculateMix
// ---------------------------------------------------------------------------
export interface MixResult {
  trackResults: TrackResult[]
  kpis: MixKPIs
}
