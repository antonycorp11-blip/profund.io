/**
 * Definicao de todos os blocos do mundo.
 * O tilemap guarda apenas o `id` numerico; tudo o mais vem daqui.
 * Trocar cores por sprites depois nao exige mudar gameplay.
 */

import type { Rarity, ResourceId } from './resources';

export type BlockType = 'ar' | 'terreno' | 'minerio' | 'estrutura' | 'especial';

/**
 * Etiquetas de bloco. Skills e procs consultam isto em vez de olhar o id:
 * "fratura nao afeta blocos `ancient`", "jackpot so em `ore`", etc.
 */
export type BlockTag =
  | 'soil'
  | 'stone'
  | 'hardStone'
  | 'ore'
  | 'rareOre'
  | 'ancient'
  | 'indestructible'
  | 'special'
  | 'quest'
  | 'boss';

export interface BlockDef {
  /** Id numerico gravado no tilemap. */
  id: number;
  /** Chave legivel (debug / save / worldgen). */
  key: string;
  name: string;
  type: BlockType;
  /** Pontos de vida: dano necessario para quebrar. */
  hp: number;
  /** Recurso solto ao quebrar (null = nao solta nada). */
  drop: ResourceId | null;
  dropMin: number;
  dropMax: number;
  /** Chance de soltar o recurso (1 = sempre). */
  dropChance: number;
  rarity: Rarity;
  /** Valor de referencia (usado para destaque visual/feedback). */
  value: number;
  /** Profundidade minima em metros para aparecer na geracao. */
  minDepth: number;
  /** Profundidade maxima em metros (Infinity = sem limite). */
  maxDepth: number;
  /** Tier minimo de ferramenta necessario para quebrar. */
  minTool: number;
  solid: boolean;
  indestructible: boolean;
  /** Cores placeholder do tile. */
  color: string;
  shade: string;
  speckle: string;
  /** Cor do "veio" desenhado por cima (minerios). */
  oreColor?: string;
  oreGlow?: string;
  /** Emite luz propria (cristais). */
  emissive?: number;
  /** Chance base de um tile virar semente de veio deste minerio. */
  veinChance?: number;
  veinSizeMin?: number;
  veinSizeMax?: number;
  /** Etiquetas usadas por skills, procs e protecoes. */
  tags: BlockTag[];
  /**
   * Pode espelhar a textura na vertical para variar o tile?
   * Falso para blocos com topo definido (grama). Padrao: true.
   */
  artFlipY?: boolean;
  /** Categoria de som (o AudioSystem decide o que tocar). */
  sfxMaterial: 'terra' | 'pedra' | 'metal' | 'cristal' | 'estrutura';
  /**
   * Da para SUBIR por dentro dele, sem gastar vigor?
   *
   * Escalar parede no jogo e uma decisao que custa: o Elias se agarra, gasta
   * vigor e cansa. Uma escada e o contrario disso — ela existe justamente para
   * a subida deixar de ser uma prova. Por isso e um campo proprio e nao uma
   * etiqueta: subir por escada nao e escalar devagar, e outra coisa.
   */
  climbable?: boolean;
}

export const BLOCK_IDS = {
  AIR: 0,
  DIRT: 1,
  GRASS: 2,
  STONE: 3,
  COAL: 4,
  COPPER: 5,
  IRON: 6,
  GOLD: 7,
  CRYSTAL: 8,
  BEDROCK: 9,
  DARKSTONE: 10,
  RUIN_BRICK: 11,
  PLANK: 12,
  RUBY: 13,
  RELIC: 14,
  VOIDSTONE: 15,
  SEAL: 16,
  LAMP: 17,
  LADDER: 18,
  RUIN_SLAB: 19,
  RUIN_COLUMN: 20,
  RUIN_DOOR: 21,
} as const;

