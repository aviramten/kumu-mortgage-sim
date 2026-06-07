import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Mix, MixId } from '@/types/mix'
import type { GlobalInputs, MacroForecasts } from '@/types/macro'
import type { LoanTrack, PrepaymentEvent } from '@/types/track'
import {
  DEFAULT_ANNUAL_CPI,
  DEFAULT_ANNUAL_EUR_CHANGE,
  DEFAULT_ANNUAL_EURIBOR_CHANGE,
  DEFAULT_ANNUAL_PRIME_CHANGE,
  DEFAULT_ANNUAL_SOFR_CHANGE,
  DEFAULT_ANNUAL_USD_CHANGE,
  DEFAULT_BANK_MARGIN_EUR,
  DEFAULT_BANK_MARGIN_USD,
  DEFAULT_EQUITY,
  DEFAULT_EURIBOR_RATE,
  DEFAULT_PRIME_RATE,
  DEFAULT_PROPERTY_VALUE,
  DEFAULT_SOFR_RATE,
} from '@/utils/constants'

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------
const defaultGlobalInputs: GlobalInputs = {
  propertyValue:   DEFAULT_PROPERTY_VALUE,
  equity:          DEFAULT_EQUITY,
  purchaseStatus:  'first',
  mortgageAmount:  DEFAULT_PROPERTY_VALUE - DEFAULT_EQUITY,
}

const defaultMacroForecasts: MacroForecasts = {
  annualCPI:            DEFAULT_ANNUAL_CPI,
  annualPrimeChange:    DEFAULT_ANNUAL_PRIME_CHANGE,
  annualUSDChange:      DEFAULT_ANNUAL_USD_CHANGE,
  annualEURChange:      DEFAULT_ANNUAL_EUR_CHANGE,
  sofrRate:             DEFAULT_SOFR_RATE,
  euriborRate:          DEFAULT_EURIBOR_RATE,
  bankMarginUSD:        DEFAULT_BANK_MARGIN_USD,
  bankMarginEUR:        DEFAULT_BANK_MARGIN_EUR,
  annualSOFRChange:     DEFAULT_ANNUAL_SOFR_CHANGE,
  annualEURIBORChange:  DEFAULT_ANNUAL_EURIBOR_CHANGE,
}

const createDefaultMix = (id: MixId): Mix => ({
  id,
  globalInputs:   { ...defaultGlobalInputs },
  macroForecasts: { ...defaultMacroForecasts },
  tracks:         [],
  prepayments:    [],
  results:        null,
})

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------
type MixKey = 'mixA' | 'mixB' | 'mixC'

const toKey = (id: MixId): MixKey => {
  if (id === 'a') return 'mixA'
  if (id === 'b') return 'mixB'
  return 'mixC'
}

