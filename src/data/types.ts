export type Id = string

/** Todo registro tem id + updatedAt para permitir sincronizar entre celulares depois. */
export interface Base {
  id: Id
  updatedAt: number
  deleted?: boolean
}

export type CategoryId =
  | 'hortifruti'
  | 'acougue'
  | 'frios'
  | 'padaria'
  | 'mercearia'
  | 'matinais'
  | 'temperos'
  | 'bebidas'
  | 'congelados'
  | 'besteiras'
  | 'limpeza'
  | 'higiene'
  | 'casa'
  | 'pet'
  | 'outros'

/** Onde o item fica em casa — usado na revisão da despensa. */
export type PlaceId = 'geladeira' | 'freezer' | 'armario' | 'fruteira' | 'limpeza' | 'banheiro' | 'outros'

export type Unit = 'un' | 'pct' | 'kg' | 'g' | 'L' | 'cx' | 'bandeja' | 'maço' | 'pé' | 'cacho' | 'dz' | 'lata' | 'rolo'

export interface Shop extends Base {
  name: string
  emoji: string
  /** Ordem dos corredores (categorias) do jeito que vocês andam no mercado. */
  aisles: CategoryId[]
}

export interface Item extends Base {
  name: string
  category: CategoryId
  place: PlaceId
  unit: Unit
  /** Quanto costuma comprar numa feira. */
  defaultQty: number
  /** Compra a cada N meses (sal, açúcar…). Sem valor = todo mês. */
  everyMonths?: number
  /** Tamanho/tipo, pra não ter dúvida ("garrafa de 1 L", "da marca X"). */
  note?: string
  /** Carnes: quantas refeições do casal 1 unidade (kg) rende. Aprendido com o uso. */
  mealsPerUnit?: number
  /** Nomes como vêm na nota fiscal ("DETERG LIQ YPE 500ML"), pra reconhecer da próxima vez. */
  aliases?: string[]
  shopId: Id
  /** Itens que costumam andar juntos (macarrão → molho). */
  pairs: Id[]
  /** Último estoque conhecido e quando foi informado. null = não sei. */
  stockQty: number | null
  stockAt: number | null
}

export type EntryReason = 'acabou' | 'acabando' | 'pendente' | 'manual' | 'revisao' | 'par'

export interface ListEntry extends Base {
  itemId: Id
  qty: number
  addedBy: string
  reason: EntryReason
}

export type TripKind = 'feira' | 'reposicao'

export interface TripLine {
  id: Id
  itemId: Id
  qty: number
  unitPrice: number | null
  status: 'pego' | 'faltou'
  extra: boolean
}

export interface Trip extends Base {
  shopId: Id
  kind: TripKind
  startedAt: number
  finishedAt: number | null
  lines: TripLine[]
  /** Quanto foi pago no ticket (o resto foi dinheiro). */
  paidTicket: number
}

export interface Settings {
  me: string
  people: string[]
  /** Valor que cai no ticket por mês. 0 = não usa. */
  ticketMonthly: number
  /** Dia do mês em que o ticket cai (e a feira costuma acontecer). */
  ticketDay: number
  onboarded: boolean
  /** Última revisão completa da despensa. */
  lastReviewAt?: number
  /** Dia da semana do lembrete "algo acabou?" (0 = domingo). */
  checkWeekday?: number
  /** Versão do catálogo usada no cadastro (2 = montado com as listas da casa). */
  catalogVersion?: number
  /** Quantas refeições com carne a casa faz por semana (almoço + jantar). */
  mealsPerWeek?: number
  /** Última mudança nos ajustes compartilhados (tudo menos `me`). */
  updatedAt?: number
}

export type Meal = 'cafe' | 'almoco' | 'jantar'

/** Receita salva pela casa (link do Instagram/TikTok, legenda colada…). */
export interface SavedRecipe extends Base {
  name: string
  url?: string
  /** Texto colado (legenda, ingredientes, modo de preparo). */
  text?: string
  /** Itens da despensa que a receita usa. */
  uses: Id[]
  meals: Meal[]
  addedBy: string
}

export interface DB {
  version: 1
  items: Record<Id, Item>
  shops: Record<Id, Shop>
  list: Record<Id, ListEntry>
  trips: Record<Id, Trip>
  recipes: Record<Id, SavedRecipe>
  settings: Settings
}
