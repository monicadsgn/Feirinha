import { useMemo } from 'react'
import { Sheet, Stepper, clearDraft, toast, useDraft } from '../components/ui'
import { PLACES, PLACE_ORDER } from '../data/catalog'
import { qtyLabel } from '../data/format'
import { listItemIds, stockInfo, suggestBuyQty } from '../data/logic'
import { applyReview, useDB, type ReviewAnswer } from '../data/store'
import type { Id } from '../data/types'

type Answers = Record<Id, { answer: ReviewAnswer; buy: number }>

/**
 * Revisão da despensa: o mesmo caminho que você faz olhando armário e geladeira,
 * só que o app já chega com palpites (o que deve ter acabado vem marcado).
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
      else if (s.status === 'ok') a[i.id] = { answer: 'ok', buy: 0 }
    }
    return a
  })

  const place = places[Math.min(step, places.length - 1)]
  const group = items.filter((i) => i.place === place).sort((a, b) => a.name.localeCompare(b.name))
  const toBuy = Object.values(answers).filter((a) => a.answer !== 'ok' && a.buy > 0).length

  const set = (id: Id, answer: ReviewAnswer) => {
    const it = db.items[id]!
    setAnswers((a) => ({
      ...a,
      [id]: { answer, buy: answer === 'ok' ? 0 : answer === 'acabou' ? it.defaultQty : a[id]?.answer === 'pouco' ? a[id]!.buy : Math.max(suggestBuyQty(db, it), 0.1) },
    }))
  }

  const finish = () => {
    // quem passou pela revisão viu tudo: o que não foi marcado conta como "tem"
    const all = { ...answers }
    for (const i of items) if (!all[i.id]) all[i.id] = { answer: 'ok', buy: 0 }
    applyReview(all)
    clearDraft('revisao:')
    toast(`Lista montada com ${toBuy} ${toBuy === 1 ? 'item' : 'itens'} 🧺`)
    onDone()
  }

  if (!places.length)
    return (
      <Sheet onClose={onClose}>
        <div className="empty">Adicione itens na despensa primeiro.</div>
      </Sheet>
    )

  return (
    <Sheet onClose={onClose} full>
      <div className="row between">
        <div>
          <div className="muted small">
            Revisão · {step + 1} de {places.length}
          </div>
          <h2>
            {PLACES[place!].emoji} {PLACES[place!].label}
          </h2>
        </div>
        <span className="badge green">{toBuy} pra comprar</span>
      </div>
      <div className="meter" style={{ margin: '10px 0 12px' }}>
        <i style={{ width: `${((step + 1) / places.length) * 100}%` }} />
      </div>
      <p className="muted small" style={{ margin: '0 0 10px' }}>
        Não precisa contar. Pra cada item: <b>dá até a próxima feira?</b> Se for pouco ou acabou, ajuste quanto comprar (pode deixar 0).
        O que o app acha que acabou já vem marcado.
      </p>

      <div className="stack" style={{ overflowY: 'auto', flex: 1, gap: 8, paddingBottom: 8 }}>
        {group.map((it) => {
          const a = answers[it.id]
          const s = stockInfo(db, it)
          return (
            <div key={it.id} className="card" style={{ padding: 12 }}>
              <div className="row between">
                <div className="grow">
                  <div style={{ fontWeight: 700 }} className="ellipsis">
                    {it.name}
                  </div>
                  {it.note && <div className="small muted">{it.note}</div>}
                  <div className="small muted">
                    {inList.has(it.id) ? 'já está na lista · ' : ''}
                    {it.everyMonths && it.everyMonths > 1 ? `compra a cada ${it.everyMonths} meses · ` : ''}
                    {s.est != null ? `app estima ~${qtyLabel(+s.est.toFixed(1), it.unit)}` : `costuma levar ${qtyLabel(it.defaultQty, it.unit)}`}
                  </div>
                </div>
              </div>
              <div className="row" style={{ marginTop: 10, gap: 6 }}>
                {(
                  [
                    ['ok', 'Dá'],
                    ['pouco', 'Pouco'],
                    ['acabou', 'Acabou'],
                  ] as [ReviewAnswer, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    className="btn sm grow"
                    style={
                      a?.answer === k
                        ? {
                            background: k === 'ok' ? 'var(--primary)' : k === 'pouco' ? 'var(--warn)' : 'var(--accent)',
                            color: k === 'ok' ? 'var(--primary-ink)' : '#fff',
                          }
                        : undefined
                    }
                    onClick={() => set(it.id, k)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {a && a.answer !== 'ok' && (
                <div className="row between" style={{ marginTop: 10 }}>
                  <span className="small" style={{ fontWeight: 800 }}>
                    Comprar
                  </span>
                  <Stepper value={a.buy} unit={it.unit} onChange={(v) => setAnswers((x) => ({ ...x, [it.id]: { ...a, buy: v } }))} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="row" style={{ paddingTop: 10 }}>
        <button className="btn" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>
          {step === 0 ? 'Sair' : 'Voltar'}
        </button>
        {step < places.length - 1 ? (
          <button className="btn primary grow" onClick={() => setStep(step + 1)}>
            Próximo: {PLACES[places[step + 1]!].label}
          </button>
        ) : (
          <button className="btn primary grow" onClick={finish}>
            Montar lista ({toBuy})
          </button>
        )}
      </div>
    </Sheet>
  )
}
