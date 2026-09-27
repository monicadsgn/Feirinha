import { useMemo, useState } from 'react'
import { NotaSheet } from '../components/NotaSheet'
import { CATEGORIES } from '../data/catalog'
import { brl, dateLabel, monthLabel, qtyLabel } from '../data/format'
import { cycleStart, finishedTrips, itemStats, monthlyStats, tripTotal } from '../data/logic'
import { deleteTrip, useDB } from '../data/store'
import { confirmAction } from '../components/ui'
import type { CategoryId, Id } from '../data/types'

type Sort = 'gasto' | 'frequencia' | 'preco'

export function Resumo({ openItem }: { openItem: (id: Id) => void }) {
  const db = useDB()
  const [sort, setSort] = useState<Sort>('gasto')
  const [openTrip, setOpenTrip] = useState<Id | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [nota, setNota] = useState<Id | true | false>(false)
  const notaBtn = (
    <button className="btn sm" onClick={() => setNota(true)}>
      🧾 Ler nota
    </button>
  )
  const notaSheet = nota !== false && <NotaSheet tripId={nota === true ? undefined : nota} onClose={() => setNota(false)} onDone={() => setNota(false)} />

  const trips = finishedTrips(db)
  const start = cycleStart(db.settings.ticketDay)
  const cycle = trips.filter((t) => t.finishedAt! >= start)
  const cycleTotal = cycle.reduce((s, t) => s + tripTotal(t).total, 0)
  const cycleTicket = cycle.reduce((s, t) => s + t.paidTicket, 0)
  const months = monthlyStats(db).slice(-6)
  const avg = months.length ? months.reduce((s, m) => s + m.total, 0) / months.length : 0
  const avgExtras = months.length ? months.reduce((s, m) => s + m.extras, 0) / months.length : 0
  const max = Math.max(1, ...months.map((m) => m.total))

  const cats = useMemo(() => {
    const sum: Partial<Record<CategoryId, number>> = {}
    for (const m of months) for (const [k, v] of Object.entries(m.byCategory)) sum[k as CategoryId] = (sum[k as CategoryId] ?? 0) + v! / months.length
    return (Object.entries(sum) as [CategoryId, number][]).sort((a, b) => b[1] - a[1])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.trips])
  const catMax = Math.max(1, ...cats.map((c) => c[1]))

  const stats = useMemo(
    () =>
      Object.values(db.items)
        .map((i) => itemStats(db, i))
        .filter((s) => s.times > 0)
        .sort((a, b) =>
          sort === 'gasto'
            ? b.spendPerMonth - a.spendPerMonth
            : sort === 'frequencia'
              ? (a.everyDays ?? 999) - (b.everyDays ?? 999)
              : (b.priceChange ?? -9) - (a.priceChange ?? -9),
        ),
    [db, sort],
  )

  if (!trips.length)
    return (
      <>
        <div className="page-head">
          <h1>Resumo</h1>
          {notaBtn}
        </div>
        {notaSheet}
        <div className="empty">
          <div className="big">📊</div>
          <p>Depois da primeira compra no Modo Mercado aparecem aqui:</p>
          <p className="small">
            quanto vocês gastam por mês, quanto foi no ticket e em dinheiro, o gasto por categoria, de quanto em quanto tempo cada item é
            reposto e quando um preço sobe.
          </p>
        </div>
      </>
    )

  return (
    <>
      <div className="page-head">
        <div>
          <div className="muted small">Desde {dateLabel(start)}</div>
          <h1>Resumo</h1>
        </div>
        {notaBtn}
      </div>
      {notaSheet}

      <div className="grid2">
        <div className="card">
          <div className="muted small">Gasto neste mês</div>
          <div className="stat num">{brl(cycleTotal)}</div>
          <div className="small muted">
            {cycle.length} {cycle.length === 1 ? 'ida' : 'idas'} ao mercado
          </div>
        </div>
        <div className="card">
          <div className="muted small">Média por mês</div>
          <div className="stat num">{brl(avg)}</div>
          <div className="small muted">
            {months.length} {months.length === 1 ? 'mês' : 'meses'} · extras ~{brl(avgExtras)}
          </div>
        </div>
      </div>

      {db.settings.ticketMonthly > 0 && (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="row between">
            <span style={{ fontWeight: 800 }}>Ticket</span>
            <span className="num small">
              {brl(cycleTicket)} de {brl(db.settings.ticketMonthly)}
            </span>
          </div>
          <div className={'meter ' + (cycleTicket >= db.settings.ticketMonthly ? 'red' : '')} style={{ height: 10 }}>
            <i style={{ width: `${Math.min(100, (cycleTicket / db.settings.ticketMonthly) * 100)}%` }} />
          </div>
          <div className="row between small muted" style={{ marginTop: 6 }}>
            <span>Sobra {brl(Math.max(0, db.settings.ticketMonthly - cycleTicket))}</span>
            <span>Em dinheiro: {brl(Math.max(0, cycleTotal - cycleTicket))}</span>
          </div>
        </div>
      )}

      {months.length > 1 && (
        <div className="section">
          <div className="section-title">
            <span>Gasto por mês</span>
          </div>
          <div className="card">
            <div className="bars" role="img" aria-label="Gasto por mês">
              {months.map((m, i) => {
                const on = hover ? hover === m.key : i === months.length - 1
                return (
                  <button
                    key={m.key}
                    className={'col' + (on ? ' on' : '')}
                    onPointerEnter={() => setHover(m.key)}
                    onPointerLeave={() => setHover(null)}
                    onClick={() => setHover(m.key)}
                    title={`${monthLabel(m.key)}: ${brl(m.total)}`}
                  >
                    {on && <span className="v num">{brl(m.total)}</span>}
                    <span className="b" style={{ height: `calc(${(m.total / max) * 100}% - 24px)` }} />
                    <span className="l">{monthLabel(m.key)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {cats.length > 0 && (
        <div className="section">
          <div className="section-title">
            <span>Por categoria (média/mês)</span>
          </div>
          <div className="card">
            {cats.map(([c, v]) => (
              <div className="hbar" key={c}>
                <span className="small" style={{ fontWeight: 700 }}>
                  {CATEGORIES[c].emoji} {CATEGORIES[c].label}
                </span>
                <span className="small num">{brl(v)}</span>
                <div className="track">
                  <i style={{ width: `${(v / catMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-title">
          <span>Itens</span>
        </div>
        <div className="chips" style={{ marginBottom: 8 }}>
          {(
            [
              ['gasto', 'Mais gasto'],
              ['frequencia', 'Repõe mais rápido'],
              ['preco', 'Preço subiu'],
            ] as [Sort, string][]
          ).map(([k, l]) => (
            <button key={k} className={'chip' + (sort === k ? ' on' : '')} onClick={() => setSort(k)}>
              {l}
            </button>
          ))}
        </div>
        <div className="card" style={{ padding: '4px 12px' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Item</th>
                <th>Por mês</th>
                <th>Repõe</th>
                <th>Preço</th>
              </tr>
            </thead>
            <tbody>
              {stats.slice(0, 40).map((s) => (
                <tr key={s.item.id} onClick={() => !s.item.deleted && openItem(s.item.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{s.item.name}</div>
                    <div className="small muted">~{qtyLabel(+s.qtyPerMonth.toFixed(1), s.item.unit)}/mês</div>
                  </td>
                  <td className="num">{brl(s.spendPerMonth)}</td>
                  <td className="num">{s.everyDays ? `${Math.round(s.everyDays)}d` : '—'}</td>
                  <td className="num">
                    {s.lastPrice != null ? brl(s.lastPrice) : '—'}
                    {s.priceChange != null && Math.abs(s.priceChange) >= 0.03 && (
                      <div className={'small'} style={{ color: s.priceChange > 0 ? 'var(--accent)' : 'var(--primary)', fontWeight: 800 }}>
                        {s.priceChange > 0 ? '▲' : '▼'}
                        {Math.round(Math.abs(s.priceChange) * 100)}%
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <div className="section-title">
          <span>Compras</span>
        </div>
        <div className="list">
          {[...trips].reverse().map((t) => {
            const tt = tripTotal(t)
            const open = openTrip === t.id
            return (
              <div key={t.id}>
                <button className="li" style={{ width: '100%', textAlign: 'left' }} onClick={() => setOpenTrip(open ? null : t.id)}>
                  <span style={{ fontSize: 20 }}>{db.shops[t.shopId]?.emoji ?? '🛒'}</span>
                  <div className="grow">
                    <div className="title">{db.shops[t.shopId]?.name ?? 'Mercado'}</div>
                    <div className="small muted">
                      {dateLabel(t.finishedAt!)} · {t.kind === 'feira' ? 'feira do mês' : 'reposição'} · {tt.picked} itens{t.notaAt ? ' · ✓ nota' : ''}
                    </div>
                  </div>
                  <b className="num">{brl(tt.total)}</b>
                </button>
                {open && (
                  <div style={{ padding: '4px 14px 12px', background: 'var(--surface)' }} className="small">
                    {t.lines
                      .filter((l) => l.status === 'pego')
                      .map((l) => (
                        <div key={l.id} className="row between" style={{ padding: '3px 0' }}>
                          <span>
                            {db.items[l.itemId]?.name} {l.extra && <span className="badge yellow">extra</span>}
                          </span>
                          <span className="num muted">
                            {qtyLabel(l.qty, db.items[l.itemId]?.unit ?? 'un')} × {l.unitPrice != null ? brl(l.unitPrice) : '—'}
                          </span>
                        </div>
                      ))}
                    <button className="btn sm block" style={{ marginTop: 8 }} onClick={() => setNota(t.id)}>
                      🧾 {t.notaAt ? 'Conferir de novo com a nota' : 'Conferir com a nota fiscal'}
                    </button>
                    <div className="row between" style={{ marginTop: 8 }}>
                      <span className="muted">
                        Ticket {brl(t.paidTicket)} · dinheiro {brl(Math.max(0, tt.total - t.paidTicket))}
                      </span>
                      <button className="btn sm ghost" style={{ color: 'var(--accent)' }} onClick={() => confirmAction('Apagar essa compra do histórico?', 'Apagar', () => deleteTrip(t.id))}>
                        Apagar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
