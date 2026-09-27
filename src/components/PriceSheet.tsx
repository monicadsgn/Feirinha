import { useState } from 'react'
import { brl, qtyLabel } from '../data/format'
import type { Item, TripLine } from '../data/types'
import { Sheet, Stepper } from './ui'

type Mode = 'unit' | 'total'

/**
 * Teclado de preço estilo app de banco: digita 6-4-9 e vira R$ 6,49.
 * Dois jeitos de anotar: preço de cada unidade, ou o total pago (bom pra
 * alho, cebola e tudo que é pesado no caixa sem saber o peso antes).
 */
export function PriceSheet({
  item,
  line,
  defaultQty,
  lastPrice,
  onSave,
  onMissing,
  onRemove,
  onCompare,
  onClose,
}: {
  item: Item
  line?: TripLine
  defaultQty: number
  lastPrice: number | null
  onSave: (qty: number, price: number | null) => void
  onMissing: () => void
  onRemove?: () => void
  onCompare?: () => void
  onClose: () => void
}) {
  const [qty, setQty] = useState(line?.qty ?? defaultQty)
  const [mode, setMode] = useState<Mode>(item.category === 'hortifruti' || /quilo|peso/i.test(item.note ?? '') ? 'total' : 'unit')
  const [cents, setCents] = useState(() => {
    if (line?.unitPrice == null) return ''
    const v = mode === 'total' ? line.unitPrice * line.qty : line.unitPrice
    return String(Math.round(v * 100))
  })
  const typed = cents ? parseInt(cents, 10) / 100 : null
  const unitPrice = typed == null ? null : mode === 'total' ? typed / Math.max(qty, 0.001) : typed
  const total = unitPrice == null ? null : unitPrice * qty

  const press = (k: string) => {
    if (k === '⌫') setCents((c) => c.slice(0, -1))
    else if (k === 'C') setCents('')
    else setCents((c) => (c + k).replace(/^0+/, '').slice(0, 7))
  }

  const switchMode = (m: Mode) => {
    if (m === mode) return
    // mantém o valor coerente ao trocar de modo
    if (typed != null) setCents(String(Math.round((m === 'total' ? typed * qty : typed / Math.max(qty, 0.001)) * 100)))
    setMode(m)
  }

  const diff = unitPrice != null && lastPrice ? unitPrice / lastPrice - 1 : null

  return (
    <Sheet onClose={onClose}>
      <div className="stack" style={{ gap: 10 }}>
        <div className="row between">
          <h2 className="ellipsis grow">{item.name}</h2>
          <Stepper value={qty} unit={item.unit} min={0.1} onChange={setQty} />
        </div>

        <div className="row" style={{ gap: 6 }}>
          <button className={'chip grow' + (mode === 'unit' ? ' on' : '')} style={{ justifyContent: 'center' }} onClick={() => switchMode('unit')}>
            Preço por {item.unit}
          </button>
          <button className={'chip grow' + (mode === 'total' ? ' on' : '')} style={{ justifyContent: 'center' }} onClick={() => switchMode('total')}>
            Total pago
          </button>
        </div>

        <div>
          <div className={'price-display num' + (typed == null ? ' empty' : '')}>{brl(typed ?? 0)}</div>
          <div className="center small muted" style={{ minHeight: 20 }}>
            {mode === 'unit' ? (
              <>
                preço por {item.unit}
                {total != null && qty !== 1 && (
                  <>
                    {' '}
                    · {qtyLabel(qty, item.unit)} = <b className="num">{brl(total)}</b>
                  </>
                )}
              </>
            ) : (
              <>
                total de {qtyLabel(qty, item.unit)}
                {unitPrice != null && qty !== 1 && (
                  <>
                    {' '}
                    · dá <b className="num">{brl(unitPrice)}</b> por {item.unit}
                  </>
                )}
              </>
            )}
            {diff != null && Math.abs(diff) >= 0.05 && (
              <span className={'badge ' + (diff > 0 ? 'red' : 'green')} style={{ marginLeft: 6 }}>
                {diff > 0 ? '▲' : '▼'} {Math.round(Math.abs(diff) * 100)}% vs último
              </span>
            )}
          </div>
        </div>

        {lastPrice != null && typed == null && (
          <button className="btn block" onClick={() => onSave(qty, lastPrice)}>
            Mesmo preço da última vez · <b className="num">{brl(lastPrice)}</b>/{item.unit}
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
          <button className="btn primary grow" onClick={() => onSave(qty, unitPrice == null ? null : +unitPrice.toFixed(4))}>
            {typed == null ? 'Pegar sem preço' : 'Pegar ✓'}
          </button>
        </div>
        <div className="row between">
          {onCompare ? (
            <button className="btn ghost sm" onClick={onCompare}>
              ⚖️ Qual tamanho compensa?
            </button>
          ) : (
            <span />
          )}
          {onRemove && (
            <button className="btn ghost sm" onClick={onRemove}>
              Desfazer
            </button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
