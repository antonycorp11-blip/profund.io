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
    /**
     * Altura em que as telas cheias foram desenhadas.
     *
     * Tudo nelas — moldura, respiro, corpo de letra — foi medido com este
     * espaco. Numa tela mais baixa a interface inteira encolhe na mesma
     * proporcao, para o celular ver o MESMO desenho do computador.
     */
    uiRefHeight: 700,
    /**
     * Piso da escala.
     *
     * Abaixo disto a letra de 9 px passa de 3,8 px e deixa de ser letra. Dali
     * em diante a tela rola em vez de encolher mais.
     */
    uiMinZoom: 0.42,
    /** Piso da resolucao adaptativa. Abaixo disto a arte comeca a papar. */
    adaptiveMinScale: 0.6,
    /** Acima deste tempo de quadro (ms) a resolucao desce. ~45 fps. */
    adaptiveTargetMs: 22,
    /**
     * Abaixo deste tempo ha folga para subir de volta.
     *
     * Tem que ficar ACIMA do piso do vsync. Estava em 14 ms, e num monitor de
     * 60 Hz o quadro nunca desce de 16,7 — entao a resolucao caia uma vez e
     * nunca mais voltava, mesmo com a maquina sobrando. A faixa morta entre
     * 18 e 22 ms e o que impede o ping-pong.
     */
    adaptiveRelaxMs: 18,
    /** Passo de cada ajuste. */
    adaptiveStep: 0.15,
    /** Quanto tempo de media antes de mexer de novo. */
    adaptiveWindowSec: 2.5,
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
    /**
     * Quanto a camera abre dentro de uma base (1 = enquadramento normal).
     *
     * 1,55 poe quase toda a camara na tela. Mais do que isso e o personagem
     * vira uma formiga; menos do que isso nao mostra a cadeia inteira, que e a
     * unica razao de abrir.
     */
    baseZoomOut: 1.55,
    /** Tiles antes da porta em que a camera ja comeca a abrir. */
    baseZoomMargin: 4,
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
    /**
     * MOCHILA A JATO.
     *
     * Segurar PULAR no ar liga o empuxo. Nao e voo livre: o tanque e curto de
     * proposito, e recarrega so no chao — o jato serve para VOLTAR de um poco
     * e corrigir um pulo, nao para pular a mina inteira. Se desse para voar,
     * escalar, corda e elevador deixariam de existir no mesmo dia.
     */
    jet: {
      /** Velocidade maxima de subida com o jato (px/s). */
      maxRise: 260,
      /** Segundos no chao para encher o tanque inteiro. */
      refillSec: 1.4,
      /** So liga depois deste tempo de voo, para nao roubar o pulo normal. */
      armAfter: 0.09,
    },
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
    /**
     * Largura do mundo em tiles.
     *
     * Eram 120 — 120 metros. Uma cidade de 430 habitantes nao cabe nisso, e a
     * biblia diz que as cidades "se estendem horizontalmente por grandes
     * areas". As colunas 0–119 geram exatamente como antes (base na 60, selo
     * na 70, trilha do Jonas), entao NADA do mapa antigo foi tirado: as 120
     * colunas novas sao espaco que nao existia.
     *
     * Dobrar so ficou barato depois que `damage`/`lastHit` viraram Map: os
     * dois Float32Array custavam 2 MB para guardar zero em quase tudo.
     */
    width: 240,
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

  /**
   * A mina se refaz.
   *
   * Sem isto, cada veio quebrado some para sempre e a mina vira casca vazia —
   * o jogador (e as copias) precisam ir sempre mais longe para achar o mesmo
   * carvao. So MINERIO volta: corredor aberto continua aberto, porque encher
   * o caminho de pedra de novo seria punir quem construiu passagem.
   */
  /**
   * Veio prospero: bloco com aura que rende muito mais.
   *
   * Dois nascedouros. Um punhado espalhado pelo mundo desde a geracao (achado
   * por acaso, recompensa quem explora de lado em vez de so descer), e uma
   * chuva deles logo abaixo do selo quando o chefe do bioma cai — a camada
   * nova se abre literalmente brilhando.
   */
  /**
   * A voz dos mineiros presos.
   *
   * O jogador nao devia tropecar no Jonas por acaso — devia ouvi-lo e ir
   * atras. Estes numeros sao o "quente e frio": raio de escuta generoso e
   * intervalo que aperta conforme chega perto.
   */
  voices: {
    /** Distancia maxima em que da para ouvir (px). */
    hearRadius: 1400,
    /** Intervalo entre gritos colado nele (s). */
    minGapSec: 2.6,
    /** Intervalo no limite da audicao (s). */
    maxGapSec: 7,
  },

  rich: {
    /** Multiplicador de recurso do bloco com aura. */
    multiplier: 4,
    /** Chance por tile de minerio de ja nascer prospero na geracao. */
    worldChance: 0.006,
    /** Quantos blocos a queda do chefe acende abaixo do selo. */
    gateBurst: 90,
    /** Quantas linhas abaixo do selo a chuva alcanca. */
    gateRows: 22,
    /** Quanto tempo a chuva do chefe dura (s). */
    gateDurationSec: 240,
  },

  regrow: {
    enabled: true,
    /** Tempo base ate um minerio quebrado voltar (s). */
    delaySec: 260,
    /** Variacao aleatoria, para o veio nao reaparecer inteiro de uma vez (s). */
    jitterSec: 140,
    /** Nao renasce a menos que isto de distancia do jogador (px). */
    safeRadius: 150,
    /** Nem acima desta profundidade: a base fica em paz. */
    minDepth: 10,
    /** Teto de blocos que voltam por segundo. */
    perSecond: 8,
  },

  /**
   * BLOCKIA — a primeira cidade subterranea (BIBLIA.md 6.1).
   *
   * Vive inteira nas colunas novas: a mina antiga, o poco e o selo continuam
   * onde sempre estiveram. A cidade fica ATRAS do selo dos Minerais (494 m),
   * entao chegar nela exige derrubar a Rainha Escavadora — que na biblia e
   * exatamente a criatura que bloqueia a rota comercial para Blockia.
   */
  blockia: {
    /** Primeira e ultima coluna da caverna da cidade. */
    col0: 132,
    col1: 232,
    /** Primeira e ultima linha (profundidade em metros a partir da superficie). */
    depth0: 560,
    depth1: 668,
    /** Profundidade da galeria que liga o poco principal a porta da cidade. */
    corridorDepth: 664,
    /** Coluna da porta de madeira reforcada. */
    gateCol: 130,
    /**
     * Quanto da escuridao da camada sobra dentro da cidade.
     *
     * Blockia tem lampiao em todo canto; isto e a garantia de que nenhuma
     * profundidade futura vai deixar a cidade preta por acidente.
     */
    darkness: 0.18,
    /** Margem em tiles ao redor da cidade onde criatura nao nasce nem entra. */
    safeMargin: 12,
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

  /**
   * Selos entre biomas: a barreira que torna o chefe de cada camada
   * obrigatorio. Ver /systems/BiomeGate.ts e /data/gates.ts.
   */
  gate: {
    /**
     * Espessura da faixa de um selo de HISTORIA (ver /data/storyGates.ts).
     *
     * Mais fina que a do selo de bioma de proposito: ela nao e um evento, e um
     * empurrao de volta. Tres tiles bastam para o jogador entender que aquilo
     * nao e pedra sem transformar a subida numa parede de fortaleza.
     */
    storyBandThickness: 3,
    /** Espessura do selo em tiles (== metros, ja que metersPerTile = 1). */
    bandThickness: 6,
    /** Largura da arena do chefe, centrada no poco principal. */
    arenaWidth: 9,
    /** Colunas de entrada diggable no topo da arena (numero impar, centrado). */
    entranceWidth: 3,
  },

  /**
   * A BANCADA de municao.
   *
   * Leva grande de proposito: fabricar de dez em dez faria o jogador voltar a
   * base toda hora, e a viagem de volta ja e o custo de verdade do jogo. A
   * conta que interessa e "gasto esse ferro em bala ou em obra?", e ela so
   * aparece se a leva for grande o bastante para doer.
   */
  ammo: {
    ferroPorLeva: 12,
    balasPorLeva: 40,
  },

  light: {
    /**
     * Brilho minimo para um bloco valer um halo de luz.
     *
     * O tijolo antigo emite 0,05 — invisivel na pratica, e mesmo assim cada
     * tile dele pintava um halo. Numa sala de pista isso eram dezenas de
     * estampas por quadro que ninguem jamais enxergou.
     */
    minEmissive: 0.1,
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
    defaultWorkRadius: 18,
    /** Abaixo disto a area e considerada esgotada e a copia se muda. */
    minOreInArea: 3,
    /** Sem trabalho por perto, procura um posto novo neste raio (tiles). */
    relocateSearch: 40,
    /** Nem assim achou: desce este tanto e abre caminho (tiles). */
    digDownStep: 12,
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

  cloneCompass: {
    /** Distancia da borda da tela ate a seta (px de tela). */
    margin: 34,
    size: 9,
    /** Quanto a etiqueta entra para dentro da seta. */
    labelOffset: 18,
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
