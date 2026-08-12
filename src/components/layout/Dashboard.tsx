import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import {
  BarChart3, TrendingUp, LayoutList, Copy, GitCompare,
  ShieldCheck, ChevronDown, FileText, Trash2,
} from 'lucide-react'
import { Header } from './Header'
import { Footer } from './Footer'
import { ComparisonTab } from './ComparisonTab'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { GlobalInputs } from '@/components/inputs/GlobalInputs'
import { MacroForecasts } from '@/components/inputs/MacroForecasts'
import { TracksManager } from '@/components/tracks/TracksManager'
import { PrepaymentEvents } from '@/components/tracks/PrepaymentEvents'
import { KPIDashboard } from '@/components/outputs/KPIDashboard'
import { DistributionDonut } from '@/components/outputs/charts/DistributionDonut'
import { PaymentLineChart } from '@/components/outputs/charts/PaymentLineChart'
import { CostBreakdownBars } from '@/components/outputs/charts/CostBreakdownBars'
import { AmortizationTable } from '@/components/outputs/AmortizationTable'
import { BalanceLineChart } from '@/components/outputs/charts/BalanceLineChart'
import { InvestmentTab } from '@/components/investment/InvestmentTab'
import { AffordabilityTab } from '@/components/affordability/AffordabilityTab'
import { TransactionTab } from '@/components/transaction/TransactionTab'
import { useMix, useMixStore } from '@/store/useMixStore'
import { useAffordabilityStore } from '@/store/useAffordabilityStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useToastStore } from '@/store/useToastStore'
import { calculateMix } from '@/engine/calculateMix'
import { calculatePTI } from '@/engine/pti'
import { MAX_LTV } from '@/utils/validation'
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
  { to: '/transaction',   label: 'נתוני עסקה',    icon: FileText,    mixId: undefined    },
  { to: '/mix-a',         label: "תמהיל א'",      icon: LayoutList,  mixId: 'a' as MixId },
  { to: '/mix-b',         label: "תמהיל ב'",      icon: BarChart3,   mixId: 'b' as MixId },
  { to: '/mix-c',         label: "תמהיל ג'",      icon: BarChart3,   mixId: 'c' as MixId },
  { to: '/comparison',    label: 'השוואה',         icon: GitCompare,  mixId: undefined    },
  { to: '/affordability', label: 'כושר החזר',     icon: ShieldCheck, mixId: undefined    },
  { to: '/investment',    label: 'מחשבון השקעה',  icon: TrendingUp,  mixId: undefined    },
] as const

// ---------------------------------------------------------------------------
// PTI badge — shows "!40+" on a mix tab when that mix exceeds the 40% limit
// ---------------------------------------------------------------------------
function PTIBadge({ mixId, dispIncome }: { mixId: MixId; dispIncome: number }) {
  const mix = useMix(mixId)

  const exceeds = useMemo(() => {
    if (mix.tracks.length === 0) return false
    const { kpis } = calculateMix(mix.tracks, mix.macroForecasts, mix.prepayments)
    return calculatePTI(dispIncome, kpis).status === 'exceeds'
  }, [mix.tracks, mix.macroForecasts, mix.prepayments, dispIncome])

  if (!exceeds) return null
  return (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full leading-none">
      !40+
    </span>
  )
}

// ---------------------------------------------------------------------------
// Duplicate-mix dropdown — small button per mix tab.
// Imports data FROM another mix INTO the currently open mix (overwriting it),
// matching the direction of the empty-state "שכפל מ..." flow.
// ---------------------------------------------------------------------------
interface DuplicateDropdownProps {
  currentMixId: MixId
}

