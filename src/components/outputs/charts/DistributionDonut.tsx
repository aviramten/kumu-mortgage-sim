/**
 * DistributionDonut — track allocation as a donut (% of mortgage).
 * Placed in the outputs column; re-renders whenever tracks change.
 */

import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useThemeStore } from '@/store/useThemeStore'
import { useMix } from '@/store/useMixStore'
import { TRACK_TYPE_LABELS } from '@/utils/constants'
import { formatCurrencyWhole, formatNumber } from '@/utils/format'
import type { MixId } from '@/types/mix'
import type { LoanTrack } from '@/types/track'

// ---------------------------------------------------------------------------
// Vibrant, highly-distinct per-slice color palette (index-based)
// ---------------------------------------------------------------------------
const SLICE_COLORS = [
  '#3B5BDB', // kumu-blue
  '#E87A5D', // coral
  '#5BB572', // green
  '#A879E0', // purple
  '#F59E0B', // amber
  '#14B8A6', // teal
  '#F43F5E', // rose
  '#FB923C', // orange
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface SliceItem {
  name:  string
  value: number
  type:  LoanTrack['type']
  pct:   number
  color: string
}

function buildSlices(tracks: LoanTrack[]): { slices: SliceItem[]; total: number } {
  const total = tracks.reduce((s, t) => s + t.amount, 0)

  // Count occurrences per display label for deduplication
  const typeCounts: Record<string, number> = {}
  for (const t of tracks) {
    const lbl = TRACK_TYPE_LABELS[t.type] ?? t.type
    typeCounts[lbl] = (typeCounts[lbl] ?? 0) + 1
  }
  const typeIdx: Record<string, number> = {}

  const slices = tracks.map((t, i) => {
    const baseLabel = TRACK_TYPE_LABELS[t.type] ?? t.type
    typeIdx[baseLabel] = (typeIdx[baseLabel] ?? 0) + 1
    const name = typeCounts[baseLabel] > 1
      ? `${baseLabel} (${typeIdx[baseLabel]})`
      : baseLabel
    return {
      name,
      value: t.amount,
      type:  t.type,
      pct:   total > 0 ? Math.round((t.amount / total) * 100) : 0,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }
  })
  return { slices, total }
}

// Custom tooltip
function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: SliceItem }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      style={{
        background: 'var(--tooltip-bg, #fff)',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        padding: '10px 14px',
        fontFamily: 'Heebo, sans-serif',
        direction: 'rtl',
      }}
    >
      <p className="font-semibold text-kumu-navy dark:text-white text-[13px]">{d.name}</p>
      <p className="text-[12px] text-kumu-navy-light dark:text-kumu-blue-lighter">
        {formatCurrencyWhole(d.value)} · {d.pct}%
      </p>
    </div>
  )
}

// Custom legend renderer
function CustomLegend({ payload }: { payload?: { value: string; color: string }[] }) {
  if (!payload) return null
  return (
    <ul className="flex flex-col gap-1.5 pr-2">
      {payload.map((entry) => (
        <li key={entry.value} className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-[11px] text-kumu-navy dark:text-kumu-blue-lighter">
            {entry.value}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
interface DistributionDonutProps {
  mixId: MixId
}

export function DistributionDonut({ mixId }: DistributionDonutProps) {
  const mix = useMix(mixId)
  const { theme } = useThemeStore()
  const isDark = theme === 'dark'

  const { slices, total } = useMemo(
    () => buildSlices(mix.tracks),
    [mix.tracks],
  )

  const isEmpty = slices.length === 0

  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-kumu-navy-light">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-kumu-blue dark:text-kumu-blue-lighter">
          התפלגות התמהיל
        </h2>
      </div>

      <div className="p-3">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter">
              הוסף מסלולים לתמהיל כדי לראות את ההתפלגות
            </p>
          </div>
        ) : (
          /* Split layout: donut (left 60%) + legend (right 40%).
             Legend is rendered outside Recharts so it cannot shift the pie's cx. */
          <div style={{ height: 220, display: 'flex', alignItems: 'center', gap: 0 }}>

            {/* ── Donut area ──────────────────────────────────────────────── */}
            <div className="relative" style={{ flex: '0 0 60%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                    animationDuration={800}
                  >
                    {slices.map((s, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={s.color}
                        stroke={isDark ? '#0F1633' : '#fff'}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center label — cx=50% cy=50% so overlay is exactly 50%/50% */}
              <div
                className="absolute text-center pointer-events-none"
                style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <p
                  className="text-[15px] font-bold text-kumu-navy dark:text-white tabular-nums leading-tight"
                  dir="ltr"
                >
                  ₪{formatNumber(Math.round(total))}
                </p>
                <p className="text-[10px] text-kumu-navy-light dark:text-kumu-blue-lighter mt-0.5">
                  סך הקרן
                </p>
              </div>
            </div>

            {/* ── Legend area ─────────────────────────────────────────────── */}
            <div style={{ flex: '0 0 40%', display: 'flex', alignItems: 'center', paddingRight: 4 }}>
              <CustomLegend
                payload={slices.map((s) => ({ value: s.name, color: s.color }))}
              />
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
