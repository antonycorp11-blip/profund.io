/**
 * Camadas do mundo.
 *
 * Fonte unica de verdade para: nome exibido, cor no mapa, rocha de fundo,
 * textura de galeria e o indicador de "quanto falta para a proxima camada".
 *
 * As profundidades seguem o GDD: o mundo vai de 0 a 2000 m, e o Portal fica no
 * fundo. Cada camada tem rocha (tingida), tabela de minerio, tamanho de caverna,
 * cor de ambiente e faixa de transicao propria.
 */

export interface LayerOre {
  /** Chave do bloco de minerio (ver BLOCKS). */
  key: string;
  /** Chance por tile de pedra desta camada. */
  chance: number;
  sizeMin: number;
  sizeMax: number;
}

export interface LayerDef {
  id: string;
  name: string;
  /** Profundidade inicial em metros. */
  minDepth: number;
  /** Cor de referencia no mapa e no minimapa. */
  color: string;
  /** Cor do vao escavado desta camada no mapa. */
  tunnelColor: string;
  /** Chave da rocha usada como base de veios (ver ART.oreStamp). */
  rockKey: string;
  /** Indice da textura de fundo de galeria. */
  backwall: number;
  /** Ja e gerada pelo mundo atual? */
  generated: boolean;
  /** Frase curta exibida ao alcancar a camada. */
  tagline: string;
  /**
   * Cor do ar/escuridao desta camada. E o que mais muda a percepcao de
   * "estou noutro lugar" — mais que a textura da rocha.
   */
  ambient: [number, number, number];
  /** Multiplicador da escuridao maxima nesta camada. */
  darkness: number;
  /** Quanto as cavernas desta camada sao maiores que o padrao. */
  caveBonus: number;
  /** Tabela de minerios EXCLUSIVA da camada. Esvaziar = camada esteril. */
  ores: LayerOre[];
  /** Bloco da faixa de transicao desenhada na entrada da camada. */
  strata?: string;
  /**
   * Cor aplicada sobre a textura de rocha desta camada (modo 'color': mantem
   * o relevo, troca o matiz). E como cada camada ganha rocha propria sem
   * precisar de textura nova.
   */
  tint?: string;
  /** Forca do tingimento, 0..1. */
  tintStrength?: number;
  /**
   * Multiplicador de HP de todo bloco quebrado nesta camada.
   *
   * O jogador chegava nas Ruinas Antigas rapido demais: com picareta boa,
   * pedra e minerio cediam quase igual em toda profundidade. Isto faz a MESMA
   * pedra ficar mais dura conforme desce — sem duplicar bloco por bloco — e e
   * a peça central de "nao deveria ser tao facil chegar la".
   */
  hpMultiplier: number;
}

