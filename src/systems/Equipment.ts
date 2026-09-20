import { EQUIPMENT, equipDef, type EquipSlot } from '../data/equipment';
import { Events } from '../core/events';
import type { Attributes } from './Attributes';
import type { BaseStock } from './BaseStock';

export interface EquipmentSave {
  owned: string[];
  equipped: Partial<Record<EquipSlot, string>>;
  appearanceVersion?: number;
}

export const TRAJE_INICIAL = 'eq_traje_inicial';
export const TRAJES_DE_CIDADE = [
  'eq_traje_t1',
  'eq_traje_t4',
  'eq_traje_t3',
  'eq_traje_t2',
] as const;

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
    // O corpo inicial e a unica roupa que nasce na mochila. As quatro roupas
    // de cidade pertencem a progressao e aparecem nas profundidades delas.
    this.owned.add(TRAJE_INICIAL);
    // Corpo limpo para as ferramentas modulares. Sem isto um jogo novo ainda
    // nascia com a picareta pintada no sprite antigo e qualquer encaixe novo
    // aparecia duplicado.
    this.equipped.set('corpo', TRAJE_INICIAL);
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
    // O corpo antigo tinha picareta pintada nos quadros e nao faz mais parte
    // do jogador. Tirar uma roupa volta ao traje canonico, nunca ao sprite velho.
    if (slot === 'corpo') this.equipped.set('corpo', TRAJE_INICIAL);
    else this.equipped.delete(slot);
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
      appearanceVersion: 2,
    };
  }

  fromJSON(data: EquipmentSave | undefined): void {
    if (!data) return;
    this.owned = new Set(data.owned ?? []);
    // A versao anterior concedeu as roupas de cidade automaticamente. A marca
    // garante que a limpeza aconteca uma vez so; uma compra futura sobrevive.
    if ((data.appearanceVersion ?? 0) < 2) {
      for (const id of TRAJES_DE_CIDADE) this.owned.delete(id);
    }
    this.owned.add(TRAJE_INICIAL);
    this.equipped = new Map(
      Object.entries(data.equipped ?? {}).filter(([, id]) => this.owned.has(id as string)) as [
        EquipSlot,
        string,
      ][]
    );
    // Se a roupa removida estava equipada, volta ao corpo canonico.
    if (!this.equipped.has('corpo')) {
      this.equipped.set('corpo', TRAJE_INICIAL);
    }
    this.apply();
  }
}
