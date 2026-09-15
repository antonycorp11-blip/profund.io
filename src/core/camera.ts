import { CONFIG } from '../data/config';
import { clamp, damp } from './math';

/** Camera 2D com suavizacao, limites de mundo e screen shake. */
export class Camera {
  x = 0;
  y = 0;
  scale = 2;
  viewW = 0;
  viewH = 0;

  private shake = 0;
  private shakeX = 0;
  private shakeY = 0;

  /** Limites do mundo em pixels. */
  private boundsW = 0;
  private boundsH = 0;

  setBounds(worldPixelW: number, worldPixelH: number): void {
    this.boundsW = worldPixelW;
    this.boundsH = worldPixelH;
  }

  resize(cssW: number, cssH: number): void {
    const desired = cssH / (CONFIG.render.targetTilesY * CONFIG.tileSize);
    this.scale = clamp(desired, CONFIG.render.minScale, CONFIG.render.maxScale);
    this.viewW = cssW / this.scale;
    this.viewH = cssH / this.scale;
  }

  snapTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.clampToBounds();
  }

  follow(targetX: number, targetY: number, velX: number, dt: number): void {
    const aheadX = clamp(velX / 200, -1, 1) * CONFIG.camera.lookAheadX;
    const gx = targetX + aheadX;
    const gy = targetY + CONFIG.camera.lookAheadY;
    const lambda = CONFIG.camera.lerp * 60;
    this.x = damp(this.x, gx, lambda, dt);
    this.y = damp(this.y, gy, lambda, dt);
    this.clampToBounds();
  }

  private clampToBounds(): void {
    if (this.boundsW > this.viewW) {
      this.x = clamp(this.x, this.viewW / 2, this.boundsW - this.viewW / 2);
    } else {
      this.x = this.boundsW / 2;
    }
    if (this.boundsH > this.viewH) {
      this.y = clamp(this.y, this.viewH / 2, this.boundsH - this.viewH / 2);
    } else {
      this.y = this.boundsH / 2;
    }
  }

  /** 0 = sem tremor, 1 = normal. Ajuste do jogador. */
  shakeScale = 1;

  /**
   * Tremor de impacto.
   *
   * Pega o MAIOR em vez de somar. Somando, quem tem velocidade de mineracao
   * alta recebe dezenas de impactos por segundo e a camera fica presa no teto
   * — a tela tremia tanto que nao dava para jogar. Com o maior, um golpe forte
   * continua sacudindo mais que um fraco, mas marteladas seguidas nao empilham.
   */
  addShake(amount: number): void {
    const wanted = Math.min(CONFIG.camera.maxShake, amount * this.shakeScale);
    if (wanted > this.shake) this.shake = wanted;
  }

  update(dt: number): void {
    if (this.shake > 0.01) {
      this.shake = Math.max(0, this.shake - CONFIG.camera.shakeDecay * dt);
      const a = Math.random() * Math.PI * 2;
      this.shakeX = Math.cos(a) * this.shake;
      this.shakeY = Math.sin(a) * this.shake;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  /** Canto superior esquerdo visivel (ja com shake). */
  get left(): number {
    return this.x - this.viewW / 2 + this.shakeX;
  }

  get top(): number {
    return this.y - this.viewH / 2 + this.shakeY;
  }

  /** Aplica a transformacao de mundo no contexto. */
  apply(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.translate(-Math.round(this.left * this.scale) / this.scale, -Math.round(this.top * this.scale) / this.scale);
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: this.left + sx / this.scale, y: this.top + sy / this.scale };
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: (wx - this.left) * this.scale, y: (wy - this.top) * this.scale };
  }
}
