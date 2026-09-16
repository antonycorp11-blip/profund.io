import { Events } from '../core/events';
import { CATEGORIES, SKILLS, skillCost, skillDef, type SkillDef } from '../data/skills';
import type { Attributes, Modifier } from './Attributes';

export interface LearnCheck {
  ok: boolean;
  reason?: string;
}

export interface SkillTreeSave {
  points: number;
  spent: number;
  levels: Record<string, number>;
  storyFlags: string[];
  depthMilestone: number;
}

/** Quanto de profundidade nova concede 1 ponto. */
const DEPTH_PER_POINT = 25;

/**
 * Estado da arvore: niveis, pontos, requisitos e aplicacao dos modificadores.
 *
 * As skills nunca escrevem nos atributos: cada nivel vira uma fonte de
 * modificadores em Attributes, o que torna reset e recalculo triviais.
 */
export class SkillTree {
  points = 0;
  /** Total ja gasto — usado no reset. */
  spent = 0;
  private levels = new Map<string, number>();
  private storyFlags = new Set<string>();
  private depthMilestone = 0;

  constructor(private attrs: Attributes) {}

  levelOf(id: string): number {
    return this.levels.get(id) ?? 0;
  }

  isMaxed(def: SkillDef): boolean {
    return this.levelOf(def.id) >= def.maxLevel;
  }

  /**
   * Categoria aparece se tem habilidade escrita.
   * Legado e a excecao: so surge depois da primeira pista sobre o pai.
   */
  isCategoryVisible(category: string): boolean {
    if (!SKILLS.some((s) => s.category === category)) return false;
    if (category !== 'legacy') return true;
    return this.attrs.has('legacyTreeVisible') || this.levelOf('legacy_mark') > 0;
  }

  /**
   * Quanto deste no o jogador PODE VER.
   *
   *  - 'aberto': da para aprender agora, ou ja foi aprendido.
   *  - 'vizinho': a galeria chega ate ele, mas ainda nao foi cavada. Aparece
   *    como camara escura, com nome e tudo — e o convite.
   *  - 'escondido': nem existe na tela ainda.
   *
   * A arvore mostrava TUDO desde o minuto zero, e isso e o contrario de uma
   * arvore: o jogador via quarenta e tres camaras de uma vez, nenhuma delas
   * significando nada, e a escolha virava uma planilha. Assim cada no aprendido
   * ACENDE o proximo trecho do ninho, e o mapa cresce junto com quem cava.
   */
  visibility(id: string): 'aberto' | 'vizinho' | 'escondido' {
    const def = skillDef(id);
    if (!def) return 'escondido';
    if (this.levelOf(id) > 0) return 'aberto';
    // Raiz de ramo: sempre visivel, senao nao ha por onde comecar.
    if (def.requiredSkills.length === 0) return 'aberto';
    // Basta UM pre-requisito aprendido para a galeria chegar aqui. Exigir
    // todos deixaria nos de convergencia invisiveis ate o ultimo momento, e
    // sao justamente esses que fazem o jogador querer juntar dois caminhos.
    if (def.requiredSkills.some((r) => this.levelOf(r) > 0)) return 'aberto';
    // Um passo alem do que ja acendeu: silhueta, para o caminho ter futuro.
    for (const r of def.requiredSkills) {
      const pai = skillDef(r);
      if (!pai) continue;
      if (pai.requiredSkills.length === 0) return 'vizinho';
      if (pai.requiredSkills.some((rr) => this.levelOf(rr) > 0)) return 'vizinho';
    }
    return 'escondido';
  }

  canLearn(id: string, currentDepth = 0): LearnCheck {
    const def = skillDef(id);
    if (!def) return { ok: false, reason: 'Habilidade desconhecida' };

    const level = this.levelOf(id);
    if (level >= def.maxLevel) return { ok: false, reason: 'Ja esta no maximo' };

    if (def.requiredStoryFlag && !this.storyFlags.has(def.requiredStoryFlag)) {
      return { ok: false, reason: 'Falta descobrir algo sobre seu pai' };
    }

    for (const req of def.requiredSkills) {
      if (this.levelOf(req) === 0) {
        return { ok: false, reason: `Requer ${skillDef(req)?.name ?? req}` };
      }
    }

    if (def.requiredDepth > currentDepth) {
      return { ok: false, reason: `Requer ${def.requiredDepth} m de profundidade` };
    }

    const cost = skillCost(def, level);
    if (CATEGORIES[def.category].usesPoints && cost > this.points) {
      return { ok: false, reason: `Requer ${cost} ponto(s)` };
    }

    return { ok: true };
  }

  learn(id: string, currentDepth = 0): boolean {
    const check = this.canLearn(id, currentDepth);
    if (!check.ok) {
      if (check.reason) Events.emit('ui:toast', { text: check.reason, tone: 'warn' });
      return false;
    }
    const def = skillDef(id)!;
    const level = this.levelOf(id);
    const cost = skillCost(def, level);

    if (CATEGORIES[def.category].usesPoints) {
      this.points -= cost;
      this.spent += cost;
    }
    this.levels.set(id, level + 1);
    this.apply();

    Events.emit('skill:learned', { id, name: def.name, level: level + 1 });
    Events.emit('ui:toast', {
      text: `${def.name} ${level + 1 > 1 ? `nivel ${level + 1}` : ''} aprendida`,
      tone: 'good',
    });
    return true;
  }

