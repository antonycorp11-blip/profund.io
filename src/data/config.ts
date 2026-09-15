/**
 * Configuracao global do jogo.
 * TODO: nenhum numero de gameplay deve viver fora deste arquivo (ou dos demais /data).
 */

export const CONFIG = {
  /** Tamanho do tile em pixels de mundo. */
  tileSize: 32,

  /** Quantos metros equivale 1 tile de profundidade. */
  metersPerTile: 1,

  render: {
    /** Quantos tiles queremos visiveis na vertical (define o zoom em qualquer tela). */
    targetTilesY: 10,
    /** Limites de zoom para telas muito estreitas/largas. */
    minScale: 1.0,
    maxScale: 3.5,
    /** Cap de devicePixelRatio (performance mobile). */
    maxDpr: 2,
    /** Margem extra (em tiles) desenhada fora da viewport. */
    cullPadding: 2,
  },

  camera: {
    /** Suavizacao (0..1 por frame a 60fps). Menor = mais suave/lenta. */
    lerp: 0.12,
    /** Deslocamento vertical: camera olha um pouco abaixo do player. */
    lookAheadY: 24,
    lookAheadX: 40,
    shakeDecay: 11,
    maxShake: 5.5,
  },

  physics: {
    gravity: 1500,
    maxFallSpeed: 900,
    /** Tolerancia de pulo apos sair da plataforma (s). */
    coyoteTime: 0.1,
    /** Janela de pulo bufferizado antes de tocar o chao (s). */
    jumpBuffer: 0.12,
    /** Corte de altura ao soltar o botao de pulo. */
    jumpCutMultiplier: 0.45,
    groundAccel: 1800,
    airAccel: 1100,
    groundFriction: 2200,
    airFriction: 500,
  },

  player: {
    width: 20,
    height: 28,
    /** Escalada: sempre disponivel (a arvore so melhora), senao o jogador fica preso. */
    climb: {
      /**
       * Quanto tempo ele aguenta agarrado antes de cansar (s).
       * Referencia: a 145 px/s isto da ~31 tiles, o suficiente para sair de um
       * poco cavado a mao. Escalar tem limite, mas nunca pode virar armadilha.
       */
      stamina: 7,
      /** Recuperacao por segundo no chao. */
      recovery: 3,
      /** Velocidade de descida controlada ao ficar sem forca. */
      slideSpeed: 90,
      /** Impulso do salto de parede. */
      wallJumpX: 210,
      wallJumpY: 400,
      /** Tempo que o agarre sobrevive a uma falha do sensor (s). */
      grace: 0.16,
      /** Forca que cola o corpo na parede enquanto escala (px/s). */
      stick: 46,
      /** Subida extra ao passar por cima de uma borda. */
      mantleSpeed: 250,
      /** Empurrao para o lado da borda ao passar por cima. */
      mantlePush: 150,
    },
    /** Stats base — ver /data/tools.ts para bonus de ferramenta. */
    stats: {
      miningPower: 10,
      miningSpeed: 1.0,
      moveSpeed: 165,
      jumpForce: 470,
      inventoryCapacity: 40,
      lightRadius: 150,
    },
    /** Alcance de mineracao em pixels de mundo. */
    miningRange: 96,
    /** Raio em que drops sao atraidos. */
    magnetRadius: 72,
    /** Raio em que drops sao coletados. */
    pickupRadius: 18,
    /** Raio de interacao com objetos/NPC. */
    interactRadius: 52,
    /** Trava entre duas interacoes automaticas com o mesmo objeto (s). */
    autoInteractCooldown: 1.2,
  },

  mining: {
    /** Dano aplicado por "tick" de impacto; o resto do tempo acumula progresso. */
    hitsPerSecondBase: 3.2,
    /** Empurrao visual do bloco atingido (px). */
    blockHitOffset: 3,
    blockHitDecay: 12,
    /** Estagios de rachadura desenhados. */
    crackStages: 4,
    /** Tempo sem minerar ate o bloco comecar a regenerar dano (s). */
    damageResetDelay: 3.5,
    damageResetRate: 18,
    shakeOnHit: 0.7,
    shakeOnBreak: 2.4,
    /** Opacidade da textura de rachadura por cima do bloco. */
    crackOpacity: 0.85,
    /** Multiplicador de recursos quando o jackpot dispara. */
    jackpotMultiplier: 6,
  },

  drops: {
    gravity: 900,
    bounce: 0.35,
    friction: 0.82,
    initialSpeed: 120,
    lifetime: 180,
    magnetSpeed: 620,
    maxActive: 400,
    /** Tamanho do icone do drop em multiplos do raio base (9px). */
    iconScale: 1.8,
  },

  particles: {
    max: 600,
    hitCount: 4,
    breakCount: 14,
  },

  world: {
    /** Largura do mundo em tiles. */
    width: 120,
    /**
     * Altura total do mundo em tiles (inclui ceu).
     * 1 tile = 1 m, entao isto define a profundidade maxima: 2000 m + margem.
     */
    height: 2080,
    /** Linha onde comeca o solo (topo do primeiro tile solido). */
    surfaceRow: 18,
    seed: 20260915,
    chunkSize: 8,
  },

  base: {
    /** Coluna central da base na superficie. */
    centerCol: 60,
    /** Metade da largura da plataforma plana da base, em tiles. */
    halfWidth: 18,
    /**
     * Posicao de cada construcao, em tiles a partir do centro.
     * Os numeros levam em conta a largura real de cada sprite (ART.props):
     * galpao ~7 tiles, entrada da mina ~5,5, deposito ~2,2.
     */
    layout: {
      shed: -12,
      cart: -7,
      depot: -3,
      workshop: 2,
      lamp: 6,
      shaft: 10,
    },
    /** Largura do poco de entrada da mina (tiles). */
    shaftWidth: 3,
    /** Profundidade ja escavada do poco inicial (tiles). */
    shaftDepth: 8,
  },

  light: {
    /** A escuridao comeca a aparecer nesta profundidade (m) ... */
    darkStartDepth: 4,
    /** ... e chega ao maximo aqui. */
    darkFullDepth: 40,
    maxDarkness: 0.93,
    flicker: 0.02,
  },

  haptics: {
    enabled: true,
    hit: 8,
    break: 18,
    pickup: 4,
    ui: 10,
    minIntervalMs: 40,
  },

  time: {
    /** Segundos reais que um dia de jogo dura. */
    dayLengthSec: 600,
    daysPerWeek: 7,
    /** Multiplicador global do relogio (dev). */
    speed: 1,
    /** Quanto a superficie escurece na noite fechada. */
    maxNightDarkness: 0.72,
  },

  clones: {
    /** Distancia em que a copia consegue minerar um bloco. */
    reach: 46,
    /** Raio de busca por drops no chao. */
    collectSearch: 260,
    /** Raio de trabalho padrao (tiles). */
    defaultWorkRadius: 14,
    /**
     * Custo por copia impressa, em MOEDAS.
     * Pagar com recurso bruto competia com a cota da semana; pagar com moeda
     * transforma a copia no destino natural do dinheiro que ja sobra da venda.
     */
    cost: 900,
    /** O custo sobe a cada copia ja existente. */
    costGrowth: 1.6,
    /** Ate esta distancia do deposito a copia entrega andando. */
    walkToDepot: 420,
    /** Tempo fixo do envio de carga pelo poco (s). */
    sendBase: 2.5,
    /** Pixels de profundidade por segundo de envio. */
    sendSpeed: 380,
  },

  automation: {
    /**
     * Energia que a base fornece de graca.
     * Uma linha pequena funciona sem gerador; crescer exige energia.
     */
    baseEnergy: 14,
    /** Abaixo desta eficiencia a linha para de vez (evita arrasto infinito). */
    minEfficiency: 0.15,
    /** Intervalo do envio automatico do armazem para a base (s). */
    storageSendInterval: 1.2,
    storageSendAmount: 10,
    /** Distancia (tiles) em que a copia procura uma entrada de rede. */
    cloneNetworkSearch: 16,
  },

  map: {
    /** Raio revelado ao redor do jogador, em tiles (skills somam a isto). */
    baseRevealTiles: 7,
    /** Distancia para um ponto de interesse aparecer no mapa. */
    markerDiscoverTiles: 9,
    /** Minimapa: pixels de tela por tile. */
    minimapScale: 2,
    /** Minimapa: quantos tiles cabem na largura. */
    minimapTilesX: 78,
    minimapTilesY: 52,
  },

  progression: {
    /** XP do nivel 1 para o 2. */
    baseXp: 90,
    /** Expoente da curva: 1.35 dobra o custo a cada ~2 niveis. */
    curve: 1.35,
    /** Pontos de habilidade por nivel. */
    pointsPerLevel: 1,
    /** XP por bloco quebrado, multiplicado pelo valor do que ele solta. */
    xpPerBlock: 1,
    xpPerBlockValue: 0.25,
    /** XP por unidade entregue na base. */
    xpPerDelivery: 0.6,
    /** XP por criatura derrotada (guardiao vale 8x). */
    xpPerCreature: 14,
    /** XP por metro novo de profundidade. */
    xpPerMeter: 3,
  },

  skills: {
    /** Piso da recarga, para nenhum upgrade transformar ativa em passiva. */
    minCooldown: 3,
    /** Choque: quanto tempo cada arco fica na tela (s). */
    shockArcSec: 0.22,
    /** Teto de blocos atingidos por martelada, custe o que custar. */
    shockMaxTargets: 14,
    /** Peso extra para a corrente preferir blocos do mesmo material. */
    shockSameBlockBias: 3,
  },

  combat: {
    /** Alcance do golpe em criaturas (px). Um pouco maior que o de bloco. */
    attackRange: 52,
    /** Segundos com a tela avermelhada depois de levar dano. */
    hurtFlashSec: 0.45,
    /** Tempo caido antes de o resgate levar o jogador para a base (s). */
    deathDelaySec: 1.8,
    /** Vida recuperada por segundo enquanto o jogador esta na superficie da base. */
    baseHealPerSec: 26,
    /** Profundidade (m) ate onde a base cura. */
    baseHealDepth: 6,
  },

  save: {
    // v2: formato mudou muito (criaturas, vida, habilidades ativas, nivel).
    key: 'profundezas.save.v2',
    autosaveIntervalSec: 12,
  },

  debug: {
    showColliders: false,
    showFps: true,
  },
};

export type GameConfig = typeof CONFIG;
