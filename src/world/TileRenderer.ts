import { ART } from '../data/art';
import { Assets } from '../core/Assets';
import { BLOCK_IDS, blockDef, type BlockDef } from '../data/blocks';
import { CONFIG } from '../data/config';
import { hash2d } from '../core/rng';
import { layerAt } from '../data/layers';
import type { Camera } from '../core/camera';
import type { World } from './World';

/** Escurecimento aplicado sobre a textura de fundo, por camada. */
const BACKWALL_DIM = ['rgba(10,6,4,0.42)', 'rgba(6,6,10,0.42)', 'rgba(4,4,8,0.40)'];

interface CachedChunk {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lastUsed: number;
}

/**
 * Desenha o tilemap usando cache por chunk (offscreen canvas).
 * Apenas chunks visiveis sao mantidos; blocos alterados marcam o chunk como sujo.
 */
export class TileRenderer {
  private cache = new Map<number, CachedChunk>();
  private frame = 0;
  /** Lado do chunk em pixels de MUNDO. */
  private readonly chunkWorldPx: number;
  /** Lado do canvas de cache: maior que o mundo quando ha arte HD. */
  private readonly chunkCanvasPx: number;
  /** Quantos pixels de textura por pixel de mundo. */
  private readonly artScale: number;
  private readonly useArt: boolean;
  private readonly maxCached: number;
  /**
   * Quantos chunks podem ser (re)pintados por frame.
   * Sem esse teto, carregar o save ou girar a tela repinta tudo de uma vez e trava ~40 ms.
   * Com ele o mundo entra em 2-3 frames, imperceptivel.
   */
  private readonly paintBudget = 2;
  private paintedThisFrame = 0;
  private decorationLights: { x: number; y: number; radius: number; intensity: number }[] = [];

  constructor(private world: World) {
    this.chunkWorldPx = world.chunkSize * world.tileSize;
    this.useArt = Assets.hasBlockArt;
    this.artScale = this.useArt ? ART.tileArtScale : 1;
    this.chunkCanvasPx = this.chunkWorldPx * this.artScale;
    // Cada chunk em cache custa (chunkCanvasPx^2 * 4) bytes.
    this.maxCached = this.artScale > 1 ? 24 : 48;
  }

  /** Retangulo de tiles visiveis (com padding). */
  visibleTileRange(camera: Camera): { c0: number; r0: number; c1: number; r1: number } {
    const ts = this.world.tileSize;
    const pad = CONFIG.render.cullPadding;
    const c0 = Math.max(0, Math.floor(camera.left / ts) - pad);
    const r0 = Math.max(0, Math.floor(camera.top / ts) - pad);
    const c1 = Math.min(this.world.width - 1, Math.ceil((camera.left + camera.viewW) / ts) + pad);
    const r1 = Math.min(this.world.height - 1, Math.ceil((camera.top + camera.viewH) / ts) + pad);
    return { c0, r0, c1, r1 };
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    this.frame++;
    this.paintedThisFrame = 0;
    const cs = this.world.chunkSize;
    const { c0, r0, c1, r1 } = this.visibleTileRange(camera);
    const cc0 = Math.floor(c0 / cs);
    const cc1 = Math.floor(c1 / cs);
    const cr0 = Math.floor(r0 / cs);
    const cr1 = Math.floor(r1 / cs);

    ctx.imageSmoothingEnabled = this.useArt;
    for (let cr = cr0; cr <= cr1; cr++) {
      for (let cc = cc0; cc <= cc1; cc++) {
        const ci = cr * this.world.chunkCols + cc;
        const chunk = this.getChunk(ci, cc, cr);
        if (!chunk) continue; // ainda nao coube no orcamento deste frame
        // +1px de sobreposicao evita costuras quando o zoom nao e inteiro.
        ctx.drawImage(
          chunk.canvas,
          cc * this.chunkWorldPx,
          cr * this.chunkWorldPx,
          this.chunkWorldPx + 1,
          this.chunkWorldPx + 1
        );
      }
    }

    this.drawDecorations(ctx, c0, r0, c1, r1);
    this.drawCracks(ctx, c0, r0, c1, r1);
    this.evictIfNeeded();
  }

