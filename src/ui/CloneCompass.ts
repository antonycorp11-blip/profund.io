import { CONFIG } from '../data/config';
import type { Camera } from '../core/camera';
/** Qualquer ajudante que valha apontar: copia ou toupeira. */
export interface CompassTarget {
  x: number;
  y: number;
  tint: string;
  index: number;
  label: string;
}
import type { World } from '../world/World';

/**
 * Bussola das copias.
 *
 * Elas trabalham longe e fora da tela — sem isto o jogador nao tem como saber
 * onde cada uma esta nem se vale a pena ir ate la. A seta fica na borda da
 * tela, na cor da copia, com a distancia e a profundidade dela.
 *
 * Quando a copia esta visivel a seta some: apontar para o que ja se ve so
 * atrapalha.
 */
export class CloneCompass {
  constructor(
    private world: World,
    private targets: () => CompassTarget[]
  ) {}

  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    cssW: number,
    cssH: number,
    dpr: number
  ): void {
    const lista = this.targets();
    if (lista.length === 0) return;

    const cfg = CONFIG.cloneCompass;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.font = '600 9px system-ui, sans-serif';
    ctx.textAlign = 'center';

    const cx = cssW / 2;
    const cy = cssH / 2;
    const raioX = cssW / 2 - cfg.margin;
    const raioY = cssH / 2 - cfg.margin;

    for (const clone of lista) {
      // Posicao da copia na tela.
      const sx = (clone.x - camera.left) * camera.scale;
      const sy = (clone.y - camera.top) * camera.scale;
      const dentro =
        sx > cfg.margin && sx < cssW - cfg.margin && sy > cfg.margin && sy < cssH - cfg.margin;
      if (dentro) continue;

      const dx = sx - cx;
      const dy = sy - cy;
      // Projeta na borda da tela.
      const t = Math.min(raioX / Math.abs(dx || 0.0001), raioY / Math.abs(dy || 0.0001));
      const px = cx + dx * t;
      const py = cy + dy * t;
      const ang = Math.atan2(dy, dx);

      const distM = Math.round(
        Math.hypot(clone.x - camera.x, clone.y - camera.y) / CONFIG.tileSize
      );
      const prof = Math.round(this.world.depthOfPixel(clone.y));

      ctx.globalAlpha = 0.9;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      // Seta.
      ctx.fillStyle = clone.tint;
      ctx.beginPath();
      ctx.moveTo(cfg.size, 0);
      ctx.lineTo(-cfg.size * 0.7, cfg.size * 0.62);
      ctx.lineTo(-cfg.size * 0.3, 0);
      ctx.lineTo(-cfg.size * 0.7, -cfg.size * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // Etiqueta sempre na horizontal, deslocada para dentro da tela.
      const lx = px - Math.cos(ang) * cfg.labelOffset;
      const ly = py - Math.sin(ang) * cfg.labelOffset;
      /*
       * Indice negativo = nao e um ajudante numerado.
       *
       * A bussola nasceu so para as copias, entao ela sempre escrevia o
       * numero da copia. Com o OBJETIVO entrando na mesma lista, a seta saiu
       * marcada "0 · 26m" — e "0" nao quer dizer nada ali. Quem nao tem
       * numero mostra so o simbolo e a distancia.
       */
      const texto =
        clone.index < 0
          ? `${clone.label} ${prof}m`
          : `${clone.label}${clone.index + 1} · ${prof}m`;
      const w = ctx.measureText(texto).width + 10;
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = 'rgba(10,8,7,0.75)';
      ctx.beginPath();
      ctx.roundRect(lx - w / 2, ly - 8, w, 15, 7);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = clone.tint;
      ctx.fillText(texto, lx, ly + 3);
      void distM;
    }
    ctx.restore();
  }
}