export const LAYERS: LayerDef[] = [
  {
    id: 'surface',
    name: 'Solo Superficial',
    minDepth: 0,
    color: '#6b4a2f',
    tunnelColor: '#2a1c10',
    rockKey: 'dirt',
    backwall: 0,
    generated: true,
    tagline: 'O comeco de tudo.',
    hpMultiplier: 1,
    ambient: [26, 16, 8],
    darkness: 0.55,
    caveBonus: 0,
    /*
     * O cobre nasce AQUI, e nao so na Camada de Pedra.
     *
     * Ele so existia a partir dos 50 m, e isso fechava um circulo: a picareta
     * de tier 2 custa 40 de cobre, os 50 m ficam atras do primeiro selo, e o
     * selo exige a missao da pista dos 26 m — que ficava atras de uma parede
     * de tier 2. Pouco cobre na superficie quebra o circulo pela raiz e ainda
     * da o que procurar nos primeiros noventa metros, que antes tinham UM
     * minerio so.
     */
    ores: [
      { key: 'coal', chance: 0.038, sizeMin: 3, sizeMax: 7 },
      { key: 'copper', chance: 0.013, sizeMin: 2, sizeMax: 4 },
    ],
  },
  {
    id: 'stone',
    name: 'Camada de Pedra',
    /*
     * 90 m, e nao 50.
     *
     * O primeiro bioma era uma linha reta de cinquenta metros com a pista aos
     * 26, o Jonas aos 38 e o chefe aos 48 — tudo em cima de tudo, e o jogador
     * tropecava nas tres coisas antes de entender qualquer uma. Quase o dobro
     * de espaco, com a mesma pista de abertura aos 26 m (o caderno diz 26 e o
     * caderno e canone), da lugar para procurar em vez de so cair dentro.
     */
    minDepth: 180,
    color: '#5c5c66',
    tunnelColor: '#1d1d22',
    rockKey: 'stone',
    backwall: 1,
    generated: true,
    tagline: 'Rocha solida, grandes possibilidades.',
    hpMultiplier: 1,
    ambient: [8, 10, 18],
    darkness: 1,
    caveBonus: 0.02,
    strata: 'darkstone',
    ores: [
      { key: 'coal', chance: 0.05, sizeMin: 4, sizeMax: 9 },
      { key: 'copper', chance: 0.034, sizeMin: 3, sizeMax: 7 },
      { key: 'iron', chance: 0.018, sizeMin: 2, sizeMax: 5 },
    ],
  },
  {
    id: 'crystal',
    name: 'Cavernas de Cristal',
    minDepth: 360,
    color: '#5a4a78',
    tunnelColor: '#171222',
    rockKey: 'stone',
    tint: '#6a4fa8',
    tintStrength: 0.75,
    backwall: 2,
    generated: true,
    tagline: 'Cristais raros brilham nas sombras.',
    hpMultiplier: 1.35,
    ambient: [16, 6, 26],
    darkness: 1.06,
    caveBonus: 0.055,
    strata: 'ruin_brick',
    ores: [
      { key: 'coal', chance: 0.02, sizeMin: 2, sizeMax: 5 },
      { key: 'copper', chance: 0.035, sizeMin: 3, sizeMax: 7 },
      { key: 'iron', chance: 0.055, sizeMin: 4, sizeMax: 9 },
      { key: 'gold', chance: 0.022, sizeMin: 2, sizeMax: 6 },
      { key: 'crystal', chance: 0.03, sizeMin: 3, sizeMax: 7 },
    ],
  },
  {
    id: 'minerals',
    name: 'Profundezas Minerais',
    minDepth: 500,
    color: '#3f5a68',
    tunnelColor: '#0f181d',
    rockKey: 'darkstone',
    tint: '#2f7a9a',
    tintStrength: 0.6,
    backwall: 2,
    generated: true,
    tagline: 'A rocha aqui guarda o que a superficie nunca viu.',
    hpMultiplier: 1.75,
    ambient: [6, 20, 28],
    darkness: 1.08,
    caveBonus: 0.05,
    strata: 'darkstone',
    ores: [
      { key: 'copper', chance: 0.02, sizeMin: 2, sizeMax: 5 },
      { key: 'iron', chance: 0.07, sizeMin: 4, sizeMax: 10 },
      { key: 'gold', chance: 0.05, sizeMin: 3, sizeMax: 8 },
      { key: 'crystal', chance: 0.045, sizeMin: 3, sizeMax: 8 },
    ],
  },
  {
    id: 'magma',
    name: 'Zona de Magma',
    minDepth: 900,
    color: '#7a3a28',
    tunnelColor: '#1e0c07',
    rockKey: 'darkstone',
    tint: '#c24a1e',
    tintStrength: 0.7,
    backwall: 2,
    generated: true,
    tagline: 'Calor intenso, grandes riquezas.',
    hpMultiplier: 2.3,
    ambient: [40, 10, 4],
    darkness: 1.02,
    caveBonus: 0.07,
    strata: 'ruin_brick',
    ores: [
      { key: 'iron', chance: 0.05, sizeMin: 3, sizeMax: 8 },
      { key: 'gold', chance: 0.06, sizeMin: 4, sizeMax: 9 },
      { key: 'crystal', chance: 0.03, sizeMin: 2, sizeMax: 6 },
      { key: 'ruby', chance: 0.045, sizeMin: 3, sizeMax: 8 },
    ],
  },
  {
    id: 'ruins',
    name: 'Ruinas Antigas',
    minDepth: 1300,
    color: '#2f5148',
    tunnelColor: '#0c1614',
    rockKey: 'darkstone',
    tint: '#2f9a7a',
    tintStrength: 0.6,
    backwall: 2,
    generated: true,
    tagline: 'Segredos de uma civilizacao perdida.',
    hpMultiplier: 3,
    ambient: [6, 26, 22],
    darkness: 1.05,
    caveBonus: 0.05,
    strata: 'ruin_brick',
    ores: [
      { key: 'gold', chance: 0.045, sizeMin: 3, sizeMax: 8 },
      { key: 'crystal', chance: 0.05, sizeMin: 3, sizeMax: 8 },
      { key: 'ruby', chance: 0.035, sizeMin: 2, sizeMax: 7 },
      { key: 'relic', chance: 0.03, sizeMin: 2, sizeMax: 5 },
    ],
  },
  {
    id: 'abyss',
    name: 'Abismo',
    minDepth: 1700,
    color: '#3a2352',
    tunnelColor: '#0d0712',
    rockKey: 'darkstone',
    tint: '#6a2fd0',
    tintStrength: 0.65,
    backwall: 2,
    generated: true,
    tagline: 'Alem da luz, apenas lendas.',
    hpMultiplier: 3.9,
    ambient: [16, 4, 30],
    darkness: 1.12,
    caveBonus: 0.085,
    strata: 'ruin_brick',
    ores: [
      { key: 'crystal', chance: 0.05, sizeMin: 3, sizeMax: 8 },
      { key: 'ruby', chance: 0.04, sizeMin: 3, sizeMax: 7 },
      { key: 'relic', chance: 0.04, sizeMin: 2, sizeMax: 6 },
      { key: 'voidstone', chance: 0.05, sizeMin: 3, sizeMax: 8 },
    ],
  },
  {
    id: 'portal',
    name: 'O Portal',
    minDepth: 1960,
    color: '#4a2a6a',
    tunnelColor: '#0a0410',
    rockKey: 'darkstone',
    tint: '#9a4fe0',
    tintStrength: 0.8,
    backwall: 2,
    generated: false,
    tagline: 'Isto nunca foi uma mina.',
    hpMultiplier: 5,
    ambient: [24, 6, 40],
    darkness: 1.1,
    caveBonus: 0.05,
    ores: [{ key: 'voidstone', chance: 0.06, sizeMin: 3, sizeMax: 9 }],
  },
];

