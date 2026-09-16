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

  /**
   * Afastamento pedido pelo lugar onde o jogador esta.
   *
   * 1 e o enquadramento normal da mina, apertado de proposito — la embaixo o
   * escuro e o aperto sao o assunto. Numa BASE o assunto e outro: sao trinta e
   * oito colunas de maquinaria que so fazem sentido vistas juntas, e com o
   * zoom de tunel o jogador nao enxerga a esteira que ele acabou de construir.
   *
   * A transicao e suave porque um corte de zoom no meio do passo embrulha o
   * estomago e faz o jogador perder onde estava.
   */
  private afastamento = 1;
  private afastamentoAlvo = 1;
  private cssW = 0;
  private cssH = 0;

  /** Pedido de afastamento: 1 = normal, 1.7 = bem mais campo de visao. */
  setZoomOut(alvo: number, dt: number): void {
    this.afastamentoAlvo = alvo;
    const antes = this.afastamento;
    this.afastamento = damp(this.afastamento, this.afastamentoAlvo, 3.2, dt);
    if (Math.abs(this.afastamento - antes) > 0.0005) this.applyScale();
  }

  /** Limites do mundo em pixels. */
  private boundsW = 0;
  private boundsH = 0;

  setBounds(worldPixelW: number, worldPixelH: number): void {
    this.boundsW = worldPixelW;
    this.boundsH = worldPixelH;
  }

  resize(cssW: number, cssH: number): void {
    this.cssW = cssW;
    this.cssH = cssH;
    this.applyScale();
  }

  private applyScale(): void {
    if (this.cssH <= 0) return;
    const tiles = CONFIG.render.targetTilesY * this.afastamento;
    const desired = this.cssH / (tiles * CONFIG.tileSize);
    // O piso do zoom acompanha o afastamento: sem isso o `minScale` segurava a
    // camera no enquadramento de tunel e o pedido nao saia do papel.
    const min = CONFIG.render.minScale / this.afastamento;
    this.scale = clamp(desired, min, CONFIG.render.maxScale);
    this.viewW = this.cssW / this.scale;
    this.viewH = this.cssH / this.scale;
    this.clampToBounds();
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

  /**
   * Este ponto do mundo esta na tela?
   *
   * Existe para os desenhos em massa — toupeiras, copias, criaturas e drops.
   * Nenhum deles cortava nada: um exercito de toupeiras a 300 m dali era
   * desenhado quadro a quadro junto com 400 drops espalhados pela mina
   * inteira. A folga cobre o corpo do bicho e a sombra dele, para nada sumir
   * meio quadro antes de sair da borda.
   */
  sees(x: number, y: number, folga = 48): boolean {
    return (
      x >= this.left - folga &&
      x <= this.left + this.viewW + folga &&
      y >= this.top - folga &&
      y <= this.top + this.viewH + folga
    );
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
