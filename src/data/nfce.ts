import { normalize } from './format'
import type { DB, Id, Item } from './types'

/** O que a função /api/nfce devolve. */
export interface Nota {
  store: string
  /** "2026-09-27T10:32" no horário da nota. */
  date: string | null
  total: number
  /** Desconto dado no caixa (quando a nota mostra). */
  discount?: number | null
  /** Valor a pagar, já com desconto. */
  paid?: number | null
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
  // plano B: texto da nota colado (página da Sefaz copiada no Safari, ou o cupom)
  const local = parseNotaText(qrText)
  if (local) return local
  const url = qrText.trim().match(/https?:\/\/\S+/)?.[0] ?? qrText.trim()
  const res = await fetch(`/api/nfce?url=${encodeURIComponent(url)}`)
  const body = (await res.json().catch(() => ({}))) as Nota & { error?: string }
  if (!res.ok) throw new Error(body.error ?? 'Não consegui abrir essa nota.')
  return body
}

const num = (s: string): number | null => {
  const v = parseFloat(s.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
  return Number.isFinite(v) ? v : null
}

/**
 * Lê o texto de uma nota colado no app. Entende dois jeitos:
 * - a página da Sefaz copiada ("ARROZ 1KG (Código: 123) Qtde.:2 UN: PCT Vl. Unit.: 5,39 Vl. Total 10,78");
 * - as linhas do cupom impresso ("00081178 SACO LIXO 30L 1 UNDS 13,97 13,97").
 * Devolve null quando não parece nota (ex.: é só o link).
 */
export function parseNotaText(raw: string): Nota | null {
  const text = raw.replace(/\r/g, '').replace(/[ \t\u00a0]+/g, ' ')
  if (text.trim().split('\n').length < 2 && !/C[óo]digo/i.test(text)) return null
  const items: NotaItem[] = []
  const portal = /([^\n]+?)\s*\(\s*C[óo]d(?:igo)?\.?:?\s*[\w.-]+\s*\)[\s\S]*?Qtde\.?:?\s*([\d.,]+)[\s\S]*?UN:?\s*([A-Za-z]+)[\s\S]*?Vl\.?\s*Unit\.?:?\s*([\d.,]+)[\s\S]*?Vl\.?\s*Total:?\s*([\d.,]+)/gi
  let m: RegExpExecArray | null
  while ((m = portal.exec(text))) {
    const qty = num(m[2]!) ?? 1
    const unitPrice = num(m[4]!)
    items.push({ name: m[1]!.trim(), qty, unit: m[3]!.toUpperCase(), unitPrice, total: num(m[5]!) ?? (unitPrice ?? 0) * qty })
  }
  if (!items.length) {
    const cupom = /^\s*\d{3,14}\s+(.+?)\s+([\d.,]+)\s*(UNDS?|UN|KG|PC|PCT|CX|LT|L|G|FD|DZ|BD)\b\.?\s*(?:X\s*)?([\d.,]+)\s+([\d.,]+)\s*$/gim
    while ((m = cupom.exec(text))) {
      const qty = num(m[2]!) ?? 1
      items.push({ name: m[1]!.trim(), qty, unit: m[3]!.toUpperCase().replace(/^UNDS?$/, 'UN'), unitPrice: num(m[4]!), total: num(m[5]!) ?? 0 })
    }
  }
  if (!items.length) return null
  const find = (re: RegExp) => {
    const x = re.exec(text)
    return x ? num(x[1]!) : null
  }
  const dateM = /(?:Emiss[ãa]o:?\s*)?(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/.exec(text)
  const sum = items.reduce((s, i) => s + i.total, 0)
  return {
    store: /atacad[ãa]o/i.test(text) ? 'Atacadão' : '',
    date: dateM ? `${dateM[3]}-${dateM[2]}-${dateM[1]}T${dateM[4]}` : null,
    total: find(/Valor total\s*R\$:?\s*([\d.,]+)/i) ?? +sum.toFixed(2),
    discount: find(/Descontos?(?:\s*total)?\s*R\$:?\s*([\d.,]+)/i),
    paid: find(/Valor a pagar\s*R\$:?\s*([\d.,]+)/i),
    items,
  }
}

/** Abreviações comuns nas notas de supermercado. */
const ABBR: Record<string, string[]> = {
  deterg: ['detergente'],
  det: ['detergente'],
  amac: ['amaciante'],
  sab: ['sabao', 'sabonete'],
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
  catchup: ['ketchup'],
  ref: ['refrigerante'],
  refri: ['refrigerante'],
  ral: ['ralado'],
  tritur: ['triturado', 'pote'],
  ferm: ['fermento'],
  fleischmann: ['fermento', 'pao'],
  micro: ['micro', 'onda'],
  haste: ['cotonete'],
  hastes: ['cotonete'],
  packlixo: ['saco', 'lixo'],
  inst: ['instantaneo'],
  yakult: ['yakult', 'fermentado'],
  extrato: ['extrato', 'tomate'],
  liqu: ['liquido'],
}

const DROP = /^(\d+([.,]\d+)?(kg|g|gr|ml|l|lt|un|und|m|cm|x)?|kg|g|gr|ml|l|un|und|pct|pc|cx|bdj|bandeja|tp|t1|t2|tipo|bov|bovino|resf|resfriado|cong|congelado|congelada|kg\.|c\/|s\/|com|de|da|do|e|pra|para|em)$/

/** Abreviações de mais de uma palavra, trocadas antes de separar as palavras. */
const PHRASES: [RegExp, string][] = [
  [/\bl\.?\s*cond\b\.?/g, 'leite condensado '],
  [/\bleite\s*ferm\b\.?/g, 'leite fermentado '],
  [/\bbatata\s*p\b\.?/g, 'batata palha '],
  [/\bmc\s*cain\b/g, 'batata frita '],
  [/\bap\.?\s*barb\b\.?/g, 'aparelho barbear '],
  [/\bfl\.?\s*alum\b\.?/g, 'papel aluminio '],
  [/\bcx\.?\s*mole\b/g, 'coxao mole '],
  [/\bs\/\s*coxa\b/g, 'sobrecoxa '],
  [/\bmac\.?\s*inst\b\.?/g, 'miojo macarrao instantaneo '],
  [/\bdes\.(?=\s*\w)/g, 'desodorante '],
  [/\b(ervilha\s*\/\s*milho|milho\s*\/\s*ervilha)\b/g, 'dueto milho ervilha '],
]

/** Palavras que mudam o produto: "leite" não serve pra "leite condensado". */
const MODIFIERS = new Set(['condensado', 'fermentado', 'palha', 'frita'])

/** Embalagem no nome do item ("Sardinha em lata"): a nota nem sempre traz. */
const CONTAINERS = new Set(['lata', 'caixa', 'pacote', 'pote', 'refil', 'garrafa', 'sache', 'sachê', 'saco'])

/** Palavras de um nome (da nota ou da despensa), já sem acento, abreviação e plural. */
export function notaTokens(name: string): string[] {
  const out: string[] = []
  let n = normalize(name.replace(/\(.*?\)/g, ' '))
  for (const [re, to] of PHRASES) n = n.replace(re, to)
  for (let w of n.split(/[^a-z0-9]+/)) {
    if (!w || DROP.test(w)) continue
    if (w.length > 3 && /[^s]s$/.test(w)) w = w.slice(0, -1)
    out.push(...(ABBR[w] ?? [w]))
  }
  return out
}

const same = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)))

