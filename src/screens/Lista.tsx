import { useState } from 'react'
import { Sheet, Stepper, toast } from '../components/ui'
import { CATEGORIES, DEFAULT_AISLES } from '../data/catalog'
import { brl } from '../data/format'
import { lastPrice, listEstimate, ticketLeft } from '../data/logic'
import { importText, removeFromList, setListQty, useDB } from '../data/store'
import type { EntryReason, Id, ListEntry } from '../data/types'

const REASON: Partial<Record<EntryReason, [string, string]>> = {
  acabou: ['acabou', 'red'],
  acabando: ['acabando', 'yellow'],
  pendente: ['faltou no mercado', 'yellow'],
  par: ['anda junto', 'green'],
}

export function Lista({ goMarket, openReview, openItem }: { goMarket: () => void; openReview: () => void; openItem: (id: Id) => void }) {
  const db = useDB()
  const [importing, setImporting] = useState(false)
  const entries = Object.values(db.list).filter((e) => !e.deleted && db.items[e.itemId] && !db.items[e.itemId]!.deleted)
  const est = listEstimate(db)
  const left = ticketLeft(db)
  const shops = Object.values(db.shops).filter((s) => !s.deleted)

  const byShop = shops
    .map((shop) => ({ shop, entries: entries.filter((e) => db.items[e.itemId]!.shopId === shop.id) }))
    .concat([{ shop: { id: '_', name: 'Sem lugar definido', emoji: '📍' } as never, entries: entries.filter((e) => !db.shops[db.items[e.itemId]!.shopId] || db.shops[db.items[e.itemId]!.shopId]!.deleted) }])
    .filter((g) => g.entries.length)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="muted small">
            {entries.length} {entries.length === 1 ? 'item' : 'itens'}
          </div>
          <h1>Lista</h1>
        </div>
        <button className="btn sm" onClick={() => setImporting(true)}>
          📋 Colar lista
        </button>
      </div>

      {entries.length > 0 && (
        <div className="card">
          <div className="row between">
            <div>
              <div className="muted small">Estimativa pelos últimos preços</div>
              <div className="stat num">{est.known ? brl(est.total) : '—'}</div>
              {est.unknown > 0 && (
                <div className="small muted">
                  {est.unknown} {est.unknown === 1 ? 'item' : 'itens'} ainda sem preço
                </div>
              )}
            </div>
            {db.settings.ticketMonthly > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div className="muted small">Ticket disponível</div>
                <div style={{ fontWeight: 800 }} className="num">
                  {brl(left)}
                </div>
                {est.total > left && est.known > 0 && <span className="badge red">~{brl(est.total - left)} em dinheiro</span>}
              </div>
            )}
          </div>
          <button className="btn primary block" style={{ marginTop: 12 }} onClick={goMarket}>
            🛒 Ir pro mercado
          </button>
        </div>
      )}

      {byShop.map(({ shop, entries }) => {
        const order = shop.aisles ?? DEFAULT_AISLES
        const cats = order.filter((c) => entries.some((e) => db.items[e.itemId]!.category === c))
        return (
          <div className="section" key={shop.id}>
            <div className="section-title">
              <span>
                {shop.emoji} {shop.name}
              </span>
              <span>{entries.length}</span>
            </div>
            <div className="list">
              {cats.map((c) =>
                entries
                  .filter((e) => db.items[e.itemId]!.category === c)
                  .sort((a, b) => db.items[a.itemId]!.name.localeCompare(db.items[b.itemId]!.name))
                  .map((e, idx) => row(e, idx === 0 ? c : undefined)),
              )}
            </div>
          </div>
        )
      })}

      {entries.length === 0 && (
        <div className="empty">
          <div className="big">📝</div>
          <p>A lista está vazia.</p>
          <button className="btn primary" onClick={openReview}>
            Revisar despensa
          </button>
          <p className="small">Ou toque em “Adicionar”, ou cole uma lista antiga.</p>
        </div>
      )}

      {importing && <ImportSheet onClose={() => setImporting(false)} />}
    </>
  )

  function row(e: ListEntry, firstOfCat?: keyof typeof CATEGORIES) {
    const it = db.items[e.itemId]!
    const r = REASON[e.reason]
    const p = lastPrice(db, it.id, it.shopId)
    return (
      <div key={e.id}>
        {firstOfCat && (
          <div className="small muted" style={{ padding: '10px 14px 2px', fontWeight: 800, background: 'var(--surface)' }}>
            {CATEGORIES[firstOfCat].emoji} {CATEGORIES[firstOfCat].label}
          </div>
        )}
        <div className="li" onClick={() => openItem(e.itemId)} style={{ cursor: 'pointer' }}>
          <div className="grow">
            <div className="title ellipsis">{it.name}</div>
            <div className="row wrap small muted" style={{ gap: 6 }}>
              {r && <span className={'badge ' + r[1]}>{r[0]}</span>}
              {p != null && <span className="num">{brl(p)}/{it.unit}</span>}
              {e.addedBy && e.addedBy !== db.settings.me && <span>por {e.addedBy}</span>}
            </div>
          </div>
          <Stepper value={e.qty} unit={it.unit} onChange={(v) => (v <= 0 ? removeFromList(e.id) : setListQty(e.id, v))} />
          <button
            className="icon-btn"
            aria-label="Tirar da lista"
            onClick={(ev) => {
              ev.stopPropagation()
              removeFromList(e.id)
            }}
          >
            ✕
          </button>
        </div>
      </div>
    )
  }
}

function ImportSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <h2>Colar lista</h2>
        <p className="muted small" style={{ margin: 0 }}>
          Cola do bloco de notas ou do WhatsApp. Uma coisa por linha, com ou sem quantidade (“4 arroz”, “detergente 2”, “1kg tomate”).
        </p>
        <textarea autoFocus rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={'4 arroz\n2 feijão\n1kg tomate'} />
        <button
          className="btn primary block"
          disabled={!text.trim()}
          onClick={() => {
            const r = importText(text)
            toast(`${r.added} itens na lista${r.created ? ` · ${r.created} novos na despensa` : ''}`)
            onClose()
          }}
        >
          Adicionar à lista
        </button>
      </div>
    </Sheet>
  )
}
