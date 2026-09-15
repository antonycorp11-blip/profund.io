import { blockDef, type BlockDef } from '../data/blocks';
import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import { RESOURCES, type ResourceId } from '../data/resources';
import { Assets } from '../core/Assets';
import { ART } from '../data/art';
import type { Attributes } from '../systems/Attributes';
import type { DropManager } from './DropManager';
import type { World } from '../world/World';

export type CloneFocus = 'minerar' | 'coletar' | 'equilibrado';

export interface CloneConfig {
  focus: CloneFocus;
  /** Recursos que ele deve procurar. Vazio = todos. */
  filter: ResourceId[];
  /** Entrega sozinho no deposito quando enche. */
  autoDeliver: boolean;
  /** Raio de trabalho em tiles a partir do ponto de origem. */
  workRadius: number;
}

export type CloneState =
  | 'procurando'
  | 'minerando'
  | 'coletando'
  | 'entregando'
  | 'enviando'
  | 'parado';

/** Cores das copias — cada uma recebe um tom proprio da folha do heroi. */
export const CLONE_TINTS = ['#2fb8c0', '#d07a2f', '#4fc05a', '#9a5ad0', '#d04f8a', '#c0b02f'];

const SCAN_INTERVAL = 0.45;
const STUCK_LIMIT = 9;

/**
 * Copia do protagonista: mina, coleta e entrega sozinha.
 *
 * A IA e deliberadamente simples e legivel: anda em direcao ao alvo e, se tiver
 * bloco no caminho, mina o bloco — um minerador abrindo o proprio tunel.
 */
export class Clone {
  x = 0;
  y = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  state: CloneState = 'procurando';
  /** Onde ele foi criado: centro da sua area de trabalho. */
  homeX = 0;
  homeY = 0;

  readonly w = 18;
  readonly h = 26;
  private items = new Map<ResourceId, number>();
  private scanTimer = 0;
  private mineTimer = 0;
  private stuckTimer = 0;
  private lastProgressX = 0;
  private lastProgressY = 0;
  private target: { col: number; row: number } | null = null;
  private walkPhase = 0;
  private swing = 0;
  private tintCache: HTMLCanvasElement | null = null;
  private stripTints = new Map<string, HTMLCanvasElement | null>();
  /** Tempo restante do envio de carga pelo poco. */
  private sendTimer = 0;
  private sendTotal = 1;

  constructor(
    readonly id: string,
    readonly index: number,
    public config: CloneConfig,
    private world: World,
    private attrs: Attributes,
    private drops: DropManager,
    private depot: { x: number; y: number },
    /** Entrada de rede mais proxima (esteira/armazem), se houver. */
    private findNetwork: (x: number, y: number) => { col: number; row: number } | null = () => null,
    private insertNetwork: (col: number, row: number, r: ResourceId, n: number) => number = () => 0
  ) {}

  get tint(): string {
    return CLONE_TINTS[this.index % CLONE_TINTS.length];
  }

  get cx(): number {
    return this.x;
  }

  get cy(): number {
    return this.y;
  }

  get capacity(): number {
    return this.attrs.getInt('cloneCapacity');
  }

  get carried(): number {
    let n = 0;
    for (const v of this.items.values()) n += v;
    return n;
  }

  get isFull(): boolean {
    return this.carried >= this.capacity;
  }

  entries(): [ResourceId, number][] {
    return Array.from(this.items.entries());
  }

  /** Aceita o recurso conforme o filtro configurado. */
  accepts(resource: ResourceId): boolean {
    if (this.config.focus === 'minerar' && this.state !== 'coletando') {
      // Mesmo minerando ele pega o que cai dele proprio.
    }
    return this.config.filter.length === 0 || this.config.filter.includes(resource);
  }

  add(resource: ResourceId, amount: number): number {
    if (this.isFull) return 0;
    const free = this.capacity - this.carried;
    const added = Math.min(amount, free);
    if (added > 0) this.items.set(resource, (this.items.get(resource) ?? 0) + added);
    return added;
  }

  place(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.vy = 0;
    this.state = 'procurando';
  }

  // ------------------------------------------------------------------ loop --

