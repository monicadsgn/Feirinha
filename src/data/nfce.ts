import { normalize } from './format'
import type { DB, Id, Item } from './types'

/** O que a função /api/nfce devolve. */
export interface Nota {
  store: string
  /** "2026-09-27T10:32" no horário da nota. */
  date: string | null
  total: number
  items: NotaItem[]
}

export interface NotaItem {
  name: string
  qty: number
  unit: string
  unitPrice: number | null
  total: number
}

export async function fetchNota(qrText: string): Promise<Nota> {
  const url = qrText.trim().match(/https?:\/\/\S+/)?.[0] ?? qrText.trim()
  const res = await fetch(`/api/nfce?url=${encodeURIComponent(url)}`)
  const body = (await res.json().catch(() => ({}))) as Nota & { error?: string }
  if (!res.ok) throw new Error(body.error ?? 'Não consegui abrir essa nota.')
  return body
}

/** Abreviações comuns nas notas de supermercado. */
const ABBR: Record<string, string[]> = {
  deterg: ['detergente'],
  det: ['detergente'],
  amac: ['amaciante'],
  sab: ['sabao'],
  sabon: ['sabonete'],
  pap: ['papel'],
  hig: ['higienico'],
  cr: ['creme'],
  lte: ['leite'],
  lt: ['leite'],
  qjo: ['queijo'],
  qj: ['queijo'],
  muss: ['mussarela'],
  mus: ['mussarela'],
  req: ['requeijao'],
  marg: ['margarina'],
  maion: ['maionese'],
  mai: ['maionese'],
  extr: ['extrato'],
  ext: ['extrato'],
  tom: ['tomate'],
  mac: ['macarrao'],
  macar: ['macarrao'],
  feij: ['feijao'],
  acuc: ['acucar'],
  bat: ['batata'],
  ceb: ['cebola'],
  ban: ['banana'],
  ling: ['linguica'],
  sals: ['salsicha'],
  desod: ['desodorante'],
  dent: ['dente', 'dental'],
  ag: ['agua'],
  sanit: ['sanitaria'],
  esp: ['esponja'],
  saq: ['saco'],
  alum: ['aluminio'],
  fil: ['file'],
  pto: ['peito'],
  fgo: ['frango'],
  frgo: ['frango'],
  cx: ['coxa'],
  sobrecx: ['sobrecoxa'],
  moid: ['moida'],
  choc: ['chocolate'],
  achoc: ['achocolatado', 'nescau'],
  refr: ['refrigerante'],
  refrig: ['refrigerante'],
  farin: ['farinha'],
  far: ['farinha'],
  mand: ['mandioca'],
  temp: ['tempero'],
  cond: ['condicionador'],
  sh: ['shampoo'],
  shamp: ['shampoo'],
  papel: ['papel'],
  toal: ['toalha'],
  lixo: ['lixo'],
  ervil: ['ervilha'],
  flocao: ['flocao', 'cuscuz'],
  floc: ['flocao', 'cuscuz'],
  milh: ['milho'],
  sard: ['sardinha'],
  liq: ['liquido'],
  liqu: ['liquido'],
}

const DROP = /^(\d+([.,]\d+)?(kg|g|gr|ml|l|lt|un|und|m|cm|x)?|kg|g|gr|ml|l|un|und|pct|pc|cx|bdj|bandeja|tp|t1|t2|tipo|bov|bovino|resf|resfriado|cong|congelado|kg\.|c\/|s\/|com|de|da|do|e)$/

/** Palavras de um nome (da nota ou da despensa), já sem acento, abreviação e plural. */
export function notaTokens(name: string): string[] {
  const out: string[] = []
  for (let w of normalize(name.replace(/\(.*?\)/g, ' ')).split(/[^a-z0-9]+/)) {
    if (!w || DROP.test(w)) continue
    if (w.length > 3 && /[^s]s$/.test(w)) w = w.slice(0, -1)
    out.push(...(ABBR[w] ?? [w]))
  }
  return out
}

const same = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)))

/** Acha o item da despensa pra um produto da nota. */
export function matchProduct(db: DB, productName: string): Item | undefined {
  const key = normalize(productName)
  const items = Object.values(db.items).filter((i) => !i.deleted)
  const known = items.find((i) => i.aliases?.includes(key))
  if (known) return known
  const q = notaTokens(productName)
  let best: Item | undefined
  let bestScore = 0
  for (const it of items) {
    const t = notaTokens(it.name)
    if (!t.length) continue
    const hits = t.filter((w) => q.some((x) => same(w, x))).length
    // todas as palavras do item aparecem na nota ("carne moida" em "CARNE MOIDA BOV COXAO MOLE")
    if (hits !== t.length) continue
    const score = hits * 10 - (t.length - hits)
    if (score > bestScore) {
      best = it
      bestScore = score
    }
  }
  return best
}

/** "ARROZ T1 TIO JOAO 1KG" → "Arroz T1 Tio Joao 1kg" pra criar item novo. */
export function prettyName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s)(\p{L})/gu, (_, sp, c: string) => sp + c.toUpperCase())
}

export function guessShop(db: DB, store: string): Id | undefined {
  const n = normalize(store)
  const shops = Object.values(db.shops).filter((s) => !s.deleted)
  return shops.find((s) => notaTokens(s.name).some((w) => n.includes(w)))?.id
}