function DuplicateDropdown({ currentMixId }: DuplicateDropdownProps) {
  const [open, setOpen] = useState(false)
  const [pendingSource, setPendingSource] = useState<MixId | null>(null)
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

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const sources: MixId[] = (['a', 'b', 'c'] as MixId[]).filter(
    (id) => id !== currentMixId && hasTracks[id],
  )

  if (sources.length === 0) return null

  const handleImportClick = (sourceId: MixId) => {
    setPendingSource(sourceId)
  }

  const handleConfirmImport = () => {
    if (pendingSource) duplicateMix(pendingSource, currentMixId)
    setPendingSource(null)
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
        ייבוא מתמהיל אחר
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 bg-white dark:bg-kumu-surface-dark border border-gray-100 dark:border-kumu-navy-light rounded-xl shadow-lg z-20 min-w-[180px] overflow-hidden">
          <p className="px-3 pt-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-kumu-navy-light dark:text-kumu-blue-lighter border-b border-gray-100 dark:border-kumu-navy-light">
            טען נתונים מ...
          </p>
          {sources.map((sourceId) => (
            <button
              key={sourceId}
              type="button"
              onClick={() => handleImportClick(sourceId)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-kumu-navy dark:text-white hover:bg-kumu-blue/5 dark:hover:bg-kumu-blue/10 transition-colors"
            >
              <span>{MIX_LABELS[sourceId]}</span>
            </button>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={pendingSource !== null}
        title="ייבוא מתמהיל אחר"
        message={
          pendingSource
            ? `הנתונים הקיימים ב${MIX_LABELS[currentMixId]} יוחלפו בנתוני ${MIX_LABELS[pendingSource]}. להמשיך?`
            : ''
        }
        confirmLabel="ייבוא"
        variant="warning"
        onConfirm={handleConfirmImport}
        onCancel={() => setPendingSource(null)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Clear-mix button — ghost style with Trash2, shows confirm dialog
// ---------------------------------------------------------------------------
function ClearMixButton({ mixId }: { mixId: MixId }) {
  const { clearMix } = useMixStore()
  const mix          = useMix(mixId)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (mix.tracks.length === 0) return null

  const handleClear = () => {
    clearMix(mixId)
    setConfirmOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-transparent text-kumu-navy-light dark:text-kumu-blue-lighter text-xs font-medium hover:border-kumu-coral/40 hover:bg-kumu-coral/5 hover:text-kumu-coral dark:hover:text-kumu-coral transition-colors"
      >
        <Trash2 size={12} />
        נקה תמהיל
      </button>
      <ConfirmDialog
        isOpen={confirmOpen}
        title="נקה תמהיל"
        message={`פעולה זו תנקה את כל המסלולים וההגדרות של ${MIX_LABELS[mixId]}. להמשיך?`}
        variant="danger"
        onConfirm={handleClear}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Mix tab content — stacked layout with toolbar at top
// ---------------------------------------------------------------------------
function MixTabContent({ mixId }: { mixId: MixId }) {
  return (
    <div className="flex flex-col gap-4 p-4">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2">
        <ClearMixButton mixId={mixId} />
        <DuplicateDropdown currentMixId={mixId} />
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

      {/* ── Row 3: Charts ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <DistributionDonut mixId={mixId} />
        <PaymentLineChart  mixId={mixId} />
      </div>
      <CostBreakdownBars mixId={mixId} />
      <BalanceLineChart  mixId={mixId} />
      <AmortizationTable mixId={mixId} />

    </div>
  )
}

// ---------------------------------------------------------------------------
// Generic mix empty state (Mix B and C)
// ---------------------------------------------------------------------------
interface MixEmptyStateProps {
  mixId:      MixId
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
// Individual mix tabs
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
// Toast triggers — PTI > 40% and LTV exceeded
// One toast per transition (not repeated on every render)
// ---------------------------------------------------------------------------
function ToastTriggers({ dispIncome }: { dispIncome: number }) {
  const show = useToastStore((s) => s.show)
  const tx   = useTransactionStore()

  // Track previous PTI state per mix to fire toast only on transition
  const prevPtiRef = useRef<Record<MixId, boolean>>({ a: false, b: false, c: false })
  // Track previous LTV exceeded state
  const prevLtvRef = useRef(false)
  // Track if we already showed the "loaded" toast
  const loadedToastShownRef = useRef(false)

  const mixA = useMix('a')
  const mixB = useMix('b')
  const mixC = useMix('c')
  const mixes: { id: MixId; mix: typeof mixA }[] = [
    { id: 'a', mix: mixA },
    { id: 'b', mix: mixB },
    { id: 'c', mix: mixC },
  ]

  // Green "loaded" toast on first mount when localStorage has data
  useEffect(() => {
    if (loadedToastShownRef.current) return
    loadedToastShownRef.current = true
    const hasData = ['kumu-mix-store', 'kumu-transaction', 'kumu-costs-store', 'kumu-affordability-store']
      .some((k) => localStorage.getItem(k) !== null)
    if (hasData) {
      show({ message: 'הסימולציה נטענה מהזיכרון המקומי', variant: 'green' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // PTI > 40% toast — fires once per mix when it crosses the threshold.
  // dispIncome === 0 means no income data entered yet (nothing to check);
  // dispIncome < 0 is a real problem and must still be checked, not skipped.
  useEffect(() => {
    if (dispIncome === 0) return
    mixes.forEach(({ id, mix }) => {
      if (mix.tracks.length === 0) return
      const { kpis } = calculateMix(mix.tracks, mix.macroForecasts, mix.prepayments)
      const exceeds  = calculatePTI(dispIncome, kpis).status === 'exceeds'
      if (exceeds && !prevPtiRef.current[id]) {
        show(
          dispIncome < 0
            ? { message: `${MIX_LABELS[id]}: ההכנסה הפנויה שלילית — לא ניתן לחשב יחס החזר`, variant: 'coral' }
            : { message: `PTI של ${MIX_LABELS[id]} חורג מ-40% — בדקו את יכולת ההחזר`, variant: 'yellow' }
        )
      }
      prevPtiRef.current[id] = exceeds
    })
  })

  // LTV exceeded toast — fires once on transition
  useEffect(() => {
    const ltv   = tx.propertyValue > 0 ? (tx.mortgageAmount / tx.propertyValue) * 100 : 0
    const limit = MAX_LTV[tx.purchaseStatus]
    const exceeded = ltv > limit
    if (exceeded && !prevLtvRef.current) {
      show({
        message: `אחוז המימון (${ltv.toFixed(1)}%) חורג מהמקסימום המותר (${limit}%)`,
        variant: 'coral',
      })
    }
    prevLtvRef.current = exceeded
  })

  return null
}

// ---------------------------------------------------------------------------
// Dashboard — main shell with keyboard shortcuts
// ---------------------------------------------------------------------------
export function Dashboard() {
  const navigate = useNavigate()

  // Keyboard shortcuts: Ctrl/Cmd + 1…7
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return
      switch (e.key) {
        case '1': e.preventDefault(); navigate('/transaction');   break
        case '2': e.preventDefault(); navigate('/mix-a');         break
        case '3': e.preventDefault(); navigate('/mix-b');         break
        case '4': e.preventDefault(); navigate('/mix-c');         break
        case '5': e.preventDefault(); navigate('/comparison');    break
        case '6': e.preventDefault(); navigate('/affordability'); break
        case '7': e.preventDefault(); navigate('/investment');    break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  // Affordability data for PTI badges
  const incomeRows      = useAffordabilityStore((s) => s.incomeRows)
  const liabilityRows   = useAffordabilityStore((s) => s.liabilityRows)
  const totalIncome     = incomeRows.reduce((s, r) => s + r.amount, 0)
  const totalLiabilities = liabilityRows.reduce((s, r) => s + r.monthlyPayment, 0)
  const hasAffordabilityData = totalIncome > 0
  const dispIncome      = totalIncome - totalLiabilities

  const tabCls = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors duration-150 whitespace-nowrap',
      isActive
        ? 'border-kumu-blue text-kumu-blue'
        : 'border-transparent text-kumu-navy-light dark:text-kumu-blue-lighter hover:text-kumu-navy dark:hover:text-white',
    ].join(' ')

  return (
    <div className="min-h-screen flex flex-col bg-kumu-bg-light dark:bg-kumu-bg-dark">
      {/* Toast triggers — invisible, side-effect only */}
      <ToastTriggers dispIncome={dispIncome} />

      {/* ── Sticky top bar: header + nav ─────────────────────────────────── */}
      <div className="sticky top-0 z-50 flex flex-col shadow-sm">
        <Header />

        {/* Tab navigation */}
        <nav className="tabs-nav flex items-stretch bg-white dark:bg-kumu-surface-dark border-b border-gray-100 dark:border-kumu-navy-light px-6 no-print overflow-x-auto">
          {TABS.map(({ to, label, icon: Icon, mixId }) => (
            <NavLink key={to} to={to} className={tabCls}>
              <Icon size={15} />
              {label}
              {hasAffordabilityData && mixId && (
                <PTIBadge mixId={mixId} dispIncome={dispIncome} />
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        <Routes>
          <Route path="/transaction"   element={<TransactionTab />} />
          <Route path="/mix-a"         element={<MixTabContent mixId="a" />} />
          <Route path="/mix-b"         element={<MixBTab />} />
          <Route path="/mix-c"         element={<MixCTab />} />
          <Route path="/comparison"    element={<ComparisonTab />} />
          {/* /costs now lives inside /transaction */}
          <Route path="/costs"         element={<Navigate to="/transaction" replace />} />
          <Route path="/expenses"      element={<Navigate to="/transaction" replace />} />
          <Route path="/affordability" element={<AffordabilityTab />} />
          <Route path="/capacity"      element={<Navigate to="/affordability" replace />} />
          <Route path="/investment"    element={<InvestmentTab />} />
          <Route path="*"              element={<Navigate to="/transaction" replace />} />
        </Routes>
      </div>

      <Footer />
    </div>
  )
}
