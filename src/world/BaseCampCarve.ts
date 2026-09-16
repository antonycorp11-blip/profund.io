import { BLOCK_IDS, blockByKey } from '../data/blocks';
import { BASE_CAMPS } from '../data/basecamp';
import type { World } from './World';

/**
 * Escava a camara de cada base de extracao.
 *
 * O JOGO escolhe onde: o jogador nao posiciona nada. A camara ja vem com piso
 * plano, teto, luz e os encaixes na ordem certa. Deixar o jogador montar
 * esteira tile a tile numa tela de celular e receita de base torta que nao
 * liga em nada — e a cadeia so tem graca quando ela conecta.
 */
export function carveBaseCamps(world: World, surfaceRow: number): void {
  const brick = blockByKey('ruin_brick')?.id ?? BLOCK_IDS.STONE;
  for (const base of BASE_CAMPS) {
    const row = surfaceRow + base.depth;
    for (let c = base.col; c <= base.col + base.largura; c++) {
      for (let r = row - base.altura; r <= row; r++) {
        if (world.getTile(c, r) === BLOCK_IDS.SEAL) continue;
        world.setTileRaw(c, r, BLOCK_IDS.AIR);
      }
      // Piso de tabua: o chao onde as estruturas se apoiam.
      world.setTileRaw(c, row + 1, BLOCK_IDS.PLANK);
      world.setTileRaw(c, row + 2, brick);
    }
    // Um pouco de luz de teto. O poste que o jogador constroi acrescenta.
    for (let c = base.col + 4; c <= base.col + base.largura - 4; c += 11) {
      world.setTileRaw(c, row - base.altura + 1, BLOCK_IDS.LAMP);
    }
  }
}
