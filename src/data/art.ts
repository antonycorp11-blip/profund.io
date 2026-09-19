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
  /**
   * Para que lado ESTA tira olha: 1 direita, -1 esquerda.
   *
   * Por tira, e nao global: a arte gerada nao sai toda virada para o mesmo
   * lado (aqui, so `walk` olha para a esquerda). Um valor unico deixava o
   * heroi minerando e escalando de costas.
   */
  facing: 1 | -1;
}

export interface CharacterArt {
  /**
   * O equipamento ja esta DESENHADO no corpo desta leva de arte?
   *
   * `true` significa que capacete, mochila e picareta fazem parte do desenho
   * do heroi, e que as camadas vestiveis nao devem entrar por cima — senao ele
   * ganha um segundo capacete sobre o primeiro.
   *
   * E o unico interruptor entre os dois mundos: arte de heroi vestido e arte
   * de heroi nu com pecas encaixadas.
   */
  equipamentoNoCorpo?: boolean;
  dir: string;
  /** Folha unica normalizada pelo slice-assets. */
  sheet: string;
  /** Lado do quadro quadrado dentro de cada tira. */
  stripFrame: number;
  /**
   * Altura do quadro da tira em pixels de mundo.
   * Maior que `drawHeight` porque nas tiras o heroi ocupa 78% do quadro (sobra
   * folga para o braco da escalada e a picareta erguida) — sem isso ele
   * encolheria ao trocar de formato de arte.
   */
  stripDrawHeight: number;
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
    'ruin_slab',
    'ruin_column',
    'ruin_door',
    'ruin_backwall',
    'step_ruin',
    'step_wood',
    'ladder',
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
  iconKeys: [
    'coal',
    'copper',
    'iron',
    'gold',
    'crystal',
    'stone',
    // A folha de minerio veio completa: os quatro de baixo existiam so como
    // bolinha colorida, inclusive o Coque, que e o material que a base inteira
    // gira em volta e aparecia no painel como um ponto marrom.
    'ruby',
    'relic',
    'voidstone',
    'coal_coke',
  ],
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

  /** Criaturas: uma tira por animacao, geradas pelo slice-assets. */
  creaturesDir: 'creatures/',
  /** Arte de /creatures usada por quem NAO e monstro (as toupeiras coletoras). */
  helperArts: ['toupeira'],

  /**
   * Pasta e elenco das folhas de NPC (moradores de cidade e mineiros presos).
   *
   * Sao tiras de 5 quadros geradas por `npm run slice-npcs`. Quem nao estiver
   * aqui continua sendo silhueta vetorial — nada quebra, so fica feio.
   */
  npcDir: 'npc/',
  /** Estruturas das bases de extracao (ver tools/slice-base.mjs). */
  baseDir: 'base/',
  /**
   * Efeitos do tiro, gerados como folha de dez.
   *
   * Sao desenho, e nao particula de codigo: o fogo de boca, o rastro, a poeira
   * na rocha e a faisca no bicho tem forma propria e uma bolinha vetorial nao
   * substitui nenhuma delas.
   */
  shotArts: [
    'fogo_1', 'fogo_2', 'rastro', 'bala',
    'poeira_1', 'poeira_2', 'sangue_1', 'sangue_2',
  ],

  /**
   * Pecas que se VESTEM: presas num ponto medido do corpo.
   *
   * Sao de PERFIL, porque grudam num corpo de perfil. Nao confundir com
   * `art/equip/<id>.png`, que e o icone de tres quartos da mesma peca na lista
   * da tela de Equipamento — mesma coisa, duas figuras, dois usos.
   *
   * Ficam carregadas mesmo quando `equipamentoNoCorpo` e true: a arte muda de
   * leva, elas continuam existindo, e o interruptor e um so.
   */
  vestirArts: [
    'eq_lanterna', 'eq_capacete', 'eq_visor',
    'mochila_couro', 'mochila_lona', 'eq_mochila_carga',
  ],

