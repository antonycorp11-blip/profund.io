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
  private helperTick = 0;
  private readonly tilesX = CONFIG.map.minimapTilesX;
  private readonly tilesY = CONFIG.map.minimapTilesY;
  private readonly scale = CONFIG.map.minimapScale;

  constructor(
    parent: HTMLElement,
    private world: World,
    private exploration: Exploration,
    private onOpen: () => void,
    /** Copias e toupeiras, para aparecerem no minimapa. */
    private helpers: () => { x: number; y: number; tint: string }[] = () => []
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

    // So o selo abre o mapa. O resto do minimapa e "atravessavel": ele fica
    // por cima da area do joystick, e roubar esse toque tornaria o jogo
    // injogavel no celular.
    const hint = this.root.querySelector('.minimap-hint') as HTMLElement;
    hint.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.onOpen();
    });
    // Enquanto o dedo estiver no selo, o mapa fica opaco para dar uma olhada.
    hint.addEventListener('pointerenter', () => this.root.classList.add('peek'));
    hint.addEventListener('pointerleave', () => this.root.classList.remove('peek'));
  }

  setVisible(v: boolean): void {
    this.root.classList.toggle('hidden', !v);
  }

  update(playerX: number, playerY: number): void {
    const ts = this.world.tileSize;
    const col = Math.floor(playerX / ts);
    const row = Math.floor(playerY / ts);
    // Ajudantes se mexem sozinhos: o minimapa precisa redesenhar mesmo com o
    // jogador parado, senao eles congelam na tela.
    const ajudantes = this.helpers();
    const assinatura = ajudantes.length;
    if (
      col === this.lastCol &&
      row === this.lastRow &&
      this.exploration.version === this.lastVersion &&
      this.helperTick > 0
    ) {
      this.helperTick--;
      return;
    }
    this.helperTick = ajudantes.length > 0 ? 6 : 30;
    void assinatura;
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
      helpers: ajudantes.map((h) => ({
        col: Math.floor(h.x / ts),
        row: Math.floor(h.y / ts),
        tint: h.tint,
      })),
    });

    const depth = this.world.depthOfRow(row);
    const layer = layerAt(depth);
    const toNext = metersToNextLayer(depth);
    // A profundidade mora aqui: e a mesma informacao que o mapa ja conta, e um
    // card so no lugar de dois deixa a coluna respirar.
    // Profundidade E coluna.
    //
    // Com 240 colunas, "236 m" nao localiza nada: a base do Cristal esta na
    // coluna 30 e Blockia na 180, na mesma profundidade de muita coisa. Sem a
    // coluna o jogador nao tem como saber se precisa andar para a esquerda ou
    // para a direita, e as missoes citam coluna.
    this.label.innerHTML =
      `<b>${layer.name}</b>` +
      `<strong>${Math.max(0, Math.round(depth))}<small>m</small></strong>` +
      `<span class="mini-col">col <b>${col}</b></span>` +
      (toNext !== null
        ? `<span>proxima em ${Math.max(0, Math.round(toNext))} m</span>`
        : '<span>fundo da mina</span>');
  }
}
