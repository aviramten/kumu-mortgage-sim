import { create } from 'zustand'

export type ToastVariant = 'yellow' | 'coral' | 'green'

export interface Toast {
  id:      string
  message: string
  variant: ToastVariant
}

interface ToastStore {
  toasts:  Toast[]
  show:    (toast: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],

  show: (toast) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    return id
  },

  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
