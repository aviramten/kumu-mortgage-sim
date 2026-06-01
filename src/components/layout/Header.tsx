import { Sun, Moon, LogOut } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'

export function Header() {
  const { theme, toggleTheme } = useThemeStore()
  const { userEmail, logout } = useAuthStore()

  return (
    <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-white dark:bg-kumu-surface-dark border-b border-gray-100 dark:border-kumu-navy-light">

      {/* Logo — right side in RTL */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-kumu-blue flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm leading-none">K</span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-kumu-navy dark:text-white font-bold text-base tracking-wide">
            KUMU
          </span>
          <span className="text-kumu-navy-light dark:text-kumu-blue-lighter text-[10px]">
            Digital Investment Academy
          </span>
        </div>
      </div>

      {/* Page title — center */}
      <h1 className="text-kumu-navy dark:text-white font-medium text-sm">
        סימולטור משכנתא
      </h1>

      {/* Controls — left side in RTL */}
      <div className="flex items-center gap-3">
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
    </header>
  )
}
