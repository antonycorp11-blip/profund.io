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
      if (player.mantling) return 'mantle';
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
    const i = Math.floor(this.animTime * def.fps);
    return def.frames[def.loop ? i % n : Math.min(i, n - 1)];
  }

  /**
   * Movimento da escalada, feito em codigo.
   *
   * A folha tem um unico corpo na vertical; o que transforma a pose em
   * escalada e o ritmo: alcancar (estica e sobe), puxar (encolhe e desce um
   * pouco), sempre inclinado contra a parede. O ciclo anda com a altura ganha,
   * entao subir devagar e subir rapido tem a mesma leitura.
   */
  private climbTransform(
    ctx: CanvasRenderingContext2D,
    player: Player,
    h: number,
    hasStripArt: boolean,
    flipped: boolean
  ): void {
    // +1 = lado da parede no espaco local (que esta espelhado quando flipped).
    const dir = player.climbingWall * (flipped ? -1 : 1);

    // Com a tira dedicada o ciclo ja esta desenhado: basta encostar na parede.
    if (hasStripArt) {
      ctx.translate(dir * 3, 0);
      if (player.climbTired) ctx.translate(Math.sin(this.animTime * 34) * 1.2, 0);
      return;
    }

    if (player.climbTired) {
      // Escorregando: treme um pouco, sem ciclo.
      ctx.translate(dir * 2 + Math.sin(this.animTime * 34) * 1.2, 0);
      ctx.rotate(dir * 0.05);
      return;
    }

    // Parado agarrado respira devagar; subindo, o ciclo vem da altura.
    const moving = player.vy < -8;
    const phase = moving ? this.climbDist * 0.085 : this.animTime * 2.2;
    const pull = Math.sin(phase);
    const reach = Math.max(0, pull); // so a metade de cima do ciclo estica

    // Encosta na parede (e o passo mais importante: senao ele flutua no vao).
    ctx.translate(dir * (3.5 + reach * 1.5), moving ? -pull * 2.4 : -pull * 1.2);
    // Inclina o tronco contra a rocha.
    ctx.rotate(dir * (0.06 + pull * 0.05));
    // Estica ao alcancar, encolhe ao puxar o corpo.
    const stretch = 1 + pull * (moving ? 0.05 : 0.018);
    ctx.translate(0, h * (1 - stretch));
    ctx.scale(1 - pull * 0.02, stretch);
  }

  /**
   * Traduz o estado em (tira, quadro).
   *
   * As tiras novas tem a animacao inteira desenhada, entao o quadro vem do
   * estado fisico — velocidade, progresso do golpe, altura ganha — e nao de um
   * timer solto. E o que faz a arte "obedecer" ao controle.
   */
  private stripFrame(player: Player): { name: string; index: number } | null {
    const strips = ART.character.strips;
    const has = (n: string): boolean => Assets.characterStrips.has(n);
    const last = (n: string): number => strips[n].frames - 1;
    const pick = (n: string, i: number): { name: string; index: number } => ({
      name: n,
      index: Math.max(0, Math.min(last(n), Math.round(i))),
    });

    if (player.climbingWall !== 0 && has('climb')) {
      const n = strips.climb.frames;
      if (player.mantling) return pick('climb', last('climb'));
      if (player.climbTired) return pick('climb', 0);
      if (player.vy < -8) {
        return pick('climb', Math.floor(this.climbDist / 11) % n);
      }
      return pick('climb', 0);
    }

    if (player.swing > 0.02 && has('mine')) {
      // swing vai de 1 (impacto comecando) a 0: o quadro segue esse arco.
      return pick('mine', (1 - player.swing) * last('mine'));
    }

    if (!player.onGround && has('jump')) {
      const n = strips.jump.frames; // 0 agachar, ~n/2 apice, fim queda/pouso
      const apex = Math.floor(n * 0.55);
      if (player.vy < -240) return pick('jump', 1);
      if (player.vy < -90) return pick('jump', 2);
      if (player.vy < -20) return pick('jump', 3);
      if (player.vy < 90) return pick('jump', apex);
      return pick('jump', apex + 1);
    }

    if (player.landSquash > 0.3 && has('jump')) {
      return pick('jump', last('jump') - 1);
    }

    if (Math.abs(player.vx) > 12 && has('walk')) {
      const n = strips.walk.frames;
      return pick('walk', Math.floor(this.walkDist / 13) % n);
    }

    if (has('idle')) {
      const n = strips.idle.frames;
      return pick('idle', Math.floor(this.animTime * strips.idle.fps) % n);
    }
    return null;
  }

  /** Retorna false quando ainda nao ha arte: o chamador desenha o placeholder. */
  render(ctx: CanvasRenderingContext2D, player: Player): boolean {
    const art = ART.character;
    const strip = this.stripFrame(player);

    // Formato novo (uma tira por animacao) tem prioridade; sem ele, a folha 4x4.
    let sheet: CanvasImageSource | null = strip ? Assets.characterStrip(strip.name) : null;
    let frameW = art.stripFrame;
    let frameH = art.stripFrame;
    let sx: number;
    let sy = 0;

    let drawH = art.drawHeight;
    let usingStrip = false;
    if (sheet && strip) {
      sx = strip.index * frameW;
      drawH = art.stripDrawHeight;
      usingStrip = true;
    } else {
      sheet = Assets.character();
      if (!sheet) return false;
      const index = this.frameIndex(player);
      frameW = art.frameW;
      frameH = art.frameH;
      sx = (index % art.cols) * frameW;
      sy = Math.floor(index / art.cols) * frameH;
    }

    const scale = drawH / frameH;
    const w = frameW * scale;
    const h = drawH;
    const feetY = player.feetY;
    const top = feetY - h * art.feetAnchor;

    // Sombra no chao (o motor desenha, a arte nao traz).
    if (player.onGround) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(player.cx, feetY + 1, player.w * 0.55, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Espelha so quando o lado desejado difere do lado que a arte ja olha.
    const artFacing = usingStrip ? art.stripFacing : 1;
    const flipped = player.facing !== artFacing;

    ctx.save();
    ctx.translate(Math.round(player.cx), Math.round(top));
    if (flipped) ctx.scale(-1, 1);
    if (player.climbingWall !== 0) {
      this.climbTransform(ctx, player, h, strip?.name === 'climb', flipped);
    }
    // Squash ao aterrissar continua vindo do codigo: a arte nao precisa de quadro para isso.
    if (player.landSquash > 0) {
      const sq = 1 - player.landSquash * 0.16;
      ctx.translate(0, h * (1 - sq));
      ctx.scale(1 + player.landSquash * 0.12, sq);
    }
    ctx.drawImage(sheet, sx, sy, frameW, frameH, -w / 2, 0, w, h);
    ctx.restore();
    return true;
  }
}
