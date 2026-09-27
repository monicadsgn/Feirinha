import { useSyncExternalStore } from 'react'
import { CATALOG_V3_NEW, CATALOG_V3_REMOVED, CATALOG_V3_RENAMES, DEFAULT_AISLES, SEED_ITEMS, SEED_SHOPS, guessCategory, type SeedItem } from './catalog'
import { estimateStock, suggestBuyQty } from './logic'
import { normalize } from './format'
import { prettyName } from './nfce'
import type { DB, EntryReason, Id, Item, ListEntry, SavedRecipe, Settings, Shop, Trip, TripKind, TripLine } from './types'

const KEY = 'feirinha:v1'
export const CATALOG_VERSION = 3

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
    recipes: {},
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
type CommitListener = (prev: DB, next: DB) => void
const commitListeners = new Set<CommitListener>()

/** Avisado a cada mudança feita neste celular (a sincronização usa pra saber o que enviar). */
export function onCommit(l: CommitListener) {
  commitListeners.add(l)
  return () => commitListeners.delete(l)
}

/** Ajustes que valem pra casa toda (o nome de quem usa o celular fica só nele). */
export function sharedSettings(s: Settings): Omit<Settings, 'me' | 'updatedAt'> {
  const { me: _me, updatedAt: _u, ...rest } = s
  return rest
}

function commit(mutate: (d: DB) => void) {
  const prev = db
  const next = structuredClone(db)
  mutate(next)
  if (JSON.stringify(sharedSettings(prev.settings)) !== JSON.stringify(sharedSettings(next.settings))) next.settings.updatedAt = Date.now()
  db = next
  save()
  emit()
  for (const l of commitListeners) l(prev, next)
}

/** Mudanças que chegaram de outro celular: salva e mostra, sem reenviar. */
export function applyRemote(mutate: (d: DB) => void) {
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

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'e', 'o', 'a', 'pra', 'para', 'tb', 'tambem', 'ou', 'um', 'uma'])
const PACK = /^(bandejas?|pacotes?|pcts?|caixas?|cxs?|latas?|rolos?|macos?|pes?|cachos?|duzias?|dz|un|und|unid|unidades?|kg|g|l|litros?|gramas?|quilos?|garrafas?|potes?|grandes?|pequenos?|\d+(kg|g|l|ml)?)$/

/** Palavras que identificam o item: sem acento, sem "de", sem embalagem, no singular. */
export function nameTokens(name: string): string[] {
  return normalize(name.replace(/\(.*?\)/g, ' '))
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(' ')
    .filter((w) => w && !STOP.has(w) && !PACK.test(w))
    .map((w) => ALIAS[w] ?? w)
    .map((w) =>
      w.length > 4 && w.endsWith('oes')
        ? w.slice(0, -3) + 'ao'
        : w.length > 4 && w.endsWith('eis')
          ? w.slice(0, -3) + 'el'
          : w.length > 3 && /[^s]s$/.test(w)
            ? w.slice(0, -1)
            : w,
    )
}

/** Jeitos diferentes de escrever a mesma coisa. */
const ALIAS: Record<string, string> = { artesiano: 'artesanal', nescal: 'nescau', mucarela: 'mussarela', mussarela: 'mussarela', sobrecoxas: 'sobrecoxa' }

