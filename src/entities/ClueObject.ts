import { Events } from '../core/events';
import { CONFIG } from '../data/config';
import type { ClueDef } from '../data/story';
import type { Interactable } from './Interactable';

/** Objeto narrativo: a marca deixada pelo pai. */
export class ClueObject implements Interactable {
  readonly id: string;
  x: number;
  y: number;
  radius = CONFIG.player.interactRadius;
  found = false;
  private t = 0;

  constructor(private def: ClueDef) {
    this.id = def.id;
    const ts = CONFIG.tileSize;
    this.x = def.col * ts + ts / 2;
    this.y = def.row * ts + ts / 2;
  }

  /** Pista se le sozinha ao chegar perto. */
  readonly auto = true;

  prompt(): string | null {
    return this.found ? 'Reler marca' : this.def.prompt;
  }

  interact(): void {
    const first = !this.found;
    Events.emit('dialog:open', {
      lines: this.def.lines,
      onClose: () => {
        if (!first) return;
        this.found = true;
        Events.emit('clue:found', {
          id: this.def.id,
          title: this.def.title,
          logEntry: this.def.logEntry,
        });
      },
    });
  }

  update(dt: number): void {
    this.t += dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const ts = CONFIG.tileSize;
    const x = this.x;
    const y = this.y;

    // Placa de pedra com a marca gravada.
    ctx.fillStyle = '#3a4444';
    ctx.fillRect(x - ts * 0.4, y - ts * 0.5, ts * 0.8, ts);
    ctx.fillStyle = '#4c5858';
    ctx.fillRect(x - ts * 0.34, y - ts * 0.44, ts * 0.68, ts * 0.88);

    // A marca: duas picaretas cruzadas + um risco.
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#d9b877';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -7);
    ctx.lineTo(7, 7);
    ctx.moveTo(7, -7);
    ctx.lineTo(-7, 7);
    ctx.moveTo(-9, 10);
    ctx.lineTo(9, 10);
    ctx.stroke();
    ctx.restore();
  }

  renderOverlay(ctx: CanvasRenderingContext2D): void {
    // Brilho pulsante para chamar atencao no escuro.
    const pulse = 0.35 + Math.sin(this.t * 2.2) * 0.15;
    const g = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, 46);
    g.addColorStop(0, `rgba(226,190,120,${pulse * (this.found ? 0.25 : 0.55)})`);
    g.addColorStop(1, 'rgba(226,190,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(this.x - 46, this.y - 46, 92, 92);
  }
}
