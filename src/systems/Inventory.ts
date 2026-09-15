import { RESOURCES, type ResourceId } from '../data/resources';
import type { Attributes } from './Attributes';

export type InventoryData = Partial<Record<ResourceId, number>>;

/** Mochila do jogador: capacidade limitada em "unidades de peso". */
export class Inventory {
  private items = new Map<ResourceId, number>();

  constructor(private attrs: Attributes) {}

  /** Capacidade final (base + mochilas das habilidades). */
  get capacity(): number {
    return this.attrs.getInt('inventoryCapacity');
  }

  /** Peso efetivo de um recurso, ja com a reducao das habilidades. */
  weightOf(id: ResourceId): number {
    const reduction = this.attrs.get('resourceWeightReduction');
    return Math.max(0.2, RESOURCES[id].weight * (1 - reduction));
  }

  get used(): number {
    let total = 0;
    for (const [id, qty] of this.items) total += qty * this.weightOf(id);
    return Math.round(total * 10) / 10;
  }

  /** 0..1 — usado pela penalidade de movimento. */
  get loadRatio(): number {
    return this.capacity <= 0 ? 1 : Math.min(1, this.used / this.capacity);
  }

  get free(): number {
    return Math.max(0, this.capacity - this.used);
  }

  get isFull(): boolean {
    return this.free <= 0;
  }

  get isEmpty(): boolean {
    return this.items.size === 0;
  }

  count(id: ResourceId): number {
    return this.items.get(id) ?? 0;
  }

  entries(): [ResourceId, number][] {
    return Array.from(this.items.entries());
  }

  /** Adiciona respeitando a capacidade. Retorna quanto coube. */
  add(id: ResourceId, amount: number): number {
    const weight = this.weightOf(id);
    const canFit = Math.floor(this.free / weight);
    const added = Math.max(0, Math.min(amount, canFit));
    if (added > 0) this.items.set(id, this.count(id) + added);
    return added;
  }

  remove(id: ResourceId, amount: number): number {
    const have = this.count(id);
    const removed = Math.min(have, amount);
    if (removed >= have) this.items.delete(id);
    else this.items.set(id, have - removed);
    return removed;
  }

  totalValue(): number {
    let v = 0;
    for (const [id, qty] of this.items) v += RESOURCES[id].value * qty;
    return v;
  }

  totalUnits(): number {
    let v = 0;
    for (const [, qty] of this.items) v += qty;
    return v;
  }

  clear(): void {
    this.items.clear();
  }

  toJSON(): InventoryData {
    const out: InventoryData = {};
    for (const [id, qty] of this.items) out[id] = qty;
    return out;
  }

  fromJSON(data: InventoryData | undefined): void {
    this.items.clear();
    if (!data) return;
    for (const [id, qty] of Object.entries(data)) {
      if (qty && qty > 0) this.items.set(id as ResourceId, qty);
    }
  }
}
