import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

// ---------------------------------------------------------------------------
// Validation schema — KUMU tone messages (no exclamation marks, guiding voice)
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'יש להזין כתובת מייל כדי להמשיך')
    .email('יש להזין כתובת מייל בפורמט תקין'),
  password: z
    .string()
    .min(6, 'יש להזין סיסמה של לפחות 6 תווים כדי להמשיך'),
})

type LoginFormData = z.infer<typeof loginSchema>

// ---------------------------------------------------------------------------
// Input field sub-component
// ---------------------------------------------------------------------------
interface InputFieldProps {
  id: string
  label: string
  type: string
  placeholder: string
  icon: React.ReactNode
  suffix?: React.ReactNode
  error?: string
  registration: ReturnType<ReturnType<typeof useForm<LoginFormData>>['register']>
}

function InputField({
  id,
  label,
  type,
  placeholder,
  icon,
  suffix,
  error,
  registration,
}: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-kumu-navy dark:text-kumu-blue-lighter">
        {label}
      </label>
      <div className="relative">
        {/* Leading icon — right side in RTL */}
        <span className="absolute inset-y-0 right-3 flex items-center text-kumu-navy-light dark:text-kumu-blue-lighter pointer-events-none">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          dir={id === 'email' ? 'ltr' : 'rtl'}
          className={[
            'w-full h-11 rounded-xl border bg-white dark:bg-kumu-surface-dark',
            'pr-10 pl-10 text-sm text-kumu-navy dark:text-white',
            'placeholder:text-gray-400 outline-none transition-all duration-200',
            error
              ? 'border-kumu-error focus:ring-2 focus:ring-kumu-error/20'
              : 'border-gray-200 dark:border-kumu-navy-light focus:border-kumu-blue focus:ring-2 focus:ring-kumu-blue/20',
          ].join(' ')}
          {...registration}
        />
        {/* Trailing element — left side in RTL */}
        {suffix && (
          <span className="absolute inset-y-0 left-3 flex items-center">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs text-kumu-error mt-0.5">{error}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LoginScreen
// ---------------------------------------------------------------------------
export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const login = useAuthStore((s) => s.login)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginFormData) => {
    setAuthError(null)
    const success = login(data.email, data.password)
    if (!success) {
      setAuthError('הפרטים שהוזנו אינם נכונים')
    }
  }

  return (
    <div className="min-h-screen bg-kumu-bg-light dark:bg-kumu-bg-dark flex items-center justify-center px-4">
      {/* Subtle background accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,91,219,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Login card */}
      <div className="relative w-full max-w-md bg-white dark:bg-kumu-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-kumu-navy-light p-8 flex flex-col gap-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <img
            src="/kumu-logo.svg"
            alt="KUMU"
            className="h-10 w-auto"
          />
          <div className="text-center">
            <h1 className="text-2xl font-medium text-kumu-navy dark:text-white tracking-tight">
              ברוכים הבאים
            </h1>
            <p className="text-sm text-kumu-navy-light dark:text-kumu-blue-lighter mt-1">
              התחברו לסימולטור המשכנתאות שלכם
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 dark:bg-kumu-navy-light" />

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <InputField
            id="email"
            label="כתובת מייל"
            type="email"
            placeholder="admin@mortgage.co.il"
            icon={<Mail size={16} />}
            error={errors.email?.message}
            registration={register('email')}
          />

          <InputField
            id="password"
            label="סיסמה"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            icon={<Lock size={16} />}
            error={errors.password?.message}
            registration={register('password')}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-kumu-navy-light dark:text-kumu-blue-lighter hover:text-kumu-blue transition-colors"
                aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          {/* Auth error — KUMU tone */}
          {authError && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 px-4 py-3">
              <p className="text-sm text-kumu-error">{authError}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={[
              'w-full h-11 rounded-xl text-sm font-medium text-white transition-all duration-200 mt-1',
              'bg-kumu-blue hover:bg-kumu-blue-light active:scale-[0.98]',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {isSubmitting ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>

        {/* Forgot password — placeholder */}
        <div className="text-center">
          <button
            type="button"
            className="text-xs text-kumu-navy-light dark:text-kumu-blue-lighter hover:text-kumu-blue transition-colors"
          >
            שכחתם סיסמה?
          </button>
        </div>
      </div>
    </div>
  )
}
