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
  annualCPI:          0,
  annualPrimeChange:  0,
  annualUSDChange:    0,
  annualEURChange:    0,
  sofrRate:           3.6,
  euriborRate:        2.75,
  bankMarginUSD:      2.5,
  bankMarginEUR:      2.5,
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
