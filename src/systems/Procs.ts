import type { BlockDef, BlockTag } from '../data/blocks';
import type { Attributes } from './Attributes';

export type ProcId =
  | 'blockCritical'
  | 'fracture'
  | 'extraDrop'
  | 'doubleDrop'
  | 'tripleDrop'
  | 'jackpot'
  | 'veinRich'
  | 'instantBreak'
  | 'combatCritical';

export interface ProcRule {
  id: ProcId;
  /** Chance vem deste atributo/proc acumulado. */
  source: { kind: 'attr' | 'proc'; key: string };
  /** Teto absoluto, mesmo com muitas skills (spec, item 46). */
  maxChance: number;
  /** Intervalo minimo entre disparos, em segundos. */
  cooldown: number;
  /** Se definido, o bloco precisa ter ao menos uma destas tags. */
  requiresTags?: BlockTag[];
  /** O bloco nao pode ter nenhuma destas tags. */
  forbidsTags?: BlockTag[];
  description: string;
}

/**
 * Protecoes que valem para TODOS os procs: nenhum efeito de sorte pode
 * destruir conteudo narrativo ou indestrutivel.
 */
const GLOBAL_FORBID: BlockTag[] = ['indestructible', 'quest', 'boss'];

export const PROC_RULES: Record<ProcId, ProcRule> = {
  blockCritical: {
    id: 'blockCritical',
    source: { kind: 'attr', key: 'blockCriticalChance' },
    maxChance: 0.6,
    cooldown: 0,
    description: 'Golpe critico em bloco.',
  },
  fracture: {
    id: 'fracture',
    source: { kind: 'proc', key: 'fracture' },
    maxChance: 0.45,
    cooldown: 0,
    forbidsTags: ['ancient', 'special'],
    description: 'Racha os blocos vizinhos ao quebrar.',
  },
  extraDrop: {
    id: 'extraDrop',
    source: { kind: 'attr', key: 'extraDropChance' },
    maxChance: 0.85,
    cooldown: 0,
    requiresTags: ['ore'],
    description: 'Pepita adicional.',
  },
  doubleDrop: {
    id: 'doubleDrop',
    source: { kind: 'attr', key: 'doubleDropChance' },
    maxChance: 0.7,
    cooldown: 0,
    requiresTags: ['ore'],
    description: 'Dobra o drop.',
  },
  tripleDrop: {
    id: 'tripleDrop',
    source: { kind: 'attr', key: 'tripleDropChance' },
    maxChance: 0.4,
    cooldown: 0,
    requiresTags: ['ore'],
    description: 'Triplica o drop.',
  },
  jackpot: {
    id: 'jackpot',
    source: { kind: 'proc', key: 'jackpot' },
    maxChance: 0.08,
    cooldown: 25,
    requiresTags: ['ore'],
    forbidsTags: ['ancient', 'special'],
    description: 'Explosao de recursos.',
  },
  veinRich: {
    id: 'veinRich',
    source: { kind: 'proc', key: 'veinRich' },
    maxChance: 0.35,
    cooldown: 0,
    requiresTags: ['ore'],
    description: 'Veio rico: +50% de recursos.',
  },
  combatCritical: {
    id: 'combatCritical',
    source: { kind: 'attr', key: 'combatCriticalChance' },
    maxChance: 0.6,
    cooldown: 0,
    description: 'Golpe critico em criatura.',
  },
  instantBreak: {
    id: 'instantBreak',
    source: { kind: 'proc', key: 'instantBreak' },
    maxChance: 0.5,
    cooldown: 0,
    forbidsTags: ['ancient', 'special', 'hardStone'],
    description: 'Quebra instantanea de blocos fracos.',
  },
};

export interface ProcContext {
  block?: BlockDef;
  depth?: number;
}

/**
 * Sistema de chance reutilizavel.
 * Guarda cooldown por proc e aplica as protecoes de tag antes de sortear.
 */
export class Procs {
  private lastFire = new Map<ProcId, number>();
  private time = 0;
  /** Forca o proximo roll de um proc (ferramenta de debug). */
  private forced = new Set<ProcId>();

  constructor(private attrs: Attributes) {}

  update(dt: number): void {
    this.time += dt;
  }

  chance(id: ProcId): number {
    const rule = PROC_RULES[id];
    const raw =
      rule.source.kind === 'attr'
        ? this.attrs.get(rule.source.key as never)
        : this.attrs.procChance(rule.source.key);
    return Math.min(raw, rule.maxChance);
  }

  /** Testa protecoes + cooldown + sorteio. */
  roll(id: ProcId, ctx: ProcContext = {}): boolean {
    const rule = PROC_RULES[id];

    if (ctx.block) {
      const tags = ctx.block.tags;
      if (GLOBAL_FORBID.some((t) => tags.includes(t))) return false;
      if (rule.forbidsTags?.some((t) => tags.includes(t))) return false;
      if (rule.requiresTags && !rule.requiresTags.some((t) => tags.includes(t))) return false;
    }

    if (this.forced.has(id)) {
      this.forced.delete(id);
      this.lastFire.set(id, this.time);
      return true;
    }

    const chance = this.chance(id);
    if (chance <= 0) return false;

    if (rule.cooldown > 0) {
      const last = this.lastFire.get(id) ?? -Infinity;
      if (this.time - last < rule.cooldown) return false;
    }

    if (Math.random() >= chance) return false;
    this.lastFire.set(id, this.time);
    return true;
  }

  /** Debug: garante que o proximo roll deste proc passe. */
  force(id: ProcId): void {
    this.forced.add(id);
    this.lastFire.delete(id);
  }

  reset(): void {
    this.lastFire.clear();
    this.forced.clear();
  }
}
