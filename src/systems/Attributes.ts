import { ATTRIBUTES, type AttrId, type FlagId } from '../data/attributes';
import { clamp } from '../core/math';

export type ModifierOp =
  | 'flat'
  | 'percentAdd'
  | 'percentMultiply'
  | 'override'
  | 'unlock'
  | 'proc';

export interface Modifier {
  /** AttrId, FlagId (unlock) ou id de proc. */
  target: string;
  op: ModifierOp;
  value: number;
}

interface Source {
  id: string;
  mods: Modifier[];
}

/**
 * Camada de modificadores sobre os atributos base.
 *
 * final = (base + soma(flat)) * (1 + soma(percentAdd)) * produto(1 + percentMultiply)
 * `override` substitui o resultado. `unlock` liga flags. `proc` acumula chances.
 *
 * As skills NUNCA escrevem no atributo base: elas registram uma fonte de
 * modificadores, o que torna reset e recalculo triviais.
 */
export class Attributes {
  private sources = new Map<string, Source>();
  private cache = new Map<string, number>();
  private flags = new Set<string>();
  private procs = new Map<string, number>();
  private dirty = true;
  /** Ouvintes avisados quando algo muda (para reaplicar stats derivados). */
  private listeners: (() => void)[] = [];

  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  setSource(id: string, mods: Modifier[]): void {
    if (mods.length === 0) this.sources.delete(id);
    else this.sources.set(id, { id, mods });
    this.invalidate();
  }

  removeSource(id: string): void {
    if (this.sources.delete(id)) this.invalidate();
  }

  clearSources(): void {
    this.sources.clear();
    this.invalidate();
  }

  private invalidate(): void {
    this.dirty = true;
    for (const fn of this.listeners) fn();
  }

  private rebuild(): void {
    this.cache.clear();
    this.flags.clear();
    this.procs.clear();

    const flat = new Map<string, number>();
    const add = new Map<string, number>();
    const mult = new Map<string, number>();
    const over = new Map<string, number>();

    for (const src of this.sources.values()) {
      for (const m of src.mods) {
        switch (m.op) {
          case 'flat':
            flat.set(m.target, (flat.get(m.target) ?? 0) + m.value);
            break;
          case 'percentAdd':
            add.set(m.target, (add.get(m.target) ?? 0) + m.value);
            break;
          case 'percentMultiply':
            mult.set(m.target, (mult.get(m.target) ?? 1) * (1 + m.value));
            break;
          case 'override':
            over.set(m.target, m.value);
            break;
          case 'unlock':
            if (m.value > 0) this.flags.add(m.target);
            break;
          case 'proc':
            this.procs.set(m.target, (this.procs.get(m.target) ?? 0) + m.value);
            break;
        }
      }
    }

    for (const id of Object.keys(ATTRIBUTES) as AttrId[]) {
      const meta = ATTRIBUTES[id];
      let v: number;
      if (over.has(id)) {
        v = over.get(id)!;
      } else {
        v = (meta.base + (flat.get(id) ?? 0)) * (1 + (add.get(id) ?? 0)) * (mult.get(id) ?? 1);
      }
      // Tetos da spec (item 46): nada de critico 300% ou cooldown negativo.
      v = clamp(v, meta.min ?? -Infinity, meta.max ?? Infinity);
      this.cache.set(id, v);
    }

    this.dirty = false;
  }

  get(id: AttrId): number {
    if (this.dirty) this.rebuild();
    return this.cache.get(id) ?? ATTRIBUTES[id].base;
  }

  /** Valor arredondado para atributos inteiros (capacidade, etc.). */
  getInt(id: AttrId): number {
    return Math.round(this.get(id));
  }

  has(flag: FlagId): boolean {
    if (this.dirty) this.rebuild();
    return this.flags.has(flag);
  }

  /** Chance acumulada de um proc (0..1). */
  procChance(id: string): number {
    if (this.dirty) this.rebuild();
    return this.procs.get(id) ?? 0;
  }

  /** Diferenca entre o valor atual e a base — para a UI mostrar "+18%". */
  delta(id: AttrId): number {
    return this.get(id) - ATTRIBUTES[id].base;
  }

  /** Simula o valor de um atributo com modificadores extras (preview da UI). */
  preview(id: AttrId, extra: Modifier[]): number {
    const key = '__preview__';
    const previous = this.sources.get(key);
    this.setSource(key, extra);
    const v = this.get(id);
    if (previous) this.sources.set(key, previous);
    else this.sources.delete(key);
    this.dirty = true;
    return v;
  }
}
