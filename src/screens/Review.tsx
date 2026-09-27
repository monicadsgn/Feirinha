import { useMemo } from 'react'
import { Sheet, Stepper, clearDraft, toast, useDraft } from '../components/ui'
import { PLACES, PLACE_ORDER } from '../data/catalog'
import { qtyLabel } from '../data/format'
import { listItemIds, stockInfo, suggestBuyQty } from '../data/logic'
import { applyReview, useDB, type ReviewAnswer } from '../data/store'
import type { Id, Item } from '../data/types'

type Answers = Record<Id, { answer: ReviewAnswer; buy: number }>

const NEXT: Record<ReviewAnswer, ReviewAnswer> = { ok: 'pouco', pouco: 'acabou', acabou: 'ok' }
const LABEL: Record<ReviewAnswer, string> = { ok: 'Tem', pouco: 'Pouco', acabou: 'Não tem' }

/**
 * "Ver o que tem em casa": passa cômodo por cômodo. Tudo começa como "Tem";
 * você só toca no que está acabando (1 toque = Pouco, 2 = Não tem). O que
 * o app acha que acabou já vem marcado. No fim, a lista da feira sai pronta.
 */
export function Review({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const db = useDB()
  const inList = listItemIds(db)
  const items = useMemo(() => Object.values(db.items).filter((i) => !i.deleted), [db.items])
  const places = PLACE_ORDER.filter((p) => items.some((i) => i.place === p))
  const [step, setStep] = useDraft('revisao:passo', 0)

  const [answers, setAnswers] = useDraft<Answers>('revisao:respostas', () => {
    const a: Answers = {}
    for (const i of items) {
      const s = stockInfo(db, i)
      if (s.status === 'acabou') a[i.id] = { answer: 'acabou', buy: i.defaultQty }
      else if (s.status === 'acabando' || s.shortBeforeFeira) a[i.id] = { answer: 'pouco', buy: suggestBuyQty(db, i) }
    }
    return a
  })

  const cur = Math.min(step, places.length - 1)
  const place = places[cur]
  const group = items.filter((i) => i.place === place).sort((a, b) => a.name.localeCompare(b.name))
  const answerOf = (id: Id): ReviewAnswer => answers[id]?.answer ?? 'ok'
  const buyingIn = (list: Item[]) => list.filter((i) => answerOf(i.id) !== 'ok' && (answers[i.id]?.buy ?? 0) > 0).length
  const toBuy = buyingIn(items)

  const cycle = (it: Item) => {
    const next = NEXT[answerOf(it.id)]
    setAnswers((a) => ({
      ...a,
      [it.id]: { answer: next, buy: next === 'ok' ? 0 : next === 'acabou' ? Math.max(a[it.id]?.buy ?? 0, it.defaultQty) : Math.max(suggestBuyQty(db, it), 0.1) },
    }))
  }

  const finish = () => {
    // quem passou pela revisão viu tudo: o que não foi tocado conta como "tem"
    const all = { ...answers }
    for (const i of items) if (!all[i.id]) all[i.id] = { answer: 'ok', buy: 0 }
    applyReview(all)
    clearDraft('revisao:')
    toast(`Lista da feira pronta: ${toBuy} ${toBuy === 1 ? 'item' : 'itens'} 🧺`)
    onDone()
  }

  if (!places.length)
    return (
      <Sheet onClose={onClose}>
        <div className="empty">Adicione itens na despensa primeiro.</div>
      </Sheet>
    )

  const here = buyingIn(group)

  return (
    <Sheet onClose={onClose} full>
      <div className="row between">
        <div>
          <div className="muted small">
            Ver o que tem em casa · {cur + 1} de {places.length}
          </div>
          <h2>
            {PLACES[place!].emoji} {PLACES[place!].label}
          </h2>
        </div>
        <span className="badge green">{toBuy} pra comprar</span>
      </div>

      {/* cômodos: dá pra pular pra qualquer um */}
      <div className="chips" style={{ margin: '10px 0 6px' }}>
        {places.map((p, i) => {
          const n = buyingIn(items.filter((it) => it.place === p))
          return (
            <button key={p} className={'chip' + (i === cur ? ' on' : '')} style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => setStep(i)}>
              {PLACES[p].emoji} {PLACES[p].label}
              {n > 0 && <span className="badge" style={{ padding: '0 6px' }}>{n}</span>}
            </button>
          )
        })}
      </div>

      <p className="muted small" style={{ margin: '0 0 8px' }}>
        Tudo começa como <b>Tem</b>. Toque só no que está acabando: 1 toque = Pouco, 2 = Não tem.
      </p>

      <div className="list" style={{ overflowY: 'auto', flex: 1 }}>
        {group.map((it) => {
          const ans = answerOf(it.id)
          const a = answers[it.id]
          const s = stockInfo(db, it)
          return (
            <div key={it.id} className="li" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: '10px 14px', minHeight: 0 }}>
              <div className="row" style={{ gap: 10 }}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="title ellipsis">{it.name}</div>
                  <div className="small muted ellipsis">
                    {inList.has(it.id) ? 'já na lista · ' : ''}
                    {it.everyMonths && it.everyMonths > 1 ? `a cada ${it.everyMonths} meses · ` : ''}
                    {s.est != null ? `app estima ~${qtyLabel(+s.est.toFixed(1), it.unit)}` : (it.note ?? `costuma levar ${qtyLabel(it.defaultQty, it.unit)}`)}
                  </div>
                </div>
                <button className={'status-pill ' + ans} onClick={() => cycle(it)} aria-label={`${it.name}: ${LABEL[ans]}. Toque pra mudar.`}>
                  {LABEL[ans]}
                </button>
              </div>
              {ans !== 'ok' && a && (
                <div className="row between">
                  <span className="small" style={{ fontWeight: 700 }}>
                    Comprar
                  </span>
                  <Stepper value={a.buy} unit={it.unit} onChange={(v) => setAnswers((x) => ({ ...x, [it.id]: { ...a, buy: v } }))} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="small muted center" style={{ padding: '8px 0 2px' }}>
        {PLACES[place!].label}: {here ? `${here} pra comprar` : 'nada pra comprar'}
      </div>
      <div className="row" style={{ paddingTop: 6 }}>
        <button className="btn" onClick={() => (cur === 0 ? onClose() : setStep(cur - 1))}>
          {cur === 0 ? 'Sair' : 'Voltar'}
        </button>
        {cur < places.length - 1 ? (
          <button className="btn primary grow" onClick={() => setStep(cur + 1)}>
            Próximo: {PLACES[places[cur + 1]!].label}
          </button>
        ) : (
          <button className="btn primary grow" onClick={finish}>
            Montar lista da feira ({toBuy})
          </button>
        )}
      </div>
    </Sheet>
  )
}
