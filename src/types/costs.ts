export interface CostRow {
  /** UUID */
  id: string
  /** שם הסעיף */
  label: string
  /** סכום בשקלים, 0 כברירת מחדל */
  amount: number
  /** true = שורה קבועה (לא ניתן למחוק), false = שורה שנוספה ידנית */
  isFixed: boolean
}

export interface TransactionCostsState {
  rows: CostRow[]
}
