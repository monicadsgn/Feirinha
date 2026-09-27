import { useState } from 'react'
import { Compare } from '../components/Compare'
import { NotaSheet } from '../components/NotaSheet'
import { PriceSheet } from '../components/PriceSheet'
import { QuickAdd } from '../components/QuickAdd'
import { SwipeRow } from '../components/SwipeRow'
import { Sheet, confirmAction, toast } from '../components/ui'
import { CATEGORIES } from '../data/catalog'
import { brl, qtyLabel } from '../data/format'
import { forgotten, lastPrice, listItemIds, ticketLeft, tripTotal } from '../data/logic'
import { activeTrip, addToList, cancelTrip, finishTrip, removeLine, setLine, startTrip, upsertShop, useDB } from '../data/store'
import type { CategoryId, DB, Id, Item, Trip, TripKind, TripLine } from '../data/types'

export function Mercado({ onFinished }: { onFinished: () => void }) {
  const db = useDB()
  const trip = activeTrip(db)
  return trip ? <Active db={db} trip={trip} onFinished={onFinished} /> : <Start db={db} />
}

// ---------- Antes de começar ----------

function Start({ db }: { db: DB }) {
  const shops = Object.values(db.shops).filter((s) => !s.deleted)
  const entries = Object.values(db.list).filter((e) => !e.deleted && db.items[e.itemId] && !db.items[e.itemId]!.deleted)
  const [shopId, setShopId] = useState(shops[0]?.id ?? '')
  const [kind, setKind] = useState<TripKind>('feira')
  const [compare, setCompare] = useState(false)
  const [nota, setNota] = useState(false)
  const miss = kind === 'feira' ? forgotten(db) : []
  const left = ticketLeft(db)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="muted small">Lista + calculadora juntas</div>
          <h1>Modo Mercado</h1>
        </div>
        <button className="btn sm" onClick={() => setCompare(true)}>
          ⚖️ Comparar
        </button>
      </div>
      {compare && <Compare onClose={() => setCompare(false)} />}
      {nota && <NotaSheet onClose={() => setNota(false)} onDone={() => setNota(false)} />}

      <div className="card stack">
        <div className="field">
          <span>Onde vocês estão?</span>
          <div className="row wrap" style={{ gap: 8 }}>
            {shops.map((s) => {
              const n = entries.filter((e) => db.items[e.itemId]!.shopId === s.id).length
              return (
                <button key={s.id} className={'chip' + (shopId === s.id ? ' on' : '')} onClick={() => setShopId(s.id)}>
                  {s.emoji} {s.name} {n > 0 && <span className="badge">{n}</span>}
                </button>
              )
            })}
          </div>
        </div>
        <div className="field">
          <span>Que tipo de ida?</span>
          <div className="row" style={{ gap: 8 }}>
            <button className={'chip grow' + (kind === 'feira' ? ' on' : '')} style={{ justifyContent: 'center' }} onClick={() => setKind('feira')}>
              🧺 Feira do mês
            </button>
            <button className={'chip grow' + (kind === 'reposicao' ? ' on' : '')} style={{ justifyContent: 'center' }} onClick={() => setKind('reposicao')}>
              🏃 Reposição
            </button>
          </div>
        </div>
        {db.settings.ticketMonthly > 0 && (
          <div className="row between small">
            <span className="muted">Ticket disponível</span>
            <b className="num">{brl(left)}</b>
          </div>
        )}
        <button className="btn primary block" disabled={!shopId} onClick={() => startTrip(shopId, kind)}>
          Começar compra
        </button>
        <button className="btn ghost sm" onClick={() => setNota(true)}>
          🧾 Já comprou? Ler a nota fiscal
        </button>
      </div>

      {miss.length > 0 && (
        <div className="section">
          <div className="section-title">
            <span>Não esqueceu nada?</span>
            <button
              className="btn sm ghost"
              onClick={() => {
                miss.forEach((i) => addToList(i.id, undefined, 'acabando'))
                toast(`${miss.length} itens foram pra lista`)
              }}
            >
              Todos
            </button>
          </div>
          <div className="list">
            {miss.slice(0, 12).map((i) => (
              <div className="li" key={i.id}>
                <div className="grow">
                  <div className="title">{i.name}</div>
                  <div className="small muted">vocês costumam levar {qtyLabel(i.defaultQty, i.unit)}</div>
                </div>
                <button className="btn sm primary" onClick={() => addToList(i.id)}>
                  + Lista
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ---------- Comprando ----------

function Active({ db, trip, onFinished }: { db: DB; trip: Trip; onFinished: () => void }) {
  const shop = db.shops[trip.shopId]
  const [editing, setEditing] = useState<Id | null>(null)
  const [extra, setExtra] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [aisles, setAisles] = useState(false)
  const [showOthers, setShowOthers] = useState(false)
  const [compare, setCompare] = useState<string | null>(null)
  const [nota, setNota] = useState(false)

  const lines = new Map(trip.lines.map((l) => [l.itemId, l]))
  const inList = listItemIds(db)
  const listed = [...inList].map((id) => db.items[id]).filter((i): i is Item => !!i && !i.deleted)
  const here = listed.filter((i) => i.shopId === trip.shopId)
  const others = listed.filter((i) => i.shopId !== trip.shopId)
  const extras = trip.lines.filter((l) => !inList.has(l.itemId)).map((l) => db.items[l.itemId]).filter((i): i is Item => !!i)

  const t = tripTotal(trip)
  const ticket = db.settings.ticketMonthly > 0 ? ticketLeft(db) : null
  const over = ticket != null ? Math.max(0, t.total - ticket) : 0
  const done = here.filter((i) => lines.has(i.id)).length

  const order = shop?.aisles ?? []
  const byAisle = (items: Item[]) => {
    const cats = [...order, ...(Object.keys(CATEGORIES) as CategoryId[]).filter((c) => !order.includes(c))]
    return cats.map((c) => ({ c, items: items.filter((i) => i.category === c) })).filter((g) => g.items.length)
  }

  const qtyFor = (it: Item) => Object.values(db.list).find((e) => e.itemId === it.id && !e.deleted)?.qty ?? it.defaultQty

  const renderRow = (it: Item) => {
    const l = lines.get(it.id)
    const lp = lastPrice(db, it.id, trip.shopId)
    return (
      <SwipeRow
        key={it.id}
        className={l?.status === 'pego' ? 'done' : l?.status === 'faltou' ? 'missing' : ''}
        onTap={() => setEditing(it.id)}
        onRight={() => setLine(trip.id, it.id, { status: 'pego', qty: l?.qty ?? qtyFor(it), unitPrice: l?.unitPrice ?? lp })}
        onLeft={() => setLine(trip.id, it.id, { status: 'faltou' })}
      >
        <span className={'check' + (l?.status === 'pego' ? ' on' : l?.status === 'faltou' ? ' no' : '')}>{l?.status === 'pego' ? '✓' : l?.status === 'faltou' ? '✕' : ''}</span>
        <div className="grow">
          <div className="title ellipsis">{it.name}</div>
          {it.note && !l && <div className="small muted ellipsis">{it.note}</div>}
          <div className="small muted num">
            {qtyLabel(l?.qty ?? qtyFor(it), it.unit)}
            {l?.status === 'faltou' ? ' · não tinha' : !l && lp != null ? ` · últ. ${brl(lp)}` : ''}
            {l?.status === 'pego' && l.unitPrice == null ? ' · sem preço' : ''}
          </div>
        </div>
        {l?.status === 'pego' && l.unitPrice != null && <b className="num">{brl(l.unitPrice * l.qty)}</b>}
      </SwipeRow>
    )
  }

  const editItem = editing ? db.items[editing] : undefined
  const editLine = editing ? lines.get(editing) : undefined

  return (
    <>
      <div className="market-head">
        <div className="row between">
          <div className="small" style={{ fontWeight: 800, opacity: 0.9 }}>
            {shop?.emoji} {shop?.name} · {trip.kind === 'feira' ? 'Feira do mês' : 'Reposição'}
          </div>
          <div className="small num" style={{ fontWeight: 800, opacity: 0.9 }}>
            {done}/{here.length} itens
          </div>
        </div>
        <div className="market-total num">{brl(t.total)}</div>
        {ticket != null && (
          <>
            <div className={'bar' + (over > 0 ? ' over' : '')}>
              <i style={{ width: `${Math.min(100, ticket > 0 ? (t.total / ticket) * 100 : 100)}%` }} />
            </div>
            <div className="row between small" style={{ fontWeight: 700 }}>
              <span>{over > 0 ? `Passou ${brl(over)} → dinheiro` : `Cabe mais ${brl(ticket - t.total)} no ticket`}</span>
              <span className="num">ticket {brl(ticket)}</span>
            </div>
          </>
        )}
        {t.unpriced > 0 && (
          <div className="small" style={{ marginTop: 4, opacity: 0.85 }}>
            {t.unpriced} {t.unpriced === 1 ? 'item pego' : 'itens pegos'} sem preço
          </div>
        )}
      </div>

      <p className="small muted center" style={{ margin: '4px 0 10px' }}>
        Toque pra digitar o preço · arraste → pegou · ← não tinha
      </p>

      {byAisle(here).map(({ c, items }) => (
        <div key={c} style={{ marginBottom: 12 }}>
          <div className="section-title">
            <span>
              {CATEGORIES[c].emoji} {CATEGORIES[c].label}
            </span>
            <span>
              {items.filter((i) => lines.has(i.id)).length}/{items.length}
            </span>
          </div>
          <div className="list">{items.map(renderRow)}</div>
        </div>
      ))}

      {here.length === 0 && <div className="empty">Nada da lista marcado pra esse lugar.</div>}

      {extras.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div className="section-title">
            <span>✨ Extras (fora da lista)</span>
            <span className="num">{brl(t.extras)}</span>
          </div>
          <div className="list">{extras.map(renderRow)}</div>
        </div>
      )}

      {others.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button className="section-title" style={{ width: '100%' }} onClick={() => setShowOthers(!showOthers)}>
            <span>Da lista, mas costuma comprar em outro lugar</span>
            <span>
              {others.length} {showOthers ? '▲' : '▼'}
            </span>
          </button>
          {showOthers && <div className="list">{others.map(renderRow)}</div>}
        </div>
      )}

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn grow" onClick={() => setExtra(true)}>
          ＋ Extra
        </button>
        <button className="btn grow" onClick={() => setCompare('')}>
          ⚖️ Compensa?
        </button>
        <button className="btn grow" onClick={() => setAisles(true)}>
          ↕ Corredores
        </button>
      </div>
      <button className="btn block" style={{ marginTop: 10 }} onClick={() => setNota(true)}>
        🧾 Ler a nota fiscal (preenche os preços)
      </button>
      <button className="btn primary block" style={{ marginTop: 10 }} onClick={() => setFinishing(true)}>
        Finalizar compra
      </button>
      <button
        className="btn ghost block sm"
        style={{ marginTop: 8 }}
        onClick={() => confirmAction('Cancelar essa compra? Nada do que foi marcado será salvo.', 'Cancelar compra', () => cancelTrip(trip.id))}
      >
        Cancelar compra
      </button>

      {editItem && (
        <PriceSheet
          item={editItem}
          line={editLine}
          defaultQty={qtyFor(editItem)}
          lastPrice={lastPrice(db, editItem.id, trip.shopId)}
          onClose={() => setEditing(null)}
          onSave={(qty, price) => {
            setLine(trip.id, editItem.id, { status: 'pego', qty, unitPrice: price })
            setEditing(null)
          }}
          onMissing={() => {
            setLine(trip.id, editItem.id, { status: 'faltou' })
            setEditing(null)
          }}
          onCompare={() => setCompare(editItem.name)}
          onRemove={
            editLine
              ? () => {
                  removeLine(trip.id, editItem.id)
                  setEditing(null)
                }
              : undefined
          }
        />
      )}

      {extra && (
        <QuickAdd
          mode="extra"
          onClose={() => setExtra(false)}
          onPick={(id) => {
            if (!inList.has(id)) setLine(trip.id, id, { status: 'pego', extra: true, qty: 1, unitPrice: null })
            setEditing(id)
          }}
        />
      )}

      {nota && <NotaSheet tripId={trip.id} onClose={() => setNota(false)} onDone={() => setNota(false)} />}
      {compare != null && <Compare title={compare || undefined} onClose={() => setCompare(null)} />}

      {aisles && shop && <AisleSheet db={db} shopId={shop.id} onClose={() => setAisles(false)} />}

      {finishing && (
        <FinishSheet
          trip={trip}
          ticket={ticket}
          untouched={[...here, ...others].filter((i) => !lines.has(i.id)).length}
          onClose={() => setFinishing(false)}
          onConfirm={(paid) => {
            finishTrip(trip.id, paid)
            setFinishing(false)
            toast(`Compra salva: ${brl(t.total)} 🎉`)
            onFinished()
          }}
        />
      )}
    </>
  )
}

function AisleSheet({ db, shopId, onClose }: { db: DB; shopId: Id; onClose: () => void }) {
  const shop = db.shops[shopId]!
  const order = [...shop.aisles, ...(Object.keys(CATEGORIES) as CategoryId[]).filter((c) => !shop.aisles.includes(c))]
  const move = (i: number, d: number) => {
    const next = [...order]
    const j = i + d
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    upsertShop({ id: shopId, aisles: next })
  }
  return (
    <Sheet onClose={onClose}>
      <h2>Ordem dos corredores</h2>
      <p className="muted small">Deixe na ordem que vocês andam no {shop.name}. A lista segue essa ordem.</p>
      <div className="list">
        {order.map((c, i) => (
          <div className="li" key={c} style={{ minHeight: 48 }}>
            <span className="grow">
              {CATEGORIES[c].emoji} {CATEGORIES[c].label}
            </span>
            <button className="icon-btn" onClick={() => move(i, -1)} aria-label="Subir">
              ↑
            </button>
            <button className="icon-btn" onClick={() => move(i, 1)} aria-label="Descer">
              ↓
            </button>
          </div>
        ))}
      </div>
      <button className="btn primary block" style={{ marginTop: 12 }} onClick={onClose}>
        Pronto
      </button>
    </Sheet>
  )
}

function FinishSheet({
  trip,
  ticket,
  untouched,
  onClose,
  onConfirm,
}: {
  trip: Trip
  ticket: number | null
  untouched: number
  onClose: () => void
  onConfirm: (paidTicket: number) => void
}) {
  const t = tripTotal(trip)
  const [paid, setPaid] = useState(ticket != null ? Math.min(t.total, ticket).toFixed(2).replace('.', ',') : '0')
  const paidNum = Math.max(0, parseFloat(paid.replace(/\./g, '').replace(',', '.')) || 0)
  const missing: TripLine[] = trip.lines.filter((l) => l.status === 'faltou')

  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <h2>Finalizar compra</h2>
        <div className="card">
          <div className="muted small">Total</div>
          <div className="stat num">{brl(t.total)}</div>
          <div className="small muted">
            {t.picked} itens{t.extras > 0 ? ` · ${brl(t.extras)} em extras` : ''}
          </div>
        </div>
        {ticket != null && (
          <div className="grid2">
            <label className="field">
              <span>Pago no ticket</span>
              <input inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} />
            </label>
            <div className="field">
              <span>Em dinheiro / cartão</span>
              <div className="stat num" style={{ fontSize: 22, paddingTop: 8 }}>
                {brl(Math.max(0, t.total - paidNum))}
              </div>
            </div>
          </div>
        )}
        {t.unpriced > 0 && (
          <div className="badge yellow" style={{ padding: 10, borderRadius: 12 }}>
            {t.unpriced} {t.unpriced === 1 ? 'item ficou' : 'itens ficaram'} sem preço. Tudo bem, só não entram no total.
          </div>
        )}
        {(missing.length > 0 || untouched > 0) && (
          <p className="small muted" style={{ margin: 0 }}>
            {missing.length > 0 && `${missing.length} que não tinha ${missing.length === 1 ? 'fica' : 'ficam'} na lista como “faltou no mercado”. `}
            {untouched > 0 && `${untouched} não ${untouched === 1 ? 'marcado continua' : 'marcados continuam'} na lista.`}
          </p>
        )}
        <button className="btn primary block" onClick={() => onConfirm(ticket != null ? Math.min(paidNum, t.total) : 0)}>
          Salvar compra
        </button>
      </div>
    </Sheet>
  )
}
