import { Events } from '../core/events';
import { TECHS, techDef, type TechDef } from '../data/tech';
import type { Attributes } from './Attributes';
import type { BaseStock } from './BaseStock';

export interface TechSave {
  researched: string[];
}

/**
 * Pesquisa e Tecnologia.
 * Paga com recurso do estoque da base (nao com ponto de habilidade) e aplica
 * modificadores permanentes pela mesma camada de Attributes.
 */
export class TechTree {
  private researched = new Set<string>();

  constructor(private attrs: Attributes, private stock: BaseStock) {}

  has(id: string): boolean {
    return this.researched.has(id);
  }

  /** Alguma tecnologia pesquisada libera esta chave? */
  unlocked(key: string): boolean {
    for (const id of this.researched) {
      if (techDef(id)?.unlocks === key) return true;
    }
    return false;
  }

  /** Maior indice de ferramenta liberado por pesquisa. */
  maxToolIndex(): number {
    let max = 0;
    for (const id of this.researched) {
      const u = techDef(id)?.unlocks;
      if (u?.startsWith('tool:')) max = Math.max(max, Number(u.slice(5)));
    }
    return max;
  }

  canResearch(id: string, deepest: number): { ok: boolean; reason?: string } {
    const def = techDef(id);
    if (!def) return { ok: false, reason: 'Tecnologia desconhecida' };
    if (this.researched.has(id)) return { ok: false, reason: 'Ja pesquisada' };
    for (const req of def.requires) {
      if (!this.researched.has(req)) {
        return { ok: false, reason: `Requer ${techDef(req)?.name ?? req}` };
      }
    }
    if (def.requiredDepth > deepest) {
      return { ok: false, reason: `Requer ${def.requiredDepth} m alcancados` };
    }
    if (!this.stock.canAfford(def.cost)) return { ok: false, reason: 'Recursos insuficientes' };
    return { ok: true };
  }

  research(id: string, deepest: number): boolean {
    const check = this.canResearch(id, deepest);
    if (!check.ok) {
      if (check.reason) Events.emit('ui:toast', { text: check.reason, tone: 'warn' });
      return false;
    }
    const def = techDef(id)!;
    if (!this.stock.spend(def.cost)) return false;
    this.researched.add(id);
    this.apply();
    Events.emit('tech:researched', { id, name: def.name, unlocks: def.unlocks ?? '' });
    Events.emit('ui:toast', { text: `Pesquisa concluida: ${def.name}`, tone: 'good' });
    return true;
  }

  apply(): void {
    for (const def of TECHS) {
      if (!this.researched.has(def.id) || !def.modifiers) {
        this.attrs.removeSource('tech:' + def.id);
        continue;
      }
      this.attrs.setSource('tech:' + def.id, def.modifiers);
    }
  }

  list(): TechDef[] {
    return TECHS;
  }

  /** Debug. */
  unlockAll(deepest = 99999): void {
    for (let pass = 0; pass < 4; pass++) {
      for (const def of TECHS) {
        if (this.researched.has(def.id)) continue;
        if (def.requires.some((r) => !this.researched.has(r))) continue;
        if (def.requiredDepth > deepest) continue;
        this.researched.add(def.id);
      }
    }
    this.apply();
  }

  toJSON(): TechSave {
    return { researched: Array.from(this.researched) };
  }

  fromJSON(data: TechSave | undefined): void {
    this.researched.clear();
    for (const id of data?.researched ?? []) {
      if (techDef(id)) this.researched.add(id);
    }
    this.apply();
  }
}
