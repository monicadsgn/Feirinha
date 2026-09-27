/**
 * Receitas da casa: pensadas pro que vocês já compram, pra variar a carne e
 * fazer a proteína durar o mês. "grams" é quanta carne a receita gasta e
 * "serves" quantas refeições do casal ela rende (sobra conta).
 */

import type { Meal } from './types'

export type { Meal }

export interface BuiltinRecipe {
  id: string
  name: string
  meals: Meal[]
  /** Itens do catálogo usados (ids). O primeiro grupo é a proteína. */
  protein?: string[]
  grams?: number
  serves: number
  minutes: number
  uses: string[]
  /** Ingredientes que não precisam estar na despensa (água, sal…). */
  pantry?: string
  steps: string[]
  tip?: string
  tags?: string[]
}

export const MEAL_LABEL: Record<Meal, string> = { cafe: 'Café da manhã', almoco: 'Almoço', jantar: 'Jantar' }

const carneMoida = ['carne-moida']
const frango = ['file-peito', 'peito-osso', 'sobrecoxa-desossada']

export const RECIPES: BuiltinRecipe[] = [
  // ---------- Carne moída: 1 kg vira 4 refeições em vez de 2 ----------
  {
    id: 'escondidinho-carne',
    name: 'Escondidinho de carne moída',
    meals: ['almoco', 'jantar'],
    protein: carneMoida,
    grams: 250,
    serves: 2,
    minutes: 45,
    uses: ['carne-moida', 'batata', 'cebola', 'alho', 'queijo-ralado', 'margarina', 'leite'],
    steps: [
      'Cozinhe 4 batatas e amasse com 1 colher de margarina e um pouco de leite até virar purê.',
      'Refogue alho e cebola, junte 250 g de carne moída, Sazón e cozinhe até secar.',
      'Numa travessa: carne embaixo, purê em cima, queijo ralado por cima.',
      'Forno ou airfryer por 15 min até dourar.',
    ],
    tip: 'Com 250 g de carne dá almoço e janta. A batata faz o volume.',
    tags: ['rende sobra'],
  },
  {
    id: 'almondega-airfryer',
    name: 'Almôndega na airfryer com molho',
    meals: ['almoco', 'jantar'],
    protein: carneMoida,
    grams: 250,
    serves: 2,
    minutes: 35,
    uses: ['carne-moida', 'ovos', 'pao-forma', 'cebola', 'alho', 'extrato-tomate', 'macarrao-espaguete'],
    steps: [
      'Misture 250 g de carne, 1 ovo, 1 fatia de pão de forma esfarelada, cebola picada, alho e sal.',
      'Faça bolinhas e asse na airfryer a 200 °C por 12–15 min.',
      'Molho: extrato de tomate com água, alho e orégano. Junte as almôndegas.',
      'Sirva com macarrão ou arroz.',
    ],
    tip: 'O pão e o ovo aumentam a massa: rende umas 14 almôndegas.',
  },
  {
    id: 'cuscuz-recheado',
    name: 'Cuscuz recheado com carne moída',
    meals: ['cafe', 'jantar'],
    protein: carneMoida,
    grams: 150,
    serves: 2,
    minutes: 25,
    uses: ['cuscuz', 'carne-moida', 'cebola', 'tomate', 'coentro', 'queijo-coalho'],
    steps: [
      'Hidrate o flocão com água e sal e cozinhe na cuscuzeira.',
      'Refogue 150 g de carne com cebola, tomate e coentro.',
      'Sirva o cuscuz com a carne por cima (e queijo coalho, se tiver).',
    ],
    tip: 'Pouca carne, muito sabor. Ótimo pra sobra de carne moída.',
  },
  {
    id: 'omelete-carne',
    name: 'Omelete com carne moída',
    meals: ['cafe', 'jantar'],
    protein: carneMoida,
    grams: 100,
    serves: 1,
    minutes: 15,
    uses: ['ovos', 'carne-moida', 'tomate', 'cebolinha'],
    steps: ['Bata 4 ovos com sal.', 'Na frigideira, esquente 100 g de carne moída já refogada.', 'Jogue os ovos por cima, tampe e deixe firmar.'],
    tip: 'Use a sobra do refogado de outro dia.',
  },
  {
    id: 'misto-carne',
    name: 'Misto de carne moída no pão de forma',
    meals: ['cafe', 'jantar'],
    protein: carneMoida,
    grams: 100,
    serves: 1,
    minutes: 15,
    uses: ['pao-forma', 'carne-moida', 'queijo-prato', 'margarina'],
    steps: ['Recheie o pão com carne moída refogada e queijo.', 'Passe margarina por fora e doure na frigideira ou airfryer.'],
    tags: ['lanche'],
  },
  {
    id: 'bolonhesa',
    name: 'Macarrão à bolonhesa',
    meals: ['almoco', 'jantar'],
    protein: carneMoida,
    grams: 250,
    serves: 2,
    minutes: 30,
    uses: ['macarrao-espaguete', 'carne-moida', 'extrato-tomate', 'cebola', 'alho', 'queijo-ralado'],
    steps: ['Refogue alho, cebola e 250 g de carne.', 'Junte extrato de tomate com 1 copo de água e deixe apurar 10 min.', 'Misture no macarrão e finalize com queijo ralado.'],
  },
  {
    id: 'lasanha',
    name: 'Lasanha (atenção: gasta muita carne)',
    meals: ['almoco'],
    protein: carneMoida,
    grams: 1000,
    serves: 2,
    minutes: 60,
    uses: ['carne-moida', 'presunto', 'queijo-prato', 'extrato-tomate', 'creme-leite'],
    steps: ['Monte camadas de massa, molho de carne, presunto e queijo.', 'Forno por 30 min.'],
    tip: 'Usa 1 kg de carne pra 2 refeições. Se quiser lasanha, faça com 500 g e mais molho, ou escolha o escondidinho.',
  },

  // ---------- Frango desfiado: cozinha uma vez, usa a semana toda ----------
  {
    id: 'frango-desfiado-base',
    name: 'Frango desfiado (base da semana)',
    meals: ['almoco', 'jantar'],
    protein: frango,
    grams: 1000,
    serves: 5,
    minutes: 40,
    uses: ['file-peito', 'cebola', 'alho', 'tomate', 'sazon'],
    steps: [
      'Cozinhe 1 kg de frango na pressão com água, sal e Sazón por 15 min.',
      'Desfie com dois garfos (ou na batedeira, 1 min).',
      'Refogue com alho, cebola e tomate.',
      'Separe em potes: vira tapioca, sanduíche, fricassê e cuscuz ao longo da semana.',
    ],
    tip: '1 kg desfiado rende umas 5 refeições diferentes. Congela bem.',
    tags: ['rende sobra', 'base'],
  },
  {
    id: 'tapioca-frango',
    name: 'Tapioca de frango com requeijão',
    meals: ['cafe', 'jantar'],
    protein: frango,
    grams: 100,
    serves: 1,
    minutes: 10,
    uses: ['tapioca', 'file-peito', 'requeijao'],
    steps: ['Espalhe a goma na frigideira quente até firmar.', 'Recheie com frango desfiado e requeijão e dobre.'],
    tip: 'Substitui o wrap: mais barato e sustenta.',
  },
  {
    id: 'sanduiche-frango',
    name: 'Sanduíche de frango no pão de forma',
    meals: ['cafe', 'jantar'],
    protein: frango,
    grams: 100,
    serves: 1,
    minutes: 10,
    uses: ['pao-forma', 'file-peito', 'maionese', 'milho-lata', 'alface', 'cenoura'],
    steps: ['Misture frango desfiado com maionese, milho e cenoura ralada.', 'Monte no pão de forma com alface.'],
  },
  {
    id: 'fricasse',
    name: 'Fricassê de frango',
    meals: ['almoco', 'jantar'],
    protein: frango,
    grams: 300,
    serves: 2,
    minutes: 30,
    uses: ['file-peito', 'creme-leite', 'milho-lata', 'requeijao', 'batata-palha', 'queijo-ralado'],
    steps: ['Misture frango desfiado, creme de leite, milho e requeijão.', 'Coloque numa travessa, queijo ralado por cima, 15 min no forno.', 'Batata palha na hora de servir.'],
    tags: ['rende sobra'],
  },
  {
    id: 'cuscuz-frango',
    name: 'Cuscuz com frango e ovo',
    meals: ['cafe', 'jantar'],
    protein: frango,
    grams: 100,
    serves: 2,
    minutes: 20,
    uses: ['cuscuz', 'file-peito', 'ovos', 'coentro'],
    steps: ['Faça o cuscuz.', 'Esquente o frango desfiado com coentro.', 'Sirva com ovo frito ou mexido.'],
  },
  {
    id: 'file-empanado',
    name: 'Filé de frango empanado na airfryer',
    meals: ['almoco'],
    protein: frango,
    grams: 300,
    serves: 1,
    minutes: 25,
    uses: ['file-peito', 'ovos', 'farinha-trigo', 'farinha-mandioca'],
    steps: ['Tempere os filés.', 'Passe na farinha de trigo, no ovo e na farinha de mandioca.', 'Airfryer a 200 °C por 15 min, virando na metade.'],
  },
  {
    id: 'coxinha-airfryer',
    name: 'Coxinha da asa na airfryer',
    meals: ['almoco', 'jantar'],
    protein: ['coxinha-asa'],
    grams: 500,
    serves: 2,
    minutes: 30,
    uses: ['coxinha-asa', 'alho', 'limao', 'paprica'],
    steps: ['Tempere com alho, limão, sal e páprica (de véspera fica melhor).', 'Airfryer a 200 °C por 25 min, virando na metade.'],
  },
  {
    id: 'sobrecoxa-batata',
    name: 'Coxa e sobrecoxa assada com batata',
    meals: ['almoco'],
    protein: ['coxa-sobrecoxa', 'sobrecoxa-desossada'],
    grams: 1000,
    serves: 3,
    minutes: 60,
    uses: ['coxa-sobrecoxa', 'batata', 'cebola', 'alho', 'azeite'],
    steps: ['Tempere o frango com alho, sal e azeite.', 'Asse com batatas e cebola em rodelas por 45 min.'],
    tags: ['rende sobra'],
  },

  // ---------- Carnes de panela: 1 kg vira 3 pratos diferentes ----------
  {
    id: 'carne-panela',
    name: 'Carne de panela (acém, cupim ou músculo)',
    meals: ['almoco'],
    protein: ['acem', 'cupim', 'musculo'],
    grams: 1000,
    serves: 4,
    minutes: 70,
    uses: ['acem', 'batata', 'cenoura', 'cebola', 'alho', 'extrato-tomate'],
    steps: [
      'Sele a carne em pedaços, junte alho, cebola e extrato.',
      'Pressão com água por 40 min.',
      'Junte batata e cenoura e cozinhe mais 10 min.',
      'Separe metade antes de servir: desfiada, vira cuscuz, escondidinho ou sanduíche.',
    ],
    tip: 'Em vez de comer tudo na semana, metade vira outro prato. Assim o cupim não some em 3 dias.',
    tags: ['rende sobra', 'base'],
  },
  {
    id: 'escondidinho-desfiada',
    name: 'Escondidinho de carne desfiada',
    meals: ['almoco', 'jantar'],
    protein: ['acem', 'cupim', 'musculo', 'carne-sol'],
    grams: 300,
    serves: 2,
    minutes: 40,
    uses: ['batata', 'queijo-ralado', 'margarina', 'leite'],
    steps: ['Use a carne de panela desfiada.', 'Purê de batata por cima, queijo ralado e forno por 15 min.'],
  },
  {
    id: 'bife-acebolado',
    name: 'Bife acebolado',
    meals: ['almoco'],
    protein: ['patinho', 'coxao-mole', 'figado'],
    grams: 300,
    serves: 1,
    minutes: 20,
    uses: ['patinho', 'cebola', 'alho'],
    steps: ['Tempere os bifes com alho e sal.', 'Frite em frigideira bem quente.', 'Na mesma frigideira, cebola em rodelas até dourar.'],
    tip: 'Bate o bife com o martelo pra render mais e ficar macio.',
  },
  {
    id: 'lombo-assado',
    name: 'Lombo assado (almoço + sanduíche)',
    meals: ['almoco', 'jantar'],
    protein: ['lombo', 'pernil'],
    grams: 1000,
    serves: 4,
    minutes: 80,
    uses: ['lombo', 'alho', 'limao', 'cebola'],
    steps: ['Tempere de véspera com alho, limão e sal.', 'Asse coberto com papel alumínio por 50 min, depois descoberto por 20.', 'O que sobrar, fatie fino: vira sanduíche no pão de forma.'],
    tags: ['rende sobra'],
  },
  {
    id: 'linguica-acebolada',
    name: 'Linguiça acebolada com farofa',
    meals: ['almoco', 'jantar'],
    protein: ['linguica'],
    grams: 500,
    serves: 2,
    minutes: 25,
    uses: ['linguica', 'cebola', 'farinha-mandioca', 'ovos', 'margarina'],
    steps: ['Frite a linguiça em rodelas com cebola.', 'Na mesma panela, margarina, ovo mexido e farinha de mandioca: farofa pronta.'],
  },
  {
    id: 'cachorro-quente',
    name: 'Cachorro-quente de panela',
    meals: ['jantar'],
    protein: ['salsicha'],
    grams: 250,
    serves: 2,
    minutes: 20,
    uses: ['salsicha', 'pao-hotdog', 'extrato-tomate', 'cebola', 'milho-lata', 'ervilha-lata', 'batata-palha'],
    steps: ['Refogue cebola, junte extrato com água e a salsicha em rodelas.', 'Milho e ervilha no fim.', 'No pão, com batata palha.'],
  },
  {
    id: 'sardinha-tomate',
    name: 'Sardinha com tomate e cebola',
    meals: ['jantar', 'cafe'],
    protein: ['sardinha'],
    grams: 125,
    serves: 1,
    minutes: 10,
    uses: ['sardinha', 'tomate', 'cebola', 'coentro', 'cuscuz'],
    steps: ['Refogue cebola e tomate.', 'Junte a sardinha e coentro.', 'Com cuscuz ou pão.'],
    tip: 'Proteína barata de armário pra quando a carne acabar.',
  },

  // ---------- Café da manhã sem carne ----------
  {
    id: 'cuscuz-ovo',
    name: 'Cuscuz com ovo e queijo coalho',
    meals: ['cafe'],
    serves: 2,
    minutes: 15,
    uses: ['cuscuz', 'ovos', 'queijo-coalho', 'margarina'],
    steps: ['Faça o cuscuz com margarina.', 'Ovo frito ou mexido e queijo coalho na chapa.'],
  },
  {
    id: 'pao-ovo-airfryer',
    name: 'Pão de forma com ovo na airfryer',
    meals: ['cafe'],
    serves: 1,
    minutes: 10,
    uses: ['pao-forma', 'ovos', 'queijo-prato'],
    steps: ['Afunde o miolo do pão com uma colher.', 'Quebre um ovo no buraco, queijo em volta.', 'Airfryer a 180 °C por 6–8 min.'],
  },
  {
    id: 'tapioca-queijo',
    name: 'Tapioca de queijo coalho',
    meals: ['cafe'],
    serves: 1,
    minutes: 10,
    uses: ['tapioca', 'queijo-coalho', 'margarina'],
    steps: ['Goma na frigideira até firmar.', 'Queijo coalho ralado ou em cubinhos, dobre e sirva.'],
  },
  {
    id: 'vitamina-banana',
    name: 'Vitamina de banana com Nescau',
    meals: ['cafe'],
    serves: 2,
    minutes: 5,
    uses: ['banana', 'leite', 'nescau'],
    steps: ['Bata 2 bananas com 500 ml de leite e 2 colheres de Nescau.'],
  },
]
