export type TrackType =
  | 'prime'
  | 'fixed-unlinked'
  | 'fixed-linked'
  | 'variable-linked'
  | 'variable-unlinked'
  | 'eligibility'
  | 'variable-makam'
  | 'usd'
  | 'eur'

export type AmortizationSchedule = 'spitzer' | 'equalPrincipal'

export type GraceType = 'none' | 'partial' | 'full' | 'balloon-partial' | 'balloon-full'

export type PrepaymentMode = 'shortenTerm' | 'reducePayment'

export interface PrepaymentEvent {
  id: string
  month: number
  amount: number
  trackId: string
  mode: PrepaymentMode
}

export interface LoanTrack {
  id: string
  type: TrackType
  amount: number
  months: number
  annualRate: number
  schedule: AmortizationSchedule
  /** For variable tracks — months between rate resets */
  rateChangePeriod?: 18 | 24 | 36 | 60 | 84 | 120
  graceType: GraceType
  graceMonths: number
  /** Placeholder for future fee support */
  earlyRepaymentFee: null
  feeCalculationMethod: null
}

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
