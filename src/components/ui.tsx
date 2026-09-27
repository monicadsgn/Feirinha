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

// ---------- Confirmação (o confirm() do navegador não funciona em todo lugar) ----------

interface Ask {
  text: string
  ok: string
  run: () => void
}

let ask: Ask | null = null
const askSubs = new Set<() => void>()

export function confirmAction(text: string, ok: string, run: () => void) {
  ask = { text, ok, run }
  askSubs.forEach((s) => s())
}

function closeAsk() {
  ask = null
  askSubs.forEach((s) => s())
}

export function ConfirmHost() {
  const a = useSyncExternalStore(
    (s) => {
      askSubs.add(s)
      return () => askSubs.delete(s)
    },
    () => ask,
  )
  if (!a) return null
  return (
    <div className="backdrop" style={{ zIndex: 70, alignItems: 'center', padding: 16 }} onClick={closeAsk}>
      <div className="card stack" style={{ maxWidth: 400, width: '100%' }} onClick={(e) => e.stopPropagation()} role="alertdialog">
        <div style={{ fontWeight: 700 }}>{a.text}</div>
        <div className="row">
          <button className="btn grow" onClick={closeAsk}>
            Voltar
          </button>
          <button
            className="btn accent grow"
            onClick={() => {
              a.run()
              closeAsk()
            }}
          >
            {a.ok}
          </button>
        </div>
      </div>
    </div>
  )
}

/** true quando o app está aberto dentro de outra página (ex.: link de teste do Claude). */
export const embedded = (() => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
})()
