import { BrowserRouter } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import LoginScreen from '@/components/auth/LoginScreen'
import { Dashboard } from '@/components/layout/Dashboard'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div dir="rtl" className="font-sans">
          {isAuthenticated ? (
            <BrowserRouter>
              <Dashboard />
            </BrowserRouter>
          ) : (
            <LoginScreen />
          )}
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
