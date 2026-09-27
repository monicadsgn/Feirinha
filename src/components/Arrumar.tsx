import { useMemo, useState } from 'react'
import { PLACES, PLACE_ORDER } from '../data/catalog'
import { listItemIds } from '../data/logic'
import { removeItems, setCounted, undoable, useDB } from '../data/store'
import type { Id } from '../data/types'
import { Sheet, toastUndo } from './ui'

/**
 * Arrumar a despensa, em dois modos:
 * - "uso": tudo marcado começa como "uso"; desmarca o que a casa não compra
 *   (sai da despensa e da lista de uma vez, dá pra desfazer);
 * - "contar": marca os itens em que vale contar quantas embalagens tem.
 */
export function Arrumar({ mode, onClose }: { mode: 'uso' | 'contar'; onClose: () => void }) {
  const db = useDB()
  const inList = listItemIds(db)
  const items = useMemo(() => Object.values(db.items).filter((i) => !i.deleted), [db.items])
  // "off" = o que foi tocado: no modo uso, sai; no modo contar, inverte
  const [off, setOff] = useState<Set<Id>>(new Set())
  const isOn = (i: { id: Id; count?: boolean }) => (mode === 'uso' ? !off.has(i.id) : !!i.count !== off.has(i.id))
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
    if (mode === 'contar') {
      const on = ids.filter((id) => !db.items[id]!.count)
      const offIds = ids.filter((id) => db.items[id]!.count)
      if (ids.length) toastUndo(`${on.length ? `${on.length} pra contar` : ''}${on.length && offIds.length ? ' · ' : ''}${offIds.length ? `${offIds.length} sem contar` : ''}`, undoable(() => setCounted(on, offIds)))
      return onClose()
    }
    if (ids.length) toastUndo(`${ids.length} ${ids.length === 1 ? 'item saiu' : 'itens saíram'} da despensa e da lista`, undoable(() => removeItems(ids)))
    onClose()
  }

  return (
    <Sheet onClose={onClose} full>
      <div className="row between">
        <h2>{mode === 'uso' ? 'Arrumar despensa' : 'O que contar'}</h2>
        <button className="btn sm" onClick={onClose}>
          Cancelar
        </button>
      </div>
      {mode === 'uso' ? (
        <p className="small muted" style={{ margin: '6px 0 10px' }}>
          Toque no que vocês <b>não usam</b>: sai da despensa e da lista. Dá pra colocar de volta depois pelo “Adicionar”.
        </p>
      ) : (
        <p className="small muted" style={{ margin: '6px 0 10px' }}>
          Os marcados são <b>de contar</b>: a despensa guarda quantas embalagens tem (3 caixas, 2 pacotes) e um mínimo pra comprar. Os outros
          continuam só no Tem / Pouco / Não tem. Toque pra mudar.
        </p>
      )}
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
                  const out = !isOn(i)
                  return (
                    <button
                      key={i.id}
                      className={'chip' + (out ? '' : ' on')}
                      style={out && mode === 'uso' ? { textDecoration: 'line-through', color: 'var(--muted)' } : undefined}
                      onClick={() => toggle(i.id)}
                      aria-pressed={!out}
                    >
                      {mode === 'contar' && !out ? '# ' : ''}
                      {i.name}
                      {mode === 'uso' && inList.has(i.id) && !out ? ' · na lista' : ''}
                    </button>
                  )
                })}
            </div>
          </div>
        ))}
      </div>
      <button className="btn primary block" style={{ marginTop: 10 }} onClick={apply}>
        {mode === 'contar' ? (off.size ? `Salvar (${items.filter(isOn).length} de contar)` : 'Pronto') : off.size ? `Tirar ${off.size} ${off.size === 1 ? 'item' : 'itens'} que não usamos` : 'Pronto'}
      </button>
    </Sheet>
  )
}
