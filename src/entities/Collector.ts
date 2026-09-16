import { Assets } from '../core/Assets';
import { Events } from '../core/events';
import { COLLECTOR_CONFIG } from '../data/collectors';
import { CONFIG } from '../data/config';
import { CREATURE_CONFIG } from '../data/creatures';
import type { Attributes } from '../systems/Attributes';
import type { ResourceId } from '../data/resources';
import type { World } from '../world/World';

export type CollectorState = 'procurando' | 'buscando' | 'voltando' | 'entregando';

/**
 * Toupeira coletora.
 *
 * Nao mina e nao briga: ela busca o que ja esta no chao. A IA e deliberadamente
 * simples — achar o drop mais proximo, ir ate ele cavando reto, e quando encher
 * voltar para o deposito. O valor dela nao esta na esperteza, esta em existir
 * enquanto o jogador faz outra coisa.
 */
export class Collector {
  x = 0;
  y = 0;
  facing: 1 | -1 = 1;
  state: CollectorState = 'procurando';
  readonly items = new Map<ResourceId, number>();
  /** Total ja entregue (aparece no painel). */
  delivered = 0;

  private animTime = Math.random() * 3;
  private targetX = 0;
  private targetY = 0;
  private hasTarget = false;
  private idleTimer = 0;
  /** Dentro da rocha agora (muda a velocidade e liga a poeira). */
  buried = false;
  private dustTimer = 0;
  private lastBrokenCol = -1;
  private lastBrokenRow = -1;

