import { CONFIG } from '../data/config';
import { RESOURCES } from '../data/resources';
import { STRUCTURES } from '../data/structures';
import { Assets } from '../core/Assets';
import type { Automation, Structure } from '../systems/Automation';
import type { Camera } from '../core/camera';

/**
 * Desenho das estruturas de automacao (vetorial por enquanto).
 * A arte final entra depois: cada tipo tem um metodo isolado.
 */
export class StructureRenderer {
  private t = 0;

  constructor(private automation: Automation) {}

  update(dt: number): void {
    this.t += dt;
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const ts = CONFIG.tileSize;
    const left = camera.left - ts;
    const right = camera.left + camera.viewW + ts;
    const top = camera.top - ts;
    const bottom = camera.top + camera.viewH + ts;

    for (const s of this.automation.all()) {
      const x = s.col * ts;
      const y = s.row * ts;
      if (x < left || x > right || y < top || y > bottom) continue;

      switch (s.type) {
        case 'conveyor':
          this.drawConveyor(ctx, s, x, y, ts);
          break;
        case 'lift':
          this.drawLift(ctx, s, x, y, ts);
          break;
        case 'storage':
          this.drawStorage(ctx, s, x, y, ts);
          break;
        case 'refinery':
          this.drawRefinery(ctx, s, x, y, ts);
          break;
        case 'generator':
          this.drawGenerator(ctx, s, x, y, ts);
          break;
      }
      this.drawItems(ctx, s, x, y, ts);
    }
  }

  private drawConveyor(
    ctx: CanvasRenderingContext2D,
    s: Structure,
    x: number,
    y: number,
    ts: number
  ): void {
    const h = ts * 0.34;
    const top = y + ts - h;
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(x, top, ts, h);
    ctx.fillStyle = '#3d3d46';
    ctx.fillRect(x, top, ts, 3);

    // Setas correndo: a linha viva se le de longe.
    const speed = 22;
    const offset = (this.t * speed * s.dir) % 12;
    ctx.fillStyle = STRUCTURES.conveyor.color;
    for (let i = -1; i < ts / 12 + 1; i++) {
      const ax = x + i * 12 + offset;
      if (ax < x - 6 || ax > x + ts) continue;
      ctx.beginPath();
      if (s.dir === 1) {
        ctx.moveTo(ax, top + 5);
        ctx.lineTo(ax + 6, top + h / 2);
        ctx.lineTo(ax, top + h - 5);
      } else {
        ctx.moveTo(ax + 6, top + 5);
        ctx.lineTo(ax, top + h / 2);
        ctx.lineTo(ax + 6, top + h - 5);
      }
      ctx.closePath();
      ctx.fill();
    }
    // Pes de apoio.
    ctx.fillStyle = '#23232a';
    ctx.fillRect(x + 3, top + h, 3, ts - h - top + y);
    ctx.fillRect(x + ts - 6, top + h, 3, ts - h - top + y);
  }

  private drawLift(
    ctx: CanvasRenderingContext2D,
    s: Structure,
    x: number,
    y: number,
    ts: number
  ): void {
    ctx.fillStyle = '#23232a';
    ctx.fillRect(x + ts * 0.18, y, ts * 0.64, ts);
    ctx.fillStyle = '#34343e';
    ctx.fillRect(x + ts * 0.18, y, 3, ts);
    ctx.fillRect(x + ts * 0.82 - 3, y, 3, ts);

    // Correia subindo.
    const offset = (this.t * 26) % 10;
    ctx.fillStyle = STRUCTURES.lift.color;
    for (let i = -1; i < ts / 10 + 1; i++) {
      const ay = y + ts - (i * 10 + offset);
      if (ay < y || ay > y + ts - 3) continue;
      ctx.fillRect(x + ts * 0.3, ay, ts * 0.4, 2.5);
    }
    void s;
  }

