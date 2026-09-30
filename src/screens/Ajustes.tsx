import { useRef, useState } from 'react'
import { Atalhos } from '../components/Atalhos'
import { Sheet, confirmAction, embedded, toast } from '../components/ui'
import { createCasa, inviteLink, leaveCasa, syncAvailable, syncNow, useSync } from '../data/sync'
import { WEEKDAYS, calendarEvents, googleCalendarUrl, icsFile } from '../data/reminders'
import { deleteShop, exportJSON, importJSON, resetAll, updateSettings, upsertShop, useDB } from '../data/store'
import { nextFeira } from '../data/logic'

export function Ajustes({ onClose }: { onClose: () => void }) {
  const db = useDB()
  const s = db.settings
  const [ticket, setTicket] = useState(s.ticketMonthly ? s.ticketMonthly.toFixed(2).replace('.', ',') : '')
  const file = useRef<HTMLInputElement>(null)
  const shops = Object.values(db.shops).filter((x) => !x.deleted)
  const sync = useSync()
  const link = sync.casa ? inviteLink() : null
  const other = s.people.find((p) => p !== s.me) ?? 'a outra pessoa'
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link!)
      toast('Link copiado ✓')
    } catch {
      toast('Não deu pra copiar. Segure o link pra copiar.')
    }
  }

  const download = (content: string, name: string, type: string) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type }))
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const backup = () => download(exportJSON(), `feirinha-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
  const appUrl = location.origin + location.pathname
  const events = calendarEvents(db, appUrl)

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
              <select
                value={s.ticketDay === 0 ? 'util' : 'dia'}
                onChange={(e) => updateSettings({ ticketDay: e.target.value === 'util' ? 0 : s.ticketDay || 5 })}
              >
                <option value="util">Último dia útil do mês</option>
                <option value="dia">Um dia fixo</option>
              </select>
              {s.ticketDay !== 0 && (
                <input
                  inputMode="numeric"
                  defaultValue={s.ticketDay}
                  aria-label="Dia do mês"
                  onBlur={(e) => updateSettings({ ticketDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 5)) })}
                />
              )}
              <span className="small muted" style={{ fontWeight: 500 }}>
                Próximo: {new Date(nextFeira(s.ticketDay)).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </label>
          </div>
        </div>

        {syncAvailable && (
          <div className="card stack">
            <h3>Compartilhar a casa</h3>
            {!sync.casa ? (
              <>
                <p className="small muted" style={{ margin: 0 }}>
                  Cria um convite pra {other} usar a mesma despensa, lista e resumo, cada um no seu celular. O que um marca, o outro vê em
                  segundos.
                </p>
                <button className="btn sm primary" disabled={sync.busy} onClick={() => void createCasa()}>
                  Criar convite
                </button>
              </>
            ) : (
              <>
                <p className="small muted" style={{ margin: 0 }}>
                  Mande este link pra {other} abrir no celular. Quem tiver o link entra na casa, então mande só pra quem mora com você.
                </p>
                <code className="small" style={{ wordBreak: 'break-all', background: 'var(--surface-2)', padding: 8, borderRadius: 8, userSelect: 'all' }}>
                  {link}
                </code>
                <div className="row">
                  <button className="btn sm grow" onClick={copy}>
                    Copiar link
                  </button>
                  <a
                    className="btn sm grow primary"
                    style={{ textDecoration: 'none' }}
                    href={`https://wa.me/?text=${encodeURIComponent(`Entra na nossa Feirinha 🧺 ${link}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </div>
                <div className="row between small">
                  <span className="muted">
                    {sync.error ??
                      (sync.busy
                        ? 'Sincronizando…'
                        : sync.pending.length
                          ? `${sync.pending.length} mudanças esperando pra subir`
                          : sync.lastOk
                            ? `Tudo sincronizado · ${new Date(sync.lastOk).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                            : 'Ainda não sincronizou')}
                  </span>
                  <button className="btn sm ghost" onClick={() => void syncNow()}>
                    Sincronizar
                  </button>
                </div>
                <button
                  className="btn sm ghost"
                  style={{ color: 'var(--accent)' }}
                  onClick={() => confirmAction('Sair da casa? Este celular para de sincronizar e fica com uma cópia do que tem agora.', 'Sair', leaveCasa)}
                >
                  Sair da casa
                </button>
              </>
            )}
          </div>
        )}

        <div className="card stack">
          <h3>Lugares onde compram</h3>
          {shops.map((sh) => (
            <div className="row" key={sh.id}>
              <input style={{ width: 56, textAlign: 'center' }} defaultValue={sh.emoji} onBlur={(e) => upsertShop({ id: sh.id, emoji: e.target.value || '🛍️' })} />
              <input defaultValue={sh.name} onBlur={(e) => e.target.value.trim() && upsertShop({ id: sh.id, name: e.target.value.trim() })} />
              {shops.length > 1 && (
                <button className="icon-btn" aria-label="Remover" onClick={() => confirmAction(`Remover ${sh.name}?`, 'Remover', () => deleteShop(sh.id))}>
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
          <h3>Lembretes</h3>
          <p className="small muted" style={{ margin: 0 }}>
            Coloque 2 lembretes com alarme no calendário do celular: {s.ticketDay === 0 ? 'um no último dia útil do mês, às 8h,' : `um na véspera da feira (dia ${s.ticketDay === 1 ? 'último do mês' : s.ticketDay - 1}, às 19h)`} pra revisar a despensa, e um toda semana pra marcar o que acabou. Quando abrir o app, os avisos também aparecem no topo da
            Despensa.
          </p>
          <label className="field">
            <span>Lembrete semanal “acabou algo?”</span>
            <select value={s.checkWeekday ?? 0} onChange={(e) => updateSettings({ checkWeekday: parseInt(e.target.value) })}>
              {WEEKDAYS.map((w, i) => (
                <option key={i} value={i}>
                  {i === 0 || i === 6 ? 'todo' : 'toda'} {w}, às 10h
                </option>
              ))}
            </select>
          </label>
          {!embedded && (
            <>
              <button className="btn sm primary" onClick={() => download(icsFile(events), 'feirinha-lembretes.ics', 'text/calendar')}>
                📅 Colocar no calendário do celular
              </button>
              <div className="small muted">Ou direto no Google Agenda:</div>
            </>
          )}
          {embedded && <div className="small muted">Neste link de teste, só dá pra usar o Google Agenda. No app instalado também sai o arquivo pro calendário do iPhone.</div>}
          <div className="row">
            {events.map((e, i) => (
              <a key={i} className="btn sm grow" href={googleCalendarUrl(e)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                {i === 0 ? 'Véspera da feira' : 'Semanal'}
              </a>
            ))}
          </div>
        </div>

        <div className="card stack">
          <h3>Seus dados</h3>
          {embedded && (
            <p className="small muted" style={{ margin: 0 }}>
              Este é o link de teste: os dados ficam só neste navegador e o backup em arquivo só funciona no app instalado.
            </p>
          )}
          <p className="small muted" style={{ margin: 0 }} hidden={embedded}>
            {sync.casa ? 'Tudo fica salvo neste celular e na nuvem da casa.' : 'Por enquanto tudo fica salvo neste celular.'} Faça um backup de vez em quando (ou antes de trocar de celular).
          </p>
          <div className="row" hidden={embedded}>
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
            onClick={() => confirmAction('Apagar tudo e começar do zero? Não dá pra desfazer.', 'Apagar tudo', resetAll)}
          >
            Apagar tudo
          </button>
        </div>

        {!embedded && <Atalhos />}
      </div>
    </Sheet>
  )
}