export function findItemByName(d: DB, name: string): Item | undefined {
  const q = nameTokens(name)
  if (!q.length) return undefined
  let best: Item | undefined
  let bestScore = 0
  for (const it of Object.values(d.items)) {
    if (it.deleted) continue
    const t = nameTokens(it.name)
    if (!t.length) continue
    const shared = t.filter((w) => q.includes(w)).length
    // casa quando um nome contém o outro inteiro ("ovos" ⊂ "bandeja de ovos", "filés de peito" ⊂ "filé de peito de frango")
    if (shared === t.length || shared === q.length) {
      const score = shared * 10 - Math.abs(t.length - q.length)
      if (score > bestScore) {
        best = it
        bestScore = score
      }
    }
  }
  return best
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
    d.settings.lastReviewAt = now
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
      } else {
        const q = convertQty(parsed.qty, parsed.unit, it.unit)
        if (q) touch(it).defaultQty = q
      }
      putInList(d, it.id, convertQty(parsed.qty, parsed.unit, it.unit) ?? it.defaultQty, 'manual', true)
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
  [/^(bandejas?)$/i, 'bandeja'],
  [/^(ma[cç]os?)$/i, 'maço'],
  [/^(p[eé]s?)$/i, 'pé'],
  [/^(cachos?)$/i, 'cacho'],
  [/^(un|und|unid|unidades?|x)$/i, 'un'],
]

export function parseLine(raw: string): { name: string; qty?: number; unit?: Item['unit'] } | null {
  let line = raw.replace(/^[\s\-•*·✓✔☐☑□▢>]+/, '').replace(/\[.?\]/, '').replace(/⚠.*$/, '').replace(/\s*[—–]\s*$/, '').trim()
  if (!line) return null
  let qty: number | undefined
  let unit: Item['unit'] | undefined
  const lead = line.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Zúçéã]+(?![a-zA-Zúçéã]))?\.?\s*(?:de\s+)?(.*)$/)
  if (lead) {
    const u = lead[2] && UNIT_WORDS.find(([re]) => re.test(lead[2]!))
    if (u) {
      qty = parseFloat(lead[1]!.replace(',', '.'))
      unit = u[1]
      line = lead[3]!.trim()
    } else {
      qty = parseFloat(lead[1]!.replace(',', '.'))
      line = line.replace(/^\d+(?:[.,]\d+)?\s*/, '')
    }
  } else {
    const tail = line.match(/^(.*?)\s*[-–—:x]?\s*(\d+(?:[.,]\d+)?)\s*(x|un|kg|g|pcts?|l|cx|latas?|maços?|pés?|cachos?|bandejas?)?\b.*$/i)
    if (tail && tail[1]) {
      qty = parseFloat(tail[2]!.replace(',', '.'))
      unit = tail[3] ? UNIT_WORDS.find(([re]) => re.test(tail[3]!))?.[1] : undefined
      line = tail[1].trim()
    }
  }
  if (!line || line.length < 2) return null
  return { name: line, qty: qty && qty > 0 ? qty : undefined, unit }
}