  /** Recalcula todos os modificadores a partir dos niveis atuais. */
  apply(): void {
    for (const def of SKILLS) {
      const level = this.levelOf(def.id);
      if (level === 0) {
        this.attrs.removeSource(def.id);
        continue;
      }
      const mods: Modifier[] = [];
      for (let i = 0; i < level; i++) {
        const step = def.modifiers[Math.min(i, def.modifiers.length - 1)];
        if (step) mods.push(...step);
      }
      this.attrs.setSource(def.id, mods);
    }
  }

  // ------------------------------------------------------------ pontos ----

  addPoints(n: number, reason?: string): void {
    if (n <= 0) return;
    this.points += n;
    Events.emit('skill:points', { total: this.points, gained: n, reason: reason ?? '' });
    Events.emit('ui:toast', {
      text: `+${n} ponto${n > 1 ? 's' : ''} de habilidade${reason ? ` — ${reason}` : ''}`,
      tone: 'good',
    });
  }

  /** Concede pontos por profundidade nova (spec: progressao e exploracao, nao kills). */
  checkDepthMilestone(meters: number): void {
    const milestone = Math.floor(meters / DEPTH_PER_POINT);
    if (milestone <= this.depthMilestone) return;
    const gained = milestone - this.depthMilestone;
    this.depthMilestone = milestone;
    this.addPoints(gained, `${milestone * DEPTH_PER_POINT} m`);
  }

  // ------------------------------------------------------------ historia ---

  /**
   * Marca uma flag narrativa e concede automaticamente as skills de Legado
   * que dependiam dela (Legado nao custa pontos).
   */
  setStoryFlag(flag: string): void {
    if (this.storyFlags.has(flag)) return;
    this.storyFlags.add(flag);

    for (const def of SKILLS) {
      if (def.category !== 'legacy') continue;
      if (def.requiredStoryFlag !== flag) continue;
      if (this.levelOf(def.id) > 0) continue;
      if (def.requiredSkills.some((r) => this.levelOf(r) === 0)) continue;
      this.levels.set(def.id, 1);
      Events.emit('skill:learned', { id: def.id, name: def.name, level: 1 });
      Events.emit('ui:toast', { text: `Legado: ${def.name}`, tone: 'story' });
    }
    this.apply();
  }

  hasStoryFlag(flag: string): boolean {
    return this.storyFlags.has(flag);
  }

  // --------------------------------------------------------------- reset ---

  /** Devolve os pontos gastos. Legado nunca e resetado (spec, item 51). */
  reset(): void {
    let refunded = 0;
    for (const def of SKILLS) {
      if (def.category === 'legacy') continue;
      const level = this.levelOf(def.id);
      for (let i = 0; i < level; i++) refunded += skillCost(def, i);
      if (level > 0) this.levels.delete(def.id);
    }
    this.points += refunded;
    this.spent = Math.max(0, this.spent - refunded);
    this.apply();
    Events.emit('ui:toast', { text: `Habilidades resetadas (+${refunded} pontos)`, tone: 'info' });
  }

  /** Debug: aprende tudo que os requisitos permitirem. */
  unlockAll(): void {
    for (let pass = 0; pass < 6; pass++) {
      for (const def of SKILLS) {
        if (def.category === 'legacy') continue;
        while (this.levelOf(def.id) < def.maxLevel) {
          const reqOk = def.requiredSkills.every((r) => this.levelOf(r) > 0);
          if (!reqOk) break;
          this.levels.set(def.id, this.levelOf(def.id) + 1);
        }
      }
    }
    this.apply();
  }

  // ---------------------------------------------------------------- save ---

  toJSON(): SkillTreeSave {
    const levels: Record<string, number> = {};
    for (const [id, lvl] of this.levels) levels[id] = lvl;
    return {
      points: this.points,
      spent: this.spent,
      levels,
      storyFlags: Array.from(this.storyFlags),
      depthMilestone: this.depthMilestone,
    };
  }

  /** Tolera saves antigos: skills que nao existem mais sao ignoradas. */
  fromJSON(data: Partial<SkillTreeSave> | undefined): void {
    this.levels.clear();
    this.storyFlags.clear();
    this.points = data?.points ?? 0;
    this.spent = data?.spent ?? 0;
    this.depthMilestone = data?.depthMilestone ?? 0;

    for (const [id, lvl] of Object.entries(data?.levels ?? {})) {
      const def = skillDef(id);
      if (!def || typeof lvl !== 'number') continue;
      this.levels.set(id, Math.min(lvl, def.maxLevel));
    }
    for (const f of data?.storyFlags ?? []) this.storyFlags.add(f);
    this.apply();
  }
}
