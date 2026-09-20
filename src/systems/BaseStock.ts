import type { InventoryData } from './Inventory';
import { RESOURCES, type ResourceId } from '../data/resources';

/** Estoque da base (sem limite) + dinheiro. */
export class BaseStock {
  private items = new Map<ResourceId, number>();
  money = 0;
  /** Total historico entregue — usado pela cota. */
  private delivered = new Map<ResourceId, number>();

  count(id: ResourceId): number {
    return this.items.get(id) ?? 0;
  }

  deliveredCount(id: ResourceId): number {
    return this.delivered.get(id) ?? 0;
  }

  add(id: ResourceId, amount: number, countAsDelivery = true): void {
    if (amount <= 0) return;
    this.items.set(id, this.count(id) + amount);
    if (countAsDelivery) this.delivered.set(id, this.deliveredCount(id) + amount);
  }

  /**
   * Entrega no deposito: guarda o recurso E paga por ele.
   *
   * Existe porque a regra estava escrita em tres lugares e um deles esquecia de
   * pagar: o jogador entregando virava moeda, mas copia e toupeira so enchiam
   * o estoque. Trabalho de ajudante tem que render dinheiro igual ao seu.
   *
   * @param multiplier bonus de venda (atributo `deliveryValue`)
   * @returns moedas pagas
   */
  deliver(items: [ResourceId, number][], multiplier = 1): number {
    let valor = 0;
    for (const [id, qty] of items) {
      if (qty <= 0) continue;
      this.add(id, qty);
      valor += RESOURCES[id].value * qty;
    }
    valor = Math.round(valor * multiplier);
    this.money += valor;
    return valor;
  }

  /** Tenta gastar; retorna false se faltar recurso. */
  spend(cost: Partial<Record<ResourceId, number>>): boolean {
    for (const [id, qty] of Object.entries(cost)) {
      if (this.count(id as ResourceId) < (qty ?? 0)) return false;
    }
    for (const [id, qty] of Object.entries(cost)) {
      const key = id as ResourceId;
      this.items.set(key, this.count(key) - (qty ?? 0));
    }
    return true;
  }

  canAfford(cost: Partial<Record<ResourceId, number>>): boolean {
    for (const [id, qty] of Object.entries(cost)) {
      if (this.count(id as ResourceId) < (qty ?? 0)) return false;
    }
    return true;
  }

  canAffordMoney(amount = 0): boolean {
    return this.money >= amount;
  }

  /** Gasta moeda uma unica vez, no mesmo ponto que confere saldo. */
  spendMoney(amount = 0): boolean {
    if (!this.canAffordMoney(amount)) return false;
    this.money -= amount;
    return true;
  }

  entries(): [ResourceId, number][] {
    return Array.from(this.items.entries());
  }

  valueOf_(id: ResourceId): number {
    return RESOURCES[id].value;
  }

  toJSON(): { items: InventoryData; delivered: InventoryData; money: number } {
    const items: InventoryData = {};
    for (const [id, qty] of this.items) items[id] = qty;
    const delivered: InventoryData = {};
    for (const [id, qty] of this.delivered) delivered[id] = qty;
    return { items, delivered, money: this.money };
  }

  fromJSON(data: { items?: InventoryData; delivered?: InventoryData; money?: number } | undefined): void {
    this.items.clear();
    this.delivered.clear();
    this.money = data?.money ?? 0;
    for (const [id, qty] of Object.entries(data?.items ?? {})) {
      if (qty) this.items.set(id as ResourceId, qty);
    }
    for (const [id, qty] of Object.entries(data?.delivered ?? {})) {
      if (qty) this.delivered.set(id as ResourceId, qty);
    }
  }
}
