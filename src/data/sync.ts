import { useSyncExternalStore } from 'react'
import { applyRemote, getDB, onCommit, sharedSettings } from './store'
import type { DB, Settings } from './types'

/**
 * Sincronização entre os celulares da casa.
 *
 * Cada casa tem um código secreto e longo (vai no link de convite). O servidor
 * guarda cada registro (item, entrada da lista, compra, lugar, ajustes) com o
 * `updatedAt` do celular que mexeu por último, e vence sempre o mais novo.
 * O app continua funcionando offline: o que muda sem internet fica numa fila
 * e sobe quando a conexão volta.
 */

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined

type Kind = 'items' | 'shops' | 'list' | 'trips' | 'settings'
const KINDS: Exclude<Kind, 'settings'>[] = ['items', 'shops', 'list', 'trips']

interface Row {
  kind: Kind
  id: string
  data: unknown
  updated_at: number
  rev?: number
}

interface SyncState {
  casa: string | null
  cursor: number
  pending: string[]
  lastOk: number | null
  error: string | null
  busy: boolean
}

const STATE_KEY = 'feirinha:sync'

const embedded = (() => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
})()

export const syncAvailable = !!URL_ && !!KEY && !embedded

function loadState(): SyncState {
  const base: SyncState = { casa: null, cursor: 0, pending: [], lastOk: null, error: null, busy: false }
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) return { ...base, ...JSON.parse(raw), busy: false, error: null }
  } catch {
    /* sem storage */
  }
  return base
}

let state = loadState()
const subs = new Set<() => void>()

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  try {
    const { casa, cursor, pending, lastOk } = state
    localStorage.setItem(STATE_KEY, JSON.stringify({ casa, cursor, pending, lastOk }))
  } catch {
    /* sem storage */
  }
  subs.forEach((s) => s())
}

export function useSync(): SyncState {
  return useSyncExternalStore(
    (s) => {
      subs.add(s)
      return () => subs.delete(s)
    },
    () => state,
  )
}

// ---------- servidor ----------

async function rpc<T>(fn: string, body: unknown): Promise<T> {
  const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: KEY!, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`)
  return (await res.json()) as T
}

// ---------- o que mudou aqui ----------

function diffKeys(prev: DB, next: DB): string[] {
  const keys: string[] = []
  for (const kind of KINDS) {
    const a = prev[kind] as Record<string, { updatedAt: number }>
    const b = next[kind] as Record<string, { updatedAt: number }>
    for (const id in b) if (!a[id] || a[id]!.updatedAt !== b[id]!.updatedAt) keys.push(`${kind}:${id}`)
  }
  if ((prev.settings.updatedAt ?? 0) !== (next.settings.updatedAt ?? 0)) keys.push('settings:casa')
  return keys
}

function allKeys(db: DB): string[] {
  const keys = KINDS.flatMap((k) => Object.keys(db[k]).map((id) => `${k}:${id}`))
  if (db.settings.onboarded) keys.push('settings:casa')
  return keys
}

function rowFor(db: DB, key: string): Row | null {
  const [kind, id] = key.split(':') as [Kind, string]
  if (kind === 'settings') return { kind, id, data: sharedSettings(db.settings), updated_at: db.settings.updatedAt ?? Date.now() }
  const rec = (db[kind] as Record<string, { updatedAt: number }>)[id]
  return rec ? { kind, id, data: rec, updated_at: rec.updatedAt } : null
}

function enqueue(keys: string[]) {
  if (!keys.length) return
  setState({ pending: [...new Set([...state.pending, ...keys])] })
  schedulePush()
}

// ---------- ciclo ----------

let pushTimer: ReturnType<typeof setTimeout> | undefined
function schedulePush() {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => void syncNow(), 800)
}

let running: Promise<void> | null = null

export function syncNow(): Promise<void> {
  if (!syncAvailable || !state.casa) return Promise.resolve()
  if (running) return running
  running = (async () => {
    setState({ busy: true })
    try {
      await push()
      await pull()
      setState({ lastOk: Date.now(), error: null })
    } catch (e) {
      setState({ error: navigator.onLine ? 'Não consegui falar com o servidor. Tento de novo sozinho.' : 'Sem internet. Tudo fica salvo aqui e sobe depois.' })
      console.warn('sync', e)
    } finally {
      setState({ busy: false })
      running = null
    }
  })()
  return running
}

async function push() {
  const keys = state.pending
  if (!keys.length) return
  const db = getDB()
  const rows = keys.map((k) => rowFor(db, k)).filter((r): r is Row => !!r)
  for (let i = 0; i < rows.length; i += 200) await rpc('feirinha_push', { p_casa: state.casa, p_rows: rows.slice(i, i + 200) })
  // só tira da fila o que foi enviado (algo pode ter mudado no meio)
  const sent = new Set(keys)
  setState({ pending: state.pending.filter((k) => !sent.has(k)) })
}

async function pull() {
  for (;;) {
    const rows = await rpc<Row[]>('feirinha_pull', { p_casa: state.casa, p_since: state.cursor })
    if (!rows.length) return
    merge(rows)
    setState({ cursor: Math.max(state.cursor, ...rows.map((r) => r.rev ?? 0)) })
    if (rows.length < 2000) return
  }
}

function merge(rows: Row[]) {
  const pending = new Set(state.pending)
  applyRemote((d) => {
    for (const r of rows) {
      const key = `${r.kind}:${r.id}`
      if (r.kind === 'settings') {
        if (pending.has(key) && (d.settings.updatedAt ?? 0) > r.updated_at) continue
        if ((d.settings.updatedAt ?? 0) >= r.updated_at && d.settings.onboarded) continue
        Object.assign(d.settings, r.data as Partial<Settings>, { updatedAt: r.updated_at })
        continue
      }
      const coll = d[r.kind] as Record<string, { updatedAt: number }>
      const local = coll[r.id]
      if (local && local.updatedAt >= r.updated_at) continue
      coll[r.id] = r.data as { updatedAt: number }
    }
  })
}

// ---------- casa ----------

function newCode(): string {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Primeiro celular: cria a casa e sobe tudo que já existe aqui. */
export async function createCasa() {
  setState({ casa: newCode(), cursor: 0, pending: allKeys(getDB()) })
  await syncNow()
}

/** Outro celular abrindo o convite: baixa tudo e junta com o que tiver aqui. */
export async function joinCasa(code: string) {
  const db = getDB()
  setState({ casa: code, cursor: 0, pending: db.settings.onboarded ? allKeys(db) : [] })
  await syncNow()
}

export function leaveCasa() {
  setState({ casa: null, cursor: 0, pending: [], lastOk: null, error: null })
}

export function inviteLink(): string | null {
  return state.casa ? `${location.origin}${location.pathname}?casa=${state.casa}` : null
}

// ---------- liga tudo ----------

export function startSync() {
  if (!syncAvailable) return
  onCommit((prev, next) => {
    if (state.casa) enqueue(diffKeys(prev, next))
  })
  const tick = () => {
    if (document.visibilityState === 'visible') void syncNow()
  }
  window.addEventListener('online', tick)
  document.addEventListener('visibilitychange', tick)
  window.addEventListener('focus', tick)
  setInterval(tick, 15_000)
  tick()
}
