import { CONFIG } from './config';
import { POSTO_NOVE } from './outpost';
import { BLOCKIA_PLANTA } from './cidades/blockia';

/**
 * CHEGAR A UM LUGAR tambem e progresso.
 *
 * As etapas "siga os gritos de Jonas", "localize a primeira lanterna",
 * "chegue a camara do cristal" esperavam flags que nada no jogo ligava — a
 * etapa nunca terminava e, sendo a primeira em aberto, escondia do mapa o alvo
 * da missao. Cada gatilho aqui liga uma flag quando o jogador entra no raio,
 * e diz em uma linha o que ele achou.
 *
 * `marcador` poe o lugar no mapa (e na bussola, quando a etapa aponta para
 * ele). Sem marcador, a etapa aponta para um lugar que ja existe no mapa.
 */
export interface ZoneTriggerDef {
  id: string;
  flag: string;
  col: number;
  row: number;
  /** Raio em tiles. */
  raio: number;
  texto: string;
  marcador?: string;
  /** So dispara depois desta flag (o passeio com a Mara so vale depois de conhece-la). */
  requires?: string;
}

const R = CONFIG.world.surfaceRow;

/*
 * As lanternas do caminho ate o lampiao (340 m). A primeira e a segunda ficam
 * acesas em nichos na descida; a terceira, apagada, na sala do lampiao — e e
 * ela que o jogador conserta. Elas moram aqui porque o WorldGen escava os
 * nichos e o gatilho precisa do mesmo lugar.
 */
export const LANTERNAS = {
  primeira: { col: 66, row: R + 318 },
  segunda: { col: 64, row: R + 329 },
  terceira: { col: 58, row: R + 340 },
};

/** Um ponto da planta de Blockia, para gatilho dentro da cidade. */
function naBlockia(pisoId: string, x: number): { col: number; row: number } {
  const p = BLOCKIA_PLANTA.pisos.find((q) => q.id === pisoId)!;
  return { col: BLOCKIA_PLANTA.col0 + x, row: R + p.pe };
}

export const ZONE_TRIGGERS: ZoneTriggerDef[] = [
  {
    id: 'zona_jonas',
    flag: 'm2_jonas_sala',
    col: 74,
    row: R + 84,
    raio: 7,
    texto: 'A voz vem de tras desta pedra. Jonas esta logo ali — e a galeria em volta dele esta solta.',
  },
  {
    id: 'lanterna_1',
    flag: 'm3d_lanterna_1',
    col: LANTERNAS.primeira.col,
    row: LANTERNAS.primeira.row,
    raio: 3,
    texto: 'Uma lanterna acesa, pregada na rocha. A chama e azul. Alguem marca este caminho.',
    marcador: 'Lanterna azul',
  },
  {
    id: 'lanterna_3',
    flag: 'm3d_lanterna_3',
    col: LANTERNAS.terceira.col,
    row: LANTERNAS.terceira.row,
    raio: 3,
    texto: 'A terceira lanterna esta apagada. O pavio foi cortado, nao queimou. Alguem nao queria esta luz aqui.',
    marcador: 'Lanterna apagada',
  },
  {
    id: 'camara_cristal',
    flag: 'm4b_camara',
    col: 49,
    row: R + 396,
    raio: 10,
    texto: 'A camara do refinador. Tem pedra empilhada na entrada — nao caiu. Alguem fechou isto por dentro.',
  },
  {
    id: 'zona_vilma',
    flag: 'm5_vilma_zona',
    col: 80,
    row: R + 460,
    raio: 8,
    texto: 'Tilintar de cristal, ritmado. Tres longos, dois curtos. Vilma esta batendo na pedra com o mesmo sinal do caderno.',
  },
  /*
   * O PASSEIO DA MARA (M6, "A Cidade que Escolheu Ficar"): ela mostra
   * mercado, horta, praca e elevador. Cada parada e dita na voz dela quando o
   * jogador chega, e a ultima fala e com ela, de volta na Guarita.
   */
  {
    id: 'tour_mercado', flag: 'blockia_tour_mercado', ...naBlockia('mercado', 29), raio: 5, requires: 'mara_avelar',
    texto: 'Mara: "O Mercado da Ponte. Aqui ninguem vende o que nao plantou, cavou ou consertou."',
  },
  {
    id: 'tour_horta', flag: 'blockia_tour_horta', ...naBlockia('horta', 30), raio: 5, requires: 'mara_avelar',
    texto: 'Mara: "A horta. Agua da cascata, luz de lampiao e paciencia. E o que sustenta a cidade de verdade."',
    marcador: 'Horta Suspensa',
  },
  {
    id: 'tour_praca', flag: 'blockia_tour_praca', ...naBlockia('reservatorio', 50), raio: 4, requires: 'mara_avelar',
    texto: 'Mara: "A praca do reservatorio. Todo mundo passa aqui duas vezes por dia, nem que seja para ver a agua cair."',
  },
  {
    id: 'tour_elevador', flag: 'blockia_tour_elevador', ...naBlockia('forja', 97), raio: 4, requires: 'mara_avelar',
    texto: 'Mara: "O elevador leste. Quando ele para, a cidade vira duas — e o Breno vira insuportavel."',
    marcador: 'Elevador leste',
  },
];