/** "300 g" num item em kg vira 0,3. Unidades que não convertem são ignoradas. */
function convertQty(qty: number | undefined, from: Item['unit'] | undefined, to: Item['unit']): number | undefined {
  if (!qty) return undefined
  if (!from || from === to) return qty
  if (from === 'g' && to === 'kg') return +(qty / 1000).toFixed(2)
  if (from === 'kg' && to === 'g') return qty * 1000
  if ((from === 'L' && to === 'cx') || (from === 'cx' && to === 'L')) return qty
  return undefined
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

// ---------- Nota fiscal ----------

export interface NotaLine {
  productName: string
  /** Item da despensa, 'novo' (cria com o nome da nota) ou 'ignorar'. */
  target: Id | 'novo' | 'ignorar'
  qty: number
  notaUnit: string
  total: number
}

/**
 * Coloca os itens da nota numa compra: na compra em andamento (preenche os
 * preços) ou numa compra nova já finalizada.
 */
export function importNota(lines: NotaLine[], dest: { tripId: Id } | { shopId: Id; when: number; paidTicket: number }): Id {
  const tripId = 'tripId' in dest ? dest.tripId : uid()
  commit((d) => {
    const now = Date.now()
    let trip = d.trips[tripId]
    if (!trip) {
      const nd = dest as { shopId: Id; when: number }
      trip = { id: tripId, shopId: nd.shopId, kind: 'feira', startedAt: nd.when, finishedAt: null, lines: [], paidTicket: 0, updatedAt: now }
      d.trips[tripId] = trip
    }
    // soma produtos repetidos que caem no mesmo item
    const byItem = new Map<Id, { qty: number; total: number; kg: boolean }>()
    for (const l of lines) {
      if (l.target === 'ignorar') continue
      let id = l.target
      if (id === 'novo') {
        const kg = /^(KG|KGS)$/i.test(l.notaUnit)
        id = createItem(d, prettyName(l.productName), { unit: kg ? 'kg' : 'un', defaultQty: kg ? +l.qty.toFixed(2) : Math.max(1, Math.round(l.qty)) }).id
      }
      const it = d.items[id]
      if (!it) continue
      // lembra o nome da nota pra reconhecer sozinho da próxima vez
      const key = normalize(l.productName)
      if (!(it.aliases ?? []).includes(key)) Object.assign(it, { aliases: [...(it.aliases ?? []), key].slice(-8), updatedAt: now })
      const cur = byItem.get(id) ?? { qty: 0, total: 0, kg: /^(KG|KGS)$/i.test(l.notaUnit) }
      byItem.set(id, { qty: cur.qty + l.qty, total: cur.total + l.total, kg: cur.kg })
    }
    const listed = new Set(Object.values(d.list).filter((e) => !e.deleted).map((e) => e.itemId))
    for (const [id, v] of byItem) {
      const it = d.items[id]!
      const existing = trip.lines.find((x) => x.itemId === id)
      // unidades batem (kg com kg, unidade com unidade): usa a quantidade da nota;
      // senão (cebola por unidade vendida por kg), mantém a quantidade e usa o total
      const itemKg = it.unit === 'kg' || it.unit === 'g'
      const qty = v.kg === itemKg ? (it.unit === 'g' ? v.qty * 1000 : v.qty) : existing?.qty ?? it.defaultQty
      const unitPrice = +(v.total / Math.max(qty, 0.001)).toFixed(4)
      if (existing) Object.assign(existing, { qty: +qty.toFixed(3), unitPrice, status: 'pego' })
      else trip.lines.push({ id: uid(), itemId: id, qty: +qty.toFixed(3), unitPrice, status: 'pego', extra: !listed.has(id) })
    }
    trip.updatedAt = now
  })
  if (!('tripId' in dest)) {
    finishTrip(tripId, dest.paidTicket)
    commit((d) => {
      const t = d.trips[tripId]
      if (t) Object.assign(t, { finishedAt: dest.when, updatedAt: Date.now() })
    })
  }
  return tripId
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
      d.items[s.key] = seedToItem(s, keySet, now)
    }
    Object.assign(d.settings, settings, { onboarded: true, catalogVersion: CATALOG_VERSION })
  })
}

function seedToItem(s: SeedItem, keys: Set<string>, now: number): Item {
  return {
    id: s.key,
    name: s.name,
    category: s.category,
    place: s.place,
    unit: s.unit,
    defaultQty: s.qty,
    everyMonths: s.every,
    note: s.note && s.origin === 'lista' ? s.note : undefined,
    shopId: s.shop,
    pairs: (s.pairs ?? []).filter((p) => keys.has(p)),
    stockQty: null,
    stockAt: null,
    updatedAt: now,
  }
}