  update(dt: number, deliver: (items: [ResourceId, number][]) => void): void {
    this.swing = Math.max(0, this.swing - dt * 3.2);
    this.walkPhase += dt * 6;

    if (this.config.focus === 'coletar') this.updateCollector(dt);
    else this.updateMiner(dt);

    // So entra em entrega se ainda nao estiver entregando: senao o cheque
    // reiniciaria o temporizador de envio a cada frame e nunca concluiria.
    if (
      this.config.autoDeliver &&
      this.isFull &&
      this.state !== 'entregando' &&
      this.state !== 'enviando'
    ) {
      this.state = 'entregando';
    }

    if (this.state === 'entregando') {
      // Prioridade: jogar numa esteira/armazem perto. E para isso que a linha existe.
      const node = this.findNetwork(this.x, this.y);
      if (node) {
        const ts = this.world.tileSize;
        const nx = node.col * ts + ts / 2;
        const ny = node.row * ts + ts / 2;
        if (this.moveToward(nx, ny, dt, true)) {
          let left = false;
          for (const [id, qty] of this.entries()) {
            const sent = this.insertNetwork(node.col, node.row, id, qty);
            if (sent >= qty) this.items.delete(id);
            else if (sent > 0) {
              this.items.set(id, qty - sent);
              left = true;
            } else left = true;
          }
          if (!left) {
            this.state = 'procurando';
            this.target = null;
          }
        }
        return;
      }

      const dist = Math.hypot(this.depot.x - this.x, this.depot.y - this.y);
      if (dist < CONFIG.clones.walkToDepot) {
        // Perto do deposito: ela anda ate la e entrega na mao.
        if (this.moveToward(this.depot.x, this.depot.y, dt, true)) this.finishDelivery(deliver);
      } else {
        // Longe: manda a carga pelo poco. E o que o elevador vai substituir depois.
        this.sendTotal = CONFIG.clones.sendBase + dist / CONFIG.clones.sendSpeed;
        this.sendTimer = this.sendTotal;
        this.state = 'enviando';
      }
    }

    if (this.state === 'enviando') {
      this.sendTimer -= dt;
      if (this.sendTimer <= 0) this.finishDelivery(deliver);
    }

    this.applyGravity(dt);
    this.checkStuck(dt);
  }

  /** 0..1 do envio em andamento (para a UI). */
  get sendProgress(): number {
    return this.state === 'enviando' ? 1 - this.sendTimer / this.sendTotal : 0;
  }

  private finishDelivery(deliver: (items: [ResourceId, number][]) => void): void {
    deliver(this.entries());
    this.items.clear();
    this.state = 'procurando';
    this.target = null;
    this.sendTimer = 0;
  }

  private updateMiner(dt: number): void {
    if (this.state === 'entregando' || this.state === 'enviando') return;

    this.scanTimer -= dt;
    if (!this.target || this.scanTimer <= 0) {
      this.scanTimer = SCAN_INTERVAL;
      this.target = this.findBlock();
    }

    if (!this.target) {
      // Sem veio por perto: junta o que estiver no chao.
      this.state = 'procurando';
      this.moveToward(this.homeX, this.homeY, dt, true);
      return;
    }

    const ts = this.world.tileSize;
    const tx = this.target.col * ts + ts / 2;
    const ty = this.target.row * ts + ts / 2;
    const dist = Math.hypot(tx - this.x, ty - this.y);

    if (dist > CONFIG.clones.reach) {
      this.state = 'procurando';
      this.moveToward(tx, ty, dt, true);
      return;
    }

    this.state = 'minerando';
    this.facing = tx >= this.x ? 1 : -1;
    const interval = 1 / (CONFIG.mining.hitsPerSecondBase * this.attrs.get('cloneMiningSpeed'));
    this.mineTimer += dt;
    while (this.mineTimer >= interval) {
      this.mineTimer -= interval;
      this.swing = 1;
      const res = this.world.applyDamage(
        this.target.col,
        this.target.row,
        this.attrs.get('cloneMiningPower'),
        3
      );
      if (!res.applied || res.broken) {
        if (res.broken) this.onBroke(this.target.col, this.target.row, res.def);
        this.target = null;
        break;
      }
    }
  }

  private updateCollector(dt: number): void {
    if (this.state === 'entregando' || this.state === 'enviando') return;
    const near = this.drops.findNearest(this.x, this.y, CONFIG.clones.collectSearch, (r: ResourceId) =>
      this.accepts(r)
    );
    if (!near) {
      this.state = 'procurando';
      this.moveToward(this.homeX, this.homeY, dt, true);
      return;
    }
    this.state = 'coletando';
    this.moveToward(near.x, near.y, dt, true);
  }

  private onBroke(col: number, row: number, def: BlockDef): void {
    const ts = this.world.tileSize;
    if (!def.drop || Math.random() >= def.dropChance) return;
    if (!this.accepts(def.drop)) {
      // Nao e o que ele procura: deixa no chao para o jogador.
      this.drops.spawn(col * ts + ts / 2, row * ts + ts / 2, def.drop, 1);
      return;
    }
    const amount = 1 + (Math.random() < 0.35 ? 1 : 0);
    const added = this.add(def.drop, amount);
    if (added < amount) {
      this.drops.spawn(col * ts + ts / 2, row * ts + ts / 2, def.drop, amount - added);
    }
  }

