import { useMemo, useState } from 'react'
import { clearDraft, useDraft } from '../components/ui'
import { CATEGORIES, SEED_ITEMS } from '../data/catalog'
import { qtyLabel } from '../data/format'
import { finishOnboarding, getDB, importText } from '../data/store'
import { joinCasa, leaveCasa, syncAvailable } from '../data/sync'
import type { CategoryId } from '../data/types'

/** Primeiro acesso: nome, ticket e o que vocês costumam comprar. */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useDraft('cadastro:passo', 0)
  // num recadastro, nome e ticket já vêm preenchidos
  const prev = getDB().settings
  const [me, setMe] = useDraft('cadastro:nome', prev.me)
  const [other, setOther] = useDraft('cadastro:outro', prev.people.find((p) => p !== prev.me) ?? '')
  const [ticket, setTicket] = useDraft('cadastro:ticket', prev.ticketMonthly ? prev.ticketMonthly.toFixed(2).replace('.', ',') : '')
  const [day, setDay] = useDraft('cadastro:dia', prev.ticketDay === 0 && prev.onboarded ? 'util' : String(prev.ticketDay || 5))
  const [pickedList, setPickedList] = useDraft<string[]>('cadastro:itens', () => SEED_ITEMS.filter((i) => i.origin === 'lista').map((i) => i.key))
  const picked = useMemo(() => new Set(pickedList), [pickedList])
  const setPicked = (fn: (p: Set<string>) => Set<string>) => setPickedList((a) => [...fn(new Set(a))])
  const [paste, setPaste] = useDraft('cadastro:colar', '')

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
        ticketDay: day === 'util' ? 0 : Math.min(31, Math.max(1, parseInt(day) || 5)),
      },
      [...picked],
    )
    if (paste.trim()) importText(paste)
    clearDraft('cadastro:')
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
              <select value={day === 'util' ? 'util' : 'dia'} onChange={(e) => setDay(e.target.value === 'util' ? 'util' : '5')}>
                <option value="dia">Dia fixo</option>
                <option value="util">Último dia útil</option>
              </select>
              {day !== 'util' && <input inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} aria-label="Dia do mês" />}
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

      {step === 0 && syncAvailable && <JoinCard />}

      {step === 1 && (
        <>
          <div className="card">
            <h2>O que entra na casa de vocês?</h2>
            <p className="muted small" style={{ marginBottom: 0 }}>
              Não é a lista da próxima feira: é o cadastro de tudo que vocês costumam comprar, seja todo mês ou de vez em quando (sal, açúcar…).
              A lista da feira sai depois, na revisão, com o que estiver acabando. Já marquei o que apareceu nas suas listas de maio, julho e
              agosto, com a quantidade média. Desmarque o que vocês não compram mais.
            </p>
          </div>
          {byCat.map(([cat, items]) => {
            const fromLists = items.filter((i) => i.origin === 'lista')
            const extras = items.filter((i) => i.origin !== 'lista')
            return (
              <div key={cat}>
                <div className="section-title">
                  <span>
                    {CATEGORIES[cat].emoji} {CATEGORIES[cat].label}
                  </span>
                </div>
                <div className="row wrap" style={{ gap: 8 }}>
                  {fromLists.map((i) => (
                    <button key={i.key} className={'chip' + (picked.has(i.key) ? ' on' : '')} onClick={() => toggle(i.key)}>
                      {i.name}
                      <span style={{ opacity: 0.75, fontWeight: 500 }}>
                        · {qtyLabel(i.qty, i.unit)}
                        {i.every && i.every > 1 ? ` a cada ${i.every} meses` : ''}
                      </span>
                    </button>
                  ))}
                </div>
                {extras.length > 0 && (
                  <div className="list" style={{ marginTop: 10, boxShadow: 'none', border: '1.5px dashed var(--line)', background: 'transparent' }}>
                    {extras.map((i) => (
                      <button key={i.key} className="li" style={{ width: '100%', textAlign: 'left', minHeight: 52, background: 'transparent' }} onClick={() => toggle(i.key)}>
                        <span className={'check' + (picked.has(i.key) ? ' on' : '')}>{picked.has(i.key) ? '✓' : ''}</span>
                        <span className="grow">
                          <span style={{ fontWeight: 700 }}>{i.name}</span>
                          <span className={'badge ' + (i.origin === 'variar' ? 'green' : 'yellow')} style={{ marginLeft: 6 }}>
                            {i.origin === 'variar' ? 'pra variar' : 'não estava nas listas'}
                          </span>
                          {i.note && <span className="small muted" style={{ display: 'block' }}>{i.note}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          <div className="card stack">
            <h3>Tem mais alguma lista?</h3>
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

/**
 * Já tem casa em outro celular (ou no Safari, antes de instalar): entra com o
 * link de convite, sem refazer o cadastro. No iPhone o app instalado não
 * tem barra de endereço, então o link é colado aqui.
 */
function JoinCard() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const code = (() => {
    const t = text.trim()
    const m = t.match(/[?&]casa=([\w-]+)/)
    if (m) return m[1]!
    return /^[\w-]{20,}$/.test(t) ? t : null
  })()

  if (!open)
    return (
      <button className="btn ghost block" onClick={() => setOpen(true)}>
        Já usamos o Feirinha em outro celular: entrar na casa
      </button>
    )

  return (
    <div className="card stack">
      <h3>Entrar na casa</h3>
      <p className="small muted" style={{ margin: 0 }}>
        Em outro celular (ou no navegador onde você já usa o app), vá em ⚙️ → Compartilhar a casa → Copiar link. Cole aqui:
      </p>
      <input id="join-link" inputMode="url" placeholder="https://…?casa=…" value={text} onChange={(e) => setText(e.target.value)} />
      {error && <div className="small" style={{ color: 'var(--accent)' }}>{error}</div>}
      <button
        className="btn primary block"
        disabled={!code || busy}
        onClick={async () => {
          setBusy(true)
          setError(null)
          await joinCasa(code!)
          setBusy(false)
          if (!getDB().settings.onboarded) {
            leaveCasa()
            setError('Não achei essa casa. Confira se copiou o link inteiro.')
          } else clearDraft('cadastro:')
        }}
      >
        {busy ? 'Entrando…' : 'Entrar'}
      </button>
    </div>
  )
}
