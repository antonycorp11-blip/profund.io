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
  /** Onde ele mora: nunca sai de perto disso. */
  private casaX: number;
  private alvoX: number;
  private paradoAte = Math.random() * 4;
  private facing: 1 | -1 = 1;

  constructor(readonly def: CityNpcDef, col: number, row: number) {
    this.id = def.id;
    const ts = CONFIG.tileSize;
    this.x = col * ts + ts / 2;
    this.y = row * ts + ts / 2;
    this.casaX = this.x;
    this.alvoX = this.x;
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
    // Vai e vem curto em volta de casa, com paradas.
    //
    // Nao ha pathfinding nem colisao aqui de proposito: o passeio e de poucos
    // tiles no proprio terraco, que e plano e ja foi provado caminhavel. Um
    // morador que some atras de uma parede custaria muito mais do que ganha.
    if (this.paradoAte > 0) {
      this.paradoAte -= dt;
      return;
    }
    const dx = this.alvoX - this.x;
    if (Math.abs(dx) < 2) {
      // Chegou: para um tempo e escolhe outro ponto perto de casa.
      this.paradoAte = 1.5 + Math.random() * 5;
      this.alvoX = this.casaX + (Math.random() * 2 - 1) * CONFIG.tileSize * 4;
      return;
    }
    const dir = Math.sign(dx) as 1 | -1;
    this.facing = dir;
    this.x += dir * 18 * dt;
  }

  /** Esta se movendo agora? Decide entre a tira parada e a de andar. */
  private get andando(): boolean {
    return this.paradoAte <= 0 && Math.abs(this.alvoX - this.x) >= 2;
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
    const strip =
      Assets.npcStrip(this.def.id, this.andando ? 'walk' : 'idle') ??
      Assets.npcStrip(this.def.id, 'idle');
    if (!strip || !strip.width) return false;
    const lado = strip.height;
    const quadros = Math.max(1, Math.round(strip.width / lado));
    // Cada um respira no proprio tempo: uma praca inteira em sincronia parece
    // um vitrine de bonecos, nao um lugar com gente.
    const q = Math.floor(this.t * (this.andando ? 8 : 5)) % quadros;
    const altura = 46;
    const largura = altura;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 15, 10, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(this.x, this.y + 16);
    ctx.scale(this.facing, 1);
    ctx.drawImage(strip, q * lado, 0, lado, lado, -largura / 2, -altura, largura, altura);
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
