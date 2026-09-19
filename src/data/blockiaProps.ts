/**
 * A MOBILIA DE BLOCKIA: onde cada peça de arte fica na cidade.
 *
 * Até aqui Blockia era geometria — tijolo, tábua e lampião, com a arte
 * genérica das ruínas. A cidade funcionava e não era um lugar: a primeira
 * coisa viva em 600 metros de mina tinha a mesma textura de um corredor
 * abandonado.
 *
 * COORDENADA EM NÍVEL + DESLOCAMENTO, nunca absoluta. É a mesma regra dos
 * moradores, e ela existe porque os sete já nasceram dentro da pedra uma vez:
 * escrever coluna e profundidade à mão contra um desenho imaginado erra
 * sempre, e erra em silêncio. Aqui a geometria vem de `blockiaLayout`, que é a
 * mesma função que ESCULPE a cidade — se um terraço se mexer, a mobília dele
 * se mexe junto.
 *
 * `nivel`:
 *   0      = o piso da praça (três patamares em alturas diferentes)
 *   1..5   = terraços da TORRE OESTE, de baixo para cima
 *   6..10  = terraços da TORRE LESTE
 *   11     = a ponte que liga as duas no alto
 * `offset`: colunas a partir da borda esquerda daquele nível.
 *
 * O tamanho de cada peça não está aqui: vem medido de
 * `public/art/blockia/mapa.json`, que o cortador escreve. Repetir o tamanho
 * neste arquivo seria abrir uma segunda verdade para divergir da primeira.
 */

export interface BlockiaProp {
  /** Id da peça de arte (`public/art/blockia/<id>.png`). */
  id: string;
  nivel: number;
  offset: number;
  /**
   * Desenhar ATRÁS do jogador e dos moradores?
   *
   * Fachada, barraca e forja são cenário: o jogador passa na frente delas. Um
   * banco ou um caixote no chão da praça é móvel — passar por trás de um
   * caixote de meio metro parece bug, e é o tipo de coisa que já aconteceu com
   * a arte das bases.
   */
  fundo?: boolean;
  /** Espelha na horizontal. Duas cópias da mesma peça viradas ao contrário
   *  param de parecer a mesma peça. */
  espelhado?: boolean;
}

