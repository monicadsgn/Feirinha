import { useSyncExternalStore } from 'react'
import { DEFAULT_AISLES, SEED_ITEMS, SEED_SHOPS, guessCategory } from './catalog'
import { estimateStock, suggestBuyQty } from './logic'
import { normalize } from './format'
import type { DB, EntryReason, Id, Item, ListEntry, Settings, Shop, Trip, TripKind, TripLine } from './types'

const KEY = 'feirinha:v1'

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

function emptyDB(): DB {
  const now = Date.now()
  const shops: Record<Id, Shop> = {}
  for (const s of SEED_SHOPS) {
    shops[s.key] = { id: s.key, name: s.name, emoji: s.emoji, aisles: [...DEFAULT_AISLES], updatedAt: now }
  }
  return {
    version: 1,
    items: {},
    shops,
    list: {},
    trips: {},
    settings: { me: '', people: [], ticketMonthly: 0, ticketDay: 5, onboarded: false },
  }
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...emptyDB(), ...JSON.parse(raw) } as DB
  } catch {
    /* sem storage: começa vazio */
  }
  return emptyDB()
}

let db: DB = load()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* armazenamento cheio ou bloqueado */
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      db = load()
      emit()
    }
  })
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, () => db)
}

export function getDB(): DB {
  return db
}

/** Toda escrita passa por aqui: copia, muda, salva, avisa a tela. */
function commit(mutate: (d: DB) => void) {
  const next = structuredClone(db)
  mutate(next)
  db = next
  save()
  emit()
}

const touch = <T extends { updatedAt: number }>(r: T): T => {
  r.updatedAt = Date.now()
  return r
}

// ---------- Itens ----------

export function createItem(d: DB, name: string, patch: Partial<Item> = {}): Item {
  const guess = guessCategory(name)
  const item: Item = {
    id: uid(),
    name: name.trim(),
    category: guess.category,
    place: guess.place,
    unit: 'un',
    defaultQty: 1,
    shopId: guess.category === 'hortifruti' && d.shops.hortifruti ? 'hortifruti' : firstShopId(d),
    pairs: [],
    stockQty: null,
    stockAt: null,
    updatedAt: Date.now(),
    ...patch,
  }
  d.items[item.id] = item
  return item
}

function firstShopId(d: DB): Id {
  return Object.values(d.shops).find((s) => !s.deleted)?.id ?? 'atacadao'
}

export function addItem(name: string, patch: Partial<Item> = {}): Item {
  let created!: Item
  commit((d) => {
    created = createItem(d, name, patch)
  })
  return created
}

export function updateItem(id: Id, patch: Partial<Item>) {
  commit((d) => {
    const it = d.items[id]
    if (it) Object.assign(touch(it), patch)
  })
}

export function deleteItem(id: Id) {
  commit((d) => {
    const it = d.items[id]
    if (it) touch(it).deleted = true
    for (const e of Object.values(d.list)) if (e.itemId === id) touch(e).deleted = true
  })
}

export function findItemByName(d: DB, name: string): Item | undefined {
  const n = normalize(name)
  if (!n) return undefined
  const items = Object.values(d.items).filter((i) => !i.deleted)
  return (
    items.find((i) => normalize(i.name) === n) ??
    items.find((i) => normalize(i.name).startsWith(n + ' ')) ??
    items.find((i) => n.startsWith(normalize(i.name)))
  )
}

// ---------- Estoque ----------

/** "Acabou!" — zera o estoque e já joga na lista. */
export function markOut(itemId: Id) {
  commit((d) => {
    const it = d.items[itemId]
    if (!it) return
    Object.assign(touch(it), { stockQty: 0, stockAt: Date.now() })
    putInList(d, itemId, it.defaultQty, 'acabou')
  })
}

/** "Usei 1" — desconta do estoque estimado. Se zerar, entra na lista. */
export function consumeOne(itemId: Id) {
  commit((d) => {
    const it = d.items[itemId]
    if (!it) return
    const est = estimateStock(d, it) ?? it.defaultQty
    const step = it.unit === 'kg' ? Math.min(0.5, est) : 1
    const left = Math.max(0, +(est - step).toFixed(2))
    Object.assign(touch(it), { stockQty: left, stockAt: Date.now() })
    if (left <= 0) putInList(d, itemId, it.defaultQty, 'acabou')
  })
}

export function setStock(itemId: Id, qty: number | null) {
  commit((d) => {
    const it = d.items[itemId]
    if (it) Object.assign(touch(it), { stockQty: qty, stockAt: qty == null ? null : Date.now() })
  })
}

export type ReviewAnswer = 'ok' | 'pouco' | 'acabou'

