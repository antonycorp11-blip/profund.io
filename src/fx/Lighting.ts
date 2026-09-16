import { blockDef } from '../data/blocks';
import { insideBlockia } from '../data/gates';
import { CONFIG } from '../data/config';
import { layerBlend } from '../data/layers';
import { clamp } from '../core/math';
import type { Camera } from '../core/camera';
import type { World } from '../world/World';

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  /** 0..1 */
  intensity: number;
  color?: string;
}

/**
 * Escuridao por profundidade + luzes recortadas.
 * Roda em um canvas separado em resolucao reduzida (barato no mobile).
 */
export class Lighting {
  private canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private w = 1;
  private h = 1;
  private readonly downscale = 0.5;
  private flicker = 0;
  /**
   * Cache de halos ja desenhados, por (raio, intensidade) arredondados.
   *
   * Cada luz criava um `createRadialGradient` NOVO e pintava um arco com ele.
   * Isso era barato com duas ou tres luzes, e o jogo nao tem duas ou tres:
   * cristal, rubi, relíquia e o proprio SELO sao blocos emissivos, e um selo e
   * uma parede de largura inteira — perto dele eram centenas de gradientes
   * construidos do zero a cada quadro.
   *
   * O formato de um halo so depende do raio e da intensidade. Entao ele vira
   * uma estampa desenhada UMA vez, e a partir dai e um drawImage.
   */
  private halos = new Map<string, HTMLCanvasElement>();

  constructor() {
    const c = this.canvas.getContext('2d');
    if (!c) throw new Error('canvas 2d indisponivel');
    this.ctx = c;
  }

  resize(cssW: number, cssH: number): void {
    this.w = Math.max(1, Math.floor(cssW * this.downscale));
    this.h = Math.max(1, Math.floor(cssH * this.downscale));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
  }

  /** 0 = superficie iluminada, 1 = escuridao total. Cada camada tem seu teto. */
  darknessAt(depthMeters: number): number {
    const { darkStartDepth, darkFullDepth, maxDarkness } = CONFIG.light;
    const t = clamp((depthMeters - darkStartDepth) / (darkFullDepth - darkStartDepth), 0, 1);
    const layer = layerBlend(depthMeters);
    return clamp(t * maxDarkness * layer.darkness, 0, 0.97);
  }

