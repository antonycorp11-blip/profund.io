/**
 * Manifesto de arte.
 * Enquanto um arquivo nao existir, o jogo desenha o placeholder de sempre —
 * nada aqui pode quebrar o jogo se a arte faltar.
 *
 * Especificacao dos arquivos: ver ASSETS.md na raiz.
 */

export interface AnimDef {
  /** Indices dos quadros na folha (grade 4 colunas, leitura da esquerda para a direita). */
  frames: number[];
  fps: number;
  loop: boolean;
}

/** Uma animacao em arquivo proprio: quadros lado a lado, tamanho fixo. */
export interface StripDef {
  file: string;
  frames: number;
  fps: number;
}

export interface CharacterArt {
  dir: string;
  /** Folha unica normalizada pelo slice-assets. */
  sheet: string;
  /** Lado do quadro quadrado dentro de cada tira. */
  stripFrame: number;
  strips: Record<string, StripDef>;
  cols: number;
  /** Tamanho de cada quadro dentro da folha. */
  frameW: number;
  frameH: number;
  /** Altura do quadro inteiro em pixels de mundo (ajuste fino da escala do heroi). */
  drawHeight: number;
  /** Linha dos pes dentro do quadro, 0..1 a partir do topo. */
  feetAnchor: number;
  anims: Record<string, AnimDef>;
}

