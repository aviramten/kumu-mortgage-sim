import type { ReactNode } from 'react'
import type { ValidationResult, ValidationStatus } from '@/utils/validation'

// ---------------------------------------------------------------------------
// Styling maps
// ---------------------------------------------------------------------------
const borderMap: Record<ValidationStatus, string> = {
  ok:      'border-gray-200 dark:border-kumu-navy-light',
  warning: 'border-kumu-yellow',
  error:   'border-kumu-error',
}

const focusMap: Record<ValidationStatus, string> = {
  ok:      'focus-within:border-kumu-blue focus-within:ring-2 focus-within:ring-kumu-blue/20',
  warning: 'focus-within:border-kumu-yellow focus-within:ring-2 focus-within:ring-kumu-yellow/20',
  error:   'focus-within:border-kumu-error  focus-within:ring-2 focus-within:ring-kumu-error/20',
}

const messageMap: Record<ValidationStatus, string> = {
  ok:      '',
  warning: 'text-amber-600 dark:text-kumu-yellow',
  error:   'text-kumu-error',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface ValidationFieldProps {
  result:    ValidationResult
  children:  ReactNode
  label?:    string
  className?: string
}

/**
 * Wraps any input-like child with:
 * - An optional label
 * - A colored border that reflects the validation state (ok/warning/error)
 * - A KUMU-tone message beneath when the state is not 'ok'
 */
export function ValidationField({
  result,
  children,
  label,
  className = '',
}: ValidationFieldProps) {
  const { status, message } = result

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <span className="text-xs font-medium text-kumu-navy dark:text-kumu-blue-lighter">
          {label}
        </span>
      )}

      <div
        className={[
          'rounded-xl border transition-all duration-200',
          borderMap[status],
          focusMap[status],
        ].join(' ')}
      >
        {children}
      </div>

      {status !== 'ok' && message && (
        <p className={`text-xs leading-snug ${messageMap[status]}`}>
          {message}
        </p>
      )}
    </div>
  )
}
