import { Events } from '../core/events';
import { CONFIG } from '../data/config';
import type { RescueNpcDef } from '../data/story';
import type { World } from '../world/World';
import type { Interactable } from './Interactable';

export type NpcState = 'trapped' | 'freed' | 'walking' | 'safe' | 'home';

/**
 * NPC resgatavel.
 * IA minima de proposito: fica preso, detecta quando a sala foi aberta,
 * caminha ate um ponto seguro e conta a sua parte da historia.
 */
export class RescueNpc implements Interactable {
  readonly id: string;
  x: number;
  y: number;
  radius = CONFIG.player.interactRadius + 10;
  state: NpcState = 'trapped';
  /** Conta para o proximo grito. Ver `listen()`. */
  private shoutTimer = 2;

  private vy = 0;
  private targetX: number;
  private breachDelay = 0;
  private t = 0;
  private walkPhase = 0;
  private readonly w = 18;
  private readonly h = 26;
  /** Bordas da sala (em tiles) que precisam ser rompidas. */
  private ring: { c0: number; r0: number; c1: number; r1: number };

  constructor(private def: RescueNpcDef, private world: World) {
    this.id = def.id;
    const ts = CONFIG.tileSize;
    this.x = def.col * ts + ts / 2;
    this.y = def.row * ts + ts / 2;
    this.targetX = (def.col + def.walkToOffsetCols) * ts + ts / 2;

    const halfW = Math.floor(def.roomW / 2);
    this.ring = {
      c0: def.col - halfW - 1,
      c1: def.col + halfW + 1,
      r0: def.row - (def.roomH - 1) - 1,
      r1: def.row + 1,
    };
  }

  get rescued(): boolean {
    return this.state === 'safe' || this.state === 'home';
  }

  /**
   * Ele disse que esperaria na base — entao precisa estar la.
   * Assim que o jogador volta a superficie, o NPC "sobe" e fica morando na base.
   */
  sendHome(x: number, y: number): void {
    if (this.state !== 'safe') return;
    this.state = 'home';
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.vy = 0;
    Events.emit('ui:toast', { text: `${this.def.name} agora vive na base.`, tone: 'good' });
  }

  /** Resgate acontece ao alcancar a pessoa. */
  readonly auto = true;

  prompt(): string | null {
    if (this.state === 'trapped' || this.state === 'safe' || this.state === 'home') {
      return 'Falar com ' + this.def.name;
    }
    return null;
  }

  interact(): void {
    if (this.state === 'trapped') {
      Events.emit('dialog:open', { lines: this.def.trappedLines });
    } else if (this.state === 'safe' || this.state === 'home') {
      Events.emit('dialog:open', { lines: this.def.safeLines });
    }
  }

  /** A sala foi aberta? Basta um tile da borda virar ar. */
  private isBreached(): boolean {
    const { c0, c1, r0, r1 } = this.ring;
    for (let c = c0; c <= c1; c++) {
      if (!this.world.isSolid(c, r0)) return true;
      if (!this.world.isSolid(c, r1)) return true;
    }
    for (let r = r0; r <= r1; r++) {
      if (!this.world.isSolid(c0, r)) return true;
      if (!this.world.isSolid(c1, r)) return true;
    }
    return false;
  }

