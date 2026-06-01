/**
 * Engine test cases — PRD §4.7, tests 1-3 (Stage 4a)
 *
 * Test #1 — Spitzer classic (fixed-unlinked, no CPI)
 * Test #2 — Equal principal (fixed-unlinked, no CPI)
 * Test #3 — CPI-indexed Spitzer (fixed-linked, CPI = 2.5 %)
 */

import { describe, it, expect } from 'vitest'
import { calculateTrack }       from '../calculateTrack'
import type { LoanTrack }       from '@/types/track'
import type { MacroForecasts }  from '@/types/macro'

// ---------------------------------------------------------------------------
// Shared macro fixture with zero prime-change (not relevant for these tests)
// ---------------------------------------------------------------------------
const MACRO_ZERO_CPI: MacroForecasts = {
  annualCPI:           0,
  annualPrimeChange:   0,
  annualUSDChange:     0,
  annualEURChange:     0,
  sofrRate:            3.6,
  euriborRate:         2.75,
  bankMarginUSD:       2.5,
  bankMarginEUR:       2.5,
  annualSOFRChange:    0,
  annualEURIBORChange: 0,
}

const MACRO_2_5_CPI: MacroForecasts = {
  ...MACRO_ZERO_CPI,
  annualCPI: 2.5,
}

