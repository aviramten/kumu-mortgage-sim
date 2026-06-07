/**
 * ComparisonTab — flexible multi-mix analysis.
 * Supports 1–3 mixes selected via checkboxes.
 * Disabled checkboxes for mixes with no tracks.
 */

import { useMemo, useState } from 'react'
import { useMix } from '@/store/useMixStore'
import { calculateMix } from '@/engine/calculateMix'
import { ComparisonChart } from '@/components/outputs/charts/ComparisonChart'
import { formatCurrencyWhole, formatNumber } from '@/utils/format'
import { MIX_A_COLOR, MIX_B_COLOR, MIX_C_COLOR } from '@/utils/chartTheme'
import type { MixId } from '@/types/mix'
import type { MixKPIs } from '@/types/calculation'

// ---------------------------------------------------------------------------
// Mix meta — label, color, id
// ---------------------------------------------------------------------------
interface MixMeta {
  id:    MixId
  label: string
  color: string
}

const ALL_MIXES: MixMeta[] = [
  { id: 'a', label: "תמהיל א'", color: MIX_A_COLOR },
  { id: 'b', label: "תמהיל ב'", color: MIX_B_COLOR },
  { id: 'c', label: "תמהיל ג'", color: MIX_C_COLOR },
]

// ---------------------------------------------------------------------------
// KPI row definition
// ---------------------------------------------------------------------------
interface KpiRowDef {
  key:           keyof MixKPIs
  label:         string
  lowerIsBetter: boolean
  format:        (v: number) => string
}

const KPI_ROWS: KpiRowDef[] = [
  { key: 'totalCost',       label: 'עלות כוללת',      lowerIsBetter: true,  format: formatCurrencyWhole },
  { key: 'totalInterest',   label: 'סך ריבית',         lowerIsBetter: true,  format: formatCurrencyWhole },
  { key: 'totalIndexation', label: 'סך הצמדה / שע"ח', lowerIsBetter: true,  format: formatCurrencyWhole },
  { key: 'firstPayment',    label: 'החזר ראשון',       lowerIsBetter: true,  format: formatCurrencyWhole },
  { key: 'maxPayment',      label: 'החזר מקסימלי',    lowerIsBetter: true,  format: formatCurrencyWhole },
  {
    key: 'costPerShekel',
    label: 'עלות לכל ₪',
    lowerIsBetter: true,
    format: (v: number) => `${formatNumber(Math.round(v * 100) / 100)} ₪`,
  },
]

// ---------------------------------------------------------------------------
// Summary builder — KUMU tone
// ---------------------------------------------------------------------------
function buildSummary(
  selected: MixMeta[],
  kpisMap: Map<MixId, MixKPIs>,
): string {
  if (selected.length < 2) {
    return 'בחרו לפחות שני תמהילים כדי לראות השוואה משמעותית.'
  }

  const costs = selected.map((m) => ({ label: m.label, cost: kpisMap.get(m.id)!.totalCost }))
  costs.sort((a, b) => a.cost - b.cost)

  const cheapest = costs[0]
  const priciest = costs[costs.length - 1]
  const diff     = priciest.cost - cheapest.cost
  const pctDiff  = priciest.cost > 0 ? diff / priciest.cost : 0

  if (pctDiff < 0.01) {
    return 'התמהילים הנבחרים דומים מאוד בעלות הכוללת. ההחלטה ביניהם תלויה יותר ברמת הסיכון ובגמישות שאתם מחפשים.'
  }

  const savings = formatCurrencyWhole(diff)
  return `${cheapest.label} חוסך ${savings} לאורך כל חיי המשכנתא לעומת ${priciest.label}. שווה לבחון מה מייצר את ההפרש הזה לפני שמחליטים.`
}

