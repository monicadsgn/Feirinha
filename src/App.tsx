import { useEffect, useState } from 'react'
import { ItemEditor } from './components/ItemEditor'
import { NotaSheet } from './components/NotaSheet'
import { QuickAdd, type QuickMode } from './components/QuickAdd'
import { ConfirmHost, Toasts, confirmAction, toast, toastUndo } from './components/ui'
import { parseCommand, runCommand } from './data/voice'
import { applyUpdate, useUpdateReady } from './pwa'
import { activeTrip, getDB, redoOnboarding, updateSettings, useDB } from './data/store'
import { listItemIds } from './data/logic'
import { joinCasa, syncAvailable } from './data/sync'
import type { Id } from './data/types'
import { Ajustes } from './screens/Ajustes'
import { Casa } from './screens/Casa'
import { Lista } from './screens/Lista'
import { Mercado } from './screens/Mercado'
import { Onboarding } from './screens/Onboarding'
import { Receitas } from './screens/Receitas'
import { Resumo } from './screens/Resumo'
import { Review } from './screens/Review'

type Tab = 'casa' | 'lista' | 'mercado' | 'receitas' | 'resumo'

const TABS: { id: Tab; label: string; ico: string }[] = [
  { id: 'casa', label: 'Despensa', ico: '🏠' },
  { id: 'lista', label: 'Lista', ico: '📝' },
  { id: 'mercado', label: 'Mercado', ico: '🛒' },
  { id: 'receitas', label: 'Receitas', ico: '🍳' },
  { id: 'resumo', label: 'Resumo', ico: '📊' },
]

