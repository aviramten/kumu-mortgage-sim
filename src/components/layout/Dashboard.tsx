import { useEffect } from 'react'
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { BarChart3, TrendingUp, LayoutList, Copy, GitCompare } from 'lucide-react'
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
// Tab configuration
// ---------------------------------------------------------------------------
const TABS = [
  { to: '/mix-a',      label: "תמהיל א'",     icon: LayoutList, mixId: 'a' as MixId },
  { to: '/mix-b',      label: "תמהיל ב'",     icon: BarChart3,  mixId: 'b' as MixId },
  { to: '/investment', label: 'מחשבון השקעה', icon: TrendingUp, mixId: null },
] as const

// ---------------------------------------------------------------------------
// Mix B empty-state — shown when Mix B has no tracks
// ---------------------------------------------------------------------------
function MixBEmptyState() {
  const { cloneMixAtoB } = useMixStore()

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-kumu-navy flex items-center justify-center">
        <Copy size={24} className="text-kumu-navy-light dark:text-kumu-blue-lighter" />
      </div>

      <div>
        <h2 className="text-base font-semibold text-kumu-navy dark:text-white mb-2">
          הזמן בדיוק יותר טוב משכפול
        </h2>
        <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter max-w-sm leading-relaxed">
          תמהיל ב' מאפשר לכם להשוות שתי גרסאות תכנון של אותה המשכנתא,
          ולראות איזו אסטרטגיה משתלמת יותר.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={cloneMixAtoB}
          className="px-6 py-2.5 rounded-xl bg-kumu-blue text-white text-sm font-medium hover:bg-kumu-blue-light transition-colors"
        >
          שכפל מתמהיל א'
        </button>
        <button
          type="button"
          onClick={() => {
            // Workaround: push state so the component re-renders as "started"
            window.history.pushState({ mixBStarted: true }, '')
          }}
          className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-kumu-navy-light text-kumu-navy dark:text-kumu-blue-lighter text-sm font-medium hover:bg-gray-50 dark:hover:bg-kumu-navy transition-colors"
        >
          התחל תמהיל ב' ריק
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mix tab outputs column
// ---------------------------------------------------------------------------
function MixOutputs({ mixId }: { mixId: MixId }) {
  return (
    <div className="flex flex-col gap-3 overflow-y-auto">
      <KPIDashboard      mixId={mixId} />
      <DistributionDonut mixId={mixId} />
      <PaymentLineChart  mixId={mixId} />
      <CostBreakdownBars mixId={mixId} />
      <AmortizationTable mixId={mixId} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mix tab content — inputs left + outputs right (RTL: inputs on right)
// ---------------------------------------------------------------------------
function MixTabContent({ mixId }: { mixId: MixId }) {
  return (
    <div className="flex-1 grid grid-cols-[2fr_3fr] gap-4 p-4 min-h-0 overflow-hidden">

      {/* Inputs column — 40%, RIGHT in RTL */}
      <div className="flex flex-col gap-3 overflow-y-auto">
        <GlobalInputs     mixId={mixId} />
        <TracksManager    mixId={mixId} />
        <PrepaymentEvents mixId={mixId} />
        <MacroForecasts   mixId={mixId} />
      </div>

      {/* Outputs column — 60%, LEFT in RTL */}
      <MixOutputs mixId={mixId} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mix B tab — shows empty state or full content depending on tracks
// ---------------------------------------------------------------------------
function MixBTab() {
  const mixB = useMix('b')
  const hasStarted = mixB.tracks.length > 0

  if (!hasStarted) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <MixBEmptyState />
      </div>
    )
  }

  return <MixTabContent mixId="b" />
}

// ---------------------------------------------------------------------------
// Dashboard — main shell with keyboard shortcuts + footer
// ---------------------------------------------------------------------------
export function Dashboard() {
  const mixB          = useMix('b')
  const mixBHasTracks = mixB.tracks.length > 0
  const navigate      = useNavigate()

  // Keyboard shortcuts: Ctrl/Cmd + 1/2/3 → switch tabs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return
      if (e.key === '1') { e.preventDefault(); navigate('/mix-a') }
      else if (e.key === '2') { e.preventDefault(); navigate('/mix-b') }
      else if (e.key === '3') { e.preventDefault(); navigate('/investment') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  return (
    <div className="h-screen flex flex-col bg-kumu-bg-light dark:bg-kumu-bg-dark overflow-hidden">
      <Header />

      {/* Tab navigation */}
      <nav className="tabs-nav flex-shrink-0 flex items-stretch bg-white dark:bg-kumu-surface-dark border-b border-gray-100 dark:border-kumu-navy-light px-6 no-print">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors duration-150',
                isActive
                  ? 'border-kumu-blue text-kumu-blue'
                  : 'border-transparent text-kumu-navy-light dark:text-kumu-blue-lighter hover:text-kumu-navy dark:hover:text-white',
              ].join(' ')
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}

        {/* Comparison tab — only when Mix B has tracks */}
        {mixBHasTracks && (
          <NavLink
            to="/comparison"
            className={({ isActive }) =>
              [
                'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors duration-150',
                isActive
                  ? 'border-kumu-blue text-kumu-blue'
                  : 'border-transparent text-kumu-navy-light dark:text-kumu-blue-lighter hover:text-kumu-navy dark:hover:text-white',
              ].join(' ')
            }
          >
            <GitCompare size={15} />
            השוואה
          </NavLink>
        )}
      </nav>

      {/* Route content */}
      <div className="flex-1 flex flex-col min-h-0">
        <Routes>
          <Route path="/mix-a"      element={<MixTabContent mixId="a" />} />
          <Route path="/mix-b"      element={<MixBTab />} />
          <Route path="/comparison" element={<ComparisonTab />} />
          <Route path="/investment" element={<InvestmentTab />} />
          <Route path="*"           element={<Navigate to="/mix-a" replace />} />
        </Routes>
      </div>

      <Footer />
    </div>
  )
}
