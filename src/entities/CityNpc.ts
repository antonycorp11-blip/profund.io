import { Assets } from '../core/Assets';
import { Events } from '../core/events';
import { CONFIG } from '../data/config';
import type { CityNpcDef } from '../data/blockia';
import type { Interactable } from './Interactable';

/**
 * Morador de cidade.
 *
 * Ao contrario do `RescueNpc`, ele nao esta preso nem quer sair: fica onde
 * mora, e o jogador e quem vai ate ele. Por isso NAO e `auto` — passar perto
 * de sete moradores numa praca abriria sete dialogos em sequencia.
 */
export class CityNpc implements Interactable {
  readonly id: string;
  x: number;
  y: number;
  radius = CONFIG.player.interactRadius;
  met = false;
  private t = Math.random() * 6;
  private idleIndex = 0;

  constructor(readonly def: CityNpcDef, col: number, row: number) {
    this.id = def.id;
    const ts = CONFIG.tileSize;
    this.x = col * ts + ts / 2;
    this.y = row * ts + ts / 2;
  }

  prompt(): string | null {
    return this.met ? `Falar com ${this.def.name}` : `${this.def.name} — ${this.def.role}`;
  }

  interact(): void {
    if (!this.met) {
      this.met = true;
      Events.emit('dialog:open', {
        lines: this.def.lines,
        onClose: () => {
          Events.emit('city:met', {
            id: this.def.id,
            name: this.def.name,
            city: 'blockia',
            trust: this.def.trust,
          });
        },
      });
      return;
    }
    // Depois da primeira conversa ele repete o que tem na cabeca, em ordem.
    // Aleatorio faria o mesmo morador dizer a mesma frase duas vezes seguidas.
    const fala = this.def.idleLines[this.idleIndex % this.def.idleLines.length];
    this.idleIndex++;
    Events.emit('dialog:open', { lines: [{ speaker: this.def.name, text: fala }] });
  }

  update(dt: number): void {
    this.t += dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.renderArt(ctx)) return;
    // Silhueta vetorial ate existir arte de morador. Cada um tem a cor da
    // propria ficha, entao da para distinguir a praca de longe.
    const bob = Math.sin(this.t * 1.6) * 1.2;
    const y = this.y + bob;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 15, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b2118';
    ctx.fillRect(this.x - 6, y - 4, 12, 19);
    ctx.fillStyle = this.def.color;
    ctx.fillRect(this.x - 6, y - 4, 12, 6);
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath();
    ctx.arc(this.x, y - 10, 6, 0, Math.PI * 2);
    ctx.fill();
    // Capacete de lanterna: todo mundo em Blockia usa, ate quem nao minera.
    ctx.fillStyle = this.def.color;
    ctx.beginPath();
    ctx.arc(this.x, y - 12, 6.5, Math.PI, 0);
    ctx.fill();
  }

  /**
   * Desenha a folha real, se existir. Morador de cidade fica parado, entao so
   * a tira `idle` importa — a `walk` esta carregada para quando alguem aqui
   * comecar a andar.
   */
  private renderArt(ctx: CanvasRenderingContext2D): boolean {
    const strip = Assets.npcStrip(this.def.id, 'idle');
    if (!strip || !strip.width) return false;
    const lado = strip.height;
    const quadros = Math.max(1, Math.round(strip.width / lado));
    // Cada um respira no proprio tempo: uma praca inteira em sincronia parece
    // um vitrine de bonecos, nao um lugar com gente.
    const q = Math.floor(this.t * 5) % quadros;
    const altura = 46;
    const largura = altura;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 15, 10, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(
      strip,
      q * lado,
      0,
      lado,
      lado,
      this.x - largura / 2,
      this.y + 16 - altura,
      largura,
      altura
    );
    ctx.restore();
    return true;
  }

  renderOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.met) return;
    // Quem ainda nao foi conhecido tem um ponto pulsando: numa praca com sete
    // moradores, o jogador precisa saber com quem ainda nao falou.
    const a = 0.45 + Math.sin(this.t * 3) * 0.3;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffc453';
    ctx.beginPath();
    ctx.arc(this.x, this.y - 30, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