export const BLOCKIA_PROPS: BlockiaProp[] = [
  // ---------------------------------------------------- praça (nível 0) ----
  /*
   * OS DESLOCAMENTOS SÃO MEDIDOS, e a primeira leva deles não era.
   *
   * Eu escrevi os primeiros a olho e a praça saiu com seis sobreposições: a
   * bancada da forja em cima do primeiro canteiro, o poste dentro da horta, a
   * barraca de hortaliça em cima da leira. Nenhuma quebrou nada — arte não tem
   * colisão — e é exatamente por isso que passariam batidas até alguém jogar.
   *
   * O que o `carveBlockia` já constrói no piso, e que estas peças têm de
   * respeitar (colunas absolutas, com col0 = 132):
   *
   *   ferraria (prédio)   136-144
   *   poço do elevador    138-140
   *   horta (terra)       148-163
   *   barracas de tile    172-177, 178-183, 184-189, 190-195
   *   quadro de missões   194-195
   *
   * `npm run praca` confere isto a cada mudança.
   */

  // A ferraria do Silas ocupa a ponta esquerda, terminando onde a terra começa.
  { id: 'forja_fogo', nivel: 0, offset: 1, fundo: true },
  { id: 'forja_bigorna', nivel: 0, offset: 6, fundo: true },
  { id: 'forja_bancada', nivel: 0, offset: 11, fundo: true },

  /*
   * O Mercado da Ponte, da Nina, cai EM CIMA das barracas de tile que já
   * existem — uma por uma, 6 tiles cada, na mesma coluna. A quarta fica de
   * fora de propósito: é onde está o quadro de missões do Conselho.
   *
   * São ramos diferentes de propósito. Uma cidade que só vende minério é um
   * posto de trabalho; uma que vende pão, pano e ferramenta é gente morando.
   */
  { id: 'barraca_horta', nivel: 0, offset: 40, fundo: true },
  { id: 'barraca_padaria', nivel: 0, offset: 46, fundo: true },
  { id: 'barraca_ferragem', nivel: 0, offset: 52, fundo: true },

  // O vão entre a horta e o mercado: onde a praça respira.
  // 32,1: a terra da horta termina em 31 inclusive, entao 32 ainda e dela.
  { id: 'poste_lanterna', nivel: 0, offset: 32.1, fundo: true },
  { id: 'banco', nivel: 0, offset: 34.5 },
  { id: 'engradados', nivel: 0, offset: 37 },

  // Depois do mercado, onde a cidade vira estoque.
  { id: 'sacos', nivel: 0, offset: 64 },
  { id: 'barris', nivel: 0, offset: 67, espelhado: true },
  { id: 'poste_lanterna', nivel: 0, offset: 71, fundo: true, espelhado: true },
  { id: 'cestos', nivel: 0, offset: 74 },
  { id: 'barraca_tecidos', nivel: 0, offset: 78, fundo: true },
  { id: 'panelas', nivel: 0, offset: 85 },

  // ------------------------------- torre oeste, 1º terraço — a Dra. Irene ---
  /*
   * "Todo mundo acha que cidade subterrânea vive de pedra. Vive de água."
   * A fala dela é a única coisa do jogo que explica por que a cidade existe
   * aqui, e até agora não havia um litro de água em Blockia para sustentá-la.
   */
  { id: 'cisterna', nivel: 1, offset: 1, fundo: true },
  { id: 'bomba', nivel: 1, offset: 4 },
  { id: 'fonte', nivel: 1, offset: 6 },
  { id: 'cano', nivel: 1, offset: 9, fundo: true },
  { id: 'ervas_penduradas', nivel: 1, offset: 11, fundo: true },

  // ------------------------------------ torre leste, 1º terraço — o Lio ----
  { id: 'cama', nivel: 6, offset: 1, fundo: true },
  { id: 'varal', nivel: 6, offset: 4, fundo: true },
  { id: 'mesa', nivel: 6, offset: 7 },
  { id: 'balde', nivel: 6, offset: 10 },

  // ------------------------------------ torre leste, 4º terraço — o Breno --
  /*
   * "Elevador parado é ofensa pessoal." O poço já existe escavado desde o
   * `carveBlockia`; o que faltava era a máquina em volta dele.
   */
  { id: 'sarilho', nivel: 8, offset: 1, fundo: true },
  { id: 'cabine', nivel: 8, offset: 5, fundo: true },
  /* Só três peças: o terraço tem 14 colunas (LARGURA_DECK) e o sarilho mais a
   * cabine já comem nove. Um quarto objeto passaria da ponta do deck e ficaria
   * pendurado no ar. */
  { id: 'caixa_ferramenta', nivel: 8, offset: 10 },

  // ------------------------------- torre oeste, 5º terraço — o Afonso ------
  /*
   * O arquivista. Estante, escrivaninha e vela: o lugar onde está guardada a
   * página que a mãe do Elias nunca viu.
   */
  { id: 'prateleira', nivel: 5, offset: 1, fundo: true },
  { id: 'escrivaninha', nivel: 5, offset: 4 },
  { id: 'vasos', nivel: 5, offset: 7 },
  { id: 'cestos', nivel: 5, offset: 9, espelhado: true },

  // ------------------------------------------------ a ponte (nível 11) -----
  /*
   * Só luz, e é o bastante. A ponte atravessa o átrio a quarenta tiles do
   * chão: o que ela tem a oferecer é a vista da praça inteira embaixo, e
   * qualquer móvel ali competiria com isso. Os dois postes existem porque uma
   * travessia no escuro sobre um vão não convida ninguém a atravessar.
   */
  { id: 'poste_lanterna', nivel: 11, offset: 6, fundo: true },
  { id: 'poste_lanterna', nivel: 11, offset: 48, fundo: true, espelhado: true },
];

export const BLOCKIA_HORTA: { id: string; offset: number }[] = [
  { id: 'canteiro_folha', offset: 0 },
  { id: 'canteiro_erva', offset: 3 },
  { id: 'canteiro_raiz', offset: 6 },
  { id: 'leira', offset: 9 },
  // 12, e não 13: a terra vai de col0+16 a col0+31, e o tanque tem 2,4 tiles.
  // Em 13 ele terminava colado na borda, com a barraca seguinte já em cima.
  { id: 'tanque', offset: 12 },
];

/** Onde a terra da horta começa e termina, em colunas a partir de col0.
 *  Vem de `carveBlockia`, que planta `dirt` de col0+16 a col0+31. */
export const HORTA_COL0 = 16;
export const HORTA_COL1 = 31;
