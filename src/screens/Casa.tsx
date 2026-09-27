import { useMemo, useState } from 'react'
import { Arrumar } from '../components/Arrumar'
import { suggestPair, type QuickMode } from '../components/QuickAdd'
import { hasDraft, toastUndo } from '../components/ui'
import { PLACES, PLACE_ORDER } from '../data/catalog'
import { brl, daysLabel, qtyLabel } from '../data/format'
import { daysUntilFeira, journey, listItemIds, listEstimate, stockInfo, type StockInfo } from '../data/logic'
import { dismiss, reminders, type ReminderAction } from '../data/reminders'
import { addToList, markOut, skipNota, undoable, useDB } from '../data/store'
import type { Id, Item, PlaceId } from '../data/types'

type Go = 'lista' | 'mercado'

interface Props {
  openQuick: (m: QuickMode) => void
  openItem: (id: Id) => void
  openReview: () => void
  openSettings: () => void
  openNota: () => void
  go: (tab: Go) => void
  onReminder: (a: ReminderAction) => void
}

type Status = 'ok' | 'pouco' | 'acabou' | 'conferir'

/** O que mostrar pra cada item: a casa entende Tem / Pouco / Acabou, não "2,3 pacotes". */
function statusOf(s: StockInfo): { key: Status; label: string } {
  if (s.status === 'desconhecido') return { key: 'conferir', label: 'a conferir' }
  if (s.status === 'acabou') return { key: 'acabou', label: s.confirmedOut ? 'Acabou' : 'Acabou?' }
  if (s.status === 'acabando') return { key: 'pouco', label: 'Pouco' }
  return { key: 'ok', label: 'Tem' }
}

const STEPS = ['Ver a casa', 'Lista', 'Mercado', 'Nota']

const FILTERS: { key: Status; label: string }[] = [
  { key: 'acabou', label: 'Acabou' },
  { key: 'pouco', label: 'Pouco' },
  { key: 'ok', label: 'Tem' },
  { key: 'conferir', label: 'A conferir' },
]

