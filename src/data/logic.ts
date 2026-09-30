import { DAY } from './format'
import type { CategoryId, DB, Id, Item, Trip, Unit } from './types'

/**
 * Estoque estimado: a gente não depende de você lembrar de atualizar.
 * O app aprende quanto a casa consome por dia (pelo histórico de compras)
 * e vai "gastando" o estoque sozinho. Quando você informa algo
 * (acabou / usei 1 / revisão), a estimativa é corrigida.
 */

export interface Purchase {
  at: number
  qty: number
  unitPrice: number | null
  shopId: Id
  tripId: Id
  kind: Trip['kind']
  extra: boolean
}

export function finishedTrips(db: DB): Trip[] {
  return Object.values(db.trips)
    .filter((t) => !t.deleted && t.finishedAt != null)
    .sort((a, b) => a.finishedAt! - b.finishedAt!)
}

export function purchasesOf(db: DB, itemId: Id): Purchase[] {
  const out: Purchase[] = []
  for (const t of finishedTrips(db)) {
    for (const l of t.lines) {
      if (l.itemId === itemId && l.status === 'pego')
        out.push({ at: t.finishedAt!, qty: l.qty, unitPrice: l.unitPrice, shopId: t.shopId, tripId: t.id, kind: t.kind, extra: l.extra })
    }
  }
  return out
}

/** Consumo por dia. Com pouco histórico, assume que a compra padrão dura um mês. */
export function dailyRate(db: DB, item: Item): number {
  const ps = purchasesOf(db, item.id).filter((p) => p.at > Date.now() - 365 * DAY)
  if (ps.length >= 2) {
    const span = (ps[ps.length - 1]!.at - ps[0]!.at) / DAY
    if (span >= 20) {
      const consumed = ps.slice(0, -1).reduce((s, p) => s + p.qty, 0)
      return consumed / span
    }
  }
  return Math.max(item.defaultQty, 0.1) / (30 * (item.everyMonths ?? 1))
}

export function estimateStock(db: DB, item: Item, now = Date.now()): number | null {
  if (item.stockQty == null || item.stockAt == null) return null
  const days = Math.max(0, (now - item.stockAt) / DAY)
  return Math.max(0, item.stockQty - dailyRate(db, item) * days)
}

// ---------- Itens de contar ----------

const COUNT_UNITS: Unit[] = ['un', 'pct', 'cx', 'lata', 'rolo', 'bandeja', 'dz']

/** Sugestão de "de contar": fica no armário/geladeira/freezer e vem em mais de uma embalagem. */
export function suggestCount(it: Pick<Item, 'unit' | 'defaultQty' | 'place' | 'category'>): boolean {
  return COUNT_UNITS.includes(it.unit) && it.defaultQty >= 2 && ['armario', 'geladeira', 'freezer'].includes(it.place) && it.category !== 'hortifruti'
}

/** Compra quando tiver isso ou menos. */
export function minOf(it: Item): number {
  return it.minQty ?? Math.max(1, Math.round(it.defaultQty / 3))
}

/** Quantas fechadas e abertas tem agora (a estimativa gasta primeiro as fechadas). */
export function countOf(db: DB, it: Item, now = Date.now()): { closed: number; opened: number; total: number } | null {
  const est = estimateStock(db, it, now)
  if (est == null) return null
  // arredonda pra meia embalagem, senão o consumo de poucas horas "fecha" a aberta
  const r = Math.round(est * 2) / 2
  const opened = Math.min(it.opened ?? 0, r * 2)
  const closed = Math.max(0, Math.round(r - opened * 0.5))
  return { closed, opened, total: closed + opened * 0.5 }
}

export type StockStatus = 'acabou' | 'acabando' | 'ok' | 'desconhecido'

export interface StockInfo {
  est: number | null
  daysLeft: number | null
  status: StockStatus
  /** Estimativa de que não chega até a próxima feira. */
  shortBeforeFeira: boolean
  /** true quando alguém disse que acabou; false quando é só a estimativa. */
  confirmedOut: boolean
}

