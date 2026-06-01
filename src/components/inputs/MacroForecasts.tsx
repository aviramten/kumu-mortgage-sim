import { useState } from 'react'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useMixStore, useMix } from '@/store/useMixStore'
import { validateCPI, validatePrimeChange, validateFXChange } from '@/utils/validation'
import type { ValidationResult } from '@/utils/validation'
import type { MixId } from '@/types/mix'
import type { MacroForecasts as MacroForecastsType } from '@/types/macro'

// ---------------------------------------------------------------------------
// Info tooltip
// ---------------------------------------------------------------------------
function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="relative group inline-flex items-center">
      <Info
        size={13}
        className="text-gray-400 dark:text-kumu-blue-lighter/60 cursor-help"
      />
      <div
        className={[
          'absolute bottom-full right-0 mb-2 w-60 p-2.5 rounded-xl z-20 pointer-events-none',
          'bg-kumu-navy dark:bg-kumu-navy-light text-white text-[11px] leading-relaxed',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg',
        ].join(' ')}
      >
        {text}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PercentInput — editable percentage field
// ---------------------------------------------------------------------------
interface PercentInputProps {
  value:    number
  onChange: (n: number) => void
  step?:    number
  min?:     number
  max?:     number
}

function PercentInput({ value, onChange, step = 0.1, min = -20, max = 30 }: PercentInputProps) {
  return (
    <div className="relative flex items-center">
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value)
          if (!isNaN(parsed)) onChange(parsed)
        }}
        className={[
          'w-full h-9 rounded-xl bg-transparent pr-3 pl-7 text-sm dir-ltr',
          'text-kumu-navy dark:text-white outline-none',
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none',
          '[&::-webkit-inner-spin-button]:appearance-none',
        ].join(' ')}
      />
      <span className="absolute left-2.5 text-xs text-kumu-navy-light dark:text-kumu-blue-lighter pointer-events-none select-none">
        %
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single macro field row
// ---------------------------------------------------------------------------
interface FieldConfig {
  key:       keyof MacroForecastsType
  label:     string
  tooltip:   string
  validate?: (v: number) => ValidationResult
  step?:     number
  min?:      number
  max?:      number
}

const borderMap = {
  ok:      'border-gray-200 dark:border-kumu-navy-light focus-within:border-kumu-blue focus-within:ring-2 focus-within:ring-kumu-blue/20',
  warning: 'border-kumu-yellow focus-within:ring-2 focus-within:ring-kumu-yellow/20',
  error:   'border-kumu-error  focus-within:ring-2 focus-within:ring-kumu-error/20',
}

