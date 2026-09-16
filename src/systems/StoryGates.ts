import { BLOCK_IDS, blockByKey } from '../data/blocks';
import { Events } from '../core/events';
import { STORY_GATES, storyGateRows } from '../data/storyGates';
import { layerAt } from '../data/layers';
import type { World } from '../world/World';

/**
 * Os selos de historia, abertos pelo que o jogador ja viu.
 *
 * Nao guarda estado proprio de proposito: um selo esta aberto quando a flag
 * dele existe, e ponto. O mundo salvo ja carrega os tiles trocados, entao
 * carregar um save nao precisa refazer nada — `sync` so tem trabalho quando a
 * flag acabou de aparecer.
 */
export class StoryGates {
  private abertos = new Set<string>();

  constructor(
    private world: World,
    private hasFlag: (id: string) => boolean
  ) {}

  isOpen(id: string): boolean {
    return this.abertos.has(id);
  }

  /** Abre o que ja pode abrir. Barato o bastante para rodar a cada flag nova. */
  sync(silencioso = false): void {
    for (const g of STORY_GATES) {
      if (this.abertos.has(g.id)) continue;
      if (!this.hasFlag(g.requires)) continue;
      this.abertos.add(g.id);
      const { row0, row1 } = storyGateRows(this.world.surfaceRow, g);
      // Vira a rocha da propria camada: a passagem deixa de ser impossivel e
      // volta a ser trabalho de picareta.
      const camada = layerAt(this.world.depthOfRow(row1));
      const rocha = blockByKey(camada.rockKey)?.id ?? BLOCK_IDS.STONE;
      this.world.dissolveGateBand(row0, row1, rocha);
      if (!silencioso) Events.emit('storygate:opened', { id: g.id });
    }
  }
}
