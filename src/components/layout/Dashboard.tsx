import { useEffect, useRef, useState } from 'react'
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import {
  BarChart3, TrendingUp, LayoutList, Copy, GitCompare,
  Receipt, ShieldCheck, ChevronDown,
} from 'lucide-react'
import { Header } from './Header'
import { Footer } from './Footer'
import { ComparisonTab } from './ComparisonTab'
import { GlobalInputs } from '@/components/inputs/GlobalInputs'
import { MacroForecasts } from '@/components/inputs/MacroForecasts'
import { TracksManager } from '@/components/tracks/TracksManager'
import { PrepaymentEvents } from '@/components/tracks/PrepaymentEvents'
import { KPIDashboard } from '@/components/outputs/KPIDashboard'
import { DistributionDonut } from '@/components/outputs/charts/DistributionDonut'
import { PaymentLineChart } from '@/components/outputs/charts/PaymentLineChart'
import { CostBreakdownBars } from '@/components/outputs/charts/CostBreakdownBars'
import { AmortizationTable } from '@/components/outputs/AmortizationTable'
import { InvestmentTab } from '@/components/investment/InvestmentTab'
import { useMix, useMixStore } from '@/store/useMixStore'
import type { MixId } from '@/types/mix'

// ---------------------------------------------------------------------------
// Mix meta helpers
// ---------------------------------------------------------------------------
const MIX_LABELS: Record<MixId, string> = {
  a: "תמהיל א'",
  b: "תמהיל ב'",
  c: "תמהיל ג'",
}

// ---------------------------------------------------------------------------
// Tab configuration — order = right-to-left in RTL layout
// ---------------------------------------------------------------------------
const TABS = [
  { to: '/mix-a',      label: "תמהיל א'",     icon: LayoutList  },
  { to: '/mix-b',      label: "תמהיל ב'",     icon: BarChart3   },
  { to: '/mix-c',      label: "תמהיל ג'",     icon: BarChart3   },
  { to: '/comparison', label: 'השוואה',        icon: GitCompare  },
  { to: '/expenses',   label: 'הוצאות עסקה',  icon: Receipt     },
  { to: '/capacity',   label: 'כושר החזר',    icon: ShieldCheck },
  { to: '/investment', label: 'מחשבון השקעה', icon: TrendingUp  },
] as const

// ---------------------------------------------------------------------------
// Placeholder tab — for sections not yet implemented
// ---------------------------------------------------------------------------
function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 px-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-kumu-navy flex items-center justify-center">
        <BarChart3 size={24} className="text-kumu-navy-light dark:text-kumu-blue-lighter" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-kumu-navy dark:text-white mb-2">{title}</h2>
        <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter max-w-sm leading-relaxed">
          {description}
        </p>
      </div>
      <span className="text-xs text-kumu-blue dark:text-kumu-blue-lighter bg-kumu-blue/10 dark:bg-kumu-blue/20 px-3 py-1 rounded-full font-medium">
        בקרוב
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Duplicate-mix dropdown — small button per mix tab
// ---------------------------------------------------------------------------
interface DuplicateDropdownProps {
  sourceMixId: MixId
}