export function layerAt(depthMeters: number): LayerDef {
  let found = LAYERS[0];
  for (const l of LAYERS) if (depthMeters >= l.minDepth) found = l;
  return found;
}

export function nextLayer(depthMeters: number): LayerDef | null {
  for (const l of LAYERS) if (l.minDepth > depthMeters) return l;
  return null;
}

/** Interpola ambiente e escuridao entre camadas, para a troca nao dar corte. */
export function layerBlend(depthMeters: number): {
  ambient: [number, number, number];
  darkness: number;
  layer: LayerDef;
} {
  const layer = layerAt(depthMeters);
  const next = nextLayer(depthMeters);
  if (!next) return { ambient: layer.ambient, darkness: layer.darkness, layer };

  const band = 20;
  const start = next.minDepth - band;
  const t = depthMeters <= start ? 0 : Math.min(1, (depthMeters - start) / band);
  const mix = (a: number, b: number) => a + (b - a) * t;
  return {
    ambient: [
      mix(layer.ambient[0], next.ambient[0]),
      mix(layer.ambient[1], next.ambient[1]),
      mix(layer.ambient[2], next.ambient[2]),
    ],
    darkness: mix(layer.darkness, next.darkness),
    layer,
  };
}

/** Quantos metros faltam para a proxima camada (null se nao ha proxima). */
export function metersToNextLayer(depthMeters: number): number | null {
  const next = nextLayer(depthMeters);
  return next ? next.minDepth - depthMeters : null;
}
