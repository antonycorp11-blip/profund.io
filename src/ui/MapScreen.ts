import { LAYERS, layerAt, metersToNextLayer } from '../data/layers';
import { clamp } from '../core/math';
import { drawMap, MARKER_STYLE } from './MapRenderer';
import { Haptics } from '../fx/Haptics';
import type { Exploration, MapMarker } from '../systems/Exploration';
import type { World } from '../world/World';

/**
 * Tela de mapa completa.
 *
 * O mundo inteiro e desenhado uma vez num canvas offscreen (so redesenha quando
 * a exploracao muda); arrastar e dar zoom sao transformacoes desse bitmap.
 * Assim da para navegar 120x260 tiles sem custo por frame.
 */
export class MapScreen {
  private wrap: HTMLDivElement;
  private view: HTMLCanvasElement;
  private viewCtx: CanvasRenderingContext2D;
  private buffer: HTMLCanvasElement;
  private bufferCtx: CanvasRenderingContext2D;
  private listEl: HTMLElement;
  private infoEl: HTMLElement;

  /**
   * Escala do buffer em pixels por tile.
   * Com 2 km de mundo, 4 px/tile geraria um canvas de 16 MB: cai para 2.
   */
  private readonly tileScale: number;
  private zoom = 1;
  private panX = 0;
  private panY = 0;
  private focus: { col: number; row: number } | null = null;
  private lastVersion = -1;

  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;

  constructor(
    parent: HTMLElement,
    private world: World,
    private exploration: Exploration,
    private playerTile: () => { col: number; row: number }
  ) {
    this.wrap = document.createElement('div');
    this.wrap.className = 'panel-wrap mapscreen';
    this.wrap.innerHTML = `
      <div class="map-screen">
        <header class="map-header">
          <h3>Mapa da Mina</h3>
          <div class="map-info"></div>
          <button class="icon-btn" data-center title="Centralizar no jogador">◎</button>
          <button class="icon-btn" data-close>✕</button>
        </header>
        <div class="map-body">
          <div class="map-viewport"><canvas></canvas></div>
          <aside class="map-list"></aside>
        </div>
      </div>`;
    parent.appendChild(this.wrap);

    this.view = this.wrap.querySelector('.map-viewport canvas') as HTMLCanvasElement;
    const vc = this.view.getContext('2d');
    if (!vc) throw new Error('canvas 2d indisponivel');
    this.viewCtx = vc;

    this.tileScale = world.height > 900 ? 2 : 4;
    this.buffer = document.createElement('canvas');
    this.buffer.width = world.width * this.tileScale;
    this.buffer.height = world.height * this.tileScale;
    const bc = this.buffer.getContext('2d');
    if (!bc) throw new Error('canvas 2d indisponivel');
    this.bufferCtx = bc;

    this.listEl = this.wrap.querySelector('.map-list') as HTMLElement;
    this.infoEl = this.wrap.querySelector('.map-info') as HTMLElement;

    (this.wrap.querySelector('[data-close]') as HTMLElement).addEventListener('click', () =>
      this.close()
    );
    (this.wrap.querySelector('[data-center]') as HTMLElement).addEventListener('click', () =>
      this.centerOnPlayer()
    );
    this.wrap.addEventListener('pointerdown', (e) => {
      if (e.target === this.wrap) this.close();
    });

    this.bindPan();
  }

  get isOpen(): boolean {
    return this.wrap.classList.contains('open');
  }

  open(): void {
    this.wrap.classList.add('open');
    this.resizeView();
    this.redrawBuffer(true);
    this.centerOnPlayer();
    this.renderList();
    this.renderInfo();
  }

  close(): void {
    this.wrap.classList.remove('open');
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  // --------------------------------------------------------------- desenho --

  private resizeView(): void {
    const rect = (this.view.parentElement as HTMLElement).getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.view.width = Math.max(1, Math.floor(rect.width * dpr));
    this.view.height = Math.max(1, Math.floor(rect.height * dpr));
    this.view.style.width = `${rect.width}px`;
    this.view.style.height = `${rect.height}px`;
    this.viewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewCtx.imageSmoothingEnabled = false;
  }

  /** Redesenha o mundo inteiro no buffer (custa, entao so quando muda). */
  private redrawBuffer(force = false): void {
    if (!force && this.exploration.version === this.lastVersion) return;
    this.lastVersion = this.exploration.version;
    const p = this.playerTile();
    drawMap(this.bufferCtx, this.world, this.exploration, {
      originCol: 0,
      originRow: 0,
      tilesX: this.world.width,
      tilesY: this.world.height,
      scale: this.tileScale,
      playerCol: p.col,
      playerRow: p.row,
      markers: this.exploration.visibleMarkers(),
      ruler: true,
      focus: this.focus,
    });
  }

  private paint(): void {
    const rect = (this.view.parentElement as HTMLElement).getBoundingClientRect();
    const ctx = this.viewCtx;
    ctx.fillStyle = '#07060a';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);
    ctx.drawImage(this.buffer, 0, 0);
    ctx.restore();
  }

