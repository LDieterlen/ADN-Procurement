// Toasts: short success messages that vanish, persistent error messages with an optional link.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

export type Toast = { id: number; kind: 'success' | 'error'; message: string; persistent?: boolean; href?: string; hrefLabel?: string }
type ToastInput = Omit<Toast, 'id'>

const ToastContext = createContext<{ show: (toast: ToastInput) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((t) => t.id !== id)), [])
  const show = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++
      setToasts((current) => [...current, { ...toast, id }])
      if (!toast.persistent) setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )
  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 bottom-20 z-[60] flex w-80 flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className={`rounded-lg px-3.5 py-2.5 text-sm shadow-[0_8px_24px_-8px_rgba(27,30,35,.35)] ${toast.kind === 'error' ? 'border border-line bg-surface text-danger' : 'bg-ink text-white'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span>{toast.message}</span>
              <button type="button" className="text-xs opacity-60 hover:opacity-100" onClick={() => dismiss(toast.id)} aria-label="Fermer">
                ✕
              </button>
            </div>
            {toast.href && (
              <Link to={toast.href} className="mt-1 block text-xs underline" onClick={() => dismiss(toast.id)}>
                {toast.hrefLabel ?? toast.href}
              </Link>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast hors de ToastProvider')
  return context
}