  /**
   * O grito que leva o jogador ate aqui.
   *
   * E o "quente e frio" da infancia, e e de proposito que nao exista seta nem
   * numero: quanto mais perto, mais curto o intervalo e mais clara a frase.
   * O jogador triangula sozinho, e triangular e a parte divertida. Se houvesse
   * um marcador no mapa, o caminho inteiro viraria uma linha reta chata.
   *
   * Fora do raio de escuta nada acontece — o mineiro nao existe para quem
   * ainda nao chegou perto.
   */
  listen(dt: number, px: number, py: number): void {
    if (this.state !== 'trapped') return;
    const dist = Math.hypot(px - this.x, py - this.y);
    const raio = CONFIG.voices.hearRadius;
    if (dist > raio) {
      this.shoutTimer = Math.min(this.shoutTimer, 1.5);
      return;
    }
    // 0 na borda da audicao, 1 colado nele.
    const strength = 1 - dist / raio;
    this.shoutTimer -= dt;
    if (this.shoutTimer > 0) return;
    const { minGapSec, maxGapSec } = CONFIG.voices;
    this.shoutTimer = maxGapSec - (maxGapSec - minGapSec) * strength;

    const linhas = this.def.callLines;
    // A frase fica mais nitida conforme aperta: no limite da audicao e so um
    // ruido na pedra, colado nele e um pedido de socorro inteiro.
    const faixa = Math.min(linhas.length - 1, Math.floor(strength * linhas.length));
    Events.emit('npc:shout', {
      id: this.def.id,
      x: this.x,
      y: this.y,
      text: linhas[faixa],
      strength,
    });
  }

  update(dt: number): void {
    this.t += dt;
    if (this.state === 'home') return;

    if (this.state === 'trapped') {
      if (this.isBreached()) {
        this.state = 'freed';
        this.breachDelay = 0.5;
      }
      return;
    }

    if (this.state === 'freed') {
      this.breachDelay -= dt;
      if (this.breachDelay <= 0) {
        this.state = 'walking';
        Events.emit('dialog:open', { lines: this.def.freedLines });
      }
      return;
    }

    if (this.state === 'walking') {
      const dx = this.targetX - this.x;
      const speed = 46;
      if (Math.abs(dx) > 3) {
        const step = Math.sign(dx) * speed * dt;
        if (!this.world.rectCollides(this.x + step - this.w / 2, this.y - this.h / 2, this.w, this.h)) {
          this.x += step;
          this.walkPhase += dt * 8;
        } else {
          // Nao consegue passar: considera que chegou.
          this.arrive();
          return;
        }
      } else {
        this.arrive();
        return;
      }
    }

    // Gravidade simples (vale para walking e safe).
    this.vy = Math.min(this.vy + CONFIG.physics.gravity * dt, 600);
    const ny = this.y + this.vy * dt;
    if (this.world.rectCollides(this.x - this.w / 2, ny - this.h / 2, this.w, this.h)) {
      const ts = this.world.tileSize;
      this.y = Math.floor((ny + this.h / 2) / ts) * ts - this.h / 2 - 0.01;
      this.vy = 0;
    } else {
      this.y = ny;
    }
  }

  private arrive(): void {
    this.state = 'safe';
    Events.emit('npc:rescued', { id: this.def.id, name: this.def.name });
    Events.emit('dialog:open', { lines: this.def.safeLines });
  }

  /** Usado pelo save. */
  setState(state: NpcState): void {
    this.state = state;
    if (state === 'safe' || state === 'walking') this.x = this.targetX;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y + this.h / 2);
    const w = this.w;
    const h = this.h;
    const walk = this.state === 'walking' ? Math.sin(this.walkPhase) * 3 : 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 1, w * 0.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4a4a55';
    ctx.fillRect(-w * 0.32, -h * 0.34, w * 0.26, h * 0.34 + walk);
    ctx.fillRect(w * 0.06, -h * 0.34, w * 0.26, h * 0.34 - walk);

    ctx.fillStyle = '#8a5f3c';
    ctx.fillRect(-w * 0.4, -h * 0.72, w * 0.8, h * 0.4);
    ctx.fillStyle = '#e0b48c';
    ctx.fillRect(-w * 0.3, -h * 0.98, w * 0.6, h * 0.28);
    ctx.fillStyle = '#c94f3a';
    ctx.fillRect(-w * 0.36, -h * 1.06, w * 0.72, h * 0.16);
    ctx.restore();
  }

  renderOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.state !== 'trapped') return;
    // Balao de socorro pulsando.
    const bob = Math.sin(this.t * 3) * 2;
    const x = this.x;
    const y = this.y - this.h / 2 - 14 + bob;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(x - 7, y - 10, 14, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#ffd35c';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y);
  }
}
