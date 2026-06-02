/**
 * AmortizationTable — accordion with full monthly / yearly amortisation schedule.
 *
 * Controls:
 *  • Monthly / Yearly toggle
 *  • Track filter (all | specific track)
 *  • Jump-to-month
 *
 * Highlights:
 *  • Prepayment rows — yellow bg + badge
 *  • Rate-change rows — light-blue bg + badge
 *  • Sticky totals row at bottom
 */

import { useMemo, useState, useRef, useCallback } from 'react'
import { ChevronDown, ChevronUp, Download, Printer } from 'lucide-react'
import { useMix } from '@/store/useMixStore'
import { calculateMix } from '@/engine/calculateMix'
import { formatCurrency, formatCurrencyWhole } from '@/utils/format'
import { TRACK_TYPE_LABELS } from '@/utils/constants'
import type { MixId } from '@/types/mix'
import type { LoanTrack, MonthlyRow } from '@/types/track'

// ---------------------------------------------------------------------------
// Notable-month helpers
// ---------------------------------------------------------------------------
function getRateChangePeriod(track: LoanTrack): number | null {
  switch (track.type) {
    case 'prime': case 'variable-makam': case 'usd': case 'eur': return 12
    case 'variable-linked': case 'variable-unlinked': return track.rateChangePeriod ?? 60
    default: return null
  }
}

function buildRateChangeSet(tracks: LoanTrack[]): Set<number> {
  const s = new Set<number>()
  for (const t of tracks) {
    const p = getRateChangePeriod(t)
    if (p) {
      for (let m = p + 1; m <= t.months; m += p) s.add(m)
    }
  }
  return s
}

// ---------------------------------------------------------------------------
// Flat row type (for table rendering)
// ---------------------------------------------------------------------------
interface TableRow {
  month:              number
  openingBalance:     number
  principalPayment:   number
  interestPayment:    number
  inflationComponent: number
  totalPayment:       number
  closingBalance:     number
  isPrepayment?:      boolean
  isRateChange?:      boolean
  // for yearly view:
  isYearRow?:         boolean
}

