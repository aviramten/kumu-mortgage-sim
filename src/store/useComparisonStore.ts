import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { MixId } from '@/types/mix'

// ---------------------------------------------------------------------------
// Store — which mixes are checked on the comparison page.
// Persisted so the selection survives navigating away and back, instead of
// resetting to "every non-empty mix" on every remount.
// ---------------------------------------------------------------------------
interface ComparisonStore {
  selected: MixId[]
  toggle:   (id: MixId, checked: boolean) => void
  setAll:   (ids: MixId[]) => void
}

export const useComparisonStore = create<ComparisonStore>()(
  persist(
    (set) => ({
      selected: ['a', 'b', 'c'],

      toggle: (id, checked) =>
        set((s) => ({
          selected: checked
            ? [...s.selected.filter((x) => x !== id), id]
            : s.selected.filter((x) => x !== id),
        })),

      setAll: (ids) => set({ selected: ids }),
    }),
    {
      name:    'kumu-comparison-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
