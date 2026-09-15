interface FloatItem {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  size: number;
}

/** Numeros/textos que sobem no mundo (ex.: "+2 Carvao"). */
export class FloatingText {
  private pool: FloatItem[] = [];

  constructor(max = 48) {
    for (let i = 0; i < max; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vy: -34,
        life: 0,
        maxLife: 1,
        text: '',
        color: '#fff',
        size: 11,
      });
    }
  }

  push(x: number, y: number, text: string, color = '#ffffff', size = 11): void {
    const item = this.pool.find((p) => !p.active) ?? this.pool[0];
    item.active = true;
    item.x = x + (Math.random() * 8 - 4);
    item.y = y;
    item.vy = -36;
    item.maxLife = 0.95;
    item.life = item.maxLife;
    item.text = text;
    item.color = color;
    item.size = size;
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.y += p.vy * dt;
      p.vy *= 0.94;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this.pool) {
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      const pop = t > 0.8 ? 1 + (t - 0.8) * 1.2 : 1;
      ctx.globalAlpha = Math.min(1, t * 2.2);
      ctx.font = `bold ${p.size * pop}px "Trebuchet MS", system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  clear(): void {
    for (const p of this.pool) p.active = false;
  }
}
