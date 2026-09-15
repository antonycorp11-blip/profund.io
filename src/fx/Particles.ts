import { CONFIG } from '../data/config';
import { randRange } from '../core/math';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  drag: number;
  shape: 'rect' | 'spark' | 'dust';
  rot: number;
  vrot: number;
}

/** Pool fixo de particulas — sem alocacao durante o jogo. */
export class Particles {
  private pool: Particle[] = [];
  private cursor = 0;

  constructor(max = CONFIG.particles.max) {
    for (let i = 0; i < max; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: '#fff',
        gravity: 600,
        drag: 0.99,
        shape: 'rect',
        rot: 0,
        vrot: 0,
      });
    }
  }

  private spawn(): Particle {
    // Round-robin: se estourar, recicla a mais antiga.
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.pool.length;
      if (!p.active) return p;
    }
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.pool.length;
    return p;
  }

  /** Estilhacos ao atingir um bloco. */
  burst(
    x: number,
    y: number,
    count: number,
    colors: string[],
    opts: { speed?: number; spread?: number; dirX?: number; dirY?: number; size?: number; life?: number } = {}
  ): void {
    const speed = opts.speed ?? 90;
    const spread = opts.spread ?? Math.PI * 2;
    const baseAngle =
      opts.dirX !== undefined || opts.dirY !== undefined
        ? Math.atan2(opts.dirY ?? 0, opts.dirX ?? 0)
        : 0;
    for (let i = 0; i < count; i++) {
      const p = this.spawn();
      const angle =
        spread >= Math.PI * 2 ? Math.random() * Math.PI * 2 : baseAngle + randRange(-spread, spread) / 2;
      const spd = speed * randRange(0.45, 1.25);
      p.active = true;
      p.x = x + randRange(-3, 3);
      p.y = y + randRange(-3, 3);
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd - randRange(10, 60);
      p.maxLife = opts.life ?? randRange(0.32, 0.7);
      p.life = p.maxLife;
      p.size = opts.size ?? randRange(2, 4.5);
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.gravity = 700;
      p.drag = 0.985;
      p.shape = 'rect';
      p.rot = Math.random() * Math.PI;
      p.vrot = randRange(-8, 8);
    }
  }

  /** Faiscas brilhantes (minerio raro / quebra). */
  sparks(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const p = this.spawn();
      const angle = Math.random() * Math.PI * 2;
      const spd = randRange(40, 190);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.maxLife = randRange(0.25, 0.55);
      p.life = p.maxLife;
      p.size = randRange(1.5, 3);
      p.color = color;
      p.gravity = 180;
      p.drag = 0.93;
      p.shape = 'spark';
      p.rot = 0;
      p.vrot = 0;
    }
  }

  /** Poeira que sobe lentamente. */
  dust(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const p = this.spawn();
      p.active = true;
      p.x = x + randRange(-8, 8);
      p.y = y + randRange(-8, 8);
      p.vx = randRange(-18, 18);
      p.vy = randRange(-30, -8);
      p.maxLife = randRange(0.5, 1.1);
      p.life = p.maxLife;
      p.size = randRange(4, 9);
      p.color = color;
      p.gravity = -20;
      p.drag = 0.94;
      p.shape = 'dust';
      p.rot = 0;
      p.vrot = 0;
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      ctx.globalAlpha = p.shape === 'dust' ? t * 0.35 : Math.min(1, t * 1.6);
      ctx.fillStyle = p.color;
      if (p.shape === 'spark') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha *= 0.5;
        ctx.fillRect(p.x - p.vx * 0.012, p.y - p.vy * 0.012, p.size * 0.7, p.size * 0.7);
      } else if (p.shape === 'dust') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.4 - t * 0.4), 0, Math.PI * 2);
        ctx.fill();
      } else {
        const s = p.size * (0.5 + t * 0.5);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    for (const p of this.pool) p.active = false;
  }
}
