import { useEffect, useState } from 'react'
import { ItemEditor } from './components/ItemEditor'
import { QuickAdd, suggestPair, type QuickMode } from './components/QuickAdd'
import { ConfirmHost, Toasts, toast } from './components/ui'
import { activeTrip, addItem, addToList, findItemByName, getDB, useDB } from './data/store'
import { listItemIds } from './data/logic'
import type { Id } from './data/types'
import { Ajustes } from './screens/Ajustes'
import { Casa } from './screens/Casa'
import { Lista } from './screens/Lista'
import { Mercado } from './screens/Mercado'
import { Onboarding } from './screens/Onboarding'
import { Resumo } from './screens/Resumo'
import { Review } from './screens/Review'

type Tab = 'casa' | 'lista' | 'mercado' | 'resumo'

const TABS: { id: Tab; label: string; ico: string }[] = [
  { id: 'casa', label: 'Despensa', ico: '🏠' },
  { id: 'lista', label: 'Lista', ico: '📝' },
  { id: 'mercado', label: 'Mercado', ico: '🛒' },
  { id: 'resumo', label: 'Resumo', ico: '📊' },
]

export function App() {
  const db = useDB()
  const [tab, setTab] = useState<Tab>(() => (activeTrip(getDB()) ? 'mercado' : 'casa'))
  const [quick, setQuick] = useState<QuickMode | null>(null)
  const [item, setItem] = useState<Id | null>(null)
  const [review, setReview] = useState(false)
  const [settings, setSettings] = useState(false)

  // Atalhos por link: ?acao=acabou | ?acao=adicionar | ?tela=mercado | ?add=detergente
  useEffect(() => {
    const p = new URLSearchParams(location.search)
    if (!p.toString()) return
    const acao = p.get('acao')
    const tela = p.get('tela') as Tab | null
    const add = p.get('add')
    if (acao === 'acabou') setQuick('acabou')
    if (acao === 'adicionar') setQuick('lista')
    if (tela && TABS.some((t) => t.id === tela)) setTab(tela)
    if (add && getDB().settings.onboarded) {
      const it = findItemByName(getDB(), add) ?? addItem(add.replace(/^./, (c) => c.toUpperCase()))
      addToList(it.id)
      toast(`${it.name} foi pra lista`)
      suggestPair(it.id)
    }
    history.replaceState(null, '', location.pathname)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  if (!db.settings.onboarded)
    return (
      <div className="app">
        <Onboarding onDone={() => setReview(true)} />
        <Toasts />
      </div>
    )

  const listCount = listItemIds(db).size
  const shopping = !!activeTrip(db)

  return (
    <div className="app">
      {tab === 'casa' && (
        <Casa openQuick={setQuick} openItem={setItem} openReview={() => setReview(true)} openSettings={() => setSettings(true)}
          onReminder={(a) => (a === 'review' ? setReview(true) : a === 'acabou' ? setQuick('acabou') : setTab(a))}
        />
      )}
      {tab === 'lista' && <Lista goMarket={() => setTab('mercado')} openReview={() => setReview(true)} openItem={setItem} />}
      {tab === 'mercado' && <Mercado onFinished={() => setTab('resumo')} />}
      {tab === 'resumo' && <Resumo openItem={setItem} />}

      {tab !== 'mercado' && (
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
      <Toasts />
      <ConfirmHost />
    </div>
  )
}
