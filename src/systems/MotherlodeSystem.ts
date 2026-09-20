import { BLOCK_IDS } from '../data/blocks';
import { MOTHERLODES, type MotherlodeDef } from '../data/motherlodes';
import { Events } from '../core/events';
import type { World } from '../world/World';
export interface MotherlodeSave { reserves: Record<string, number>; timers: Record<string, number[]> }
export class MotherlodeSystem {
  private reserves = new Map<string, number>(); private timers = new Map<string, number[]>();
  constructor(private world: World, private hasFlag: (id: string) => boolean, defs = MOTHERLODES) { for (const def of defs) { this.reserves.set(def.id, def.reserve); this.timers.set(def.id, Array(def.faceTiles.length).fill(0)); for (const tile of def.faceTiles) world.setExternalRegrowOwner(tile.col, tile.row, true); } Events.on('block:break', (p) => this.break(p.col, p.row, defs)); }
  private break(col: number, row: number, defs: MotherlodeDef[]): void { for (const def of defs) { if (!this.hasFlag(def.unlockFlag)) continue; const i = def.faceTiles.findIndex((t) => t.col === col && t.row === row); if (i < 0 || this.world.getTile(col, row) !== BLOCK_IDS.AIR) continue; const reserve = Math.max(0, (this.reserves.get(def.id) ?? 0) - 1); this.reserves.set(def.id, reserve); this.timers.get(def.id)![i] = def.respawnSec; if (!reserve) Events.emit('motherlode:depleted', { id: def.id, name: def.name }); } }
  update(dt: number, defs = MOTHERLODES): void { for (const def of defs) { if (!this.hasFlag(def.unlockFlag) || !(this.reserves.get(def.id) ?? 0)) continue; const timers = this.timers.get(def.id)!; def.faceTiles.forEach((tile, i) => { if (timers[i] > 0) timers[i] -= dt; if (timers[i] <= 0 && this.world.getTile(tile.col, tile.row) === BLOCK_IDS.AIR) { this.world.setTile(tile.col, tile.row, BLOCK_IDS.IRON); this.world.markRich(tile.col, tile.row, Infinity); } }); } }
  toJSON(): MotherlodeSave { return { reserves: Object.fromEntries(this.reserves), timers: Object.fromEntries(this.timers) }; }
  fromJSON(save: MotherlodeSave | undefined): void { for (const [id, value] of Object.entries(save?.reserves ?? {})) if (this.reserves.has(id)) this.reserves.set(id, value); for (const [id, values] of Object.entries(save?.timers ?? {})) if (this.timers.has(id)) this.timers.set(id, values); }
}
