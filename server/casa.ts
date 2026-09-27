// Atalhos que falam direto com a casa, sem abrir o app (Siri no iPhone):
//   /api/casa?c=CÓDIGO&quem=Moni&voz=acabou o arroz e o feijão
//   /api/casa?c=CÓDIGO&quem=Moni&receita=https://www.instagram.com/reel/...
//   /api/casa?c=CÓDIGO&quem=Moni&texto=<texto lido de um print>
// Carrega a casa do banco, roda o mesmo código do app e grava o que mudou.
// Responde texto curto, pra Siri ler em voz alta.

import { fetchRecipeMeta } from '../api/_receita.js'
import { getDB, matchIngredients, onCommit, saveRecipe, setDB, sharedSettings } from '../src/data/store'
import { parseCommand, runCommand } from '../src/data/voice'
import type { DB } from '../src/data/types'

type Kind = 'items' | 'shops' | 'list' | 'trips' | 'recipes' | 'settings'
const KINDS = ['items', 'shops', 'list', 'trips', 'recipes'] as const

interface Row {
  kind: Kind
  id: string
  data: unknown
  updated_at: number
  rev?: number
}

const URL_ = process.env.VITE_SUPABASE_URL
const KEY = process.env.VITE_SUPABASE_KEY

async function rpc<T>(fn: string, body: unknown): Promise<T> {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: KEY!, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return (await r.json()) as T
}

async function loadCasa(casa: string, me: string): Promise<DB> {
  const db: DB = {
    version: 1,
    items: {},
    shops: {},
    list: {},
    trips: {},
    recipes: {},
    settings: { me, people: [], ticketMonthly: 0, ticketDay: 5, onboarded: false },
  }
  let since = 0
  for (;;) {
    const rows = await rpc<Row[]>('feirinha_pull', { p_casa: casa, p_since: since })
    for (const r of rows) {
      if (r.kind === 'settings') Object.assign(db.settings, r.data, { me, updatedAt: r.updated_at })
      else (db[r.kind] as Record<string, unknown>)[r.id] = r.data
    }
    if (rows.length < 2000) break
    since = Math.max(...rows.map((r) => r.rev ?? 0))
  }
  return db
}

/** Roda uma ação na casa e grava só os registros que mudaram. */
async function withCasa(casa: string, me: string, action: () => string): Promise<string> {
  const db = await loadCasa(casa, me)
  if (!db.settings.onboarded) throw new Error('Não achei essa casa. Confira o código do atalho nos Ajustes do Feirinha.')
  setDB(db)
  const changed = new Set<string>()
  const off = onCommit((prev, next) => {
    for (const k of KINDS) {
      const a = prev[k] as Record<string, { updatedAt: number }>
      const b = next[k] as Record<string, { updatedAt: number }>
      for (const id in b) if (!a[id] || a[id]!.updatedAt !== b[id]!.updatedAt) changed.add(`${k}:${id}`)
    }
    if ((prev.settings.updatedAt ?? 0) !== (next.settings.updatedAt ?? 0)) changed.add('settings:casa')
  })
  let reply: string
  try {
    reply = action()
  } finally {
    off()
  }
  const now = getDB()
  const rows: Row[] = [...changed].map((key) => {
    const [kind, id] = key.split(':') as [Kind, string]
    if (kind === 'settings') return { kind, id, data: sharedSettings(now.settings), updated_at: now.settings.updatedAt ?? Date.now() }
    const rec = (now[kind] as Record<string, { updatedAt: number }>)[id]!
    return { kind, id, data: rec, updated_at: rec.updatedAt }
  })
  if (rows.length) await rpc('feirinha_push', { p_casa: casa, p_rows: rows })
  return reply
}

