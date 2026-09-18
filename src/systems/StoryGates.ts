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
    private hasFlag: (id: string) => boolean,
    /** Recorde de profundidade do jogador, em metros. Ver `jaPassouPor`. */
    private maisFundo: () => number
  ) {}

  /**
   * O jogador JA ESTEVE abaixo deste selo?
   *
   * Um selo so se atravessa abrindo — nao ha como estar mais fundo que ele sem
   * te-lo aberto alguma vez. Entao recorde de profundidade abaixo da faixa e
   * prova de que a passagem ja foi conquistada, mesmo que a flag ou a posicao
   * do selo tenham mudado depois.
   *
   * Isto existe por um estrago meu: eu remapeei as profundidades do jogo e os
   * selos MUDARAM DE LUGAR. Quem ja tinha aberto o selo aos 32 m encontrou uma
   * faixa nova selada aos 62, numa regiao que ele havia limpado — o jogo pedia
   * de volta uma prova que ele ja tinha dado, e a mensagem dizia que "algo
   * ficou para tras" num lugar por onde ele ja tinha passado.
   *
   * A regra vale alem do meu erro: selo que renasce atras do jogador e sempre
   * bug, venha de remapeamento, de save antigo ou de ordem inesperada.
   */
  private jaPassouPor(depth: number): boolean {
    return this.maisFundo() > depth;
  }

  isOpen(id: string): boolean {
    return this.abertos.has(id);
  }

  /** Abre o que ja pode abrir. Barato o bastante para rodar a cada flag nova. */
  sync(silencioso = false): void {
    for (const g of STORY_GATES) {
      if (this.abertos.has(g.id)) continue;
      if (!this.hasFlag(g.requires) && !this.jaPassouPor(g.depth)) continue;
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
