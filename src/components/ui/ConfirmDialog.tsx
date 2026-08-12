import { useEffect } from 'react'

// ---------------------------------------------------------------------------
// ConfirmDialog — KUMU-styled replacement for window.confirm().
// Closes on Escape or a click outside the modal card.
// ---------------------------------------------------------------------------
export interface ConfirmDialogProps {
  isOpen:        boolean
  title:         string
  message:       string
  confirmLabel?: string
  cancelLabel?:  string
  variant?:      'danger' | 'warning'
  onConfirm:     () => void
  onCancel:      () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'אישור',
  cancelLabel = 'ביטול',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmCls = variant === 'danger'
    ? 'bg-kumu-error text-white hover:opacity-90'
    : 'bg-kumu-yellow text-kumu-navy hover:opacity-90'

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-xl bg-white dark:bg-kumu-surface-dark border border-gray-100 dark:border-kumu-navy-light shadow-xl p-6 flex flex-col gap-4"
      >
        <h3 id="confirm-dialog-title" className="text-base font-semibold text-kumu-navy dark:text-white">
          {title}
        </h3>
        <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter leading-relaxed">
          {message}
        </p>
        <div className="flex items-center justify-end gap-2 mt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-kumu-navy-light dark:text-kumu-blue-lighter hover:bg-gray-100 dark:hover:bg-kumu-navy transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
