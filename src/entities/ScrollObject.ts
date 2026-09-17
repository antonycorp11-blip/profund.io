import { Assets } from '../core/Assets';
import { Events } from '../core/events';
import { CONFIG } from '../data/config';
import type { ScrollDef } from '../data/scrolls';
import type { Interactable } from './Interactable';

/**
 * Um pergaminho de Santiago ou John caido na mina.
 *
 * Le sozinho ao chegar perto, como as pistas: parar e apertar para ler um
 * papel no chao e atrito sem ganho. Depois de lido continua ali, relegivel —
 * o texto tambem vai para o Guia, mas quem quiser reler no lugar pode.
 */
export class ScrollObject implements Interactable {
  readonly id: string;
  x: number;
  y: number;
  radius = CONFIG.player.interactRadius;
  found = false;
  readonly auto = true;
  private t = Math.random() * 6;

  constructor(readonly def: ScrollDef, surfaceRow: number) {
    this.id = def.id;
    const ts = CONFIG.tileSize;
    this.x = def.col * ts + ts / 2;
    this.y = (surfaceRow + def.depth) * ts + ts / 2;
  }

  prompt(): string | null {
    return this.found ? 'Reler anotacao' : 'Pegar anotacao';
  }

  interact(): void {
    const primeira = !this.found;
    Events.emit('dialog:open', {
      lines: this.def.text.map((t) => ({ speaker: this.def.author, text: t })),
      onClose: () => {
        if (!primeira) return;
        this.found = true;
        Events.emit('scroll:found', {
          id: this.def.id,
          title: this.def.title,
          author: this.def.author,
          layer: this.def.layer,
          cron: this.def.cron,
          text: this.def.text,
        });
      },
    });
  }

  update(dt: number): void {
    this.t += dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    /*
     * A folha de papel de verdade, caida na mina.
     *
     * Era um retangulo vetorial de catorze pixels, com a justificativa de que
     * "o que importa e a leitura, nao o icone". Estava errado: e justamente o
     * icone que faz o jogador atravessar a caverna para ver o que e aquilo. A
     * arte existe — e a mesma folha rasgada da papelaria do caderno.
     */
    const bob = Math.sin(this.t * 2) * 1.5;
    const y = this.y + bob;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 10, 8, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const papel = Assets.journalPaper();
    if (papel && papel.width) {
      const alt = 24;
      const larg = (papel.width / papel.height) * alt;
      ctx.imageSmoothingEnabled = true;
      // Ja lida fica apagada: continua relegivel, mas para de chamar.
      ctx.globalAlpha = this.found ? 0.42 : 1;
      ctx.drawImage(papel, this.x - larg / 2, y - alt / 2, larg, alt);
      ctx.restore();
      return;
    }

    // Sem arte: a silhueta de sempre, para nada sumir do mapa.
    ctx.fillStyle = this.found ? '#8d7f63' : '#e9d8b8';
    ctx.fillRect(this.x - 7, y - 4, 14, 9);
    ctx.fillStyle = this.found ? '#6b604a' : '#c9b189';
    ctx.fillRect(this.x - 7, y - 4, 14, 2);
    ctx.fillRect(this.x - 7, y + 3, 14, 2);
    ctx.restore();
  }

  renderOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.found) return;
    // Brilho fraco: ele precisa ser notado no escuro sem virar um marcador.
    const a = 0.3 + Math.sin(this.t * 2.5) * 0.18;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, 26);
    g.addColorStop(0, '#ffe9a3');
    g.addColorStop(1, 'rgba(255, 233, 163, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
