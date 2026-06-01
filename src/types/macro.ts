export type PurchaseStatus = 'first' | 'replacement' | 'investment'

export interface GlobalInputs {
  propertyValue: number
  equity: number
  purchaseStatus: PurchaseStatus
  /** Computed as propertyValue - equity, but user-overridable */
  mortgageAmount: number
}

export interface MacroForecasts {
  annualCPI: number
  annualPrimeChange: number
  annualUSDChange: number
  annualEURChange: number
  sofrRate: number
  euriborRate: number
  bankMarginUSD: number
  bankMarginEUR: number
}
