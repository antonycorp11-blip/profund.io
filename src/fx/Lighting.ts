import { blockDef } from '../data/blocks';
import { CONFIG } from '../data/config';
import { layerBlend } from '../data/layers';
import { clamp } from '../core/math';
import type { Camera } from '../core/camera';
import type { World } from '../world/World';

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  /** 0..1 */
  intensity: number;
  color?: string;
}

/**
 * Escuridao por profundidade + luzes recortadas.
 * Roda em um canvas separado em resolucao reduzida (barato no mobile).
 */
export class Lighting {
  private canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private w = 1;
  private h = 1;
  private readonly downscale = 0.5;
  private flicker = 0;

  constructor() {
    const c = this.canvas.getContext('2d');
    if (!c) throw new Error('canvas 2d indisponivel');
    this.ctx = c;
  }

  resize(cssW: number, cssH: number): void {
    this.w = Math.max(1, Math.floor(cssW * this.downscale));
    this.h = Math.max(1, Math.floor(cssH * this.downscale));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
  }

  /** 0 = superficie iluminada, 1 = escuridao total. Cada camada tem seu teto. */
  darknessAt(depthMeters: number): number {
    const { darkStartDepth, darkFullDepth, maxDarkness } = CONFIG.light;
    const t = clamp((depthMeters - darkStartDepth) / (darkFullDepth - darkStartDepth), 0, 1);
    const layer = layerBlend(depthMeters);
    return clamp(t * maxDarkness * layer.darkness, 0, 0.97);
  }

  render(
    target: CanvasRenderingContext2D,
    camera: Camera,
    world: World,
    lights: LightSource[],
    depthMeters: number,
    cssW: number,
    cssH: number,
    dt: number,
    /** Escuridao extra vinda da hora do dia (so vale perto da superficie). */
    nightDarkness = 0
  ): void {
    // Na superficie quem manda e a hora; fundo abaixo, a profundidade.
    const darkness = Math.max(this.darknessAt(depthMeters), nightDarkness);
    if (darkness <= 0.02) return;

    this.flicker += dt * 7;
    const ctx = this.ctx;
    const s = this.downscale * camera.scale;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    // A cor do escuro vem da camada: e o que mais comunica "estou noutro lugar".
    const [ar, ag, ab] = layerBlend(depthMeters).ambient;
    ctx.fillStyle = `rgba(${Math.round(ar)},${Math.round(ag)},${Math.round(ab)},${darkness})`;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.globalCompositeOperation = 'destination-out';

    // Luzes dinamicas (lanterna do player etc.).
    for (const l of lights) {
      const sx = (l.x - camera.left) * s;
      const sy = (l.y - camera.top) * s;
      const r = l.radius * s * (1 + Math.sin(this.flicker) * CONFIG.light.flicker);
      if (sx < -r || sy < -r || sx > this.w + r || sy > this.h + r) continue;
      this.punch(sx, sy, r, l.intensity);
    }

    // Blocos que emitem luz propria.
    const ts = world.tileSize;
    const pad = 2;
    const c0 = Math.max(0, Math.floor(camera.left / ts) - pad);
    const r0 = Math.max(0, Math.floor(camera.top / ts) - pad);
    const c1 = Math.min(world.width - 1, Math.ceil((camera.left + camera.viewW) / ts) + pad);
    const r1 = Math.min(world.height - 1, Math.ceil((camera.top + camera.viewH) / ts) + pad);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const def = blockDef(world.getTile(col, row));
        if (!def.emissive) continue;
        const sx = (col * ts + ts / 2 - camera.left) * s;
        const sy = (row * ts + ts / 2 - camera.top) * s;
        this.punch(sx, sy, ts * (1 + def.emissive * 2.4) * s, def.emissive * 0.9);
      }
    }

    ctx.globalCompositeOperation = 'source-over';

    // O chamador ja deixou o contexto em escala de dispositivo (dpr):
    // desenhar em unidades CSS aqui cobre a tela inteira em qualquer DPR.
    target.imageSmoothingEnabled = true;
    target.drawImage(this.canvas, 0, 0, cssW, cssH);
  }

  private punch(x: number, y: number, r: number, intensity: number): void {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = clamp(intensity, 0, 1);
    // Queda suave: um circulo com borda dura denuncia o truque da lanterna.
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(0.35, `rgba(0,0,0,${a * 0.88})`);
    g.addColorStop(0.65, `rgba(0,0,0,${a * 0.52})`);
    g.addColorStop(0.85, `rgba(0,0,0,${a * 0.2})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
