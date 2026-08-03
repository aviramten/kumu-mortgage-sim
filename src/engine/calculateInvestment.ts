/**
 * calculateInvestment — compound-interest investment engine.
 *
 * Formula (monthly compounding):
 *   monthlyFactor = (1 + annualReturn / 100) ^ (1/12)
 *   balance       = (balance + monthlyDeposit) * monthlyFactor * (1 − monthlyFeeRate)
 *
 * Capital-gains tax: applied only to the PROFIT (not the principal deposits).
 * netValue = grossValue − (grossProfit × taxRate)
 *
 * Management fee: deducted monthly from the balance as a fraction of AUM.
 * Reduces the effective compound return without affecting the tax base directly.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface InvestmentInputs {
  /** ₪ — initial invested capital */
  initialCapital: number
  /** ₪ — monthly recurring deposit */
  monthlyDeposit: number
  /** Investment horizon in years */
  years: number
  /** Expected annual return, % (e.g. 7 for 7%) */
  annualReturn: number
  /** Capital gains tax rate, % (e.g. 25) */
  capitalGainsTax: number
  /** Annual management / advisory fee, % of AUM (e.g. 0.5 for 0.5%) */
  managementFeeRate?: number
}

export interface YearlyPoint {
  year: number
  /** Gross (pre-tax) portfolio value at end of this year */
  portfolioValue: number
  /** Cumulative total cost paid toward the mortgage through this year (set by caller) */
  cumulativeMortgageCost: number
}

export interface InvestmentResult {
  /** Final portfolio value before tax (but after management fees) */
  grossValue: number
  /** Final portfolio value after capital-gains tax on profit only */
  netValue: number
  /** Sum of all deposits: initialCapital + monthlyDeposit × months */
  totalDeposits: number
  /** netValue − totalDeposits */
  netProfit: number
  /** Yearly portfolio values for the chart (gross) */
  yearlyPortfolio: { year: number; value: number }[]
}

export interface DecisionMatrix {
  /** totalInterest + totalIndexation from Mix A */
  mortgageCost: number
  /** netProfit from the investment (clamped to ≥ 0 for display) */
  investmentGain: number
  /** investmentGain − mortgageCost (positive = investing wins) */
  netDiff: number
  /** KUMU-tone recommendation text */
  recommendation: string
}

export interface SensitivityRow {
  rate:           number
  netValue:       number
  diff:           number
  investmentWins: boolean
}

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

export function calculateInvestment(inputs: InvestmentInputs): InvestmentResult {
  const {
    initialCapital, monthlyDeposit, years, annualReturn, capitalGainsTax,
    managementFeeRate = 0,
  } = inputs

  const months         = Math.round(years * 12)
  const monthlyFactor  = Math.pow(1 + annualReturn / 100, 1 / 12)
  const monthlyFeeRate = managementFeeRate / 100 / 12

  let balance = initialCapital
  const yearlyPortfolio: { year: number; value: number }[] = []

  for (let m = 1; m <= months; m++) {
    balance = (balance + monthlyDeposit) * monthlyFactor
    if (monthlyFeeRate > 0) balance *= (1 - monthlyFeeRate)
    if (m % 12 === 0) {
      yearlyPortfolio.push({ year: m / 12, value: balance })
    }
  }

  const grossValue    = balance
  const totalDeposits = initialCapital + monthlyDeposit * months
  const grossProfit   = Math.max(0, grossValue - totalDeposits)
  const taxAmount     = grossProfit * (capitalGainsTax / 100)
  const netValue      = grossValue - taxAmount
  const netProfit     = netValue - totalDeposits

  return { grossValue, netValue, totalDeposits, netProfit, yearlyPortfolio }
}

// ---------------------------------------------------------------------------
// Break-even rate
// Binary-search for the minimum annualReturn at which netValue >= targetNetValue.
// Returns null if even 100% return can't reach the target (infeasible).
// annualReturn in inputs is ignored — we search over it.
// ---------------------------------------------------------------------------

export function calcBreakEvenRate(
  inputs:          InvestmentInputs,
  targetNetValue:  number,
): number | null {
  if (targetNetValue <= 0) return 0

  const MAX_RATE = 100

  if (calculateInvestment({ ...inputs, annualReturn: MAX_RATE }).netValue < targetNetValue) {
    return null
  }
  if (calculateInvestment({ ...inputs, annualReturn: 0 }).netValue >= targetNetValue) {
    return 0
  }

  let lo = 0
  let hi = MAX_RATE

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (calculateInvestment({ ...inputs, annualReturn: mid }).netValue < targetNetValue) {
      lo = mid
    } else {
      hi = mid
    }
    if (hi - lo < 0.001) break
  }

  return Math.round((lo + hi) / 2 * 10) / 10   // round to 1 decimal place
}

// ---------------------------------------------------------------------------
// Sensitivity table
// annualReturn in inputs is ignored — rates[] overrides it.
// ---------------------------------------------------------------------------

export function buildSensitivityTable(
  inputs:           InvestmentInputs,
  comparisonAmount: number,
  rates:            number[] = [4, 6, 8, 10],
): SensitivityRow[] {
  return rates.map((rate) => {
    const result = calculateInvestment({ ...inputs, annualReturn: rate })
    return {
      rate,
      netValue:       Math.round(result.netValue),
      diff:           Math.round(result.netValue - comparisonAmount),
      investmentWins: result.netValue > comparisonAmount,
    }
  })
}

// ---------------------------------------------------------------------------
// Decision matrix
// ---------------------------------------------------------------------------

export function buildDecisionMatrix(
  mortgageInterest:    number,
  mortgageIndexation:  number,
  investmentNetProfit: number,
): DecisionMatrix {
  const mortgageCost   = mortgageInterest + mortgageIndexation
  const investmentGain = Math.max(0, investmentNetProfit)
  const netDiff        = investmentNetProfit - mortgageCost

  const ratio = mortgageCost > 0 ? Math.abs(netDiff) / mortgageCost : 1

  let recommendation: string

  if (netDiff > 0 && ratio > 0.10) {
    recommendation =
      'רווחי ההשקעה עולים על עלות המימון בהנחות אלו. אם תוכלו לשמור על משמעת ההשקעה לאורך כל התקופה, ' +
      'השקעה עשויה להיות עדיפה על פירעון מוקדם — אך זכרו שתשואות עתידיות אינן מובטחות, ' +
      'בעוד שחיסכון הריבית הוא ודאי וחסר סיכון.'
  } else if (netDiff < 0 && ratio > 0.10) {
    recommendation =
      'עלות המשכנתא עולה על התשואה הצפויה מהתיק בהנחות הנוכחיות. פירעון מוקדם נותן "תשואה" בטוחה ' +
      'ומובטחת השווה לריבית שאתם חוסכים — ללא תנודתיות ושקט נפשי מובנה.'
  } else {
    recommendation =
      'ההפרש בין עלות המשכנתא לרווח ההשקעה קטן יחסית — פחות מ-10%. ' +
      'ההחלטה הנכונה תלויה יותר ברמת הסיכון שאתם מוכנים לקחת, בנזילות שאתם צריכים, ' +
      'ובשקט הנפשי שמשרה עליכם היד הפנויה. אין כאן תשובה "נכונה" אחת.'
  }

  return { mortgageCost, investmentGain, netDiff, recommendation }
}
