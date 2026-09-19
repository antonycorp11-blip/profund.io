import { ART } from '../data/art';
import { Assets } from '../core/Assets';
import { clamp } from '../core/math';
import type { Camera } from '../core/camera';

/**
 * Camada de parallax atras de tudo.
 *
 * Repetida em espelho nos dois eixos: a arte nao precisa emendar, e nunca
 * aparece costura. A camada e escolhida pela profundidade, com transicao suave
 * entre elas para nao dar "corte" ao descer.
 */
export class Background {


  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    depthMeters: number,
    cssW: number,
    cssH: number,
    dpr: number,
    /** Pesos [dia, entardecer, noite] vindos do relogio. */
    skyWeights?: [number, number, number],
    /**
     * Um LUGAR com vista propria, se o jogador estiver dentro de um.
     *
     * Quem decide isto e o Game, que sabe geografia; o fundo so obedece. Sem
     * isto eu teria que importar os limites de Blockia aqui dentro, e entao
     * cada lugar novo do jogo passaria a mexer neste arquivo.
     */
    lugar?: string | null
  ): boolean {
    /*
     * A VISTA DA CIDADE VEM ANTES DE TUDO.
     *
     * A escolha por profundidade continua valendo em toda a mina, mas dentro
     * de Blockia ela esta simplesmente errada: aos 600 m o fundo e "caverna
     * funda", uma textura de pedra repetida em ladrilho, e a cidade fica
     * pendurada num vazio marrom. A pintura da cidade e uma so, tem enquadramento
     * proprio e nao se repete — entao ela e desenhada inteira, cobrindo a tela.
     */
    if (lugar) {
      const img = Assets.background(lugar);
      if (img) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.drawCobrindo(ctx, img, camera, cssW, cssH);
        // Veu mais leve que o da caverna: a cidade e o unico lugar iluminado
        // em 600 m de mina, e escurecer o fundo dela mata justamente o que
        // faz a chegada valer a pena.
        ctx.fillStyle = 'rgba(6,5,10,0.18)';
        ctx.fillRect(0, 0, cssW, cssH);
        return true;
      }
    }
    const layers = ART.backgrounds;
    let index = 0;
    for (let i = 0; i < layers.length; i++) {
      if (depthMeters >= layers[i].minDepth) index = i;
    }
    const current = layers[index];

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Na superficie o "fundo" e o ceu, que muda com a hora do dia.
    if (current.key === 'sky' && skyWeights) {
      let drew = false;
      ART.skyKeys.forEach((key, i) => {
        const w = skyWeights[i];
        if (w <= 0.01) return;
        const skyImg = Assets.background(key);
        if (!skyImg) return;
        this.drawLayer(ctx, skyImg, camera, current.parallax, cssW, cssH, drew ? w : 1);
        drew = true;
      });
      if (drew) {
        this.drawNextLayer(ctx, camera, depthMeters, cssW, cssH, index);
        ctx.fillStyle = 'rgba(6,5,10,0.28)';
        ctx.fillRect(0, 0, cssW, cssH);
        return true;
      }
    }

    const img = Assets.background(current.key);
    if (!img) return false;
    this.drawLayer(ctx, img, camera, current.parallax, cssW, cssH, 1);

    this.drawNextLayer(ctx, camera, depthMeters, cssW, cssH, index);

    // O fundo precisa ficar atras: um veu escuro separa ele do cenario jogavel.
    ctx.fillStyle = 'rgba(6,5,10,0.28)';
    ctx.fillRect(0, 0, cssW, cssH);
    return true;
  }

  /** Funde a camada seguinte quando o jogador se aproxima dela. */
  private drawNextLayer(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    depthMeters: number,
    cssW: number,
    cssH: number,
    index: number
  ): void {
    const next = ART.backgrounds[index + 1];
    // Transicao para a proxima camada (faixa curta perto da superficie).
    if (next) {
      const blend = Math.max(0.001, next.blend);
      const t = clamp((depthMeters - (next.minDepth - blend)) / blend, 0, 1);
      if (t > 0) {
        const nextImg = Assets.background(next.key);
        if (nextImg) this.drawLayer(ctx, nextImg, camera, next.parallax, cssW, cssH, t);
      }
    }
  }

  /**
   * Desenha a imagem INTEIRA cobrindo a tela, sem repetir.
   *
   * `drawLayer` ladrilha, que e o certo para textura de caverna e o errado
   * para uma pintura: a torre da cidade apareceria tres vezes lado a lado.
   * Aqui a imagem cobre a tela pelo maior lado e desliza devagar com a camera
   * — parallax curto, porque a cidade esta logo ali atras e nao no horizonte.
   */
  private drawCobrindo(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    camera: Camera,
    cssW: number,
    cssH: number
  ): void {
    const escala = Math.max(cssW / img.width, cssH / img.height) * 1.12;
    const w = img.width * escala;
    const h = img.height * escala;
    // A folga e o que sobra da imagem para fora da tela; o deslize nunca pode
    // passar dela, senao aparece borda preta na lateral.
    const folgaX = Math.max(0, (w - cssW) / 2);
    const folgaY = Math.max(0, (h - cssH) / 2);
    const desX = clamp(-camera.left * 0.06 * camera.scale, -folgaX, folgaX);
    const desY = clamp(-camera.top * 0.04 * camera.scale, -folgaY, folgaY);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, (cssW - w) / 2 + desX, (cssH - h) / 2 + desY, w, h);
  }

  private drawLayer(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    camera: Camera,
    parallax: number,
    cssW: number,
    cssH: number,
    alpha: number
  ): void {
    // Cobre a altura da tela com uma folga para haver curso vertical.
    const scale = (cssH / img.height) * 1.25;
    const w = img.width * scale;
    const h = img.height * scale;

    const offX = -camera.left * parallax * camera.scale;
    const offY = -camera.top * parallax * 0.55 * camera.scale;

    const startX = this.wrapStart(offX, w, 2);
    const startY = this.wrapStart(offY, h, 2);

    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    for (let y = startY, ry = 0; y < cssH; y += h, ry++) {
      for (let x = startX, rx = 0; x < cssW; x += w, rx++) {
        const flipX = (Math.floor((x - startX) / w) + rx * 0) % 2 === 1;
        const flipY = (Math.floor((y - startY) / h) + ry * 0) % 2 === 1;
        ctx.save();
        ctx.translate(x + (flipX ? w : 0), y + (flipY ? h : 0));
        ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
        ctx.drawImage(img, 0, 0, w, h);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Primeiro ponto de desenho, alinhado ao periodo do espelhamento (2 copias). */
  private wrapStart(offset: number, size: number, period: number): number {
    const span = size * period;
    return (((offset % span) + span) % span) - span;
  }
}
