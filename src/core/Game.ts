import { CONFIG } from '../data/config';
import { ART } from '../data/art';
import { TOOLS } from '../data/tools';
import { RESOURCES } from '../data/resources';
import { activeSkillMeta } from '../data/activeSkills';
import { blockDef, type BlockDef } from '../data/blocks';
import { RESCUE_NPCS, rescueName } from '../data/story';
import { Camera } from './camera';
import { CLUES as STORY_CLUES } from '../data/story';
import { Exploration } from '../systems/Exploration';
import { LAYERS, layerAt } from '../data/layers';
import { MapScreen } from '../ui/MapScreen';
import { Minimap } from '../ui/Minimap';
import { Events } from './events';
import { clamp } from './math';
import { AudioSystem } from '../systems/AudioSystem';
import { BaseStock } from '../systems/BaseStock';
import { ClueObject } from '../entities/ClueObject';
import { ScrollObject } from '../entities/ScrollObject';
import { SCROLLS } from '../data/scrolls';
import { Depot, SurfaceDecor, Workshop } from '../entities/Base';
import { DialogUI } from '../ui/DialogUI';
import { DropManager } from '../entities/DropManager';
import { FloatingText } from '../fx/FloatingText';
import { generateWorld, type GeneratedWorldInfo } from '../world/WorldGen';
import { Haptics } from '../fx/Haptics';
import { HUD } from '../ui/HUD';
import { InputManager } from '../input/InputManager';
import { Inventory } from '../systems/Inventory';
import { Lighting, type LightSource } from '../fx/Lighting';
import { MiningSystem } from '../mining/MiningSystem';
import { PanelUI } from '../ui/PanelUI';
import { Particles } from '../fx/Particles';
import { Assets } from './Assets';
import { Attributes } from '../systems/Attributes';
import { Background } from '../world/Background';
import { Player } from '../player/Player';
import { PlayerStats } from '../player/PlayerStats';
import { Procs } from '../systems/Procs';
import { SkillTree } from '../systems/SkillTree';
import { ActiveSkillsUI } from '../ui/ActiveSkillsUI';
import { SkillTreeUI } from '../ui/SkillTreeUI';
import { PlayerSprite } from '../player/PlayerSprite';
import { equipDef } from '../data/equipment';
import { QuotaSystem } from '../systems/QuotaSystem';
import { RescueNpc } from '../entities/RescueNpc';
import { SaveSystem } from '../systems/SaveSystem';
import { TileRenderer } from '../world/TileRenderer';
import { TimeSystem } from '../systems/TimeSystem';
import { VoiceEcho } from '../ui/VoiceEcho';
import { CloneCompass } from '../ui/CloneCompass';
import { CloneManager } from '../systems/CloneManager';
import { CollectorManager } from '../systems/CollectorManager';
import { Equipment } from '../systems/Equipment';
import { ActiveSkills } from '../systems/ActiveSkills';
import { WeaponSystem } from '../systems/WeaponSystem';
import { Progression } from '../systems/Progression';
import { GATE_LAYERS, gateArenaCol, gateBandRows, gateLayerDef } from '../data/gates';
import { StoryGates } from '../systems/StoryGates';
import { storyGateAtRow } from '../data/storyGates';
import { MINE_CLOSED, PROLOGUE } from '../data/prologue';
import { BaseCamps } from '../systems/BaseCamps';
import { BaseCampRenderer } from '../world/BaseCampRenderer';
import { BASE_CAMPS, baseCampAt } from '../data/basecamp';
import { Journal } from '../systems/Journal';
import { JournalUI } from '../ui/JournalUI';
import { BossBar } from '../ui/BossBar';
import { Telas } from '../ui/Telas';
import { BaseCampUI } from '../ui/BaseCampUI';
import { BaseTerminal } from '../entities/BaseTerminal';
import { BaseDepot } from '../entities/BaseDepot';
import { Missions } from '../systems/Missions';
import { Reputation } from '../systems/Reputation';
import { CityNpc } from '../entities/CityNpc';
import { BLOCKIA_NPCS } from '../data/blockia';
import { OUTPOST_NPCS } from '../data/outpost';
import { blockiaLayout } from '../world/Blockia';
import { BiomeGate } from '../systems/BiomeGate';
import { CreatureManager } from '../systems/CreatureManager';
import { DrillTool } from '../mining/DrillTool';
import { ShockChain } from '../mining/ShockChain';
import { CREATURE_CONFIG, bossForLayer, creatureDef } from '../data/creatures';
import { Vitals } from '../systems/Vitals';
import { TechScreen } from '../ui/TechScreen';
import { TechTree } from '../systems/TechTree';
import { Automation } from '../systems/Automation';
import { BuildMode } from '../ui/BuildMode';
import { StructureRenderer } from '../world/StructureRenderer';
import { TouchControls } from '../input/TouchControls';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { World } from '../world/World';
import type { Interactable } from '../entities/Interactable';

