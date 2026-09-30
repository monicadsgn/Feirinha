import { useState } from 'react'
import { qtyLabel } from '../data/format'
import { stockInfo } from '../data/logic'
import { leftovers, resolveLeftovers, undoable, useDB, type LeftoverChoice } from '../data/store'
import type { Id, ListEntry } from '../data/types'
import { Sheet, toastUndo } from './ui'

const LABEL: Record<LeftoverChoice, string> = { depois: 'Compro já', proximo: 'Mês que vem', naoprecisa: 'Não precisa' }

/**
 * Depois da feira: o que ficou na lista. Pra cada item, "compro depois"
 * (fica na lista), "próximo mês" (sai; a revisão traz de volta se faltar)
 * ou "não precisa" (sai e conta como tem).
 */
export function Sobras({ tripId, onClose }: { tripId: Id; onClose: () => void }) {
  const db = useDB()
  const trip = db.trips[tripId]!
  const entries = leftovers(db).sort((a, b) => db.items[a.itemId]!.name.localeCompare(db.items[b.itemId]!.name))
  // o que é de outro lugar (quitanda…) ou faltou no mercado: comprar depois; o resto, próximo mês
  // verdura e fruta se compra na semana (quitanda); o que faltou, em outro lugar
  const elsewhere = (e: ListEntry) => {
    const it = db.items[e.itemId]!
    return e.reason === 'pendente' || it.shopId !== trip.shopId || it.category === 'hortifruti'
  }
  // já tem em casa (contou ou marcou "tem" depois de montar a lista): não precisa
  const hasIt = (e: ListEntry) => stockInfo(db, db.items[e.itemId]!).status === 'ok'
  const [choice, setChoice] = useState<Record<Id, LeftoverChoice>>(() =>
    Object.fromEntries(entries.map((e) => [e.id, hasIt(e) ? 'naoprecisa' : elsewhere(e) ? 'depois' : 'proximo'])),
  )
  const groups = [
    { title: `Verdura, fruta e o que faltou`, hint: 'Quitanda, mercadinho… Fica na lista pra comprar este mês.', list: entries.filter(elsewhere) },
    { title: `Do ${db.shops[trip.shopId]?.name ?? 'mercado'}, não veio`, hint: 'Ficou pra depois de propósito? Escolha o que fazer com cada um.', list: entries.filter((e) => !elsewhere(e)) },
  ].filter((g) => g.list.length)
  const count = (c: LeftoverChoice) => entries.filter((e) => choice[e.id] === c).length

  const apply = () => {
    const out = count('proximo') + count('naoprecisa')
    toastUndo(
      out ? `${out} ${out === 1 ? 'item saiu' : 'itens saíram'} da lista · ${count('depois')} pra comprar já` : 'Lista organizada ✓',
      undoable(() => resolveLeftovers(tripId, choice)),
    )
    onClose()
  }

  return (
    <Sheet onClose={onClose} full>
      <div className="row between">
        <div>
          <h2>O que ficou na lista</h2>
          <div className="small muted">
            {entries.length} {entries.length === 1 ? 'item' : 'itens'} não vieram na feira
          </div>
        </div>
        <button className="btn sm" onClick={onClose}>
          Depois
        </button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1, paddingTop: 8 }}>
        {groups.map((g) => (
          <div key={g.title} style={{ marginBottom: 14 }}>
            <div className="section-title">
              <span>{g.title}</span>
              <span>{g.list.length}</span>
            </div>
            <p className="small muted" style={{ margin: '-4px 4px 6px' }}>
              {g.hint}
            </p>
            <div className="chips sm" style={{ marginBottom: 6 }}>
              {(['depois', 'proximo', 'naoprecisa'] as LeftoverChoice[]).map((c) => (
                <button key={c} className="chip" onClick={() => setChoice((x) => ({ ...x, ...Object.fromEntries(g.list.map((e) => [e.id, c])) }))}>
                  Todos: {LABEL[c].toLowerCase()}
                </button>
              ))}
            </div>
            <div className="list">
              {g.list.map((e) => {
                const it = db.items[e.itemId]!
                return (
                  <div key={e.id} className="li" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, padding: '10px 14px' }}>
                    <div className="row between">
                      <span className="title ellipsis">{it.name}</span>
                      <span className="small muted num" style={{ whiteSpace: 'nowrap' }}>
                        {qtyLabel(e.qty, it.unit)}
                        {e.reason === 'pendente' ? ' · faltou' : ''}
                        {hasIt(e) ? ' · já tem em casa' : ''}
                      </span>
                    </div>
                    <div className="seg">
                      {(['depois', 'proximo', 'naoprecisa'] as LeftoverChoice[]).map((c) => (
                        <button key={c} className={choice[e.id] === c ? 'on ' + c : ''} onClick={() => setChoice((x) => ({ ...x, [e.id]: c }))}>
                          {LABEL[c]}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="small muted" style={{ margin: '6px 2px' }}>
        <b>Compro já</b>: fica na lista pra quitanda ou mercadinho. <b>Mês que vem</b>: sai da lista agora e a revisão da casa traz de volta se ainda faltar. <b>Não precisa</b>: sai e conta como “tem”.
      </p>
      <button className="btn primary block" onClick={apply}>
        Pronto · {count('depois')} ficam na lista
      </button>
    </Sheet>
  )
}
