import { useState } from 'react'
import { CATEGORIES, PLACES, PLACE_ORDER, UNITS } from '../data/catalog'
import { brl, dateLabel, qtyLabel } from '../data/format'
import { itemStats, purchasesOf, stockInfo } from '../data/logic'
import { deleteItem, setStock, updateItem, useDB } from '../data/store'
import type { CategoryId, Id, PlaceId, Unit } from '../data/types'
import { Sheet, Stepper, confirmAction } from './ui'

export function ItemEditor({ itemId, onClose }: { itemId: Id; onClose: () => void }) {
  const db = useDB()
  const item = db.items[itemId]
  const [name, setName] = useState(item?.name ?? '')
  const [addingPair, setAddingPair] = useState('')
  if (!item) return null

  const s = stockInfo(db, item)
  const st = itemStats(db, item)
  const history = purchasesOf(db, item.id).filter((p) => p.unitPrice != null).slice(-6).reverse()
  const shops = Object.values(db.shops).filter((x) => !x.deleted)
  const others = Object.values(db.items)
    .filter((i) => !i.deleted && i.id !== item.id && !item.pairs.includes(i.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <div className="row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== item.name && updateItem(item.id, { name: name.trim() })}
            style={{ fontWeight: 800, fontSize: 18 }}
            aria-label="Nome"
          />
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Quanto tem em casa?</h3>
          <div className="row between">
            <div className="muted small">
              {s.est == null
                ? 'Ainda não sei. Informe e o app passa a estimar sozinho.'
                : `Estimativa: ~${qtyLabel(+s.est.toFixed(1), item.unit)}${s.daysLeft != null && isFinite(s.daysLeft) ? ` · dura ~${Math.round(s.daysLeft)} dias` : ''}`}
            </div>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <Stepper value={+(s.est ?? 0).toFixed(1)} unit={item.unit} onChange={(v) => setStock(item.id, v)} />
            {s.est != null && (
              <button className="btn sm ghost" onClick={() => setStock(item.id, null)}>
                Não sei
              </button>
            )}
          </div>
        </div>

        <div className="grid2">
          <label className="field">
            <span>Costumo comprar</span>
            <Stepper value={item.defaultQty} unit={item.unit} min={0.1} onChange={(v) => updateItem(item.id, { defaultQty: v })} />
          </label>
          <label className="field">
            <span>Unidade</span>
            <select value={item.unit} onChange={(e) => updateItem(item.id, { unit: e.target.value as Unit })}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Corredor</span>
            <select value={item.category} onChange={(e) => updateItem(item.id, { category: e.target.value as CategoryId })}>
              {Object.entries(CATEGORIES).map(([k, c]) => (
                <option key={k} value={k}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Fica em casa no(a)</span>
            <select value={item.place} onChange={(e) => updateItem(item.id, { place: e.target.value as PlaceId })}>
              {PLACE_ORDER.map((k) => (
                <option key={k} value={k}>
                  {PLACES[k].emoji} {PLACES[k].label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Onde costumo comprar</span>
          <select value={item.shopId} onChange={(e) => updateItem(item.id, { shopId: e.target.value })}>
            {shops.map((x) => (
              <option key={x.id} value={x.id}>
                {x.emoji} {x.name}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span>Anda junto com (o app lembra um do outro)</span>
          <div className="row wrap">
            {item.pairs.map((pid) => (
              <button key={pid} className="chip on" onClick={() => updateItem(item.id, { pairs: item.pairs.filter((x) => x !== pid) })}>
                {db.items[pid]?.name ?? '?'} ✕
              </button>
            ))}
          </div>
          <select
            value={addingPair}
            onChange={(e) => {
              if (e.target.value) updateItem(item.id, { pairs: [...item.pairs, e.target.value] })
              setAddingPair('')
            }}
          >
            <option value="">+ Adicionar item que anda junto…</option>
            {others.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Histórico</h3>
          {st.times === 0 ? (
            <div className="muted small">Ainda não foi comprado pelo app. Depois da primeira feira aparecem média, frequência e preço aqui.</div>
          ) : (
            <div className="grid2 small">
              <div>
                <div className="muted">Comprado</div>
                <b>{st.times}×</b>
              </div>
              <div>
                <div className="muted">Repõe a cada</div>
                <b>{st.everyDays ? `~${Math.round(st.everyDays)} dias` : '—'}</b>
              </div>
              <div>
                <div className="muted">Consumo por mês</div>
                <b>~{qtyLabel(+st.qtyPerMonth.toFixed(1), item.unit)}</b>
              </div>
              <div>
                <div className="muted">Gasto por mês</div>
                <b>{brl(st.spendPerMonth)}</b>
              </div>
              <div>
                <div className="muted">Último preço</div>
                <b>{st.lastPrice != null ? brl(st.lastPrice) : '—'}</b>
                {st.priceChange != null && Math.abs(st.priceChange) >= 0.03 && (
                  <span className={'badge ' + (st.priceChange > 0 ? 'red' : 'green')} style={{ marginLeft: 6 }}>
                    {st.priceChange > 0 ? '▲' : '▼'} {Math.round(Math.abs(st.priceChange) * 100)}%
                  </span>
                )}
              </div>
              <div>
                <div className="muted">Preço médio</div>
                <b>{st.avgPrice != null ? brl(st.avgPrice) : '—'}</b>
              </div>
            </div>
          )}
          {history.length > 0 && (
            <div className="small" style={{ marginTop: 12 }}>
              {history.map((p, i) => (
                <div key={i} className="row between" style={{ padding: '4px 0' }}>
                  <span className="muted">
                    {dateLabel(p.at)} · {db.shops[p.shopId]?.name}
                  </span>
                  <span className="num">
                    {qtyLabel(p.qty, item.unit)} × {brl(p.unitPrice!)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="row">
          <button
            className="btn ghost"
            style={{ color: 'var(--accent)' }}
            onClick={() => {
              confirmAction(`Tirar “${item.name}” da despensa? O histórico de compras continua no resumo.`, 'Tirar', () => {
                deleteItem(item.id)
                onClose()
              })
            }}
          >
            Não compro mais
          </button>
          <div className="grow" />
          <button className="btn primary" onClick={onClose}>
            Pronto
          </button>
        </div>
      </div>
    </Sheet>
  )
}
