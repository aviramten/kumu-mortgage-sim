/**
 * calculateInvestment — compound-interest investment engine.
 *
 * Formula (monthly compounding):
 *   monthlyFactor = (1 + annualReturn / 100) ^ (1/12)
 *   balance       = (balance + monthlyDeposit) * monthlyFactor
 *
 * Capital-gains tax: applied only to the PROFIT (not the principal deposits).
 * netValue = grossValue − (grossProfit × taxRate)
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface InvestmentInputs {
  /** ₪ — initial invested capital (e.g. down-payment saved, windfall) */
  initialCapital: number
  /** ₪ — monthly recurring deposit */
  monthlyDeposit: number
  /** Investment horizon in years */
  years: number
  /** Expected annual return, % (e.g. 7 for 7%) */
  annualReturn: number
  /** Capital gains tax rate, % (e.g. 25) */
  capitalGainsTax: number
}

export interface YearlyPoint {
  year: number
  /** Gross (pre-tax) portfolio value at end of this year */
  portfolioValue: number
  /** Cumulative total cost paid toward the mortgage through this year (set by caller) */
  cumulativeMortgageCost: number
}

export interface InvestmentResult {
  /** Final portfolio value before tax */
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

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

export function calculateInvestment(inputs: InvestmentInputs): InvestmentResult {
  const { initialCapital, monthlyDeposit, years, annualReturn, capitalGainsTax } = inputs

  const months        = Math.round(years * 12)
  // Geometric monthly factor — equivalent to compound annual return
  const monthlyFactor = Math.pow(1 + annualReturn / 100, 1 / 12)

  let balance = initialCapital
  const yearlyPortfolio: { year: number; value: number }[] = []

  for (let m = 1; m <= months; m++) {
    balance = (balance + monthlyDeposit) * monthlyFactor
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
// Decision matrix
// ---------------------------------------------------------------------------

export function buildDecisionMatrix(
  mortgageInterest:   number,
  mortgageIndexation: number,
  investmentNetProfit: number,
): DecisionMatrix {
  const mortgageCost   = mortgageInterest + mortgageIndexation
  const investmentGain = Math.max(0, investmentNetProfit)
  const netDiff        = investmentNetProfit - mortgageCost

  // Threshold: ±10% of mortgage cost is considered "close"
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
