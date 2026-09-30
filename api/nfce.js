// Busca a página pública da NFC-e (link do QR code da nota) e devolve os itens.
// Roda na Vercel porque o navegador não pode ler o site da Sefaz direto (CORS).

// Só busca em site do governo (.gov.br): evita virar um proxy aberto.
const ALLOWED = /\.gov\.br$/i

const decode = (s) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&([a-z]+);/gi, (m, e) => ({ aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', atilde: 'ã', otilde: 'õ', ccedil: 'ç', ecirc: 'ê', ocirc: 'ô', acirc: 'â', agrave: 'à' })[e.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim()

const num = (s) => {
  const v = parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
  return Number.isFinite(v) ? v : null
}

/** Layout padrão do portal da NFC-e (usado pela maioria dos estados). */
export function parseNota(html) {
  const items = []
  const rowRe = /<tr[^>]*id=["']?Item\s*\+?\s*\d+["']?[^>]*>([\s\S]*?)<\/tr>/gi
  let m
  while ((m = rowRe.exec(html))) {
    const row = m[1]
    const pick = (cls) => {
      const r = new RegExp(`class=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`, 'i').exec(row)
      return r ? decode(r[1]) : ''
    }
    const name = pick('txtTit2?')
    if (!name) continue
    const qty = num(pick('Rqtd').replace(/Qtde\.?:?/i, ''))
    const unit = pick('RUN').replace(/UN:?/i, '').trim()
    const unitPrice = num(pick('RvlUnit').replace(/Vl\.?\s*Unit\.?:?/i, ''))
    const total = num(pick('valor'))
    items.push({ name, qty: qty ?? 1, unit: unit.toUpperCase(), unitPrice: unitPrice ?? (total && qty ? total / qty : null), total: total ?? (unitPrice ?? 0) * (qty ?? 1) })
  }
  const store = decode((/<div[^>]*class=["'][^"']*txtTopo[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(html) || [])[1] || '')
  const totalM = /class=["'][^"']*totalNumb[^"']*txtMax[^"']*["'][^>]*>([\s\S]*?)</i.exec(html)
  const dateM = /Emiss[ãa]o:?\s*(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}))?/i.exec(decode(html))
  // data no horário local da nota ("2026-09-27T10:32"); o celular converte
  let date = null
  if (dateM) {
    const [d, mo, y] = dateM[1].split('/')
    date = `${y}-${mo}-${d}T${dateM[2] || '12:00'}`
  }
  const text = decode(html)
  const discM = /Descontos?\s*R\$:?\s*([\d.,]+)/i.exec(text)
  const paidM = /Valor a pagar\s*R\$:?\s*([\d.,]+)/i.exec(text)
  return {
    store,
    date,
    total: totalM ? num(decode(totalM[1])) : items.reduce((s, i) => s + (i.total || 0), 0),
    discount: discM ? num(discM[1]) : null,
    paid: paidM ? num(paidM[1]) : null,
    items,
  }
}

const get = (url, ms) =>
  fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36', Accept: 'text/html' },
    redirect: 'follow',
    signal: AbortSignal.timeout(ms),
  })

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const raw = String(req.query.url || '')
  let url
  try {
    url = new URL(raw)
  } catch {
    return res.status(400).json({ error: 'Esse link não parece ser de uma nota fiscal.' })
  }
  if (!/^https?:$/.test(url.protocol) || !ALLOWED.test(url.hostname)) {
    return res.status(400).json({ error: 'Esse link não é do site da Sefaz.' })
  }
  try {
    // a Sefaz às vezes demora ou só atende num dos protocolos: tenta de novo pelo outro
    let r
    try {
      r = await get(url, 12000)
    } catch {
      const alt = new URL(url)
      alt.protocol = url.protocol === 'https:' ? 'http:' : 'https:'
      r = await get(alt, 15000)
    }
    const buf = Buffer.from(await r.arrayBuffer())
    const ct = r.headers.get('content-type') || ''
    const html = /iso-8859-1|latin1|windows-1252/i.test(ct) || /charset=["']?iso-8859-1/i.test(buf.toString('latin1', 0, 2000)) ? buf.toString('latin1') : buf.toString('utf8')
    const nota = parseNota(html)
    if (!nota.items.length) {
      const debug = req.query.debug ? { sample: html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').slice(0, 6000) } : {}
      return res.status(422).json({ error: 'A Sefaz abriu, mas não mostrou os itens. Plano B: abra o link da nota no Safari, selecione tudo, copie e cole o texto aqui.', host: url.hostname, status: r.status, ...debug })
    }
    return res.status(200).json(nota)
  } catch (e) {
    return res.status(502).json({ error: 'O site da Sefaz não respondeu agora. Plano B: abra o link da nota no Safari, selecione tudo, copie e cole o texto aqui.', detail: String(e && e.message) })
  }
}