export function Casa({ openQuick, openItem, openReview, openSettings, openNota, go, onReminder }: Props) {
  const db = useDB()
  const [place, setPlace] = useState<PlaceId | 'todos'>('todos')
  const [filter, setFilter] = useState<Status | 'todos'>('todos')
  const [, setTick] = useState(0)
  const [arrumar, setArrumar] = useState(false)
  const notes = reminders(db).slice(0, 2)
  const inList = listItemIds(db)
  const days = daysUntilFeira(db.settings.ticketDay)
  const j = journey(db)
  const est = listEstimate(db)

  const rows = useMemo(
    () =>
      Object.values(db.items)
        .filter((i) => !i.deleted)
        .map((i) => ({ item: i, s: stockInfo(db, i) }))
        .sort((a, b) => a.item.name.localeCompare(b.item.name)),
    [db],
  )

  const running = rows.filter((r) => (r.s.status === 'acabando' || r.s.status === 'acabou') && !inList.has(r.item.id))
  const toCheck = rows.filter((r) => r.s.status === 'desconhecido').length
  const listCount = inList.size
  const places = PLACE_ORDER.filter((p) => rows.some((r) => r.item.place === p))
  const count = (k: Status) => rows.filter((r) => statusOf(r.s).key === k).length
  const filters = FILTERS.filter((f) => f.key === filter || count(f.key) > 0)
  const shown = rows.filter((r) => (place === 'todos' || r.item.place === place) && (filter === 'todos' || statusOf(r.s).key === filter))

  // o que o cartão principal diz e faz em cada passo
  const hero = {
    1: {
      title: 'Ver o que tem em casa',
      text: `Feira ${daysLabel(days)}. Passe pelos cômodos e marque só o que está acabando: a lista da feira sai pronta.`,
      cta: hasDraft('revisao:passo') ? 'Continuar de onde parei' : 'Começar pela geladeira',
      run: openReview,
    },
    2: {
      title: `Lista pronta: ${listCount} ${listCount === 1 ? 'item' : 'itens'}`,
      text: `${est.known ? `Estimativa de ${brl(est.total)} pelos últimos preços. ` : ''}Dê uma olhada, ajuste e, no mercado, abra o Modo Mercado.`,
      cta: 'Ver a lista',
      run: () => go('lista'),
    },
    3: { title: 'Compra em andamento', text: 'Volte pro Modo Mercado: lista e calculadora juntas.', cta: 'Voltar pro mercado', run: () => go('mercado') },
    4: {
      title: 'Chegou da feira?',
      text: 'Leia o QR code da nota fiscal: o app confere preços, o que esqueceu de marcar e o que não veio.',
      cta: 'Conferir com a nota',
      run: openNota,
    },
  }[j.step]

  const stepAction = [openReview, () => go('lista'), () => go('mercado'), openNota]

  return (
    <>
      <div className="page-head">
        <div>
          <div className="muted small">Oi, {db.settings.me || 'você'} 👋</div>
          <h1>Despensa</h1>
        </div>
        <button className="icon-btn" onClick={openSettings} aria-label="Ajustes">
          ⚙️
        </button>
      </div>

      <div className="hero">
        <div className="journey" role="list" aria-label="Caminho da feira">
          {STEPS.map((label, i) => {
            const n = i + 1
            const cls = n === j.step ? 'now' : j.done[i] ? 'done' : ''
            return (
              <button key={label} className={cls} role="listitem" onClick={stepAction[i]} aria-current={n === j.step ? 'step' : undefined}>
                <span className="n">{j.done[i] && n !== j.step ? '✓' : n}</span>
                {label}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{hero.title}</div>
        <div className="small" style={{ opacity: 0.9, marginTop: 2 }}>
          {hero.text}
        </div>
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <button className="btn sm grow" onClick={hero.run}>
            {hero.cta}
          </button>
          {j.step === 2 && (
            <button className="btn ghost sm" onClick={openReview}>
              Ver a casa de novo
            </button>
          )}
          {j.step === 4 && j.tripId && (
            <button className="btn ghost sm" onClick={() => skipNota(j.tripId!)}>
              Fiquei sem a nota
            </button>
          )}
        </div>
      </div>

      <button className="search" style={{ marginTop: 12, minHeight: 46 }} onClick={() => openQuick('acabou')}>
        <span>🫙</span>
        <span className="grow small">Acabou alguma coisa?</span>
        <span className="small" style={{ color: 'var(--accent)' }}>
          Marcar ›
        </span>
      </button>

      {notes.length > 0 && (
        <div className="stack" style={{ gap: 4, marginTop: 8 }}>
          {notes.map((n) => (
            <div key={n.key} className="row small" style={{ gap: 8, padding: '6px 4px' }}>
              <span>{n.icon}</span>
              <span className="grow" style={{ fontWeight: 600 }}>
                {n.text}
              </span>
              {n.action && (
                <button className="btn sm ghost" style={{ minHeight: 30, padding: '0 6px' }} onClick={() => onReminder(n.action!.run)}>
                  {n.action.label}
                </button>
              )}
              <button
                aria-label="Dispensar"
                className="muted"
                style={{ padding: 4 }}
                onClick={() => {
                  dismiss(n.key)
                  setTick((t) => t + 1)
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {j.step !== 1 && running.length > 0 && (
        <div className="section">
          <div className="section-title">
            <span>Provavelmente acabando</span>
            <button
              className="btn sm ghost"
              onClick={() => {
                const undo = undoable(() => running.forEach((r) => addToList(r.item.id, undefined, r.s.status === 'acabou' ? 'acabou' : 'acabando')))
                toastUndo(`${running.length} itens foram pra lista`, undo)
              }}
            >
              Todos pra lista
            </button>
          </div>
          <div className="chips">
            {running.map(({ item, s }) => (
              <button
                key={item.id}
                className="chip"
                onClick={() => {
                  const undo = undoable(() => addToList(item.id, undefined, s.status === 'acabou' ? 'acabou' : 'acabando'))
                  toastUndo(`${item.name} foi pra lista`, undo)
                  suggestPair(item.id)
                }}
              >
                <span className={'status-tag ' + statusOf(s).key}>{statusOf(s).label}</span>
                {item.name} ＋
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-title">
          <span>O que tem em casa</span>
          <button className="btn sm ghost" style={{ minHeight: 30, padding: '0 6px' }} onClick={() => setArrumar(true)}>
            Arrumar
          </button>
        </div>
        <div className="chips">
          <button className={'chip' + (filter === 'todos' ? ' on' : '')} onClick={() => setFilter('todos')}>
            Tudo <span className="chip-n">{rows.length}</span>
          </button>
          {filters.map((f) => (
            <button key={f.key} className={'chip' + (filter === f.key ? ' on' : '')} onClick={() => setFilter(filter === f.key ? 'todos' : f.key)}>
              <span className={'dot ' + f.key} />
              {f.label} <span className="chip-n">{count(f.key)}</span>
            </button>
          ))}
        </div>
        <div className="chips sm">
          <button className={'chip' + (place === 'todos' ? ' on' : '')} onClick={() => setPlace('todos')}>
            Todos os lugares
          </button>
          {places.map((p) => (
            <button key={p} className={'chip' + (place === p ? ' on' : '')} onClick={() => setPlace(p)}>
              {PLACES[p].emoji} {PLACES[p].label}
            </button>
          ))}
        </div>
      </div>

      {(place === 'todos' ? places : [place]).map((p) => {
        const group = shown.filter((r) => r.item.place === p)
        if (!group.length) return null
        return (
          <div className="section" key={p} style={{ marginTop: 12 }}>
            <div className="section-title">
              <span>
                {PLACES[p].emoji} {PLACES[p].label}
              </span>
            </div>
            <div className="list">
              {group.map(({ item, s }) => (
                <PantryRow key={item.id} item={item} s={s} inList={inList.has(item.id)} onOpen={() => openItem(item.id)} />
              ))}
            </div>
          </div>
        )
      })}

      {rows.length > 0 && shown.length === 0 && <div className="empty small">Nada aqui com esse filtro.</div>}

      {toCheck > 0 && filter !== 'conferir' && (
        <div className="small muted center" style={{ marginTop: 8 }}>
          {toCheck} {toCheck === 1 ? 'item ainda' : 'itens ainda'} a conferir: passe pela casa pra saber o que tem.
        </div>
      )}

      {arrumar && <Arrumar onClose={() => setArrumar(false)} />}

      {rows.length === 0 && (
        <div className="empty">
          <div className="big">🧺</div>
          Sua despensa está vazia. Toque em “Adicionar” pra criar itens.
        </div>
      )}
    </>
  )
}

function PantryRow({ item, s, inList, onOpen }: { item: Item; s: StockInfo; inList: boolean; onOpen: () => void }) {
  const st = statusOf(s)
  const detail =
    s.est == null
      ? (item.note ?? `costuma levar ${qtyLabel(item.defaultQty, item.unit)}`)
      : s.status === 'acabou'
        ? s.confirmedOut
          ? 'marcado como acabou'
          : 'pela conta do app, já deve ter acabado'
        : `~${qtyLabel(+s.est.toFixed(1), item.unit)}${s.daysLeft != null && isFinite(s.daysLeft) ? ` · dura uns ${Math.round(s.daysLeft)} dias` : ''}`
  return (
    <div className="li pantry" onClick={onOpen}>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="title ellipsis">{item.name}</div>
        <div className="row small" style={{ gap: 6, marginTop: 2 }}>
          <span className={'status-tag ' + st.key}>{st.label}</span>
          <span className="muted ellipsis">{detail}</span>
        </div>
      </div>
      {inList ? (
        <span className="in-list">📝 na lista</span>
      ) : (
        <button
          className="row-act"
          onClick={(e) => {
            e.stopPropagation()
            if (st.key === 'acabou') {
              toastUndo(`${item.name} foi pra lista`, undoable(() => addToList(item.id, undefined, 'acabou')))
            } else {
              toastUndo(`${item.name} acabou e foi pra lista`, undoable(() => markOut(item.id)))
            }
            suggestPair(item.id)
          }}
        >
          {st.key === 'acabou' ? '＋ Lista' : 'Acabou'}
        </button>
      )}
    </div>
  )
}
