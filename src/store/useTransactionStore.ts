import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { GlobalInputs } from '@/types/macro'
import { DEFAULT_EQUITY, DEFAULT_PROPERTY_VALUE } from '@/utils/constants'

interface TransactionStore extends GlobalInputs {
  update: (partial: Partial<GlobalInputs>) => void
  reset:  () => void
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set) => ({
      propertyValue:  DEFAULT_PROPERTY_VALUE,
      equity:         DEFAULT_EQUITY,
      purchaseStatus: 'first' as const,
      mortgageAmount: DEFAULT_PROPERTY_VALUE - DEFAULT_EQUITY,

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
      name: 'kumu-transaction',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        propertyValue:  s.propertyValue,
        equity:         s.equity,
        purchaseStatus: s.purchaseStatus,
        mortgageAmount: s.mortgageAmount,
      }),
    }
  )
)
