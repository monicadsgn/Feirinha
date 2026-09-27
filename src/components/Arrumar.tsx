import { useMemo, useState } from 'react'
import { PLACES, PLACE_ORDER } from '../data/catalog'
import { listItemIds } from '../data/logic'
import { removeItems, undoable, useDB } from '../data/store'
import type { Id } from '../data/types'
import { Sheet, toastUndo } from './ui'

/**
 * Arrumar a despensa: tudo marcado começa como "uso"; desmarca o que a casa
 * não compra. Sai da despensa e da lista de uma vez (dá pra desfazer).
 */
export function Arrumar({ onClose }: { onClose: () => void }) {
  const db = useDB()
  const inList = listItemIds(db)
  const items = useMemo(() => Object.values(db.items).filter((i) => !i.deleted), [db.items])
  const [off, setOff] = useState<Set<Id>>(new Set())
  const places = PLACE_ORDER.filter((p) => items.some((i) => i.place === p))

  const toggle = (id: Id) =>
    setOff((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const apply = () => {
    const ids = [...off]
    if (ids.length) toastUndo(`${ids.length} ${ids.length === 1 ? 'item saiu' : 'itens saíram'} da despensa e da lista`, undoable(() => removeItems(ids)))
    onClose()
  }

  return (
    <Sheet onClose={onClose} full>
      <div className="row between">
        <h2>Arrumar despensa</h2>
        <button className="btn sm" onClick={onClose}>
          Cancelar
        </button>
      </div>
      <p className="small muted" style={{ margin: '6px 0 10px' }}>
        Toque no que vocês <b>não usam</b>: sai da despensa e da lista. Dá pra colocar de volta depois pelo “Adicionar”.
      </p>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {places.map((p) => (
          <div key={p} style={{ marginBottom: 12 }}>
            <div className="section-title">
              <span>
                {PLACES[p].emoji} {PLACES[p].label}
              </span>
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              {items
                .filter((i) => i.place === p)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((i) => {
                  const out = off.has(i.id)
                  return (
                    <button
                      key={i.id}
                      className={'chip' + (out ? '' : ' on')}
                      style={out ? { textDecoration: 'line-through', color: 'var(--muted)' } : undefined}
                      onClick={() => toggle(i.id)}
                      aria-pressed={!out}
                    >
                      {i.name}
                      {inList.has(i.id) && !out ? ' · na lista' : ''}
                    </button>
                  )
                })}
            </div>
          </div>
        ))}
      </div>
      <button className="btn primary block" style={{ marginTop: 10 }} onClick={apply}>
        {off.size ? `Tirar ${off.size} ${off.size === 1 ? 'item' : 'itens'} que não usamos` : 'Pronto'}
      </button>
    </Sheet>
  )
}
