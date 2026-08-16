import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { InvestmentInputs } from '@/engine/calculateInvestment'
import { DEFAULT_CAPITAL_GAINS_TAX } from '@/utils/constants'

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
export const DEFAULT_INVESTMENT_INPUTS: InvestmentInputs = {
  initialCapital:  0,
  monthlyDeposit:  0,
  years:           20,
  annualReturn:    0,
  capitalGainsTax: DEFAULT_CAPITAL_GAINS_TAX,
}

export const DEFAULT_COMPARISON_YEARS = 20

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
interface InvestmentStore {
  inputs:           InvestmentInputs
  manualComparison: number
  comparisonYears:  number

  updateInput:         <K extends keyof InvestmentInputs>(key: K, value: InvestmentInputs[K]) => void
  setManualComparison: (n: number) => void
  setComparisonYears:  (n: number) => void
  reset:               () => void
}

export const useInvestmentStore = create<InvestmentStore>()(
  persist(
    (set) => ({
      inputs:           DEFAULT_INVESTMENT_INPUTS,
      manualComparison: 0,
      comparisonYears:  DEFAULT_COMPARISON_YEARS,

      updateInput: (key, value) =>
        set((s) => ({ inputs: { ...s.inputs, [key]: value } })),

      setManualComparison: (n) => set({ manualComparison: n }),
      setComparisonYears:  (n) => set({ comparisonYears: n }),

      reset: () => set({
        inputs:           DEFAULT_INVESTMENT_INPUTS,
        manualComparison: 0,
        comparisonYears:  DEFAULT_COMPARISON_YEARS,
      }),
    }),
    {
      name:    'kumu-investment-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
