import { create } from 'zustand'
import type { Mix, MixId } from '@/types/mix'
import type { GlobalInputs, MacroForecasts } from '@/types/macro'
import {
  DEFAULT_ANNUAL_CPI,
  DEFAULT_ANNUAL_EUR_CHANGE,
  DEFAULT_ANNUAL_PRIME_CHANGE,
  DEFAULT_ANNUAL_USD_CHANGE,
  DEFAULT_BANK_MARGIN_EUR,
  DEFAULT_BANK_MARGIN_USD,
  DEFAULT_EQUITY,
  DEFAULT_EURIBOR_RATE,
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
  annualCPI:        DEFAULT_ANNUAL_CPI,
  annualPrimeChange: DEFAULT_ANNUAL_PRIME_CHANGE,
  annualUSDChange:  DEFAULT_ANNUAL_USD_CHANGE,
  annualEURChange:  DEFAULT_ANNUAL_EUR_CHANGE,
  sofrRate:         DEFAULT_SOFR_RATE,
  euriborRate:      DEFAULT_EURIBOR_RATE,
  bankMarginUSD:    DEFAULT_BANK_MARGIN_USD,
  bankMarginEUR:    DEFAULT_BANK_MARGIN_EUR,
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
// Store
// ---------------------------------------------------------------------------
type MixKey = 'mixA' | 'mixB'
const toKey = (id: MixId): MixKey => (id === 'a' ? 'mixA' : 'mixB')

interface MixStore {
  mixA: Mix
  mixB: Mix
  updateGlobalInputs:   (id: MixId, partial: Partial<GlobalInputs>)   => void
  updateMacroForecasts: (id: MixId, partial: Partial<MacroForecasts>) => void
}

export const useMixStore = create<MixStore>()((set) => ({
  mixA: createDefaultMix('a'),
  mixB: createDefaultMix('b'),

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
}))

/** Convenience selector — returns the full mix object for the given id */
export const useMix = (id: MixId) =>
  useMixStore((s) => (id === 'a' ? s.mixA : s.mixB))
