import type { CategoryId, PlaceId, Unit } from './types'

/** Nomes seguem as seções das listas da casa (Grãos e massas, Óleos e temperos…). */
export const CATEGORIES: Record<CategoryId, { label: string; emoji: string }> = {
  hortifruti: { label: 'Verduras, legumes e frutas', emoji: '🥬' },
  acougue: { label: 'Carnes, aves e peixes', emoji: '🥩' },
  frios: { label: 'Laticínios e frios', emoji: '🧀' },
  padaria: { label: 'Padaria', emoji: '🍞' },
  mercearia: { label: 'Grãos e massas', emoji: '🍚' },
  matinais: { label: 'Café da manhã', emoji: '☕' },
  temperos: { label: 'Óleos e temperos', emoji: '🧂' },
  bebidas: { label: 'Bebidas', emoji: '🧃' },
  congelados: { label: 'Congelados e enlatados', emoji: '🧊' },
  besteiras: { label: 'Lanches e besteiras', emoji: '🍫' },
  limpeza: { label: 'Limpeza', emoji: '🧽' },
  higiene: { label: 'Higiene', emoji: '🧴' },
  casa: { label: 'Casa', emoji: '🏠' },
  pet: { label: 'Pet', emoji: '🐾' },
  outros: { label: 'Outros', emoji: '📦' },
}

export const DEFAULT_AISLES: CategoryId[] = [
  'hortifruti',
  'padaria',
  'mercearia',
  'matinais',
  'temperos',
  'besteiras',
  'bebidas',
  'limpeza',
  'higiene',
  'casa',
  'pet',
  'frios',
  'acougue',
  'congelados',
  'outros',
]

export const PLACES: Record<PlaceId, { label: string; emoji: string }> = {
  geladeira: { label: 'Geladeira', emoji: '🧊' },
  freezer: { label: 'Freezer', emoji: '❄️' },
  armario: { label: 'Armário', emoji: '🗄️' },
  fruteira: { label: 'Fruteira', emoji: '🍌' },
  limpeza: { label: 'Área de serviço', emoji: '🧺' },
  banheiro: { label: 'Banheiro', emoji: '🛁' },
  outros: { label: 'Outros', emoji: '📦' },
}

export const PLACE_ORDER: PlaceId[] = ['geladeira', 'freezer', 'armario', 'fruteira', 'limpeza', 'banheiro', 'outros']

export const UNITS: Unit[] = ['un', 'pct', 'kg', 'g', 'L', 'cx', 'bandeja', 'maço', 'pé', 'cacho', 'dz', 'lata', 'rolo']

/** Nome por extenso, pra não ter dúvida do que é "1 un". */
export const UNIT_NAMES: Record<Unit, string> = {
  un: 'unidade',
  pct: 'pacote',
  kg: 'quilo',
  g: 'grama',
  L: 'litro',
  cx: 'caixa',
  bandeja: 'bandeja',
  maço: 'maço',
  pé: 'pé',
  cacho: 'cacho',
  dz: 'dúzia',
  lata: 'lata',
  rolo: 'rolo',
}

/** De quanto em quanto tempo costuma comprar. */
export const EVERY_OPTIONS = [
  { months: 1, label: 'Todo mês' },
  { months: 2, label: 'A cada 2 meses' },
  { months: 3, label: 'A cada 3 meses' },
  { months: 6, label: 'A cada 6 meses' },
] as const

/** Lojas iniciais. A chave vira o id. */
export const SEED_SHOPS = [
  { key: 'atacadao', name: 'Atacadão', emoji: '🛒' },
  { key: 'hortifruti', name: 'Sacolão / feira', emoji: '🥕' },
  { key: 'mercadinho', name: 'Mercadinho do bairro', emoji: '🏪' },
] as const

export type SeedShop = (typeof SEED_SHOPS)[number]['key']

/**
 * - 'lista': apareceu nas listas de maio, julho e/ou agosto (vem marcado).
 * - 'falta': comum numa casa e não estava nas listas (vem desmarcado, pra conferir).
 * - 'variar': ideia pra sair do de sempre (vem desmarcado).
 */
export type SeedOrigin = 'lista' | 'falta' | 'variar'

