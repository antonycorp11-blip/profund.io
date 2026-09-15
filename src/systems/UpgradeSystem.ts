import { Events } from '../core/events';
import { nextTool } from '../data/tools';
import type { PlayerStats } from '../player/PlayerStats';
import type { BaseStock } from './BaseStock';

/** Oficina: compra do proximo nivel de picareta usando o estoque da base. */
export class UpgradeSystem {
  constructor(private stats: PlayerStats, private stock: BaseStock) {}

  get next() {
    return nextTool(this.stats.toolIndex);
  }

  canAfford(): boolean {
    const n = this.next;
    return !!n && this.stock.canAfford(n.cost);
  }

  tryUpgrade(): boolean {
    const n = this.next;
    if (!n) {
      Events.emit('ui:toast', { text: 'Picareta ja esta no maximo.', tone: 'warn' });
      return false;
    }
    if (!this.stock.spend(n.cost)) {
      Events.emit('ui:toast', { text: 'Recursos insuficientes no estoque.', tone: 'warn' });
      return false;
    }
    this.stats.setTool(n.index);
    Events.emit('tool:upgraded', { index: n.index, name: n.name });
    Events.emit('ui:toast', { text: `Nova ferramenta: ${n.name}`, tone: 'good' });
    return true;
  }
}