export function stockInfo(db: DB, item: Item, now = Date.now()): StockInfo {
  const est = estimateStock(db, item, now)
  if (est == null) return { est: null, daysLeft: null, status: 'desconhecido', shortBeforeFeira: false, confirmedOut: false }
  const rate = dailyRate(db, item)
  const daysLeft = rate > 0 ? est / rate : Infinity
  // "acabou" pela estimativa só quando sobrou menos de ~5% do padrão;
  // "pouco" com menos de ~1/3 do que costuma levar (é o que a revisão grava) ou uma semana de uso
  const status: StockStatus = item.count
    ? est < 0.25
      ? 'acabou'
      : est <= minOf(item)
        ? 'acabando'
        : 'ok'
    : est <= item.defaultQty * 0.05
      ? 'acabou'
      : est <= item.defaultQty * 0.3 || daysLeft <= 7
        ? 'acabando'
        : 'ok'
  return { est, daysLeft, status, shortBeforeFeira: daysLeft < daysUntilFeira(db.settings.ticketDay, now), confirmedOut: item.stockQty === 0 }
}

/** Quanto comprar: o que a casa gasta até a feira seguinte, menos o que ainda tem. */
export function suggestBuyQty(db: DB, item: Item): number {
  const est = estimateStock(db, item) ?? 0
  const need = item.defaultQty - est
  if (need <= 0) return item.defaultQty
  if (item.unit === 'kg' || item.unit === 'L') return Math.max(+need.toFixed(1), 0.5)
  return Math.max(1, Math.ceil(need))
}

// ---------- Ciclo do ticket ----------

export function cycleStart(ticketDay: number, now = Date.now()): number {
  const d = new Date(now)
  const day = clampDay(d.getFullYear(), d.getMonth(), ticketDay)
  let start = new Date(d.getFullYear(), d.getMonth(), day)
  if (start.getTime() > now) {
    const pm = new Date(d.getFullYear(), d.getMonth() - 1, 1)
    start = new Date(pm.getFullYear(), pm.getMonth(), clampDay(pm.getFullYear(), pm.getMonth(), ticketDay))
  }
  return start.getTime()
}

export function nextFeira(ticketDay: number, now = Date.now()): number {
  const s = new Date(cycleStart(ticketDay, now))
  const nm = new Date(s.getFullYear(), s.getMonth() + 1, 1)
  return new Date(nm.getFullYear(), nm.getMonth(), clampDay(nm.getFullYear(), nm.getMonth(), ticketDay)).getTime()
}

export function daysUntilFeira(ticketDay: number, now = Date.now()): number {
  return Math.ceil((nextFeira(ticketDay, now) - now) / DAY)
}

/** Dia do ticket naquele mês. 0 = último dia útil (seg a sex). */
function clampDay(y: number, m: number, day: number) {
  const last = new Date(y, m + 1, 0).getDate()
  if (day === 0) {
    let d = last
    while ([0, 6].includes(new Date(y, m, d).getDay())) d--
    return d
  }
  return Math.min(day, last)
}

/** "dia 5" ou "último dia útil". */
export function ticketDayLabel(day: number): string {
  return day === 0 ? 'último dia útil do mês' : `dia ${day}`
}

export function tripTotal(trip: Trip): { total: number; picked: number; unpriced: number; missing: number; extras: number } {
  let total = 0
  let picked = 0
  let unpriced = 0
  let missing = 0
  let extras = 0
  for (const l of trip.lines) {
    if (l.status === 'faltou') {
      missing++
      continue
    }
    picked++
    if (l.unitPrice == null) unpriced++
    const v = (l.unitPrice ?? 0) * l.qty
    total += v
    if (l.extra) extras += v
  }
  return { total, picked, unpriced, missing, extras }
}

export function ticketUsedInCycle(db: DB, now = Date.now()): number {
  const start = cycleStart(db.settings.ticketDay, now)
  return finishedTrips(db)
    .filter((t) => t.finishedAt! >= start)
    .reduce((s, t) => s + t.paidTicket, 0)
}

export function ticketLeft(db: DB, now = Date.now()): number {
  return Math.max(0, db.settings.ticketMonthly - ticketUsedInCycle(db, now))
}

// ---------- Preços ----------

export function lastPrice(db: DB, itemId: Id, shopId?: Id): number | null {
  const ps = purchasesOf(db, itemId).filter((p) => p.unitPrice != null)
  const same = shopId ? ps.filter((p) => p.shopId === shopId) : []
  const pick = (same.length ? same : ps).at(-1)
  return pick?.unitPrice ?? null
}

/** Estimativa da lista inteira com os últimos preços conhecidos. */
export function listEstimate(db: DB): { total: number; known: number; unknown: number } {
  let total = 0
  let known = 0
  let unknown = 0
  for (const e of Object.values(db.list)) {
    if (e.deleted) continue
    const p = lastPrice(db, e.itemId, db.items[e.itemId]?.shopId)
    if (p == null) unknown++
    else {
      known++
      total += p * e.qty
    }
  }
  return { total, known, unknown }
}