/** Orquestrador: monta o mundo, roda o loop e conecta os sistemas. */
export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private world = new World();
  private tileRenderer: TileRenderer;
  private lighting = new Lighting();
  private background = new Background();
  private camera = new Camera();
  private particles = new Particles();
  private floating = new FloatingText();
  private input = new InputManager();
  private touch: TouchControls;

  /** Camada de atributos: base + ferramenta + habilidades. */
  private attrs = new Attributes();
  private skills = new SkillTree(this.attrs);
  private procs = new Procs(this.attrs);
  private stats = new PlayerStats(this.attrs);
  private player = new Player(this.stats);
  private playerSprite = new PlayerSprite();
  private inventory: Inventory;
  private stock = new BaseStock();
  private quota: QuotaSystem;
  private upgrades: UpgradeSystem;
  private drops: DropManager;
  private mining: MiningSystem;

  private hud: HUD;
  private dialog: DialogUI;
  private panels: PanelUI;
  private weapons!: WeaponSystem;
  /**
   * Municao FABRICADA guardada fora da mochila.
   *
   * As armas basicas nao usam isto: elas comem pedra direto do inventario. O
   * contador fica para a bala fabricada das armas melhores, que ainda vao
   * entrar — e por isso continua no save.
   */
  private municao = 0;
  /**
   * A MAO ATUAL.
   *
   * Picareta e arma nao trabalham juntas. Com as duas ativas ao mesmo tempo o
   * jogador nunca escolhe nada — ele alterna sem pensar, atira, minera, atira,
   * e a pergunta "com que mao eu encaro esta galeria?" deixa de existir. Aqui
   * ela existe: trocar e um gesto seu, e leva um instante.
   */
  private mao: 'picareta' | 'arma' = 'picareta';
  /** Ja pintamos o quadro que fica de foto atras da tela cheia? */
  private mundoCongelado = false;
  /** O erro de quadro so e impresso uma vez: sessenta por segundo cega. */
  private jaAvisouDoErro = false;
  private skillUI: SkillTreeUI;
  private activeUI: ActiveSkillsUI;
  private exploration: Exploration;
  private clock = new TimeSystem();
  private tech: TechTree;
  private cloneManager: CloneManager;
  private techScreen: TechScreen;
  private automation: Automation;
  private structures: StructureRenderer;
  private buildMode: BuildMode;
  private minimap: Minimap;
  private mapScreen: MapScreen;
  private creatures: CreatureManager;
  private biomeGate!: BiomeGate;
  private storyGates!: StoryGates;
  private missions!: Missions;
  private journal: Journal;
  private camps: BaseCamps;
  private campsRenderer!: BaseCampRenderer;
  private journalUI!: JournalUI;
  private campUI!: BaseCampUI;
  private vitals = new Vitals(this.attrs);
  private activeSkills = new ActiveSkills(this.attrs);
  private progression = new Progression(this.skills);
  private shock: ShockChain;
  private drill: DrillTool;
  private compass: CloneCompass;
  private collectors: CollectorManager;
  private equipment = new Equipment(this.attrs, this.stock);
  /** De onde o jogador saiu na ultima Volta Rapida (para o retorno). */
  private recallReturn: { x: number; y: number } | null = null;
  /** Ate quando o Faro deixa o minerio visivel atraves da rocha (ms). */
  private senseUntil = 0;
  /** Ritmo da martelada de obra, em segundos. */
  private buildTimer = 0;
  /** Ultima camada anunciada, para avisar so na entrada. */
  private lastLayerId = '';
  /** Alvo que ja disparou sozinho neste encontro. */
  /**
   * Quem ja disparou sozinho NESTA aproximacao.
   *
   * Era um id unico mais um relogio, e isso e que fazia o NPC falar sem parar:
   * bastava outro interagivel ficar por um quadro mais perto — um pergaminho,
   * o deposito, o proprio mineiro andando — para o id trocar, o anterior
   * desarmar e tudo comecar de novo. Agora cada alvo lembra do proprio estado
   * e so rearma quando o jogador REALMENTE se afasta dele.
   */
  private autoArmed = new Set<string>();
  private autoCooldown = 0;
  /** Carencia do aviso do selo: bater dez vezes nao pode dar dez cartazes. */
  private selAviso = 0;

  private interactables: Interactable[] = [];
  private clueObjects: ClueObject[] = [];
  private scrollObjects: ScrollObject[] = [];
  private npcs: RescueNpc[] = [];
  private voices = new VoiceEcho();
  /** Moldura da luta de chefe. Escuta eventos sozinha; o Game so a desliga. */
  private bossBar!: BossBar;
  /**
   * O dono das telas cheias: garante no maximo uma aberta por vez.
   *
   * Nasce antes do HUD porque os botoes da barra ja passam por ele.
   */
  private telas = new Telas();
  private reputation = new Reputation();
  private cityNpcs: CityNpc[] = [];
  private decor: SurfaceDecor;
  private worldInfo: GeneratedWorldInfo;

  private cssW = 1;
  private cssH = 1;
  private dpr = 1;
  /*
   * RESOLUCAO ADAPTATIVA.
   *
   * Num Mac de tela Retina o `devicePixelRatio` e 2, e isso significa QUATRO
   * vezes mais pixels para rasterizar a cada quadro. Numa maquina folgada nem
   * se nota; numa apertada e a diferenca entre 20 e 45 fps, e nenhuma otimizacao
   * de codigo compete com simplesmente pintar menos pixel.
   *
   * Entao o jogo mede o proprio quadro e ajusta: apertou, desce a escala; sobrou
   * folga por um tempo, sobe de novo. A escada e curta e o passo e grosso de
   * proposito — reescalar canvas custa, e ficar oscilando seria pior que o
   * problema. Quem quiser fixar resolve em Ajustes (`setRenderScale`).
   */
  private renderScale = 1;
  private renderScaleFixa = false;
  private quadroMedio = 16.7;
  private tempoNaFaixa = 0;
  private lastTime = 0;
  private accumulatedSave = 0;
  private running = false;
  /** Depois de apagar o save, nenhuma gravacao pode acontecer (nem no pagehide do reload). */
  private saveDisabled = false;

  // Estatisticas do save.
  private deepestMeters = 0;
  private playTime = 0;
  private fps = 60;
  private fpsAccum = 0;
  private fpsFrames = 0;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D nao suportado neste dispositivo.');
    this.ctx = ctx;

    this.inventory = new Inventory(this.attrs);
    this.quota = new QuotaSystem(
      this.stock,
      this.clock,
      this.skills,
      () => this.deepestMeters
    );
    this.upgrades = new UpgradeSystem(this.stats, this.stock);
    this.drops = new DropManager(this.world, this.inventory, this.attrs);
    this.tileRenderer = new TileRenderer(this.world);
    this.mining = new MiningSystem(
      this.world,
      this.player,
      this.particles,
      this.floating,
      this.drops,
      this.camera,
      this.attrs,
      this.procs
    );

    this.worldInfo = generateWorld(this.world);
    this.decor = new SurfaceDecor(this.worldInfo.baseFloorRow);

    this.touch = new TouchControls(this.input, uiRoot);
    this.dialog = new DialogUI(uiRoot);
    // Nasce antes de tudo que emite evento: o guia so anota o que ele ouve, e
    // um evento perdido e uma anotacao que nunca existiu.
    this.camps = new BaseCamps(this.stock);
    this.journal = new Journal(() => this.world.depthOfPixel(this.player.cy));

    this.hud = new HUD(
      uiRoot,
      this.inventory,
      this.stock,
      this.quota,
      // Todos os botoes da barra passam pelo coordenador. Antes cada um
      // chamava `toggle()` na sua propria tela, e abrir a segunda deixava a
      // primeira aberta atras dela.
      () => this.telas.alternar('ajustes', () => this.panels.open('settings')),
      () => this.telas.alternar('tecnologia', () => this.techScreen.open()),
      () => this.telas.alternar('atributos', () => this.skillUI.open()),
      () => this.telas.alternar('guia', () => this.journalUI.open()),
      () => this.telas.alternar('skills', () => this.activeUI.open())
    );
    this.campUI = new BaseCampUI(uiRoot, this.camps, {
      total: () => this.collectors.units.length,
      max: () => this.collectors.max,
      custo: () => this.collectors.costFor(),
      moedas: () => this.stock.money,
      // Quantas estao trabalhando NESTA camada: e a resposta para "vale a pena
      // contratar mais uma aqui?", que nao e a mesma pergunta que o total.
      naBase: (base) =>
        this.collectors.units.filter(
          (u) => Math.abs(this.world.depthOfPixel(u.y) - base.depth) <= 120
        ).length,
      // Nasce no proprio balcao: a toupeira contratada na base do magma nao
      // tem por que aparecer na superficie e descer 900 m a pe.
      contratar: (base) => {
        const p = this.camps.depotPos(base, this.world.surfaceRow, CONFIG.tileSize);
        return !!this.collectors.buy(p.x, p.y - CONFIG.tileSize);
      },
    });
    this.journalUI = new JournalUI(uiRoot, this.journal, {
      current: () => this.missions.current(),
      done: () => this.missions.done(),
      pending: () => this.missions.pending(),
    });
    this.panels = new PanelUI(uiRoot, {
      stats: this.stats,
      stock: this.stock,
      upgrades: this.upgrades,
      progressInfo: () => ({
        clues: this.clueObjects.filter((c) => c.found).map((c) => c.id),
        npcs: this.npcs.filter((n) => n.rescued).map((n) => n.id),
        blocksMined: this.mining.blocksMined,
        deepest: this.deepestMeters,
        playTime: this.playTime,
      }),
      dev: {
        addPoint: (n) => this.skills.addPoints(n, 'dev'),
        unlockAll: () => this.skills.unlockAll(),
        resetSkills: () => this.skills.reset(),
        testProc: (id) => this.procs.force(id),
        setDepth: (m) => {
          this.deepestMeters = Math.max(this.deepestMeters, m);
          this.skills.checkDepthMilestone(this.deepestMeters);
        },
        spawnCreature: (id) => {
          this.creatures.spawnAt(id, this.player.cx + 90 * this.player.facing, this.player.cy);
        },
        hurtPlayer: (n) => this.hurtPlayer(n, this.player.cx - 20),
        darMunicao: (n) => {
          this.municao += n;
          Events.emit('ui:toast', { text: `+${n} de municao.`, tone: 'good' });
        },
      },
      onResetSave: () => this.resetSave(),
      onToggleTouch: () => {
        const next = !this.touch.isVisible();
        this.touch.setVisible(next);
        return next;
      },
      isTouchVisible: () => this.touch.isVisible(),
      renderScale: () => this.renderScale,
      renderScaleFixa: () => this.renderScaleFixa,
      setRenderScale: (v, fixar) => {
        this.setRenderScale(v, fixar);
        try {
          localStorage.setItem('profundezas.qualidade', fixar ? String(v) : 'auto');
        } catch {
          /* preferencia e opcional */
        }
      },
      shakeScale: () => this.camera.shakeScale,
      setShakeScale: (v) => {
        this.camera.shakeScale = v;
        try {
          localStorage.setItem('profundezas.shake', String(v));
        } catch {
          /* preferencia e opcional */
        }
      },
    });

    this.skillUI = new SkillTreeUI(uiRoot, {
      tree: this.skills,
      attrs: this.attrs,
      currentDepth: () => this.deepestMeters,
      dev: {
        addPoint: (n) => this.skills.addPoints(n, 'dev'),
        unlockAll: () => this.skills.unlockAll(),
        resetSkills: () => this.skills.reset(),
        testProc: (id) => this.procs.force(id),
        setDepth: (m) => {
          this.deepestMeters = Math.max(this.deepestMeters, m);
          this.skills.checkDepthMilestone(this.deepestMeters);
        },
      },
    });

    // A moldura da luta de chefe: nome, vida e o limiar da furia marcado.
    this.bossBar = new BossBar(uiRoot);

    this.activeUI = new ActiveSkillsUI(uiRoot, {
      tree: this.skills,
      attrs: this.attrs,
      active: this.activeSkills,
      stock: this.stock,
      currentDepth: () => this.deepestMeters,
    });
    this.activeUI.bindEvents();

    this.tech = new TechTree(this.attrs, this.stock);
    this.exploration = new Exploration(this.world, this.attrs);
    this.mapScreen = new MapScreen(uiRoot, this.world, this.exploration, () => ({
      col: Math.floor(this.player.cx / CONFIG.tileSize),
      row: Math.floor(this.player.cy / CONFIG.tileSize),
    }),
    () => this.teleportToBlockia());
    this.minimap = new Minimap(
      this.hud.mapSlot(),
      this.world,
      this.exploration,
      () => this.telas.abrir('mapa', () => this.mapScreen.open()),
      () => this.helperDots()
    );

    // Criaturas: os postos vem da geracao, entao so podem ser calculados
    // depois de o mundo existir (e antes de o save restaurar quem ja morreu).
    this.creatures = new CreatureManager(this.world, this.drops, this.exploration);
    this.creatures.buildGuardPosts();
    this.hud.onTrocarMao = () => this.trocarMao();
    // O coice da pose vem do TIRO que aconteceu, nao de um palpite do desenho.
    Events.on('weapon:fired', () => {
      this.playerSprite.recoil = 1;
    });
    /*
     * A PICARETA NAO FERE MAIS BICHO.
     *
     * Era o mesmo golpe para as duas coisas, e isso achatava o jogo: chegar
     * perto era sempre a resposta, e a parede era so entulho no caminho. Com a
     * arma separada, a picareta volta a ser ferramenta de TERRENO e a rocha
     * passa a ser cobertura — o `strike` fica desligado de proposito, nao por
     * esquecimento.
     */
    this.weapons = new WeaponSystem(
      this.world,
      this.player,
      this.attrs,
      (x, y, raio, dano) =>
        this.creatures.damageArea(x, y, raio, dano * (1 + this.attrs.get('bossDamage') * 0)),
      {
        /*
         * A CARTUCHEIRA E A MOCHILA.
         *
         * A pistola come PEDRA, e pedra ja esta ali — nao ha contador
         * separado nem viagem a base para poder atirar. O que isso muda de
         * verdade nao e a conveniencia: e que ficar sem municao passa a
         * significar "vai minerar", que e o proprio jogo, em vez de "sobe e
         * volta".
         *
         * Cada arma diz o que come; a fabricada (`ammo_round`) continua
         * valendo para as melhores, e cai no mesmo caminho porque ela tambem
         * e um recurso de mochila.
         */
        tem: () => this.inventory.count(this.weapons.def.ammo),
        gastar: (n) => this.inventory.remove(this.weapons.def.ammo, n) >= n,
      },
      /*
       * O que as habilidades de ARMA acrescentam a ESTE disparo.
       *
       * O sistema de tiro nao conhece habilidade nenhuma: ele pergunta, e quem
       * responde e o cinto. Gastar a carga aqui, no momento do disparo, e o que
       * faz a Rajada valer "por tiro" e nao "por segundo" — a habilidade e uma
       * preparacao que se gasta, igual as marteladas do Choque.
       */
      () => {
        const um = (id: 'rajada' | 'perfurante' | 'ricochete'): boolean => {
          const st = this.activeSkills.state(id);
          if (!st.unlocked || st.charges <= 0) return false;
          // `consume` ja poe em recarga quando a ultima carga vai embora.
          return this.activeSkills.consume(id);
        };
        return {
          balas: um('rajada') ? Math.max(1, Math.round(this.attrs.get('burstShots'))) : 1,
          furos: um('perfurante') ? Math.max(1, Math.round(this.attrs.get('pierceCount'))) : 0,
          quiques: um('ricochete') ? Math.max(1, Math.round(this.attrs.get('ricochetBounces'))) : 0,
        };
      }
    );

    // Selos entre biomas: um chefe fixo por camada, arena esculpida pelo
    // WorldGen. Derrotar o chefe rompe a barreira da proxima camada.
    // Spawnar chefes e reabrir selos ja vencidos acontece em loadOrStart(),
    // DEPOIS do save (se houver) restaurar quem ja morreu — senao um chefe
    // ja derrotado em sessao anterior voltaria vivo por um instante.
    this.biomeGate = new BiomeGate(this.world, this.exploration, this.worldInfo.gates);
    this.storyGates = new StoryGates(
      this.world,
      (id) => this.skills.hasStoryFlag(id),
      () => this.deepestMeters
    );
    this.missions = new Missions(
      (id) => this.skills.hasStoryFlag(id),
      () => this.deepestMeters
    );
    // O selo passou a exigir as missoes daquela faixa, alem do chefe. Derrubar
    // o guardiao e a ULTIMA coisa, nao a unica — assim ninguem pula nada.
    this.biomeGate.missingMissions = (layerId) => {
      const layer = gateLayerDef(layerId);
      // O corte e o TOPO da faixa do selo, nao o inicio da camada.
      //
      // Usando minDepth - 1 o selo exigia a propria missao dele: "O Segundo
      // Selo" fica a 194 m, dentro da faixa, e ela so fecha quando o selo
      // abre. O selo esperava a missao, a missao esperava o selo.
      const topo = layer.minDepth - CONFIG.gate.bandThickness - 1;
      return this.missions.missingBefore(topo);
    };
    this.campsRenderer = new BaseCampRenderer(this.world, this.camps);
    /*
     * As bases sao lugares, nao segredos — mas so depois que existem para o
     * jogador.
     *
     * Elas ficavam no mapa DESDE SEMPRE, e num save novo isso entregava a
     * tabela de profundidades do jogo inteiro antes da primeira picaretada:
     * Cristal 236, Minerais 536, Magma 936, Ruinas 1336, Abismo 1736. O mapa
     * contava o fim no minuto zero, e o jogo e sobre descobrir que ha mais
     * embaixo. Agora cada uma aparece quando o jogador chega perto da camada
     * dela (ver `revelarBases`), e continua sendo o lugar para onde voltar.
     */
    for (const base of BASE_CAMPS) {
      this.exploration.addMarker({
        id: base.id,
        kind: 'npc',
        col: base.col + Math.floor(base.largura / 2),
        row: this.world.surfaceRow + base.depth,
        label: base.nome,
        alwaysVisible: false,
      });
    }


    // Choque: a corrente sai do bloco atingido e gasta uma martelada.
    this.shock = new ShockChain(this.world, this.attrs);
    this.drill = new DrillTool(this.world, this.attrs);
    // Um gancho so para as duas: a martelada e a mesma, o efeito e que muda.
    this.mining.skillHit = (col, row, damage, tier, dirX, dirY) => {
      const quebra = (c: number, r: number, def: BlockDef): void =>
        this.mining.breakFromOutside(c, r, def);
      let hits = 0;
      const ts = CONFIG.tileSize;
      const cx = col * ts + ts / 2;
      const cy = row * ts + ts / 2;
      if (this.activeSkills.isActive('drill')) {
        // So cobra a martelada se a broca PEGOU alguma coisa.
        //
        // Antes ela gastava carga mesmo furando ar: bastava mirar perto de um
        // vao e as quatro marteladas iam embora sem quebrar um bloco. Era esse
        // o "nao funciona bem" — a habilidade funcionava, mas se gastava
        // sozinha.
        const furou = this.drill.fire(col, row, dirX, dirY, damage, tier, quebra);
        if (furou > 0) this.activeSkills.consume('drill');
        hits += furou;
        // A Broca perfura o que estiver no caminho, e bicho esta no caminho.
        // Ela atravessava uma galeria inteira e ignorava a criatura parada no
        // meio dela — o jogador aprendia a habilidade minerando e descobria na
        // pior hora possivel que ela nao servia numa luta.
        this.creatures.damageArea(
          cx + dirX * ts * 2,
          cy + dirY * ts * 2,
          ts * 2.4,
          damage * 1.4,
          true
        );
      }
      if (this.activeSkills.isActive('blast')) {
        const raio = Math.max(1, Math.round(this.attrs.get('blastRadius')));
        const forca = Math.max(1, this.attrs.get('blastPower'));
        let pegou = 0;
        for (let dr = -raio; dr <= raio; dr++) {
          for (let dc = -raio; dc <= raio; dc++) {
            if (dc * dc + dr * dr > raio * raio) continue;
            const c = col + dc;
            const r = row + dr;
            if (!this.world.inBounds(c, r)) continue;
            const def = this.world.getDef(c, r);
            if (!def.solid || def.hp <= 0) continue;
            if (
              def.tags.includes('indestructible') ||
              def.tags.includes('quest') ||
              def.tags.includes('boss')
            ) {
              continue;
            }
            const res = this.world.applyDamage(c, r, damage * forca, tier);
            if (res.applied) pegou++;
            if (res.broken) quebra(c, r, def);
          }
        }
        if (pegou > 0) {
          this.activeSkills.consume('blast');
          this.camera.addShake(5);
          this.particles.burst(cx, cy, 34, ['#ffd166', '#ff7a3a', '#ffffff'], { speed: 240 });
          this.creatures.damageArea(cx, cy, raio * ts, damage * forca * 0.8, true);
        }
        hits += pegou;
      }
      if (this.activeSkills.isActive('shock')) {
        const pegou = this.shock.fire(col, row, damage, tier, quebra);
        if (pegou > 0) this.activeSkills.consume('shock');
        hits += pegou;
        // O Choque e uma corrente: ela pega tudo em volta do ponto de impacto.
        this.creatures.damageArea(cx, cy, ts * 3.2, damage * 0.9, true);
      }
      return hits;
    };
    this.activeSkills.onCast = (id) => {
      if (id === 'recall') this.doRecall();
      if (id === 'sense') {
        // O Faro nao quebra nada: acende o minerio em volta atraves da rocha,
        // por um tempo. E a resposta para "cavei vinte metros e nao achei
        // nada" sem entregar o mapa de graca.
        this.senseUntil = performance.now() + this.attrs.get('senseDuration') * 1000;
        this.hud.toast('A pedra fica translucida por alguns segundos.', 'good');
      }
    };

    this.buildEntities();
    this.buildMarkers();

    const ts0 = CONFIG.tileSize;

    // Tiles do deposito: qualquer linha que termine aqui entrega no estoque.
    const baseTiles = new Set<number>();
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 0; dr++) {
        baseTiles.add(
          (this.worldInfo.baseFloorRow + dr) * this.world.width + this.worldInfo.depotCol + dc
        );
      }
    }
    this.automation = new Automation(this.world, this.attrs, this.stock, this.drops, baseTiles);
    this.structures = new StructureRenderer(this.automation);

    this.cloneManager = new CloneManager(
      this.world,
      this.attrs,
      this.drops,
      this.stock,
      {
        x: this.worldInfo.depotCol * ts0 + ts0 / 2,
        y: (this.worldInfo.baseFloorRow - 1) * ts0,
      },
      {
        find: (x, y) => {
          const s = this.automation.findInput(x, y, CONFIG.automation.cloneNetworkSearch);
          return s ? { col: s.col, row: s.row } : null;
        },
        insert: (col, row, r, n) => this.automation.insertAt(col, row, r, n),
      },
      (r, n) => this.quota.registerDelivery(r, n)
    );

    // Bussola aponta para tudo que trabalha longe: copias e toupeiras.
    this.compass = new CloneCompass(this.world, () => [
      ...this.cloneManager.clones.map((c) => ({
        x: c.x,
        y: c.y,
        tint: c.tint,
        index: c.index,
        label: 'C',
      })),
      ...this.collectors.units.map((u) => ({
        x: u.x,
        y: u.y,
        tint: '#d8a35a',
        index: u.index,
        label: 'T',
      })),
    ]);

    this.collectors = new CollectorManager(
      this.world,
      this.attrs,
      this.stock,
      this.drops,
      {
        x: this.worldInfo.depotCol * ts0 + ts0 / 2,
        y: (this.worldInfo.baseFloorRow - 1) * ts0,
      },
      (r, n) => this.quota.registerDelivery(r, n)
    );
    // Ganchos da base: a toupeira nao precisa saber o que e uma base de
    // extracao, so precisa saber se ha um lugar mais perto para entregar.
    this.collectors.baseFor = (depth) => this.camps.depotFor(depth)?.id ?? null;
    this.collectors.onBaseDeposit = (baseId, r, n) => this.camps.deposit(baseId, r, n);
    this.collectors.pontoDeEntrega = (depth) => {
      const base = this.camps.depotFor(depth);
      return base ? this.camps.depotPos(base, this.world.surfaceRow, CONFIG.tileSize) : null;
    };
    this.collectors.depositosProntos = () => this.camps.depotsBuilt();
    this.collectors.depositosMelhorados = () => this.camps.depotsUpgraded();

    this.buildMode = new BuildMode(uiRoot, {
      automation: this.automation,
      tech: this.tech,
      stock: this.stock,
      camera: this.camera,
      canvas,
    });
    this.techScreen = new TechScreen(uiRoot, {
      tech: this.tech,
      clones: this.cloneManager,
      collectors: this.collectors,
      equipment: this.equipment,
      attrs: this.attrs,
      stock: this.stock,
      deepest: () => this.deepestMeters,
      depthOf: (y) => this.world.depthOfPixel(y),
      spawnPoint: () => ({ x: this.player.cx, y: this.player.cy - 8 }),
      onToolUnlocked: (index) => {
        if (index > this.stats.toolIndex) this.stats.setTool(index);
      },
    });

    /*
     * O registro das telas. Feito num lugar so, DEPOIS de todas existirem.
     *
     * Enquanto cada tela cuidava de si, "quantas telas existem" estava
     * escrito a mao em dois lugares do Game e os dois ja discordavam — um
     * incluia o Guia, o outro nao. Aqui ha uma lista, e quem esquecer de
     * registrar uma tela nova perde o fecha-automatico e o Escape, que e um
     * sintoma barulhento em vez de silencioso.
     */
    this.telas.registrar('ajustes', this.panels);
    this.telas.registrar('tecnologia', this.techScreen);
    this.telas.registrar('atributos', this.skillUI);
    this.telas.registrar('guia', this.journalUI);
    this.telas.registrar('skills', this.activeUI);
    this.telas.registrar('mapa', this.mapScreen);
    this.telas.registrar('base', this.campUI);

    this.bindEvents();
    this.input.attach(canvas);

    try {
      const saved = localStorage.getItem('profundezas.shake');
      if (saved !== null) this.camera.shakeScale = Number(saved);
      const q = localStorage.getItem('profundezas.qualidade');
      if (q && q !== 'auto') {
        this.renderScale = Number(q);
        this.renderScaleFixa = true;
      }
    } catch {
      /* sem preferencia salva: usa o padrao */
    }

    this.camera.setBounds(this.world.pixelWidth, this.world.pixelHeight);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));

    this.loadOrStart();
  }

  // -------------------------------------------------------------- setup ----

  private buildEntities(): void {
    const ts = CONFIG.tileSize;
    const floorY = this.worldInfo.baseFloorRow * ts;

    const depot = new Depot(
      this.worldInfo.depotCol * ts + ts / 2,
      floorY,
      this.inventory,
      this.stock,
      this.quota,
      this.floating,
      () => this.attrs.get('deliveryValue')
    );
    const workshop = new Workshop(
      (CONFIG.base.centerCol + CONFIG.base.layout.workshop) * ts + ts / 2,
      floorY,
      () => this.telas.abrir('tecnologia', () => this.techScreen.open())
    );

    this.clueObjects = STORY_CLUES.map((c) => new ClueObject(c));
    this.npcs = RESCUE_NPCS.map((n) => new RescueNpc(n, this.world));
    // Moradores de Blockia. As coordenadas na ficha sao relativas a caverna,
    // entao mexer a cidade no config nao obriga a mexer em sete fichas.
    // As coordenadas da ficha sao uma SUGESTAO: `findStandingSpot` encaixa
    // cada morador no chao mais proximo. Sem isso, errar dois tiles ao desenhar
    // a cidade emparedava alguem — e um NPC dentro da pedra nao da erro
    // nenhum, so some da historia.
    const bl = CONFIG.blockia;
    const layout = blockiaLayout(this.world.surfaceRow);
    this.cityNpcs = [];
    // Lugares ja tomados: dois moradores encaixados no mesmo degrau ficariam um
    // dentro do outro, e so um receberia o toque.
    const ocupado = new Set<string>();
    for (const d of BLOCKIA_NPCS) {
      // Nivel 0 e a praca; 1..4 sao os terracos. A linha e sempre a de cima da
      // tabua, que e onde os pes ficam.
      const nivel = d.nivel === 0 ? null : layout.decks[d.nivel - 1];
      const alvo = nivel
        ? { col: Math.min(nivel.col1 - 1, nivel.col0 + d.offset), row: nivel.row - 1 }
        : { col: bl.col0 + 6 + d.offset, row: layout.piso };
      let spot = this.world.findStandingSpot(alvo.col, alvo.row, 40) ?? alvo;
      // Se o vizinho chegou primeiro, procura de novo a partir de dois tiles
      // ao lado, ate achar chao livre.
      for (let n = 0; n < 6 && ocupado.has(`${spot.col},${spot.row}`); n++) {
        const desvio = (n % 2 === 0 ? 1 : -1) * (2 + n);
        spot = this.world.findStandingSpot(spot.col + desvio, spot.row, 40) ?? spot;
      }
      ocupado.add(`${spot.col},${spot.row}`);
      this.cityNpcs.push(new CityNpc(d, spot.col, spot.row));
    }
    // Posto Nove: coordenadas proprias, fora da geometria de Blockia.
    for (const d of OUTPOST_NPCS) {
      const alvo = { col: d.worldCol, row: this.world.surfaceRow + d.depth };
      const spot = this.world.findStandingSpot(alvo.col, alvo.row, 20) ?? alvo;
      this.cityNpcs.push(new CityNpc(d, spot.col, spot.row));
    }
    this.scrollObjects = SCROLLS.map((sc) => new ScrollObject(sc, this.world.surfaceRow));
    this.interactables = [
      depot,
      workshop,
      ...this.clueObjects,
      ...this.scrollObjects,
      ...this.npcs,
      ...this.cityNpcs,
      ...BASE_CAMPS.map(
        (b) => new BaseTerminal(b, this.world.surfaceRow, (base) => this.telas.abrir('base', () => this.campUI.open(base)))
      ),
      ...BASE_CAMPS.map(
        (b) =>
          new BaseDepot(
            b,
            this.world.surfaceRow,
            () => this.camps.built(b.id, 'deposito'),
            () => this.despejarNaBase(b.id),
            () => this.inventory.totalUnits()
          )
      ),
    ];
  }

  /** Pontos de interesse: base, salas de historia e limites de camada. */
  private buildMarkers(): void {
    const ts = CONFIG.tileSize;
    this.exploration.addMarker({
      id: 'base',
      kind: 'base',
      col: CONFIG.base.centerCol,
      row: this.worldInfo.baseFloorRow - 1,
      label: 'Base',
      alwaysVisible: true,
    });
    this.exploration.addMarker({
      id: 'shaft',
      kind: 'custom',
      col: this.worldInfo.shaftCol,
      row: this.worldInfo.baseFloorRow + 1,
      label: 'Entrada da mina',
      alwaysVisible: true,
    });
    for (const clue of STORY_CLUES) {
      this.exploration.addMarker({
        id: clue.id,
        kind: 'clue',
        col: clue.col,
        row: clue.row,
        label: clue.title,
        alwaysVisible: false,
      });
    }
    for (const npc of RESCUE_NPCS) {
      this.exploration.addMarker({
        id: npc.id,
        kind: 'npc',
        col: npc.col,
        row: npc.row,
        label: npc.name,
        alwaysVisible: false,
      });
    }
    for (const layer of LAYERS) {
      if (!layer.generated || layer.minDepth <= 0) continue;
      this.exploration.addMarker({
        id: `layer_${layer.id}`,
        kind: 'layer',
        col: this.worldInfo.shaftCol,
        row: this.world.surfaceRow + layer.minDepth,
        label: layer.name,
        alwaysVisible: false,
      });
    }
    void ts;
  }

  private bindEvents(): void {
    AudioSystem.bindEvents();

    Events.on('resource:collect', (p) => {
      const name = p.amount > 1 ? `+${p.amount}` : '+1';
      this.floating.push(p.worldX, p.worldY - 6, name, '#ffe9a3', 10);
      Haptics.pickup();
    });

    Events.on('quota:complete', () => {
      this.camera.addShake(3);
      this.floating.push(this.player.cx, this.player.cy - 30, 'COTA CONCLUIDA!', '#9be09b', 14);
      // A partir daqui a mina passa a responder: e quando as vozes comecam.
      const primeira = !this.skills.hasStoryFlag('quota_paga');
      this.skills.setStoryFlag('quota_paga');
      this.refreshObjective();
      if (primeira) {
        this.hud.toast('Alguma coisa bate na pedra, la embaixo. Ritmado demais para ser desabamento.', 'story');
      }
    });
    Events.on('quota:new', () => this.refreshObjective());


    Events.on('clue:found', (p) => {
      this.exploration.setMarkerDone(p.id);
      this.skills.setStoryFlag(p.id);
      this.skills.addPoints(1, 'pista encontrada');
      this.refreshObjective();
      this.save();
    });
    Events.on('npc:rescued', (p) => {
      // Cada resgatado ensina um sistema. Quem foi tirado de debaixo da pedra
      // e a melhor pessoa possivel para explicar como o jogo funciona.
      const ficha = RESCUE_NPCS.find((n) => n.id === p.id);
      // Quem tem posto vai trabalhar na base em vez de ficar parado na
      // superficie. Eles queriam chegar mais fundo — agora chegaram.
      if (ficha?.worksAt) {
        this.camps.assign(ficha.worksAt.base, ficha.worksAt.bonus);
        this.spawnWorker(ficha);
        this.hud.toast(`${p.name} foi trabalhar na Base do Cristal.`, 'good');
      }
      const aula = ficha?.teaches;
      if (aula) {
        this.hud.celebrate(aula.titulo, p.name, aula.texto, 'progress', 3);
      }
      this.exploration.setMarkerDone(p.id);
      this.skills.setStoryFlag(p.id);
      this.skills.addPoints(2, 'resgate');
      this.refreshObjective();
      this.save();
    });
    // O caderno ensina. O jogador chegava na Vilma com uma pilha de pontos sem
    // saber que dava para gastar — a aula tem que vir com o primeiro ponto,
    // nao com o quinto resgate.
    Events.on('skill:points', (p) => {
      if (p.gained <= 0) return;
      this.journal.write(
        'pistas',
        'guia_skills',
        'Pontos de habilidade',
        'Anotacao de Santiago: "Ponto guardado nao quebra pedra. Gaste em ATRIBUTOS para bater mais forte e carregar mais, e em SKILLS para comprar Broca, Choque e Volta Rapida."'
      );
    });

    Events.on('quota:failed', () => {
      Events.emit('dialog:open', {
        lines: MINE_CLOSED,
        onClose: () => this.resetSave(),
      });
    });

    // Conhecer um morador tambem e progresso de missao: o Posto Nove inteiro
    // e "converse com o Rui".
    Events.on('city:met', (p) => {
      this.skills.setStoryFlag(p.id);
      this.refreshObjective();
      this.save();
    });

    Events.on('mission:done', (p) => {
      // Fechar uma missao pode ser a ultima condicao de um selo.
      this.biomeGate.recheck();
      this.hud.celebrate('MISSAO CONCLUIDA', p.title, p.text, 'progress', 3);
    });

    Events.on('gate:blocked', (p) => {
      this.camera.addShake(4);
      // So os tres primeiros: a lista inteira num selo fundo tem dez itens e
      // vira um paredao de texto que ninguem le.
      const mostra = p.faltam.slice(0, 3).join(' · ');
      const resto = p.faltam.length > 3 ? ` (+${p.faltam.length - 3})` : '';
      this.hud.celebrate('A PAREDE NAO CEDE', 'Falta fechar o que ficou para tras', mostra + resto, 'quota', 3);
    });

    /*
     * Bater no selo tem que RESPONDER.
     *
     * Antes o golpe sumia no vazio: a mineracao via um bloco indestrutivel e
     * parava o raio ali, sem rachadura, sem som, sem uma linha de texto. O
     * jogador batia na parede que segura a campanha inteira e ficava sem saber
     * se aquilo era uma parede especial ou um bug.
     *
     * A resposta muda conforme o que falta, porque sao duas situacoes bem
     * diferentes: ou o guardiao ainda esta vivo em algum lugar da faixa, ou
     * ele ja caiu e o que segura sao missoes deixadas para tras.
     */
    Events.on('seal:hit', (p) => {
      if (this.selAviso > 0) return;
      this.selAviso = 4;
      this.camera.addShake(2.4);
      // Selo de HISTORIA vem primeiro: ele mora dentro da camada, entao a
      // conta do selo de bioma nao o reconhece.
      const historia = storyGateAtRow(this.world.surfaceRow, p.row);
      if (historia) {
        this.hud.celebrate(historia.titulo, 'Isto nao e pedra.', historia.aviso, 'quota', 3);
        return;
      }
      const camada = this.camadaDoSelo(p.row);
      if (!camada) {
        this.hud.toast('A parede nao cede.', 'warn');
        return;
      }
      const def = gateLayerDef(camada);
      if (!this.biomeGate.bossDefeated(camada)) {
        /*
         * A dica tem que saber ONDE o jogador esta.
         *
         * O texto fixo mandava "ache ele pelo poco principal", e isso vinha de
         * quando a arena era uma caixa escondida em outro lugar. Hoje o selo E
         * o piso da camara do guardiao: quem bate nele de dentro da arena
         * estava sendo mandado procurar um bicho que esta a dez metros dele.
         *
         * Fora da arena a dica tambem estava vaga. A camara ocupa 35 colunas
         * em volta de `gateArenaCol()`, entao da para dizer o lado — e dizer o
         * lado e o maximo: apontar a coluna exata entregaria o mapa.
         */
        const arenaCol = gateArenaCol();
        const meia = Math.floor(CONFIG.gate.arenaWidth / 2);
        const colJogador = Math.floor(this.player.cx / this.world.tileSize);
        const fora = colJogador - arenaCol;
        const dica =
          Math.abs(fora) <= meia
            ? `O guardiao de ${def?.name ?? 'la embaixo'} respira nesta sala. O chao so cede depois dele.`
            : `O guardiao de ${def?.name ?? 'la embaixo'} ainda respira. A camara dele fica ${
                fora > 0 ? 'a oeste' : 'a leste'
              }, nesta mesma profundidade.`;
        this.hud.celebrate(
          'O SELO NAO CEDE',
          'Isto nao e pedra. Alguem fechou esta passagem.',
          dica,
          'quota',
          3
        );
        return;
      }
      const faltam = this.missions.missingBefore(
        (def?.minDepth ?? 0) - CONFIG.gate.bandThickness - 1
      );
      if (faltam.length === 0) {
        // Ja pode abrir: o `recheck` resolve no mesmo quadro.
        this.biomeGate.recheck();
        return;
      }
      const mostra = faltam.slice(0, 3).map((m) => m.title).join(' · ');
      const resto = faltam.length > 3 ? ` (+${faltam.length - 3})` : '';
      this.hud.celebrate(
        'A PAREDE NAO CEDE',
        'O guardiao caiu, mas ficou coisa para tras',
        mostra + resto,
        'quota',
        3
      );
    });

    Events.on('gate:opened', (p) => {
      // A camada nova se abre brilhando: uma chuva de veios prosperos logo
      // abaixo do selo, com prazo. E o convite para descer AGORA, enquanto
      // dura — e o que transforma "matei o chefe" em "vem comigo".
      const cfg = CONFIG.rich;
      const band = gateBandRows(this.world.surfaceRow, gateLayerDef(p.layerId));
      const lit = this.world.richBurst(
        band.row1 + 1,
        band.row1 + cfg.gateRows,
        cfg.gateBurst,
        cfg.gateDurationSec
      );
      this.camera.addShake(8);
      this.floating.push(
        this.player.cx,
        this.player.cy - 40,
        `SELO ABERTO: ${p.layerName.toUpperCase()}`,
        '#ffd166',
        16
      );
      this.particles.burst(this.player.cx, this.player.cy, 30, ['#9a4fe0', '#ffd166'], {
        speed: 180,
      });
      this.hud.toast(
        `A barreira de ${p.layerName} se rompeu! ${lit} veios prosperos acesos por ${Math.round(cfg.gateDurationSec / 60)} minutos.`,
        'story'
      );
      this.skills.setStoryFlag(`gate_${p.layerId}`);
      this.refreshObjective();
      this.save();
    });
    // Toda entrega (jogador, copia ou linha) conta para a cota da semana.
    Events.on('automation:delivered', (p) =>
      this.quota.registerDelivery(p.resource as never, p.amount)
    );
    Events.on('time:week', (p) => this.quota.onWeekChanged(p.week));
    // --- fontes de XP: tudo que e "jogar" empurra a barra ---
    Events.on('base:deposit', (p) => {
      // Primeira entrega numa base: anota, e so a primeira. Uma linha por
      // carrinho de toupeira encheria o guia de ruido.
      const base = BASE_CAMPS.find((b) => b.id === p.base);
      if (base) {
        this.journal.write(
          'lugares',
          `base:${p.base}`,
          base.nome,
          'As toupeiras passaram a entregar aqui. Nao sobem mais ate a superficie.'
        );
      }
    });

    Events.on('base:built', (p) => {
      // Construir estrutura vira flag de historia: e assim que a missao da
      // base sabe que ela foi fundada.
      this.skills.setStoryFlag(`${p.base}:${p.kind}`);
      this.refreshObjective();
      this.hud.celebrate('CONSTRUIDO', p.nome, 'A base ficou um pouco mais viva', 'progress', 2);
      this.journal.write('lugares', `base:${p.base}:${p.kind}`, p.nome, 'Construi isto com as minhas maos.');
      this.save();
    });
    Events.on('base:building', (p) => {
      this.hud.toast(`${p.nome}: estrutura erguendo. Leva um tempo.`, 'info');
    });

    Events.on('block:break', (p) => {
      const c = CONFIG.progression;
      const def = blockDef(p.blockId);
      const value = def.drop ? RESOURCES[def.drop].value : 0;
      this.progression.add(c.xpPerBlock + value * c.xpPerBlockValue, 'mineracao');
    });
    Events.on('delivery:done', (p) =>
      this.progression.add(p.total * CONFIG.progression.xpPerDelivery, 'entrega')
    );
    Events.on('automation:delivered', (p) =>
      this.progression.add(p.amount * CONFIG.progression.xpPerDelivery * 0.5, 'linha')
    );
    Events.on('creature:killed', (p) =>
      this.progression.add(
        CONFIG.progression.xpPerCreature * (p.guardian ? 8 : 1),
        'criatura derrotada'
      )
    );
    Events.on('level:up', (p) => {
      this.camera.addShake(2);
      this.floating.push(this.player.cx, this.player.cy - 34, `NIVEL ${p.level}`, '#ffe9a3', 16);
    });

    // Entrega de copia: aparece no deposito, para dar para ver o resultado do
    // trabalho delas sem abrir tela nenhuma.
    // Minerio voltando: um brilho curto, para o jogador notar que a mina se
    // refaz sem precisar ler nada.
    Events.on('block:regrow', (p) => {
      if (Math.hypot(p.worldX - this.player.cx, p.worldY - this.player.cy) > 420) return;
      const def = blockDef(p.blockId);
      this.particles.sparks(p.worldX, p.worldY, 6, def.oreGlow ?? '#ffe9a3');
    });
    Events.on('collector:burrow', (p) => {
      this.particles.dust(p.worldX, p.worldY, 2, '#8d6a48');
    });

    Events.on('collector:delivered', (p) => {
      const ts = CONFIG.tileSize;
      const x = this.worldInfo.depotCol * ts + ts / 2;
      const y = (this.worldInfo.baseFloorRow - 1) * ts;
      this.floating.push(
        x,
        y - 24,
        `Toupeira ${p.index + 1}: +${p.total} · ✦${p.money}`,
        '#d8c3a5',
        12
      );
    });
    Events.on('clone:delivered', (p) => {
      const ts = CONFIG.tileSize;
      const x = this.worldInfo.depotCol * ts + ts / 2;
      const y = (this.worldInfo.baseFloorRow - 1) * ts;
      this.floating.push(
        x,
        y - 16,
        `Copia ${p.index + 1}: +${p.total} · ✦${p.money}`,
        '#7fd8e8',
        12
      );
      this.particles.burst(x, y, 6, ['#7fd8e8', '#ffe9a3'], { speed: 70 });
    });

    Events.on('skill:drill', (p) => {
      const ts = CONFIG.tileSize;
      this.camera.addShake(2.2);
      this.particles.burst(
        p.worldX + p.dirX * ts,
        p.worldY + p.dirY * ts,
        10,
        ['#d9c08a', '#8d8d95'],
        { dirX: p.dirX, dirY: p.dirY, spread: 0.9, speed: 180, size: 4 }
      );
    });
    Events.on('skill:recall', (p) => {
      this.particles.burst(p.from.x, p.from.y, 18, ['#9be0ff', '#ffe9a3'], { speed: 150 });
    });

    Events.on('creature:hurt', (p) => {
      this.floating.push(
        p.worldX,
        p.worldY,
        p.critical ? `${p.damage}!` : String(p.damage),
        p.critical ? '#ffd166' : '#ff9b8a',
        p.critical ? 13 : 10
      );
    });
    Events.on('creature:killed', (p) => {
      const isBiomeBoss = !!creatureDef(p.id)?.bossOfLayer;
      this.particles.burst(
        p.worldX,
        p.worldY,
        isBiomeBoss ? 40 : p.guardian ? 22 : 10,
        isBiomeBoss ? ['#9a4fe0', '#ffd166', '#ffffff'] : ['#e0a94b', '#8d8d95'],
        { speed: isBiomeBoss ? 220 : 120 }
      );
      this.camera.addShake(isBiomeBoss ? 12 : p.guardian ? 6 : 2);
      if (p.skillPoints > 0) this.skills.addPoints(p.skillPoints, `${p.name} derrotado`);
      if (isBiomeBoss) {
        const money = creatureDef(p.id)?.moneyReward ?? 0;
        if (money > 0) this.stock.money += money;
        this.floating.push(
          p.worldX,
          p.worldY - 30,
          `${p.name} DERROTADO${money > 0 ? ` · +${money}` : ''}`,
          '#ffd166',
          16
        );
        this.hud.toast(`${p.name} caiu. A barreira está se rompendo!`, 'story');
        this.skills.setStoryFlag(p.id);
        this.biomeGate.onBossKilled(p.id);
        this.refreshObjective();
        this.save();
      } else if (p.guardian) {
        this.save();
      }
    });
    Events.on('player:hurt', (p) => {
      this.camera.addShake(4);
      this.particles.burst(this.player.cx, this.player.cy, 6, ['#b8432f', '#ff7d68'], {
        speed: 90,
      });
      this.floating.push(this.player.cx, this.player.cy - 22, `-${p.damage}`, '#ff6a5a', 12);
      Haptics.break_();
    });
    Events.on('tech:researched', (p) => {
      if (p.unlocks === 'cloner') {
        Events.emit('ui:toast', { text: 'Copiadora disponivel na oficina.', tone: 'good' });
      }
    });

    // Desbloqueia o audio no primeiro gesto do usuario.
    //
    // `once: true` nao serve: o iOS suspende o contexto sozinho ao trocar de
    // app, ao bloquear a tela e depois de um silencio longo, e uma vez
    // desbloqueado o jogo ficava mudo para sempre. Agora todo gesto reconfirma
    // — `unlock` sai barato quando o contexto ja esta rodando.
    const unlock = () => AudioSystem.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.save();
        this.input.releaseAll();
      } else {
        this.lastTime = performance.now();
        // Voltar para o jogo tem que trazer o som de volta junto.
        AudioSystem.unlock();
      }
    });
    window.addEventListener('pagehide', () => this.save());
  }

  private loadOrStart(): void {
    // Mundo trocando: se havia luta em curso, ela nao existe mais.
    this.bossBar.esconder();
    const data = SaveSystem.load();
    if (!data) {
      this.player.setPosition(this.worldInfo.spawnX, this.worldInfo.spawnY);
      this.camera.snapTo(this.player.cx, this.player.cy);
      this.hud.toast('Pegue a picareta do seu pai e desca.', 'story');
      // Jogo novo: nenhum selo foi aberto, nenhum chefe morreu — spawna os 6.
      this.biomeGate.spawnBosses(this.creatures);
      this.settleMissions();
      // Prologo: quem e o pai, por que a mina reabriu e o que a cota custa.
      // Antes disso o jogo comecava sem dizer que alguem tinha desaparecido.
      Events.emit('dialog:open', { lines: PROLOGUE });
      return;
    }

    // Mundo: seed + diferencas gravadas.
    //
    // O indice e plano e depende da largura. Quando o mundo alarga, todo save
    // antigo precisa ser reindexado — senao cada tile quebrado reaparece
    // deslocado. A largura de origem vem do save; 120 e a de antes do campo
    // existir.
    const larguraSalva = data.worldWidth ?? 120;
    const remapear = larguraSalva !== this.world.width;
    const pairs: [number, number][] = [];
    for (let i = 0; i < data.tiles.length; i += 2) {
      let idx = data.tiles[i];
      if (remapear) {
        const col = idx % larguraSalva;
        const row = (idx - col) / larguraSalva;
        if (col >= this.world.width) continue; // coluna que nao existe mais
        idx = row * this.world.width + col;
      }
      pairs.push([idx, data.tiles[i + 1]]);
    }
    this.world.applyOverrides(pairs);
    // A fila de renascimento tambem e indexada por largura. Num save
    // reindexado ela e simplesmente descartada: o pior que acontece e alguns
    // minerios quebrados demorarem mais uma rodada para voltar.
    this.world.applyRegrow(remapear ? undefined : data.regrow);

    this.stats.setTool(data.toolIndex ?? 0);
    this.inventory.fromJSON(data.inventory);
    this.stock.fromJSON(data.stock);
    this.quota.fromJSON(data.quota);
    this.skills.fromJSON(data.skills);
    this.exploration.fromJSON(data.exploration);
    this.reputation.fromJSON(data.reputation);
    this.journal.fromJSON(data.journal);
    this.camps.fromJSON(data.camps);
    this.activeSkills.equippedFromJSON(data.equipped as never);
    // Municao e mao voltam do save: sem isto, fabricar quarenta balas na base e
    // recarregar a pagina apagava as quarenta, e o jogo voltava sempre com as
    // vinte e quatro do comeco. Trabalho do jogador nao pode evaporar.
    this.municao = data.municao ?? this.municao;
    this.mao = data.mao === 'arma' ? 'arma' : 'picareta';
    this.activeSkills.mao = this.mao;
    // Quem ja foi resgatado num save antigo volta direto para o posto: sem
    // isso a base perdia a equipe a cada recarregamento.
    for (const ficha of RESCUE_NPCS) {
      if (!ficha.worksAt) continue;
      if (!this.skills.hasStoryFlag(ficha.id)) continue;
      this.camps.assign(ficha.worksAt.base, ficha.worksAt.bonus);
      this.spawnWorker(ficha);
    }
    const lidos = new Set(data.scrolls ?? []);
    for (const sc of this.scrollObjects) sc.found = lidos.has(sc.id);
    const conhecidos = new Set(data.cityMet ?? []);
    for (const n of this.cityNpcs) n.met = conhecidos.has(n.id);
    this.clock.fromJSON(data.clock);
    this.tech.fromJSON(data.tech);
    this.cloneManager.fromJSON(data.clones);
    this.automation.fromJSON(data.automation);
    this.creatures.fromJSON(data.creatures);
    this.biomeGate.fromJSON(data.gates);
    // So agora, com o estado certo carregado, decide o que reabrir e quem
    // spawnar: selo ja aberto vira ar de novo; chefe ja morto nao volta.
    // Retroativo: saves feitos antes das flags de chefe e selo existirem
    // tinham o progresso guardado SO no BiomeGate. Sem isto, quem ja tinha
    // matado a Matriarca e aberto o selo do Cristal voltava com as missoes
    // desses feitos em aberto — progresso perdido sem nenhum erro aparecer.
    for (const layerId of GATE_LAYERS) {
      if (this.biomeGate.bossDefeated(layerId)) {
        const boss = bossForLayer(layerId);
        if (boss) this.skills.setStoryFlag(boss.id);
      }
      if (this.biomeGate.isOpen(layerId)) this.skills.setStoryFlag(`gate_${layerId}`);
    }
    // Selos de historia: quem ja tem a flag passa. Vale principalmente para
    // save ANTIGO — o mundo e regerado do zero a cada carga, entao uma faixa
    // criada depois do save nasceria selada com o jogador do outro lado dela.
    this.storyGates.sync(true);
    const refechados = this.biomeGate.enforce();
    if (refechados.length > 0) {
      this.hud.toast(
        `O selo de ${refechados.join(' e ')} se refez: ha objetivo pendente antes dele.`,
        'warn'
      );
    }
    this.biomeGate.reopenSavedGates();
    this.biomeGate.spawnBosses(this.creatures);
    this.settleMissions();
    this.vitals.fromJSON(data.vitals);
    this.activeSkills.fromJSON(data.activeSkills);
    this.progression.fromJSON(data.progression);
    this.collectors.fromJSON(data.collectors);
    this.equipment.fromJSON(data.equipment);
    this.mining.blocksMined = data.stats?.blocksMined ?? 0;
    this.deepestMeters = data.stats?.deepestMeters ?? 0;
    this.playTime = data.stats?.playTime ?? 0;

    for (const clue of this.clueObjects) {
      if (data.cluesFound?.includes(clue.id)) clue.found = true;
    }
    for (const npc of this.npcs) {
      const state = data.npcs?.[npc.id];
      if (state) npc.setState(state as never);
    }

    this.player.setPosition(data.player.x, data.player.y);
    this.player.unstuck(this.world);
    this.camera.snapTo(this.player.cx, this.player.cy);
    this.tileRenderer.invalidateAll();
    this.hud.toast('Expedicao retomada.', 'info');
  }

  // --------------------------------------------------------------- loop ----

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    // dt limitado: evita "teleporte" depois de a aba ficar em segundo plano.
    const dt = clamp((now - this.lastTime) / 1000, 0, 1 / 20);
    this.lastTime = now;

    /*
     * UMA EXCECAO NAO PODE MATAR O JOGO.
     *
     * `requestAnimationFrame` so e reagendado no fim deste quadro. Sem o
     * try/catch, qualquer erro em `update` ou `render` estoura para fora e o
     * proximo quadro NUNCA e agendado: o jogo congela de vez, com o contador
     * de FPS parado no ultimo valor lido — parece que esta rodando a 60, e nao
     * esta rodando. Perdi uma sessao inteira caçando um bug que era isso.
     *
     * Aqui o quadro ruim e descartado, o erro vai para o console uma vez, e o
     * loop continua. Um quadro perdido e um soluco; o loop morto e o fim.
     */
    try {
      this.update(dt);
    /*
     * Tela cheia aberta CONGELA o mundo.
     *
     * Com Skills, Atributos, Tecnologia, Guia ou Mapa abertos o jogo inteiro
     * fica atras de um veu opaco — e continuava sendo redesenhado sessenta
     * vezes por segundo para ninguem ver. Com o fundo agora desfocado, pior
     * ainda: o `backdrop-filter` teria que refazer o borrao a cada quadro.
     *
     * O canvas GUARDA o que foi pintado, entao um quadro so depois de abrir ja
     * deixa a foto certa no fundo — e o desfoque passa a custar uma vez em vez
     * de sempre. A caixa de dialogo nao entra nisso: ela e uma tira embaixo, o
     * mundo continua a vista atras dela e tem que continuar se mexendo.
     */
      const cheia = this.telaCheiaAberta();
      if (!cheia || !this.mundoCongelado) this.render();
      this.mundoCongelado = cheia;
      this.input.endFrame();
    } catch (e) {
      if (!this.jaAvisouDoErro) {
        this.jaAvisouDoErro = true;
        console.error('[profundezas] quadro descartado:', e);
      }
    }

    this.fpsAccum += dt;
    this.fpsFrames++;
    if (this.fpsAccum >= 0.5) {
      this.fps = this.fpsFrames / this.fpsAccum;
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }

    requestAnimationFrame(this.frame);
  };

  /**
   * Alguma tela que cobre o jogo inteiro esta aberta?
   *
   * Pergunta ao coordenador em vez de manter uma lista propria. A lista
   * anterior era mantida a mao em DOIS lugares e as duas ja divergiam: uma
   * incluia o Guia, a outra nao, entao abrir o Guia nao bloqueava o que
   * deveria bloquear. Tela nova esquecida na lista e um bug que so aparece
   * meses depois.
   */
  private telaCheiaAberta(): boolean {
    return this.telas.algumaAberta;
  }

  private update(dt: number): void {
    this.playTime += dt;
    this.clock.update(dt);
    this.dialog.update(dt);

    const uiBlocking = this.dialog.isOpen || this.telas.algumaAberta;
    // No modo construir o toque no mundo constroi, entao a mineracao para.
    const building = this.buildMode.isActive;
    if (uiBlocking || this.vitals.dead) {
      this.input.setPadAxis(0, 0);
    } else {
      this.player.update(dt, this.input, this.world);
      // A picareta so trabalha com a picareta NA MAO. Com a arma sacada o
      // mesmo botao atira (ver `weapons.update` mais acima), e a mira continua
      // sendo calculada pelo sistema de mineracao porque ela e uma so.
      if (!building) {
        this.mining.update(dt, this.input, this.touch.isVisible(), this.mao === 'picareta');
      }
    }
    // Canalizar exige estar parado no chao e inteiro.
    const podeCanalizar =
      !this.vitals.dead &&
      this.player.onGround &&
      Math.abs(this.player.vx) < 12 &&
      this.vitals.hurtFlash <= 0;
    this.activeSkills.update(dt, podeCanalizar);
    this.camps.update(dt);
    this.tickConstrucao(dt);
    this.campUI.update(dt);
    this.campsRenderer.update(dt);
    this.shock.update(dt);
    /*
     * O gatilho usa a MESMA mira da picareta.
     *
     * Duas miras independentes seriam duas coisas para o polegar controlar ao
     * mesmo tempo, e no celular isso nao existe. Voce aponta para onde olha, e
     * escolhe se o que sai dali e o bico ou a bala.
     */
    if (!uiBlocking && this.input.wasPressed('swap')) this.trocarMao();
    /*
     * A ARMA atira nas TRES direcoes que o braco sabe apontar.
     *
     * A picareta continua com mira solta — ela encosta no bloco, e meio grau
     * importa. A arma nao: a folha tem tres poses e nada entre elas, entao
     * mirando a 20 graus o braco ficava reto e a bala saia torta. Agora a
     * pose, o desenho da arma e a bala saem todos do MESMO numero.
     */
    const miraDaArma = PlayerSprite.direcaoDaPose(this.mining.aimDirX, this.mining.aimDirY);
    this.weapons.update(
      dt,
      this.mao === 'arma' && !uiBlocking && !this.vitals.dead && this.input.isHeld('mine'),
      miraDaArma.x,
      miraDaArma.y
    );

    const balaDe = this.weapons.def.ammo;
    this.hud.setAmmo(this.inventory.count(balaDe), balaDe, RESOURCES[balaDe].name);
    this.hud.setMao(this.mao, this.weapons.def.shortName);
    this.touch.setRotuloAcao(this.mao === 'arma' ? 'ATIRAR' : 'MINERAR');

    if (!uiBlocking) this.pollSkillButtons();
    this.touch.syncSkills(this.activeSkills);

    const depthNow = this.world.depthOfPixel(this.player.cy);
    if (this.vitals.update(dt, depthNow)) this.rescueAfterDeath();
    if (!uiBlocking) {
      this.creatures.update(
        dt,
        { x: this.player.cx, y: this.player.cy, invulnerable: this.vitals.invulnerable },
        (damage, fromX) => this.hurtPlayer(damage, fromX)
      );
    }
    this.cloneManager.update(dt);
    this.collectors.update(dt);
    this.automation.update(dt);
    this.structures.update(dt);
    this.buildMode.updateEnergy();
    this.player.wallJumpUnlocked = this.attrs.has('wallJump');
    this.player.glideUnlocked = this.attrs.has('glide');
    this.player.jetUnlocked = this.attrs.has('jetpack');
    /*
     * O corpo do heroi segue o que ele esta VESTINDO.
     *
     * Ate aqui o slot `corpo` so mexia em numeros — defesa, carga, velocidade
     * — e o boneco na tela era sempre o mesmo. Comprar um traje era uma linha
     * de planilha, nao uma mudanca.
     */
    const corpo = this.equipment.equippedIn('corpo');
    this.playerSprite.traje = corpo ? equipDef(corpo)?.arte ?? null : null;

    this.playerSprite.heavy = this.inventory.used >= this.inventory.capacity * 0.9;
    // A pose do braco e a arma na mao seguem a MAO ATUAL e a mira.
    this.playerSprite.aiming = this.mao === 'arma';
    /*
     * ESTAR ARMADO E ATIRAR SAO COISAS DIFERENTES.
     *
     * `aiming` diz que a arma esta na mao, e isso vale ate ele trocar de volta
     * para a picareta. `atirando` e o instante do gatilho. Confundir os dois
     * deixava o braco esticado para frente o tempo todo, e o jogador passava a
     * exploracao inteira em pose de tiro.
     *
     * Mesma condicao que dispara a arma de verdade — se ela mudar, esta muda
     * junto, porque o corpo tem que estar na pose em que o tiro sai.
     */
    this.playerSprite.atirando =
      this.mao === 'arma' && !uiBlocking && !this.vitals.dead && this.input.isHeld('mine');
    this.playerSprite.aimX = this.mining.aimDirX;
    this.playerSprite.aimY = this.mining.aimDirY;
    this.playerSprite.weaponArt = this.mao === 'arma' ? this.weapons.def.id : null;
    /*
     * O QUE ELE VESTE NA TELA E O QUE ELE VESTE NA FICHA.
     *
     * Os slots de equipamento existiam e mudavam atributo, mas nao apareciam
     * no personagem — o capacete e a mochila estavam PINTADOS na animacao, os
     * mesmos sempre, comprasse o jogador o que comprasse. Agora a figura segue
     * o slot: nada equipado, nada desenhado.
     *
     * A picareta so aparece com a arma guardada. As duas dividem o mesmo
     * punho, e a troca de mao e justamente a escolha que o jogo pede — ver
     * duas coisas na mesma mao desfaria essa escolha.
     */
    /*
     * As camadas vestiveis so entram com arte de heroi NU.
     *
     * Nesta leva o capacete, a mochila e a picareta estao desenhados no corpo
     * (ver ART.character.equipamentoNoCorpo). Desenhar as pecas por cima poria
     * um segundo capacete sobre o primeiro.
     */
    const nu = !ART.character.equipamentoNoCorpo;
    this.playerSprite.capaceteArt = nu ? this.equipment.equippedIn('cabeca') : null;
    this.playerSprite.mochilaArt = nu ? this.equipment.equippedIn('costas') : null;
    this.playerSprite.picaretaArt =
      nu && this.mao !== 'arma' ? TOOLS[this.stats.toolIndex]?.key ?? null : null;
    this.weapons.boca = () => this.playerSprite.bocaDoCano(this.player);
    this.playerSprite.update(dt, this.player);

    this.world.setWatchPoint(this.player.cx, this.player.cy);
    this.world.update(dt);
    this.procs.update(dt);
    this.player.loadRatio = this.inventory.loadRatio;
    this.drops.update(dt, this.player);
    // Os mineiros presos chamam. E o unico jeito de achar o primeiro deles.
    const podeOuvir = this.skills.hasStoryFlag('quota_paga');
    for (const npc of this.npcs) npc.listen(dt, this.player.cx, this.player.cy, podeOuvir);
    this.voices.update(dt);

    this.particles.update(dt);
    this.floating.update(dt);

    for (const e of this.interactables) e.update?.(dt);

    const target = this.findInteractable();
    this.updateInteraction(dt, target, uiBlocking);

    this.camera.follow(this.player.cx, this.player.cy, this.player.vx, dt);
    this.camera.update(dt);

    this.checkNpcsHome();
    this.exploration.update(this.player.cx, this.player.cy);
    this.minimap.setVisible(!uiBlocking);
    if (!uiBlocking) this.minimap.update(this.player.cx, this.player.cy);

    const depth = depthNow;
    const layer = layerAt(depth);
    if (layer.id !== this.lastLayerId) {
      const first = this.lastLayerId === '';
      this.lastLayerId = layer.id;
      if (!first) {
        Events.emit('layer:reached', { id: layer.id, name: layer.name, tagline: layer.tagline });
      }
    }
    if (depth > this.deepestMeters) {
      this.progression.add(
        (depth - this.deepestMeters) * CONFIG.progression.xpPerMeter,
        'profundidade'
      );
      this.deepestMeters = depth;
      // Pontos de habilidade vem de descer e explorar, nunca de matar (spec, item 39).
      this.skills.checkDepthMilestone(this.deepestMeters);
    }

    this.hud.setHealth(this.vitals.health, this.vitals.max);
    this.hud.setLevel(this.progression.level, this.progression.ratio);
    this.hud.setJournalUnread(this.journal.unread);
    this.hud.setClimb(this.player.climbRatio, this.player.climbingWall !== 0 && !this.player.chimney);
    this.ajustarResolucao(dt);
    this.hud.setJet(this.player.jetRatio, this.player.jetUnlocked, this.player.jetting);
    // A camera abre ao entrar numa base. Sao 38 colunas de maquinaria que so
    // fazem sentido vistas juntas — com o enquadramento de tunel o jogador nao
    // enxerga a esteira que ele mesmo acabou de construir.
    const naBase = baseCampAt(
      Math.floor(this.player.cx / CONFIG.tileSize),
      Math.floor(this.player.cy / CONFIG.tileSize),
      this.world.surfaceRow,
      CONFIG.camera.baseZoomMargin
    );
    this.camera.setZoomOut(naBase ? CONFIG.camera.baseZoomOut : 1, dt);
    this.revelarBases();
    // Chama do jato: sem ela o empuxo e um numero invisivel. Sai DEBAIXO dos
    // pes e para baixo, que e para onde o gas vai.
    if (this.player.jetting) {
      this.particles.burst(this.player.cx, this.player.feetY - 2, 2, ['#ffd08a', '#ff7a2a'], {
        speed: 120,
        size: 2.2,
        dirY: 1,
        spread: 0.9,
        life: 0.28,
      });
    }
    // O aviso de "falar" some enquanto o dialogo esta aberto. Ele ficava por
    // cima da conversa e aceitava toque, entao um segundo toque reabria o
    // mesmo dialogo por cima do que ja estava rolando.
    this.hud.update(
      this.dialog.isOpen ? null : target?.prompt() ?? null,
      target?.auto ? '' : 'E',
      this.skills.points
    );
    /*
     * O ajuste tem que MANDAR na tela, nao so no texto.
     *
     * O contador estava escondido por CSS (`.debug { display: none }`) enquanto
     * Ajustes continuava mostrando "Mostrar FPS: LIGADO". O ajuste mentia: o
     * jogador ligava e nada acontecia. Agora a classe no <html> e a chave, e o
     * CSS so obedece a ela.
     */
    document.documentElement.classList.toggle('dev-hud', CONFIG.debug.showFps);
    if (CONFIG.debug.showFps) {
      this.hud.setDebug(
        `${this.fps.toFixed(0)} fps · ${this.drops.activeCount} drops · ${this.creatures.creatures.length}/${this.creatures.guardPostCount} criaturas · ${this.world.overrides.size} tiles alterados`
      );
    } else {
      this.hud.setDebug('');
    }

    this.accumulatedSave += dt;
    if (this.accumulatedSave >= CONFIG.save.autosaveIntervalSec) {
      this.accumulatedSave = 0;
      this.save();
    }
  }

  /** NPCs resgatados sobem para a base assim que o jogador reaparece la em cima. */
  private checkNpcsHome(): void {
    if (this.world.depthOfPixel(this.player.cy) > 4) return;
    const ts = CONFIG.tileSize;
    let slot = 0;
    for (const npc of this.npcs) {
      if (npc.state !== 'safe') continue;
      const col = CONFIG.base.centerCol + CONFIG.base.layout.shed + 3 + slot * 2;
      npc.sendHome(col * ts + ts / 2, (this.worldInfo.baseFloorRow - 1) * ts);
      this.exploration.addMarker({
        id: `${npc.id}_home`,
        kind: 'npc',
        col,
        row: this.worldInfo.baseFloorRow - 1,
        label: `${rescueName(npc.id)} (base)`,
        alwaysVisible: true,
      });
      slot++;
      this.save();
    }
  }

  /** Le os botoes de habilidade (tela e teclado) e liga o que der. */
  private pollSkillButtons(): void {
    // Os lugares do cinto; o que cada um dispara vem de la, nao daqui.
    for (let i = 0; i < ActiveSkills.SLOTS; i++) {
      const botao = `skill${i + 1}` as 'skill1' | 'skill2' | 'skill3' | 'skill4';
      if (!this.input.wasPressed(botao)) continue;
      const id = this.activeSkills.equipped[i];
      if (!id) {
        Events.emit('ui:toast', {
          text: 'Lugar vazio no cinto. Escolha uma habilidade em SKILLS.',
          tone: 'info',
        });
        continue;
      }
      const st = this.activeSkills.state(id);
      const meta = activeSkillMeta(id);
      if (st.casting > 0) {
        this.activeSkills.cancelCast(id, 'cancelada');
        continue;
      }
      if (this.activeSkills.activate(id)) continue;
      Events.emit('ui:toast', {
        text: st.unlocked
          ? `${meta.name} recarregando (${Math.ceil(st.cooldown)} s)`
          : `Aprenda ${meta.name} na tela de habilidades.`,
        tone: 'warn',
      });
    }
  }

  /**
   * Volta Rapida concluida.
   *
   * No ultimo nivel ela tem volta: o proximo uso devolve o jogador ao ponto de
   * onde ele saiu. E o que transforma "atalho para entregar" em "atalho para
   * entregar E continuar de onde parou".
   */
  private doRecall(): void {
    const voltando = this.recallReturn;
    if (voltando && this.attrs.has('recallDive')) {
      this.recallReturn = null;
      this.particles.burst(this.player.cx, this.player.cy, 14, ['#9be0ff', '#ffe9a3'], {
        speed: 120,
      });
      this.player.setPosition(voltando.x, voltando.y);
      this.player.unstuck(this.world);
      this.camera.snapTo(this.player.cx, this.player.cy);
      this.floating.push(voltando.x, voltando.y - 24, 'De volta ao ponto', '#9be0ff', 13);
      Events.emit('ui:toast', { text: 'Voce voltou para onde estava.', tone: 'good' });
      return;
    }

    const profundidade = this.world.depthOfPixel(this.player.cy);
    // So guarda o ponto se valia a pena voltar para la.
    this.recallReturn =
      this.attrs.has('recallDive') && profundidade > 20
        ? { x: this.player.cx, y: this.player.cy }
        : null;
    Events.emit('skill:recall', { from: { x: this.player.cx, y: this.player.cy } });
    this.returnToBase();
  }

  // ------------------------------------------------------------- combate ----

  /**
   * O golpe da picareta tambem e a arma. Nao existe botao de ataque:
   * mirar na criatura e atacar, mirar no bloco e minerar.
   */
  /**
   * Troca a mao.
   *
   * O troco NAO e instantaneo de graca: guardar uma coisa e sacar outra leva um
   * tempinho, e e esse tempinho que faz a escolha pesar. Sem ele, trocar vira
   * um tique e a decisao some.
   */
  private trocarMao(): void {
    this.mao = this.mao === 'picareta' ? 'arma' : 'picareta';
    // O cinto vai junto: os tres botoes do pad passam a ser os da outra mao.
    this.activeSkills.mao = this.mao;
    // O golpe em andamento morre na troca: continuar minerando de arma na mao
    // seria a mesma confusao que a troca existe para evitar.
    this.mining.cancelar();
    Haptics.ui();
    Events.emit('ui:toast', {
      text: this.mao === 'arma' ? `${this.weapons.def.name} na mao.` : 'Picareta na mao.',
      tone: 'info',
    });
  }

  /** Dano recebido: empurra, pisca e conta os iframes. */
  private hurtPlayer(damage: number, fromX: number): void {
    if (this.vitals.hurt(damage) <= 0) return;
    const push = CREATURE_CONFIG.knockback * (1 - this.attrs.get('knockbackResistance'));
    this.player.vx = Math.sign(this.player.cx - fromX || 1) * push;
    this.player.vy = Math.min(this.player.vy, -140);
    if (this.vitals.dead) {
      Events.emit('ui:toast', { text: 'Voce desmaiou...', tone: 'warn' });
    }
  }

  /**
   * Resgate. A punicao e perder parte da carga e o tempo de descer de novo —
   * habilidade, tecnologia, mapa e base continuam intactos (GDD §20).
   */
  private rescueAfterDeath(): void {
    let lost = 0;
    for (const [id, amount] of this.inventory.entries()) {
      const drop = Math.floor(amount * CREATURE_CONFIG.deathLossRatio);
      if (drop <= 0) continue;
      this.inventory.remove(id, drop);
      lost += drop;
    }
    this.vitals.revive();
    this.returnToBase();
    Events.emit('player:died', { lost });
    Events.emit('player:revived', {});
  }

  /**
   * Interacao sem botao.
   *
   * O que e instantaneo dispara sozinho ao chegar perto (`auto`), com trava
   * para nao repetir enquanto o jogador continua parado ali. O que abre tela
   * continua exigindo uma acao: tocar no proprio aviso, ou a tecla de sempre no
   * teclado. Assim passar pela oficina nunca sequestra o jogo.
   */
  private updateInteraction(dt: number, target: Interactable | null, uiBlocking: boolean): void {
    this.autoCooldown = Math.max(0, this.autoCooldown - dt);
    this.selAviso = Math.max(0, this.selAviso - dt);
    this.rearmarAutos();

    if (!target) {
      this.hud.setPromptTarget(null);
      return;
    }
    this.hud.setPromptTarget(target.auto ? null : () => target.interact());

    if (uiBlocking) return;
    // A MESMA tecla avanca o dialogo e interage (Espaco/Enter/E, e o toque na
    // caixa). Fechar a fala no ultimo toque deixava esse toque valendo tambem
    // como "interagir" no quadro seguinte, e a conversa reabria na hora — sem
    // fim, enquanto o jogador continuasse encostado no NPC.
    if (this.dialog.justClosed) return;

    // Tecla/botao explicito continua valendo para tudo.
    if (this.input.wasPressed('interact')) {
      target.interact();
      this.autoArmed.add(target.id);
      this.autoCooldown = CONFIG.player.autoInteractCooldown;
      return;
    }

    if (!target.auto) return;
    if (this.autoCooldown > 0) return;
    // Ja disparou nesta aproximacao: so rearma depois de sair do raio.
    if (this.autoArmed.has(target.id)) {
      // Deposito com mochila nova: vale entregar de novo.
      if (!this.inventory.isEmpty && target.id === 'depot') {
        this.autoCooldown = CONFIG.player.autoInteractCooldown;
        target.interact();
      }
      return;
    }
    this.autoArmed.add(target.id);
    this.autoCooldown = CONFIG.player.autoInteractCooldown;
    target.interact();
  }

  /**
   * Desarma o que ficou para tras.
   *
   * Com folga de 40% no raio: sem essa histerese, ficar parado bem na borda do
   * alcance rearmava e redisparava a cada quadro, que e a mesma conversa sem
   * fim por outro caminho.
   */
  private rearmarAutos(): void {
    if (this.autoArmed.size === 0) return;
    for (const e of this.interactables) {
      if (!this.autoArmed.has(e.id)) continue;
      const dx = e.x - this.player.cx;
      const dy = e.y - this.player.cy;
      const fora = e.radius * 1.4;
      if (dx * dx + dy * dy > fora * fora) this.autoArmed.delete(e.id);
    }
  }

  /**
   * Revela no mapa as bases cuja camada o jogador ja alcancou.
   *
   * A folga de 60 m e para a base aparecer um pouco ANTES: ela precisa ser um
   * destino ("tem um lugar ali embaixo"), e nao uma descoberta tardia de algo
   * por onde ele ja passou.
   */
  private revelarBases(): void {
    for (const base of BASE_CAMPS) {
      if (this.deepestMeters < base.depth - 60) continue;
      this.exploration.discoverMarker(base.id);
    }
  }

  /** De qual camada e o selo que esta nesta linha. */
  private camadaDoSelo(row: number): string | null {
    for (const id of GATE_LAYERS) {
      const def = gateLayerDef(id);
      if (!def) continue;
      const { row0, row1 } = gateBandRows(this.world.surfaceRow, def);
      if (row >= row0 && row <= row1) return id;
    }
    return null;
  }

  /** Copias e toupeiras para o mapa e a bussola. */
  private helperDots(): { x: number; y: number; tint: string }[] {
    return [
      ...this.cloneManager.clones.map((c) => ({ x: c.x, y: c.y, tint: c.tint })),
      ...this.collectors.units.map((u) => ({ x: u.x, y: u.y, tint: '#d8a35a' })),
    ];
  }

  private findInteractable(): Interactable | null {
    let best: Interactable | null = null;
    let bestDist = Infinity;
    for (const e of this.interactables) {
      if (!e.prompt()) continue;
      const dx = e.x - this.player.cx;
      const dy = e.y - this.player.cy;
      const d2 = dx * dx + dy * dy;
      if (d2 > e.radius * e.radius || d2 >= bestDist) continue;
      bestDist = d2;
      best = e;
    }
    return best;
  }

  // ------------------------------------------------------------- render ----

  private render(): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const depth = this.world.depthOfPixel(this.player.cy);
    // Parallax pintado; se a arte nao existir, cai no ceu vetorial de sempre.
    if (
      !this.background.render(
        ctx,
        this.camera,
        depth,
        this.cssW,
        this.cssH,
        this.dpr,
        this.clock.skyWeights()
      )
    ) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.drawSky(ctx);
    }

    ctx.setTransform(
      this.camera.scale * this.dpr,
      0,
      0,
      this.camera.scale * this.dpr,
      Math.round(-this.camera.left * this.camera.scale * this.dpr),
      Math.round(-this.camera.top * this.camera.scale * this.dpr)
    );

    this.decor.render(ctx);
    this.tileRenderer.render(ctx, this.camera);
    for (const e of this.interactables) e.render(ctx);
    this.structures.render(ctx, this.camera);
    this.drops.render(ctx, this.camera);
    this.creatures.render(ctx, this.camera);
    this.weapons.render(ctx, this.camera);
    this.cloneManager.render(ctx, this.camera);
    this.collectors.render(ctx, this.camera);
    // As estruturas da base ficam AQUI, antes do jogador: ele tem que passar
    // na frente delas. Os avisos delas continuam na camada pos-luz.
    this.campsRenderer.render(ctx, this.camera);
    this.mining.render(ctx);
    // Sprite real quando a arte existe; senao o placeholder vetorial.
    if (!this.playerSprite.render(ctx, this.player)) {
      this.player.render(ctx);
    }
    this.particles.render(ctx);
    this.buildMode.render(ctx);

    // Iluminacao (em espaco de tela).
    const lights: LightSource[] = [
      {
        x: this.player.cx,
        y: this.player.cy - 8,
        radius: this.player.stats.lightRadius,
        intensity: 1,
      },
      // Lampiao da entrada da mina.
      {
        x: (this.worldInfo.shaftCol - 2.6) * CONFIG.tileSize,
        y: (this.worldInfo.baseFloorRow - 2.3) * CONFIG.tileSize,
        radius: 130,
        intensity: 0.85,
      },
      // Guardioes brilham: dao para ver de longe que ha algo guardando ali.
      ...this.creatures.lights(),
    ];
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.lighting.render(
      ctx,
      this.camera,
      this.world,
      lights,
      this.world.depthOfPixel(this.player.cy),
      this.cssW,
      this.cssH,
      1 / 60,
      this.clock.nightDarkness
    );

    // Camada pos-luz: brilhos e textos precisam ficar visiveis no escuro.
    ctx.setTransform(
      this.camera.scale * this.dpr,
      0,
      0,
      this.camera.scale * this.dpr,
      Math.round(-this.camera.left * this.camera.scale * this.dpr),
      Math.round(-this.camera.top * this.camera.scale * this.dpr)
    );
    for (const e of this.interactables) e.renderOverlay?.(ctx);
    this.renderSense(ctx);
    this.campsRenderer.renderOverlay(ctx, this.camera);
    this.shock.render(ctx);
    this.floating.render(ctx);

    // Bussola por ultimo: ela vive na borda da tela, nao no mundo.
    if (!this.mapScreen.isOpen) {
      this.compass.render(ctx, this.camera, this.cssW, this.cssH, this.dpr);
      this.voices.render(ctx, this.camera, this.cssW, this.cssH, this.dpr);
    }

    if (this.vitals.hurtFlash > 0 || this.vitals.dead) {
      this.renderHurtVignette(ctx);
    }
  }

  /** Vinheta vermelha: le-se sem tirar os olhos do centro da tela. */
  private renderHurtVignette(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const alpha = this.vitals.dead ? 0.5 : this.vitals.hurtFlash * 0.45;
    const g = ctx.createRadialGradient(
      this.cssW / 2,
      this.cssH / 2,
      Math.min(this.cssW, this.cssH) * 0.28,
      this.cssW / 2,
      this.cssH / 2,
      Math.max(this.cssW, this.cssH) * 0.72
    );
    g.addColorStop(0, 'rgba(120, 12, 8, 0)');
    g.addColorStop(1, `rgba(150, 16, 10, ${alpha.toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    if (this.vitals.dead) {
      ctx.fillStyle = 'rgba(255, 228, 210, 0.92)';
      ctx.font = '600 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Voce desmaiou', this.cssW / 2, this.cssH / 2 - 6);
      ctx.font = '500 13px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 228, 210, 0.7)';
      ctx.fillText('sendo levado para a base...', this.cssW / 2, this.cssH / 2 + 16);
      ctx.textAlign = 'left';
    }
  }

  private drawSky(ctx: CanvasRenderingContext2D): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const horizonWorldY = this.worldInfo.baseFloorRow * CONFIG.tileSize;
    const horizonScreen = (horizonWorldY - this.camera.top) * this.camera.scale * this.dpr;

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#101a2c');
    g.addColorStop(0.55, '#2a3d52');
    g.addColorStop(1, '#4a5a63');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    if (horizonScreen < -h) {
      // Bem fundo: fundo escuro solido (mais barato e mais legivel).
      ctx.fillStyle = '#0b0a0d';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    // Morros distantes com parallax.
    const px = -this.camera.left * 0.25 * this.camera.scale * this.dpr;
    ctx.fillStyle = '#243444';
    ctx.beginPath();
    const baseY = Math.min(h, horizonScreen);
    ctx.moveTo(-200, baseY);
    for (let i = -2; i < 14; i++) {
      const x = px + i * 220 * this.dpr;
      ctx.lineTo(x, baseY - (60 + ((i * 37) % 60)) * this.dpr);
      ctx.lineTo(x + 110 * this.dpr, baseY);
    }
    ctx.lineTo(w + 200, baseY);
    ctx.lineTo(w + 200, h);
    ctx.lineTo(-200, h);
    ctx.closePath();
    ctx.fill();
  }

  // --------------------------------------------------------------- misc ----

  /**
   * A escala das telas cheias.
   *
   * O layout inteiro foi medido num espaco de 700 px de altura. Numa tela mais
   * baixa que isso — celular deitado tem 393 — a tela nao ADAPTA peca por peca:
   * ela encolhe junto, na mesma proporcao, moldura e letra. Adaptar cada peca
   * por conta propria dava seis telas diferentes em vez de uma, e era por isso
   * que nenhuma ficava parecida com a referencia.
   *
   * Tem que ser aqui e nao no CSS: `zoom` so aceita numero puro, e
   * `calc(100vh / 700)` devolve um COMPRIMENTO. A regra caia inteira, em
   * silencio, e a tela vazava para fora da viewport.
   */
  private ajustarEscalaDaUI(): void {
    const { uiRefHeight, uiMinZoom } = CONFIG.render;
    const z = Math.min(1, Math.max(uiMinZoom, this.cssH / uiRefHeight));
    document.documentElement.style.setProperty('--ui-zoom', z.toFixed(3));
    // A classe liga as regras de escala. Sem ela o computador nao paga nada:
    // nenhuma conta de `zoom`, nenhum `vw` no lugar de porcentagem.
    document.documentElement.classList.toggle('ui-escala', z < 0.999);
  }

  private resize(): void {
    // Mudou o tamanho: o canvas foi limpo, entao a foto congelada morreu junto
    // e o proximo quadro tem que pintar o mundo de novo.
    this.mundoCongelado = false;
    const rect = this.canvas.getBoundingClientRect();
    this.cssW = Math.max(1, rect.width);
    this.cssH = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, CONFIG.render.maxDpr) * this.renderScale;
    this.canvas.width = Math.floor(this.cssW * this.dpr);
    this.canvas.height = Math.floor(this.cssH * this.dpr);
    this.ajustarEscalaDaUI();
    this.camera.resize(this.cssW, this.cssH);
    this.lighting.resize(this.cssW, this.cssH);
    // Arte HD e reduzida na tela: precisa de suavizacao. Placeholder nao.
    this.ctx.imageSmoothingEnabled = Assets.hasBlockArt || Assets.hasCharacterArt;
  }

  /**
   * Sobe ou desce a resolucao conforme o quadro esta cabendo.
   *
   * A media e exponencial e lenta de proposito: um engasgo isolado — um chunk
   * novo, uma explosao — nao pode derrubar a resolucao do jogo inteiro. So uma
   * janela inteira acima do orcamento e que conta.
   */
  private ajustarResolucao(dt: number): void {
    if (this.renderScaleFixa) return;
    const ms = Math.min(120, dt * 1000);
    this.quadroMedio += (ms - this.quadroMedio) * 0.05;
    this.tempoNaFaixa += dt;
    if (this.tempoNaFaixa < CONFIG.render.adaptiveWindowSec) return;
    this.tempoNaFaixa = 0;

    const { adaptiveMinScale, adaptiveTargetMs, adaptiveRelaxMs, adaptiveStep } = CONFIG.render;
    if (this.quadroMedio > adaptiveTargetMs && this.renderScale > adaptiveMinScale) {
      this.setRenderScale(Math.max(adaptiveMinScale, this.renderScale - adaptiveStep));
    } else if (this.quadroMedio < adaptiveRelaxMs && this.renderScale < 1) {
      this.setRenderScale(Math.min(1, this.renderScale + adaptiveStep));
    }
  }

  /** Fixa a resolucao (0 volta para o automatico). Usado pelos Ajustes. */
  setRenderScale(v: number, fixar = false): void {
    if (fixar) this.renderScaleFixa = v > 0;
    if (v <= 0) {
      this.renderScaleFixa = false;
      return;
    }
    if (Math.abs(v - this.renderScale) < 0.01) return;
    this.renderScale = v;
    this.quadroMedio = 16.7;
    this.resize();
  }

  get renderScaleAtual(): number {
    return this.renderScale;
  }

  /**
   * Recalcula a frase do card "Objetivo Atual".
   *
   * Regra do dono: enquanto a cota da semana esta aberta, o objetivo E a cota.
   * Assim que ela fecha, o card passa a apontar a proxima peca da historia — a
   * pista ou o mineiro mais raso que ainda falta. E o que faz o jogador querer
   * descer mais, e descer mais exige evoluir.
   */
  /**
   * Alinha as missoes ao que o save ja contem, sem festa.
   *
   * Carregar um jogo com oito missoes feitas despejaria oito toasts e oito
   * pagamentos de uma vez; a primeira passada apenas registra que elas ja
   * estavam fechadas.
   */
  private settleMissions(): void {
    this.missions.check(true, () => {});
    this.refreshObjective();
  }

  /**
   * Atalho de teste: poe o jogador na praca de Blockia.
   *
   * Procura chao de verdade antes de soltar (a praca e escavada, mas o piso
   * ondula), abre o mapa da regiao e marca a cidade como descoberta — chegar
   * la sem a cidade aparecer no mapa seria pior que nao chegar.
   */
  private teleportToBlockia(): void {
    const bl = CONFIG.blockia;
    const col = Math.round((bl.col0 + bl.col1) / 2);
    const row = this.world.surfaceRow + bl.depth1;
    const spot = this.world.findStandingSpot(col, row, 60) ?? { col, row };
    const ts = CONFIG.tileSize;
    this.player.setPosition(spot.col * ts + ts / 2, spot.row * ts + ts / 2);
    this.camera.snapTo(this.player.cx, this.player.cy);
    this.exploration.addMarker({
      id: 'blockia',
      kind: 'npc',
      col: spot.col,
      row: spot.row,
      label: 'Blockia',
      alwaysVisible: true,
    });
    this.hud.toast('Blockia — 604 m. "A pedra nos fechou uma porta e nos construimos uma casa."', 'story');
  }

  /**
   * O encaixe de base em que o jogador esta encostado, se houver.
   *
   * Procura por proximidade horizontal e pela linha do chao da camara: o
   * jogador precisa estar EM PE na base, nao passando 20 metros acima dela.
   */
  private encaixeSobOJogador(): { base: (typeof BASE_CAMPS)[number]; slot: (typeof BASE_CAMPS)[number]['slots'][number] } | null {
    const ts = CONFIG.tileSize;
    const col = Math.floor(this.player.cx / ts);
    const row = Math.floor(this.player.cy / ts);
    for (const base of BASE_CAMPS) {
      const chao = this.world.surfaceRow + base.depth;
      if (row < chao - base.altura || row > chao + 1) continue;
      for (const slot of base.slots) {
        const c0 = base.col + slot.col;
        if (col >= c0 - 1 && col <= c0 + slot.tiles) return { base, slot };
      }
    }
    return null;
  }

  /**
   * Coloca um resgatado na base como trabalhador.
   *
   * Reusa o `CityNpc`: ele ja sabe andar em volta de casa, conversar e usar a
   * folha de arte certa. A ficha de morador e montada a partir da ficha do
   * mineiro, entao Jonas la embaixo e o MESMO Jonas, com a mesma cara.
   */
  private spawnWorker(ficha: (typeof RESCUE_NPCS)[number]): void {
    const posto = ficha.worksAt;
    if (!posto) return;
    // Deduplica pelo proprio id: a folha de arte do trabalhador e a mesma do
    // mineiro, entao Jonas la embaixo tem a cara do Jonas.
    if (this.cityNpcs.some((n) => n.id === ficha.id)) return;
    const base = BASE_CAMPS.find((b) => b.id === posto.base);
    if (!base) return;
    const slot = base.slots.find((s) => s.kind === (posto.bonus === 'refino' ? 'refinador' : 'elevador'));
    const alvo = {
      col: base.col + (slot?.col ?? 4) + 2,
      row: this.world.surfaceRow + base.depth,
    };
    const spot = this.world.findStandingSpot(alvo.col, alvo.row, 12) ?? alvo;
    this.cityNpcs.push(
      new CityNpc(
        {
          id: ficha.id,
          name: ficha.name,
          role: posto.bonus === 'refino' ? 'Cuida do fogo' : 'Cuida do elevador',
          nivel: 0,
          offset: 0,
          color: '#ffc453',
          trust: 0,
          lines: posto.fala.map((t) => ({ speaker: ficha.name, text: t })),
          idleLines: posto.fala,
        },
        spot.col,
        spot.row
      )
    );
    this.interactables.push(this.cityNpcs[this.cityNpcs.length - 1]);
  }

  /**
   * O Faro: minerio aceso atraves da rocha.
   *
   * Desenhado por cima dos tiles, nao dentro deles — um efeito com prazo nao
   * pode sujar o cache de chunk, porque cada segundo do timer forcaria repintar
   * a tela inteira.
   */
  private renderSense(ctx: CanvasRenderingContext2D): void {
    const resta = this.senseUntil - performance.now();
    if (resta <= 0) return;
    const ts = this.world.tileSize;
    const raio = Math.max(4, Math.round(this.attrs.get('senseRadius')));
    const col0 = Math.floor(this.player.cx / ts);
    const row0 = Math.floor(this.player.cy / ts);
    // Some suave no fim: cortar de uma vez parece bug.
    const fade = Math.min(1, resta / 1500);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let dr = -raio; dr <= raio; dr++) {
      for (let dc = -raio; dc <= raio; dc++) {
        const dist2 = dc * dc + dr * dr;
        if (dist2 > raio * raio) continue;
        const c = col0 + dc;
        const r = row0 + dr;
        if (!this.world.inBounds(c, r)) continue;
        const def = this.world.getDef(c, r);
        if (!def.drop || !def.oreGlow) continue;
        // Mais fraco na borda do alcance: o faro tem limite, e o limite tem
        // que ser sentido em vez de lido.
        const queda = 1 - Math.sqrt(dist2) / raio;
        ctx.globalAlpha = 0.5 * fade * queda;
        ctx.fillStyle = def.oreGlow;
        ctx.fillRect(c * ts + 3, r * ts + 3, ts - 6, ts - 6);
      }
    }
    ctx.restore();
  }

  /**
   * Martelar num encaixe de base constroi.
   *
   * Eu tinha ligado isso no evento `block:hit` — e por isso nao funcionava. O
   * encaixe fica no AR, em cima do piso da camara: nao ha bloco para atingir,
   * entao `block:hit` nunca disparava ali e a obra nunca comecava.
   *
   * Agora le o BOTAO direto. Enquanto o jogador segura MINERAR em pe no
   * encaixe, conta uma martelada a cada 0,3 s — o mesmo ritmo da picareta, sem
   * depender de haver pedra na frente.
   */
  private tickConstrucao(dt: number): void {
    const alvo = this.encaixeSobOJogador();
    if (!alvo || !this.input.isHeld('mine')) {
      this.buildTimer = 0;
      return;
    }
    this.buildTimer -= dt;
    if (this.buildTimer > 0) return;
    this.buildTimer = 0.3;
    if (!this.camps.hit(alvo.base, alvo.slot)) return;
    const ts = CONFIG.tileSize;
    const x = (alvo.base.col + alvo.slot.col + alvo.slot.tiles / 2) * ts;
    const y = (this.world.surfaceRow + alvo.base.depth) * ts;
    this.particles.burst(x, y, 6, ['#d9a828', '#b9c2cc'], { speed: 90, size: 2.5 });
    this.camera.addShake(1.2);
    Haptics.break_();
  }

  /**
   * Passa a mochila inteira para o deposito da base.
   *
   * Vai para o estoque BRUTO, e nao para a moeda: a base e uma etapa da
   * cadeia, nao um caixa. Quem quiser vender sobe e entrega la em cima — que e
   * a escolha que o painel do refinador tambem oferece.
   */
  private despejarNaBase(baseId: string): void {
    const itens = this.inventory.entries();
    let total = 0;
    for (const [res, qtd] of itens) {
      if (qtd <= 0) continue;
      this.camps.deposit(baseId, res, qtd);
      total += qtd;
    }
    if (total <= 0) return;
    this.inventory.clear();
    this.hud.toast(`${total} itens foram para o deposito da base.`, 'good');
    Haptics.pickup();
    this.save();
  }

  private refreshObjective(): void {
    // Toda flag de historia nova passa por aqui, entao e daqui que os selos de
    // historia acordam. Um lugar so, para nenhum caminho novo esquecer disso.
    this.storyGates.sync();
    // Paga o que acabou de fechar antes de perguntar qual e a proxima.
    this.missions.check(false, (money, points, m) => {
      if (money > 0) this.stock.money += money;
      if (points > 0) this.skills.addPoints(points, m.title);
    });
    // A MISSAO e o card, sempre.
    //
    // Antes ela so aparecia com a cota ja paga, entao na maior parte do tempo
    // o jogador nao via objetivo nenhum — depois de resgatar a Vilma parecia
    // que o jogo tinha acabado. A cota continua visivel logo abaixo, porque
    // ela tambem e um prazo.
    const m = this.missions.current();
    this.hud.setMissionObjective(m ? `${m.title}: ${m.goal}` : 'A mina acabou. A historia nao.');
  }

  save(): void {
    if (this.saveDisabled) return;
    const npcs: Record<string, string> = {};
    for (const n of this.npcs) npcs[n.id] = n.state;

    const flat: number[] = [];
    for (const [i, id] of this.world.overrides) {
      flat.push(i, id);
    }

    SaveSystem.save({
      player: { x: this.player.cx, y: this.player.cy },
      worldWidth: this.world.width,
      reputation: this.reputation.toJSON(),
      journal: this.journal.toJSON(),
      camps: this.camps.toJSON(),
      equipped: this.activeSkills.equippedToJSON(),
      municao: this.municao,
      mao: this.mao,
      cityMet: this.cityNpcs.filter((n) => n.met).map((n) => n.id),
      scrolls: this.scrollObjects.filter((s) => s.found).map((s) => s.id),
      tiles: flat,
      regrow: this.world.serializeRegrow(),
      inventory: this.inventory.toJSON(),
      stock: this.stock.toJSON(),
      toolIndex: this.stats.toolIndex,
      cluesFound: this.clueObjects.filter((c) => c.found).map((c) => c.id),
      npcs,
      quota: this.quota.toJSON(),
      skills: this.skills.toJSON(),
      exploration: this.exploration.toJSON(),
      clock: this.clock.toJSON(),
      tech: this.tech.toJSON(),
      clones: this.cloneManager.toJSON(),
      automation: this.automation.toJSON(),
      creatures: this.creatures.toJSON(),
      gates: this.biomeGate.toJSON(),
      vitals: this.vitals.toJSON(),
      activeSkills: this.activeSkills.toJSON(),
      progression: this.progression.toJSON(),
      collectors: this.collectors.toJSON(),
      equipment: this.equipment.toJSON(),
      stats: {
        blocksMined: this.mining.blocksMined,
        deepestMeters: this.deepestMeters,
        playTime: this.playTime,
      },
    });
    Events.emit('save:written', {});
  }

  /**
   * Retorno a superficie: sobe pelo poco da base.
   * Mantem a mochila — a punicao de uma expedicao ruim e o tempo, nao o progresso.
   */
  returnToBase(): void {
    if (this.dialog.isOpen) return;
    const ts = CONFIG.tileSize;
    const spawnX = this.worldInfo.spawnX;
    const spawnY = this.worldInfo.spawnY;

    this.particles.dust(this.player.cx, this.player.cy, 10, '#8d8d95');
    this.player.setPosition(spawnX, spawnY);
    this.player.unstuck(this.world);
    this.camera.snapTo(this.player.cx, this.player.cy);
    this.particles.burst(spawnX, spawnY, 12, ['#d9c08a', '#8d8d95'], { speed: 90 });
    this.floating.push(spawnX, spawnY - ts, 'De volta a base', '#ffe9a3', 12);
    Events.emit('ui:toast', { text: 'Voce subiu pelo poco da mina.', tone: 'info' });
    Haptics.ui();
    this.save();
  }

  resetSave(): void {
    this.saveDisabled = true;
    this.running = false;
    SaveSystem.clear();
    window.location.reload();
  }
}
