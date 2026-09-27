import type { CategoryId, PlaceId, Unit } from './types'

export const CATEGORIES: Record<CategoryId, { label: string; emoji: string }> = {
  hortifruti: { label: 'Hortifruti', emoji: '🥬' },
  acougue: { label: 'Açougue', emoji: '🥩' },
  frios: { label: 'Frios e laticínios', emoji: '🧀' },
  padaria: { label: 'Padaria', emoji: '🍞' },
  mercearia: { label: 'Mercearia', emoji: '🍚' },
  matinais: { label: 'Café da manhã', emoji: '☕' },
  temperos: { label: 'Temperos e molhos', emoji: '🧂' },
  bebidas: { label: 'Bebidas', emoji: '🧃' },
  congelados: { label: 'Congelados', emoji: '🧊' },
  besteiras: { label: 'Besteiras', emoji: '🍫' },
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

export const UNITS: Unit[] = ['un', 'pct', 'kg', 'g', 'L', 'cx', 'dz', 'lata', 'rolo']

/** Lojas iniciais. A chave vira o id. */
export const SEED_SHOPS = [
  { key: 'atacadao', name: 'Atacadão', emoji: '🛒' },
  { key: 'hortifruti', name: 'Sacolão / feira', emoji: '🥕' },
  { key: 'mercadinho', name: 'Mercadinho do bairro', emoji: '🏪' },
] as const

export type SeedShop = (typeof SEED_SHOPS)[number]['key']

export interface SeedItem {
  key: string
  name: string
  category: CategoryId
  place: PlaceId
  unit: Unit
  qty: number
  shop: SeedShop
  pairs?: string[]
}

const s = (
  key: string,
  name: string,
  category: CategoryId,
  place: PlaceId,
  unit: Unit,
  qty: number,
  shop: SeedShop = 'atacadao',
  pairs?: string[],
): SeedItem => ({ key, name, category, place, unit, qty, shop, pairs })

/** Catálogo inicial com itens comuns de casa brasileira. A pessoa escolhe quais usa. */
export const SEED_ITEMS: SeedItem[] = [
  // Mercearia
  s('arroz', 'Arroz 5kg', 'mercearia', 'armario', 'pct', 1, 'atacadao', ['feijao']),
  s('feijao', 'Feijão 1kg', 'mercearia', 'armario', 'pct', 2, 'atacadao', ['arroz']),
  s('macarrao', 'Macarrão', 'mercearia', 'armario', 'pct', 4, 'atacadao', ['molho-tomate', 'queijo-ralado']),
  s('acucar', 'Açúcar 5kg', 'mercearia', 'armario', 'pct', 1),
  s('sal', 'Sal', 'temperos', 'armario', 'pct', 1),
  s('oleo', 'Óleo', 'mercearia', 'armario', 'un', 2),
  s('azeite', 'Azeite', 'mercearia', 'armario', 'un', 1),
  s('farinha-trigo', 'Farinha de trigo', 'mercearia', 'armario', 'pct', 1, 'atacadao', ['fermento']),
  s('fermento', 'Fermento em pó', 'mercearia', 'armario', 'un', 1),
  s('farofa', 'Farofa pronta', 'mercearia', 'armario', 'pct', 1),
  s('milho-lata', 'Milho em lata', 'mercearia', 'armario', 'lata', 2),
  s('atum', 'Atum em lata', 'mercearia', 'armario', 'lata', 3),
  s('sardinha', 'Sardinha', 'mercearia', 'armario', 'lata', 2),
  s('creme-leite', 'Creme de leite', 'mercearia', 'armario', 'cx', 3),
  s('leite-condensado', 'Leite condensado', 'mercearia', 'armario', 'cx', 2),
  s('molho-tomate', 'Molho de tomate', 'temperos', 'armario', 'un', 4, 'atacadao', ['macarrao']),
  s('extrato-tomate', 'Extrato de tomate', 'temperos', 'armario', 'un', 1),
  s('tempero', 'Tempero pronto', 'temperos', 'armario', 'un', 1),
  s('maionese', 'Maionese', 'temperos', 'geladeira', 'un', 1),
  s('ketchup', 'Ketchup', 'temperos', 'geladeira', 'un', 1),
  s('vinagre', 'Vinagre', 'temperos', 'armario', 'un', 1),
  // Café da manhã
  s('cafe', 'Café 500g', 'matinais', 'armario', 'pct', 2, 'atacadao', ['filtro-cafe', 'acucar']),
  s('filtro-cafe', 'Filtro de café', 'matinais', 'armario', 'cx', 1, 'atacadao', ['cafe']),
  s('leite', 'Leite', 'matinais', 'armario', 'L', 12),
  s('achocolatado', 'Achocolatado', 'matinais', 'armario', 'un', 1),
  s('aveia', 'Aveia', 'matinais', 'armario', 'un', 1),
  s('biscoito', 'Biscoito', 'matinais', 'armario', 'pct', 4),
  s('tapioca', 'Goma de tapioca', 'matinais', 'geladeira', 'pct', 2),
  s('cuscuz', 'Flocão de milho (cuscuz)', 'matinais', 'armario', 'pct', 2),
  // Padaria
  s('pao-forma', 'Pão de forma', 'padaria', 'armario', 'pct', 2, 'mercadinho', ['manteiga', 'queijo', 'presunto']),
  // Frios
  s('manteiga', 'Manteiga / margarina', 'frios', 'geladeira', 'un', 2),
  s('queijo', 'Queijo mussarela', 'frios', 'geladeira', 'kg', 0.5, 'atacadao', ['presunto']),
  s('presunto', 'Presunto', 'frios', 'geladeira', 'kg', 0.5, 'atacadao', ['queijo']),
  s('requeijao', 'Requeijão', 'frios', 'geladeira', 'un', 2),
  s('iogurte', 'Iogurte', 'frios', 'geladeira', 'un', 4),
  s('ovos', 'Ovos', 'frios', 'geladeira', 'dz', 3),
  s('queijo-ralado', 'Queijo ralado', 'frios', 'geladeira', 'pct', 1, 'atacadao', ['macarrao']),
  // Açougue / congelados
  s('frango', 'Frango (filé)', 'acougue', 'freezer', 'kg', 3),
  s('carne-moida', 'Carne moída', 'acougue', 'freezer', 'kg', 2),
  s('carne', 'Carne (bife / cozido)', 'acougue', 'freezer', 'kg', 2),
  s('linguica', 'Linguiça', 'acougue', 'freezer', 'kg', 1),
  s('hamburguer', 'Hambúrguer', 'congelados', 'freezer', 'cx', 1),
  s('batata-frita', 'Batata congelada', 'congelados', 'freezer', 'pct', 1),
  // Hortifruti
  s('tomate', 'Tomate', 'hortifruti', 'fruteira', 'kg', 1, 'hortifruti'),
  s('cebola', 'Cebola', 'hortifruti', 'fruteira', 'kg', 1, 'hortifruti'),
  s('alho', 'Alho', 'hortifruti', 'armario', 'un', 1, 'hortifruti'),
  s('batata', 'Batata', 'hortifruti', 'fruteira', 'kg', 1, 'hortifruti'),
  s('cenoura', 'Cenoura', 'hortifruti', 'geladeira', 'kg', 0.5, 'hortifruti'),
  s('alface', 'Alface', 'hortifruti', 'geladeira', 'un', 1, 'hortifruti'),
  s('banana', 'Banana', 'hortifruti', 'fruteira', 'dz', 1, 'hortifruti'),
  s('maca', 'Maçã', 'hortifruti', 'fruteira', 'kg', 1, 'hortifruti'),
  s('limao', 'Limão', 'hortifruti', 'fruteira', 'kg', 0.5, 'hortifruti'),
  // Bebidas
  s('agua', 'Água mineral', 'bebidas', 'outros', 'L', 6),
  s('refrigerante', 'Refrigerante', 'bebidas', 'armario', 'un', 2),
  s('suco', 'Suco', 'bebidas', 'armario', 'L', 2),
  // Besteiras
  s('chocolate', 'Chocolate', 'besteiras', 'armario', 'un', 2),
  s('salgadinho', 'Salgadinho', 'besteiras', 'armario', 'pct', 2),
  s('pipoca', 'Milho de pipoca', 'besteiras', 'armario', 'pct', 1),
  // Limpeza
  s('detergente', 'Detergente', 'limpeza', 'limpeza', 'un', 4, 'atacadao', ['esponja']),
  s('esponja', 'Esponja', 'limpeza', 'limpeza', 'pct', 1, 'atacadao', ['detergente']),
  s('sabao-po', 'Sabão em pó / líquido', 'limpeza', 'limpeza', 'un', 1, 'atacadao', ['amaciante']),
  s('amaciante', 'Amaciante', 'limpeza', 'limpeza', 'un', 1, 'atacadao', ['sabao-po']),
  s('agua-sanitaria', 'Água sanitária', 'limpeza', 'limpeza', 'L', 2),
  s('desinfetante', 'Desinfetante', 'limpeza', 'limpeza', 'un', 2),
  s('multiuso', 'Limpador multiuso', 'limpeza', 'limpeza', 'un', 1),
  s('saco-lixo', 'Saco de lixo', 'limpeza', 'limpeza', 'rolo', 2),
  s('pano-chao', 'Pano de chão', 'limpeza', 'limpeza', 'un', 1),
  s('papel-toalha', 'Papel toalha', 'casa', 'armario', 'rolo', 2),
  s('papel-aluminio', 'Papel alumínio / filme', 'casa', 'armario', 'rolo', 1),
  // Higiene
  s('papel-higienico', 'Papel higiênico', 'higiene', 'banheiro', 'pct', 2),
  s('sabonete', 'Sabonete', 'higiene', 'banheiro', 'un', 6),
  s('shampoo', 'Shampoo', 'higiene', 'banheiro', 'un', 1, 'atacadao', ['condicionador']),
  s('condicionador', 'Condicionador', 'higiene', 'banheiro', 'un', 1, 'atacadao', ['shampoo']),
  s('pasta-dente', 'Pasta de dente', 'higiene', 'banheiro', 'un', 2),
  s('desodorante', 'Desodorante', 'higiene', 'banheiro', 'un', 2),
  s('absorvente', 'Absorvente', 'higiene', 'banheiro', 'pct', 2),
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
