/**
 * calculateMix — runs calculateTrack for every valid track in a mix,
 * aggregates monthly payments, and produces the six KPI headline metrics.
 *
 * Wrap the call in useMemo([tracks, macroForecasts, prepayments]) in the
 * component layer; do NOT call directly in render without memoisation.
 */

import type { LoanTrack, PrepaymentEvent } from '@/types/track'
import type { MacroForecasts }             from '@/types/macro'
import type { MixKPIs, MixResult }         from '@/types/calculation'
import { calculateTrack }                  from './calculateTrack'

// ---------------------------------------------------------------------------
// Validation guard — skip tracks that would produce nonsense output
// ---------------------------------------------------------------------------
function isCalculable(t: LoanTrack): boolean {
  return (
    t.amount  >= 10_000 &&
    t.months  >= 48     &&
    t.months  <= 360    &&
    t.annualRate > 0
  )
}

const ZERO_KPIS: MixKPIs = {
  firstPayment:    0,
  maxPayment:      0,
  totalCost:       0,
  totalInterest:   0,
  totalIndexation: 0,
  costPerShekel:   0,
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------
export function calculateMix(
  tracks:      LoanTrack[],
  macro:       MacroForecasts,
  prepayments: PrepaymentEvent[],
): MixResult {
  const validTracks = tracks.filter(isCalculable)

  if (validTracks.length === 0) {
    return { trackResults: [], kpis: { ...ZERO_KPIS } }
  }

  // Run per-track engine (errors are caught to avoid crashing the UI)
  const trackResults = validTracks.map((track) => {
    const trackPrepayments = prepayments.filter((p) => p.trackId === track.id)
    try {
      return calculateTrack(track, macro, trackPrepayments)
    } catch {
      return calculateTrack({ ...track, graceType: 'none', graceMonths: 0 }, macro, [])
    }
  })

  // ── Aggregate monthly totals for firstPayment / maxPayment ───────────────
  const monthTotals = new Map<number, number>()
  for (const result of trackResults) {
    for (const row of result.rows) {
      monthTotals.set(row.month, (monthTotals.get(row.month) ?? 0) + row.totalPayment)
    }
  }

  const firstPayment = monthTotals.get(1) ?? 0
  const maxPayment   = monthTotals.size > 0 ? Math.max(...monthTotals.values()) : 0

  // ── Lifetime totals ───────────────────────────────────────────────────────
  let totalInterest   = 0
  let totalIndexation = 0
  let totalCost       = 0
  for (const r of trackResults) {
    totalInterest   += r.totalInterest
    totalIndexation += r.totalIndexation
    totalCost       += r.totalPayment
  }

  const totalPrincipal = validTracks.reduce((s, t) => s + t.amount, 0)

  return {
    trackResults,
    kpis: {
      firstPayment:    Math.round(firstPayment * 100) / 100,
      maxPayment:      Math.round(maxPayment   * 100) / 100,
      totalCost:       Math.round(totalCost),
      totalInterest:   Math.round(totalInterest),
      totalIndexation: Math.round(totalIndexation),
      costPerShekel:   totalPrincipal > 0
        ? Math.round((totalCost / totalPrincipal) * 10_000) / 10_000
        : 0,
    },
  }
}
