import { Events } from '../core/events';
import { SECRETS, type SecretDef } from '../data/secrets';
import type { BaseStock } from './BaseStock';
import type { World } from '../world/World';
export class Secrets {
  private found = new Set<string>();
  constructor(private world: World, private stock: BaseStock, private reveal: (id: string) => void, private setFlag: (id: string) => void, defs = SECRETS) { Events.on('block:break', () => this.check(defs)); }
  private check(defs: SecretDef[]): void { for (const secret of defs) { if (this.found.has(secret.id) || secret.barrier.some((tile) => this.world.isSolid(tile.col, tile.row))) continue; this.found.add(secret.id); for (const [resource, amount] of Object.entries(secret.reward)) this.stock.add(resource as never, amount ?? 0, false); this.reveal(secret.marker.id); if (secret.completionFlag) this.setFlag(secret.completionFlag); Events.emit('secret:found', { id: secret.id, label: secret.marker.label }); } }
}
