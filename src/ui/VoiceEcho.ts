import { Events } from '../core/events';
import type { Camera } from '../core/camera';

interface Echo {
  x: number;
  y: number;
  text: string;
  strength: number;
  /** Tempo de vida restante, em segundos. */
  life: number;
  maxLife: number;
}

/**
 * O eco de quem grita por socorro.
 *
 * Quando a fonte esta fora da tela, desenha um arco pulsante na borda, na
 * direcao dela, com a frase abafada ao lado. Quando esta visivel, o texto
 * aparece sobre o proprio lugar.
 *
 * Deliberadamente NAO ha seta, distancia em metros nem marcador no mapa. A
 * unica informacao e a frequencia e a nitidez do grito, e achar a origem disso
 * e a parte divertida. Um marcador transformaria o caminho numa linha reta.
 */
export class VoiceEcho {
  private echoes: Echo[] = [];

  constructor() {
    Events.on('npc:shout', (p) => {
      // Um eco por fonte: gritos empilhados virariam sopa na borda da tela.
      this.echoes = this.echoes.filter((e) => e.text !== p.text || e.x !== p.x);
      const life = 2.4;
      this.echoes.push({ x: p.x, y: p.y, text: p.text, strength: p.strength, life, maxLife: life });
    });
  }

  update(dt: number): void {
    for (const e of this.echoes) e.life -= dt;
    this.echoes = this.echoes.filter((e) => e.life > 0);
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera, cssW: number, cssH: number, dpr: number): void {
    if (this.echoes.length === 0) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const e of this.echoes) {
      const t = e.life / e.maxLife;
      // Sobe rapido e some devagar: o grito "chega" em vez de aparecer.
      const alpha = t > 0.85 ? (1 - t) / 0.15 : t / 0.85;
      const sx = e.x - camera.x;
      const sy = e.y - camera.y;
      const margem = 46;
      const dentro = sx > margem && sx < cssW - margem && sy > margem && sy < cssH - margem;

      // Longe = cinza e apagado; perto = quente e legivel.
      const cor = `rgba(255, ${Math.round(190 + 60 * e.strength)}, ${Math.round(120 + 60 * e.strength)}, ${alpha * (0.4 + 0.6 * e.strength)})`;

      if (dentro) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = cor;
        ctx.font = `600 ${Math.round(12 + 4 * e.strength)}px system-ui, sans-serif`;
        ctx.fillText(e.text, sx, sy - 44 - (1 - t) * 10);
        continue;
      }

      // Fora da tela: projeta na borda e desenha ondas concentricas ali.
      const cx = cssW / 2;
      const cy = cssH / 2;
      const ang = Math.atan2(sy - cy, sx - cx);
      const raioX = cssW / 2 - margem;
      const raioY = cssH / 2 - margem;
      const escala = Math.min(
        Math.abs(raioX / Math.cos(ang) || Infinity),
        Math.abs(raioY / Math.sin(ang) || Infinity)
      );
      const bx = cx + Math.cos(ang) * escala;
      const by = cy + Math.sin(ang) * escala;

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ang);
      ctx.strokeStyle = cor;
      ctx.lineWidth = 2;
      // Tres arcos abrindo para fora: e "som vindo de la", nao "clique aqui".
      for (let n = 0; n < 3; n++) {
        const fase = (1 - t + n * 0.22) % 1;
        ctx.globalAlpha = alpha * (1 - fase) * (0.35 + 0.65 * e.strength);
        ctx.beginPath();
        ctx.arc(-6, 0, 6 + fase * 16, -0.7, 0.7);
        ctx.stroke();
      }
      ctx.restore();

      ctx.globalAlpha = 1;
      ctx.fillStyle = cor;
      ctx.font = `600 ${Math.round(11 + 3 * e.strength)}px system-ui, sans-serif`;
      // O texto encosta na borda pelo lado de dentro, para nao sair da tela.
      const tx = Math.max(90, Math.min(cssW - 90, bx - Math.cos(ang) * 40));
      const ty = Math.max(28, Math.min(cssH - 28, by - Math.sin(ang) * 30));
      ctx.fillText(e.text, tx, ty);
    }
    ctx.restore();
  }
}