export const BLOCKS: BlockDef[] = [
  {
    id: BLOCK_IDS.AIR,
    key: 'air',
    name: 'Ar',
    type: 'ar',
    hp: 0,
    drop: null,
    dropMin: 0,
    dropMax: 0,
    dropChance: 0,
    tags: [],
    rarity: 'comum',
    value: 0,
    minDepth: 0,
    maxDepth: Infinity,
    minTool: 0,
    solid: false,
    indestructible: true,
    color: 'transparent',
    shade: 'transparent',
    speckle: 'transparent',
    sfxMaterial: 'terra',
  },
  {
    id: BLOCK_IDS.DIRT,
    key: 'dirt',
    name: 'Terra',
    type: 'terreno',
    hp: 18,
    drop: null,
    dropMin: 0,
    dropMax: 0,
    dropChance: 0,
    tags: ['soil'],
    rarity: 'comum',
    value: 0,
    minDepth: 0,
    maxDepth: 70,
    minTool: 1,
    solid: true,
    indestructible: false,
    color: '#6b4a2f',
    shade: '#54381f',
    speckle: '#83603f',
    sfxMaterial: 'terra',
  },
  {
    id: BLOCK_IDS.GRASS,
    key: 'grass',
    name: 'Solo com grama',
    type: 'terreno',
    hp: 18,
    drop: null,
    dropMin: 0,
    dropMax: 0,
    dropChance: 0,
    tags: ['soil'],
    rarity: 'comum',
    value: 0,
    minDepth: 0,
    maxDepth: 2,
    minTool: 1,
    solid: true,
    indestructible: false,
    color: '#6b4a2f',
    shade: '#54381f',
    speckle: '#83603f',
    artFlipY: false,
    sfxMaterial: 'terra',
  },
  {
    id: BLOCK_IDS.STONE,
    key: 'stone',
    name: 'Pedra',
    type: 'terreno',
    hp: 34,
    /*
     * PEDRA SEMPRE CAI, e cai de uma a tres.
     *
     * Era 35% de chance de UMA unidade, ou seja 0,35 pedra por bloco. Isso
     * ficou de pe enquanto pedra era so o refugo que enchia a mochila. Deixou
     * de valer quando ela virou MUNICAO: a pistola come duas pedras por tiro,
     * entao cada tiro custava seis blocos minerados, e o jogador quebrava cinco
     * blocos seguidos sem receber nada — parecia bug, nao economia.
     *
     * Com 1 a 3 garantidas a media vai a 2 por bloco, quase seis vezes mais: um
     * bloco vira um tiro. Ficar sem municao continua significando "vai
     * minerar", que e o proprio jogo, mas deixa de significar "minere seis
     * blocos para atirar uma vez".
     */
    drop: 'stone',
    dropMin: 1,
    dropMax: 3,
    dropChance: 1,
    tags: ['stone'],
    rarity: 'comum',
    value: 1,
    minDepth: 12,
    maxDepth: Infinity,
    minTool: 1,
    solid: true,
    indestructible: false,
    color: '#5c5c66',
    shade: '#46464f',
    speckle: '#74747f',
    sfxMaterial: 'pedra',
  },
  {
    id: BLOCK_IDS.DARKSTONE,
    key: 'darkstone',
    name: 'Pedra profunda',
    type: 'terreno',
    hp: 58,
    /* Mais dura que a pedra comum, e paga mais: e o que faz descer compensar. */
    drop: 'stone',
    dropMin: 2,
    dropMax: 4,
    dropChance: 1,
    tags: ['stone', 'hardStone'],
    rarity: 'comum',
    value: 1,
    minDepth: 229,
    maxDepth: Infinity,
    minTool: 2,
    solid: true,
    indestructible: false,
    color: '#3b3b46',
    shade: '#2b2b33',
    speckle: '#50505e',
    sfxMaterial: 'pedra',
  },
  {
    id: BLOCK_IDS.COAL,
    key: 'coal',
    name: 'Veio de carvao',
    type: 'minerio',
    hp: 30,
    drop: 'coal',
    dropMin: 1,
    dropMax: 3,
    dropChance: 1,
    tags: ['stone', 'ore'],
    rarity: 'comum',
    value: 4,
    minDepth: 6,
    maxDepth: Infinity,
    minTool: 1,
    solid: true,
    indestructible: false,
    color: '#5a5a64',
    shade: '#43434c',
    speckle: '#6d6d78',
    oreColor: '#1f1f25',
    oreGlow: '#3d3d47',
    veinChance: 0.02,
    veinSizeMin: 3,
    veinSizeMax: 8,
    sfxMaterial: 'pedra',
  },
  {
    id: BLOCK_IDS.COPPER,
    key: 'copper',
    name: 'Veio de cobre',
    type: 'minerio',
    hp: 44,
    drop: 'copper',
    dropMin: 1,
    dropMax: 2,
    dropChance: 1,
    tags: ['stone', 'ore'],
    rarity: 'incomum',
    value: 9,
    minDepth: 28,
    maxDepth: Infinity,
    minTool: 1,
    solid: true,
    indestructible: false,
    color: '#5a5a64',
    shade: '#43434c',
    speckle: '#6d6d78',
    oreColor: '#c0713a',
    oreGlow: '#f0b077',
    veinChance: 0.008,
    veinSizeMin: 2,
    veinSizeMax: 6,
    sfxMaterial: 'metal',
  },
  {
    id: BLOCK_IDS.IRON,
    key: 'iron',
    name: 'Veio de ferro',
    type: 'minerio',
    hp: 62,
    drop: 'iron',
    dropMin: 1,
    dropMax: 2,
    dropChance: 1,
    tags: ['stone', 'hardStone', 'ore'],
    rarity: 'incomum',
    value: 16,
    minDepth: 80,
    maxDepth: Infinity,
    minTool: 2,
    solid: true,
    indestructible: false,
    color: '#55555f',
    shade: '#3f3f48',
    speckle: '#6a6a76',
    oreColor: '#b9c2cc',
    oreGlow: '#eef3f8',
    veinChance: 0.006,
    veinSizeMin: 2,
    veinSizeMax: 5,
    sfxMaterial: 'metal',
  },
  {
    id: BLOCK_IDS.GOLD,
    key: 'gold',
    name: 'Veio de ouro',
    type: 'minerio',
    hp: 78,
    drop: 'gold',
    dropMin: 1,
    dropMax: 2,
    dropChance: 1,
    tags: ['stone', 'hardStone', 'ore', 'rareOre'],
    rarity: 'raro',
    value: 42,
    minDepth: 170,
    maxDepth: Infinity,
    minTool: 3,
    solid: true,
    indestructible: false,
    color: '#4e4e58',
    shade: '#3a3a42',
    speckle: '#62626d',
    oreColor: '#d9a828',
    oreGlow: '#ffe9a3',
    emissive: 0.12,
    veinChance: 0.0032,
    veinSizeMin: 1,
    veinSizeMax: 4,
    sfxMaterial: 'metal',
  },
  {
    id: BLOCK_IDS.CRYSTAL,
    key: 'crystal',
    name: 'Cristal bruto',
    type: 'minerio',
    hp: 96,
    drop: 'crystal',
    dropMin: 1,
    dropMax: 1,
    dropChance: 1,
    tags: ['stone', 'hardStone', 'ore', 'rareOre'],
    rarity: 'epico',
    value: 110,
    minDepth: 262,
    maxDepth: Infinity,
    minTool: 3,
    solid: true,
    indestructible: false,
    color: '#413b52',
    shade: '#312c3e',
    speckle: '#564d6c',
    oreColor: '#8c5ce0',
    oreGlow: '#e0c8ff',
    emissive: 0.45,
    veinChance: 0.002,
    veinSizeMin: 1,
    veinSizeMax: 3,
    sfxMaterial: 'cristal',
  },
  {
    id: BLOCK_IDS.RUIN_BRICK,
    key: 'ruin_brick',
    name: 'Tijolo antigo',
    type: 'estrutura',
    hp: 120,
    drop: 'stone',
    dropMin: 1,
    dropMax: 1,
    dropChance: 0.6,
    tags: ['ancient', 'hardStone', 'special'],
    rarity: 'incomum',
    value: 2,
    minDepth: 0,
    maxDepth: Infinity,
    /*
     * TIER 1, e isto e regra: parede de HISTORIA nunca pede ferramenta.
     *
     * Ela pedia a de tier 2 e isso fechava um circulo perfeito: o tijolo veda
     * a sala da pista dos 26 m; a picareta de tier 2 custa 40 de cobre; cobre
     * so existe na camada de Pedra, que comeca aos 50 m; os 50 m estao atras
     * do primeiro selo; e o primeiro selo exige a missao da pista dos 26 m.
     * Num save novo a pista era literalmente inalcancavel.
     *
     * O que segura esta parede continua sendo o HP (120, e mais fundo ainda
     * multiplicado pela camada): cavar ate a pista custa tempo, que e o certo.
     * Gate de ferramenta e para MINERIO, onde travar significa "volte mais
     * forte"; numa parede de historia significa "volte nunca".
     */
    minTool: 1,
    solid: true,
    indestructible: false,
    color: '#4a5352',
    shade: '#374040',
    speckle: '#5e6a68',
    emissive: 0.05,
    sfxMaterial: 'estrutura',
  },
  {
    id: BLOCK_IDS.PLANK,
    key: 'plank',
    name: 'Estrutura da base',
    type: 'estrutura',
    hp: 0,
    drop: null,
    dropMin: 0,
    dropMax: 0,
    dropChance: 0,
    tags: ['special', 'indestructible'],
    rarity: 'comum',
    value: 0,
    minDepth: 0,
    maxDepth: Infinity,
    minTool: 99,
    solid: true,
    indestructible: true,
    color: '#7a5533',
    shade: '#5d3f25',
    speckle: '#96683f',
    sfxMaterial: 'estrutura',
  },
  /*
   * AS TRES PECAS DA RUINA.
   *
   * A arena inteira era feita do MESMO tile: pilar, sacada, porta e teto com a
   * textura identica. Por isso ela lia como um bloco so em vez de um lugar
   * construido — nenhuma parte dizia o que era.
   *
   * Sao blocos separados e nao variantes do tijolo porque eles nao sao a mesma
   * coisa com outra cara: a laje e piso, a coluna e sustentacao, a porta e a
   * razao de tudo aquilo existir. Quem olha tem que conseguir nomear.
   *
   * Todos com a mesma vida do tijolo antigo (120): a diferenca e de leitura,
   * nao de dificuldade.
   */
  {
    id: BLOCK_IDS.RUIN_SLAB,
    key: 'ruin_slab',
    name: 'Laje antiga',
    type: 'estrutura',
    hp: 120,
    drop: 'stone',
    dropMin: 1,
    dropMax: 2,
    dropChance: 1,
    tags: ['ancient', 'stone'],
    rarity: 'comum',
    value: 2,
    minDepth: 0,
    maxDepth: Infinity,
    minTool: 1,
    solid: true,
    indestructible: false,
    color: '#9aa08c',
    shade: '#6f7566',
    speckle: '#b7bda8',
    sfxMaterial: 'estrutura',
  },
  {
    id: BLOCK_IDS.RUIN_COLUMN,
    key: 'ruin_column',
    name: 'Coluna antiga',
    type: 'estrutura',
    hp: 120,
    drop: 'stone',
    dropMin: 1,
    dropMax: 2,
    dropChance: 1,
    tags: ['ancient', 'stone'],
    rarity: 'comum',
    value: 2,
    minDepth: 0,
    maxDepth: Infinity,
    minTool: 1,
    solid: true,
    indestructible: false,
    /* A coluna nao espelha: as estrias tem topo e base, e espelhar na vertical
       viraria um tubo sem direcao. */
    artFlipY: false,
    color: '#a3a993',
    shade: '#767c6b',
    speckle: '#c0c6b1',
    sfxMaterial: 'estrutura',
  },
  {
    id: BLOCK_IDS.RUIN_DOOR,
    key: 'ruin_door',
    name: 'Passagem murada',
    type: 'estrutura',
    hp: 120,
    drop: 'stone',
    dropMin: 1,
    dropMax: 2,
    dropChance: 1,
    tags: ['ancient', 'stone'],
    rarity: 'comum',
    value: 2,
    minDepth: 0,
    maxDepth: Infinity,
    minTool: 1,
    solid: true,
    indestructible: false,
    artFlipY: false,
    color: '#8f9583',
    shade: '#666c5d',
    speckle: '#adb39d',
    sfxMaterial: 'estrutura',
  },
  {
    /*
     * A ESCADA.
     *
     * Atravessavel (nao e solida) e escalavel de graca. Ela resolve o que a
     * escalada por vigor nao resolve: descer 180 m de poco e subir de volta
     * nao pode ser uma prova de resistencia toda vez — vira imposto sobre
     * jogar, e o jogador aprende a nao voltar.
     *
     * Indestrutivel de proposito onde o jogo a coloca: uma escada quebrada por
     * acidente no meio de um poco de cem metros e uma armadilha.
     */
    id: BLOCK_IDS.LADDER,
    key: 'ladder',
    name: 'Escada',
    type: 'estrutura',
    hp: 0,
    drop: null,
    dropMin: 0,
    dropMax: 0,
    dropChance: 0,
    tags: ['special', 'indestructible'],
    rarity: 'comum',
    value: 0,
    minDepth: 0,
    maxDepth: Infinity,
    minTool: 99,
    solid: false,
    indestructible: true,
    climbable: true,
    color: '#8a6234',
    shade: '#5d3f20',
    speckle: '#b0834a',
    sfxMaterial: 'estrutura',
  },
  {
    id: BLOCK_IDS.RUBY,
    key: 'ruby',
    name: 'Veio de rubi',
    type: 'minerio',
    hp: 120,
    drop: 'ruby',
    dropMin: 1,
    dropMax: 2,
    dropChance: 1,
    tags: ['stone', 'hardStone', 'ore', 'rareOre'],
    rarity: 'epico',
    value: 210,
    minDepth: 900,
    maxDepth: Infinity,
    minTool: 3,
    solid: true,
    indestructible: false,
    color: '#4a2f2a',
    shade: '#382220',
    speckle: '#61403a',
    oreColor: '#c0392b',
    oreGlow: '#ff8a7a',
    emissive: 0.3,
    sfxMaterial: 'cristal',
  },
  {
    id: BLOCK_IDS.RELIC,
    key: 'relic',
    name: 'Fragmento antigo',
    type: 'minerio',
    hp: 150,
    drop: 'relic',
    dropMin: 1,
    dropMax: 1,
    dropChance: 1,
    tags: ['ancient', 'hardStone', 'ore', 'rareOre'],
    rarity: 'epico',
    value: 380,
    minDepth: 1300,
    maxDepth: Infinity,
    minTool: 3,
    solid: true,
    indestructible: false,
    color: '#2c4038',
    shade: '#1f2e28',
    speckle: '#3d564a',
    oreColor: '#2f9a7a',
    oreGlow: '#9affd8',
    emissive: 0.25,
    sfxMaterial: 'estrutura',
  },
  {
    id: BLOCK_IDS.VOIDSTONE,
    key: 'voidstone',
    name: 'Pedra do vazio',
    type: 'minerio',
    hp: 185,
    drop: 'voidstone',
    dropMin: 1,
    dropMax: 2,
    dropChance: 1,
    tags: ['stone', 'hardStone', 'ore', 'rareOre'],
    rarity: 'epico',
    value: 640,
    minDepth: 1700,
    maxDepth: Infinity,
    minTool: 3,
    solid: true,
    indestructible: false,
    color: '#2a1f38',
    shade: '#1c1426',
    speckle: '#3d2d52',
    oreColor: '#6a2fd0',
    oreGlow: '#c08aff',
    emissive: 0.5,
    sfxMaterial: 'cristal',
  },
  {
    id: BLOCK_IDS.SEAL,
    key: 'seal',
    name: 'Selo Ancestral',
    type: 'especial',
    hp: 0,
    drop: null,
    dropMin: 0,
    dropMax: 0,
    dropChance: 0,
    /**
     * A barreira dos chefes de bioma. Indestrutivel por definicao — a unica
     * forma de tirar isto do mapa e `World.openGateBand`, chamado quando o
     * BiomeGate confirma chefe morto + todos os mineiros daquela camada
     * resgatados. Nunca cede a dano, nem com fratura ou explosivo.
     */
    tags: ['indestructible', 'special', 'boss'],
    rarity: 'comum',
    value: 0,
    minDepth: 0,
    maxDepth: Infinity,
    minTool: 99,
    solid: true,
    indestructible: true,
    color: '#241a38',
    shade: '#150e22',
    speckle: '#4a2f6e',
    oreGlow: '#9a4fe0',
    emissive: 0.35,
    sfxMaterial: 'estrutura',
  },
  {
    id: BLOCK_IDS.LAMP,
    key: 'lamp',
    name: 'Lampiao de Blockia',
    type: 'especial',
    hp: 0, drop: null, dropMin: 0, dropMax: 0, dropChance: 0,
    tags: ['indestructible', 'special'],
    rarity: 'comum', value: 0, minDepth: 0, maxDepth: Infinity, minTool: 99,
    solid: false, indestructible: true,
    color: '#ffdc83', shade: '#c08a2a', speckle: '#fff6c8',
    oreGlow: '#ffc453', emissive: 1.35, sfxMaterial: 'estrutura',
  },
  {
    id: BLOCK_IDS.BEDROCK,
    key: 'bedrock',
    name: 'Rocha-mae',
    type: 'especial',
    hp: 0,
    drop: null,
    dropMin: 0,
    dropMax: 0,
    dropChance: 0,
    tags: ['indestructible', 'special'],
    rarity: 'comum',
    value: 0,
    minDepth: 0,
    maxDepth: Infinity,
    minTool: 99,
    solid: true,
    indestructible: true,
    color: '#26262c',
    shade: '#17171c',
    speckle: '#35353d',
    sfxMaterial: 'pedra',
  },
];

const BY_ID: BlockDef[] = [];
const BY_KEY = new Map<string, BlockDef>();
for (const b of BLOCKS) {
  BY_ID[b.id] = b;
  BY_KEY.set(b.key, b);
}

export function blockDef(id: number): BlockDef {
  return BY_ID[id] ?? BY_ID[BLOCK_IDS.AIR];
}

export function blockByKey(key: string): BlockDef | undefined {
  return BY_KEY.get(key);
}

export function isSolid(id: number): boolean {
  return BY_ID[id]?.solid ?? false;
}

/** Minerios candidatos a geracao, na ordem em que sao testados (mais raro primeiro). */
export const ORE_BLOCKS: BlockDef[] = BLOCKS.filter((b) => b.veinChance !== undefined).sort(
  (a, b) => (a.veinChance ?? 1) - (b.veinChance ?? 1)
);
