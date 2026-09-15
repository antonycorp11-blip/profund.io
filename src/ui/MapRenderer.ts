import { BLOCK_IDS, blockDef } from '../data/blocks';
import { LAYERS, layerAt } from '../data/layers';
import { RESOURCES, type ResourceId } from '../data/resources';
import type { Exploration, MapMarker } from '../systems/Exploration';
import type { World } from '../world/World';

export interface MapDrawOptions {
  originCol: number;
  originRow: number;
  tilesX: number;
  tilesY: number;
  /** Pixels por tile. */
  scale: number;
  playerCol: number;
  playerRow: number;
  markers?: MapMarker[];
  /** Desenha a regua de profundidade a esquerda. */
  ruler?: boolean;
  /** Ponto destacado (item selecionado na lista). */
  focus?: { col: number; row: number } | null;
}

/** Cor de cada marcador — cor nunca e a unica informacao: cada um tem forma propria. */
export const MARKER_STYLE: Record<string, { color: string; glyph: string }> = {
  base: { color: '#ffc453', glyph: '⌂' },
  clue: { color: '#cdb0ff', glyph: '✦' },
  npc: { color: '#7ddc7d', glyph: '!' },
  layer: { color: '#8fb8d8', glyph: '—' },
  boss: { color: '#ff6b5a', glyph: '☠' },
  secret: { color: '#ffd35c', glyph: '?' },
  custom: { color: '#ffffff', glyph: '•' },
};

/**
 * Desenha o mundo conhecido num canvas.
 * Usado pelo minimapa e pela tela de mapa — mesma leitura nos dois lugares.
 */
export function drawMap(
  ctx: CanvasRenderingContext2D,
  world: World,
  exploration: Exploration,
  o: MapDrawOptions
): void {
  const s = o.scale;
  const w = o.tilesX * s;
  const h = o.tilesY * s;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#09070c';
  ctx.fillRect(0, 0, w, h);

  for (let ty = 0; ty < o.tilesY; ty++) {
    const row = o.originRow + ty;
    if (row < 0 || row >= world.height) continue;
    const depth = world.depthOfRow(row);
    const layer = layerAt(depth);

    for (let tx = 0; tx < o.tilesX; tx++) {
      const col = o.originCol + tx;
      if (col < 0 || col >= world.width) continue;
      if (!exploration.isExplored(col, row)) continue;

      const id = world.getTile(col, row);
      const x = tx * s;
      const y = ty * s;

      if (id === BLOCK_IDS.AIR) {
        // Tunel/caverna: onde da para andar.
        ctx.fillStyle = row < world.surfaceRow ? '#1a2430' : layer.tunnelColor;
        ctx.fillRect(x, y, s, s);
        continue;
      }

      const def = blockDef(id);
      if (def.drop && def.tags.includes('ore')) {
        // Veio visto fica destacado: e a informacao que o jogador quer do mapa.
        ctx.fillStyle = RESOURCES[def.drop as ResourceId].color;
        ctx.fillRect(x, y, s, s);
        if (s >= 3 && def.tags.includes('rareOre')) {
          ctx.fillStyle = RESOURCES[def.drop as ResourceId].accent;
          ctx.fillRect(x, y, Math.max(1, s * 0.5), Math.max(1, s * 0.5));
        }
        continue;
      }

      ctx.fillStyle = def.indestructible ? '#15151a' : layer.color;
      ctx.fillRect(x, y, s, s);
    }
  }

  if (o.ruler) drawRuler(ctx, world, o, h);
  if (o.markers) drawMarkers(ctx, o);

  // Foco (lugar escolhido na lista).
  if (o.focus) {
    const fx = (o.focus.col - o.originCol) * s;
    const fy = (o.focus.row - o.originRow) * s;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx, fy, Math.max(7, s * 3), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Jogador por ultimo, sempre por cima.
  const px = (o.playerCol - o.originCol) * s + s / 2;
  const py = (o.playerRow - o.originRow) * s + s / 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px, py, Math.max(2.2, s * 0.9), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawMarkers(ctx: CanvasRenderingContext2D, o: MapDrawOptions): void {
  const s = o.scale;
  for (const m of o.markers ?? []) {
    const x = (m.col - o.originCol) * s + s / 2;
    const y = (m.row - o.originRow) * s + s / 2;
    const style = MARKER_STYLE[m.kind] ?? MARKER_STYLE.custom;
    const r = Math.max(3.5, s * 1.6);

    ctx.globalAlpha = m.done ? 0.55 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = style.color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    if (s >= 3) {
      ctx.fillStyle = '#12100e';
      ctx.font = `bold ${Math.round(r * 1.5)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.glyph, x, y + 0.5);
    }
    ctx.globalAlpha = 1;
  }
}

/** Regua de profundidade com as faixas de cada camada. */
function drawRuler(
  ctx: CanvasRenderingContext2D,
  world: World,
  o: MapDrawOptions,
  h: number
): void {
  const s = o.scale;
  const barW = 22;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, barW, h);

  for (const layer of LAYERS) {
    const row = world.surfaceRow + layer.minDepth;
    const y = (row - o.originRow) * s;
    if (y < -20 || y > h + 20) continue;

    ctx.fillStyle = layer.generated ? layer.color : 'rgba(255,255,255,0.12)';
    ctx.fillRect(0, y, barW, 2);
    ctx.fillStyle = layer.generated ? '#e6dccb' : 'rgba(230,220,203,0.45)';
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${layer.minDepth}m`, 2, y + 3);
  }
}
