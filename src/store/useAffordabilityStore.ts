import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { IncomeRow, LiabilityRow } from '@/types/affordability'

// ---------------------------------------------------------------------------
// Fixed income rows
// ---------------------------------------------------------------------------
const FIXED_INCOME_ROWS: IncomeRow[] = [
  { id: 'payslip1',   label: 'תלוש 1',                              amount: 0, isFixed: true },
  { id: 'payslip2',   label: 'תלוש 2',                              amount: 0, isFixed: true },
  { id: 'payslip3',   label: 'תלוש 3',                              amount: 0, isFixed: true },
  { id: 'rental1',    label: 'נכס מניב 1',                          amount: 0, isFixed: true },
  { id: 'rental2',    label: 'נכס מניב 2',                          amount: 0, isFixed: true },
  { id: 'tax-assess', label: 'הכנסה חודשית נטו משומת מס',           amount: 0, isFixed: true },
  { id: 'accountant', label: 'הכנסה חודשית נטו מאישור רו"ח',        amount: 0, isFixed: true },
  { id: 'dividends',  label: 'הכנסה חודשית ממוצעת מדיבידנדים',     amount: 0, isFixed: true },
  { id: 'allowances', label: 'הכנסה מקצבאות',                       amount: 0, isFixed: true },
  { id: 'alimony-in', label: 'הכנסה ממזונות (מתקבלים)',              amount: 0, isFixed: true },
  { id: 'espp',       label: 'ESPP',                                amount: 0, isFixed: true },
]

// ---------------------------------------------------------------------------
// Fixed liability rows
// ---------------------------------------------------------------------------
const FIXED_LIABILITY_ROWS: LiabilityRow[] = [
  { id: 'loan1',       label: 'הלוואה 1',       monthlyPayment: 0, balance: 0, remainingMonths: 0, isFixed: true },
  { id: 'loan2',       label: 'הלוואה 2',       monthlyPayment: 0, balance: 0, remainingMonths: 0, isFixed: true },
  { id: 'loan3',       label: 'הלוואה 3',       monthlyPayment: 0, balance: 0, remainingMonths: 0, isFixed: true },
  { id: 'alimony-out', label: 'מזונות לשלם',    monthlyPayment: 0, balance: 0, remainingMonths: 0, isFixed: true },
  { id: 'mortgage1',   label: 'משכנתא קיימת 1', monthlyPayment: 0, balance: 0, remainingMonths: 0, isFixed: true },
  { id: 'mortgage2',   label: 'משכנתא קיימת 2', monthlyPayment: 0, balance: 0, remainingMonths: 0, isFixed: true },
]

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------
interface AffordabilityStore {
  incomeRows:    IncomeRow[]
  liabilityRows: LiabilityRow[]

  // Income CRUD
  updateIncomeAmount: (id: string, amount: number) => void
  addIncomeRow:       () => void
  removeIncomeRow:    (id: string) => void           // only isFixed=false
  updateIncomeLabel:  (id: string, label: string) => void // only isFixed=false

  // Liability CRUD
  updateLiability:     (id: string, field: 'monthlyPayment' | 'balance' | 'remainingMonths', value: number) => void
  addLiabilityRow:     () => void
  removeLiabilityRow:  (id: string) => void
  updateLiabilityLabel:(id: string, label: string) => void

  // Computed getters
  totalIncome:             () => number
  totalLiabilityPayments:  () => number
  disposableIncome:        () => number
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useAffordabilityStore = create<AffordabilityStore>()(
  persist(
    (set, get) => ({
      incomeRows:    FIXED_INCOME_ROWS,
      liabilityRows: FIXED_LIABILITY_ROWS,

      // ---- Income ----
      updateIncomeAmount: (id, amount) =>
        set((s) => ({ incomeRows: s.incomeRows.map((r) => r.id === id ? { ...r, amount } : r) })),

      addIncomeRow: () =>
        set((s) => ({
          incomeRows: [...s.incomeRows, {
            id: crypto.randomUUID(), label: 'הכנסה נוספת', amount: 0, isFixed: false,
          }],
        })),

      removeIncomeRow: (id) =>
        set((s) => ({ incomeRows: s.incomeRows.filter((r) => r.id !== id || r.isFixed) })),

      updateIncomeLabel: (id, label) =>
        set((s) => ({
          incomeRows: s.incomeRows.map((r) =>
            r.id === id && !r.isFixed ? { ...r, label } : r,
          ),
        })),

      // ---- Liabilities ----
      updateLiability: (id, field, value) =>
        set((s) => ({
          liabilityRows: s.liabilityRows.map((r) =>
            r.id === id ? { ...r, [field]: value } : r,
          ),
        })),

      addLiabilityRow: () =>
        set((s) => ({
          liabilityRows: [...s.liabilityRows, {
            id: crypto.randomUUID(), label: 'התחייבות נוספת',
            monthlyPayment: 0, balance: 0, remainingMonths: 0, isFixed: false,
          }],
        })),

      removeLiabilityRow: (id) =>
        set((s) => ({ liabilityRows: s.liabilityRows.filter((r) => r.id !== id || r.isFixed) })),

      updateLiabilityLabel: (id, label) =>
        set((s) => ({
          liabilityRows: s.liabilityRows.map((r) =>
            r.id === id && !r.isFixed ? { ...r, label } : r,
          ),
        })),

      // ---- Computed ----
      totalIncome: () =>
        get().incomeRows.reduce((sum, r) => sum + (r.amount || 0), 0),

      totalLiabilityPayments: () =>
        get().liabilityRows.reduce((sum, r) => {
          // Exclude loans with < 18 remaining months — about to end, don't penalise PTI.
          // remainingMonths === 0 means "not specified" → include (safe default).
          if (r.remainingMonths >= 1 && r.remainingMonths < 18) return sum
          return sum + (r.monthlyPayment || 0)
        }, 0),

      disposableIncome: () => {
        const g = get()
        return g.totalIncome() - g.totalLiabilityPayments()
      },
    }),
    {
      name: 'kumu-affordability-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ incomeRows: s.incomeRows, liabilityRows: s.liabilityRows }),
    }
  )
)
