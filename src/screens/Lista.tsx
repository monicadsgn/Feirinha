import { useState } from 'react'
import { Sheet, Stepper, toast, toastUndo } from '../components/ui'
import { CATEGORIES, DEFAULT_AISLES } from '../data/catalog'
import { brl, normalize } from '../data/format'
import { lastPrice, listEstimate, ticketLeft } from '../data/logic'
import { importText, removeFromList, setListQty, undoable, useDB } from '../data/store'
import type { EntryReason, Id, ListEntry } from '../data/types'

// "acabou"/"acabando" não aparecem: tudo na lista está acabando, a etiqueta só enchia a tela
const REASON: Partial<Record<EntryReason, [string, string]>> = {
  par: ['anda junto', 'green'],
}

export function Lista({ goMarket, openReview, openItem }: { goMarket: () => void; openReview: () => void; openItem: (id: Id) => void }) {
  const db = useDB()
  const [importing, setImporting] = useState(false)
  const [q, setQ] = useState('')
  const words = normalize(q).split(' ').filter(Boolean)
  const allEntries = Object.values(db.list).filter((e) => !e.deleted && db.items[e.itemId] && !db.items[e.itemId]!.deleted)
  const entries = allEntries.filter((e) => words.every((w) => normalize(db.items[e.itemId]!.name).includes(w)))
  const est = listEstimate(db)
  const left = ticketLeft(db)
  const shops = Object.values(db.shops).filter((s) => !s.deleted)

  // o que faltou no mercado vem primeiro, separado (é o que o aviso manda ver)
  const missed = entries.filter((e) => e.reason === 'pendente')
  const rest = entries.filter((e) => e.reason !== 'pendente')
  const byShop = shops
    .map((shop) => ({ shop, entries: rest.filter((e) => db.items[e.itemId]!.shopId === shop.id) }))
    .concat([{ shop: { id: '_', name: 'Sem lugar definido', emoji: '📍' } as never, entries: rest.filter((e) => !db.shops[db.items[e.itemId]!.shopId] || db.shops[db.items[e.itemId]!.shopId]!.deleted) }])
    .filter((g) => g.entries.length)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="muted small">
            {allEntries.length} {allEntries.length === 1 ? 'item' : 'itens'}
          </div>
          <h1>Lista</h1>
        </div>
        <button className="btn sm" onClick={() => setImporting(true)}>
          📋 Colar lista
        </button>
      </div>

      {allEntries.length > 5 && (
        <input className="search-input" type="search" placeholder="🔍 Procurar na lista…" value={q} onChange={(e) => setQ(e.target.value)} />
      )}

      {missed.length > 0 && (
        <div className="section" style={{ marginTop: 8, marginBottom: 16 }}>
          <div className="section-title" style={{ color: 'var(--warn)' }}>
            <span>📌 Faltou no mercado</span>
            <span>{missed.length}</span>
          </div>
          <p className="small muted" style={{ margin: '-4px 4px 8px' }}>
            Não tinha na última compra. Dá pra pegar em outro lugar ou tirar da lista.
          </p>
          <div className="list" style={{ boxShadow: '0 0 0 2px var(--warn-soft), var(--shadow)' }}>
            {missed.sort((a, b) => db.items[a.itemId]!.name.localeCompare(db.items[b.itemId]!.name)).map((e) => row(e))}
          </div>
        </div>
      )}

      {allEntries.length > 0 && !words.length && (
        <div className="card">
          {est.known > 0 ? (
            <div className="row between">
              <div>
                <div className="muted small">Estimativa pelos últimos preços</div>
                <div className="stat num">{brl(est.total)}</div>
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
                  {est.total > left && <span className="badge red">~{brl(est.total - left)} em dinheiro</span>}
                </div>
              )}
            </div>
          ) : (
            <div className="small muted">A estimativa de gasto aparece depois da primeira compra, quando o app já souber os preços.</div>
          )}
          <button className="btn primary block" style={{ marginTop: 10 }} onClick={goMarket}>
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

      {words.length > 0 && entries.length === 0 && <div className="empty small">Nada com “{q}” na lista. Toque em “Adicionar” pra pôr.</div>}

      {allEntries.length === 0 && (
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
        <div className="li pantry" onClick={() => openItem(e.itemId)}>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="title two-lines">{it.name}</div>
            {(r || p != null || it.note || (e.addedBy && e.addedBy !== db.settings.me)) && (
              <div className="row small muted" style={{ gap: 6, marginTop: 2 }}>
                {r && <span className={'badge ' + r[1]}>{r[0]}</span>}
                {p != null && <span className="num">{brl(p)}/{it.unit}</span>}
                {e.addedBy && e.addedBy !== db.settings.me && <span style={{ whiteSpace: 'nowrap' }}>por {e.addedBy}</span>}
                {it.note && <span className="ellipsis">{it.note}</span>}
              </div>
            )}
          </div>
          <Stepper value={e.qty} unit={it.unit} onChange={(v) => (v <= 0 ? removeFromList(e.id) : setListQty(e.id, v))} />
          <button
            className="x-btn"
            aria-label="Tirar da lista"
            onClick={(ev) => {
              ev.stopPropagation()
              toastUndo(`${it.name} saiu da lista`, undoable(() => removeFromList(e.id)))
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
