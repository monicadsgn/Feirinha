import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { qtyLabel } from '../data/format'
import type { Unit } from '../data/types'

export function Sheet({ onClose, children, full }: { onClose: () => void; children: ReactNode; full?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className="backdrop" onClick={onClose}>
      <div className={'sheet' + (full ? ' full' : '')} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="grab" />
        {children}
      </div>
    </div>
  )
}

export function Stepper({ value, unit, onChange, min = 0 }: { value: number; unit: Unit; onChange: (v: number) => void; min?: number }) {
  const step = unit === 'kg' || unit === 'L' ? (value < 1 ? 0.1 : 0.5) : 1
  const set = (v: number) => onChange(Math.max(min, +v.toFixed(2)))
  return (
    <div className="stepper" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label="Menos" onClick={() => set(value - step)}>
        −
      </button>
      <span className="num">{qtyLabel(value, unit)}</span>
      <button type="button" aria-label="Mais" onClick={() => set(value + step)}>
        +
      </button>
    </div>
  )
}

// ---------- Avisos rápidos (toasts) ----------

interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

let toasts: Toast[] = []
const subs = new Set<() => void>()
const emit = () => subs.forEach((s) => s())
let seq = 0

export function toast(text: string, action?: Toast['action'], ms = 4500) {
  const t = { id: ++seq, text, action }
  toasts = [...toasts.slice(-2), t]
  emit()
  setTimeout(() => dismiss(t.id), ms)
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function Toasts() {
  const list = useSyncExternalStore(
    (s) => {
      subs.add(s)
      return () => subs.delete(s)
    },
    () => toasts,
  )
  return (
    <div className="toast-wrap">
      {list.map((t) => (
        <div className="toast" key={t.id}>
          <span className="grow">{t.text}</span>
          {t.action && (
            <button
              className="btn sm"
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
