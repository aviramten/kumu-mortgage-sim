import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ---------------------------------------------------------------------------
// Mock credentials — Stage 1 prototype only
// TODO: Replace login() body with:
//   const { data, error } = await supabase.auth.signInWithPassword({ email, password })
//   See src/lib/supabaseClient.ts (to be created in production stage)
// ---------------------------------------------------------------------------
const MOCK_EMAIL = 'admin@mortgage.co.il'
const MOCK_PASSWORD = 'Admin123'

interface AuthState {
  isAuthenticated: boolean
  userEmail: string | null
  /** Returns true on success, false on wrong credentials */
  login: (email: string, password: string) => boolean
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userEmail: null,

      login: (email: string, password: string): boolean => {
        // TODO: Replace with supabase.auth.signInWithPassword()
        if (email === MOCK_EMAIL && password === MOCK_PASSWORD) {
          set({ isAuthenticated: true, userEmail: email })
          return true
        }
        return false
      },

      logout: () => set({ isAuthenticated: false, userEmail: null }),
    }),
    {
      name: 'kumu-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userEmail:       state.userEmail,
      }),
    }
  )
)