  /** Picaretas soltas, presas no punho (ver PlayerSprite.desenharPeca). */
  toolArts: [
    'pick_old', 'pick_reinforced', 'pick_copper',
    'pick_gold', 'pick_crystal', 'pick_ruby',
  ],

  /** Armas soltas, presas na mao do heroi (ver PlayerSprite.desenharArma). */
  weaponArts: [
    'pistola', 'pistola_2', 'escopeta', 'escopeta_2', 'fuzil', 'fuzil_2',
  ],

  baseArts: [
    'refinador',
    'deposito',
    'esteira',
    'elevador_torre',
    'elevador_plataforma',
    'casa_capataz',
    'poste_cristal',
  ],
  npcAnims: ['idle', 'walk'],
  npcArts: [
    'mara_avelar',
    'silas_arcos',
    'nina_candeia',
    'breno_torga',
    'irene_salles',
    'afonso_greda',
    'lio',
    'npc_jonas',
    'npc_vilma',
    'npc_teo',
  ],
  creatureAnims: ['idle', 'walk', 'attack', 'hurt', 'death'] as const,

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
    /**
     * O EQUIPAMENTO ESTA DESENHADO NO CORPO nesta leva de arte.
     *
     * Capacete, mochila e picareta fazem parte do desenho do heroi — nao sao
     * pecas separadas. Ligar as camadas modulares por cima poria um segundo
     * capacete sobre o primeiro e uma segunda mochila sobre a primeira.
     *
     * A ARMA e a excecao e continua sendo peca solta: a tira de mira foi
     * desenhada com o punho VAZIO de proposito, justamente para a arma entrar
     * ali.
     *
     * Trocar para uma arte de heroi nu e virar isto para `false`. E o unico
     * interruptor entre os dois mundos.
     */
    equipamentoNoCorpo: true,
    stripFrame: 128,
    stripDrawHeight: 66,
    strips: {
      idle: { file: 'idle.png', frames: 8, fps: 6, facing: 1 },
      walk: { file: 'walk.png', frames: 8, fps: 13, facing: -1 },
      jump: { file: 'jump.png', frames: 8, fps: 12, facing: 1 },
      mine: { file: 'mine.png', frames: 8, fps: 12, facing: 1 },
      climb: { file: 'climb.png', frames: 8, fps: 10, facing: 1 },
      /*
       * POSE DE MIRA, dez quadros e MAO VAZIA.
       *
       * O punho fechado esta vazio de proposito: a arma e um sprite separado,
       * preso ali e girado pelo angulo da mira. Com a arma desenhada dentro do
       * corpo, cada arma nova exigiria a folha inteira do personagem outra vez
       * — tres armas virariam trinta quadros, e trocar de arma no jogo seria
       * trocar de personagem.
       *
       * Os quadros vao em pares por direcao: 0-1 frente, 2-3 cima, 4-5 baixo,
       * 6-7 recuo, 8-9 andando de arma em punho.
       */
      aim: { file: 'aim.png', frames: 10, fps: 6, facing: 1 },
    } as Record<string, StripDef>,
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

  /**
   * OS BOTS TEM CORPO PROPRIO.
   *
   * Ate aqui a copia era o proprio Elias RECOLORIDO: mesma silhueta, mesma
   * picareta, so com um filtro de cor por cima. Funcionava como remendo e
   * dizia a coisa errada — a Copiadora imprime MAQUINA, nao clone de gente.
   *
   * Quatro tiras de seis quadros, recortadas por tools/slice-bots.mjs de uma
   * folha unica. `broca` e o giro parado das maos, que nao existe no heroi: e
   * o que mostra a maquina trabalhando sem estar batendo em nada.
   */
  bots: {
    dir: 'bots/',
    frame: 128,
    drawHeight: 46,
    strips: {
      idle: { file: 'idle.png', frames: 6, fps: 6 },
      walk: { file: 'walk.png', frames: 6, fps: 11 },
      mine: { file: 'mine.png', frames: 6, fps: 12 },
      broca: { file: 'broca.png', frames: 6, fps: 16 },
    } as Record<string, { file: string; frames: number; fps: number }>,
  },
};

export type ArtManifest = typeof ART;