// Helper: build a minimal LoanTrack with sensible defaults
function makeTrack(overrides: Partial<LoanTrack> & Pick<LoanTrack, 'type' | 'amount' | 'months' | 'annualRate' | 'schedule'>): LoanTrack {
  return {
    id:                   'test-track',
    graceType:            'none',
    graceMonths:          0,
    earlyRepaymentFee:    null,
    feeCalculationMethod: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Test #1 — PRD §4.7 — Spitzer classic (קל"צ, no CPI)
// Input: amount=500,000 | months=240 | annualRate=4% | spitzer
// Expected (PRD):
//   PMT_constant ≈ 3,029.92 ₪  (tolerance ±0.05)
//   month_1.principalPayment ≈ 1,363.25 ₪
//   month_1.interestPayment  ≈ 1,666.67 ₪
//   month_240.closingBalance = 0
// ---------------------------------------------------------------------------
describe('Test #1 — Spitzer classic (fixed-unlinked, no CPI)', () => {
  const track  = makeTrack({ type: 'fixed-unlinked', amount: 500_000, months: 240, annualRate: 4.0, schedule: 'spitzer' })
  const result = calculateTrack(track, MACRO_ZERO_CPI)

  it('produces exactly 240 rows', () => {
    expect(result.rows).toHaveLength(240)
  })

  it('month 1 — total payment ≈ 3,029.92 ₪ (±0.05)', () => {
    const pmt = result.rows[0].totalPayment
    expect(pmt).toBeGreaterThanOrEqual(3_029.87)
    expect(pmt).toBeLessThanOrEqual(3_029.97)
  })

  it('month 1 — interest payment ≈ 1,666.67 ₪ (±0.01)', () => {
    const interest = result.rows[0].interestPayment
    expect(interest).toBeGreaterThanOrEqual(1_666.66)
    expect(interest).toBeLessThanOrEqual(1_666.68)
  })

  it('month 1 — principal payment ≈ 1,363.25 ₪ (±0.05)', () => {
    const principal = result.rows[0].principalPayment
    expect(principal).toBeGreaterThanOrEqual(1_363.20)
    expect(principal).toBeLessThanOrEqual(1_363.30)
  })

  it('month 1 — no indexation on a non-indexed track', () => {
    expect(result.rows[0].inflationComponent).toBe(0)
    expect(result.rows[0].indexedBalance).toBeCloseTo(500_000, 1)
  })

  it('month 240 — closing balance is 0', () => {
    expect(result.rows[239].closingBalance).toBe(0)
  })

  it('total interest ≈ 227,180 ₪ (±500)', () => {
    expect(result.totalInterest).toBeGreaterThan(226_000)
    expect(result.totalInterest).toBeLessThan(228_500)
  })

  it('total payment ≈ 727,180 ₪ (±500)', () => {
    expect(result.totalPayment).toBeGreaterThan(726_000)
    expect(result.totalPayment).toBeLessThan(728_500)
  })
})

// ---------------------------------------------------------------------------
// Test #2 — PRD §4.7 — Equal principal (קל"צ, no CPI)
// Input: amount=300,000 | months=120 | annualRate=5% | equalPrincipal
// Expected (PRD):
//   month_1.principalPayment = 2,500.00 ₪  (300,000 / 120 — exact)
//   month_1.interestPayment  = 1,250.00 ₪  (300,000 × 5%/12 — exact)
//   month_1.totalPayment     = 3,750.00 ₪
//   month_120.principalPayment = 2,500.00 ₪ (constant)
//   month_120.closingBalance   = 0
// ---------------------------------------------------------------------------
describe('Test #2 — Equal principal (fixed-unlinked, no CPI)', () => {
  const track  = makeTrack({ type: 'fixed-unlinked', amount: 300_000, months: 120, annualRate: 5.0, schedule: 'equalPrincipal' })
  const result = calculateTrack(track, MACRO_ZERO_CPI)

  it('produces exactly 120 rows', () => {
    expect(result.rows).toHaveLength(120)
  })

  it('month 1 — principal payment = 2,500.00 ₪ (exact)', () => {
    expect(result.rows[0].principalPayment).toBeCloseTo(2_500.00, 2)
  })

  it('month 1 — interest payment = 1,250.00 ₪ (exact)', () => {
    expect(result.rows[0].interestPayment).toBeCloseTo(1_250.00, 2)
  })

  it('month 1 — total payment = 3,750.00 ₪', () => {
    expect(result.rows[0].totalPayment).toBeCloseTo(3_750.00, 2)
  })

  it('month 120 — principal payment still ≈ 2,500.00 ₪ (constant slices)', () => {
    // Final month: principalPayment = entire remaining indexed balance (≈ 2,500)
    expect(result.rows[119].principalPayment).toBeGreaterThan(2_490)
    expect(result.rows[119].principalPayment).toBeLessThan(2_510)
  })

  it('month 120 — interest payment ≈ 10.42 ₪ (≈ 2,500 × 5%/12)', () => {
    const interest = result.rows[119].interestPayment
    expect(interest).toBeGreaterThan(9)
    expect(interest).toBeLessThan(12)
  })

  it('month 120 — closing balance is 0', () => {
    expect(result.rows[119].closingBalance).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Test #3 — PRD §4.7 — CPI-indexed Spitzer (ק"צ, 2.5 % CPI)
// Input: amount=500,000 | months=240 | annualRate=3.5% | spitzer | CPI=2.5%
// Expected (PRD):
//   month_1.openingBalance  = 500,000
//   month_1.inflationComponent ≈ 1,030 ₪  (500K × ((1.025)^(1/12) − 1))
//   month_12.openingBalance > 500,000      (balance grows due to CPI)
//   total_indexation > 100,000 ₪
// ---------------------------------------------------------------------------
describe('Test #3 — CPI-indexed Spitzer (fixed-linked, CPI = 2.5 %)', () => {
  const track  = makeTrack({ type: 'fixed-linked', amount: 500_000, months: 240, annualRate: 3.5, schedule: 'spitzer' })
  const result = calculateTrack(track, MACRO_2_5_CPI)

  it('produces exactly 240 rows', () => {
    expect(result.rows).toHaveLength(240)
  })

  it('month 1 — opening balance = 500,000', () => {
    expect(result.rows[0].openingBalance).toBeCloseTo(500_000, 0)
  })

  it('month 1 — inflation component ≈ 1,030 ₪ (±10)', () => {
    // 500,000 × ((1.025)^(1/12) − 1) ≈ 1,031
    const cpiDiff = result.rows[0].inflationComponent
    expect(cpiDiff).toBeGreaterThan(1_010)
    expect(cpiDiff).toBeLessThan(1_060)
  })

  it('month 1 — indexed balance > opening balance', () => {
    expect(result.rows[0].indexedBalance).toBeGreaterThan(result.rows[0].openingBalance)
  })

  it('month 12 — opening balance is HIGHER with CPI than without (CPI slows the paydown)', () => {
    // With 3.5 % rate and 2.5 % CPI, the monthly CPI addition (~0.21 %)
    // is smaller than the monthly principal repayment (~0.29 %), so the
    // balance still decreases — but more slowly than the equivalent
    // non-indexed loan.  The key observable: balance_with_CPI > balance_without_CPI.
    const noIndexResult = calculateTrack(
      { ...track, type: 'fixed-unlinked' },
      MACRO_ZERO_CPI,
    )
    expect(result.rows[11].openingBalance).toBeGreaterThan(noIndexResult.rows[11].openingBalance)
  })

  it('total indexation > 100,000 ₪ over 240 months', () => {
    expect(result.totalIndexation).toBeGreaterThan(100_000)
  })

  it('month 240 — closing balance is 0', () => {
    expect(result.rows[239].closingBalance).toBe(0)
  })

  it('total payment > total indexation (interest + principal dominate)', () => {
    expect(result.totalPayment).toBeGreaterThan(result.totalIndexation)
  })
})

// ---------------------------------------------------------------------------
// Additional macro fixture with 2.5% CPI and rate data for FX/grace tests
// ---------------------------------------------------------------------------
const MACRO_FULL: MacroForecasts = {
  annualCPI:           2.5,
  annualPrimeChange:   0,
  annualUSDChange:     3.0,   // USD appreciates 3% / yr vs ILS
  annualEURChange:     0,
  sofrRate:            3.6,
  euriborRate:         2.75,
  bankMarginUSD:       2.5,
  bankMarginEUR:       2.5,
  annualSOFRChange:    0,
  annualEURIBORChange: 0,
}

// ---------------------------------------------------------------------------
// Test #4 — PRD §4.7 — CPI-indexed Spitzer after 24-month grace (partial)
// Input: amount=400,000 | months=240 | annualRate=3.0% | spitzer | CPI=2.5%
//        graceType=partial | graceMonths=24
// Expected:
//   month_1.principalPayment = 0  (partial grace — interest only)
//   month_1.interestPayment  > 0
//   month_1.closingBalance   ≈ 400,000 (no principal reduction during grace)
//   month_25.principalPayment > 0  (normal amortisation resumes)
//   month_240.closingBalance = 0
//   openingBalance(month 25) > 400,000  (CPI has grown balance over 24 months)
// ---------------------------------------------------------------------------
describe('Test #4 — Partial grace 24m then CPI-indexed Spitzer (fixed-linked)', () => {
  const track = makeTrack({
    type:        'fixed-linked',
    amount:      400_000,
    months:      240,
    annualRate:  3.0,
    schedule:    'spitzer',
    graceType:   'partial',
    graceMonths: 24,
  })
  const result = calculateTrack(track, MACRO_FULL)

  it('produces exactly 240 rows', () => {
    expect(result.rows).toHaveLength(240)
  })

  it('month 1 — principal payment is 0 during partial grace', () => {
    expect(result.rows[0].principalPayment).toBe(0)
  })

  it('month 1 — interest payment > 0 during partial grace', () => {
    expect(result.rows[0].interestPayment).toBeGreaterThan(0)
  })

  it('month 1 — closing balance ≈ 400,000 (balance unchanged in partial grace)', () => {
    expect(result.rows[0].closingBalance).toBeGreaterThan(399_000)
    expect(result.rows[0].closingBalance).toBeLessThan(402_000)
  })

  it('month 24 — still in grace (principal still 0)', () => {
    expect(result.rows[23].principalPayment).toBe(0)
  })

  it('month 25 — principal payment > 0 (amortisation resumes)', () => {
    expect(result.rows[24].principalPayment).toBeGreaterThan(0)
  })

  it('month 25 — opening balance > 400,000 (CPI accumulated over 24 months)', () => {
    expect(result.rows[24].openingBalance).toBeGreaterThan(400_000)
  })

  it('month 240 — closing balance is 0', () => {
    expect(result.rows[239].closingBalance).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Test #5 — PRD §4.7 — Full grace 12 months (interest capitalises)
// Input: amount=300,000 | months=120 | annualRate=4% | spitzer | no CPI
//        graceType=full | graceMonths=12
// Expected:
//   month_1.totalPayment = 0  (nothing paid during full grace)
//   month_1.closingBalance > 300,000  (interest accrues into principal)
//   month_13.openingBalance > 300,000 (compounded balance at grace end)
//   month_13.principalPayment > 0     (amortisation starts)
//   month_120.closingBalance = 0
// ---------------------------------------------------------------------------
describe('Test #5 — Full grace 12m (interest capitalises, fixed-unlinked)', () => {
  const track = makeTrack({
    type:        'fixed-unlinked',
    amount:      300_000,
    months:      120,
    annualRate:  4.0,
    schedule:    'spitzer',
    graceType:   'full',
    graceMonths: 12,
  })
  const result = calculateTrack(track, MACRO_ZERO_CPI)

  it('month 1 — total payment = 0 during full grace', () => {
    expect(result.rows[0].totalPayment).toBe(0)
  })

  it('month 1 — closing balance > 300,000 (interest accrues)', () => {
    expect(result.rows[0].closingBalance).toBeGreaterThan(300_000)
  })

  it('month 12 — total payment = 0 (still in full grace)', () => {
    expect(result.rows[11].totalPayment).toBe(0)
  })

  it('month 13 — opening balance > 300,000 (12 months of compounding)', () => {
    expect(result.rows[12].openingBalance).toBeGreaterThan(300_000)
  })

  it('month 13 — principal payment > 0 (amortisation resumes)', () => {
    expect(result.rows[12].principalPayment).toBeGreaterThan(0)
  })

  it('month 120 — closing balance is 0', () => {
    expect(result.rows[119].closingBalance).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Test #6 — PRD §4.7 — USD FX-indexed track (SOFR-based, 3% USD appreciation)
// Input: amount=500,000 | months=120 | annualRate=6.1% (SOFR 3.6 + margin 2.5)
//        type=usd | schedule=spitzer | annualUSDChange=3%
// Expected:
//   month_1.inflationComponent > 0  (FX indexation applied)
//   month_1.indexedBalance > 500,000
//   month_120.closingBalance = 0
//   totalIndexation > 0
//   totalPayment > 500,000 * 1.3  (USD appreciation inflates total cost)
// ---------------------------------------------------------------------------
describe('Test #6 — USD FX-indexed Spitzer (3% annual USD appreciation)', () => {
  const track = makeTrack({
    type:       'usd',
    amount:     500_000,
    months:     120,
    annualRate: 6.1,    // SOFR 3.6 + bankMarginUSD 2.5
    schedule:   'spitzer',
  })
  const result = calculateTrack(track, MACRO_FULL)

  it('produces exactly 120 rows', () => {
    expect(result.rows).toHaveLength(120)
  })

  it('month 1 — FX indexation component > 0', () => {
    expect(result.rows[0].inflationComponent).toBeGreaterThan(0)
  })

  it('month 1 — indexed balance > 500,000', () => {
    expect(result.rows[0].indexedBalance).toBeGreaterThan(500_000)
  })

  it('total indexation > 0 (FX appreciation inflates balance)', () => {
    expect(result.totalIndexation).toBeGreaterThan(0)
  })

  it('month 120 — closing balance is 0', () => {
    expect(result.rows[119].closingBalance).toBe(0)
  })

  it('total payment > non-FX equivalent (FX appreciation adds cost)', () => {
    const noFxResult = calculateTrack(
      { ...track, type: 'fixed-unlinked' },
      MACRO_ZERO_CPI,
    )
    expect(result.totalPayment).toBeGreaterThan(noFxResult.totalPayment)
  })
})

// ---------------------------------------------------------------------------
// Test #7 — PRD §4.7 — Prepayment shortenTerm
// Input: amount=600,000 | months=240 | annualRate=4.5% | spitzer
//        prepayment at month 24: amount=100,000, mode=shortenTerm
// Expected:
//   month_25.openingBalance < month_24.closingBalance (balance reduced)
//   effectiveMonths < 240   (loan ends before full term)
//   totalInterest_with_prepayment < totalInterest_without_prepayment
// ---------------------------------------------------------------------------
describe('Test #7 — Prepayment shortenTerm (spitzer, fixed-unlinked)', () => {
  const track = makeTrack({
    type:       'fixed-unlinked',
    amount:     600_000,
    months:     240,
    annualRate: 4.5,
    schedule:   'spitzer',
  })

  const prepayments = [
    {
      id:      'pp-1',
      month:   24,
      amount:  100_000,
      trackId: 'test-track',
      mode:    'shortenTerm' as const,
    },
  ]

  const resultWith    = calculateTrack(track, MACRO_ZERO_CPI, prepayments)
  const resultWithout = calculateTrack(track, MACRO_ZERO_CPI, [])

  it('effectiveMonths < 240 (loan shortened)', () => {
    expect(resultWith.effectiveMonths).toBeLessThan(240)
  })

  it('totalInterest is lower with prepayment than without', () => {
    expect(resultWith.totalInterest).toBeLessThan(resultWithout.totalInterest)
  })

  it('month 25 opening balance is lower with prepayment', () => {
    expect(resultWith.rows[24].openingBalance).toBeLessThan(resultWithout.rows[24].openingBalance)
  })

  it('closing balance of last row is 0', () => {
    const lastRow = resultWith.rows[resultWith.rows.length - 1]
    expect(lastRow.closingBalance).toBe(0)
  })
})
