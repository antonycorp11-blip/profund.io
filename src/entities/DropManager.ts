import type { Camera } from '../core/camera';
import { Assets } from '../core/Assets';
import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import { randRange } from '../core/math';
import { RESOURCES, type ResourceId } from '../data/resources';
import type { Player } from '../player/Player';
import type { Attributes } from '../systems/Attributes';
import type { Inventory } from '../systems/Inventory';
import type { World } from '../world/World';

interface Drop {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  resource: ResourceId;
  amount: number;
  life: number;
  /** Tempo antes de poder ser atraido (evita colar no player instantaneamente). */
  delay: number;
  bob: number;
  grounded: boolean;
}

const SIZE = 9;

/** Recursos fisicos no mundo: caem, quicam, sao atraidos e coletados. */
export class DropManager {
  private pool: Drop[] = [];
  private fullWarnCooldown = 0;

  constructor(
    private world: World,
    private inventory: Inventory,
    private attrs: Attributes
  ) {
    for (let i = 0; i < CONFIG.drops.maxActive; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        resource: 'stone',
        amount: 1,
        life: 0,
        delay: 0,
        bob: 0,
        grounded: false,
      });
    }
  }

  /** Drop mais proximo que passa no filtro — usado pelas copias coletoras. */
  findNearest(
    x: number,
    y: number,
    maxDist: number,
    accepts: (r: ResourceId) => boolean
  ): { x: number; y: number; resource: ResourceId } | null {
    let best: { x: number; y: number; resource: ResourceId } | null = null;
    let bestD = maxDist * maxDist;
    for (const d of this.pool) {
      if (!d.active || d.delay > 0) continue;
      if (!accepts(d.resource)) continue;
      const dx = d.x - x;
      const dy = d.y - y;
      const dist = dx * dx + dy * dy;
      if (dist < bestD) {
        bestD = dist;
        best = { x: d.x, y: d.y, resource: d.resource };
      }
    }
    return best;
  }

  /**
   * Coletores extras (copias): puxam e recolhem drops como o jogador.
   * Chamado depois do update do jogador, entao o jogador tem prioridade.
   */
  collectFor(
    collector: {
      cx: number;
      cy: number;
      radius: number;
      accepts: (r: ResourceId) => boolean;
      add: (r: ResourceId, n: number) => number;
      isFull: boolean;
    },
    dt: number
  ): void {
    if (collector.isFull) return;
    const r2 = collector.radius * collector.radius;
    for (const d of this.pool) {
      if (!d.active || d.delay > 0) continue;
      if (!collector.accepts(d.resource)) continue;
      const dx = collector.cx - d.x;
      const dy = collector.cy - 6 - d.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 > r2) continue;
      const dist = Math.sqrt(dist2) || 1;
      if (dist < CONFIG.player.pickupRadius) {
        const added = collector.add(d.resource, d.amount);
        if (added >= d.amount) d.active = false;
        else if (added > 0) d.amount -= added;
        continue;
      }
      const pull = 420 * dt;
      d.x += (dx / dist) * pull;
      d.y += (dy / dist) * pull;
    }
  }

  get activeCount(): number {
    let n = 0;
    for (const d of this.pool) if (d.active) n++;
    return n;
  }

  spawn(x: number, y: number, resource: ResourceId, amount = 1): void {
    const d = this.pool.find((p) => !p.active);
    if (!d) return;
    d.active = true;
    d.x = x;
    d.y = y;
    const a = randRange(-Math.PI * 0.85, -Math.PI * 0.15);
    const s = CONFIG.drops.initialSpeed * randRange(0.5, 1);
    d.vx = Math.cos(a) * s;
    d.vy = Math.sin(a) * s;
    d.resource = resource;
    d.amount = amount;
    d.life = CONFIG.drops.lifetime;
    d.delay = 0.18;
    d.bob = Math.random() * Math.PI * 2;
    d.grounded = false;
  }

  update(dt: number, player: Player): void {
    this.fullWarnCooldown = Math.max(0, this.fullWarnCooldown - dt);
    const cfg = CONFIG.drops;
    const px = player.cx;
    const py = player.cy;
    // Raio e velocidade agora sao atributos (skills de coleta mexem neles).
    const magnetRadius = this.attrs.get('pickupRadius');
    const magnetSpeed = this.attrs.get('pickupSpeed');
    const autoPickup = this.attrs.has('autoPickup');
    const magnet2 = magnetRadius * magnetRadius;
    const pickup2 = CONFIG.player.pickupRadius ** 2;

    for (const d of this.pool) {
      if (!d.active) continue;
      d.life -= dt;
      d.delay = Math.max(0, d.delay - dt);
      d.bob += dt * 4;
      if (d.life <= 0) {
        d.active = false;
        continue;
      }

      const dx = px - d.x;
      const dy = py - 4 - d.y;
      const dist2 = dx * dx + dy * dy;

      // Com o Ima de Minerio o recurso vem mesmo de mochila cheia (fica esperando).
      if (d.delay <= 0 && dist2 < magnet2 && (autoPickup || !this.inventory.isFull)) {
        // Atracao magnetica.
        const dist = Math.sqrt(dist2) || 1;
        const pull = magnetSpeed * (1 - dist / magnetRadius) + 120;
        d.vx += (dx / dist) * pull * dt;
        d.vy += (dy / dist) * pull * dt;
        d.vx *= 0.9;
        d.vy *= 0.9;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.grounded = false;
      } else {
        // Fisica simples com colisao no tilemap.
        d.vy += cfg.gravity * dt;
        this.moveAxis(d, d.vx * dt, 0);
        this.moveAxis(d, 0, d.vy * dt);
        if (d.grounded) {
          d.vx *= cfg.friction;
          if (Math.abs(d.vx) < 3) d.vx = 0;
        }
      }

      if (dist2 < pickup2 && d.delay <= 0) {
        this.collect(d);
      }
    }
  }

  private moveAxis(d: Drop, dx: number, dy: number): void {
    const half = SIZE / 2;
    const nx = d.x + dx;
    const ny = d.y + dy;
    if (this.world.rectCollides(nx - half, ny - half, SIZE, SIZE)) {
      if (dy > 0) {
        d.grounded = true;
        d.y = Math.floor((ny + half) / this.world.tileSize) * this.world.tileSize - half - 0.01;
        d.vy = -d.vy * CONFIG.drops.bounce;
        if (Math.abs(d.vy) < 40) d.vy = 0;
      } else if (dy < 0) {
        d.vy = 0;
      } else {
        d.vx = -d.vx * CONFIG.drops.bounce;
      }
      return;
    }
    d.x = nx;
    d.y = ny;
    if (dy > 0) d.grounded = false;
  }

  private collect(d: Drop): void {
    const added = this.inventory.add(d.resource, d.amount);
    if (added <= 0) {
      if (this.fullWarnCooldown <= 0) {
        this.fullWarnCooldown = 2.5;
        Events.emit('inventory:full', { resource: d.resource });
      }
      return;
    }
    Events.emit('resource:collect', {
      resource: d.resource,
      amount: added,
      worldX: d.x,
      worldY: d.y,
    });
    if (added < d.amount) {
      d.amount -= added;
      return;
    }
    d.active = false;
  }

  /**
   * Os drops na tela.
   *
   * Sao ate 400 ativos ao mesmo tempo (ver CONFIG.drops.maxActive) e nao havia
   * corte nenhum: um exercito de toupeiras espalha minerio pela mina inteira, e
   * todo ele era desenhado quadro a quadro, incluindo o que estava a duzentos
   * metros dali.
   */
  render(ctx: CanvasRenderingContext2D, camera?: Camera): void {
    for (const d of this.pool) {
      if (!d.active) continue;
      if (camera && !camera.sees(d.x, d.y, 24)) continue;
      const def = RESOURCES[d.resource];
      const bob = Math.sin(d.bob) * 1.5;
      const x = d.x;
      const y = d.y + bob;
      const fade = d.life < 3 ? 0.35 + Math.abs(Math.sin(d.life * 8)) * 0.65 : 1;

      ctx.globalAlpha = fade;
      // Brilho para recursos valiosos.
      if (def.rarity === 'raro' || def.rarity === 'epico') {
        ctx.fillStyle = def.accent;
        ctx.globalAlpha = fade * 0.18;
        ctx.beginPath();
        ctx.arc(x, y, SIZE, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = fade;
      }

      // Icone real quando existe; senao o losango placeholder.
      const icon = Assets.icon(d.resource);
      if (icon) {
        const s = SIZE * CONFIG.drops.iconScale;
        ctx.drawImage(icon, x - s / 2, y - s / 2, s, s);
        continue;
      }

      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(x, y - SIZE * 0.6);
      ctx.lineTo(x + SIZE * 0.55, y);
      ctx.lineTo(x, y + SIZE * 0.6);
      ctx.lineTo(x - SIZE * 0.55, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.moveTo(x, y - SIZE * 0.6);
      ctx.lineTo(x + SIZE * 0.3, y - SIZE * 0.1);
      ctx.lineTo(x, y + SIZE * 0.1);
      ctx.lineTo(x - SIZE * 0.3, y - SIZE * 0.1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    for (const d of this.pool) d.active = false;
  }
}
