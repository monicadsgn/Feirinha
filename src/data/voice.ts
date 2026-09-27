import { normalize } from './format'
import { SEED_ITEMS } from './catalog'
import { addItem, addToList, ensureSeedItem, findItemByName, getDB, markOut, nameTokens, parseLine, undoable } from './store'

/**
 * Comandos falados (ou digitados) em português do dia a dia:
 *   "acabou o detergente e o arroz"
 *   "coloca dois pacotes de café e meio quilo de queijo na lista"
 *   "anota sabão em pó, esponja e papel higiênico"
 * Sem "acabou/terminou", vai pra lista.
 */

export type Intent = 'acabou' | 'lista'

export interface Command {
  intent: Intent
  items: { name: string; qty?: number }[]
  /** Frase original (pra manter acentos ao criar item novo). */
  original?: string
}

const NUM: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  doze: 12,
  quinze: 15,
  vinte: 20,
}

const OUT = /\b(acabou|acabaram|acabando|terminou|terminaram|nao tem mais|sem|faltando|falta|faltou)\b/
const FILLER =
  /\b(feirinha|coloca|coloque|colocar|adiciona|adicione|adicionar|anota|anote|anotar|bota|bote|poe|ponha|por|comprar|compra|preciso de|precisa de|pra lista|na lista|a lista|lista|por favor|tambem|o|a|os|as|de novo|ai)\b/g

/** Devolve as palavras como foram ditas (com acento): "cafe" → "café". */
function restoreAccents(original: string, plain: string): string {
  const words = original.split(/\s+/)
  const target = plain.split(' ')
  for (let i = 0; i + target.length <= words.length; i++) {
    const slice = words.slice(i, i + target.length)
    if (slice.map((w) => normalize(w).replace(/[^a-z0-9]/g, '')).join(' ') === target.join(' ')) return slice.join(' ').replace(/[.,;!?]+$/, '')
  }
  return plain
}

/** Item da despensa; se não tiver, do catálogo completo; se não, cria. */
function resolveItem(name: string, original: string) {
  const db = getDB()
  const found = findItemByName(db, name)
  if (found) return found
  const q = nameTokens(name)
  const seed = SEED_ITEMS.find((s) => {
    const t = nameTokens(s.name)
    return t.length > 0 && (t.every((w) => q.includes(w)) || q.every((w) => t.includes(w)))
  })
  if (seed) {
    const id = ensureSeedItem(seed.key)
    if (id) return getDB().items[id]!
  }
  const nice = restoreAccents(original, name)
  return addItem(nice.charAt(0).toUpperCase() + nice.slice(1))
}

export function parseCommand(text: string): Command {
  let t = normalize(text)
  const intent: Intent = OUT.test(t) ? 'acabou' : 'lista'
  t = t.replace(OUT, ' ')
  t = t
    .replace(/\bmeia duzia\b/g, '6 un')
    .replace(/\bmeio quilo\b/g, '0.5 kg')
    .replace(/\bum quilo e meio\b/g, '1.5 kg')
    .replace(/\b(\w+) quilos?\b/g, (m, n: string) => (NUM[n] ? `${NUM[n]} kg` : m))
    .replace(/\b(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|doze|quinze|vinte)\b/g, (n) => String(NUM[n]))
  t = t.replace(/(\d),(\d)/g, '$1.$2')
  const items: Command['items'] = []
  for (const raw of t.split(/,|;|\be\b|\bmais\b|\+/)) {
    const part = raw.replace(FILLER, ' ').replace(/\s+/g, ' ').trim()
    if (part.length < 2) continue
    const p = parseLine(part)
    if (p) items.push({ name: p.name, qty: p.qty })
  }
  return { intent, items, original: text }
}

/** Parece um comando (mais de um item ou verbo de comando), e não só uma busca? */
export function looksLikeCommand(text: string): boolean {
  const t = normalize(text)
  return OUT.test(t) || /,|\be\b|\bmais\b/.test(t) || /^(coloca|adiciona|anota|bota|poe|comprar|preciso)/.test(t)
}

/** Executa o comando. Devolve o resumo e como desfazer. */
export function runCommand(cmd: Command): { summary: string; undo: () => void } | null {
  if (!cmd.items.length) return null
  const names: string[] = []
  const undo = undoable(() => {
    for (const { name, qty } of cmd.items) {
      const it = resolveItem(name, cmd.original ?? name)
      if (cmd.intent === 'acabou') markOut(it.id)
      else addToList(it.id, qty, 'manual')
      names.push(it.name)
    }
  })
  const verb = cmd.intent === 'acabou' ? 'Acabou e foi pra lista' : 'Na lista'
  return { summary: `${verb}: ${names.join(', ')}`, undo }
}