  private drawStorage(
    ctx: CanvasRenderingContext2D,
    s: Structure,
    x: number,
    y: number,
    ts: number
  ): void {
    const pad = ts * 0.1;
    ctx.fillStyle = '#4a3420';
    ctx.fillRect(x + pad, y + pad, ts - pad * 2, ts - pad * 2);
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(x + pad, y + pad, ts - pad * 2, ts * 0.18);

    // Barra de ocupacao.
    const cap = STRUCTURES.storage.capacity ?? 1;
    const fill = Math.min(1, this.automation.storedTotal(s) / cap);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + pad, y + ts - pad - 5, ts - pad * 2, 4);
    ctx.fillStyle = fill >= 1 ? '#c8452f' : '#7ddc7d';
    ctx.fillRect(x + pad, y + ts - pad - 5, (ts - pad * 2) * fill, 4);

    // Filtro: o recurso dedicado aparece dentro da caixa.
    if (s.filter) {
      const icon = Assets.icon(s.filter);
      if (icon) ctx.drawImage(icon, x + ts * 0.28, y + ts * 0.26, ts * 0.44, ts * 0.44);
      else {
        ctx.fillStyle = RESOURCES[s.filter].color;
        ctx.fillRect(x + ts * 0.32, y + ts * 0.3, ts * 0.36, ts * 0.36);
      }
    }
  }

  private drawRefinery(
    ctx: CanvasRenderingContext2D,
    s: Structure,
    x: number,
    y: number,
    ts: number
  ): void {
    ctx.fillStyle = '#33333c';
    ctx.fillRect(x + 2, y + ts * 0.15, ts - 4, ts * 0.85);
    ctx.fillStyle = '#44444f';
    ctx.fillRect(x + 2, y + ts * 0.15, ts - 4, 4);

    // Boca da fornalha com brasa pulsando.
    const glow = 0.55 + Math.sin(this.t * 4) * 0.25;
    ctx.fillStyle = `rgba(255,140,40,${glow})`;
    ctx.fillRect(x + ts * 0.25, y + ts * 0.45, ts * 0.5, ts * 0.3);

    // Progresso do lote.
    if (s.items.length > 0) {
      const p = Math.min(1, s.processTimer / (STRUCTURES.refinery.processTime ?? 3.5));
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x + 3, y + ts - 6, ts - 6, 4);
      ctx.fillStyle = STRUCTURES.refinery.color;
      ctx.fillRect(x + 3, y + ts - 6, (ts - 6) * p, 4);
    }
  }

  private drawGenerator(
    ctx: CanvasRenderingContext2D,
    s: Structure,
    x: number,
    y: number,
    ts: number
  ): void {
    ctx.fillStyle = '#3a3128';
    ctx.fillRect(x + 2, y + ts * 0.1, ts - 4, ts * 0.9);
    ctx.fillStyle = '#4e4235';
    ctx.fillRect(x + 2, y + ts * 0.1, ts - 4, 4);

    // Sem combustivel, a fornalha apaga: o problema se le na tela.
    const on = s.fueled;
    const pulse = on ? 0.55 + Math.sin(this.t * 6) * 0.3 : 0.12;
    ctx.fillStyle = `rgba(255,176,47,${pulse})`;
    ctx.beginPath();
    ctx.arc(x + ts / 2, y + ts * 0.55, ts * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = on ? '#ffb02f' : '#6a5a3f';
    ctx.font = `bold ${Math.round(ts * 0.3)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', x + ts / 2, y + ts * 0.56);

    if (!on) {
      ctx.fillStyle = '#ff6b5a';
      ctx.fillRect(x + ts * 0.3, y + ts - 7, ts * 0.4, 3);
    }
  }

  /** Itens em transito: e o que faz a linha parecer viva. */
  private drawItems(
    ctx: CanvasRenderingContext2D,
    s: Structure,
    x: number,
    y: number,
    ts: number
  ): void {
    if (s.items.length === 0) return;
    const size = ts * 0.4;
    for (const item of s.items) {
      let ix = x + ts / 2;
      let iy = y + ts * 0.42;
      if (s.type === 'conveyor') {
        ix = s.dir === 1 ? x + item.progress * ts : x + ts - item.progress * ts;
        iy = y + ts * 0.52;
      } else if (s.type === 'lift') {
        iy = y + ts - item.progress * ts;
      }
      const icon = Assets.icon(item.resource);
      if (icon) ctx.drawImage(icon, ix - size / 2, iy - size / 2, size, size);
      else {
        ctx.fillStyle = RESOURCES[item.resource].color;
        ctx.fillRect(ix - size / 2, iy - size / 2, size, size);
      }
    }
  }
}