interface MixStore {
  mixA: Mix
  mixB: Mix
  mixC: Mix
  // Global inputs
  updateGlobalInputs:   (id: MixId, partial: Partial<GlobalInputs>)   => void
  updateMacroForecasts: (id: MixId, partial: Partial<MacroForecasts>) => void
  // Track CRUD
  addTrack:       (id: MixId) => void
  removeTrack:    (id: MixId, trackId: string) => void
  duplicateTrack: (id: MixId, trackId: string) => void
  updateTrack:    (id: MixId, trackId: string, partial: Partial<LoanTrack>) => void
  // Prepayment CRUD
  addPrepayment:    (id: MixId, event: Omit<PrepaymentEvent, 'id'>) => void
  removePrepayment: (id: MixId, eventId: string) => void
  updatePrepayment: (id: MixId, eventId: string, partial: Partial<PrepaymentEvent>) => void
  // Mix management — generic
  duplicateMix: (source: MixId, target: MixId) => void
  clearMix:     (id: MixId) => void
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------
export const useMixStore = create<MixStore>()(
  persist(
    (set) => ({
  mixA: createDefaultMix('a'),
  mixB: createDefaultMix('b'),
  mixC: createDefaultMix('c'),

  // ---- Global inputs ----
  updateGlobalInputs: (id, partial) =>
    set((state) => {
      const key = toKey(id)
      return {
        [key]: {
          ...state[key],
          globalInputs: { ...state[key].globalInputs, ...partial },
        },
      }
    }),

  updateMacroForecasts: (id, partial) =>
    set((state) => {
      const key = toKey(id)
      return {
        [key]: {
          ...state[key],
          macroForecasts: { ...state[key].macroForecasts, ...partial },
        },
      }
    }),

  // ---- Tracks ----
  addTrack: (id) =>
    set((state) => {
      const key   = toKey(id)
      const mix   = state[key]
      // Default amount = remaining unallocated portion of the mortgage
      const allocated = mix.tracks.reduce((sum, t) => sum + t.amount, 0)
      const remaining = Math.max(0, mix.globalInputs.mortgageAmount - allocated)
      const newTrack: LoanTrack = {
        id:                   crypto.randomUUID(),
        type:                 'prime',
        amount:               remaining,
        months:               240,
        annualRate:           DEFAULT_PRIME_RATE,
        schedule:             'spitzer',
        graceType:            'none',
        graceMonths:          0,
        earlyRepaymentFee:    null,
        feeCalculationMethod: null,
      }
      return { [key]: { ...mix, tracks: [...mix.tracks, newTrack] } }
    }),

  removeTrack: (id, trackId) =>
    set((state) => {
      const key = toKey(id)
      const mix = state[key]
      return {
        [key]: {
          ...mix,
          // Remove the track and all prepayments that belong to it
          tracks:      mix.tracks.filter((t) => t.id !== trackId),
          prepayments: mix.prepayments.filter((p) => p.trackId !== trackId),
        },
      }
    }),

  duplicateTrack: (id, trackId) =>
    set((state) => {
      const key      = toKey(id)
      const mix      = state[key]
      const original = mix.tracks.find((t) => t.id === trackId)
      if (!original) return {}
      const duplicate: LoanTrack = { ...original, id: crypto.randomUUID() }
      return { [key]: { ...mix, tracks: [...mix.tracks, duplicate] } }
    }),

  updateTrack: (id, trackId, partial) =>
    set((state) => {
      const key = toKey(id)
      const mix = state[key]
      return {
        [key]: {
          ...mix,
          tracks: mix.tracks.map((t) =>
            t.id === trackId ? { ...t, ...partial } : t,
          ),
        },
      }
    }),

  // ---- Prepayments ----
  addPrepayment: (id, event) =>
    set((state) => {
      const key      = toKey(id)
      const mix      = state[key]
      const newEvent: PrepaymentEvent = { ...event, id: crypto.randomUUID() }
      return { [key]: { ...mix, prepayments: [...mix.prepayments, newEvent] } }
    }),

  removePrepayment: (id, eventId) =>
    set((state) => {
      const key = toKey(id)
      const mix = state[key]
      return {
        [key]: {
          ...mix,
          prepayments: mix.prepayments.filter((p) => p.id !== eventId),
        },
      }
    }),

  updatePrepayment: (id, eventId, partial) =>
    set((state) => {
      const key = toKey(id)
      const mix = state[key]
      return {
        [key]: {
          ...mix,
          prepayments: mix.prepayments.map((p) =>
            p.id === eventId ? { ...p, ...partial } : p,
          ),
        },
      }
    }),

  // ---- Generic mix management ----
  /**
   * duplicateMix — deep-copies source into target with fresh UUIDs for
   * tracks and prepayments.  Also copies globalInputs and macroForecasts.
   */
  duplicateMix: (source, target) =>
    set((state) => {
      const srcKey = toKey(source)
      const tgtKey = toKey(target)
      const src    = state[srcKey]

      // Build a UUID remapping so prepayment trackIds stay consistent
      const idMap = new Map<string, string>()
      const newTracks = src.tracks.map((t) => {
        const newId = crypto.randomUUID()
        idMap.set(t.id, newId)
        return { ...t, id: newId }
      })
      const newPrepayments = src.prepayments.map((p) => ({
        ...p,
        id:      crypto.randomUUID(),
        trackId: idMap.get(p.trackId) ?? p.trackId,
      }))

      return {
        [tgtKey]: {
          ...state[tgtKey],
          id:             target,
          globalInputs:   { ...src.globalInputs },
          macroForecasts: { ...src.macroForecasts },
          tracks:         newTracks,
          prepayments:    newPrepayments,
          results:        null,
        },
      }
    }),

  /** clearMix — resets a mix to its empty default state */
  clearMix: (id) =>
    set(() => ({ [toKey(id)]: createDefaultMix(id) })),
    }),
    {
      name: 'kumu-mix-store',
      storage: createJSONStorage(() => localStorage),
      // Persist only data (mixA, mixB, mixC), not action functions
      partialize: (state) => ({ mixA: state.mixA, mixB: state.mixB, mixC: state.mixC }),
    }
  )
)

/** Convenience selector — returns the full mix object for the given id */
export const useMix = (id: MixId) =>
  useMixStore((s) => {
    if (id === 'a') return s.mixA
    if (id === 'b') return s.mixB
    return s.mixC
  })
