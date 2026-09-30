import { brl, DAY } from './format'
import { cycleStart, daysUntilFeira, nextFeira, ticketLeft } from './logic'
import type { DB } from './types'

export type ReminderAction = 'review' | 'acabou' | 'lista' | 'mercado' | 'refazer' | 'nota'

export interface Reminder {
  /** Muda a cada ciclo/dia, pra que dispensar valha só até o próximo. */
  key: string
  icon: string
  text: string
  action?: { label: string; run: ReminderAction }
}

const DISMISS_KEY = 'feirinha:lembretes-dispensados'

export function dismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

export function dismiss(key: string) {
  try {
    const s = [...dismissed(), key].slice(-50)
    localStorage.setItem(DISMISS_KEY, JSON.stringify(s))
  } catch {
    /* sem storage */
  }
}

/** Lembretes que aparecem no topo da Despensa quando o app é aberto. */
export function reminders(db: DB, now = Date.now()): Reminder[] {
  const out: Reminder[] = []
  const s = db.settings
  const cycle = cycleStart(s.ticketDay, now)
  const feiraIn = daysUntilFeira(s.ticketDay, now)
  const today = new Date(now).toISOString().slice(0, 10)

  // Ticket caiu (primeiros 2 dias do ciclo)
  if (s.ticketMonthly > 0 && now - cycle < 2 * DAY) {
    out.push({
      key: `ticket-${cycle}`,
      icon: '💳',
      text: `O ticket caiu! ${brl(ticketLeft(db, now))} disponível. Dia de feira?`,
      action: { label: 'Revisar', run: 'review' },
    })
  }

  // Ninguém mexe na despensa há uma semana
  const items = Object.values(db.items).filter((i) => !i.deleted)
  const lastTouch = Math.max(
    0,
    ...items.map((i) => i.stockAt ?? 0),
    ...Object.values(db.list).map((e) => e.updatedAt),
    ...Object.values(db.trips).map((t) => t.updatedAt),
  )
  const idle = Math.floor((now - lastTouch) / DAY)
  if (items.length && lastTouch && idle >= 7 && feiraIn > 3) {
    out.push({
      key: `parado-${today}`,
      icon: '🫙',
      text: `Faz ${idle} dias que ninguém marca nada. Acabou alguma coisa?`,
      action: { label: 'Marcar', run: 'acabou' },
    })
  }

  // Pendentes de outra ida
  const pend = Object.values(db.list).filter((e) => !e.deleted && e.reason === 'pendente').length
  if (pend > 0) {
    out.push({
      key: `pendentes-${today}`,
      icon: '📌',
      text: `${pend} ${pend === 1 ? 'item faltou' : 'itens faltaram'} no mercado. Dá pra pegar em outro lugar.`,
      action: { label: 'Ver', run: 'lista' },
    })
  }

  // Cadastro feito com o catálogo antigo e nenhuma compra ainda: oferece refazer
  if ((s.catalogVersion ?? 1) < 2 && !Object.values(db.trips).some((t) => !t.deleted)) {
    out.unshift({
      key: 'catalogo-v2',
      icon: '✨',
      text: 'Tem catálogo novo, montado com as suas listas de maio, julho e agosto. Quer refazer o cadastro?',
      action: { label: 'Refazer', run: 'refazer' },
    })
  }

  const gone = dismissed()
  return out.filter((r) => !gone.has(r.key))
}

// ---------- Lembretes no calendário do celular ----------

const WEEKDAYS_ICS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
export const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

const pad = (n: number) => String(n).padStart(2, '0')
const icsDate = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

function nextWeekday(weekday: number, hour: number): Date {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  const add = (weekday - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + add)
  return d
}

/** Véspera da feira: dia anterior ao dia do ticket, às 19h. Último dia útil: no próprio dia, às 8h. */
function feiraEve(ticketDay: number): { first: Date; rrule: string } {
  if (ticketDay === 0) {
    // hoje, se hoje for o dia e ainda não passou das 8h; senão o próximo
    let first = new Date(cycleStart(0))
    first.setHours(8, 0, 0, 0)
    if (first.getTime() < Date.now()) {
      first = new Date(nextFeira(0))
      first.setHours(8, 0, 0, 0)
    }
    return { first, rrule: 'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1' }
  }
  const monthDay = ticketDay === 1 ? -1 : ticketDay - 1
  const d = new Date(nextFeira(ticketDay) - DAY)
  d.setHours(19, 0, 0, 0)
  if (d.getTime() < Date.now()) d.setMonth(d.getMonth() + 1)
  return { first: d, rrule: `FREQ=MONTHLY;BYMONTHDAY=${monthDay}` }
}

export interface CalEvent {
  title: string
  details: string
  start: Date
  rrule: string
}

export function calendarEvents(db: DB, appUrl: string): CalEvent[] {
  const s = db.settings
  const eve = feiraEve(s.ticketDay)
  const wd = s.checkWeekday ?? 0
  return [
    {
      title: s.ticketDay === 0 ? '🧺 Hoje cai o ticket: revisar a despensa' : '🧺 Amanhã tem feira: revisar a despensa',
      details: `Abrir o Feirinha, tocar em “Revisar despensa” e deixar a lista pronta. ${appUrl}`,
      start: eve.first,
      rrule: eve.rrule,
    },
    {
      title: '🫙 Feirinha: acabou alguma coisa?',
      details: `Dá uma olhada rápida na geladeira e no armário e marca o que acabou. ${appUrl}?acao=acabou`,
      start: nextWeekday(wd, 10),
      rrule: `FREQ=WEEKLY;BYDAY=${WEEKDAYS_ICS[wd]}`,
    },
  ]
}

/** Arquivo .ics com os dois lembretes, com alerta. Abre no calendário do iPhone ou Android. */
export function icsFile(events: CalEvent[]): string {
  const stamp = icsDate(new Date())
  const esc = (t: string) => t.replace(/[,;\\]/g, (c) => '\\' + c).replace(/\n/g, '\\n')
  const body = events
    .map((e, i) =>
      [
        'BEGIN:VEVENT',
        `UID:feirinha-${i}-${stamp}@feirinha`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${icsDate(e.start)}`,
        `DTEND:${icsDate(new Date(e.start.getTime() + 15 * 60_000))}`,
        `RRULE:${e.rrule}`,
        `SUMMARY:${esc(e.title)}`,
        `DESCRIPTION:${esc(e.details)}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(e.title)}`,
        'TRIGGER:PT0M',
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n'),
    )
    .join('\r\n')
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Feirinha//PT-BR', 'CALSCALE:GREGORIAN', body, 'END:VCALENDAR'].join('\r\n')
}

/** Link do Google Agenda já preenchido (bom pro Android). */
export function googleCalendarUrl(e: CalEvent): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    details: e.details,
    dates: `${icsDate(e.start)}/${icsDate(new Date(e.start.getTime() + 15 * 60_000))}`,
    recur: `RRULE:${e.rrule}`,
  })
  return `https://calendar.google.com/calendar/render?${p}`
}
