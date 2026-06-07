/**
 * PTI Calculator tests — PRD §9
 */

import { describe, it, expect } from 'vitest'
import { calculatePTI } from '../pti'
import type { MixKPIs } from '@/types/calculation'

// ---------------------------------------------------------------------------
// Helper: build a minimal MixKPIs fixture
// ---------------------------------------------------------------------------
function mockKPIs(firstPayment: number, firstNonGracePayment: number): MixKPIs {
  return {
    firstPayment,
    firstNonGracePayment,
    maxPayment:        0,
    totalCost:         0,
    totalInterest:     0,
    totalIndexation:   0,
    costPerShekel:     0,
    prepaymentSavings: 0,
    monthsSaved:       0,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PTI Calculator', () => {
  it('calculates PTI correctly within ok range', () => {
    // disposableIncome=30,000  relevantPayment=8,000  → PTI=26.7%  → 'ok'
    const result = calculatePTI(30_000, mockKPIs(8_000, 8_000))
    expect(result.ptiRatio).toBeCloseTo(26.67, 1)
    expect(result.status).toBe('ok')
    expect(result.relevantPayment).toBe(8_000)
    expect(result.disposableIncome).toBe(30_000)
  })

  it('calculates PTI correctly in warning range', () => {
    // disposableIncome=25,000  relevantPayment=9,000  → PTI=36%  → 'warning'
    const result = calculatePTI(25_000, mockKPIs(9_000, 9_000))
    expect(result.ptiRatio).toBeCloseTo(36, 1)
    expect(result.status).toBe('warning')
  })

  it('calculates PTI exceeds threshold', () => {
    // disposableIncome=20,000  relevantPayment=9,000  → PTI=45%  → 'exceeds'
    const result = calculatePTI(20_000, mockKPIs(9_000, 9_000))
    expect(result.ptiRatio).toBeCloseTo(45, 1)
    expect(result.status).toBe('exceeds')
  })

  it('uses firstNonGracePayment when higher than firstPayment', () => {
    // firstPayment=1,000 (during grace), firstNonGracePayment=7,000
    // → relevantPayment must be 7,000 (the post-grace, permanent payment)
    const kpis   = mockKPIs(1_000, 7_000)
    const result = calculatePTI(30_000, kpis)
    expect(result.relevantPayment).toBe(7_000)
    // PTI = 7,000 / 30,000 = 23.3%  → 'ok'
    expect(result.ptiRatio).toBeCloseTo(23.33, 1)
    expect(result.status).toBe('ok')
  })

  it('returns ok status with empty label when disposableIncome is zero', () => {
    const result = calculatePTI(0, mockKPIs(5_000, 5_000))
    expect(result.status).toBe('ok')
    expect(result.ptiRatio).toBe(0)
    expect(result.label).toContain('הזינו')
  })
})
