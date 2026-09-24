import { BLOCK_IDS } from '../data/blocks';
import { CONFIG } from '../data/config';
import { BLOCKIA_PLANTA } from '../data/cidades/blockia';
import type { Rng } from '../core/rng';
import type { World } from './World';
import { aplicarEstadoCidade, escavarCidade } from './cidade/escavar';
import { lugaresDosMoradores, portaRect } from './cidade/geometria';

/**
 * BLOCKIA — 600 m (BIBLIA.md 6.1).
 *
 * A cidade agora e uma PLANTA (`data/cidades/blockia.ts`) escavada e desenhada
 * pelo esqueleto generico de cidade (`world/cidade/`). Este arquivo so liga a
 * planta de Blockia ao resto do jogo, que conhece a cidade por estes nomes.
 */

export function carveBlockia(world: World, _rng: Rng, _surfaceRow: number): void {
  escavarCidade(world, BLOCKIA_PLANTA);
  // Estado de jogo novo: porta fechada, ponte quebrada, galeria alagada. O
  // Game reaplica com as flags do save ao carregar.
  aplicarEstadoCidade(world, BLOCKIA_PLANTA, () => false);
}

/** Onde cada morador de Blockia fica de pe, em tiles. */
export function posicionarMoradores(world: World): Map<string, { col: number; row: number }> {
  return lugaresDosMoradores(world, BLOCKIA_PLANTA);
}

export function portaBounds(surfaceRow: number): { col0: number; col1: number; row0: number; row1: number } {
  return portaRect(BLOCKIA_PLANTA, surfaceRow);
}

/** Abre a porta de Blockia: os tiles da passagem viram ar. */
export function abrirPortaBlockia(world: World, surfaceRow: number): void {
  const { col0, col1, row0, row1 } = portaBounds(surfaceRow);
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) world.setTileRaw(col, row, BLOCK_IDS.AIR);
  }
  world.markAllDirty();
}

/**
 * A galeria das Galerias Livres: liga o poco principal a porta de Blockia.
 *
 * Horizontal e longa de proposito. Depois de 600 m descendo, andar de lado por
 * 60 metros e o sinal fisico de que a mina acabou e comecou outra coisa.
 */
export function carveCityCorridor(world: World, rng: Rng, surfaceRow: number): void {
  const cfg = CONFIG.blockia;
  const row = surfaceRow + cfg.corridorDepth;
  const de = CONFIG.base.centerCol + CONFIG.base.layout.shaft;
  for (let col = de; col <= cfg.gateCol; col++) {
    // Ondula um pouco: um corredor reto de 60 tiles e um cano. Mas ondula com
    // degrau de 1 tile, que o passo do jogador vence andando — e volta ao
    // nivel exato da porta nos ultimos metros.
    const perto = cfg.gateCol - col < 8;
    const off = perto ? 0 : Math.round(Math.sin((col - de) * 0.11) * 2);
    for (let r = row + off - 3; r <= row + off; r++) world.setTileRaw(col, r, BLOCK_IDS.AIR);
    world.setTileRaw(col, row + off + 1, BLOCK_IDS.PLANK);
    if ((col - de) % 9 === 0 && rng.next() < 0.8) {
      world.setTileRaw(col, row + off - 4, BLOCK_IDS.PLANK);
    }
  }
}