/** Quem abre o link no navegador (skill do Claude, toque num link) vê uma página, não texto cru. */
function page(ok: boolean, msg: string): string {
  const esc = msg.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Feirinha</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#faf5ec;color:#1f2a24;font:16px system-ui,-apple-system,sans-serif;padding:24px;box-sizing:border-box}
.c{max-width:420px;text-align:center}.i{font-size:56px}.m{font-size:18px;font-weight:700;margin:12px 0 20px;line-height:1.4}
a{display:inline-block;background:#2f6b4f;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:14px}
@media (prefers-color-scheme:dark){body{background:#151a17;color:#eef0ea}a{background:#6fbf93;color:#0f1a14}}</style></head>
<body><div class="c"><div class="i">${ok ? '🧺' : '⚠️'}</div><div class="m">${esc}</div><a href="/">Abrir o Feirinha</a></div></body></html>`
}

export default async function handler(req: { query: Record<string, string | string[] | undefined>; headers?: Record<string, string | string[] | undefined> }, res: { status: (n: number) => { send: (s: string) => void }; setHeader: (k: string, v: string) => void }) {
  const html = String(req.headers?.accept ?? '').includes('text/html')
  res.setHeader('Content-Type', html ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  const send = res
  res = {
    ...send,
    status: (n: number) => ({ send: (s: string) => send.status(n).send(html ? page(n < 400, s) : s) }),
  }
  const q = (k: string) => {
    const v = req.query[k]
    return (Array.isArray(v) ? v[0] : v)?.trim() ?? ''
  }
  const casa = q('c')
  const me = q('quem') || 'Siri'
  if (casa.length < 20) return res.status(400).send('Falta o código da casa no atalho. Copie o link de novo nos Ajustes do Feirinha.')
  if (!URL_ || !KEY) return res.status(500).send('O servidor do Feirinha está sem configuração.')

  try {
    const voz = q('voz')
    if (voz) {
      const reply = await withCasa(casa, me, () => {
        const r = runCommand(parseCommand(voz))
        return r ? `${r.summary}.` : 'Não entendi nenhum item. Tente de novo falando o nome do produto.'
      })
      return res.status(200).send(reply)
    }
    // texto de um print (o atalho do iPhone usa "Extrair Texto da Imagem")
    const texto = q('texto')
    if (texto && !q('receita')) {
      const reply = await withCasa(casa, me, () => {
        const uses = matchIngredients(texto)
        const name = q('nome') || texto.split('\n').map((l) => l.trim()).find((l) => l.length > 3)?.slice(0, 60) || 'Receita do print'
        const meals = q('refeicao')
          .split(',')
          .map((m) => m.trim())
          .filter((m): m is 'cafe' | 'almoco' | 'jantar' => m === 'cafe' || m === 'almoco' || m === 'jantar')
        saveRecipe({ name, text: texto, uses, meals, url: q('link') || undefined })
        return `Receita salva no Feirinha: ${name}. ${uses.length ? `Usa ${uses.length} ${uses.length === 1 ? 'item' : 'itens'} da despensa.` : 'Não achei ingredientes da despensa nesse texto.'}`
      })
      return res.status(200).send(reply)
    }
    const link = q('receita')
    if (link) {
      const url = link.match(/https?:\/\/\S+/)?.[0] ?? link
      let meta: { title?: string; text?: string } = {}
      try {
        meta = await fetchRecipeMeta(url)
      } catch {
        /* sem legenda: salva só o link */
      }
      const reply = await withCasa(casa, me, () => {
        const uses = meta.text ? matchIngredients(meta.text) : []
        saveRecipe({ name: meta.title || 'Receita salva', url, text: meta.text || undefined, uses, meals: [] })
        return uses.length
          ? `Receita salva no Feirinha: ${meta.title || 'receita'}. Usa ${uses.length} ${uses.length === 1 ? 'item' : 'itens'} da despensa.`
          : `Receita salva no Feirinha${meta.title ? `: ${meta.title}` : ''}. Não consegui ler os ingredientes; dá pra colar a legenda no app.`
      })
      return res.status(200).send(reply)
    }
    return res.status(400).send('Nada pra fazer: falta o texto (voz) ou o link da receita.')
  } catch (e) {
    return res.status(502).send(e instanceof Error && e.message.startsWith('Não achei') ? e.message : 'Não consegui falar com a casa agora. Tente de novo em instantes.')
  }
}
