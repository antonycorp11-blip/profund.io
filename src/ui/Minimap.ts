import { CONFIG } from '../data/config';
import { drawMap } from './MapRenderer';
import { layerAt, metersToNextLayer } from '../data/layers';
import type { Exploration } from '../systems/Exploration';
import type { World } from '../world/World';

/**
 * Minimapa da HUD.
 * Redesenha so quando o jogador troca de tile ou o mapa muda — nao por frame.
 */
export class Minimap {
  private root: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private label: HTMLElement;
  private lastCol = -999;
  private lastRow = -999;
  private lastVersion = -1;
  private readonly tilesX = CONFIG.map.minimapTilesX;
  private readonly tilesY = CONFIG.map.minimapTilesY;
  private readonly scale = CONFIG.map.minimapScale;

  constructor(
    parent: HTMLElement,
    private world: World,
    private exploration: Exploration,
    private onOpen: () => void
  ) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.root = document.createElement('div');
    this.root.className = 'minimap';
    this.root.innerHTML = `
      <canvas></canvas>
      <div class="minimap-label"></div>
      <div class="minimap-hint">mapa</div>`;
    parent.appendChild(this.root);

    this.canvas = this.root.querySelector('canvas') as HTMLCanvasElement;
    this.canvas.width = this.tilesX * this.scale * dpr;
    this.canvas.height = this.tilesY * this.scale * dpr;
    this.canvas.style.width = `${this.tilesX * this.scale}px`;
    this.canvas.style.height = `${this.tilesY * this.scale}px`;
    const c = this.canvas.getContext('2d');
    if (!c) throw new Error('canvas 2d indisponivel');
    c.scale(dpr, dpr);
    c.imageSmoothingEnabled = false;
    this.ctx = c;

    this.label = this.root.querySelector('.minimap-label') as HTMLElement;
    this.root.addEventListener('click', () => this.onOpen());
  }

  setVisible(v: boolean): void {
    this.root.classList.toggle('hidden', !v);
  }

  update(playerX: number, playerY: number): void {
    const ts = this.world.tileSize;
    const col = Math.floor(playerX / ts);
    const row = Math.floor(playerY / ts);
    if (col === this.lastCol && row === this.lastRow && this.exploration.version === this.lastVersion) {
      return;
    }
    this.lastCol = col;
    this.lastRow = row;
    this.lastVersion = this.exploration.version;

    drawMap(this.ctx, this.world, this.exploration, {
      originCol: col - Math.floor(this.tilesX / 2),
      originRow: row - Math.floor(this.tilesY / 2),
      tilesX: this.tilesX,
      tilesY: this.tilesY,
      scale: this.scale,
      playerCol: col,
      playerRow: row,
      markers: this.exploration.visibleMarkers(),
    });

    const depth = this.world.depthOfRow(row);
    const layer = layerAt(depth);
    const toNext = metersToNextLayer(depth);
    this.label.innerHTML =
      `<b>${layer.name}</b>` +
      (toNext !== null ? `<span>proxima em ${Math.max(0, Math.round(toNext))} m</span>` : '');
  }
}
