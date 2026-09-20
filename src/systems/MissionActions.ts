import { CONFIG } from '../data/config';
import { MISSION_ACTIONS, type MissionActionDef } from '../data/missionActions';
import { Events } from '../core/events';
import type { BaseStock } from './BaseStock';

/** Acoes unicas de cenario. Estado e custo vivem nas flags e no estoque. */
export class MissionActions {
  constructor(
    private stock: BaseStock,
    private hasFlag: (id: string) => boolean,
    private setFlag: (id: string) => void,
    private onDone: () => void
  ) {}

  list(): MissionActionDef[] { return MISSION_ACTIONS; }

  prompt(def: MissionActionDef): string | null {
    if (this.hasFlag(def.completionFlag)) return null;
    if (!def.requiresFlags.every((flag) => this.hasFlag(flag))) return null;
    return def.prompt;
  }

  interact(def: MissionActionDef): void {
    if (!this.prompt(def)) return;
    const missing = Object.entries(def.resourceCost ?? {})
      .filter(([id, qty]) => this.stock.count(id as never) < (qty ?? 0))
      .map(([id, qty]) => `${qty} ${id}`);
    if (missing.length || !this.stock.canAffordMoney(def.moneyCost)) {
      if (!this.stock.canAffordMoney(def.moneyCost) && def.moneyCost) missing.push(`${def.moneyCost} moedas`);
      Events.emit('ui:toast', { text: `Falta: ${missing.join(', ')}`, tone: 'warn' });
      return;
    }
    if (!this.stock.spend(def.resourceCost ?? {}) || !this.stock.spendMoney(def.moneyCost)) return;
    this.setFlag(def.completionFlag);
    Events.emit('mission:action', { id: def.id, flag: def.completionFlag });
    this.onDone();
  }

  worldPosition(def: MissionActionDef): { x: number; y: number; radius: number } {
    const ts = CONFIG.tileSize;
    return { x: (def.col + 0.5) * ts, y: (def.row + 0.5) * ts, radius: def.radius ?? CONFIG.player.interactRadius };
  }
}