/** Resultado da revisão da despensa: atualiza estoque e monta a lista. */
export function applyReview(answers: Record<Id, { answer: ReviewAnswer; buy: number }>) {
  commit((d) => {
    const now = Date.now()
    for (const [itemId, { answer, buy }] of Object.entries(answers)) {
      const it = d.items[itemId]
      if (!it) continue
      const est = estimateStock(d, it)
      const stock =
        answer === 'acabou' ? 0 : answer === 'pouco' ? Math.min(est ?? Infinity, it.defaultQty * 0.25) : Math.max(est ?? 0, it.defaultQty)
      Object.assign(touch(it), { stockQty: +stock.toFixed(2), stockAt: now })
      if (answer !== 'ok' && buy > 0) putInList(d, itemId, buy, answer === 'acabou' ? 'acabou' : 'revisao', true)
    }
  })
}

// ---------- Lista ----------

function putInList(d: DB, itemId: Id, qty: number, reason: EntryReason, overwriteQty = false): ListEntry {
  const existing = Object.values(d.list).find((e) => e.itemId === itemId && !e.deleted)
  if (existing) {
    if (overwriteQty) existing.qty = qty
    return touch(existing)
  }
  const e: ListEntry = { id: uid(), itemId, qty, reason, addedBy: d.settings.me, updatedAt: Date.now() }
  d.list[e.id] = e
  return e
}

export function addToList(itemId: Id, qty?: number, reason: EntryReason = 'manual') {
  commit((d) => {
    const it = d.items[itemId]
    if (!it) return
    putInList(d, itemId, qty ?? suggestBuyQty(d, it), reason)
  })
}

export function setListQty(entryId: Id, qty: number) {
  commit((d) => {
    const e = d.list[entryId]
    if (e) touch(e).qty = Math.max(0, qty)
  })
}

export function removeFromList(entryId: Id) {
  commit((d) => {
    const e = d.list[entryId]
    if (e) touch(e).deleted = true
  })
}

/** Lê uma lista colada ("4 arroz", "detergente x2", "- 1kg de tomate"). */
export function importText(text: string): { added: number; created: number } {
  let added = 0
  let created = 0
  commit((d) => {
    for (const raw of text.split(/\r?\n|;/)) {
      const parsed = parseLine(raw)
      if (!parsed) continue
      let it = findItemByName(d, parsed.name)
      if (!it) {
        it = createItem(d, capitalize(parsed.name), {
          defaultQty: parsed.qty ?? 1,
          unit: parsed.unit ?? 'un',
        })
        created++
      } else if (parsed.qty) {
        touch(it).defaultQty = parsed.qty
      }
      putInList(d, it.id, parsed.qty ?? it.defaultQty, 'manual', true)
      added++
    }
  })
  return { added, created }
}

const UNIT_WORDS: [RegExp, Item['unit']][] = [
  [/^(kg|quilos?|kilos?)$/i, 'kg'],
  [/^(g|gramas?)$/i, 'g'],
  [/^(l|litros?)$/i, 'L'],
  [/^(pct|pcts|pacotes?)$/i, 'pct'],
  [/^(cx|caixas?)$/i, 'cx'],
  [/^(dz|d[uú]zias?)$/i, 'dz'],
  [/^(latas?)$/i, 'lata'],
  [/^(rolos?)$/i, 'rolo'],
  [/^(un|und|unid|unidades?|x)$/i, 'un'],
]

export function parseLine(raw: string): { name: string; qty?: number; unit?: Item['unit'] } | null {
  let line = raw.replace(/^[\s\-•*·✓✔☐☑□▢>]+/, '').replace(/\[.?\]/, '').trim()
  if (!line) return null
  let qty: number | undefined
  let unit: Item['unit'] | undefined
  const lead = line.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Zúç]+\b)?\.?\s*(?:de\s+)?(.*)$/)
  if (lead) {
    const u = lead[2] && UNIT_WORDS.find(([re]) => re.test(lead[2]!))
    if (u) {
      qty = parseFloat(lead[1]!.replace(',', '.'))
      unit = u[1]
      line = lead[3]!.trim()
    } else {
      qty = parseFloat(lead[1]!.replace(',', '.'))
      line = ((lead[2] ?? '') + ' ' + lead[3]).trim()
    }
  } else {
    const tail = line.match(/^(.*?)\s*[-–:x]?\s*(\d+(?:[.,]\d+)?)\s*(x|un|kg|pct|l|cx)?$/i)
    if (tail && tail[1]) {
      qty = parseFloat(tail[2]!.replace(',', '.'))
      unit = tail[3] ? UNIT_WORDS.find(([re]) => re.test(tail[3]!))?.[1] : undefined
      line = tail[1].trim()
    }
  }
  if (!line || line.length < 2) return null
  return { name: line, qty: qty && qty > 0 ? qty : undefined, unit }
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// ---------- Mercado ----------

