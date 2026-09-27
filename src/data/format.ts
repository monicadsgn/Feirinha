import type { Unit } from './types'

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const brl = (v: number) => money.format(v)

export function qtyLabel(qty: number, unit: Unit): string {
  const n = Number.isInteger(qty) ? String(qty) : qty.toFixed(unit === 'kg' || unit === 'L' ? 2 : 1).replace(/0+$/, '').replace('.', ',')
  const plural: Partial<Record<Unit, string>> = { bandeja: 'bandejas', maço: 'maços', pé: 'pés', cacho: 'cachos', lata: 'latas', rolo: 'rolos' }
  return `${n} ${qty > 1 ? (plural[unit] ?? unit) : unit}`
}

export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

export const DAY = 86_400_000

export function daysLabel(days: number): string {
  const d = Math.round(days)
  if (d <= 0) return 'hoje'
  if (d === 1) return 'amanhã'
  return `em ${d} dias`
}

export function dateLabel(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y!, m! - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}