function MacroField({
  config,
  value,
  onChange,
}: {
  config:   FieldConfig
  value:    number
  onChange: (v: number) => void
}) {
  const result = config.validate?.(value) ?? { status: 'ok' as const }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-kumu-navy dark:text-kumu-blue-lighter">
            {config.label}
          </span>
          <InfoTooltip text={config.tooltip} />
        </div>
      </div>

      <div
        className={[
          'rounded-xl border transition-all duration-200',
          borderMap[result.status],
        ].join(' ')}
      >
        <PercentInput
          value={value}
          onChange={onChange}
          step={config.step}
          min={config.min}
          max={config.max}
        />
      </div>

      {result.status !== 'ok' && result.message && (
        <p className={`text-[11px] leading-snug ${result.status === 'warning' ? 'text-amber-600 dark:text-kumu-yellow' : 'text-kumu-error'}`}>
          {result.message}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Field sections config
// ---------------------------------------------------------------------------
const SECTION_LOCAL: FieldConfig[] = [
  {
    key:      'annualCPI',
    label:    'צפי אינפלציה שנתי',
    tooltip:  'שינוי שנתי צפוי במדד המחירים לצרכן. משפיע ישירות על מסלולים צמודי מדד.',
    validate: validateCPI,
    step: 0.1, min: -5, max: 20,
  },
  {
    key:      'annualPrimeChange',
    label:    'צפי שינוי ריבית הפריים',
    tooltip:  'שינוי שנתי צפוי בריבית בנק ישראל. ריבית הפריים = ריבית בנק ישראל + 1.5%.',
    validate: validatePrimeChange,
    step: 0.25, min: -3, max: 10,
  },
]

const SECTION_FX: FieldConfig[] = [
  {
    key:      'annualUSDChange',
    label:    'צפי שינוי שע"ח דולר שנתי',
    tooltip:  'שינוי שנתי צפוי בשער החליפין של הדולר מול השקל. רלוונטי למסלולי דולר.',
    validate: validateFXChange,
    step: 0.5, min: -20, max: 20,
  },
  {
    key:      'annualEURChange',
    label:    'צפי שינוי שע"ח יורו שנתי',
    tooltip:  'שינוי שנתי צפוי בשער החליפין של היורו מול השקל. רלוונטי למסלולי יורו.',
    validate: validateFXChange,
    step: 0.5, min: -20, max: 20,
  },
]

const SECTION_RATES_BASE: FieldConfig[] = [
  {
    key:     'sofrRate',
    label:   'ריבית SOFR נוכחית',
    tooltip: 'Secured Overnight Financing Rate — ריבית הבסיס האמריקאית. מקור: Federal Reserve Bank of NY (מאי 2026).',
    step: 0.05, min: 0, max: 20,
  },
  {
    key:     'euriborRate',
    label:   'ריבית EURIBOR 12M נוכחית',
    tooltip: 'Euro Interbank Offered Rate — ריבית הבסיס האירופית ל-12 חודשים. מקור: European Money Markets Institute (מאי 2026).',
    step: 0.05, min: 0, max: 20,
  },
  {
    key:     'bankMarginUSD',
    label:   'מרווח בנק על מסלול דולר',
    tooltip: 'המרווח שגובה הבנק מעל ה-SOFR. ריבית אפקטיבית = SOFR + מרווח.',
    step: 0.1, min: 0, max: 10,
  },
  {
    key:     'bankMarginEUR',
    label:   'מרווח בנק על מסלול יורו',
    tooltip: 'המרווח שגובה הבנק מעל ה-EURIBOR. ריבית אפקטיבית = EURIBOR + מרווח.',
    step: 0.1, min: 0, max: 10,
  },
]

const SECTION_RATES_FX_CHANGE: FieldConfig[] = [
  {
    key:     'annualSOFRChange',
    label:   'צפי שינוי SOFR שנתי',
    tooltip: 'שינוי שנתי צפוי בריבית ה-SOFR. ריבית ה-SOFR מתעדכנת כל 12 חודש במסלולי הדולר.',
    step: 0.25, min: -5, max: 10,
  },
  {
    key:     'annualEURIBORChange',
    label:   'צפי שינוי EURIBOR שנתי',
    tooltip: 'שינוי שנתי צפוי בריבית ה-EURIBOR. ריבית ה-EURIBOR מתעדכנת כל 12 חודש במסלולי היורו.',
    step: 0.25, min: -5, max: 10,
  },
]

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-kumu-blue/70 dark:text-kumu-blue-lighter/60">
        {title}
      </p>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MacroForecasts — collapsible panel
// ---------------------------------------------------------------------------
interface MacroForecastsProps {
  mixId: MixId
}

export function MacroForecasts({ mixId }: MacroForecastsProps) {
  const [open, setOpen] = useState(false)
  const mix                  = useMix(mixId)
  const { macroForecasts }   = mix
  const updateMacroForecasts = useMixStore((s) => s.updateMacroForecasts)

  const hasFxTracks = mix.tracks.some((t) => t.type === 'usd' || t.type === 'eur')

  const update = (key: keyof MacroForecastsType, value: number) => {
    updateMacroForecasts(mixId, { [key]: value })
  }

  const renderField = (cfg: FieldConfig) => (
    <MacroField
      key={cfg.key}
      config={cfg}
      value={macroForecasts[cfg.key]}
      onChange={(v) => update(cfg.key, v)}
    />
  )

  return (
    <div className="rounded-xl border border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          'w-full flex items-center justify-between px-4 py-3 text-right',
          'hover:bg-gray-50 dark:hover:bg-kumu-navy transition-colors',
        ].join(' ')}
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-kumu-blue">
          תחזיות מקרו ושע"ח
        </span>
        <span className="text-kumu-navy-light dark:text-kumu-blue-lighter">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="flex flex-col gap-5 px-4 pb-4 border-t border-gray-100 dark:border-kumu-navy-light pt-4">
          <Section title="כלכלה מקומית">
            {SECTION_LOCAL.map(renderField)}
          </Section>

          <div className="h-px bg-gray-100 dark:bg-kumu-navy-light" />

          <Section title='שע"ח'>
            {SECTION_FX.map(renderField)}
          </Section>

          <div className="h-px bg-gray-100 dark:bg-kumu-navy-light" />

          <Section title="ריביות בנצ'מרק">
            {SECTION_RATES_BASE.map(renderField)}
          </Section>

          {hasFxTracks && (
            <>
              <div className="h-px bg-gray-100 dark:bg-kumu-navy-light" />
              <Section title="צפי שינוי ריביות מט&quot;ח">
                {SECTION_RATES_FX_CHANGE.map(renderField)}
              </Section>
            </>
          )}
        </div>
      )}
    </div>
  )
}
