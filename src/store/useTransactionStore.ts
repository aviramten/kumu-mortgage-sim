import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { GlobalInputs } from '@/types/macro'

interface TransactionStore extends GlobalInputs {
  update: (partial: Partial<GlobalInputs>) => void
  reset:  () => void
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set) => ({
      propertyValue:  0,
      equity:         0,
      purchaseStatus: 'first' as const,
      mortgageAmount: 0,

      update: (partial) =>
        set((s) => ({ ...s, ...partial })),

      reset: () =>
        set({
          propertyValue:  0,
          equity:         0,
          purchaseStatus: 'first',
          mortgageAmount: 0,
        }),
    }),
    {
      name:    'kumu-transaction',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        propertyValue:  s.propertyValue,
        equity:         s.equity,
        purchaseStatus: s.purchaseStatus,
        mortgageAmount: s.mortgageAmount,
      }),
      // v0 had non-zero defaults (2,000,000 / 600,000) — reset to blank on upgrade
      migrate: () => ({
        propertyValue:  0,
        equity:         0,
        purchaseStatus: 'first' as const,
        mortgageAmount: 0,
      }),
    }
  )
)