/** Nome do item e as variações com "/" ("Queijo prato / mussarela" → queijo prato, queijo mussarela, mussarela). */
function nameVariants(name: string): string[] {
  const clean = name.replace(/\(.*?\)/g, ' ')
  const [a, b] = clean.split('/').map((x) => x.trim())
  if (!b) return [clean]
  const out = [a!, b]
  if (!b.includes(' ')) out.push(a!.replace(/\S+$/, b))
  return out
}

/**
 * Acha o item da despensa pra um produto da nota. `prefer` = o que foi
 * marcado nessa compra: ganha no empate e também vale pelo que está entre
 * parênteses ("Carne moída (coxão mole)" é o "BOV.BIFE CX.MOLE" moído no
 * açougue).
 */
export function matchProduct(db: DB, productName: string, prefer: Set<Id> = new Set()): Item | undefined {
  const key = normalize(productName)
  const items = Object.values(db.items).filter((i) => !i.deleted)
  const known = items.find((i) => i.aliases?.includes(key))
  // o nome já foi ligado antes: vale, a não ser que outro item dessa compra combine melhor
  if (known && (!prefer.size || prefer.has(known.id))) return known
  const q = notaTokens(productName)
  let best: Item | undefined = known
  let bestScore = known ? 15 : 0
  for (const it of items) {
    const inTrip = prefer.has(it.id)
    const paren = inTrip ? [...it.name.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]!) : []
    for (const variant of [...nameVariants(it.name), ...paren]) {
      const all = notaTokens(variant)
      // embalagem é opcional ("SARD RALADA" serve pra "Sardinha em lata")
      const t = all.filter((w) => !CONTAINERS.has(w) || q.includes(w))
      if (!t.length) continue
      const hits = t.filter((w) => q.some((x) => same(w, x)))
      // todas as palavras do item aparecem na nota ("carne moida" em "CARNE MOIDA BOV COXAO MOLE")
      if (hits.length !== t.length) continue
      // a nota diz "condensado"/"palha"/… e o item não: é outro produto
      if (q.some((x) => MODIFIERS.has(x) && !all.includes(x))) continue
      // mais palavras batendo vence; empate: palavras mais longas (mais específicas)
      const score = hits.length * 10 + hits.join('').length / 10 + (inTrip ? 5 : 0)
      if (score > bestScore) {
        best = it
        bestScore = score
      }
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
