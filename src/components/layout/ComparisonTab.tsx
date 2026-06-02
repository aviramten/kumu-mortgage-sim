/**
 * ComparisonTab — side-by-side analysis of Mix A vs Mix B.
 * Only rendered when Mix B has at least one calculable track.
 */

import { useMemo } from 'react'
import { useMix } from '@/store/useMixStore'
import { calculateMix } from '@/engine/calculateMix'
import { ComparisonChart } from '@/components/outputs/charts/ComparisonChart'
import { formatCurrencyWhole, formatNumber } from '@/utils/format'

// ---------------------------------------------------------------------------
// Comparison table row definition
// ---------------------------------------------------------------------------
interface CompRow {
  label:  string
  a:      number
  b:      number
  lowerIsBetter: boolean
}

function buildRows(
  kpisA: ReturnType<typeof calculateMix>['kpis'],
  kpisB: ReturnType<typeof calculateMix>['kpis'],
): CompRow[] {
  return [
    { label: 'עלות כוללת',         a: kpisA.totalCost,       b: kpisB.totalCost,       lowerIsBetter: true  },
    { label: 'סך ריבית',            a: kpisA.totalInterest,   b: kpisB.totalInterest,   lowerIsBetter: true  },
    { label: 'סך הצמדה / שע"ח',   a: kpisA.totalIndexation, b: kpisB.totalIndexation, lowerIsBetter: true  },
    { label: 'החזר ראשון',          a: kpisA.firstPayment,    b: kpisB.firstPayment,    lowerIsBetter: true  },
    { label: 'החזר מקסימלי',        a: kpisA.maxPayment,      b: kpisB.maxPayment,      lowerIsBetter: true  },
    { label: 'עלות לכל ₪',         a: kpisA.costPerShekel,   b: kpisB.costPerShekel,   lowerIsBetter: true  },
  ]
}

// ---------------------------------------------------------------------------
// Summary text in KUMU tone
// ---------------------------------------------------------------------------
function buildSummary(
  kpisA: ReturnType<typeof calculateMix>['kpis'],
  kpisB: ReturnType<typeof calculateMix>['kpis'],
): string {
  const diff    = kpisB.totalCost - kpisA.totalCost
  const absDiff = Math.abs(diff)
  const pctDiff = kpisA.totalCost > 0 ? absDiff / kpisA.totalCost : 0

  if (pctDiff < 0.01) {
    return 'שני התמהילים דומים מאוד בעלות הכוללת. ההחלטה ביניהם תלויה יותר בסיכון ובגמישות שאתם מחפשים, מאשר בהבדל הכלכלי.'
  }
  const cheaperMix = diff > 0 ? "א'" : "ב'"
  const savings    = formatCurrencyWhole(absDiff)
  return `תמהיל ${cheaperMix} חוסך ${savings} לאורך כל חיי המשכנתא. לא מדובר בסכום זניח — שווה לוודא שאתם מבינים מה מייצר את ההפרש הזה לפני שמחליטים.`
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
export function ComparisonTab() {
  const mixA = useMix('a')
  const mixB = useMix('b')

  const resultA = useMemo(
    () => calculateMix(mixA.tracks, mixA.macroForecasts, mixA.prepayments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mixA.tracks, mixA.macroForecasts, mixA.prepayments],
  )

  const resultB = useMemo(
    () => calculateMix(mixB.tracks, mixB.macroForecasts, mixB.prepayments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mixB.tracks, mixB.macroForecasts, mixB.prepayments],
  )

  const rows    = buildRows(resultA.kpis, resultB.kpis)
  const summary = buildSummary(resultA.kpis, resultB.kpis)

  const hasData = resultA.trackResults.length > 0 && resultB.trackResults.length > 0

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">

      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-kumu-navy dark:text-white">
          השוואה ראש בראש
        </h2>
        <p className="text-xs text-kumu-navy-light dark:text-kumu-blue-lighter mt-0.5">
          שני התמהילים על אותם הצירים — כדי שתוכלו לראות בדיוק איפה ההבדל.
        </p>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter">
            מלאו את שני התמהילים כדי לפתוח את ההשוואה
          </p>
        </div>
      ) : (
        <>
          {/* Comparison line chart */}
          <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
                השחזר החודשי לאורך הזמן
              </h3>
            </div>
            <div className="p-3">
              <ComparisonChart resultA={resultA} resultB={resultB} />
            </div>
          </div>

          {/* Comparison table */}
          <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
                טבלת השוואה
              </h3>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-kumu-navy text-kumu-navy-light dark:text-kumu-blue-lighter">
                  <th className="px-4 py-2.5 text-right font-medium">מדד</th>
                  <th className="px-4 py-2.5 text-left font-medium text-kumu-blue">תמהיל א'</th>
                  <th className="px-4 py-2.5 text-left font-medium text-kumu-coral">תמהיל ב'</th>
                  <th className="px-4 py-2.5 text-left font-medium">הפרש</th>
                  <th className="px-4 py-2.5 text-center font-medium">עדיף</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const diff      = row.b - row.a
                  const absDiff   = Math.abs(diff)
                  const aIsLower  = row.a <= row.b
                  const winner    = (row.lowerIsBetter && aIsLower) || (!row.lowerIsBetter && !aIsLower)
                    ? 'a' : 'b'

                  const fmt = row.label === 'עלות לכל ₪'
                    ? (v: number) => `${formatNumber(Math.round(v * 100) / 100)} ₪`
                    : formatCurrencyWhole

                  return (
                    <tr key={row.label} className="border-t border-gray-50 dark:border-kumu-navy/50 hover:bg-gray-50/50 dark:hover:bg-kumu-navy/20">
                      <td className="px-4 py-2.5 text-right text-kumu-navy dark:text-white font-medium">
                        {row.label}
                      </td>
                      <td className="px-4 py-2.5 text-left tabular-nums text-kumu-navy dark:text-white">
                        {fmt(row.a)}
                      </td>
                      <td className="px-4 py-2.5 text-left tabular-nums text-kumu-navy dark:text-white">
                        {fmt(row.b)}
                      </td>
                      <td className={`px-4 py-2.5 text-left tabular-nums ${
                        diff === 0 ? 'text-kumu-navy-light dark:text-kumu-blue-lighter'
                        : diff > 0  ? 'text-kumu-green' : 'text-kumu-coral'
                      }`}>
                        {diff === 0 ? '—' : `${diff > 0 ? '+' : '-'}${fmt(absDiff)}`}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          winner === 'a'
                            ? 'bg-kumu-blue/10 text-kumu-blue'
                            : 'bg-kumu-coral/10 text-kumu-coral'
                        }`}>
                          תמהיל {winner === 'a' ? "א'" : "ב'"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Summary block */}
          <div className="rounded-xl border border-kumu-blue/20 dark:border-kumu-blue/30 bg-kumu-blue/5 dark:bg-kumu-blue/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter mb-2">
              סיכום
            </p>
            <p className="text-sm text-kumu-navy dark:text-white leading-relaxed">
              {summary}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
