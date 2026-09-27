// Busca título e legenda de um post de receita (Instagram, TikTok, YouTube,
// Pinterest ou site de receitas) pra salvar no banco de receitas da casa.

const decode = (s) =>
  String(s || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\\n/g, '\n')
    .trim()

const meta = (html, prop) => {
  const r = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i').exec(html) || new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i').exec(html)
  return r ? decode(r[1]) : ''
}

/** Instagram: "123 likes, 4 comments - fulano on March 1, 2025: "legenda..."" → só a legenda. */
function cleanInstagram(desc) {
  const m = /:\s*["“]([\s\S]+)["”]\s*\.?\s*$/.exec(desc)
  return m ? m[1] : desc
}

function blocked(host) {
  return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[|0\.)/.test(host) || /^\d+\.\d+\.\d+\.\d+$/.test(host)
}


/** Busca título e legenda. Lança Error com mensagem amigável se não conseguir. */
export async function fetchRecipeMeta(raw) {
  let url
  try {
    url = new URL(String(raw || ''))
  } catch {
    throw new Error('Link inválido.')
  }
  if (url.protocol !== 'https:' || blocked(url.hostname)) throw new Error('Link inválido.')
  const host = url.hostname.replace(/^www\./, '')
  // TikTok e YouTube têm um endereço oficial que devolve o título/legenda
  if (/tiktok\.com$/.test(host) || /(youtube\.com|youtu\.be)$/.test(host)) {
    const o = /tiktok/.test(host) ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url.href)}` : `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.href)}`
    const r = await fetch(o, { signal: AbortSignal.timeout(10000) })
    if (r.ok) {
      const j = await r.json()
      return { title: decode(j.title).split('\n')[0].slice(0, 80), text: decode(j.title), image: j.thumbnail_url || null, source: host, url: url.href }
    }
  }
  const r = await fetch(url, {
    headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', Accept: 'text/html', 'Accept-Language': 'pt-BR,pt;q=0.9' },
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
  })
  const html = (await r.text()).slice(0, 600000)
  let text = meta(html, 'og:description') || meta(html, 'description')
  let title = meta(html, 'og:title') || decode((/<title[^>]*>([^<]*)<\/title>/i.exec(html) || [])[1])
  if (/instagram\.com$/.test(host)) {
    text = cleanInstagram(text)
    title = text.split('\n')[0].slice(0, 80) || title
  }
  // sites de receita costumam ter os ingredientes em JSON-LD (schema.org/Recipe)
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1])
      const all = [].concat(data['@graph'] || data)
      const recipe = all.find((x) => x && (x['@type'] === 'Recipe' || (Array.isArray(x['@type']) && x['@type'].includes('Recipe'))))
      if (recipe) {
        title = decode(recipe.name) || title
        const ing = [].concat(recipe.recipeIngredient || []).map(decode)
        const steps = [].concat(recipe.recipeInstructions || []).map((s) => decode(typeof s === 'string' ? s : s.text || ''))
        text = [...ing, '', ...steps].join('\n').trim() || text
        break
      }
    } catch {
      /* JSON-LD quebrado: segue com as meta tags */
    }
  }
  if (!title && !text) throw new Error('Não consegui ler esse post. Cole a legenda manualmente.')
  return { title, text, image: meta(html, 'og:image') || null, source: host, url: url.href }
}
