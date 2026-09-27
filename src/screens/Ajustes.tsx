import { useRef, useState } from 'react'
import { Sheet, toast } from '../components/ui'
import { deleteShop, exportJSON, importJSON, resetAll, updateSettings, upsertShop, useDB } from '../data/store'

export function Ajustes({ onClose }: { onClose: () => void }) {
  const db = useDB()
  const s = db.settings
  const [ticket, setTicket] = useState(s.ticketMonthly ? s.ticketMonthly.toFixed(2).replace('.', ',') : '')
  const file = useRef<HTMLInputElement>(null)
  const shops = Object.values(db.shops).filter((x) => !x.deleted)

  const backup = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `feirinha-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <div className="row between">
          <h2>Ajustes</h2>
          <button className="btn sm primary" onClick={onClose}>
            Pronto
          </button>
        </div>

        <div className="card stack">
          <h3>Casa</h3>
          <label className="field">
            <span>Quem está usando este celular</span>
            <select value={s.me} onChange={(e) => updateSettings({ me: e.target.value })}>
              {[...new Set([s.me, ...s.people])].filter(Boolean).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Pessoas da casa (separadas por vírgula)</span>
            <input
              defaultValue={s.people.join(', ')}
              onBlur={(e) =>
                updateSettings({
                  people: e.target.value
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <div className="grid2">
            <label className="field">
              <span>Ticket por mês (R$)</span>
              <input
                inputMode="decimal"
                value={ticket}
                onChange={(e) => setTicket(e.target.value)}
                onBlur={() => updateSettings({ ticketMonthly: parseFloat(ticket.replace(/\./g, '').replace(',', '.')) || 0 })}
              />
            </label>
            <label className="field">
              <span>Dia que cai</span>
              <input
                inputMode="numeric"
                defaultValue={s.ticketDay}
                onBlur={(e) => updateSettings({ ticketDay: Math.min(28, Math.max(1, parseInt(e.target.value) || 5)) })}
              />
            </label>
          </div>
        </div>

        <div className="card stack">
          <h3>Lugares onde compram</h3>
          {shops.map((sh) => (
            <div className="row" key={sh.id}>
              <input style={{ width: 56, textAlign: 'center' }} defaultValue={sh.emoji} onBlur={(e) => upsertShop({ id: sh.id, emoji: e.target.value || '🛍️' })} />
              <input defaultValue={sh.name} onBlur={(e) => e.target.value.trim() && upsertShop({ id: sh.id, name: e.target.value.trim() })} />
              {shops.length > 1 && (
                <button className="icon-btn" aria-label="Remover" onClick={() => confirm(`Remover ${sh.name}?`) && deleteShop(sh.id)}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <button className="btn sm" onClick={() => upsertShop({})}>
            + Adicionar lugar
          </button>
        </div>

        <div className="card stack">
          <h3>Seus dados</h3>
          <p className="small muted" style={{ margin: 0 }}>
            Por enquanto tudo fica salvo neste celular. Faça um backup de vez em quando (ou antes de trocar de celular).
          </p>
          <div className="row">
            <button className="btn sm grow" onClick={backup}>
              ⬇ Baixar backup
            </button>
            <button className="btn sm grow" onClick={() => file.current?.click()}>
              ⬆ Restaurar
            </button>
          </div>
          <input
            ref={file}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try {
                importJSON(await f.text())
                toast('Backup restaurado ✓')
              } catch {
                toast('Esse arquivo não parece um backup do Feirinha')
              }
            }}
          />
          <button
            className="btn sm ghost"
            style={{ color: 'var(--accent)' }}
            onClick={() => confirm('Apagar tudo e começar do zero?') && confirm('Tem certeza? Não dá pra desfazer.') && resetAll()}
          >
            Apagar tudo
          </button>
        </div>

        <div className="card stack">
          <h3>Atalhos</h3>
          <p className="small muted" style={{ margin: 0 }}>
            Instale o Feirinha na tela inicial (no navegador: “Adicionar à tela inicial”). No Android, segurar o ícone mostra “Acabou algo”,
            “Adicionar” e “Modo Mercado”. No iPhone dá pra criar um Atalho que abre o link abaixo:
          </p>
          <code className="small" style={{ wordBreak: 'break-all', background: 'var(--surface-2)', padding: 8, borderRadius: 8 }}>
            {location.origin + location.pathname}?acao=acabou
          </code>
        </div>
      </div>
    </Sheet>
  )
}