  render(
    target: CanvasRenderingContext2D,
    camera: Camera,
    world: World,
    lights: LightSource[],
    depthMeters: number,
    cssW: number,
    cssH: number,
    dt: number,
    /** Escuridao extra vinda da hora do dia (so vale perto da superficie). */
    nightDarkness = 0
  ): void {
    // Na superficie quem manda e a hora; fundo abaixo, a profundidade.
    let darkness = Math.max(this.darknessAt(depthMeters), nightDarkness);
    // Dentro de Blockia a camada nao manda. A cidade e o unico lugar aceso em
    // 600 metros de mina, e essa e a chegada: sair de uma galeria de lanterna
    // e entrar num lugar onde da para ver o teto.
    const centroCol = Math.floor((camera.left + camera.viewW / 2) / world.tileSize);
    const centroRow = Math.floor((camera.top + camera.viewH / 2) / world.tileSize);
    if (insideBlockia(centroCol, centroRow, world.surfaceRow)) {
      darkness = Math.min(darkness, CONFIG.blockia.darkness);
    }
    if (darkness <= 0.02) return;

    this.flicker += dt * 7;
    const ctx = this.ctx;
    const s = this.downscale * camera.scale;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    // A cor do escuro vem da camada: e o que mais comunica "estou noutro lugar".
    const [ar, ag, ab] = layerBlend(depthMeters).ambient;
    ctx.fillStyle = `rgba(${Math.round(ar)},${Math.round(ag)},${Math.round(ab)},${darkness})`;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.globalCompositeOperation = 'destination-out';

    // Luzes dinamicas (lanterna do player etc.).
    for (const l of lights) {
      const sx = (l.x - camera.left) * s;
      const sy = (l.y - camera.top) * s;
      const r = l.radius * s * (1 + Math.sin(this.flicker) * CONFIG.light.flicker);
      if (sx < -r || sy < -r || sx > this.w + r || sy > this.h + r) continue;
      this.punch(sx, sy, r, l.intensity);
    }

    // Blocos que emitem luz propria.
    const ts = world.tileSize;
    const pad = 2;
    const c0 = Math.max(0, Math.floor(camera.left / ts) - pad);
    const r0 = Math.max(0, Math.floor(camera.top / ts) - pad);
    const c1 = Math.min(world.width - 1, Math.ceil((camera.left + camera.viewW) / ts) + pad);
    const r1 = Math.min(world.height - 1, Math.ceil((camera.top + camera.viewH) / ts) + pad);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const id = world.getTile(col, row);
        const def = blockDef(id);
        if (!def.emissive) continue;
        // Brilho fraco demais para se enxergar nao vale um halo. O tijolo
        // antigo (0,05) enchia a tela de estampas que ninguem nunca viu.
        if (def.emissive < CONFIG.light.minEmissive) continue;
        /*
         * Parede grande de um mesmo bloco emissivo — um SELO, uma veia larga
         * de cristal — pinta um halo sim e um nao, em xadrez. Os halos se
         * sobrepoem muito mais do que o passo de um tile, entao o resultado e
         * indistinguivel e o custo cai pela metade justo onde ele era pior:
         * um selo e uma parede da largura inteira do mundo.
         */
        if (((col + row) & 1) === 1 && this.cercado(world, col, row, id)) continue;
        const sx = (col * ts + ts / 2 - camera.left) * s;
        const sy = (row * ts + ts / 2 - camera.top) * s;
        this.punch(sx, sy, ts * (1 + def.emissive * 2.4) * s, def.emissive * 0.9);
      }
    }

    ctx.globalCompositeOperation = 'source-over';

    // O chamador ja deixou o contexto em escala de dispositivo (dpr):
    // desenhar em unidades CSS aqui cobre a tela inteira em qualquer DPR.
    target.imageSmoothingEnabled = true;
    target.drawImage(this.canvas, 0, 0, cssW, cssH);
  }

  /** Os quatro vizinhos sao o mesmo bloco? (Para o xadrez dos emissivos.) */
  private cercado(world: World, col: number, row: number, id: number): boolean {
    return (
      world.getTile(col - 1, row) === id &&
      world.getTile(col + 1, row) === id &&
      world.getTile(col, row - 1) === id &&
      world.getTile(col, row + 1) === id
    );
  }

  private punch(x: number, y: number, r: number, intensity: number): void {
    if (r < 1) return;
    const halo = this.halo(r, clamp(intensity, 0, 1));
    const lado = halo.width;
    this.ctx.drawImage(halo, Math.round(x - lado / 2), Math.round(y - lado / 2));
  }

  /**
   * A estampa de um halo, desenhada uma vez e reaproveitada.
   *
   * Raio e intensidade sao arredondados de proposito — 4 px e 1/16 de alfa. A
   * lanterna do jogador muda de raio a cada quadro por causa do bruxuleio, e
   * sem esse arredondamento o cache nunca acertaria: seriam sessenta estampas
   * novas por segundo, que e pior do que nao ter cache nenhum.
   */
  private halo(r: number, a: number): HTMLCanvasElement {
    const raio = Math.max(4, Math.round(r / 4) * 4);
    const alfa = Math.max(1, Math.round(a * 16));
    const chave = `${raio}:${alfa}`;
    const pronto = this.halos.get(chave);
    if (pronto) return pronto;

    const alvo = alfa / 16;
    const c = document.createElement('canvas');
    c.width = raio * 2;
    c.height = raio * 2;
    const cc = c.getContext('2d');
    if (!cc) return c;
    const g = cc.createRadialGradient(raio, raio, 0, raio, raio, raio);
    // Queda suave: um circulo com borda dura denuncia o truque da lanterna.
    g.addColorStop(0, `rgba(0,0,0,${alvo})`);
    g.addColorStop(0.35, `rgba(0,0,0,${alvo * 0.88})`);
    g.addColorStop(0.65, `rgba(0,0,0,${alvo * 0.52})`);
    g.addColorStop(0.85, `rgba(0,0,0,${alvo * 0.2})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cc.fillStyle = g;
    cc.fillRect(0, 0, c.width, c.height);

    // O cache nao pode crescer sem fim: raio e alfa sao discretos, entao ele
    // estabiliza sozinho em poucas dezenas de entradas. O teto e so um seguro.
    if (this.halos.size > 96) this.halos.clear();
    this.halos.set(chave, c);
    return c;
  }
}
