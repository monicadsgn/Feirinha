import { useMemo, useState } from 'react'
import { suggestPair, type QuickMode } from '../components/QuickAdd'
import { toast } from '../components/ui'
import { PLACES, PLACE_ORDER } from '../data/catalog'
import { daysLabel, qtyLabel } from '../data/format'
import { daysUntilFeira, listItemIds, stockInfo, type StockInfo } from '../data/logic'
import { addToList, consumeOne, markOut, useDB } from '../data/store'
import type { Id, Item, PlaceId } from '../data/types'

interface Props {
  openQuick: (m: QuickMode) => void
  openItem: (id: Id) => void
  openReview: () => void
  openSettings: () => void
}

export function Casa({ openQuick, openItem, openReview, openSettings }: Props) {
  const db = useDB()
  const [place, setPlace] = useState<PlaceId | 'todos'>('todos')
  const inList = listItemIds(db)
  const days = daysUntilFeira(db.settings.ticketDay)

  const rows = useMemo(
    () =>
      Object.values(db.items)
        .filter((i) => !i.deleted)
        .map((i) => ({ item: i, s: stockInfo(db, i) }))
        .sort((a, b) => a.item.name.localeCompare(b.item.name)),
    [db],
  )

  const running = rows.filter((r) => (r.s.status === 'acabando' || r.s.status === 'acabou') && !inList.has(r.item.id))
  const unknown = rows.filter((r) => r.s.status === 'desconhecido').length
  const listCount = inList.size
  const places = PLACE_ORDER.filter((p) => rows.some((r) => r.item.place === p))
  const shown = rows.filter((r) => place === 'todos' || r.item.place === place)

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

      <button className="search" onClick={() => openQuick('acabou')}>
        <span style={{ fontSize: 20 }}>🫙</span>
        <span className="grow">Acabou alguma coisa?</span>
        <span className="badge red">Acabou / −1</span>
      </button>

      <div className="hero" style={{ marginTop: 14 }}>
        <div className="row between">
          <div>
            <div style={{ opacity: 0.85, fontWeight: 700 }}>Próxima feira {daysLabel(days)}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600 }}>
              {listCount} {listCount === 1 ? 'item' : 'itens'} na lista
            </div>
          </div>
          <span style={{ fontSize: 40 }}>🧺</span>
        </div>
        <button className="btn block" style={{ marginTop: 12 }} onClick={openReview}>
          Revisar despensa
        </button>
        {unknown > 0 && (
          <div className="small" style={{ marginTop: 8, opacity: 0.85 }}>
            {unknown} {unknown === 1 ? 'item ainda não tem' : 'itens ainda não têm'} estoque informado. A revisão resolve isso em poucos
            toques.
          </div>
        )}
      </div>

      {running.length > 0 && (
        <div className="section">
          <div className="section-title">
            <span>Provavelmente acabando</span>
            <button
              className="btn sm ghost"
              onClick={() => {
                running.forEach((r) => addToList(r.item.id, undefined, r.s.status === 'acabou' ? 'acabou' : 'acabando'))
                toast(`${running.length} itens foram pra lista`)
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
                  addToList(item.id, undefined, s.status === 'acabou' ? 'acabou' : 'acabando')
                  toast(`${item.name} foi pra lista`)
                  suggestPair(item.id)
                }}
              >
                <span className={'badge ' + (s.status === 'acabou' ? 'red' : 'yellow')}>{s.status === 'acabou' ? (s.confirmedOut ? 'acabou' : 'acabou?') : `~${Math.max(1, Math.round(s.daysLeft ?? 0))}d`}</span>
                {item.name} ＋
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <div className="chips">
          <button className={'chip' + (place === 'todos' ? ' on' : '')} onClick={() => setPlace('todos')}>
            Tudo
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
  const pct = s.est == null ? 0 : Math.min(100, (s.est / Math.max(item.defaultQty, 0.01)) * 100)
  const tone = s.status === 'acabou' ? 'red' : s.status === 'acabando' ? 'warn' : ''
  return (
    <div className="li" onClick={onOpen} style={{ cursor: 'pointer' }}>
      <div className="grow">
        <div className="row" style={{ gap: 6 }}>
          <span className="title ellipsis">{item.name}</span>
          {inList && <span className="badge green">na lista</span>}
        </div>
        <div className="small muted">
          {s.est == null
            ? 'estoque não informado'
            : s.status === 'acabou'
              ? s.confirmedOut
                ? 'acabou'
                : 'pela estimativa, já deve ter acabado'
              : `~${qtyLabel(+s.est.toFixed(1), item.unit)}${s.daysLeft != null && isFinite(s.daysLeft) ? ` · uns ${Math.round(s.daysLeft)} dias` : ''}`}
        </div>
        {s.est != null && (
          <div className={'meter ' + tone}>
            <i style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <button
        className="btn sm"
        onClick={(e) => {
          e.stopPropagation()
          consumeOne(item.id)
        }}
        aria-label={`Usei 1 ${item.name}`}
      >
        −1
      </button>
      <button
        className="btn sm accent"
        onClick={(e) => {
          e.stopPropagation()
          markOut(item.id)
          toast(`${item.name} acabou e foi pra lista`)
          suggestPair(item.id)
        }}
      >
        Acabou
      </button>
    </div>
  )
}
