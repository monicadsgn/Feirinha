import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
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

export function Stepper({ value, unit, onChange, min = 0, editable }: { value: number; unit: Unit; onChange: (v: number) => void; min?: number; editable?: boolean }) {
  const step = unit === 'kg' || unit === 'L' ? (value < 1 ? 0.1 : 0.5) : 1
  const set = (v: number) => onChange(Math.max(min, +v.toFixed(3)))
  return (
    <div className="stepper" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label="Menos" onClick={() => set(value - step)}>
        −
      </button>
      {editable ? <NumberField value={value} unit={unit} onCommit={set} /> : <span className="num">{qtyLabel(value, unit)}</span>}
      <button type="button" aria-label="Mais" onClick={() => set(value + step)}>
        +
      </button>
    </div>
  )
}

/** Número que dá pra digitar (ex.: o peso certo da balança, 1,234 kg). */
export function NumberField({ value, unit, onCommit, label }: { value: number; unit?: string; onCommit: (v: number) => void; label?: string }) {
  const show = (v: number) => String(+v.toFixed(3)).replace('.', ',')
  const [text, setText] = useState(show(value))
  const [focus, setFocus] = useState(false)
  useEffect(() => {
    if (!focus) setText(show(value))
  }, [value, focus])
  const commit = () => {
    setFocus(false)
    const v = parseFloat(text.replace(/\s/g, '').replace(',', '.'))
    if (Number.isFinite(v) && v >= 0) onCommit(v)
    else setText(show(value))
  }
  return (
    <label className="num-field">
      <input
        inputMode="decimal"
        aria-label={label ?? 'Quantidade'}
        value={text}
        onFocus={(e) => {
          setFocus(true)
          e.target.select()
        }}
        onChange={(e) => setText(e.target.value.replace(/[^\d,.]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      {unit && <span>{unit}</span>}
    </label>
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

/** Aviso com botão "Desfazer" (fica mais tempo na tela). */
export function toastUndo(text: string, undo: () => void) {
  toast(text, { label: 'Desfazer', run: () => { undo(); toast('Desfeito') } }, 7000)
}

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

// ---------- Rascunho (não perde o que foi preenchido se o app fechar) ----------

const DRAFT = 'feirinha:rascunho:'

export function useDraft<T>(key: string, init: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(DRAFT + key)
      if (raw != null) return JSON.parse(raw) as T
    } catch {
      /* sem storage */
    }
    return typeof init === 'function' ? (init as () => T)() : init
  })
  // só grava depois da primeira mudança: abrir e fechar sem mexer não vira rascunho
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    try {
      localStorage.setItem(DRAFT + key, JSON.stringify(value))
    } catch {
      /* sem storage */
    }
  }, [key, value])
  return [value, setValue]
}

export function hasDraft(key: string): boolean {
  try {
    return localStorage.getItem(DRAFT + key) != null
  } catch {
    return false
  }
}

export function clearDraft(prefix: string) {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(DRAFT + prefix)) localStorage.removeItem(k)
  } catch {
    /* sem storage */
  }
}
