import { Events } from '../core/events';
import { COLLAPSE_ZONES, type CollapseZone } from '../data/collapses';

interface State { breaks: number; warning: number; cooldown: number; spent: boolean }
/** Desabamentos fixos: sempre avisam antes e nunca escolhem posicao fora da zona. */
export class CollapseSystem {
  private states = new Map<string, State>();
  constructor(private onImpact: (zone: CollapseZone) => void, private onDone: (flag: string) => void, zones = COLLAPSE_ZONES) {
    for (const zone of zones) this.states.set(zone.id, { breaks: 0, warning: 0, cooldown: 0, spent: false });
    Events.on('block:break', (p) => this.break(p.col, p.row, zones));
  }
  private break(col: number, row: number, zones: CollapseZone[]): void {
    for (const zone of zones) {
      const state = this.states.get(zone.id)!;
      if (state.spent || state.warning > 0 || state.cooldown > 0) continue;
      const r = zone.rect;
      if (col < r.col0 || col > r.col1 || row < r.row0 || row > r.row1) continue;
      state.breaks++;
      if (state.breaks < zone.minBreaks || Math.random() > zone.riskPerBreak) continue;
      state.warning = zone.warningSec;
      Events.emit('collapse:warning', { id: zone.id, col, row, warningSec: zone.warningSec });
    }
  }
  update(dt: number, zones = COLLAPSE_ZONES): void {
    for (const zone of zones) {
      const state = this.states.get(zone.id)!;
      state.cooldown = Math.max(0, state.cooldown - dt);
      if (state.warning <= 0) continue;
      state.warning -= dt;
      if (state.warning > 0) continue;
      state.cooldown = zone.cooldownSec; state.breaks = 0; state.spent = !!zone.oneShot;
      this.onImpact(zone); if (zone.completionFlag) this.onDone(zone.completionFlag);
      Events.emit('collapse:impact', { id: zone.id, col: zone.rect.col0, row: zone.rect.row0 });
    }
  }
}
