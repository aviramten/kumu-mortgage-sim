import type { GlobalInputs, MacroForecasts } from './macro'
import type { LoanTrack, PrepaymentEvent, TrackResult } from './track'

export type MixId = 'a' | 'b'

export interface Mix {
  id: MixId
  globalInputs: GlobalInputs
  macroForecasts: MacroForecasts
  tracks: LoanTrack[]
  prepayments: PrepaymentEvent[]
  results: TrackResult[] | null
  // ---------------------------------------------------------------------------
  // Supabase-ready fields — populated when cloud sync is implemented (Stage 7+)
  // ---------------------------------------------------------------------------
  /** Supabase auth user UUID, null when unauthenticated / local only */
  userId?: string
  /** Human-readable label for the mix (e.g. "תמהיל נדל"ן השקעה") */
  label?: string
  /** ISO-8601 timestamp of first save */
  createdAt?: string
  /** ISO-8601 timestamp of last save */
  updatedAt?: string
}
