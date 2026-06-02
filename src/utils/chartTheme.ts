/**
 * chartTheme.ts — KUMU brand tokens for Recharts components.
 *
 * All chart components import from here so the palette stays in sync
 * with the global CSS tokens in tailwind.config.ts.
 */

import type { LoanTrack } from '@/types/track'

// ---------------------------------------------------------------------------
// Per-track-type palette (9 tracks)
// ---------------------------------------------------------------------------
export const KUMU_CHART_COLORS: Record<LoanTrack['type'], string> = {
  'prime':             '#3B5BDB', // kumu-blue        — פריים
  'fixed-unlinked':    '#5B7BFF', // kumu-blue-light  — קל"צ
  'fixed-linked':      '#A5B8FF', // kumu-blue-lighter — ק"צ
  'variable-linked':   '#1A2456', // kumu-navy        — מ"צ
  'variable-unlinked': '#2D3D7A', // kumu-navy-light  — מל"צ
  'eligibility':       '#A879E0', // kumu-purple      — זכאות
  'variable-makam':    '#5BB572', // kumu-green       — מק"מ
  'usd':               '#E87A5D', // kumu-coral       — דולר
  'eur':               '#F5D547', // kumu-yellow      — יורו
}

// ---------------------------------------------------------------------------
// KPI cost-breakdown palette (4 layers in stacked bar)
// ---------------------------------------------------------------------------
export const KUMU_KPI_COLORS = {
  principal:   '#1A2456', // navy  — קרן
  interest:    '#3B5BDB', // blue  — ריבית
  indexation:  '#E87A5D', // coral — הצמדה / הפרשי שע"ח
  fxDiff:      '#F5D547', // yellow
  savings:     '#5BB572', // green — חיסכון
}

// Mix comparison palette
export const MIX_A_COLOR = '#3B5BDB' // kumu-blue
export const MIX_B_COLOR = '#E87A5D' // kumu-coral

// ---------------------------------------------------------------------------
// Shared Recharts style helpers (functions so they react to dark-mode toggle)
// ---------------------------------------------------------------------------
export function getChartTooltipStyle(isDark: boolean): React.CSSProperties {
  return {
    backgroundColor: isDark ? '#1A2456' : '#FFFFFF',
    border:          `1px solid ${isDark ? '#3B5BDB40' : '#E5E7EB'}`,
    borderRadius:    '10px',
    padding:         '10px 14px',
    fontFamily:      'Heebo, sans-serif',
    fontSize:        '13px',
    color:           isDark ? '#F4F7FB' : '#1A2456',
    direction:       'rtl',
    boxShadow:       '0 4px 24px rgba(0,0,0,0.08)',
  }
}

export function getChartAxisStyle(isDark: boolean) {
  return {
    stroke:     isDark ? '#A5B8FF' : '#9CA3AF',
    fontSize:   11,
    fontFamily: 'Heebo, sans-serif',
    fill:       isDark ? '#A5B8FF' : '#6B7280',
  }
}

export const CHART_GRID_COLOR_LIGHT = '#F3F4F6'
export const CHART_GRID_COLOR_DARK  = '#1A2456'
