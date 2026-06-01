import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { Header } from './Header'
import { LayoutList, BarChart3, TrendingUp } from 'lucide-react'

// ---------------------------------------------------------------------------
// Tab configuration
// ---------------------------------------------------------------------------
const TABS = [
  { to: '/mix-a',      label: "תמהיל א'",        icon: LayoutList },
  { to: '/mix-b',      label: "תמהיל ב'",        icon: BarChart3 },
  { to: '/investment', label: 'מחשבון השקעה',    icon: TrendingUp },
] as const

// ---------------------------------------------------------------------------
// Placeholder card — used inside tab content areas
// ---------------------------------------------------------------------------
function PlaceholderCard({
  title,
  subtitle,
  accent = false,
}: {
  title: string
  subtitle: string
  accent?: boolean
}) {
  return (
    <div
      className={[
        'rounded-xl border p-5 flex flex-col gap-1 h-full',
        accent
          ? 'bg-kumu-bg-light dark:bg-kumu-navy border-kumu-blue/20'
          : 'bg-white dark:bg-kumu-surface-dark border-gray-100 dark:border-kumu-navy-light',
      ].join(' ')}
    >
      <p className="text-xs font-medium text-kumu-blue uppercase tracking-widest">
        {title}
      </p>
      <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter">
        {subtitle}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Split layout — 40% inputs | 60% outputs (RTL: inputs on right, outputs on left)
// ---------------------------------------------------------------------------
function MixTabContent({ mixLabel }: { mixLabel: string }) {
  return (
    <div className="flex-1 grid grid-cols-[2fr_3fr] gap-4 p-4 min-h-0">
      {/* Inputs column — 40%, appears on right in RTL */}
      <div className="flex flex-col gap-3 overflow-y-auto">
        <PlaceholderCard
          title="קלטים כלליים"
          subtitle={`שווי נכס, הון עצמי וסטטוס רכישה — ${mixLabel}`}
          accent
        />
        <PlaceholderCard
          title="תחזיות מקרו"
          subtitle="אינפלציה, פריים, SOFR ו-EURIBOR"
        />
        <PlaceholderCard
          title="מסלולי הלוואה"
          subtitle="הגדרת מסלולים, ריביות ולוחות סילוקין"
          accent
        />
        <PlaceholderCard
          title="פירעון מוקדם"
          subtitle="אירועי פירעון מוקדם לאורך חיי המשכנתא"
        />
      </div>

      {/* Outputs column — 60%, appears on left in RTL */}
      <div className="flex flex-col gap-3 overflow-y-auto">
        <PlaceholderCard
          title="KPI — מדדי מפתח"
          subtitle="החזר ראשון, מקסימלי, סך ריבית והצמדה"
          accent
        />
        <PlaceholderCard
          title="גרף התפתחות ההחזר"
          subtitle="החזר חודשי לאורך כל תקופת המשכנתא"
        />
        <PlaceholderCard
          title="התפלגות התמהיל"
          subtitle="אחוז כל מסלול מסך המשכנתא"
        />
        <PlaceholderCard
          title="טבלת סילוקין"
          subtitle="פירוט חודשי מלא: קרן, ריבית, הצמדה, יתרה"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Investment tab content — full-width layout
// ---------------------------------------------------------------------------
function InvestmentTabContent() {
  return (
    <div className="flex-1 grid grid-cols-[2fr_3fr] gap-4 p-4 min-h-0">
      <div className="flex flex-col gap-3 overflow-y-auto">
        <PlaceholderCard
          title="פרמטרי השקעה"
          subtitle="הון ראשוני, הפקדה חודשית, תקופה ותשואה"
          accent
        />
        <PlaceholderCard
          title="מס רווחי הון"
          subtitle="שיעור המס על רווחי ההשקעה"
        />
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto">
        <PlaceholderCard
          title="תוצאות ההשקעה"
          subtitle="שווי תיק, סך הפקדות ורווח ריאלי נטו"
          accent
        />
        <PlaceholderCard
          title="מטריצת החלטה"
          subtitle="השוואה כלכלית: עלות המשכנתא מול תשואת ההשקעה"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard — main shell with header, tabs and route content
// ---------------------------------------------------------------------------
export function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col bg-kumu-bg-light dark:bg-kumu-bg-dark">
      <Header />

      {/* Tab navigation */}
      <nav className="flex-shrink-0 flex items-stretch gap-0 bg-white dark:bg-kumu-surface-dark border-b border-gray-100 dark:border-kumu-navy-light px-6">
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

      {/* Route content */}
      <div className="flex-1 flex flex-col min-h-0">
        <Routes>
          <Route path="/mix-a"      element={<MixTabContent mixLabel="תמהיל א'" />} />
          <Route path="/mix-b"      element={<MixTabContent mixLabel="תמהיל ב'" />} />
          <Route path="/investment" element={<InvestmentTabContent />} />
          <Route path="*"           element={<Navigate to="/mix-a" replace />} />
        </Routes>
      </div>
    </div>
  )
}
