import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import type { Attributes } from './Attributes';
import type { World } from '../world/World';

export type MarkerKind = 'base' | 'clue' | 'npc' | 'layer' | 'boss' | 'secret' | 'custom';

export interface MapMarker {
  id: string;
  kind: MarkerKind;
  /** Em tiles. */
  col: number;
  row: number;
  label: string;
  /** Marcadores de historia ficam visiveis mesmo antes de explorar a area. */
  alwaysVisible: boolean;
  discovered: boolean;
  /** Ja foi resolvido? (pista lida, NPC resgatado) */
  done: boolean;
}

export interface ExplorationSave {
  /** Bitset dos tiles explorados, em base64. */
  tiles: string;
  markers: Record<string, { discovered: boolean; done: boolean }>;
}

/**
 * Memoria do mapa: o que o jogador ja viu e os lugares que importam.
 *
 * Guardado como 1 bit por tile (o mundo inteiro cabe em ~4 KB), o que permite
 * salvar o mapa completo sem inchar o save.
 */
export class Exploration {
  private bits: Uint8Array;
  private readonly width: number;
  private readonly height: number;
  private lastCol = -999;
  private lastRow = -999;
  /** Sobe a cada revelacao, para o minimapa saber quando redesenhar. */
  version = 0;

  readonly markers: MapMarker[] = [];

  constructor(private world: World, private attrs: Attributes) {
    this.width = world.width;
    this.height = world.height;
    this.bits = new Uint8Array(Math.ceil((this.width * this.height) / 8));
  }

  // ----------------------------------------------------------- exploracao --

  isExplored(col: number, row: number): boolean {
    if (col < 0 || row < 0 || col >= this.width || row >= this.height) return false;
    const i = row * this.width + col;
    return (this.bits[i >> 3] & (1 << (i & 7))) !== 0;
  }

  private mark(col: number, row: number): boolean {
    if (col < 0 || row < 0 || col >= this.width || row >= this.height) return false;
    const i = row * this.width + col;
    const byte = i >> 3;
    const bit = 1 << (i & 7);
    if (this.bits[byte] & bit) return false;
    this.bits[byte] |= bit;
    return true;
  }

  /**
   * Revela ao redor do jogador. So roda quando ele troca de tile —
   * varrer um circulo a cada frame seria desperdicio.
   */
  update(playerX: number, playerY: number): void {
    const ts = this.world.tileSize;
    const col = Math.floor(playerX / ts);
    const row = Math.floor(playerY / ts);
    if (col === this.lastCol && row === this.lastRow) return;
    this.lastCol = col;
    this.lastRow = row;

    const radius = Math.round(
      CONFIG.map.baseRevealTiles + this.attrs.get('mapRevealRadius') / ts
    );
    const r2 = radius * radius;
    let changed = false;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dc * dc + dr * dr > r2) continue;
        if (this.mark(col + dc, row + dr)) changed = true;
      }
    }
    if (changed) this.version++;

    this.checkMarkerDiscovery(col, row);
  }

  /** Revela uma area especifica (usado ao entrar numa sala de historia). */
  revealArea(col: number, row: number, radius: number): void {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dc * dc + dr * dr > radius * radius) continue;
        this.mark(col + dc, row + dr);
      }
    }
    this.version++;
  }

  // ------------------------------------------------------------ marcadores --

  addMarker(marker: Omit<MapMarker, 'discovered' | 'done'> & Partial<MapMarker>): void {
    const existing = this.markers.find((m) => m.id === marker.id);
    if (existing) return;
    this.markers.push({
      discovered: marker.alwaysVisible ?? false,
      done: false,
      ...marker,
    } as MapMarker);
  }

  setMarkerDone(id: string): void {
    const m = this.markers.find((x) => x.id === id);
    if (!m) return;
    m.done = true;
    m.discovered = true;
    this.version++;
  }

  discoverMarker(id: string): void {
    const m = this.markers.find((x) => x.id === id);
    if (!m || m.discovered) return;
    m.discovered = true;
    this.version++;
    Events.emit('map:discovered', { id, label: m.label });
  }

  /** Marcador vira visivel quando o jogador chega perto o bastante. */
  private checkMarkerDiscovery(col: number, row: number): void {
    const range = CONFIG.map.markerDiscoverTiles;
    for (const m of this.markers) {
      if (m.discovered) continue;
      const dc = m.col - col;
      const dr = m.row - row;
      if (dc * dc + dr * dr <= range * range) this.discoverMarker(m.id);
    }
  }

  visibleMarkers(): MapMarker[] {
    return this.markers.filter((m) => m.discovered || m.alwaysVisible);
  }

  // ------------------------------------------------------------------ save --

  toJSON(): ExplorationSave {
    const markers: ExplorationSave['markers'] = {};
    for (const m of this.markers) markers[m.id] = { discovered: m.discovered, done: m.done };
    return { tiles: bytesToBase64(this.bits), markers };
  }

  fromJSON(data: ExplorationSave | undefined): void {
    if (!data) return;
    const bytes = base64ToBytes(data.tiles ?? '');
    if (bytes.length === this.bits.length) this.bits = bytes;
    for (const m of this.markers) {
      const saved = data.markers?.[m.id];
      if (!saved) continue;
      m.discovered = saved.discovered;
      m.done = saved.done;
    }
    this.version++;
  }

  /** Percentual do mundo ja explorado (estatistica da tela de mapa). */
  exploredRatio(): number {
    let bits = 0;
    for (const b of this.bits) bits += POPCOUNT[b];
    return bits / (this.width * this.height);
  }
}

const POPCOUNT = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  POPCOUNT[i] = (i & 1) + POPCOUNT[i >> 1];
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  if (!b64) return new Uint8Array(0);
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return new Uint8Array(0);
  }
}