function DuplicateDropdown({ sourceMixId }: DuplicateDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const { duplicateMix } = useMixStore()
  const mixA = useMix('a')
  const mixB = useMix('b')
  const mixC = useMix('c')

  const hasTracks: Record<MixId, boolean> = {
    a: mixA.tracks.length > 0,
    b: mixB.tracks.length > 0,
    c: mixC.tracks.length > 0,
  }

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const targets: MixId[] = (['a', 'b', 'c'] as MixId[]).filter((id) => id !== sourceMixId)

  const handleDuplicate = (targetId: MixId) => {
    const targetLabel = MIX_LABELS[targetId]
    const sourceLabel = MIX_LABELS[sourceMixId]

    if (hasTracks[targetId]) {
      const confirmed = window.confirm(
        `כדי לשכפל את ${sourceLabel} אל ${targetLabel}, הנתונים הקיימים ב${targetLabel} יימחקו. להמשיך?`
      )
      if (!confirmed) { setOpen(false); return }
    }

    duplicateMix(sourceMixId, targetId)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-gray-200 dark:border-kumu-navy-light text-kumu-navy-light dark:text-kumu-blue-lighter text-xs font-medium hover:bg-gray-50 dark:hover:bg-kumu-navy hover:text-kumu-navy dark:hover:text-white transition-colors"
      >
        <Copy size={12} />
        שכפל תמהיל
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 bg-white dark:bg-kumu-surface-dark border border-gray-100 dark:border-kumu-navy-light rounded-xl shadow-lg z-20 min-w-[180px] overflow-hidden">
          <p className="px-3 pt-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-kumu-navy-light dark:text-kumu-blue-lighter border-b border-gray-100 dark:border-kumu-navy-light">
            שמור עותק ב...
          </p>
          {targets.map((targetId) => (
            <button
              key={targetId}
              type="button"
              onClick={() => handleDuplicate(targetId)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-kumu-navy dark:text-white hover:bg-kumu-blue/5 dark:hover:bg-kumu-blue/10 transition-colors"
            >
              <span>{MIX_LABELS[targetId]}</span>
              {hasTracks[targetId] && (
                <span className="text-[10px] text-kumu-navy-light dark:text-kumu-blue-lighter">
                  (ידרוס)
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mix tab content — stacked layout with duplicate button at top
// ---------------------------------------------------------------------------
function MixTabContent({ mixId }: { mixId: MixId }) {
  return (
    <div className="flex flex-col gap-4 p-4">

      {/* ── Duplicate toolbar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-end">
        <DuplicateDropdown sourceMixId={mixId} />
      </div>

      {/* ── Row 1: Global inputs (RIGHT in RTL) + KPI summary (LEFT) ────── */}
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 items-start">
        <div className="flex flex-col gap-3">
          <GlobalInputs   mixId={mixId} />
          <MacroForecasts mixId={mixId} />
        </div>
        <KPIDashboard mixId={mixId} />
      </div>

      {/* ── Row 2: Full-width tracks table ──────────────────────────────── */}
      <TracksManager    mixId={mixId} />
      <PrepaymentEvents mixId={mixId} />

      {/* ── Row 3: Charts (two-column grid) ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <DistributionDonut mixId={mixId} />
        <PaymentLineChart  mixId={mixId} />
      </div>
      <CostBreakdownBars mixId={mixId} />
      <AmortizationTable mixId={mixId} />

    </div>
  )
}

// ---------------------------------------------------------------------------
// Generic mix empty state (Mix B and C)
// ---------------------------------------------------------------------------
interface MixEmptyStateProps {
  mixId:     MixId
  otherMixes: MixId[]
}

function MixEmptyState({ mixId, otherMixes }: MixEmptyStateProps) {
  const { duplicateMix, addTrack } = useMixStore()
  const mixA = useMix('a')
  const mixB = useMix('b')
  const mixC = useMix('c')

  const hasTracks: Record<MixId, boolean> = {
    a: mixA.tracks.length > 0,
    b: mixB.tracks.length > 0,
    c: mixC.tracks.length > 0,
  }

  const label = MIX_LABELS[mixId]

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 px-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-kumu-navy flex items-center justify-center">
        <Copy size={24} className="text-kumu-navy-light dark:text-kumu-blue-lighter" />
      </div>

      <div>
        <h2 className="text-base font-semibold text-kumu-navy dark:text-white mb-2">
          {label} מחכה לכם
        </h2>
        <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter max-w-sm leading-relaxed">
          תוכלו לשכפל תמהיל קיים כנקודת התחלה, או לבנות תמהיל חדש לגמרי מאפס.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        {otherMixes
          .filter((src) => hasTracks[src])
          .map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => duplicateMix(src, mixId)}
              className="px-6 py-2.5 rounded-xl bg-kumu-blue text-white text-sm font-medium hover:bg-kumu-blue-light transition-colors"
            >
              שכפל מ{MIX_LABELS[src]}
            </button>
          ))}
        <button
          type="button"
          onClick={() => addTrack(mixId)}
          className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-kumu-navy-light text-kumu-navy dark:text-kumu-blue-lighter text-sm font-medium hover:bg-gray-50 dark:hover:bg-kumu-navy transition-colors"
        >
          התחל {label} ריק
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual mix tabs (show empty state or full content)
// ---------------------------------------------------------------------------
function MixBTab() {
  const mixB = useMix('b')
  return mixB.tracks.length > 0
    ? <MixTabContent mixId="b" />
    : <MixEmptyState mixId="b" otherMixes={['a', 'c']} />
}

function MixCTab() {
  const mixC = useMix('c')
  return mixC.tracks.length > 0
    ? <MixTabContent mixId="c" />
    : <MixEmptyState mixId="c" otherMixes={['a', 'b']} />
}

// ---------------------------------------------------------------------------
// Dashboard — main shell with keyboard shortcuts + footer
// ---------------------------------------------------------------------------
export function Dashboard() {
  const navigate = useNavigate()

  // Keyboard shortcuts: Ctrl/Cmd + 1…7 → switch tabs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return
      switch (e.key) {
        case '1': e.preventDefault(); navigate('/mix-a');      break
        case '2': e.preventDefault(); navigate('/mix-b');      break
        case '3': e.preventDefault(); navigate('/mix-c');      break
        case '4': e.preventDefault(); navigate('/comparison'); break
        case '5': e.preventDefault(); navigate('/expenses');   break
        case '6': e.preventDefault(); navigate('/capacity');   break
        case '7': e.preventDefault(); navigate('/investment'); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  const tabCls = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors duration-150 whitespace-nowrap',
      isActive
        ? 'border-kumu-blue text-kumu-blue'
        : 'border-transparent text-kumu-navy-light dark:text-kumu-blue-lighter hover:text-kumu-navy dark:hover:text-white',
    ].join(' ')

  return (
    <div className="min-h-screen flex flex-col bg-kumu-bg-light dark:bg-kumu-bg-dark">
      {/* ── Sticky top bar: header + nav ─────────────────────────────────── */}
      <div className="sticky top-0 z-50 flex flex-col shadow-sm">
        <Header />

        {/* Tab navigation */}
        <nav className="tabs-nav flex items-stretch bg-white dark:bg-kumu-surface-dark border-b border-gray-100 dark:border-kumu-navy-light px-6 no-print overflow-x-auto">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={tabCls}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Page content — scrolls naturally ─────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        <Routes>
          <Route path="/mix-a"      element={<MixTabContent mixId="a" />} />
          <Route path="/mix-b"      element={<MixBTab />} />
          <Route path="/mix-c"      element={<MixCTab />} />
          <Route path="/comparison" element={<ComparisonTab />} />
          <Route path="/expenses"   element={
            <PlaceholderTab
              title="הוצאות עסקה"
              description="חישוב מס רכישה, שכר טרחת עורך דין, עמלות תיווך וכל עלות נלווית לעסקה — בקרוב."
            />
          } />
          <Route path="/capacity"   element={
            <PlaceholderTab
              title="כושר החזר"
              description="ניתוח כושר ההחזר שלכם על פי ההנחיות של בנק ישראל — בחינת ההכנסה הפנויה מול ההחזר החודשי הצפוי — בקרוב."
            />
          } />
          <Route path="/investment" element={<InvestmentTab />} />
          <Route path="*"           element={<Navigate to="/mix-a" replace />} />
        </Routes>
      </div>

      <Footer />
    </div>
  )
}