// ---------------------------------------------------------------------------
// Build monthly rows from MixResult (all tracks aggregated or single track)
// ---------------------------------------------------------------------------
function buildMonthlyRows(
  trackResults: { trackId: string; rows: MonthlyRow[] }[],
  filterTrackId: string | 'all',
  rateChangeMonths: Set<number>,
  prepaymentMonths: Set<number>,
): TableRow[] {
  const filtered = filterTrackId === 'all'
    ? trackResults
    : trackResults.filter((tr) => tr.trackId === filterTrackId)

  const map = new Map<number, TableRow>()

  for (const tr of filtered) {
    for (const row of tr.rows) {
      const existing = map.get(row.month)
      if (existing) {
        existing.principalPayment   += row.principalPayment
        existing.interestPayment    += row.interestPayment
        existing.inflationComponent += row.inflationComponent
        existing.totalPayment       += row.totalPayment
        existing.closingBalance     += row.closingBalance
      } else {
        map.set(row.month, {
          month:              row.month,
          openingBalance:     row.openingBalance,
          principalPayment:   row.principalPayment,
          interestPayment:    row.interestPayment,
          inflationComponent: row.inflationComponent,
          totalPayment:       row.totalPayment,
          closingBalance:     row.closingBalance,
          isPrepayment:       prepaymentMonths.has(row.month),
          isRateChange:       rateChangeMonths.has(row.month),
        })
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.month - b.month)
}

// ---------------------------------------------------------------------------
// Aggregate monthly rows into yearly buckets
// ---------------------------------------------------------------------------
function aggregateYearly(rows: TableRow[]): TableRow[] {
  const yearMap = new Map<number, TableRow>()
  for (const row of rows) {
    const year = Math.ceil(row.month / 12)
    const existing = yearMap.get(year)
    if (existing) {
      existing.principalPayment   += row.principalPayment
      existing.interestPayment    += row.interestPayment
      existing.inflationComponent += row.inflationComponent
      existing.totalPayment       += row.totalPayment
      existing.closingBalance      = row.closingBalance // last of year
      if (row.isPrepayment) existing.isPrepayment = true
      if (row.isRateChange) existing.isRateChange = true
    } else {
      yearMap.set(year, {
        month:              year,            // re-use month field for year label
        openingBalance:     row.openingBalance,
        principalPayment:   row.principalPayment,
        interestPayment:    row.interestPayment,
        inflationComponent: row.inflationComponent,
        totalPayment:       row.totalPayment,
        closingBalance:     row.closingBalance,
        isPrepayment:       row.isPrepayment,
        isRateChange:       row.isRateChange,
        isYearRow:          true,
      })
    }
  }
  return Array.from(yearMap.values()).sort((a, b) => a.month - b.month)
}

// ---------------------------------------------------------------------------
// Row-class helper
// ---------------------------------------------------------------------------
function rowClass(row: TableRow): string {
  if (row.isPrepayment)
    return 'bg-amber-50 dark:bg-amber-900/10'
  if (row.isRateChange)
    return 'bg-blue-50 dark:bg-blue-900/10'
  return 'hover:bg-gray-50 dark:hover:bg-kumu-navy/30'
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
// Types / props
// ---------------------------------------------------------------------------
interface AmortizationTableProps {
  mixId: MixId
}

// ---------------------------------------------------------------------------
// CSV export helper
// ---------------------------------------------------------------------------
function downloadCSV(rows: TableRow[], mixId: MixId) {
  const headers = ['חודש', 'יתרת פתיחה', 'תשלום קרן', 'תשלום ריבית', 'הצמדה/שע"ח', 'סך תשלום', 'יתרת סגירה']
  const lines = rows.map((r) => [
    r.isYearRow ? `שנה ${r.month}` : String(r.month),
    Math.round(r.openingBalance),
    Math.round(r.principalPayment),
    Math.round(r.interestPayment),
    Math.round(r.inflationComponent),
    Math.round(r.totalPayment),
    Math.round(r.closingBalance),
  ].join(','))

  // BOM (uFEFF) ensures Excel opens Hebrew text correctly
  const content = '﻿' + [headers.join(','), ...lines].join('\r\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `kumu-amortization-mix-${mixId}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
export function AmortizationTable({ mixId }: AmortizationTableProps) {
  const [open,           setOpen]           = useState(false)
  const [viewMode,       setViewMode]       = useState<'monthly' | 'yearly'>('monthly')
  const [filterTrackId,  setFilterTrackId]  = useState<string>('all')
  const [jumpTo,         setJumpTo]         = useState('')

  const mix = useMix(mixId)
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map())

  const result = useMemo(
    () => calculateMix(mix.tracks, mix.macroForecasts, mix.prepayments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mix.tracks, mix.macroForecasts, mix.prepayments],
  )

  const rateChangeMonths = useMemo(() => buildRateChangeSet(mix.tracks), [mix.tracks])
  const prepaymentMonths = useMemo(() => new Set(mix.prepayments.map((p) => p.month)), [mix.prepayments])

  // Build full monthly rows
  const monthlyRows = useMemo(
    () => buildMonthlyRows(result.trackResults, filterTrackId, rateChangeMonths, prepaymentMonths),
    [result.trackResults, filterTrackId, rateChangeMonths, prepaymentMonths],
  )

  const displayRows = useMemo(
    () => viewMode === 'yearly' ? aggregateYearly(monthlyRows) : monthlyRows,
    [viewMode, monthlyRows],
  )

  // Totals row
  const totals = useMemo(() => ({
    principalPayment:   displayRows.reduce((s, r) => s + r.principalPayment,   0),
    interestPayment:    displayRows.reduce((s, r) => s + r.interestPayment,    0),
    inflationComponent: displayRows.reduce((s, r) => s + r.inflationComponent, 0),
    totalPayment:       displayRows.reduce((s, r) => s + r.totalPayment,       0),
  }), [displayRows])

  // Jump-to handler
  const handleJump = useCallback(() => {
    const n = parseInt(jumpTo)
    if (isNaN(n)) return
    const key = viewMode === 'yearly' ? Math.ceil(n / 12) : n
    const el = rowRefs.current.get(key)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [jumpTo, viewMode])

  // CSV export — always exports the full monthly schedule
  const handleExportCSV = useCallback(() => {
    downloadCSV(monthlyRows, mixId)
  }, [monthlyRows, mixId])

  const trackOptions = mix.tracks.map((t: LoanTrack) => ({
    id:    t.id,
    label: TRACK_TYPE_LABELS[t.type] ?? t.type,
  }))

  const hasData = displayRows.length > 0

  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
      {/* Hidden print header — shown only via print.css */}
      <div className="print-header hidden">
        <div className="print-header-logo">K</div>
        <div className="print-header-title">
          <span className="brand">KUMU</span>
          <span className="subtitle">
            סימולטור משכנתא — טבלת סילוקין {mixId === 'a' ? "תמהיל א'" : "תמהיל ב'"}
          </span>
        </div>
      </div>

      {/* Accordion header */}
      <div className="flex items-center justify-between px-4 py-3 no-print">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 flex-1 text-right"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
            טבלת סילוקין מפורטת
          </span>
          <span className="text-kumu-navy-light dark:text-kumu-blue-lighter">
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </span>
        </button>

        {/* Export / Print buttons — only when open and has data */}
        {open && hasData && (
          <div className="flex items-center gap-1.5 mr-2">
            <button
              type="button"
              onClick={handleExportCSV}
              title="יצוא ל-CSV (תואם Excel)"
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-kumu-blue/10 text-kumu-blue hover:bg-kumu-blue/20 transition-colors"
            >
              <Download size={12} />
              CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              title="הדפסה / שמירה כ-PDF"
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 dark:border-kumu-navy-light text-kumu-navy-light dark:text-kumu-blue-lighter hover:bg-gray-50 dark:hover:bg-kumu-navy transition-colors"
            >
              <Printer size={12} />
              PDF
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="amortization-body border-t border-gray-100 dark:border-kumu-navy-light">
          {!hasData ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter">
                הוסף מסלולים לתמהיל כדי לראות את טבלת הסילוקין
              </p>
            </div>
          ) : (
            <>
              {/* Controls row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light flex-wrap">
                {/* View mode toggle */}
                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-kumu-navy-light text-xs">
                  {(['monthly', 'yearly'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={[
                        'px-3 py-1.5 transition-colors',
                        viewMode === mode
                          ? 'bg-kumu-blue text-white'
                          : 'text-kumu-navy-light dark:text-kumu-blue-lighter hover:bg-gray-50 dark:hover:bg-kumu-navy',
                      ].join(' ')}
                    >
                      {mode === 'monthly' ? 'חודשי' : 'שנתי'}
                    </button>
                  ))}
                </div>

                {/* Track filter */}
                <select
                  value={filterTrackId}
                  onChange={(e) => setFilterTrackId(e.target.value)}
                  className="text-xs rounded-lg border border-gray-200 dark:border-kumu-navy-light bg-transparent text-kumu-navy dark:text-kumu-blue-lighter px-2 py-1.5 outline-none"
                >
                  <option value="all">כל המסלולים</option>
                  {trackOptions.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>

                {/* Jump to month */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={360}
                    placeholder={viewMode === 'monthly' ? 'קפוץ לחודש…' : 'קפוץ לשנה…'}
                    value={jumpTo}
                    onChange={(e) => setJumpTo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                    className="text-xs w-32 rounded-lg border border-gray-200 dark:border-kumu-navy-light bg-transparent text-kumu-navy dark:text-kumu-blue-lighter px-2 py-1.5 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={handleJump}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-kumu-blue/10 text-kumu-blue hover:bg-kumu-blue/20 transition-colors"
                  >
                    קפוץ
                  </button>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 mr-auto text-[10px] text-kumu-navy-light dark:text-kumu-blue-lighter">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-amber-200 inline-block" />
                    פירעון מוקדם
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-blue-200 inline-block" />
                    תחנת שינוי
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-auto max-h-96 relative">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-kumu-navy text-kumu-navy-light dark:text-kumu-blue-lighter sticky top-0 z-10">
                      <th className="px-3 py-2 text-right font-medium">
                        {viewMode === 'yearly' ? 'שנה' : 'חודש'}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">יתרת פתיחה</th>
                      <th className="px-3 py-2 text-left font-medium">תשלום קרן</th>
                      <th className="px-3 py-2 text-left font-medium">תשלום ריבית</th>
                      <th className="px-3 py-2 text-left font-medium">הצמדה / שע"ח</th>
                      <th className="px-3 py-2 text-left font-medium">סך תשלום</th>
                      <th className="px-3 py-2 text-left font-medium">יתרת סגירה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((row) => (
                      <tr
                        key={row.month}
                        ref={(el) => {
                          if (el) rowRefs.current.set(row.month, el)
                          else rowRefs.current.delete(row.month)
                        }}
                        className={`border-b border-gray-50 dark:border-kumu-navy/50 transition-colors ${rowClass(row)}`}
                      >
                        <td className="px-3 py-1.5 text-right">
                          <span className="font-medium text-kumu-navy dark:text-white">
                            {row.isYearRow ? `שנה ${row.month}` : row.month}
                          </span>
                          {row.isPrepayment && (
                            <span className="mr-1 text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded px-1 py-0.5">
                              פירעון
                            </span>
                          )}
                          {row.isRateChange && !row.isPrepayment && (
                            <span className="mr-1 text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded px-1 py-0.5">
                              תחנה
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums text-kumu-navy dark:text-white text-left">
                          {formatCurrency(row.openingBalance)}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums text-kumu-navy dark:text-white text-left">
                          {formatCurrency(row.principalPayment)}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums text-kumu-navy dark:text-white text-left">
                          {formatCurrency(row.interestPayment)}
                        </td>
                        <td className={`px-3 py-1.5 tabular-nums text-left ${
                          row.inflationComponent > 0
                            ? 'text-kumu-coral'
                            : 'text-kumu-navy dark:text-white'
                        }`}>
                          {formatCurrency(row.inflationComponent)}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums text-kumu-navy dark:text-white text-left font-medium">
                          {formatCurrency(row.totalPayment)}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums text-kumu-navy dark:text-white text-left">
                          {formatCurrency(row.closingBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Sticky totals row */}
                  <tfoot className="sticky bottom-0 bg-gray-50 dark:bg-kumu-navy border-t border-gray-200 dark:border-kumu-navy-light">
                    <tr className="font-semibold text-kumu-navy dark:text-white">
                      <td className="px-3 py-2 text-right">סיכום</td>
                      <td className="px-3 py-2 text-left" />
                      <td className="px-3 py-2 tabular-nums text-left">
                        {formatCurrencyWhole(totals.principalPayment)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-left">
                        {formatCurrencyWhole(totals.interestPayment)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-left text-kumu-coral">
                        {formatCurrencyWhole(totals.inflationComponent)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-left text-kumu-blue">
                        {formatCurrencyWhole(totals.totalPayment)}
                      </td>
                      <td className="px-3 py-2 text-left" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
