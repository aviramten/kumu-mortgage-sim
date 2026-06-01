import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { BarChart3, TrendingUp, LayoutList } from 'lucide-react'
import { Header } from './Header'
import { GlobalInputs } from '@/components/inputs/GlobalInputs'
import { MacroForecasts } from '@/components/inputs/MacroForecasts'
import { TracksManager } from '@/components/tracks/TracksManager'
import { PrepaymentEvents } from '@/components/tracks/PrepaymentEvents'
import { KPIDashboard } from '@/components/outputs/KPIDashboard'
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
// Output placeholder card (Stage 5 will replace these)
// ---------------------------------------------------------------------------
function OutputCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark p-4 flex flex-col gap-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-kumu-blue">
        {title}
      </p>
      <p className="text-xs text-kumu-navy-light dark:text-kumu-blue-lighter">
        {subtitle}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mix tab — 40% inputs | 60% outputs (RTL: inputs on right, outputs on left)
// ---------------------------------------------------------------------------
function MixTabContent({ mixId }: { mixId: MixId }) {
  return (
    <div className="flex-1 grid grid-cols-[2fr_3fr] gap-4 p-4 min-h-0 overflow-hidden">

      {/* Inputs column — 40%, appears on RIGHT in RTL */}
      <div className="flex flex-col gap-3 overflow-y-auto">
        <GlobalInputs    mixId={mixId} />
        <MacroForecasts  mixId={mixId} />
        <TracksManager   mixId={mixId} />
        <PrepaymentEvents mixId={mixId} />
      </div>

      {/* Outputs column — 60%, appears on LEFT in RTL */}
      <div className="flex flex-col gap-3 overflow-y-auto">
        <KPIDashboard mixId={mixId} />
        <OutputCard
          title="גרף התפתחות ההחזר"
          subtitle="החזר חודשי לאורך כל תקופת המשכנתא — יחושב בשלב 5"
        />
        <OutputCard
          title="התפלגות התמהיל"
          subtitle="אחוז כל מסלול מסך המשכנתא — יחושב בשלב 5"
        />
        <OutputCard
          title="טבלת סילוקין"
          subtitle="פירוט חודשי: קרן, ריבית, הצמדה, יתרה — יחושב בשלב 5"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Investment tab — placeholder until Stage 6
// ---------------------------------------------------------------------------
function InvestmentTabContent() {
  return (
    <div className="flex-1 grid grid-cols-[2fr_3fr] gap-4 p-4 min-h-0 overflow-hidden">
      <div className="flex flex-col gap-3 overflow-y-auto">
        <OutputCard
          title="פרמטרי השקעה"
          subtitle="הון ראשוני, הפקדה חודשית, תשואה ומס — יבנה בשלב 6"
        />
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto">
        <OutputCard
          title="תוצאות ומטריצת החלטה"
          subtitle="השוואת עלות המשכנתא מול תשואת ההשקעה — יבנה בשלב 6"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard — main shell
// ---------------------------------------------------------------------------
export function Dashboard() {
  return (
    <div className="h-screen flex flex-col bg-kumu-bg-light dark:bg-kumu-bg-dark overflow-hidden">
      <Header />

      {/* Tab navigation */}
      <nav className="flex-shrink-0 flex items-stretch bg-white dark:bg-kumu-surface-dark border-b border-gray-100 dark:border-kumu-navy-light px-6">
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
      </nav>

      {/* Route content — fills remaining height */}
      <div className="flex-1 flex flex-col min-h-0">
        <Routes>
          <Route path="/mix-a"      element={<MixTabContent mixId="a" />} />
          <Route path="/mix-b"      element={<MixTabContent mixId="b" />} />
          <Route path="/investment" element={<InvestmentTabContent />} />
          <Route path="*"           element={<Navigate to="/mix-a" replace />} />
        </Routes>
      </div>
    </div>
  )
}
