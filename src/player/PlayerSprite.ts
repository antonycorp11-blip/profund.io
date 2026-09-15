import { ART } from '../data/art';
import { Assets } from '../core/Assets';
import type { Player } from './Player';

type AnimName = keyof typeof ART.character.anims;

/**
 * Desenha o heroi a partir da folha de animacao.
 * Se a arte nao estiver carregada, `render` devolve false e o Player cai no placeholder vetorial.
 */
export class PlayerSprite {
  private anim: AnimName = 'idle';
  private animTime = 0;
  private walkDist = 0;
  private climbDist = 0;

  /** Estado externo que influencia a pose. */
  heavy = false;

  update(dt: number, player: Player): void {
    const next = this.pickAnim(player);
    if (next !== this.anim) {
      this.anim = next;
      this.animTime = 0;
    }
    this.animTime += dt;
    this.walkDist += Math.abs(player.vx) * dt;
    if (player.climbingWall !== 0 && player.vy < 0) this.climbDist += Math.abs(player.vy) * dt;
  }

  private pickAnim(player: Player): AnimName {
    // Escalar vem antes de tudo: e o unico estado em que o corpo esta na
    // vertical contra a parede, e a pose de pulo ali fica errada.
    if (player.climbingWall !== 0) {
      if (player.climbTired) return 'climb_slide';
      return player.vy < -8 ? 'climb' : 'climb_hold';
    }
    if (player.swing > 0.02) {
      if (player.swingDirY > 0.45) return 'mine_down';
      if (player.swingDirY < -0.45) return 'mine_up';
      return 'mine_side';
    }
    if (!player.onGround) return player.vy < -20 ? 'jump' : 'fall';
    if (player.landSquash > 0.35) return 'land';
    if (Math.abs(player.vx) > 12) return 'walk';
    return this.heavy ? 'carry' : 'idle';
  }

  private frameIndex(player: Player): number {
    const def = ART.character.anims[this.anim];
    const n = def.frames.length;
    if (n === 1) return def.frames[0];

    // Golpe: o quadro segue o ritmo real da picareta, nao um timer proprio.
    if (this.anim.startsWith('mine')) {
      return def.frames[player.swing >= 0.6 ? 1 : 0];
    }
    // Caminhada: avanca por distancia percorrida, senao o boneco "patina".
    if (this.anim === 'walk') {
      return def.frames[Math.floor(this.walkDist / 20) % n];
    }
    // Escalada: mesma logica, pela altura ganha.
    if (this.anim === 'climb') {
      return def.frames[Math.floor(this.climbDist / 22) % n];
    }
    const i = Math.floor(this.animTime * def.fps);
    return def.frames[def.loop ? i % n : Math.min(i, n - 1)];
  }

  /** Retorna false quando ainda nao ha arte: o chamador desenha o placeholder. */
  render(ctx: CanvasRenderingContext2D, player: Player): boolean {
    const sheet = Assets.character();
    if (!sheet) return false;

    const art = ART.character;
    const index = this.frameIndex(player);
    const sx = (index % art.cols) * art.frameW;
    const sy = Math.floor(index / art.cols) * art.frameH;

    const scale = art.drawHeight / art.frameH;
    const w = art.frameW * scale;
    const h = art.drawHeight;
    const feetY = player.feetY;
    const top = feetY - h * art.feetAnchor;

    // Sombra no chao (o motor desenha, a arte nao traz).
    if (player.onGround) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(player.cx, feetY + 1, player.w * 0.55, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(Math.round(player.cx), Math.round(top));
    if (player.facing === -1) ctx.scale(-1, 1);
    // Agarrado, o corpo encosta na parede: um leve deslocamento para o lado do
    // agarre tira o boneco de "flutuando no meio do vao".
    if (player.climbingWall !== 0) {
      ctx.translate(player.climbingWall * player.facing * 3, 0);
    }
    // Squash ao aterrissar continua vindo do codigo: a arte nao precisa de quadro para isso.
    if (player.landSquash > 0) {
      const sq = 1 - player.landSquash * 0.16;
      ctx.translate(0, h * (1 - sq));
      ctx.scale(1 + player.landSquash * 0.12, sq);
    }
    ctx.drawImage(sheet, sx, sy, art.frameW, art.frameH, -w / 2, 0, w, h);
    ctx.restore();
    return true;
  }
}
