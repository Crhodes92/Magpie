'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

type ShowToast = (message: string, type?: ToastType) => void

const ToastContext = createContext<ShowToast | null>(null)

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

const CARD_STYLES: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-500 text-green-800',
  error: 'bg-red-50 border-red-500 text-red-800',
  info: 'bg-white border-black text-black',
}

const ICON_STYLES: Record<ToastType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-yellow-500',
}

const DURATION_MS = 3500

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const showToast = useCallback<ShowToast>((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts(prev => [...prev, { id, message, type }])
    timers.current.set(id, setTimeout(() => dismiss(id), DURATION_MS))
  }, [dismiss])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed top-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:left-auto z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => {
          const Icon = ICONS[toast.type]
          return (
            <div
              key={toast.id}
              role="status"
              className={`animate-toast-in pointer-events-auto flex items-start gap-2 max-w-sm sm:w-96 border-2 rounded-xl px-4 py-3 shadow-[4px_4px_0_0_#000] ${CARD_STYLES[toast.type]}`}
            >
              <Icon size={18} className={`shrink-0 mt-0.5 ${ICON_STYLES[toast.type]}`} />
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button onClick={() => dismiss(toast.id)} aria-label="Dismiss" className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ShowToast {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
