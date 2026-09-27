import { useMemo, useState } from 'react'
import { CATEGORIES, SEED_ITEMS } from '../data/catalog'
import { finishOnboarding, importText } from '../data/store'
import type { CategoryId } from '../data/types'

/** Primeiro acesso: nome, ticket e o que vocês costumam comprar. */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [me, setMe] = useState('')
  const [other, setOther] = useState('')
  const [ticket, setTicket] = useState('')
  const [day, setDay] = useState('5')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [paste, setPaste] = useState('')

  const byCat = useMemo(() => {
    const m = new Map<CategoryId, typeof SEED_ITEMS>()
    for (const s of SEED_ITEMS) m.set(s.category, [...(m.get(s.category) ?? []), s])
    return [...m.entries()]
  }, [])

  const toggle = (k: string) =>
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  const finish = () => {
    finishOnboarding(
      {
        me: me.trim() || 'Eu',
        people: [me.trim() || 'Eu', other.trim()].filter(Boolean),
        ticketMonthly: parseFloat(ticket.replace(/\./g, '').replace(',', '.')) || 0,
        ticketDay: Math.min(28, Math.max(1, parseInt(day) || 5)),
      },
      [...picked],
    )
    if (paste.trim()) importText(paste)
    onDone()
  }

  return (
    <div className="stack" style={{ paddingBottom: 120 }}>
      <div style={{ textAlign: 'center', margin: '24px 0 8px' }}>
        <img src="icon.svg" width={72} height={72} alt="" />
        <h1 style={{ marginTop: 10 }}>Feirinha</h1>
        <p className="muted">A despensa, a lista e a calculadora da feira num lugar só.</p>
      </div>

      {step === 0 && (
        <div className="card stack">
          <label className="field">
            <span>Seu nome</span>
            <input value={me} onChange={(e) => setMe(e.target.value)} placeholder="Ex.: Moni" />
          </label>
          <label className="field">
            <span>Quem mais faz a feira com você?</span>
            <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Ex.: nome do esposo" />
          </label>
          <div className="grid2">
            <label className="field">
              <span>Ticket por mês (R$)</span>
              <input inputMode="decimal" value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="0,00" />
            </label>
            <label className="field">
              <span>Dia que o ticket cai</span>
              <input inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} />
            </label>
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            O ticket vira o limite do mês. No mercado o app mostra quanto ainda cabe nele e quanto vai sair em dinheiro.
          </p>
          <button className="btn primary block" onClick={() => setStep(1)}>
            Continuar
          </button>
        </div>
      )}

      {step === 1 && (
        <>
          <div className="card">
            <h2>O que vocês costumam comprar?</h2>
            <p className="muted small" style={{ marginBottom: 0 }}>
              Toque no que entra na feira de vocês. Quantidade, lugar e mercado dá pra ajustar depois. Isso vira sua despensa, e a lista
              nunca mais começa do zero.
            </p>
          </div>
          {byCat.map(([cat, items]) => (
            <div key={cat}>
              <div className="section-title">
                <span>
                  {CATEGORIES[cat].emoji} {CATEGORIES[cat].label}
                </span>
                <button
                  className="btn sm ghost"
                  onClick={() =>
                    setPicked((p) => {
                      const n = new Set(p)
                      const all = items.every((i) => n.has(i.key))
                      for (const i of items) {
                        if (all) n.delete(i.key)
                        else n.add(i.key)
                      }
                      return n
                    })
                  }
                >
                  {items.every((i) => picked.has(i.key)) ? 'Nenhum' : 'Todos'}
                </button>
              </div>
              <div className="row wrap" style={{ gap: 8 }}>
                {items.map((i) => (
                  <button key={i.key} className={'chip' + (picked.has(i.key) ? ' on' : '')} onClick={() => toggle(i.key)}>
                    {i.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="card stack">
            <h3>Tem a lista da última feira no celular?</h3>
            <p className="muted small" style={{ margin: 0 }}>
              Cola aqui do jeito que está (uma coisa por linha, tipo “4 arroz” ou “detergente 2”). O que não estiver no catálogo é criado
              sozinho e já entra na lista.
            </p>
            <textarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'4 arroz\n2 feijão\n1kg tomate\nsabão em pó'} />
          </div>
          <button className="fab" style={{ left: 16, right: 16, justifyContent: 'center', maxWidth: 528, margin: '0 auto', bottom: 20 }} onClick={finish}>
            Criar despensa · {picked.size} itens
          </button>
        </>
      )}
    </div>
  )
}