export interface SeedItem {
  key: string
  name: string
  category: CategoryId
  place: PlaceId
  unit: Unit
  qty: number
  shop: SeedShop
  origin: SeedOrigin
  /** Compra a cada N meses (1 = todo mês). */
  every?: number
  /** Explicação curta que aparece no cadastro (tamanho, tipo, por que sugerir). */
  note?: string
  pairs?: string[]
}

type Opt = Partial<Pick<SeedItem, 'every' | 'note' | 'pairs' | 'shop' | 'origin'>>

const s = (key: string, name: string, category: CategoryId, place: PlaceId, unit: Unit, qty: number, o: Opt = {}): SeedItem => ({
  key,
  name,
  category,
  place,
  unit,
  qty,
  shop: o.shop ?? (category === 'hortifruti' ? 'hortifruti' : 'atacadao'),
  origin: o.origin ?? 'lista',
  every: o.every,
  note: o.note,
  pairs: o.pairs,
})

const falta = (o: Opt = {}): Opt => ({ ...o, origin: 'falta' })
const variar = (note: string, o: Opt = {}): Opt => ({ ...o, origin: 'variar', note })

/**
 * Catálogo montado a partir das listas de 29/05, 30/07 e 31/08/2026.
 * Quantidade = média das listas, arredondada. Itens duráveis (sal, açúcar…)
 * ficam marcados como "a cada X meses" pra não pesar na lista de todo mês.
 */
