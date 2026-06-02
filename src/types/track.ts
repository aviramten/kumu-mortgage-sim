// ---------------------------------------------------------------------------
// Track type definitions — 9 loan track types per PRD section 3.4
// ---------------------------------------------------------------------------

export type TrackType =
  | 'prime'             // פריים — ריבית הפריים + מרווח
  | 'fixed-unlinked'    // קל"צ — קבועה לא צמודה
  | 'fixed-linked'      // ק"צ  — קבועה צמודה למדד
  | 'variable-linked'   // מ"צ  — משתנה צמודה
  | 'variable-unlinked' // מל"צ — משתנה לא צמודה
  | 'eligibility'       // זכאות ק"צ
  | 'variable-makam'    // משתנה מק"מ (לאומי) — מתעדכן כל 12 חודשים
  | 'usd'               // צמודת דולר ($) — SOFR-based
  | 'eur'               // צמודת יורו (€) — EURIBOR-based

export type AmortizationSchedule = 'spitzer' | 'equalPrincipal'

export type GraceType =
  | 'none'
  | 'partial'          // גרייס חלקי — ריבית בלבד
  | 'full'             // גרייס מלא  — ריבית נצברת לקרן
  | 'balloon-partial'  // בלון חלקי  — ריבית בלבד, קרן בסוף
  | 'balloon-full'     // בלון מלא   — הכל בסוף (ריבית דריבית)

export type PrepaymentMode = 'shortenTerm' | 'reducePayment'

/** Months between interest rate resets — for variable track types */
export type RateChangePeriod = 18 | 24 | 36 | 60 | 84 | 120

// ---------------------------------------------------------------------------
// Loan track
// ---------------------------------------------------------------------------
export interface LoanTrack {
  id: string
  type: TrackType
  amount: number                 // ₪, integer, ≥ 10,000
  months: number                 // 48–360, integer
  annualRate: number             // % annual
  schedule: AmortizationSchedule
  /** Only relevant for variable-linked and variable-unlinked tracks */
  rateChangePeriod?: RateChangePeriod
  graceType: GraceType
  graceMonths: number            // 0 when graceType === 'none'
  /** Reserved for future fee support — PRD section 3.6 */
  earlyRepaymentFee: null
  feeCalculationMethod: null
}

// ---------------------------------------------------------------------------
// Prepayment event
// ---------------------------------------------------------------------------
export interface PrepaymentEvent {
  id: string
  month: number
  amount: number
  trackId: string
  mode: PrepaymentMode
}

// ---------------------------------------------------------------------------
// Engine output types — populated in Stage 4
// ---------------------------------------------------------------------------
export interface MonthlyRow {
  month: number
  openingBalance: number
  indexedBalance: number
  interestPayment: number
  principalPayment: number
  inflationComponent: number
  totalPayment: number
  closingBalance: number
}

export interface TrackResult {
  trackId: string
  rows: MonthlyRow[]
  totalInterest: number
  totalIndexation: number
  totalPayment: number
  effectiveMonths: number
}
