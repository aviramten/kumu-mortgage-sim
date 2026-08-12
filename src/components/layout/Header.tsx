import { useState } from 'react'
import { Sun, Moon, LogOut, RotateCcw } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

function resetAllData() {
  localStorage.removeItem('kumu-mix-store')
  localStorage.removeItem('kumu-transaction')
  localStorage.removeItem('kumu-costs-store')
  localStorage.removeItem('kumu-affordability-store')
  window.location.reload()
}

export function Header() {
  const { theme, toggleTheme } = useThemeStore()
  const { userEmail, logout } = useAuthStore()
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  return (
    <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-white dark:bg-kumu-surface-dark border-b border-gray-100 dark:border-kumu-navy-light">

      {/* Logo — right side in RTL. Two files: colored for light, white for dark */}
      <img src="/kumu-logo.png" alt="KUMU" className="h-8 w-auto flex-shrink-0 dark:hidden" />
      <img src="/kumu-logo-white.png" alt="KUMU" className="h-8 w-auto flex-shrink-0 hidden dark:block" />

      {/* Page title — center */}
      <h1 className="text-kumu-navy dark:text-white font-medium text-sm">
        סימולטור משכנתא
      </h1>

      {/* Controls — left side in RTL */}
      <div className="flex items-center gap-3">
        {/* Reset all data */}
        <button
          type="button"
          onClick={() => setResetConfirmOpen(true)}
          title="אפס את כל הנתונים"
          aria-label="אפס את כל הנתונים"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-kumu-navy-light dark:text-kumu-blue-lighter hover:bg-gray-100 dark:hover:bg-kumu-navy hover:text-kumu-coral transition-colors"
        >
          <RotateCcw size={16} />
        </button>

        {/* Dark / Light toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'עבור למצב בהיר' : 'עבור למצב כהה'}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-kumu-navy-light dark:text-kumu-blue-lighter hover:bg-gray-100 dark:hover:bg-kumu-navy transition-colors"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User email */}
        {userEmail && (
          <span className="text-xs text-kumu-navy-light dark:text-kumu-blue-lighter hidden md:block max-w-[160px] truncate">
            {userEmail}
          </span>
        )}

        {/* Vertical separator */}
        <div className="w-px h-5 bg-gray-200 dark:bg-kumu-navy-light" />

        {/* Logout */}
        <button
          onClick={logout}
          aria-label="התנתקות"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-kumu-navy-light dark:text-kumu-blue-lighter hover:bg-gray-100 dark:hover:bg-kumu-navy hover:text-kumu-coral transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>

      <ConfirmDialog
        isOpen={resetConfirmOpen}
        title="אפס את כל הנתונים"
        message="איפוס הנתונים ימחק את כל הסימולציות השמורות ויחזיר את המערכת למצב ההתחלתי. פעולה זו אינה הפיכה."
        confirmLabel="איפוס"
        variant="danger"
        onConfirm={resetAllData}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </header>
  )
}
