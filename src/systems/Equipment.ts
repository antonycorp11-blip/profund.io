import { EQUIPMENT, equipDef, type EquipSlot } from '../data/equipment';
import { Events } from '../core/events';
import type { Attributes } from './Attributes';
import type { BaseStock } from './BaseStock';

export interface EquipmentSave {
  owned: string[];
  equipped: Partial<Record<EquipSlot, string>>;
}

/**
 * Equipamentos: o que o jogador comprou e o que esta vestindo.
 *
 * Comprar custa moeda; equipar nao custa nada. A escolha interessante e qual
 * levar, nao quanto custa trocar — cobrar pela troca so faria o jogador evitar
 * experimentar.
 */
export class Equipment {
  private owned = new Set<string>();
  private equipped = new Map<EquipSlot, string>();

  constructor(
    private attrs: Attributes,
    private stock: BaseStock
  ) {
    // Os trajes sao uma vitrine de personalizacao, nao uma compra escondida
    // atras de um requisito. Eles ficam disponiveis desde o inicio para que o
    // jogador possa vestir qualquer corpo e testar as camadas de ferramenta.
    // O custo continua visivel na definicao para saves antigos e telas que o
    // consultam, mas o traje ja nasce na mochila.
    for (const def of EQUIPMENT) {
      if (def.slot === 'corpo') this.owned.add(def.id);
    }
  }

  has(id: string): boolean {
    return this.owned.has(id);
  }

  equippedIn(slot: EquipSlot): string | null {
    return this.equipped.get(slot) ?? null;
  }

  isEquipped(id: string): boolean {
    const def = equipDef(id);
    return !!def && this.equipped.get(def.slot) === id;
  }

  /** Comprar ja veste: ninguem compra bota para deixar na prateleira. */
  buy(id: string): boolean {
    const def = equipDef(id);
    if (!def || this.owned.has(id)) return false;
    if (this.stock.money < def.cost) {
      Events.emit('ui:toast', {
        text: `Faltam ${Math.ceil(def.cost - this.stock.money)} moedas.`,
        tone: 'warn',
      });
      return false;
    }
    this.stock.money -= def.cost;
    this.owned.add(id);
    this.equip(id);
    Events.emit('ui:toast', { text: `${def.name} comprado e equipado.`, tone: 'good' });
    return true;
  }

  equip(id: string): void {
    const def = equipDef(id);
    if (!def || !this.owned.has(id)) return;
    this.equipped.set(def.slot, id);
    this.apply();
  }

  unequip(slot: EquipSlot): void {
    this.equipped.delete(slot);
    this.apply();
  }

  /** Reescreve os modificadores a partir do que esta vestido. */
  private apply(): void {
    for (const def of EQUIPMENT) {
      const vestido = this.equipped.get(def.slot) === def.id;
      if (vestido) this.attrs.setSource(`equip:${def.id}`, def.modifiers);
      else this.attrs.removeSource(`equip:${def.id}`);
    }
    Events.emit('equip:changed', {});
  }

  toJSON(): EquipmentSave {
    return {
      owned: [...this.owned],
      equipped: Object.fromEntries(this.equipped) as Partial<Record<EquipSlot, string>>,
    };
  }

  fromJSON(data: EquipmentSave | undefined): void {
    if (!data) return;
    this.owned = new Set(data.owned ?? []);
    // Migra saves antigos: todos os corpos continuam selecionaveis depois da
    // atualizacao, sem exigir que o jogador compre de novo uma arte que ja
    // existia no projeto.
    for (const def of EQUIPMENT) {
      if (def.slot === 'corpo') this.owned.add(def.id);
    }
    this.equipped = new Map(
      Object.entries(data.equipped ?? {}).filter(([, id]) => this.owned.has(id as string)) as [
        EquipSlot,
        string,
      ][]
    );
    this.apply();
  }
}