export function activeTrip(d: DB): Trip | undefined {
  return Object.values(d.trips).find((t) => !t.deleted && t.finishedAt == null)
}

export function startTrip(shopId: Id, kind: TripKind): Id {
  const id = uid()
  commit((d) => {
    d.trips[id] = { id, shopId, kind, startedAt: Date.now(), finishedAt: null, lines: [], paidTicket: 0, updatedAt: Date.now() }
  })
  return id
}

export function setLine(tripId: Id, itemId: Id, patch: Partial<Omit<TripLine, 'id' | 'itemId'>>) {
  commit((d) => {
    const t = d.trips[tripId]
    if (!t) return
    let line = t.lines.find((l) => l.itemId === itemId)
    if (!line) {
      const entry = Object.values(d.list).find((e) => e.itemId === itemId && !e.deleted)
      line = { id: uid(), itemId, qty: entry?.qty ?? d.items[itemId]?.defaultQty ?? 1, unitPrice: null, status: 'pego', extra: !entry }
      t.lines.push(line)
    }
    Object.assign(line, patch)
    touch(t)
  })
}

export function removeLine(tripId: Id, itemId: Id) {
  commit((d) => {
    const t = d.trips[tripId]
    if (!t) return
    t.lines = t.lines.filter((l) => l.itemId !== itemId)
    touch(t)
  })
}

export function finishTrip(tripId: Id, paidTicket: number) {
  commit((d) => {
    const t = d.trips[tripId]
    if (!t) return
    const now = Date.now()
    for (const line of t.lines) {
      const entry = Object.values(d.list).find((e) => e.itemId === line.itemId && !e.deleted)
      const it = d.items[line.itemId]
      if (line.status === 'pego') {
        if (entry) touch(entry).deleted = true
        if (it) {
          const before = estimateStock(d, it) ?? 0
          Object.assign(touch(it), { stockQty: +(before + line.qty).toFixed(2), stockAt: now })
        }
      } else if (entry) {
        touch(entry).reason = 'pendente'
      }
    }
    t.finishedAt = now
    t.paidTicket = paidTicket
    touch(t)
  })
}

export function cancelTrip(tripId: Id) {
  commit((d) => {
    const t = d.trips[tripId]
    if (t) touch(t).deleted = true
  })
}

export function deleteTrip(tripId: Id) {
  cancelTrip(tripId)
}

// ---------- Ajustes ----------

export function updateSettings(patch: Partial<Settings>) {
  commit((d) => {
    Object.assign(d.settings, patch)
  })
}

export function upsertShop(shop: Partial<Shop> & { id?: Id }) {
  commit((d) => {
    const id = shop.id ?? uid()
    const prev = d.shops[id]
    const base: Shop = prev ?? { id, name: 'Novo lugar', emoji: '🛍️', aisles: [...DEFAULT_AISLES], updatedAt: 0 }
    d.shops[id] = { ...base, ...shop, id, updatedAt: Date.now() }
  })
}

export function deleteShop(id: Id) {
  commit((d) => {
    const s = d.shops[id]
    if (s) touch(s).deleted = true
  })
}

/** Primeiro acesso: cria os itens escolhidos do catálogo. */
export function finishOnboarding(settings: Partial<Settings>, seedKeys: string[]) {
  commit((d) => {
    const now = Date.now()
    const keySet = new Set(seedKeys)
    for (const s of SEED_ITEMS) {
      if (!keySet.has(s.key) || d.items[s.key]) continue
      d.items[s.key] = {
        id: s.key,
        name: s.name,
        category: s.category,
        place: s.place,
        unit: s.unit,
        defaultQty: s.qty,
        shopId: s.shop,
        pairs: (s.pairs ?? []).filter((p) => keySet.has(p)),
        stockQty: null,
        stockAt: null,
        updatedAt: now,
      }
    }
    Object.assign(d.settings, settings, { onboarded: true })
  })
}

export function exportJSON(): string {
  return JSON.stringify(db, null, 2)
}

export function importJSON(text: string) {
  const parsed = JSON.parse(text) as DB
  if (!parsed || parsed.version !== 1 || !parsed.items) throw new Error('Arquivo inválido')
  commit((d) => {
    Object.assign(d, parsed)
  })
}

export function resetAll() {
  commit((d) => {
    Object.assign(d, emptyDB())
  })
}
