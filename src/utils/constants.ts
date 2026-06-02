/** Financial defaults based on May 2026 market data */

// Macro forecasts
export const DEFAULT_ANNUAL_CPI = 2.5;          // % — Bank of Israel forecast
export const DEFAULT_ANNUAL_PRIME_CHANGE = 0;   // % — no change assumed
export const DEFAULT_ANNUAL_USD_CHANGE = 0;     // % — stable USD/ILS
export const DEFAULT_ANNUAL_EUR_CHANGE = 0;     // % — stable EUR/ILS

// Current benchmark rates (May 2026)
export const DEFAULT_SOFR_RATE = 3.6;           // % — Federal Reserve Bank of NY
export const DEFAULT_EURIBOR_RATE = 2.75;       // % — European Money Markets Institute
export const DEFAULT_BANK_MARGIN_USD = 2.5;     // % — typical Israeli bank spread
export const DEFAULT_BANK_MARGIN_EUR = 2.5;     // % — typical Israeli bank spread

// FX benchmark rate change forecasts (Stage 4b)
export const DEFAULT_ANNUAL_SOFR_CHANGE    = 0;  // % — no change assumed
export const DEFAULT_ANNUAL_EURIBOR_CHANGE = 0;  // % — no change assumed

// Prime rate
export const DEFAULT_PRIME_RATE = 6.0;          // % — Bank of Israel base rate + 1.5%

// Investment calculator
export const DEFAULT_EXPECTED_RETURN = 7;       // % annual
export const DEFAULT_CAPITAL_GAINS_TAX = 25;    // %

// Loan constraints (Bank of Israel regulations)
export const MAX_LTV_FIRST_HOME = 75;           // %
export const MAX_LTV_REPLACEMENT = 70;          // %
export const MAX_LTV_INVESTMENT = 50;           // %

export const MIN_LOAN_MONTHS = 48;
export const MAX_LOAN_MONTHS = 360;
export const MIN_TRACK_AMOUNT = 10_000;         // ₪

// Mix balance thresholds
export const BALANCE_OK_THRESHOLD = 100;        // ₪ — green
export const BALANCE_WARN_THRESHOLD = 10_000;   // ₪ — yellow → orange

// Default global inputs
export const DEFAULT_PROPERTY_VALUE = 2_000_000;
export const DEFAULT_EQUITY = 600_000;

// Hebrew display labels for track types (used by charts and amortization table)
export const TRACK_TYPE_LABELS: Record<string, string> = {
  'prime':             'פריים',
  'fixed-unlinked':    'קל"צ',
  'fixed-linked':      'ק"צ',
  'variable-linked':   'מ"צ',
  'variable-unlinked': 'מל"צ',
  'eligibility':       'זכאות',
  'variable-makam':    'מק"מ',
  'usd':               'דולר ($)',
  'eur':               'יורו (€)',
}
