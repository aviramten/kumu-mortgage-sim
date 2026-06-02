/**
 * ErrorBoundary — class component wrapping the app to catch runtime errors.
 * Displays a KUMU-branded fallback screen instead of a blank crash.
 */

import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production this would ship to a monitoring service
    console.error('[KUMU] Runtime error caught by ErrorBoundary:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center font-sans"
        >
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="text-kumu-coral" size={28} />
          </div>

          {/* Text */}
          <div>
            <h1 className="text-lg font-semibold text-kumu-navy mb-2">
              משהו השתבש
            </h1>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
              אירעה שגיאה בלתי צפויה בסימולטור. רענן את הדף כדי להמשיך.
              אם הבעיה חוזרת, נסה לנקות את ה-cache של הדפדפן.
            </p>
            {this.state.error && (
              <p className="mt-3 text-[10px] font-mono text-gray-400 bg-gray-100 rounded-lg px-3 py-2 max-w-md mx-auto text-left">
                {this.state.error.message}
              </p>
            )}
          </div>

          {/* Reload button */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-xl bg-kumu-blue text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            רענן עמוד
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
