import { useState } from 'react'
import { brl } from '../data/format'
import { Sheet } from './ui'

/**
 * "Qual compensa?": compara embalagens pelo preço por kg, litro ou unidade.
 * Ex.: maionese 200 g por R$ 4,99 × 500 g por R$ 10,90; papel higiênico
 * 12 rolos × 30 rolos; água sanitária 1 L × 2 L.
 */

type Measure = 'g' | 'kg' | 'ml' | 'L' | 'un'

interface Option {
  price: string
  amount: string
  measure: Measure
  label: string
}

const BASE: Record<Measure, { to: 'kg' | 'L' | 'un'; factor: number }> = {
  g: { to: 'kg', factor: 1 / 1000 },
  kg: { to: 'kg', factor: 1 },
  ml: { to: 'L', factor: 1 / 1000 },
  L: { to: 'L', factor: 1 },
  un: { to: 'un', factor: 1 },
}

const num = (s: string) => {
  const v = parseFloat(s.replace(/\./g, '').replace(',', '.'))
  return isFinite(v) && v > 0 ? v : null
}

const empty = (label: string, measure: Measure = 'g'): Option => ({ price: '', amount: '', measure, label })

export function Compare({ onClose, title }: { onClose: () => void; title?: string }) {
  const [opts, setOpts] = useState<Option[]>([empty('Opção A'), empty('Opção B')])

  const set = (i: number, patch: Partial<Option>) => setOpts((o) => o.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  const results = opts.map((o) => {
    const price = num(o.price)
    const amount = num(o.amount)
    if (!price || !amount) return null
    const b = BASE[o.measure]
    return { per: price / (amount * b.factor), base: b.to }
  })
  const valid = results.filter((r): r is NonNullable<typeof r> => !!r)
  const sameBase = valid.length >= 2 && valid.every((r) => r.base === valid[0]!.base)
  const best = sameBase ? Math.min(...valid.map((r) => r.per)) : null
  const worst = sameBase ? Math.max(...valid.map((r) => r.per)) : null

  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <div className="row between">
          <h2>Qual compensa?</h2>
          <button className="btn sm primary" onClick={onClose}>
            Pronto
          </button>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          {title ? `${title}: ` : ''}coloque preço e tamanho de cada opção (ex.: 200 g, 1 kg, 12 un, 2 L). O app faz a conta pelo preço por kg, litro
          ou unidade.
        </p>

        {opts.map((o, i) => {
          const r = results[i]
          const isBest = r && best != null && r.per === best && best !== worst
          return (
            <div key={i} className="card stack" style={{ padding: 12, gap: 8, outline: isBest ? '2px solid var(--primary)' : undefined }}>
              <div className="row between">
                <input
                  id={`cmp-label-${i}`}
                  value={o.label}
                  onChange={(e) => set(i, { label: e.target.value })}
                  style={{ fontWeight: 700, border: 0, padding: 0, background: 'transparent' }}
                  aria-label="Nome da opção"
                />
                {isBest && <span className="badge green">compensa mais</span>}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <label className="field grow">
                  <span>Preço (R$)</span>
                  <input id={`cmp-price-${i}`} inputMode="decimal" placeholder="0,00" value={o.price} onChange={(e) => set(i, { price: e.target.value })} />
                </label>
                <label className="field grow">
                  <span>Tamanho</span>
                  <div className="row" style={{ gap: 4 }}>
                    <input id={`cmp-amount-${i}`} inputMode="decimal" placeholder="200" value={o.amount} onChange={(e) => set(i, { amount: e.target.value })} />
                    <select id={`cmp-measure-${i}`} value={o.measure} onChange={(e) => set(i, { measure: e.target.value as Measure })} style={{ width: 72, paddingInline: 8 }}>
                      {(['g', 'kg', 'ml', 'L', 'un'] as Measure[]).map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>
              {r && (
                <div className="small num" style={{ fontWeight: 700 }}>
                  {brl(r.per)} por {r.base}
                  {sameBase && best != null && r.per > best && (
                    <span className="badge red" style={{ marginLeft: 6 }}>
                      +{Math.round((r.per / best - 1) * 100)}% mais caro
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {valid.length >= 2 && !sameBase && <div className="badge yellow">Pra comparar, use a mesma medida nas opções (peso com peso, litro com litro, unidade com unidade).</div>}

        {sameBase && best != null && worst != null && best !== worst && (
          <div className="card" style={{ background: 'var(--primary-soft)' }}>
            <b>{opts[results.findIndex((r) => r?.per === best)]!.label}</b> sai {Math.round((1 - best / worst) * 100)}% mais barato por {valid[0]!.base}.
          </div>
        )}

        <div className="row">
          {opts.length < 4 && (
            <button className="btn sm grow" onClick={() => setOpts((o) => [...o, empty(`Opção ${String.fromCharCode(65 + o.length)}`, o[0]!.measure)])}>
              + Outra opção
            </button>
          )}
          <button className="btn sm grow" onClick={() => setOpts([empty('Opção A'), empty('Opção B')])}>
            Limpar
          </button>
        </div>
      </div>
    </Sheet>
  )
}