// ---------- Esquecidos e pares ----------

export function listItemIds(db: DB): Set<Id> {
  return new Set(Object.values(db.list).filter((e) => !e.deleted).map((e) => e.itemId))
}

/** Itens que vocês costumam comprar (ou que devem estar acabando) e não estão na lista. */
export function forgotten(db: DB): Item[] {
  const inList = listItemIds(db)
  const feiras = finishedTrips(db)
    .filter((t) => t.kind === 'feira')
    .slice(-3)
  const boughtCount = new Map<Id, number>()
  for (const t of feiras) for (const l of t.lines) if (l.status === 'pego') boughtCount.set(l.itemId, (boughtCount.get(l.itemId) ?? 0) + 1)
  const need = Math.min(2, feiras.length)
  return Object.values(db.items)
    .filter((i) => !i.deleted && !inList.has(i.id))
    .filter((i) => {
      const s = stockInfo(db, i)
      if (s.status === 'acabou' || s.status === 'acabando') return true
      if (s.status === 'ok' && !s.shortBeforeFeira) return false
      return need > 0 && (boughtCount.get(i.id) ?? 0) >= need
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function pairSuggestions(db: DB, itemId: Id): Item[] {
  const it = db.items[itemId]
  if (!it) return []
  const inList = listItemIds(db)
  const ids = new Set(it.pairs)
  // pares são mútuos: se molho aponta pra macarrão, macarrão sugere molho
  for (const o of Object.values(db.items)) if (o.pairs.includes(itemId)) ids.add(o.id)
  return [...ids]
    .map((id) => db.items[id])
    .filter((p): p is Item => !!p && !p.deleted && !inList.has(p.id) && stockInfo(db, p).status !== 'ok')
}

// ---------- Estatísticas ----------

export const monthKey = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export interface MonthStat {
  key: string
  total: number
  ticket: number
  cash: number
  extras: number
  trips: number
  byCategory: Partial<Record<CategoryId, number>>
}

export function monthlyStats(db: DB): MonthStat[] {
  const map = new Map<string, MonthStat>()
  for (const t of finishedTrips(db)) {
    const key = monthKey(t.finishedAt!)
    const m = map.get(key) ?? { key, total: 0, ticket: 0, cash: 0, extras: 0, trips: 0, byCategory: {} }
    const tt = tripTotal(t)
    m.total += tt.total
    m.extras += tt.extras
    m.ticket += Math.min(t.paidTicket, tt.total)
    m.cash += Math.max(0, tt.total - t.paidTicket)
    m.trips++
    for (const l of t.lines) {
      if (l.status !== 'pego' || l.unitPrice == null) continue
      const cat = db.items[l.itemId]?.category ?? 'outros'
      m.byCategory[cat] = (m.byCategory[cat] ?? 0) + l.unitPrice * l.qty
    }
    map.set(key, m)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export interface ItemStat {
  item: Item
  times: number
  /** De quantos em quantos dias vocês repõem. */
  everyDays: number | null
  qtyPerMonth: number
  spendPerMonth: number
  avgPrice: number | null
  lastPrice: number | null
  /** Variação do último preço contra a média anterior (0.1 = +10%). */
  priceChange: number | null
}

export function itemStats(db: DB, item: Item): ItemStat {
  const ps = purchasesOf(db, item.id)
  const priced = ps.filter((p) => p.unitPrice != null)
  const first = ps[0]?.at
  const months = first ? Math.max(1, (Date.now() - first) / (30 * DAY)) : 1
  const qty = ps.reduce((s, p) => s + p.qty, 0)
  const spend = priced.reduce((s, p) => s + p.unitPrice! * p.qty, 0)
  let everyDays: number | null = null
  if (ps.length >= 2) everyDays = (ps[ps.length - 1]!.at - ps[0]!.at) / DAY / (ps.length - 1)
  const avgPrice = priced.length ? priced.reduce((s, p) => s + p.unitPrice!, 0) / priced.length : null
  const last = priced.at(-1)?.unitPrice ?? null
  let priceChange: number | null = null
  if (priced.length >= 2 && last != null) {
    const prev = priced.slice(0, -1)
    const prevAvg = prev.reduce((s, p) => s + p.unitPrice!, 0) / prev.length
    if (prevAvg > 0) priceChange = last / prevAvg - 1
  }
  return {
    item,
    times: ps.length,
    everyDays,
    qtyPerMonth: ps.length ? qty / months : 0,
    spendPerMonth: ps.length ? spend / months : 0,
    avgPrice,
    lastPrice: last,
    priceChange,
  }
}

// ---------- Porções de carne ----------

/** Carnes que contam como refeição (bacon é tempero, não prato). */
export function isProtein(item: Item): boolean {
  return !item.deleted && ((item.category === 'acougue' && item.id !== 'bacon') || item.id === 'sardinha')
}

/** Refeições do casal por unidade comprada. Sem balança: começa em 4 por kg (250 g cada) e a casa ajusta. */
export function mealsPerUnit(item: Item): number {
  if (item.mealsPerUnit) return item.mealsPerUnit
  if (item.unit === 'kg') return item.id === 'carne-sol' ? 6 : 4
  if (item.unit === 'lata') return 1
  return 2
}

export interface ProteinRow {
  item: Item
  /** Em casa agora (estimado). */
  home: number
  /** Na lista pra comprar. */
  toBuy: number
  meals: number
  perMeal: number | null
}

export function proteinPlan(db: DB): { rows: ProteinRow[]; meals: number; target: number } {
  const inList = new Map<Id, number>()
  for (const e of Object.values(db.list)) if (!e.deleted) inList.set(e.itemId, (inList.get(e.itemId) ?? 0) + e.qty)
  const rows: ProteinRow[] = []
  for (const it of Object.values(db.items)) {
    if (!isProtein(it)) continue
    const home = estimateStock(db, it) ?? 0
    const toBuy = inList.get(it.id) ?? 0
    const per = mealsPerUnit(it)
    const price = lastPrice(db, it.id)
    rows.push({ item: it, home, toBuy, meals: (home + toBuy) * per, perMeal: price != null ? price / per : null })
  }
  rows.sort((a, b) => b.meals - a.meals || a.item.name.localeCompare(b.item.name))
  const weekly = db.settings.mealsPerWeek ?? 10
  const days = Math.max(1, daysUntilFeira(db.settings.ticketDay))
  return { rows, meals: rows.reduce((s, r) => s + r.meals, 0), target: Math.round((weekly / 7) * days) }
}

// ---------- Receitas: dá pra fazer? ----------

/** Tem em casa (ou vai comprar): não acabou pela estimativa, ou está na lista. */
export function haveItem(db: DB, id: Id): boolean {
  const it = db.items[id]
  if (!it || it.deleted) return false
  if (listItemIds(db).has(id)) return true
  return stockInfo(db, it).status !== 'acabou'
}

export function recipeStatus(db: DB, uses: Id[], protein?: Id[]): { missing: Id[]; proteinOk: boolean; unknown: Id[] } {
  const prot = new Set(protein ?? [])
  const proteinOk = !protein?.length || protein.some((p) => haveItem(db, p))
  const rest = uses.filter((u) => !prot.has(u))
  const unknown = rest.filter((u) => !db.items[u] || db.items[u]!.deleted)
  const missing = rest.filter((u) => db.items[u] && !db.items[u]!.deleted && !haveItem(db, u))
  return { missing, proteinOk, unknown }
}

// ---------- Caminho do mês: Casa → Lista → Mercado → Nota ----------

export type JourneyStep = 1 | 2 | 3 | 4

export interface Journey {
  step: JourneyStep
  done: [boolean, boolean, boolean, boolean]
  /** Compra em andamento (passo 3) ou recém-feita pra conferir (passo 4). */
  tripId?: Id
}

export function journey(db: DB, now = Date.now()): Journey {
  const trips = Object.values(db.trips).filter((t) => !t.deleted)
  const active = trips.find((t) => t.finishedAt == null)
  const last = trips.filter((t) => t.finishedAt != null && t.kind === 'feira').sort((a, b) => b.finishedAt! - a.finishedAt!)[0]
  const reviewed = (db.settings.lastReviewAt ?? 0) > (last?.finishedAt ?? 0)
  if (active) return { step: 3, done: [true, true, false, false], tripId: active.id }
  if (last && !last.notaAt && now - last.finishedAt! < 3 * DAY && !reviewed) return { step: 4, done: [true, true, true, false], tripId: last.id }
  if (reviewed) return { step: 2, done: [true, false, false, false] }
  return { step: 1, done: [false, false, false, false] }
}