  private getChunk(ci: number, cc: number, cr: number): CachedChunk | null {
    let chunk = this.cache.get(ci);
    if (!chunk) {
      if (this.paintedThisFrame >= this.paintBudget) return null;
      const canvas = document.createElement('canvas');
      canvas.width = this.chunkCanvasPx;
      canvas.height = this.chunkCanvasPx;
      const c2d = canvas.getContext('2d');
      if (!c2d) throw new Error('canvas 2d indisponivel');
      c2d.imageSmoothingEnabled = this.useArt;
      chunk = { canvas, ctx: c2d, lastUsed: this.frame };
      this.cache.set(ci, chunk);
      this.world.dirtyChunks.add(ci);
    }
    chunk.lastUsed = this.frame;
    if (this.world.dirtyChunks.has(ci) && this.paintedThisFrame < this.paintBudget) {
      this.paintChunk(chunk, cc, cr);
      this.world.dirtyChunks.delete(ci);
      this.paintedThisFrame++;
    }
    return chunk;
  }

  private paintChunk(chunk: CachedChunk, cc: number, cr: number): void {
    const cs = this.world.chunkSize;
    const ts = this.world.tileSize;
    const ctx = chunk.ctx;
    // Desenha sempre em unidades de mundo; a escala da arte fica na transformacao.
    ctx.setTransform(this.artScale, 0, 0, this.artScale, 0, 0);
    ctx.clearRect(0, 0, this.chunkWorldPx, this.chunkWorldPx);
    const baseCol = cc * cs;
    const baseRow = cr * cs;
    for (let r = 0; r < cs; r++) {
      for (let c = 0; c < cs; c++) {
        const col = baseCol + c;
        const row = baseRow + r;
        if (!this.world.inBounds(col, row)) continue;
        this.paintTile(ctx, col, row, c * ts, r * ts, ts);
      }
    }
  }

