import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CostRow } from '@/types/costs'

// ---------------------------------------------------------------------------
// Fixed rows (always present, cannot be deleted)
// ---------------------------------------------------------------------------
const FIXED_ROWS: CostRow[] = [
  { id: 'brokerage',    label: 'תיווך',                                    amount: 0, isFixed: true },
  { id: 'purchase-tax', label: 'מס רכישה',                                amount: 0, isFixed: true },
  { id: 'lawyer',       label: 'שכר טרחת עו"ד',                           amount: 0, isFixed: true },
  { id: 'mortgage-exp', label: 'הוצאות משכנתא (שמאות בנק, עמלות פתיחה)', amount: 0, isFixed: true },
  { id: 'moving',       label: 'הוצאות מעבר ושינוע',                      amount: 0, isFixed: true },
  { id: 'renovation',   label: 'שיפוץ',                                   amount: 0, isFixed: true },
  { id: 'inspection',   label: 'בדק בית',                                 amount: 0, isFixed: true },
  { id: 'appraisal',    label: 'שמאות עצמאית',                            amount: 0, isFixed: true },
  { id: 'other',        label: 'אחר',                                     amount: 0, isFixed: true },
]

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------
interface CostsStore {
  rows: CostRow[]
  updateAmount: (id: string, amount: number) => void
  addRow:       () => void
  /** Only deletes rows where isFixed === false */
  removeRow:    (id: string) => void
  /** Only updates label for rows where isFixed === false */
  updateLabel:  (id: string, label: string) => void
  /** Computed: sum of all row amounts */
  totalCosts:   () => number
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useCostsStore = create<CostsStore>()(
  persist(
    (set, get) => ({
      rows: FIXED_ROWS,

      updateAmount: (id, amount) =>
        set((state) => ({
          rows: state.rows.map((r) => r.id === id ? { ...r, amount } : r),
        })),

      addRow: () =>
        set((state) => ({
          rows: [
            ...state.rows,
            {
              id:      crypto.randomUUID(),
              label:   'סעיף נוסף',
              amount:  0,
              isFixed: false,
            },
          ],
        })),

      /** Guard: fixed rows are never deleted */
      removeRow: (id) =>
        set((state) => ({
          rows: state.rows.filter((r) => r.id !== id || r.isFixed),
        })),

      updateLabel: (id, label) =>
        set((state) => ({
          rows: state.rows.map((r) =>
            r.id === id && !r.isFixed ? { ...r, label } : r,
          ),
        })),

      totalCosts: () =>
        get().rows.reduce((sum, r) => sum + (r.amount || 0), 0),
    }),
    {
      name: 'kumu-costs-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ rows: state.rows }),
    }
  )
)
