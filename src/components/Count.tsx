import type { Item } from '../data/types'
import { Stepper } from './ui'

export interface CountValue {
  closed: number
  opened: number
}

type Props = { item: Item; value: CountValue; onChange: (v: CountValue) => void }

/** Quantas embalagens fechadas tem. */
export function CountStepper({ item, value, onChange }: Props) {
  return <Stepper value={value.closed} unit={item.unit} onChange={(v) => onChange({ ...value, closed: Math.round(v) })} />
}

/** Abertas (cada uma vale meia) e, se o item às vezes vem grande, "+ 1 grande" (conta 2). */
export function CountExtras({ item, value, onChange }: Props) {
  return (
    <>
      <span className="mini-step" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Menos aberto" onClick={() => onChange({ ...value, opened: Math.max(0, value.opened - 1) })}>
          −
        </button>
        <span>
          {value.opened} {value.opened === 1 ? 'aberto' : 'abertos'}
        </span>
        <button type="button" aria-label="Mais aberto" onClick={() => onChange({ ...value, opened: value.opened + 1 })}>
          +
        </button>
      </span>
      {item.big && (
        <button
          type="button"
          className="mini-btn"
          onClick={(e) => {
            e.stopPropagation()
            onChange({ ...value, closed: value.closed + 2 })
          }}
        >
          + 1 grande
        </button>
      )}
    </>
  )
}

export const countTotal = (c: CountValue) => c.closed + c.opened * 0.5