export function App() {
  const db = useDB()
  const [tab, setTab] = useState<Tab>(() => (activeTrip(getDB()) ? 'mercado' : 'casa'))
  const [quick, setQuick] = useState<QuickMode | null>(null)
  const [item, setItem] = useState<Id | null>(null)
  const [review, setReview] = useState(false)
  const [settings, setSettings] = useState(false)
  const [nota, setNota] = useState(false)
  const updateReady = useUpdateReady()
  const [share, setShare] = useState<{ title?: string; text?: string; url?: string } | null>(null)
  const [joining, setJoining] = useState(() => syncAvailable && new URLSearchParams(location.search).has('casa'))

  // Atalhos por link: ?acao=acabou | ?acao=adicionar | ?tela=mercado | ?add=detergente
  useEffect(() => {
    const p = new URLSearchParams(location.search)
    if (!p.toString()) return
    const acao = p.get('acao')
    const tela = p.get('tela') as Tab | null
    const add = p.get('add')
    const casa = p.get('casa')
    // "Compartilhar → Feirinha" (Android): chega título, texto e link do post
    if (p.has('text') || p.has('url') || p.has('title')) {
      setShare({ title: p.get('title') ?? undefined, text: p.get('text') ?? undefined, url: p.get('url') ?? undefined })
      setTab('receitas')
    }
    if (casa && syncAvailable) {
      joinCasa(casa)
        .then(() => toast('Pronto! Agora a despensa e a lista são as mesmas nos dois celulares 🧺'))
        .finally(() => setJoining(false))
    }
    if (acao === 'acabou' && !add && !p.get('voz')) setQuick('acabou')
    if (acao === 'adicionar') setQuick('lista')
    if (tela && TABS.some((t) => t.id === tela)) setTab(tela)
    // ?add=detergente ou ?voz=acabou arroz e feijão (atalho da Siri / Google)
    const voz = add ?? p.get('voz')
    if (voz && getDB().settings.onboarded) {
      const cmd = parseCommand(voz)
      if (p.get('acao') === 'acabou') cmd.intent = 'acabou'
      const r = runCommand(cmd)
      if (r) toastUndo(r.summary, r.undo)
      else toast('Não entendi nenhum item nesse comando.')
    }
    if (acao === 'nota') setNota(true)
    if (acao === 'mercado') setTab('mercado')
    history.replaceState(null, '', location.pathname)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  if (joining)
    return (
      <div className="app">
        <div className="empty" style={{ paddingTop: 120 }}>
          <div className="big">🧺</div>
          <p>Entrando na casa…</p>
        </div>
      </div>
    )

  if (!db.settings.onboarded)
    return (
      <div className="app">
        <Onboarding onDone={() => setReview(true)} />
        <Toasts />
        <ConfirmHost />
      </div>
    )

  const listCount = listItemIds(db).size
  const shopping = !!activeTrip(db)

  return (
    <div className="app">
      {updateReady && (
        <button className="update-bar" onClick={applyUpdate}>
          ✨ Tem versão nova do Feirinha · <b>Atualizar</b>
        </button>
      )}
      {tab === 'casa' && (
        <Casa
          openQuick={setQuick}
          openItem={setItem}
          openReview={() => setReview(true)}
          openSettings={() => setSettings(true)}
          openNota={() => setNota(true)}
          go={setTab}
          onReminder={(a) =>
            a === 'review'
              ? setReview(true)
              : a === 'nota'
                ? setNota(true)
                : a === 'acabou'
                ? setQuick('acabou')
                : a === 'refazer'
                  ? confirmAction('Refazer o cadastro? A despensa e a lista atuais são apagadas. Nome, ticket e lugares continuam.', 'Refazer', redoOnboarding)
                  : setTab(a)
          }
        />
      )}
      {tab === 'lista' && <Lista goMarket={() => setTab('mercado')} openReview={() => setReview(true)} openItem={setItem} />}
      {tab === 'mercado' && <Mercado onFinished={() => setTab('resumo')} />}
      {tab === 'receitas' && <Receitas share={share} onShareHandled={() => setShare(null)} />}
      {tab === 'resumo' && <Resumo openItem={setItem} />}

      {tab !== 'mercado' && tab !== 'receitas' && (
        <button className="fab" onClick={() => setQuick('lista')}>
          <span className="plus">＋</span> Adicionar
        </button>
      )}

      <nav className="nav">
        <div className="nav-inner">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              <span className="ico">{t.ico}</span>
              {t.label}
              {t.id === 'lista' && listCount > 0 && <span className="dot">{listCount}</span>}
              {t.id === 'mercado' && shopping && <span className="dot">●</span>}
            </button>
          ))}
        </div>
      </nav>

      {quick && <QuickAdd mode={quick} onClose={() => setQuick(null)} />}
      {item && <ItemEditor itemId={item} onClose={() => setItem(null)} />}
      {review && (
        <Review
          onClose={() => setReview(false)}
          onDone={() => {
            setReview(false)
            setTab('lista')
          }}
        />
      )}
      {settings && <Ajustes onClose={() => setSettings(false)} />}
      {nota && <NotaSheet onClose={() => setNota(false)} onDone={() => setNota(false)} />}
      {!db.settings.me && <WhoAmI people={db.settings.people} />}
      <Toasts />
      <ConfirmHost />
    </div>
  )
}

/** Quem entrou pelo convite ainda não disse o nome neste celular. */
function WhoAmI({ people }: { people: string[] }) {
  const [name, setName] = useState('')
  const pick = (n: string) => {
    const me = n.trim()
    if (!me) return
    updateSettings({ me, people: people.includes(me) ? people : [...people, me] })
  }
  return (
    <div className="backdrop" style={{ zIndex: 70, alignItems: 'center', padding: 16 }}>
      <div className="card stack" style={{ maxWidth: 400, width: '100%' }}>
        <h2>Quem está usando este celular?</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Assim a lista mostra quem adicionou cada item.
        </p>
        <div className="row wrap">
          {people.map((p) => (
            <button key={p} className="btn primary grow" onClick={() => pick(p)}>
              {p}
            </button>
          ))}
        </div>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            pick(name)
          }}
        >
          <input id="whoami" placeholder="Outro nome" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn" type="submit">
            OK
          </button>
        </form>
      </div>
    </div>
  )
}