  // ------------------------------------------------------------ movimento --

  /**
   * Anda em direcao ao ponto. Bloco no caminho e minerado —
   * e assim que a copia abre o proprio tunel em vez de travar numa parede.
   */
  private moveToward(tx: number, ty: number, dt: number, digThrough: boolean): boolean {
    const dx = tx - this.x;
    const dy = ty - this.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 20) return true;

    const speed = this.attrs.get('cloneMoveSpeed');
    const step = Math.sign(dx) * speed * dt;
    this.facing = dx >= 0 ? 1 : -1;

    const ts = this.world.tileSize;
    const aheadX = this.x + Math.sign(dx) * (this.w / 2 + 4);
    const blockedSide = this.world.isSolidAtPixel(aheadX, this.y);
    const needUp = dy < -ts * 0.8;
    const blockedUp = this.world.isSolidAtPixel(this.x, this.y - this.h / 2 - 4);

    if (digThrough && (blockedSide || (needUp && blockedUp))) {
      const col = Math.floor((blockedSide ? aheadX : this.x) / ts);
      const row = Math.floor((blockedSide ? this.y : this.y - this.h / 2 - 4) / ts);
      const def = this.world.getDef(col, row);
      if (!def.indestructible) {
        this.swing = 1;
        const res = this.world.applyDamage(col, row, this.attrs.get('cloneMiningPower') * 1.5, 3);
        if (res.broken) this.onBroke(col, row, res.def);
      }
      if (needUp && !blockedUp) this.y -= speed * dt;
      return false;
    }

