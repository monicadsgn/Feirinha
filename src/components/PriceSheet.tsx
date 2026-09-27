import { useState } from 'react'
import { brl, qtyLabel } from '../data/format'
import type { Item, TripLine } from '../data/types'
import { Sheet, Stepper } from './ui'

/**
 * Teclado de preço estilo app de banco: digita 6-4-9 e vira R$ 6,49.
 * Quantidade já vem da lista; o preço do mês passado aparece como atalho.
 */
export function PriceSheet({
  item,
  line,
  defaultQty,
  lastPrice,
  onSave,
  onMissing,
  onRemove,
  onClose,
}: {
  item: Item
  line?: TripLine
  defaultQty: number
  lastPrice: number | null
  onSave: (qty: number, price: number | null) => void
  onMissing: () => void
  onRemove?: () => void
  onClose: () => void
}) {
  const [qty, setQty] = useState(line?.qty ?? defaultQty)
  const [cents, setCents] = useState(line?.unitPrice != null ? String(Math.round(line.unitPrice * 100)) : '')
  const price = cents ? parseInt(cents, 10) / 100 : null

  const press = (k: string) => {
    if (k === '⌫') setCents((c) => c.slice(0, -1))
    else if (k === 'C') setCents('')
    else setCents((c) => (c + k).replace(/^0+/, '').slice(0, 7))
  }

  const diff = price != null && lastPrice ? price / lastPrice - 1 : null

  return (
    <Sheet onClose={onClose}>
      <div className="stack" style={{ gap: 10 }}>
        <div className="row between">
          <h2 className="ellipsis grow">{item.name}</h2>
          <Stepper value={qty} unit={item.unit} min={0.1} onChange={setQty} />
        </div>

        <div>
          <div className={'price-display num' + (price == null ? ' empty' : '')}>{brl(price ?? 0)}</div>
          <div className="center small muted" style={{ minHeight: 20 }}>
            preço por {item.unit}
            {price != null && qty !== 1 && (
              <>
                {' '}
                · {qtyLabel(qty, item.unit)} = <b className="num">{brl(price * qty)}</b>
              </>
            )}
            {diff != null && Math.abs(diff) >= 0.05 && (
              <span className={'badge ' + (diff > 0 ? 'red' : 'green')} style={{ marginLeft: 6 }}>
                {diff > 0 ? '▲' : '▼'} {Math.round(Math.abs(diff) * 100)}% vs último
              </span>
            )}
          </div>
        </div>

        {lastPrice != null && price == null && (
          <button className="btn block" onClick={() => onSave(qty, lastPrice)}>
            Mesmo preço da última vez · <b className="num">{brl(lastPrice)}</b>
          </button>
        )}

        <div className="numpad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
            <button key={k} onClick={() => press(k)} aria-label={k === '⌫' ? 'Apagar' : k === 'C' ? 'Limpar' : k}>
              {k}
            </button>
          ))}
        </div>

        <div className="row">
          <button className="btn" onClick={onMissing}>
            Não tinha
          </button>
          <button className="btn primary grow" onClick={() => onSave(qty, price)}>
            {price == null ? 'Pegar sem preço' : 'Pegar ✓'}
          </button>
        </div>
        {onRemove && (
          <button className="btn ghost sm" onClick={onRemove}>
            Desfazer (voltar pra não pego)
          </button>
        )}
      </div>
    </Sheet>
  )
}