  private centerOnPlayer(): void {
    const p = this.playerTile();
    this.focusOn(p.col, p.row, false);
  }

  private focusOn(col: number, row: number, mark = true): void {
    const rect = (this.view.parentElement as HTMLElement).getBoundingClientRect();
    this.focus = mark ? { col, row } : null;
    this.zoom = clamp(this.zoom, 0.6, 3);
    this.panX = rect.width / 2 - col * this.tileScale * this.zoom;
    this.panY = rect.height / 2 - row * this.tileScale * this.zoom;
    this.redrawBuffer(true);
    this.paint();
  }

  // ----------------------------------------------------------------- painel --

  private renderInfo(): void {
    const p = this.playerTile();
    const depth = this.world.depthOfRow(p.row);
    const layer = layerAt(depth);
    const toNext = metersToNextLayer(depth);
    const pct = Math.round(this.exploration.exploredRatio() * 100);
    this.infoEl.innerHTML = `
      <span><b>${Math.round(depth)} m</b> · ${layer.name}</span>
      ${toNext !== null ? `<span class="dim">proxima camada em ${Math.max(0, Math.round(toNext))} m</span>` : ''}
      <span class="dim">${pct}% explorado</span>`;
  }

  private renderList(): void {
    const markers = this.exploration
      .visibleMarkers()
      .slice()
      .sort((a, b) => a.row - b.row);

    const groups = new Map<string, MapMarker[]>();
    for (const m of markers) {
      const key = layerAt(this.world.depthOfRow(m.row)).name;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }

    let html = '<h5>Lugares conhecidos</h5>';
    if (markers.length === 0) {
      html += '<p class="map-empty">Nada marcado ainda. Explore a mina.</p>';
    }
    for (const [layerName, list] of groups) {
      html += `<div class="map-group">${layerName}</div>`;
      for (const m of list) {
        const style = MARKER_STYLE[m.kind] ?? MARKER_STYLE.custom;
        const depth = Math.round(this.world.depthOfRow(m.row));
        html += `
          <button class="map-item ${m.done ? 'done' : ''}" data-goto="${m.id}">
            <span class="map-glyph" style="background:${style.color}">${style.glyph}</span>
            <span class="map-item-text">
              <b>${m.label}</b>
              <small>${depth} m${m.done ? ' · concluido' : ''}</small>
            </span>
          </button>`;
      }
    }

    // Camadas ainda nao alcancadas dao um destino visivel.
    html += '<h5>Camadas</h5>';
    for (const l of LAYERS) {
      const reached = this.world.depthOfRow(this.playerTile().row) >= l.minDepth;
      html += `
        <div class="map-layer ${reached ? 'on' : ''} ${l.generated ? '' : 'future'}">
          <span class="dot" style="background:${l.color}"></span>
          <span><b>${l.name}</b><small>${l.minDepth} m${l.generated ? '' : ' · em breve'}</small></span>
        </div>`;
    }

    this.listEl.innerHTML = html;
    for (const btn of Array.from(this.listEl.querySelectorAll('[data-goto]'))) {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.goto!;
        const m = this.exploration.markers.find((x) => x.id === id);
        if (!m) return;
        Haptics.ui();
        this.focusOn(m.col, m.row);
      });
    }
  }

  // ------------------------------------------------------------ pan e zoom --

  private bindPan(): void {
    const vp = this.view.parentElement as HTMLElement;
    vp.addEventListener('pointerdown', (e) => {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) {
        this.dragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    });
    vp.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.pointers.size >= 2) {
        const [a, b] = Array.from(this.pointers.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinchDist > 0) {
          const prev = this.zoom;
          this.zoom = clamp(this.zoom * (dist / this.pinchDist), 0.5, 4);
          // Mantem o centro da pinca parado.
          const rect = vp.getBoundingClientRect();
          const cx = (a.x + b.x) / 2 - rect.left;
          const cy = (a.y + b.y) / 2 - rect.top;
          this.panX = cx - ((cx - this.panX) / prev) * this.zoom;
          this.panY = cy - ((cy - this.panY) / prev) * this.zoom;
          this.paint();
        }
        this.pinchDist = dist;
        return;
      }
      if (!this.dragging) return;
      this.panX += e.clientX - this.lastX;
      this.panY += e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.paint();
    });
    const end = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinchDist = 0;
      if (this.pointers.size === 0) this.dragging = false;
    };
    vp.addEventListener('pointerup', end);
    vp.addEventListener('pointercancel', end);
    vp.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = vp.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const prev = this.zoom;
        this.zoom = clamp(this.zoom - e.deltaY * 0.0015 * this.zoom, 0.5, 4);
        this.panX = cx - ((cx - this.panX) / prev) * this.zoom;
        this.panY = cy - ((cy - this.panY) / prev) * this.zoom;
        this.paint();
      },
      { passive: false }
    );
  }
}