/**
 * UM ENCONTRO DE HISTORIA: uma flag chama uma leva de bichos num lugar, e a
 * leva derrubada liga outra flag.
 *
 * Nasceu como a defesa do Posto Nove (a etapa "sobreviva ao encontro"
 * esperava `posto_nove_defendido` e nada ligava essa flag — a missao travava
 * o selo do Cristal). A cisterna de Blockia e o mesmo desenho: abrir a grade
 * solta o que mora no fundo dela.
 */
export interface EncontroDef {
  id: string;
  requires: string;
  flag: string;
  leva: { id: string; col: number }[];
  /** Linha onde a leva nasce. */
  row: number;
  /** A leva so nasce com o jogador perto, em tiles. */
  alcance: number;
  inicio: string;
  fim: string;
  /**
   * Nasce dentro de uma cidade? Cidade e zona segura: bicho ali some no
   * quadro seguinte, e a leva nunca terminaria de nascer.
   */
  naCidade?: boolean;
}

const cisterna = BLOCKIA_PLANTA.pisos.find((p) => p.id === 'reservatorio')!;

export const ENCONTROS: EncontroDef[] = [
  {
    id: 'posto_nove',
    requires: 'posto_nove_gerador',
    flag: 'posto_nove_defendido',
    // Bichos da Camada de Pedra, nas pontas e no meio do posto. O gerador
    // aceso e a primeira luz forte a 278 m em quatorze anos.
    leva: [
      { id: 'aranha', col: POSTO_NOVE.col + 2 },
      { id: 'morcego', col: POSTO_NOVE.col + Math.floor(POSTO_NOVE.largura / 2) },
      { id: 'aranha', col: POSTO_NOVE.col + POSTO_NOVE.largura - 2 },
    ],
    row: R + POSTO_NOVE.depth - 2,
    alcance: 24,
    inicio: 'O gerador tosse e acende. A luz corre pelos trilhos — e alguma coisa no escuro corre na direcao dela.',
    fim: 'Rui abre a porta da casinha: "Faz um ano que ninguem segura esta linha assim. Entra, antes que venha mais."',
  },
  {
    id: 'cisterna_blockia',
    requires: 'blockia_ninho_aberto',
    flag: 'blockia_ninho_limpo',
    leva: [45, 50, 55].map((x) => ({ id: 'limo', col: BLOCKIA_PLANTA.col0 + x })),
    row: R + cisterna.pe,
    alcance: 20,
    inicio: 'A grade cede e o fundo da cisterna se mexe. Limo — e muito. Sem estragar a agua, Irene pediu.',
    fim: 'O ultimo limo se desfaz. Agora da para abrir a valvula sem sujar a reserva da cidade.',
    naCidade: true,
  },
];