  private paintTile(
    ctx: CanvasRenderingContext2D,
    col: number,
    row: number,
    x: number,
    y: number,
    size: number
  ): void {
    const id = this.world.getTile(col, row);
    if (id === BLOCK_IDS.AIR) {
      this.paintBackwall(ctx, col, row, x, y, size);
      return;
    }
    const def = blockDef(id);

    // Veios fundos herdam a rocha da camada: um quadrado de terra entre blocos
    // vulcanicos parecia remendo, nao minerio incrustado.
    const directOre = ART.directOreKeys.includes(def.key) ||
      (def.key === 'copper' && this.world.depthOfRow(row) < 12);
    if (this.useArt && ART.oreStamp.enabled && def.type === 'minerio' && def.drop && !directOre) {
      if (this.paintOreStamp(ctx, def, col, row, x, y, size)) return;
    }

    const layerHere = layerAt(this.world.depthOfRow(row));
    const plainArt = this.useArt ? Assets.blockVariants(def.key) : null;
    // Rocha comum herda a cor da camada; estruturas e minerios mantem a propria.
    const art =
      plainArt && layerHere.tint && (def.key === 'stone' || def.key === 'darkstone')
        ? Assets.tintedBlockVariants(def.key, layerHere.tint, layerHere.tintStrength ?? 0.7) ??
          plainArt
        : plainArt;

    if (art) {
      // A variacao e estavel no mundo inteiro, inclusive entre chunks.
      const v = Math.floor(hash2d(col, row, 991) * art.length) % art.length;
      this.drawTileImage(ctx, art[v], x, y, size, col, row, def.artFlipY !== false);
      this.paintArtEdges(ctx, col, row, x, y, size);
      return;
    }

    ctx.fillStyle = def.color;
    ctx.fillRect(x, y, size, size);

    // Sombra inferior/direita da em volume ao bloco.
    const edge = Math.max(2, size * 0.14);
    ctx.fillStyle = def.shade;
    ctx.fillRect(x, y + size - edge, size, edge);
    ctx.fillRect(x + size - edge * 0.6, y, edge * 0.6, size);

    // Brilho no topo quando o bloco esta exposto.
    if (!this.world.isSolid(col, row - 1)) {
      ctx.fillStyle = def.key === 'grass' ? '#4f7d34' : def.speckle;
      ctx.fillRect(x, y, size, Math.max(2, size * 0.12));
      if (def.key === 'grass') {
        ctx.fillStyle = '#5f9440';
        ctx.fillRect(x, y, size, Math.max(1, size * 0.06));
      }
    }

    // Granulacao deterministica.
    ctx.fillStyle = def.speckle;
    for (let i = 0; i < 4; i++) {
      const hx = hash2d(col * 4 + i, row, 11);
      const hy = hash2d(col, row * 4 + i, 29);
      const sx = x + 3 + hx * (size - 8);
      const sy = y + 3 + hy * (size - 10);
      const sw = 2 + Math.floor(hx * 2);
      ctx.fillRect(Math.floor(sx), Math.floor(sy), sw, 2);
    }

    // Veio de minerio.
    if (def.oreColor) {
      this.paintOre(ctx, def, col, row, x, y, size);
    }

    // Tijolos antigos: linhas de argamassa (so no placeholder).
    if (def.key === 'ruin_brick') {
      ctx.strokeStyle = 'rgba(180,220,214,0.20)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + size / 2 + 0.5);
      ctx.lineTo(x + size, y + size / 2 + 0.5);
      const vx = row % 2 === 0 ? x + size / 2 : x + size / 4;
      ctx.moveTo(vx + 0.5, y);
      ctx.lineTo(vx + 0.5, y + size / 2);
      ctx.stroke();
    }

    if (def.key === 'plank') {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x, y + size * 0.45, size, 2);
    }
  }

  /**
   * Pinta um bloco de minerio compondo rocha + icones de minerio recortados.
   * Retorna false se faltar alguma arte (o chamador cai na textura pronta).
   */
  private paintOreStamp(
    ctx: CanvasRenderingContext2D,
    def: BlockDef,
    col: number,
    row: number,
    x: number,
    y: number,
    size: number
  ): boolean {
    const cfg = ART.oreStamp;
    const icon = Assets.oreChunk(def.drop!);
    if (!icon) return false;

    // Rocha de fundo: a da camada onde o bloco esta.
    const layer = layerAt(this.world.depthOfRow(row));
    const base = layer.tint
      ? Assets.tintedBlockVariants(layer.rockKey, layer.tint, layer.tintStrength ?? 0.7)
      : Assets.blockVariants(layer.rockKey);
    if (!base) return false;

    const bv = Math.floor(hash2d(col, row, 991) * base.length) % base.length;
    this.drawTileImage(ctx, base[bv], x, y, size, col, row, true);

    const cluster = def.key === 'copper' || def.key === 'iron' ||
      def.key === 'gold' || def.key === 'azurite';
    const count = cluster ? 1 :
      cfg.minCount + Math.floor(hash2d(col, row, 4001) * (cfg.maxCount - cfg.minCount + 1));
    const margin = size * cfg.margin;
    const span = size - margin * 2;

    for (let i = 0; i < count; i++) {
      const hx = hash2d(col * 13 + i * 71, row, 5003);
      const hy = hash2d(col, row * 13 + i * 97, 6007);
      const hs = hash2d(col + i * 31, row - i * 17, 7001);
      const hr = hash2d(col - i * 23, row + i * 41, 8009);

      const s = cluster ? size * (0.88 + hs * 0.12) :
        size * (cfg.minScale + hs * (cfg.maxScale - cfg.minScale));
      const cx = cluster ? x + size * (0.46 + hx * 0.08) : x + margin + hx * span;
      const cy = cluster ? y + size * (0.46 + hy * 0.08) : y + margin + hy * span;
      const rot = (hr - 0.5) * 2 * cfg.maxRotation;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      // Encaixe: sombra atras da pepita para ela parecer incrustada, nao colada.
      if (!cluster) {
        ctx.fillStyle = `rgba(0,0,0,${cfg.socketAlpha})`;
        ctx.beginPath();
        ctx.ellipse(0, s * 0.06, (s * cfg.socketScale) / 2, (s * cfg.socketScale) / 2.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.drawImage(icon, -s / 2, -s / 2, s, s);
      ctx.restore();
    }

    this.paintArtEdges(ctx, col, row, x, y, size);
    return true;
  }

  /** Desenha a textura espelhada conforme a posicao no mundo. */
  private drawTileImage(
    ctx: CanvasRenderingContext2D,
    img: CanvasImageSource,
    x: number,
    y: number,
    size: number,
    col: number,
    row: number,
    allowFlipY: boolean
  ): void {
    const fx = hash2d(col, row, 17) > 0.5 ? -1 : 1;
    const fy = allowFlipY && hash2d(col, row, 37) > 0.5 ? -1 : 1;
    if (fx === 1 && fy === 1) {
      ctx.drawImage(img, x, y, size, size);
      return;
    }
    const h = size / 2;
    ctx.save();
    ctx.translate(x + h, y + h);
    ctx.scale(fx, fy);
    ctx.drawImage(img, -h, -h, size, size);
    ctx.restore();
  }

  /**
   * A sombra antiga entrava em TODO tile e desenhava uma grade escura no mundo.
   * Volume so faz sentido na borda da parede; dentro da rocha as faces se unem.
   */
  private paintArtEdges(
    ctx: CanvasRenderingContext2D,
    col: number,
    row: number,
    x: number,
    y: number,
    size: number
  ): void {
    const e = size * 0.16;
    if (!this.world.isSolid(col, row + 1)) {
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.fillRect(x, y + size - e, size, e);
    }
    if (!this.world.isSolid(col + 1, row)) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x + size - e * 0.6, y, e * 0.6, size);
    }
    if (!this.world.isSolid(col, row - 1)) {
      ctx.fillStyle = 'rgba(255,245,220,0.16)';
      ctx.fillRect(x, y, size, size * 0.1);
    }
  }

  private paintOre(
    ctx: CanvasRenderingContext2D,
    def: BlockDef,
    col: number,
    row: number,
    x: number,
    y: number,
    size: number
  ): void {
    const blobs = 3;
    for (let i = 0; i < blobs; i++) {
      const hx = hash2d(col + i * 31, row + i * 17, def.id + 5);
      const hy = hash2d(col - i * 13, row + i * 7, def.id + 99);
      const hr = hash2d(col + i, row - i, def.id + 777);
      const r = size * (0.09 + hr * 0.07);
      const cx = x + size * 0.2 + hx * size * 0.6;
      const cy = y + size * 0.2 + hy * size * 0.6;
      ctx.fillStyle = def.oreColor!;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      if (def.oreGlow) {
        ctx.fillStyle = def.oreGlow;
        ctx.beginPath();
        ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** Fundo das galerias (ar abaixo da superficie). */
  private paintBackwall(
    ctx: CanvasRenderingContext2D,
    col: number,
    row: number,
    x: number,
    y: number,
    size: number
  ): void {
    if (row <= this.world.surfaceRow + 1) return;
    const layerDef = layerAt(this.world.depthOfRow(row));
    const layer = layerDef.backwall;

    // Caverna natural ampla: em vez de parede rente, deixa ver o fundo de parallax.
    // E a diferenca entre "cavei um tunel" e "cheguei numa caverna".
    if (Assets.hasBackgroundArt) {
      const openness = this.opennessAt(col, row);
      if (openness >= 1) return;
      if (openness > 0) ctx.globalAlpha = 1 - openness;
    }

    const plain = this.useArt ? Assets.backwall(layer) : null;
    const art =
      plain && layerDef.tint
        ? Assets.tintedBlockVariants(
            ART.backwallKeys[layer],
            layerDef.tint,
            (layerDef.tintStrength ?? 0.7) * 0.7
          ) ?? plain
        : plain;
    if (art) {
      const v = Math.floor(hash2d(col, row, 557) * art.length) % art.length;
      this.drawTileImage(ctx, art[v], x, y, size, col + 7, row + 3, true);
      // Garantia de leitura: o fundo SEMPRE fica mais afundado que o bloco solido,
      // qualquer que seja a textura. Sem isso o jogador nao sabe onde pode andar.
      ctx.fillStyle = BACKWALL_DIM[layer];
      ctx.fillRect(x, y, size, size);
      if (this.world.isSolid(col, row - 1)) {
        ctx.fillStyle = 'rgba(0,0,0,0.34)';
        ctx.fillRect(x, y, size, size * 0.34);
      }
      ctx.globalAlpha = 1;
      return;
    }

    const base = layer === 0 ? '#3a2718' : layer === 1 ? '#2c2c33' : '#1e1e25';
    ctx.fillStyle = base;
    ctx.fillRect(x, y, size, size);
    const h = hash2d(col, row, 313);
    if (h > 0.72) {
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
    }
    // Sombra logo abaixo de um bloco solido: da sensacao de profundidade.
    if (this.world.isSolid(col, row - 1)) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(x, y, size, size * 0.3);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * 0 = colado num bloco solido (tunel), 1 = longe de tudo (caverna aberta).
   * Usado para decidir se o tile de ar mostra parede rente ou o fundo distante.
   */
  private opennessAt(col: number, row: number): number {
    const max = ART.openCaveRadius;
    for (let r = 1; r <= max; r++) {
      for (let dc = -r; dc <= r; dc++) {
        for (let dr = -r; dr <= r; dr++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== r) continue;
          if (this.world.isSolid(col + dc, row + dr)) return (r - 0.5) / max;
        }
      }
    }
    return 1;
  }

  /** Luzes dos lampioes de suporte, calculadas no mesmo passeio que os sprites. */
  ambientLights(): { x: number; y: number; radius: number; intensity: number }[] {
    return this.decorationLights;
  }

  private supportAt(col: number, row: number): boolean {
    const depth = this.world.depthOfRow(row);
    if (depth < 8 || depth > 180 || col % 9 !== 2 || hash2d(col, row, 4109) < 0.55) return false;
    for (let dy = -2; dy <= 0; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        if (this.world.getTile(col + dx, row + dy) !== BLOCK_IDS.AIR) return false;
      }
    }
    return this.world.isSolid(col, row + 1) && this.world.isSolid(col + 2, row + 1);
  }

  /**
   * Adornos ancorados no mapa, nunca sorteados por quadro. No mundo grande,
   * a posicao precisa sobreviver ao scroll e respeitar os tuneis minerados.
   */
  private drawDecorations(ctx: CanvasRenderingContext2D, c0: number, r0: number, c1: number, r1: number): void {
    this.decorationLights = [];
    if (!this.useArt) return;
    const roots = Assets.environment('roots');
    const stalactite = Assets.environment('stalactite');
    const support = Assets.environment('support');
    const lantern = Assets.environment('lantern');
    const ts = this.world.tileSize;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        if (support && this.supportAt(col, row)) {
          const x = col * ts;
          const y = (row - 2) * ts;
          ctx.globalAlpha = 0.7;
          ctx.drawImage(support, x, y, ts * 3, ts * 3);
          if (lantern) {
            ctx.globalAlpha = 0.85;
            ctx.drawImage(lantern, x + ts * 1.28, y + ts * 0.18, ts * 0.45, ts * 0.95);
            this.decorationLights.push({ x: x + ts * 1.5, y: y + ts * 0.65, radius: ts * 3.5, intensity: 0.68 });
          }
        }
        if (this.world.getTile(col, row) !== BLOCK_IDS.AIR ||
            !this.world.isSolid(col, row - 1) ||
            this.world.getTile(col, row + 1) !== BLOCK_IDS.AIR) continue;
        const depth = this.world.depthOfRow(row);
        if (roots && depth < 80 && this.world.getTile(col, row + 2) === BLOCK_IDS.AIR &&
            hash2d(col, row, 5113) > 0.88) {
          ctx.globalAlpha = 0.68;
          ctx.drawImage(roots, col * ts, row * ts - 3, ts, ts * 2.2);
        } else if (stalactite && depth >= 30 && hash2d(col, row, 6113) > 0.89) {
          ctx.globalAlpha = 0.55;
          ctx.drawImage(stalactite, col * ts - ts * 0.08, row * ts - 2, ts * 1.16, ts * 1.16);
        }
      }
    }
    ctx.restore();
  }

  /** Rachaduras: desenhadas fora do cache, pois mudam a cada golpe. */
  private drawCracks(
    ctx: CanvasRenderingContext2D,
    c0: number,
    r0: number,
    c1: number,
    r1: number
  ): void {
    const ts = this.world.tileSize;
    const sheet = Assets.cracks();
    if (sheet) {
      const f = ART.fx.crackFrame;
      const cols = ART.fx.crackCols;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = CONFIG.mining.crackOpacity;
      this.world.forEachDamaged(c0, r0, c1, r1, (col, row) => {
        const stage = this.world.crackStage(col, row);
        if (stage <= 0) return;
        const i = Math.min(stage, CONFIG.mining.crackStages) - 1;
        ctx.drawImage(
          sheet,
          (i % cols) * f,
          Math.floor(i / cols) * f,
          f,
          f,
          col * ts,
          row * ts,
          ts,
          ts
        );
      });
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineCap = 'round';
    this.world.forEachDamaged(c0, r0, c1, r1, (col, row) => {
      const stage = this.world.crackStage(col, row);
      if (stage <= 0) return;
      const x = col * ts;
      const y = row * ts;
      ctx.lineWidth = 1 + stage * 0.45;
      ctx.beginPath();
      for (let i = 0; i < stage; i++) {
        const h1 = hash2d(col + i * 7, row, 4242);
        const h2 = hash2d(col, row + i * 11, 8484);
        const sx = x + ts * (0.2 + h1 * 0.6);
        const sy = y + ts * (0.15 + h2 * 0.2);
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + ts * (h2 - 0.5) * 0.5, sy + ts * (0.25 + h1 * 0.4));
        ctx.lineTo(sx + ts * (h1 - 0.5) * 0.6, sy + ts * (0.55 + h2 * 0.35));
      }
      ctx.stroke();
    });
    ctx.restore();
  }

  private evictIfNeeded(): void {
    if (this.cache.size <= this.maxCached) return;
    const entries = Array.from(this.cache.entries()).sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    const toRemove = this.cache.size - this.maxCached;
    for (let i = 0; i < toRemove; i++) this.cache.delete(entries[i][0]);
  }

  /** Marca tudo para repintar mantendo os canvases (realocar canvas e o caro). */
  invalidateAll(): void {
    this.world.markAllDirty();
  }
}
