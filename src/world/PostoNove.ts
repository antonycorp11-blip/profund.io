import { BLOCK_IDS, blockByKey } from '../data/blocks';
import { POSTO_NOVE } from '../data/outpost';
import type { World } from './World';

/**
 * Escava o Posto Nove: uma camara com piso, teto, luz e trilho.
 *
 * Bem menor e mais pobre que Blockia de proposito — e a diferenca entre "tem
 * gente aqui" e "tem uma CIDADE aqui". Se este lugar impressionasse, a chegada
 * em Blockia perderia o efeito.
 */
export function carvePostoNove(world: World, surfaceRow: number): void {
  const brick = blockByKey('ruin_brick')?.id ?? BLOCK_IDS.STONE;
  const row = surfaceRow + POSTO_NOVE.depth;
  const c0 = POSTO_NOVE.col;
  const c1 = c0 + POSTO_NOVE.largura;

  for (let col = c0; col <= c1; col++) {
    for (let r = row - POSTO_NOVE.altura; r <= row; r++) {
      world.setTileRaw(col, r, BLOCK_IDS.AIR);
    }
    // Piso de tabua: a marca de que alguem mora, e nao so passou.
    world.setTileRaw(col, row + 1, BLOCK_IDS.PLANK);
    world.setTileRaw(col, row + 2, brick);
  }

  // Duas casinhas encostadas nas pontas, abertas embaixo (ver Blockia: nada
  // pode pousar solido onde o corpo do jogador anda).
  for (const casa of [c0 + 2, c1 - 8]) {
    for (let col = casa; col < casa + 6; col++) {
      world.setTileRaw(col, row - 5, BLOCK_IDS.PLANK);
      world.setTileRaw(col, row - 4, col === casa || col === casa + 5 ? brick : BLOCK_IDS.AIR);
      world.setTileRaw(col, row - 3, col === casa || col === casa + 5 ? brick : BLOCK_IDS.AIR);
    }
    world.setTileRaw(casa + 2, row - 4, BLOCK_IDS.LAMP);
  }

  // Lampioes no teto: pouca luz, bem espacada. E um posto, nao uma praca.
  for (let col = c0 + 5; col <= c1 - 5; col += 9) {
    world.setTileRaw(col, row - POSTO_NOVE.altura + 1, BLOCK_IDS.LAMP);
  }

  // O trilho consertado, apoiado no piso.
  for (let col = c0 + 3; col <= c1 - 3; col++) {
    if (col % 3 === 0) world.setTileRaw(col, row, BLOCK_IDS.PLANK);
  }
}
