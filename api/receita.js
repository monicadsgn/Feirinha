// Busca título e legenda de um post de receita (Instagram, TikTok, YouTube,
// Pinterest ou site de receitas) pra salvar no banco de receitas da casa.
import { fetchRecipeMeta } from './_receita.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    return res.status(200).json(await fetchRecipeMeta(req.query.url))
  } catch (e) {
    return res.status(422).json({ error: (e && e.message) || 'Não consegui ler esse post. Cole a legenda manualmente.' })
  }
}