export const SEED_ITEMS: SeedItem[] = [
  // Grãos e massas
  s('arroz', 'Arroz (1 kg)', 'mercearia', 'armario', 'pct', 4, { pairs: ['feijao'] }),
  s('feijao', 'Feijão (1 kg)', 'mercearia', 'armario', 'pct', 2, { note: 'carioca ou preto', pairs: ['arroz'] }),
  s('macarrao-ninho', 'Macarrão ninho', 'mercearia', 'armario', 'pct', 2, { pairs: ['extrato-tomate', 'queijo-ralado'] }),
  s('macarrao-espaguete', 'Macarrão espaguete', 'mercearia', 'armario', 'pct', 2, { pairs: ['extrato-tomate', 'queijo-ralado'] }),
  s('cuscuz', 'Flocão de milho (cuscuz)', 'mercearia', 'armario', 'pct', 2),
  s('farinha-mandioca', 'Farinha de mandioca', 'mercearia', 'armario', 'pct', 1, { every: 2 }),
  s('acucar', 'Açúcar (pacote grande)', 'mercearia', 'armario', 'pct', 1, { every: 3, note: 'compra grande que dura' }),
  s('sal', 'Sal (1 kg)', 'mercearia', 'armario', 'pct', 1, { every: 6 }),
  s('fermento', 'Fermento em pó', 'mercearia', 'armario', 'un', 1, { every: 3 }),
  s('farinha-trigo', 'Farinha de trigo', 'mercearia', 'armario', 'pct', 1, falta({ every: 2, note: 'pra empanar e bolos' })),
  s('milho-lata', 'Milho em lata', 'congelados', 'armario', 'lata', 2, falta({ note: 'escondidinho, salada, recheio' })),

  // Carnes, aves e peixes
  s('file-peito', 'Filé de peito de frango', 'acougue', 'freezer', 'kg', 3, { note: 'grelhar, empanar ou desfiar' }),
  s('coxinha-asa', 'Coxinha da asa', 'acougue', 'freezer', 'kg', 1, { note: 'airfryer' }),
  s('coxa-sobrecoxa', 'Coxa e sobrecoxa', 'acougue', 'freezer', 'kg', 1),
  s('carne-moida', 'Carne moída (patinho)', 'acougue', 'freezer', 'kg', 1.5, { note: 'porcione em saquinhos de 250 g' }),
  s('patinho', 'Patinho (bife ou assado)', 'acougue', 'freezer', 'kg', 1),
  s('cupim', 'Cupim', 'acougue', 'freezer', 'kg', 1, { note: 'mais gordura, fica macio na pressão' }),
  s('acem', 'Acém (pressão/guisado)', 'acougue', 'freezer', 'kg', 1.5),
  s('coxao-mole', 'Coxão mole (bife)', 'acougue', 'freezer', 'kg', 1),
  s('lombo', 'Lombo suíno', 'acougue', 'freezer', 'kg', 1),
  s('linguica', 'Linguiça de porco', 'acougue', 'freezer', 'kg', 1),
  s('bacon', 'Bacon', 'acougue', 'geladeira', 'pct', 1),
  s('salsicha', 'Salsicha', 'acougue', 'geladeira', 'pct', 1, { pairs: ['pao-hotdog'] }),
  s('tilapia', 'Filé de tilápia', 'acougue', 'freezer', 'kg', 1, { origin: 'variar', note: 'vocês enjoaram: deixei desmarcado' }),
  s('merluza', 'Filé de merluza', 'acougue', 'freezer', 'kg', 1, variar('peixe mais barato que tilápia')),
  s('musculo', 'Músculo', 'acougue', 'freezer', 'kg', 1, variar('barato; na pressão desfia e rende 3 refeições')),
  s('peito-osso', 'Peito de frango com osso', 'acougue', 'freezer', 'kg', 1.5, variar('mais barato que filé, ótimo pra desfiar')),
  s('sobrecoxa-desossada', 'Sobrecoxa desossada', 'acougue', 'freezer', 'kg', 1, variar('suculenta na airfryer, mais barata que filé')),
  s('pernil', 'Pernil suíno', 'acougue', 'freezer', 'kg', 1.5, variar('assado rende almoço + sanduíche no pão de forma')),
  s('carne-sol', 'Carne de sol / charque', 'acougue', 'geladeira', 'kg', 0.5, variar('pouca quantidade dá muito sabor (cuscuz, arroz, farofa)')),
  s('figado', 'Fígado bovino', 'acougue', 'freezer', 'kg', 0.5, variar('muito barato e acebolado fica ótimo')),

  // Laticínios e frios
  s('ovos', 'Ovos (bandeja de 30)', 'frios', 'geladeira', 'bandeja', 2),
  s('leite', 'Leite (caixa de 1 L)', 'frios', 'armario', 'cx', 4),
  s('creme-leite', 'Creme de leite', 'frios', 'armario', 'cx', 4),
  s('queijo-ralado', 'Queijo ralado', 'frios', 'geladeira', 'pct', 1),
  s('margarina', 'Margarina (pote grande, da boa)', 'frios', 'geladeira', 'un', 1, { note: 'uma só pra comer e pra assar' }),
  s('queijo-prato', 'Queijo prato / mussarela', 'frios', 'geladeira', 'kg', 0.3, { pairs: ['presunto'] }),
  s('presunto', 'Presunto', 'frios', 'geladeira', 'kg', 0.2, { pairs: ['queijo-prato'] }),
  s('requeijao', 'Requeijão', 'frios', 'geladeira', 'un', 1, variar('com frango desfiado vira recheio de pão de forma')),
  s('iogurte', 'Iogurte (garrafa de 1 L)', 'frios', 'geladeira', 'un', 1, variar('a garrafa sai bem mais barata que os potinhos')),
  s('queijo-coalho', 'Queijo coalho', 'frios', 'geladeira', 'pct', 1, variar('café da manhã com cuscuz ou tapioca')),

  // Verduras, legumes e frutas
  s('tomate', 'Tomate', 'hortifruti', 'fruteira', 'un', 6),
  s('cebola', 'Cebola', 'hortifruti', 'fruteira', 'un', 3),
  s('batata', 'Batata', 'hortifruti', 'fruteira', 'kg', 2),
  s('cenoura', 'Cenoura', 'hortifruti', 'geladeira', 'un', 3),
  s('alface', 'Alface', 'hortifruti', 'geladeira', 'pé', 1),
  s('coentro', 'Coentro', 'hortifruti', 'geladeira', 'maço', 1),
  s('cebolinha', 'Cebolinha', 'hortifruti', 'geladeira', 'maço', 1),
  s('alho', 'Alho', 'hortifruti', 'armario', 'un', 1, { note: 'trança ou cabeças' }),
  s('banana', 'Banana', 'hortifruti', 'fruteira', 'cacho', 1),
  s('laranja', 'Laranja', 'hortifruti', 'fruteira', 'kg', 2),
  s('uva', 'Uva', 'hortifruti', 'geladeira', 'kg', 1),
  s('morango', 'Morango', 'hortifruti', 'geladeira', 'cx', 1, { origin: 'variar', note: 'só em datas especiais' }),
  s('limao', 'Limão', 'hortifruti', 'fruteira', 'un', 6, falta()),
  s('pimentao', 'Pimentão', 'hortifruti', 'geladeira', 'un', 2, falta({ note: 'base de refogado e carne moída' })),

  // Padaria
  s('pao-forma', 'Pão de forma', 'padaria', 'armario', 'pct', 2, { note: 'da marca que vocês gostaram' }),
  s('pao-artesanal', 'Pão artesanal', 'padaria', 'armario', 'un', 1),
  s('torrada', 'Torrada', 'padaria', 'armario', 'pct', 1),
  s('pao-hotdog', 'Pão de cachorro-quente', 'padaria', 'armario', 'pct', 1, { pairs: ['salsicha'] }),
  s('tapioca', 'Goma de tapioca', 'padaria', 'geladeira', 'pct', 1, variar('mais barata que wrap e sustenta')),

  // Óleos e temperos
  s('azeite', 'Azeite', 'temperos', 'armario', 'un', 1),
  s('temperos', 'Temperos da cozinha', 'temperos', 'armario', 'un', 1, { note: 'colorau, cominho, pimenta…' }),
  s('extrato-tomate', 'Extrato de tomate', 'temperos', 'armario', 'un', 1),
  s('maionese', 'Maionese', 'temperos', 'geladeira', 'un', 1),
  s('ketchup', 'Ketchup', 'temperos', 'geladeira', 'un', 1, { every: 2 }),
  s('oleo', 'Óleo', 'temperos', 'armario', 'un', 1, falta({ note: 'não estava nas listas: vocês fritam bastante' })),
  s('molho-tomate', 'Molho de tomate pronto', 'temperos', 'armario', 'un', 2, falta()),
  s('shoyu', 'Shoyu', 'temperos', 'armario', 'un', 1, variar('marinar frango e fazer carne acebolada', { every: 3 })),

  // Congelados e enlatados
  s('batata-frita', 'Batata frita congelada', 'congelados', 'freezer', 'pct', 1),
  s('batata-palha', 'Batata palha', 'congelados', 'armario', 'pct', 1),
  s('sardinha', 'Sardinha em lata', 'congelados', 'armario', 'lata', 2),

  // Café da manhã
  s('nescau', 'Nescau', 'matinais', 'armario', 'un', 1),
  s('cafe', 'Café', 'matinais', 'armario', 'pct', 1, falta()),

  // Bebidas e lanches
  s('polpa', 'Polpa de fruta (Canaã)', 'bebidas', 'freezer', 'pct', 5),
  s('salgadinho', 'Salgadinho', 'besteiras', 'armario', 'pct', 3),
  s('chocolate', 'Bis ou bombom', 'besteiras', 'armario', 'un', 1),
  s('pipoca', 'Pipoca de micro-ondas', 'besteiras', 'armario', 'un', 4),

  // Limpeza
  s('detergente', 'Detergente', 'limpeza', 'limpeza', 'un', 4, { pairs: ['esponja'] }),
  s('amaciante', 'Amaciante', 'limpeza', 'limpeza', 'un', 1, { pairs: ['sabao-liquido'] }),
  s('sabao-liquido', 'Sabão líquido', 'limpeza', 'limpeza', 'un', 1, { note: 'olhar preço na Amazon também', pairs: ['amaciante'] }),
  s('agua-sanitaria', 'Água sanitária', 'limpeza', 'limpeza', 'L', 1),
  s('cif', 'Cif (limpador cremoso)', 'limpeza', 'limpeza', 'un', 1, { every: 2 }),
  s('bombril', 'Bombril', 'limpeza', 'limpeza', 'pct', 1, { every: 2 }),
  s('saco-lixo', 'Saco de lixo', 'limpeza', 'limpeza', 'rolo', 1),
  s('baygon', 'Baygon', 'limpeza', 'limpeza', 'un', 1, { every: 3 }),
  s('esponja', 'Esponja', 'limpeza', 'limpeza', 'pct', 1, falta({ pairs: ['detergente'] })),
  s('desinfetante', 'Desinfetante', 'limpeza', 'limpeza', 'un', 1, falta()),
  s('papel-aluminio', 'Papel alumínio', 'casa', 'armario', 'rolo', 2, { every: 2 }),
  s('papel-filme', 'Papel filme', 'casa', 'armario', 'rolo', 1, { every: 3 }),
  s('papel-toalha', 'Papel toalha', 'casa', 'armario', 'rolo', 2),
  s('saquinho-freezer', 'Saquinhos pra congelar', 'casa', 'armario', 'pct', 1, variar('pra porcionar a carne e fazer durar o mês', { every: 2 })),

  // Higiene
  s('papel-higienico', 'Papel higiênico', 'higiene', 'banheiro', 'pct', 1),
  s('cotonete', 'Cotonete', 'higiene', 'banheiro', 'cx', 1),
  s('pasta-dente', 'Pasta de dente', 'higiene', 'banheiro', 'un', 1),
  s('escova-dente', 'Escova de dentes', 'higiene', 'banheiro', 'un', 1, { every: 3 }),
  s('desodorante', 'Desodorante Dove', 'higiene', 'banheiro', 'un', 2),
  s('sabonete-intimo', 'Sabonete íntimo', 'higiene', 'banheiro', 'un', 1),
  s('aparelho-barbear', 'Aparelho de barbear', 'higiene', 'banheiro', 'pct', 1, { every: 2 }),
  s('lenco-umedecido', 'Lenço umedecido', 'higiene', 'banheiro', 'pct', 1),
  s('sabonete', 'Sabonete', 'higiene', 'banheiro', 'un', 4, falta()),
  s('shampoo', 'Shampoo', 'higiene', 'banheiro', 'un', 1, falta({ pairs: ['condicionador'] })),
  s('condicionador', 'Condicionador', 'higiene', 'banheiro', 'un', 1, falta({ pairs: ['shampoo'] })),
]

