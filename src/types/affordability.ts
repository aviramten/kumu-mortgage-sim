export interface IncomeRow {
  id: string
  label: string
  amount: number
  isFixed: boolean
}

export interface LiabilityRow {
  id: string
  label: string
  /** החזר חודשי (₪) — used in PTI denominator */
  monthlyPayment: number
  /** יתרת חוב (₪) — informational */
  balance: number
  /** יתרת תקופה (חודשים) — informational */
  remainingMonths: number
  isFixed: boolean
}

export interface AffordabilityState {
  incomeRows:    IncomeRow[]
  liabilityRows: LiabilityRow[]
}