/** Atualiza o catálogo de quem cadastrou numa versão anterior. Roda uma vez por celular. */
export function runMigrations() {
  const s = db.settings
  if (!s.onboarded || (s.catalogVersion ?? 1) !== 2) return
  commit((d) => {
    const now = Date.now()
    const seed = new Map(SEED_ITEMS.map((x) => [x.key, x]))
    const has = new Set(Object.keys(d.items).filter((k) => !d.items[k]!.deleted))
    for (const [id, oldName] of Object.entries(CATALOG_V3_RENAMES)) {
      const it = d.items[id]
      const sd = seed.get(id)
      if (!sd) continue
      if (!it || it.deleted) {
        // itens que a casa compra e que antes vinham desmarcados
        if (id === 'esponja' || id === 'milho-lata') d.items[id] = seedToItem(sd, new Set([...has, ...CATALOG_V3_NEW]), now)
        continue
      }
      if (it.name !== oldName) continue
      const qtyChanged = it.unit !== sd.unit
      Object.assign(it, {
        name: sd.name,
        unit: sd.unit,
        defaultQty: qtyChanged || it.defaultQty === 1 ? sd.qty : it.defaultQty,
        note: sd.note,
        everyMonths: sd.every,
        shopId: it.shopId === 'hortifruti' ? 'atacadao' : it.shopId,
        pairs: [...new Set([...it.pairs, ...(sd.pairs ?? []).filter((p) => has.has(p) || CATALOG_V3_NEW.includes(p))])],
        updatedAt: now,
      })
    }
    for (const id of CATALOG_V3_NEW) {
      const sd = seed.get(id)
      if (sd && !has.has(id)) d.items[id] = seedToItem(sd, new Set([...has, ...CATALOG_V3_NEW]), now)
    }
    for (const [id, oldName] of Object.entries(CATALOG_V3_REMOVED)) {
      const it = d.items[id]
      if (it && it.name === oldName) {
        Object.assign(it, { deleted: true, updatedAt: now })
        for (const e of Object.values(d.list)) if (e.itemId === id) Object.assign(e, { deleted: true, updatedAt: now })
      }
    }
    // verdura: tenta primeiro no Atacadão; se estiver feia, a quitanda
    for (const it of Object.values(d.items)) {
      if (it.category === 'hortifruti' && it.shopId === 'hortifruti' && seed.has(it.id)) Object.assign(it, { shopId: 'atacadao', updatedAt: now })
    }
    const q = d.shops.hortifruti
    if (q && q.name === 'Sacolão / feira') Object.assign(q, { name: 'Quitanda / sacolão', updatedAt: now })
    d.settings.catalogVersion = 3
  })
}

/** Garante que um item do catálogo exista na despensa (pra pôr na lista a partir de uma receita). */
export function ensureSeedItem(key: string): Id | null {
  const sd = SEED_ITEMS.find((x) => x.key === key)
  const cur = db.items[key]
  if (cur && !cur.deleted) return key
  if (!sd) return null
  commit((d) => {
    d.items[key] = seedToItem(sd, new Set(Object.keys(d.items)), Date.now())
  })
  return key
}

// ---------- Receitas salvas ----------

export function saveRecipe(r: Partial<SavedRecipe> & { name: string }): Id {
  const id = r.id ?? uid()
  commit((d) => {
    const prev = d.recipes[id]
    const base: SavedRecipe = prev ?? { id, name: r.name, uses: [], meals: [], addedBy: d.settings.me, updatedAt: 0 }
    d.recipes[id] = { ...base, ...r, id, updatedAt: Date.now() }
  })
  return id
}

export function deleteRecipe(id: Id) {
  commit((d) => {
    const r = d.recipes[id]
    if (r) Object.assign(r, { deleted: true, updatedAt: Date.now() })
  })
}

/** Acha na despensa os itens citados num texto de receita (um por linha ou separados por vírgula). */
export function matchIngredients(text: string): Id[] {
  const ids = new Set<Id>()
  for (const raw of text.split(/\r?\n|,|;|•/)) {
    const line = raw.replace(/\d+\s*(g|kg|ml|l|x[ií]caras?|colher(es)?( de sopa| de chá)?|pitadas?|dentes?)\b/gi, ' ').trim()
    if (line.length < 3 || line.length > 80) continue
    const p = parseLine(line)
    const it = p && findItemByName(db, p.name)
    if (it) ids.add(it.id)
  }
  return [...ids]
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

/** Volta pro cadastro mantendo nome, ticket e lugares. Só usado antes da primeira compra. */
export function redoOnboarding() {
  commit((d) => {
    const { settings, shops } = d
    Object.assign(d, emptyDB(), { shops, settings: { ...settings, onboarded: false } })
  })
}
