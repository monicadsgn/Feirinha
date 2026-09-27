import { useMemo, useState } from 'react'
import { CATEGORIES } from '../data/catalog'
import { normalize, qtyLabel } from '../data/format'
import { itemStats, listItemIds, pairSuggestions, stockInfo } from '../data/logic'
import { addItem, addToList, getDB, markOut, useDB, consumeOne } from '../data/store'
import type { Id, Item } from '../data/types'
import { Sheet, toast } from './ui'

export type QuickMode = 'acabou' | 'lista' | 'extra'

const TITLES: Record<QuickMode, { title: string; hint: string }> = {
  acabou: { title: 'O que acabou?', hint: 'Toque em “Acabou” e o item já vai pra lista. “−1” só desconta do estoque.' },
  lista: { title: 'Adicionar à lista', hint: 'Toque nos itens para colocar na lista. Pode adicionar vários.' },
  extra: { title: 'Pegou algo fora da lista?', hint: 'Fica marcado como extra no resumo do mês.' },
}

/** Depois de adicionar, oferece o item que costuma andar junto. */
export function suggestPair(itemId: Id) {
  const pair = pairSuggestions(getDB(), itemId)[0]
  if (pair) toast(`Levar ${pair.name} também?`, { label: '+ Lista', run: () => addToList(pair.id, undefined, 'par') })
}

export function QuickAdd({ mode, onClose, onPick }: { mode: QuickMode; onClose: () => void; onPick?: (id: Id) => void }) {
  const db = useDB()
  const [q, setQ] = useState('')
  const [done, setDone] = useState<Record<Id, string>>({})
  const inList = listItemIds(db)

  const items = useMemo(() => Object.values(db.items).filter((i) => !i.deleted), [db.items])

  const results = useMemo(() => {
    const n = normalize(q)
    if (n) {
      return items
        .filter((i) => normalize(i.name).includes(n))
        .sort((a, b) => Number(!normalize(a.name).startsWith(n)) - Number(!normalize(b.name).startsWith(n)) || a.name.localeCompare(b.name))
        .slice(0, 30)
    }
    // sem busca: mais comprados primeiro (e, no "acabou", o que está acabando)
    const score = (i: Item) => {
      const s = stockInfo(db, i)
      const urgency = mode === 'acabou' ? (s.status === 'acabando' ? 100 : s.status === 'acabou' ? -50 : 0) : 0
      return urgency + itemStats(db, i).times * 5 + (inList.has(i.id) ? -200 : 0)
    }
    return [...items].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name)).slice(0, 40)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, items, mode])

  const exact = items.some((i) => normalize(i.name) === normalize(q))

  const pick = (it: Item, action: 'acabou' | 'menos1' | 'lista' | 'extra') => {
    if (action === 'extra') {
      onPick?.(it.id)
      onClose()
      return
    }
    if (action === 'acabou') {
      markOut(it.id)
      setDone((d) => ({ ...d, [it.id]: 'na lista ✓' }))
      suggestPair(it.id)
    } else if (action === 'menos1') {
      consumeOne(it.id)
      const s = stockInfo(getDB(), getDB().items[it.id]!)
      setDone((d) => ({ ...d, [it.id]: s.est != null && s.est > 0 ? `resta ~${qtyLabel(+s.est.toFixed(1), it.unit)}` : 'acabou → na lista ✓' }))
    } else {
      addToList(it.id)
      setDone((d) => ({ ...d, [it.id]: 'na lista ✓' }))
      suggestPair(it.id)
    }
    setQ('')
  }

  const create = () => {
    const it = addItem(q.trim().replace(/^./, (c) => c.toUpperCase()))
    toast(`“${it.name}” criado em ${CATEGORIES[it.category].label}. Dá pra ajustar depois na despensa.`)
    pick(it, mode === 'extra' ? 'extra' : mode === 'acabou' ? 'acabou' : 'lista')
  }

  const t = TITLES[mode]

  return (
    <Sheet onClose={onClose} full>
      <div className="row between" style={{ marginBottom: 6 }}>
        <h2>{t.title}</h2>
        <button className="btn sm primary" onClick={onClose}>
          Pronto
        </button>
      </div>
      <p className="muted small" style={{ margin: '0 0 12px' }}>
        {t.hint}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (results[0] && normalize(results[0].name).startsWith(normalize(q)) && q) pick(results[0], mode === 'acabou' ? 'acabou' : mode === 'extra' ? 'extra' : 'lista')
          else if (q.trim()) create()
        }}
      >
        <input autoFocus placeholder="Buscar ou criar item…" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="done" />
      </form>

      <div className="list" style={{ marginTop: 12, overflowY: 'auto', flex: 1 }}>
        {q.trim() && !exact && (
          <button className="li" style={{ width: '100%', textAlign: 'left' }} onClick={create}>
            <span style={{ fontSize: 20 }}>＋</span>
            <span className="grow">
              <span className="title">Criar “{q.trim()}”</span>
            </span>
          </button>
        )}
        {results.map((it) => {
          const s = stockInfo(db, it)
          return (
            <div className="li" key={it.id}>
              <span style={{ fontSize: 20 }}>{CATEGORIES[it.category].emoji}</span>
              <div className="grow">
                <div className="title ellipsis">{it.name}</div>
                <div className="small muted">
                  {done[it.id] ??
                    (inList.has(it.id)
                      ? 'já está na lista'
                      : s.est != null
                        ? `tem ~${qtyLabel(+s.est.toFixed(1), it.unit)}`
                        : `costuma levar ${qtyLabel(it.defaultQty, it.unit)}`)}
                </div>
              </div>
              {mode === 'acabou' ? (
                <>
                  <button className="btn sm" onClick={() => pick(it, 'menos1')}>
                    −1
                  </button>
                  <button className="btn sm accent" onClick={() => pick(it, 'acabou')}>
                    Acabou
                  </button>
                </>
              ) : mode === 'extra' ? (
                <button className="btn sm primary" onClick={() => pick(it, 'extra')}>
                  Pegar
                </button>
              ) : (
                <button className="btn sm primary" disabled={inList.has(it.id) && !done[it.id]} onClick={() => pick(it, 'lista')}>
                  {done[it.id] ? '✓' : '+ Lista'}
                </button>
              )}
            </div>
          )
        })}
        {!results.length && !q && <div className="empty">Nenhum item ainda. Digite pra criar o primeiro.</div>}
      </div>
    </Sheet>
  )
}