  constructor(
    readonly id: string,
    readonly index: number,
    private world: World,
    private attrs: Attributes,
    private depot: { x: number; y: number },
    x: number,
    y: number
  ) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
  }

  get capacity(): number {
    return Math.round(COLLECTOR_CONFIG.capacity * this.attrs.get('collectorCapacity'));
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
    return [...this.items.entries()];
  }

  summary(): string {
    const e = this.entries();
    return e.length ? e.map(([id, n]) => `${n} ${id}`).join(', ') : 'vazio';
  }

  /** Ordem do jogador: larga o que esta fazendo e sobe para entregar. */
  sendHome(): void {
    if (this.carried <= 0) return;
    this.state = 'voltando';
    this.hasTarget = false;
  }

  statusLabel(): string {
    const nomes: Record<CollectorState, string> = {
      procurando: 'farejando',
      buscando: 'indo buscar',
      voltando: 'voltando',
      entregando: 'entregando',
    };
    return nomes[this.state];
  }

  update(
    dt: number,
    findDrop: (x: number, y: number, radius: number) => { x: number; y: number } | null,
    pickup: (x: number, y: number, radius: number, take: (r: ResourceId, n: number) => void) => void,
    deliver: (items: [ResourceId, number][]) => void
  ): void {
    this.animTime += dt;

    if (this.isFull || this.state === 'voltando' || this.state === 'entregando') {
      this.state = 'voltando';
      this.targetX = this.depot.x;
      this.targetY = this.depot.y;
      this.hasTarget = true;
      if (this.moveToward(dt)) {
        if (this.carried > 0) {
          this.delivered += this.carried;
          deliver(this.entries());
          this.items.clear();
        }
        this.state = 'procurando';
        this.hasTarget = false;
      }
      return;
    }

    // Recolhe o que estiver ao alcance, esteja mirando nele ou nao.
    pickup(this.x, this.y, COLLECTOR_CONFIG.pickupRadius, (r, n) => {
      this.items.set(r, (this.items.get(r) ?? 0) + n);
    });

    if (!this.hasTarget) {
      const raio = COLLECTOR_CONFIG.searchRadius * this.attrs.get('collectorRange');
      const alvo = findDrop(this.x, this.y, raio);
      if (alvo) {
        this.targetX = alvo.x;
        this.targetY = alvo.y;
        this.hasTarget = true;
        this.state = 'buscando';
      } else if (this.carried > 0) {
        // Nada mais para buscar e com carga na bolsa: entrega o que tem em vez
        // de esperar encher. Segurar recurso parado nao ajuda ninguem.
        this.state = 'voltando';
        return;
      } else {
        // Nada na mina e de maos vazias: ronda o poco, pronta para descer.
        this.state = 'procurando';
        this.idleTimer -= dt;
        if (this.idleTimer <= 0) {
          this.idleTimer = 2.5;
          this.targetX = this.depot.x + (Math.random() * 2 - 1) * COLLECTOR_CONFIG.idlePatrol;
          this.targetY = this.depot.y;
          this.hasTarget = true;
        }
        return;
      }
    }

    if (this.moveToward(dt)) {
      this.hasTarget = false;
      // Chegou: recolhe num raio maior, porque o monte costuma estar espalhado.
      pickup(this.x, this.y, COLLECTOR_CONFIG.pickupRadius * 2.4, (r, n) => {
        this.items.set(r, (this.items.get(r) ?? 0) + n);
      });
    }
  }

  /**
   * Vai ate o alvo atravessando a terra.
   *
   * Toupeira nao cava tunel: ela PASSA pela rocha. Por isso nao colide com
   * nada e desce reto — e o que permite ir buscar a 300 m e voltar sem
   * depender de poco nenhum, que e justamente onde o jogador nao volta mais.
   *
   * Dentro da rocha ela anda mais devagar, e a poeira mostra por onde ela esta
   * passando: o trabalho dela precisa ser visivel, nao um numero que sobe.
   */
  private moveToward(dt: number): boolean {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 14) return true;

    const vertical = Math.abs(dy) > Math.abs(dx);
    const base = vertical
      ? COLLECTOR_CONFIG.digSpeed * this.attrs.get('collectorDigSpeed')
      : COLLECTOR_CONFIG.moveSpeed * this.attrs.get('collectorSpeed');

    this.buried = this.world.isSolidAtPixel(this.x, this.y);
    const speed = base * (this.buried ? COLLECTOR_CONFIG.buriedSpeedRatio : 1) * dt;

    this.x += (dx / dist) * speed;
    this.y += (dy / dist) * speed;
    if (Math.abs(dx) > 4) this.facing = dx > 0 ? 1 : -1;

    if (this.buried) this.breakThrough(dt);
    return false;
  }

  /**
   * Passagem pela rocha.
   *
   * Sem melhoria ela so levanta poeira — o tunel se fecha atras dela, porque
   * ela nao e escavadeira. Com `collectorBreak`, parte dos blocos por onde
   * passa cede de vez: o caminho fica aberto e o que estava dentro cai no chao
   * para ela mesma recolher na volta.
   */
  private breakThrough(dt: number): void {
    const ts = this.world.tileSize;
    const col = Math.floor(this.x / ts);
    const row = Math.floor(this.y / ts);

    this.dustTimer -= dt;
    if (this.dustTimer <= 0) {
      this.dustTimer = 0.09;
      Events.emit('collector:burrow', { worldX: this.x, worldY: this.y, col, row });
    }

    const forca = this.attrs.get('collectorBreak');
    if (forca <= 0) return;
    if (col === this.lastBrokenCol && row === this.lastBrokenRow) return;
    this.lastBrokenCol = col;
    this.lastBrokenRow = row;

    const def = this.world.getDef(col, row);
    if (
      def.indestructible ||
      def.tags.includes('quest') ||
      def.tags.includes('boss') ||
      def.tags.includes('ancient')
    ) {
      return;
    }
    // A forca e uma fracao da vida do bloco: minerio duro resiste mais que terra.
    this.world.applyDamage(col, row, this.world.effectiveHp(col, row) * forca, 3);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const cfg = COLLECTOR_CONFIG;
    const anim = this.state === 'procurando' ? 'idle' : 'walk';
    const sheet = Assets.creature('toupeira', anim) ?? Assets.creature('toupeira', 'idle');

    if (!sheet) {
      ctx.fillStyle = '#5b4632';
      ctx.fillRect(this.x - cfg.w / 2, this.y - cfg.h / 2, cfg.w, cfg.h);
      return;
    }

    const size = CREATURE_CONFIG.frameSize;
    const n = CREATURE_CONFIG.frames;
    const fps = anim === 'walk' ? CREATURE_CONFIG.fps.walk : CREATURE_CONFIG.fps.idle;
    const i = Math.floor(this.animTime * fps) % n;
    const scale = cfg.drawHeight / size;
    const w = size * scale;
    const h = cfg.drawHeight;
    const feetY = this.y + cfg.h / 2;
    const top = feetY - h * 0.92;

    ctx.save();
    // Enterrada: um halo escuro em volta destaca a silhueta contra o bloco.
    if (this.buried) {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(20, 14, 10, 0.75)';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, cfg.w * 0.95, cfg.h * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, feetY + 1, cfg.w * 0.45, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(Math.round(this.x), Math.round(top));
    if (this.facing === -1) ctx.scale(-1, 1);
    ctx.drawImage(sheet, i * size, 0, size, size, -w / 2, 0, w, h);
    ctx.restore();

    // Sacola cheia: da para ver de longe que ela esta voltando carregada.
    if (this.carried > 0) {
      const r = Math.min(1, this.carried / this.capacity);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(this.x - 11, top - 6, 22, 3);
      ctx.fillStyle = '#e0a94b';
      ctx.fillRect(this.x - 11, top - 6, 22 * r, 3);
    }
    void CONFIG;
  }

  toJSON(): { id: string; index: number; x: number; y: number; delivered: number } {
    return { id: this.id, index: this.index, x: this.x, y: this.y, delivered: this.delivered };
  }
}
