import { CONFIG } from '../data/config';
import { RESOURCES } from '../data/resources';
import { activeSkillMeta, type ActiveSkillId } from '../data/activeSkills';
import { blockDef, type BlockDef } from '../data/blocks';
import { RESCUE_NPCS } from '../data/story';
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
import { QuotaSystem } from '../systems/QuotaSystem';
import { RescueNpc } from '../entities/RescueNpc';
import { SaveSystem } from '../systems/SaveSystem';
import { TileRenderer } from '../world/TileRenderer';
import { TimeSystem } from '../systems/TimeSystem';
import { CloneManager } from '../systems/CloneManager';
import { ActiveSkills } from '../systems/ActiveSkills';
import { Progression } from '../systems/Progression';
import { CreatureManager } from '../systems/CreatureManager';
import { DrillTool } from '../mining/DrillTool';
import { ShockChain } from '../mining/ShockChain';
import { CREATURE_CONFIG } from '../data/creatures';
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
  private vitals = new Vitals(this.attrs);
  private activeSkills = new ActiveSkills(this.attrs);
  private progression = new Progression(this.skills);
  private shock: ShockChain;
  private drill: DrillTool;
  /** De onde o jogador saiu na ultima Volta Rapida (para o retorno). */
  private recallReturn: { x: number; y: number } | null = null;
  /** Ultima camada anunciada, para avisar so na entrada. */
  private lastLayerId = '';
  /** Alvo que ja disparou sozinho neste encontro. */
  private autoArmedFor: string | null = null;
  private autoCooldown = 0;

  private interactables: Interactable[] = [];
  private clueObjects: ClueObject[] = [];
  private npcs: RescueNpc[] = [];
  private decor: SurfaceDecor;
  private worldInfo: GeneratedWorldInfo;

  private cssW = 1;
  private cssH = 1;
  private dpr = 1;
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
    this.hud = new HUD(
      uiRoot,
      this.inventory,
      this.stock,
      this.quota,
      () => this.panels.toggle('settings'),
      () => this.techScreen.toggle(),
      () => this.skillUI.toggle(),
      () => this.buildMode.toggle(),
      () => this.techScreen.openCloner(),
      () => this.activeUI.toggle()
    );
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
      },
      onResetSave: () => this.resetSave(),
      onToggleTouch: () => {
        const next = !this.touch.isVisible();
        this.touch.setVisible(next);
        return next;
      },
      isTouchVisible: () => this.touch.isVisible(),
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

    this.activeUI = new ActiveSkillsUI(uiRoot, {
      tree: this.skills,
      attrs: this.attrs,
      active: this.activeSkills,
      currentDepth: () => this.deepestMeters,
    });
    this.activeUI.bindEvents();

    this.tech = new TechTree(this.attrs, this.stock);
    this.exploration = new Exploration(this.world, this.attrs);
    this.mapScreen = new MapScreen(uiRoot, this.world, this.exploration, () => ({
      col: Math.floor(this.player.cx / CONFIG.tileSize),
      row: Math.floor(this.player.cy / CONFIG.tileSize),
    }));
    this.minimap = new Minimap(this.hud.mapSlot(), this.world, this.exploration, () =>
      this.mapScreen.open()
    );

    // Criaturas: os postos vem da geracao, entao so podem ser calculados
    // depois de o mundo existir (e antes de o save restaurar quem ja morreu).
    this.creatures = new CreatureManager(this.world, this.drops, this.exploration);
    this.creatures.buildGuardPosts();
    this.mining.strike = (dirX, dirY) => this.strikeCreatures(dirX, dirY);

    // Choque: a corrente sai do bloco atingido e gasta uma martelada.
    this.shock = new ShockChain(this.world, this.attrs);
    this.drill = new DrillTool(this.world, this.attrs);
    // Um gancho so para as duas: a martelada e a mesma, o efeito e que muda.
    this.mining.skillHit = (col, row, damage, tier, dirX, dirY) => {
      const quebra = (c: number, r: number, def: BlockDef): void =>
        this.mining.breakFromOutside(c, r, def);
      let hits = 0;
      if (this.activeSkills.isActive('drill')) {
        this.activeSkills.consume('drill');
        hits += this.drill.fire(col, row, dirX, dirY, damage, tier, quebra);
      }
      if (this.activeSkills.isActive('shock')) {
        this.activeSkills.consume('shock');
        hits += this.shock.fire(col, row, damage, tier, quebra);
      }
      return hits;
    };
    this.activeSkills.onCast = (id) => {
      if (id === 'recall') this.doRecall();
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
      stock: this.stock,
      deepest: () => this.deepestMeters,
      depthOf: (y) => this.world.depthOfPixel(y),
      spawnPoint: () => ({ x: this.player.cx, y: this.player.cy - 8 }),
      onToolUnlocked: (index) => {
        if (index > this.stats.toolIndex) this.stats.setTool(index);
      },
    });
    this.bindEvents();
    this.input.attach(canvas);

    try {
      const saved = localStorage.getItem('profundezas.shake');
      if (saved !== null) this.camera.shakeScale = Number(saved);
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
      () => this.techScreen.open()
    );

    this.clueObjects = STORY_CLUES.map((c) => new ClueObject(c));
    this.npcs = RESCUE_NPCS.map((n) => new RescueNpc(n, this.world));
    this.interactables = [depot, workshop, ...this.clueObjects, ...this.npcs];
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
    });


    Events.on('clue:found', (p) => {
      this.exploration.setMarkerDone(p.id);
      this.skills.setStoryFlag(p.id);
      this.skills.addPoints(1, 'pista encontrada');
      this.save();
    });
    Events.on('npc:rescued', (p) => {
      this.exploration.setMarkerDone(p.id);
      this.skills.setStoryFlag(p.id);
      this.skills.addPoints(2, 'resgate');
      this.save();
    });
    // Toda entrega (jogador, copia ou linha) conta para a cota da semana.
    Events.on('automation:delivered', (p) =>
      this.quota.registerDelivery(p.resource as never, p.amount)
    );
    Events.on('time:week', (p) => this.quota.onWeekChanged(p.week));
    // --- fontes de XP: tudo que e "jogar" empurra a barra ---
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
    Events.on('clone:delivered', (p) => {
      const ts = CONFIG.tileSize;
      const x = this.worldInfo.depotCol * ts + ts / 2;
      const y = (this.worldInfo.baseFloorRow - 1) * ts;
      this.floating.push(x, y - 16, `Copia ${p.index + 1}: +${p.total}`, '#7fd8e8', 12);
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
      this.particles.burst(p.worldX, p.worldY, p.guardian ? 22 : 10, ['#e0a94b', '#8d8d95'], {
        speed: 120,
      });
      this.camera.addShake(p.guardian ? 6 : 2);
      if (p.skillPoints > 0) this.skills.addPoints(p.skillPoints, `${p.name} derrotado`);
      if (p.guardian) this.save();
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
    const unlock = () => AudioSystem.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.save();
        this.input.releaseAll();
      } else {
        this.lastTime = performance.now();
      }
    });
    window.addEventListener('pagehide', () => this.save());
  }

  private loadOrStart(): void {
    const data = SaveSystem.load();
    if (!data) {
      this.player.setPosition(this.worldInfo.spawnX, this.worldInfo.spawnY);
      this.camera.snapTo(this.player.cx, this.player.cy);
      this.hud.toast('Pegue a picareta do seu pai e desca.', 'story');
      return;
    }

    // Mundo: seed + diferencas gravadas.
    const pairs: [number, number][] = [];
    for (let i = 0; i < data.tiles.length; i += 2) {
      pairs.push([data.tiles[i], data.tiles[i + 1]]);
    }
    this.world.applyOverrides(pairs);

    this.stats.setTool(data.toolIndex ?? 0);
    this.inventory.fromJSON(data.inventory);
    this.stock.fromJSON(data.stock);
    this.quota.fromJSON(data.quota);
    this.skills.fromJSON(data.skills);
    this.exploration.fromJSON(data.exploration);
    this.clock.fromJSON(data.clock);
    this.tech.fromJSON(data.tech);
    this.cloneManager.fromJSON(data.clones);
    this.automation.fromJSON(data.automation);
    this.creatures.fromJSON(data.creatures);
    this.vitals.fromJSON(data.vitals);
    this.activeSkills.fromJSON(data.activeSkills);
    this.progression.fromJSON(data.progression);
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

    this.update(dt);
    this.render();
    this.input.endFrame();

    this.fpsAccum += dt;
    this.fpsFrames++;
    if (this.fpsAccum >= 0.5) {
      this.fps = this.fpsFrames / this.fpsAccum;
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }

    requestAnimationFrame(this.frame);
  };

  private update(dt: number): void {
    this.playTime += dt;
    this.clock.update(dt);
    this.dialog.update(dt);

    const uiBlocking =
      this.dialog.isOpen ||
      this.panels.isOpen ||
      this.skillUI.isOpen ||
      this.mapScreen.isOpen ||
      this.activeUI.isOpen ||
      this.techScreen.isOpen;
    // No modo construir o toque no mundo constroi, entao a mineracao para.
    const building = this.buildMode.isActive;
    if (uiBlocking || this.vitals.dead) {
      this.input.setPadAxis(0, 0);
    } else {
      this.player.update(dt, this.input, this.world);
      if (!building) this.mining.update(dt, this.input, this.touch.isVisible());
    }
    // Canalizar exige estar parado no chao e inteiro.
    const podeCanalizar =
      !this.vitals.dead &&
      this.player.onGround &&
      Math.abs(this.player.vx) < 12 &&
      this.vitals.hurtFlash <= 0;
    this.activeSkills.update(dt, podeCanalizar);
    this.shock.update(dt);
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
    this.automation.update(dt);
    this.structures.update(dt);
    this.buildMode.updateEnergy();
    this.player.wallJumpUnlocked = this.attrs.has('wallJump');
    this.playerSprite.heavy = this.inventory.used >= this.inventory.capacity * 0.9;
    this.playerSprite.update(dt, this.player);

    this.world.update(dt);
    this.procs.update(dt);
    this.player.loadRatio = this.inventory.loadRatio;
    this.drops.update(dt, this.player);
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
    this.hud.setClonerAvailable(this.tech.unlocked('cloner'));
    this.hud.setClimb(this.player.climbRatio, this.player.climbingWall !== 0 && !this.player.chimney);
    this.hud.update(
      target?.prompt() ?? null,
      target?.auto ? '' : 'E',
      this.skills.points
    );
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
        label: `${npc.id === 'npc_jonas' ? 'Jonas' : npc.id} (base)`,
        alwaysVisible: true,
      });
      slot++;
      this.save();
    }
  }

  /** Le os botoes de habilidade (tela e teclado) e liga o que der. */
  private pollSkillButtons(): void {
    const ids: ActiveSkillId[] = ['shock', 'drill', 'recall'];
    for (let i = 0; i < ids.length; i++) {
      const botao = `skill${i + 1}` as 'skill1' | 'skill2' | 'skill3';
      if (!this.input.wasPressed(botao)) continue;
      const id = ids[i];
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
  private strikeCreatures(dirX: number, dirY: number): boolean {
    const critical = this.procs.roll('combatCritical');
    const damage =
      this.attrs.get('combatDamage') *
      (critical ? this.attrs.get('combatCriticalMultiplier') : 1);
    return this.creatures.attack(
      this.player.cx,
      this.player.cy,
      dirX,
      dirY,
      CONFIG.combat.attackRange + this.attrs.get('miningRange') * 0.25,
      damage,
      { critical, guardianBonus: this.attrs.get('bossDamage') }
    );
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

    if (!target) {
      this.autoArmedFor = null;
      this.hud.setPromptTarget(null);
      return;
    }
    this.hud.setPromptTarget(target.auto ? null : () => target.interact());

    if (uiBlocking) return;

    // Tecla/botao explicito continua valendo para tudo.
    if (this.input.wasPressed('interact')) {
      target.interact();
      this.autoArmedFor = target.id;
      this.autoCooldown = CONFIG.player.autoInteractCooldown;
      return;
    }

    if (!target.auto) return;
    // Ja disparou neste encontro: so rearma depois de sair e voltar.
    if (this.autoArmedFor === target.id && this.autoCooldown > 0) return;
    if (this.autoArmedFor === target.id) {
      // Deposito com mochila nova: vale entregar de novo.
      if (!this.inventory.isEmpty && target.id === 'depot') {
        this.autoCooldown = CONFIG.player.autoInteractCooldown;
        target.interact();
      }
      return;
    }
    this.autoArmedFor = target.id;
    this.autoCooldown = CONFIG.player.autoInteractCooldown;
    target.interact();
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
    this.drops.render(ctx);
    this.creatures.render(ctx);
    this.cloneManager.render(ctx);
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
    this.shock.render(ctx);
    this.floating.render(ctx);

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

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.cssW = Math.max(1, rect.width);
    this.cssH = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, CONFIG.render.maxDpr);
    this.canvas.width = Math.floor(this.cssW * this.dpr);
    this.canvas.height = Math.floor(this.cssH * this.dpr);
    this.camera.resize(this.cssW, this.cssH);
    this.lighting.resize(this.cssW, this.cssH);
    // Arte HD e reduzida na tela: precisa de suavizacao. Placeholder nao.
    this.ctx.imageSmoothingEnabled = Assets.hasBlockArt || Assets.hasCharacterArt;
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
      tiles: flat,
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
      vitals: this.vitals.toJSON(),
      activeSkills: this.activeSkills.toJSON(),
      progression: this.progression.toJSON(),
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
