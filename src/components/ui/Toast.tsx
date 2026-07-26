import { useEffect } from 'react'
import { AlertTriangle, CheckCircle, X } from 'lucide-react'
import { useToastStore } from '@/store/useToastStore'
import type { Toast } from '@/store/useToastStore'

const AUTO_DISMISS: Record<string, number> = {
  yellow: 6000,
  coral:  6000,
  green:  3000,
}

const VARIANT_CLS: Record<string, string> = {
  yellow: 'bg-amber-400 text-amber-900 border-amber-500/60',
  coral:  'bg-kumu-coral text-white border-white/20',
  green:  'bg-kumu-green text-white border-white/20',
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss)

  useEffect(() => {
    const ms = AUTO_DISMISS[toast.variant] ?? 6000
    const timer = setTimeout(() => dismiss(toast.id), ms)
    return () => clearTimeout(timer)
  }, [toast.id, toast.variant, dismiss])

  const Icon = toast.variant === 'green' ? CheckCircle : AlertTriangle

  return (
    <div
      className={[
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm text-sm leading-snug',
        VARIANT_CLS[toast.variant],
      ].join(' ')}
    >
      <Icon size={16} className="flex-shrink-0 mt-0.5" />
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="סגור"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-6 left-6 flex flex-col gap-2 z-[100]"
      dir="rtl"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