    if (!blockedSide) this.x += step;
    if (needUp && !blockedUp) this.y -= speed * dt * 0.8;
    return false;
  }

  private applyGravity(dt: number): void {
    this.vy = Math.min(this.vy + CONFIG.physics.gravity * dt, 620);
    const ny = this.y + this.vy * dt;
    if (this.world.rectCollides(this.x - this.w / 2, ny - this.h / 2, this.w, this.h)) {
      const ts = this.world.tileSize;
      this.y = Math.floor((ny + this.h / 2) / ts) * ts - this.h / 2 - 0.01;
      this.vy = 0;
    } else {
      this.y = ny;
    }
  }

  /** Se ficar preso, volta para a base em vez de travar para sempre. */
  private checkStuck(dt: number): void {
    if (Math.abs(this.x - this.lastProgressX) > 6 || Math.abs(this.y - this.lastProgressY) > 6) {
      this.lastProgressX = this.x;
      this.lastProgressY = this.y;
      this.stuckTimer = 0;
      return;
    }
    this.stuckTimer += dt;
    if (this.stuckTimer < STUCK_LIMIT) return;
    this.stuckTimer = 0;
    this.target = null;
    this.x = this.homeX;
    this.y = this.homeY;
    Events.emit('ui:toast', { text: `Copia ${this.index + 1} reposicionada.`, tone: 'info' });
  }

  /** Procura o bloco mais proximo que bate com o filtro. */
  private findBlock(): { col: number; row: number } | null {
    const ts = this.world.tileSize;
    const col0 = Math.floor(this.x / ts);
    const row0 = Math.floor(this.y / ts);
    const homeCol = Math.floor(this.homeX / ts);
    const homeRow = Math.floor(this.homeY / ts);
    const radius = this.config.workRadius;

    let best: { col: number; row: number } | null = null;
    let bestScore = Infinity;

    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const col = col0 + dc;
        const row = row0 + dr;
        // Nao sai da area de trabalho definida.
        if (Math.abs(col - homeCol) > radius || Math.abs(row - homeRow) > radius) continue;
        const id = this.world.getTile(col, row);
        if (id === 0) continue;
        const def = blockDef(id);
        if (def.indestructible || !def.drop) continue;
        if (def.tags.includes('ancient') || def.tags.includes('quest')) continue;
        if (!this.accepts(def.drop)) continue;
        // Minerio primeiro; pedra so se o filtro aceitar.
        const priority = def.tags.includes('ore') ? 0 : 400;
        const score = dc * dc + dr * dr + priority;
        if (score < bestScore) {
          bestScore = score;
          best = { col, row };
        }
      }
    }
    return best;
  }

  // -------------------------------------------------------------- desenho --

  render(ctx: CanvasRenderingContext2D, sheetIndex: number): void {
    const art = ART.character;

    // A copia e o proprio protagonista: ela usa a mesma arte, so recolorida.
    // Por isso tenta as tiras novas antes de cair na folha 4x4.
    const stripName = this.stripName();
    const stripImg = stripName ? Assets.characterStrip(stripName) : null;

    const sheet = stripImg ?? Assets.character();
    if (!sheet) {
      ctx.fillStyle = this.tint;
      ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
      return;
    }

    let src: CanvasImageSource;
    let frameW: number;
    let frameH: number;
    let sx: number;
    let sy = 0;
    let h: number;

    if (stripImg && stripName) {
      const cacheKey = 'strip:' + stripName;
      let tinted = this.stripTints.get(cacheKey);
      if (tinted === undefined) {
        tinted = Assets.tintedStrip(stripName, this.tint, 0.55);
        this.stripTints.set(cacheKey, tinted);
      }
      src = tinted ?? stripImg;
      frameW = art.stripFrame;
      frameH = art.stripFrame;
      sx = this.stripIndex(stripName) * frameW;
      h = art.stripDrawHeight * 0.92;
    } else {
      if (!this.tintCache) {
        this.tintCache = Assets.tintedCharacter(this.tint, 0.55);
      }
      src = this.tintCache ?? sheet;
      const frame =
        this.state === 'minerando'
          ? art.anims.mine_side.frames[this.swing >= 0.6 ? 1 : 0]
          : sheetIndex;
      frameW = art.frameW;
      frameH = art.frameH;
      sx = (frame % art.cols) * frameW;
      sy = Math.floor(frame / art.cols) * frameH;
      h = art.drawHeight * 0.92;
    }
    const w = frameW * (h / frameH);
    const top = this.y + this.h / 2 - h * art.feetAnchor;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.h / 2 + 1, this.w * 0.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    const artFacing = stripImg && stripName ? art.strips[stripName].facing : 1;
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(top));
    if (this.facing !== artFacing) ctx.scale(-1, 1);
    ctx.drawImage(src, sx, sy, frameW, frameH, -w / 2, 0, w, h);
    ctx.restore();

    if (this.state === 'enviando') this.renderSending(ctx, top);
  }

  /** Barra e setas subindo: da para ver que a carga esta indo para a base. */
  private renderSending(ctx: CanvasRenderingContext2D, top: number): void {
    const p = this.sendProgress;
    const w = 26;
    const y = top - 9;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(this.x - w / 2, y, w, 4);
    ctx.fillStyle = this.tint;
    ctx.fillRect(this.x - w / 2, y, w * p, 4);
    const t = (performance.now() * 0.004) % 1;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = this.tint;
    ctx.fillRect(this.x - 2, y - 6 - t * 12, 4, 6);
    ctx.globalAlpha = 1;
  }

  /** Qual tira usar agora, ou null quando aquele arquivo nao existe. */
  private stripName(): string | null {
    const has = (n: string): boolean => Assets.characterStrips.has(n);
    if (this.state === 'minerando' && has('mine')) return 'mine';
    if (this.state === 'parado' && has('idle')) return 'idle';
    if (has('walk')) return 'walk';
    return has('idle') ? 'idle' : null;
  }

  /** Quadro dentro da tira escolhida. */
  private stripIndex(name: string): number {
    const def = ART.character.strips[name];
    if (!def) return 0;
    if (name === 'mine') {
      return Math.min(def.frames - 1, Math.round((1 - this.swing) * (def.frames - 1)));
    }
    return Math.floor(this.walkPhase) % def.frames;
  }

  /** Quadro de caminhada/parado, calculado fora para poder reusar a folha. */
  walkFrame(): number {
    const art = ART.character;
    if (this.state === 'minerando') return art.anims.mine_side.frames[this.swing >= 0.6 ? 1 : 0];
    if (this.state === 'parado') return art.anims.idle.frames[0];
    return art.anims.walk.frames[Math.floor(this.walkPhase) % art.anims.walk.frames.length];
  }

  statusLabel(): string {
    const nomes: Record<CloneState, string> = {
      procurando: 'procurando',
      minerando: 'minerando',
      coletando: 'coletando',
      entregando: 'indo entregar',
      enviando: 'enviando carga',
      parado: 'parado',
    };
    return nomes[this.state];
  }

  summary(): string {
    const parts = this.entries().map(([id, n]) => `${n} ${RESOURCES[id].name}`);
    return parts.length ? parts.join(', ') : 'vazio';
  }

  toJSON() {
    return {
      id: this.id,
      index: this.index,
      x: this.x,
      y: this.y,
      homeX: this.homeX,
      homeY: this.homeY,
      config: this.config,
      items: Object.fromEntries(this.items),
    };
  }
}
