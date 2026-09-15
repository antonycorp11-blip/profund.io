import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import type { Attributes } from '../systems/Attributes';
import type { BlockDef } from '../data/blocks';
import type { World } from '../world/World';

/**
 * Broca: abre um tunel na direcao da mira.
 *
 * O Choque explora um veio; a Broca abre caminho. Sao as duas coisas que o
 * jogador quer fazer com pressa, e cada uma tem uma habilidade.
 *
 * O tunel e um retangulo a frente: `drillDepth` blocos no sentido da mira por
 * `drillHeight` de largura no sentido perpendicular. Fura na horizontal, na
 * vertical e na diagonal — a mira decide.
 */
export class DrillTool {
  constructor(
    private world: World,
    private attrs: Attributes
  ) {}

  /**
   * @param onBreak recebe o bloco COMO ERA antes de quebrar
   * @returns quantos blocos foram atingidos
   */
  fire(
    col: number,
    row: number,
    dirX: number,
    dirY: number,
    damage: number,
    toolTier: number,
    onBreak: (col: number, row: number, def: BlockDef) => void
  ): number {
    const depth = Math.max(1, Math.round(this.attrs.get('drillDepth')));
    const height = Math.max(1, Math.round(this.attrs.get('drillHeight')));
    const power = Math.max(0.2, this.attrs.get('drillPower'));

    // Eixo da broca: o maior componente da mira manda. Sem isso uma mira quase
    // horizontal abriria um tunel torto e o jogador nao entenderia a forma.
    const horizontal = Math.abs(dirX) >= Math.abs(dirY);
    const stepC = horizontal ? Math.sign(dirX) || 1 : 0;
    const stepR = horizontal ? 0 : Math.sign(dirY) || 1;
    // Largura cresce perpendicular ao avanco.
    const sideC = horizontal ? 0 : 1;
    const sideR = horizontal ? 1 : 0;
    const half = Math.floor(height / 2);

    let hits = 0;
    for (let d = 0; d < depth; d++) {
      for (let s = -half; s <= half; s++) {
        const c = col + stepC * d + sideC * s;
        const r = row + stepR * d + sideR * s;
        if (!this.world.inBounds(c, r)) continue;
        const def = this.world.getDef(c, r);
        if (!def.solid || def.hp <= 0) continue;
        if (
          def.tags.includes('indestructible') ||
          def.tags.includes('quest') ||
          def.tags.includes('boss')
        ) {
          continue;
        }
        const res = this.world.applyDamage(c, r, damage * power, toolTier);
        hits++;
        if (res.broken) onBreak(c, r, def);
      }
    }

    if (hits > 0) {
      const ts = this.world.tileSize;
      Events.emit('skill:drill', {
        worldX: col * ts + ts / 2,
        worldY: row * ts + ts / 2,
        hits,
        dirX: stepC,
        dirY: stepR,
      });
    }
    void CONFIG;
    return hits;
  }
}