/** Palpite de categoria pelo nome, para itens que a pessoa cria na hora. */
const HINTS: [RegExp, CategoryId, PlaceId][] = [
  [/creme de leite|leite condensado|leite de coco/i, 'mercearia', 'armario'],
  [/fruta|verdura|legume|tomate|cebola|batata|alface|banana|ma[çc][ãa]|laranja|lim[ãa]o|abacate|mam[ãa]o|melancia|uva|piment|couve|coentro|cheiro|alho|ab[óo]bora|chuchu|pepino/i, 'hortifruti', 'fruteira'],
  [/carne|frango|peixe|lingui|bacon|costela|picanha|alcatra|patinho|fil[ée]/i, 'acougue', 'freezer'],
  [/queijo|presunto|iogurte|requeij|manteiga|margarina|leite fermentado|ovo|nata/i, 'frios', 'geladeira'],
  [/p[ãa]o|bolo|torrada/i, 'padaria', 'armario'],
  [/caf[ée]|leite|achocolatado|aveia|granola|cereal|biscoito|bolacha|tapioca|cuscuz|geleia/i, 'matinais', 'armario'],
  [/\bsal\b|tempero|molho|ketchup|maionese|mostarda|vinagre|or[ée]gano|colorau|pimenta do reino|shoyu/i, 'temperos', 'armario'],
  [/[áa]gua|refri|suco|cerveja|vinho|coca|guaran/i, 'bebidas', 'armario'],
  [/congelad|lasanha|pizza|nugget|sorvete|hamb[úu]rguer/i, 'congelados', 'freezer'],
  [/chocolate|salgadinho|doce|bala|chiclete|pipoca|bis\b|wafer/i, 'besteiras', 'armario'],
  [/detergente|sab[ãa]o|amaciante|sanit[áa]ria|desinfet|limpador|esponja|lixo|vassoura|pano|[áa]lcool|lustra|cloro|veja|ypê/i, 'limpeza', 'limpeza'],
  [/papel higi|sabonete|shampoo|condicionador|pasta de dente|escova|desodorante|absorvente|fio dental|cotonete|creme|barbear/i, 'higiene', 'banheiro'],
  [/ra[çc][ãa]o|areia|pet|petisco/i, 'pet', 'outros'],
  [/arroz|feij[ãa]o|macarr[ãa]o|a[çc][úu]car|farinha|[óo]leo|azeite|milho|atum|sardinha|creme de leite|condensado|fub[áa]|lentilha|gr[ãa]o/i, 'mercearia', 'armario'],
]

export function guessCategory(name: string): { category: CategoryId; place: PlaceId } {
  for (const [re, category, place] of HINTS) if (re.test(name)) return { category, place }
  return { category: 'outros', place: 'armario' }
}