// ---------------------------------------------------------------------------
// Mix selector checkboxes
// ---------------------------------------------------------------------------
function MixSelector({
  metas,
  hasTracks,
  selected,
  onChange,
}: {
  metas:     MixMeta[]
  hasTracks: Map<MixId, boolean>
  selected:  Set<MixId>
  onChange:  (id: MixId, checked: boolean) => void
}) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <span className="text-xs font-medium text-kumu-navy-light dark:text-kumu-blue-lighter">
        השוואה:
      </span>
      {metas.map((m) => {
        const enabled  = hasTracks.get(m.id) ?? false
        const checked  = selected.has(m.id) && enabled
        return (
          <label
            key={m.id}
            title={!enabled ? 'תמהיל זה ריק — הוסף מסלולים כדי לכלול אותו' : undefined}
            className={[
              'flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none',
              !enabled ? 'opacity-40 cursor-not-allowed' : '',
            ].join(' ')}
          >
            <input
              type="checkbox"
              disabled={!enabled}
              checked={checked}
              onChange={(e) => onChange(m.id, e.target.checked)}
              className="accent-kumu-blue w-3.5 h-3.5"
            />
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: m.color }}
            />
            <span className="text-kumu-navy dark:text-white">{m.label}</span>
          </label>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ComparisonTab() {
  const mixA = useMix('a')
  const mixB = useMix('b')
  const mixC = useMix('c')

  const hasTracks = new Map<MixId, boolean>([
    ['a', mixA.tracks.length > 0],
    ['b', mixB.tracks.length > 0],
    ['c', mixC.tracks.length > 0],
  ])

  // Start with all non-empty mixes selected (at most 2 on first render to match
  // the original two-mix experience; if all three are full, show all three)
  const [selected, setSelected] = useState<Set<MixId>>(() => {
    const init = new Set<MixId>()
    if (mixA.tracks.length > 0) init.add('a')
    if (mixB.tracks.length > 0) init.add('b')
    if (mixC.tracks.length > 0) init.add('c')
    return init
  })

  const handleToggle = (id: MixId, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  // Calculate results for all three mixes (cached separately)
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
  const resultC = useMemo(
    () => calculateMix(mixC.tracks, mixC.macroForecasts, mixC.prepayments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mixC.tracks, mixC.macroForecasts, mixC.prepayments],
  )

  const resultMap = new Map([
    ['a', resultA],
    ['b', resultB],
    ['c', resultC],
  ])

  // Only the selected + non-empty mixes appear in the comparison
  const activeMixes: MixMeta[] = ALL_MIXES.filter(
    (m) => selected.has(m.id) && hasTracks.get(m.id),
  )

  const kpisMap = new Map<MixId, MixKPIs>(
    activeMixes.map((m) => [m.id, resultMap.get(m.id)!.kpis]),
  )

  const chartEntries = activeMixes.map((m) => ({
    result: resultMap.get(m.id)!,
    label:  m.label,
    color:  m.color,
  }))

  const summary = buildSummary(activeMixes, kpisMap)
  const hasData = activeMixes.length >= 1 && activeMixes.every((m) => resultMap.get(m.id)!.trackResults.length > 0)

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-kumu-navy dark:text-white">
            השוואה ראש בראש
          </h2>
          <p className="text-xs text-kumu-navy-light dark:text-kumu-blue-lighter mt-0.5">
            בחרו אילו תמהילים להשוות — הנתונים יעודכנו בזמן אמת.
          </p>
        </div>

        {/* Mix selector checkboxes */}
        <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark px-4 py-2.5">
          <MixSelector
            metas={ALL_MIXES}
            hasTracks={hasTracks}
            selected={selected}
            onChange={handleToggle}
          />
        </div>
      </div>

      {activeMixes.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter">
            בחרו לפחות תמהיל אחד עם מסלולים כדי לפתוח את ההשוואה
          </p>
        </div>
      ) : !hasData ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter">
            מלאו את התמהילים הנבחרים כדי לפתוח את ההשוואה
          </p>
        </div>
      ) : (
        <>
          {/* Comparison line chart */}
          {activeMixes.length >= 2 && (
            <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
                  החזר החודשי לאורך הזמן
                </h3>
              </div>
              <div className="p-3">
                <ComparisonChart entries={chartEntries} />
              </div>
            </div>
          )}

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
                  {activeMixes.map((m) => (
                    <th
                      key={m.id}
                      className="px-4 py-2.5 text-left font-medium"
                      style={{ color: m.color }}
                    >
                      {m.label}
                    </th>
                  ))}
                  {activeMixes.length >= 2 && (
                    <th className="px-4 py-2.5 text-center font-medium">עדיף</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {KPI_ROWS.map((row) => {
                  const values = activeMixes.map((m) => ({
                    mixMeta: m,
                    value:   kpisMap.get(m.id)![row.key] as number,
                  }))

                  // Find best value index
                  const bestValue = row.lowerIsBetter
                    ? Math.min(...values.map((v) => v.value))
                    : Math.max(...values.map((v) => v.value))

                  // Best among all active mixes (for the "winner" badge)
                  const winnerMeta = values.find((v) => v.value === bestValue)?.mixMeta

                  return (
                    <tr
                      key={row.key}
                      className="border-t border-gray-50 dark:border-kumu-navy/50 hover:bg-gray-50/50 dark:hover:bg-kumu-navy/20"
                    >
                      <td className="px-4 py-2.5 text-right text-kumu-navy dark:text-white font-medium">
                        {row.label}
                      </td>

                      {values.map(({ mixMeta, value }) => {
                        const isBest = value === bestValue
                        return (
                          <td
                            key={mixMeta.id}
                            className={[
                              'px-4 py-2.5 text-left tabular-nums',
                              isBest && activeMixes.length > 1
                                ? 'text-kumu-green font-semibold'
                                : 'text-kumu-navy dark:text-white',
                            ].join(' ')}
                          >
                            {row.format(value)}
                          </td>
                        )
                      })}

                      {activeMixes.length >= 2 && (
                        <td className="px-4 py-2.5 text-center">
                          {winnerMeta && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{
                                background: `${winnerMeta.color}1A`,
                                color:      winnerMeta.color,
                              }}
                            >
                              {winnerMeta.label}
                            </span>
                          )}
                        </td>
                      )}
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