export const ART = {
  /** Desligue para forcar os placeholders mesmo com a arte presente (comparacao A/B). */
  enabled: true,
  basePath: './art/',

  /**
   * Resolucao do cache de chunk em relacao ao mundo.
   * 1 = 32px por tile (placeholder). 2 = 64px por tile (arte HD nitida no celular).
   * Custo: cada chunk em cache ocupa (8 * 32 * escala)^2 * 4 bytes.
   */
  tileArtScale: 2,

  /** Quantas variacoes de cada bloco procurar (arquivo_0, _1, _2...). */
  blockVariants: 3,

  /**
   * Minerio composto: em vez de uma textura de "pedra com pepita" pronta,
   * o motor pinta a rocha da camada e carimba por cima os icones de minerio
   * ja recortados, em posicao/rotacao/tamanho sorteados pela posicao do tile.
   * Resultado: nenhum bloco de minerio igual a outro, e o veio combina com a
   * rocha da profundidade em que aparece.
   */
  oreStamp: {
    enabled: true,
    /** Rocha usada como base, por profundidade. */
    baseByDepth: [
      { minDepth: 0, key: 'stone' },
      { minDepth: 120, key: 'darkstone' },
    ],
    minCount: 1,
    maxCount: 3,
    /** Tamanho da pepita em fracao do tile. */
    minScale: 0.34,
    maxScale: 0.58,
    /** Rotacao maxima em radianos (a luz da arte vem do topo-esquerda). */
    maxRotation: 0.45,
    /** Margem minima ate a borda do tile, em fracao. */
    margin: 0.16,
    /** Sombra do "encaixe" da pepita na rocha. */
    socketAlpha: 0.38,
    socketScale: 1.1,
  },

  blocksDir: 'blocks/',
  /** Blocos que tem textura. A chave e a mesma de BLOCKS[].key. */
  blockKeys: [
    'dirt',
    'grass',
    'stone',
    'darkstone',
    'coal',
    'copper',
    'iron',
    'gold',
    'crystal',
    'ruin_brick',
    'plank',
    'bedrock',
  ],
  /** Fundo das galerias por camada (escolhido pela profundidade). */
  backwallKeys: ['backwall_dirt', 'backwall_stone', 'backwall_deep'],

  /** Rachaduras: folha 2x2, um quadro por estagio de dano. */
  fx: {
    dir: 'fx/',
    cracks: 'cracks.png',
    crackCols: 2,
    crackFrame: 128,
  },

  /** Icones de recurso (mundo + HUD + oficina). */
  iconsDir: 'ui/',
  iconKeys: ['coal', 'copper', 'iron', 'gold', 'crystal', 'stone'],
  /** Mesmos icones com o contorno removido, usados para carimbar na rocha. */
  oreDir: 'ore/',

  /**
   * Distancia (em tiles) ate o bloco solido mais proximo a partir da qual um
   * vao deixa de ser "tunel" e passa a mostrar o fundo de parallax.
   */
  openCaveRadius: 3,

  /**
   * Fundos com parallax. Desenhados atras de tudo, repetidos em espelho
   * (por isso a arte NAO precisa emendar).
   */
  bgDir: 'bg/',
  /** Ceus do ciclo dia/noite (dia, entardecer, noite). */
  skyKeys: ['sky_day', 'sky_dusk', 'sky_night'],

  backgrounds: [
    { key: 'sky', minDepth: -Infinity, parallax: 0.25, blend: 0 },
    // A troca ceu -> caverna precisa ser curta: a superficie nao pode ficar marrom.
    { key: 'cave_dirt', minDepth: 3, parallax: 0.35, blend: 4 },
    { key: 'cave_stone', minDepth: 24, parallax: 0.35, blend: 16 },
    { key: 'cave_deep', minDepth: 120, parallax: 0.4, blend: 24 },
  ] as { key: string; minDepth: number; parallax: number; blend: number }[],

  /**
   * Cenario da base (sprites soltos com alpha).
   * `w`/`h` em pixels de MUNDO; a ancora e o meio da base do sprite.
   */
  propsDir: 'props/',
  props: {
    shed: { file: 'shed.png', w: 224, h: 168 },
    depot: { file: 'depot.png', w: 72, h: 56 },
    workshop: { file: 'workshop.png', w: 88, h: 72 },
    mine_entrance: { file: 'mine_entrance.png', w: 176, h: 112 },
    lamp: { file: 'lamp.png', w: 40, h: 104 },
    cart: { file: 'cart.png', w: 72, h: 48 },
  } as Record<string, { file: string; w: number; h: number }>,

  /**
   * Personagem: folha 4x4 de 128px (saida do slice-assets).
   * Os indices seguem a ordem dos quadros descrita em ASSETS.md.
   */
  character: {
    dir: 'character/',
    sheet: 'miner_sheet.png',
    /**
     * Tiras por animacao (formato novo): um arquivo por acao, quadros lado a
     * lado, todos ja alinhados pelos pes pelo slice-assets. Quando existem,
     * substituem a folha 4x4 inteira; quando faltam, o jogo cai nela sozinho.
     */
    stripFrame: 128,
    strips: {
      idle: { file: 'idle.png', frames: 8, fps: 6 },
      walk: { file: 'walk.png', frames: 8, fps: 13 },
      jump: { file: 'jump.png', frames: 8, fps: 12 },
      mine: { file: 'mine.png', frames: 8, fps: 12 },
      climb: { file: 'climb.png', frames: 8, fps: 10 },
    } as Record<string, { file: string; frames: number; fps: number }>,
    cols: 4,
    frameW: 128,
    frameH: 128,
    drawHeight: 52,
    feetAnchor: 0.94,
    anims: {
      walk: { frames: [0, 1, 2, 3], fps: 10, loop: true },
      idle: { frames: [4, 5], fps: 2, loop: true },
      jump: { frames: [6], fps: 1, loop: false },
      fall: { frames: [7], fps: 1, loop: false },
      mine_side: { frames: [8, 9], fps: 7, loop: true },
      mine_down: { frames: [8, 10], fps: 7, loop: true },
      mine_up: { frames: [8, 11], fps: 7, loop: true },
      land: { frames: [12], fps: 1, loop: false },
      /**
       * Escalada. Um quadro so — o braco esticado para cima — e o movimento
       * vem do codigo (ver PlayerSprite.climbTransform). Alternar dois quadros
       * soltos da folha lia como dois bonecos diferentes piscando; um corpo so,
       * puxando e alcancando, le como escalada.
       */
      climb: { frames: [6], fps: 1, loop: false },
      /** Parado agarrado: mesma pose, respiracao no lugar do ciclo. */
      climb_hold: { frames: [6], fps: 1, loop: false },
      /** Sem forca, escorregando: bracos abertos. */
      climb_slide: { frames: [7], fps: 1, loop: false },
      /** Passando por cima da borda: o corpo agachado apoiando no chao. */
      mantle: { frames: [12], fps: 1, loop: false },
      celebrate: { frames: [13], fps: 1, loop: false },
      carry: { frames: [14], fps: 1, loop: false },
    },
  } as CharacterArt,
};

export type ArtManifest = typeof ART;
