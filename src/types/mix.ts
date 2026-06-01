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
}
