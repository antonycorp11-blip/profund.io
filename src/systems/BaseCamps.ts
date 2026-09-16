import { Events } from '../core/events';
import {
  BASE_CAMPS,
  OLD_REFINERY_PENALTY,
  REFINERY_FUEL_PER_SEC,
  REFINERY_RATE,
  type BaseCampDef,
  type StructureKind,
  type StructureSlot,
} from '../data/basecamp';
import { REFINE_RECIPES } from '../data/structures';
import { RESOURCES, type ResourceId } from '../data/resources';
import type { BaseStock } from './BaseStock';

export type BuildState = 'bloqueado' | 'disponivel' | 'erguendo' | 'pronto';

interface SlotState {
  state: BuildState;
  /** Marteladas ja dadas. */
  hits: number;
  /** Segundos de obra restantes. */
  buildLeft: number;
}

export interface BaseCampSave {
  [baseId: string]: {
    slots: Record<string, { state: BuildState; hits: number; buildLeft: number }>;
    bruto: Partial<Record<ResourceId, number>>;
    refinado: Partial<Record<ResourceId, number>>;
    fuel: number;
    /** Fracao do refinado que sobe para virar moeda (0..1). */
    sobe: number;
  };
}

/**
 * As bases de extracao: construcao, estoque e producao.
 *
 * Uma base e um lugar que trabalha sozinho. O jogador monta a cadeia uma vez e
 * depois ela roda sem ele — que e exatamente o ponto: ele precisa poder descer
 * mais fundo sem que a cota pare de ser paga.
 *
 * O fluxo, quando tudo esta de pe:
 *
 *   toupeira -> deposito -> (esteira) -> refinador -> (esteira) -> elevador
 *                                          queima carvao
 *
 * Cada elo que falta trava o proximo. Sem deposito, a toupeira ainda sobe a
 * base. Sem esteira, o bruto empilha no deposito e o refinador fica ocioso.
 * Isso e de proposito: ver a pilha parada e o que explica a esteira melhor do
 * que qualquer texto de tutorial.
 */
export class BaseCamps {
  private slots = new Map<string, SlotState>();
  /** Estoque bruto e refinado por base. */
  private bruto = new Map<string, Map<ResourceId, number>>();
  private refinado = new Map<string, Map<ResourceId, number>>();
  private fuel = new Map<string, number>();
  private sobe = new Map<string, number>();
  /** Quem trabalha em cada base: bonus -> ativo. */
  private equipe = new Map<string, Set<'refino' | 'elevador'>>();

  constructor(private stock: BaseStock) {
    for (const base of BASE_CAMPS) {
      this.bruto.set(base.id, new Map());
      this.refinado.set(base.id, new Map());
      this.fuel.set(base.id, 0);
      this.sobe.set(base.id, 0.5);
      for (const slot of base.slots) {
        // O refinador VELHO ja esta la. Sem ele nao existe material refinado,
        // e sem material refinado nada mais pode ser construido.
        const pronto = slot.kind === 'refinador';
        this.slots.set(this.key(base.id, slot.kind), {
          state: pronto ? 'pronto' : this.podeErguer(base, slot) ? 'disponivel' : 'bloqueado',
          hits: 0,
          buildLeft: 0,
        });
      }
      this.reavaliar(base);
    }
  }

  /**
   * Poe alguem para tocar a base.
   *
   * Nao e um numero maior por si so: cada um cuida de uma PARTE, e so dessa.
   * Jonas no fogo faz o refino render mais; Vilma no elevador faz subir mais.
   * Contratar os dois nao dobra nada — sao gargalos diferentes.
   */
  assign(baseId: string, bonus: 'refino' | 'elevador'): void {
    const set = this.equipe.get(baseId) ?? new Set();
    set.add(bonus);
    this.equipe.set(baseId, set);
  }

  hasWorker(baseId: string, bonus: 'refino' | 'elevador'): boolean {
    return this.equipe.get(baseId)?.has(bonus) ?? false;
  }

  private key(baseId: string, kind: StructureKind): string {
    return `${baseId}:${kind}`;
  }

  private podeErguer(base: BaseCampDef, slot: StructureSlot): boolean {
    return slot.requires.every((r) => this.slots.get(this.key(base.id, r))?.state === 'pronto');
  }

  /** Libera o que passou a ter pre-requisito pronto. */
  private reavaliar(base: BaseCampDef): void {
    for (const slot of base.slots) {
      const st = this.slots.get(this.key(base.id, slot.kind));
      if (!st || st.state !== 'bloqueado') continue;
      if (this.podeErguer(base, slot)) st.state = 'disponivel';
    }
  }

  stateOf(baseId: string, kind: StructureKind): SlotState {
    return (
      this.slots.get(this.key(baseId, kind)) ?? { state: 'bloqueado', hits: 0, buildLeft: 0 }
    );
  }

  /** O jogador bateu no encaixe. Retorna true se a martelada contou. */
  hit(base: BaseCampDef, slot: StructureSlot): boolean {
    const st = this.slots.get(this.key(base.id, slot.kind));
    if (!st) return false;
    if (st.state === 'pronto' || st.state === 'erguendo') return false;
    if (st.state === 'bloqueado') {
      Events.emit('ui:toast', { text: `${slot.nome}: falta o que vem antes.`, tone: 'warn' });
      return false;
    }
    // A primeira martelada e a que cobra o material: cobrar ao terminar faria
    // o jogador martelar cinquenta vezes para descobrir que nao tinha ferro.
    if (st.hits === 0) {
      if (!this.stock.canAfford(slot.cost)) {
        // Dizer O QUE falta, e quanto. "Material insuficiente" manda o jogador
        // adivinhar entre dez recursos qual e o que segura a obra.
        const faltando = Object.entries(slot.cost)
          .map(([id, qtd]) => {
            const res = id as ResourceId;
            const falta = (qtd ?? 0) - this.stock.count(res);
            return falta > 0 ? `${Math.ceil(falta)} ${RESOURCES[res].name}` : null;
          })
          .filter(Boolean);
        Events.emit('ui:toast', {
          text: `${slot.nome}: falta ${faltando.join(' e ')}.`,
          tone: 'warn',
        });
        return false;
      }
      this.stock.spend(slot.cost);
      Events.emit('ui:toast', { text: `Obra iniciada: ${slot.nome}.`, tone: 'info' });
    }
    st.hits++;
    if (st.hits >= slot.hits) {
      st.state = 'erguendo';
      st.buildLeft = slot.buildSec;
      Events.emit('base:building', { base: base.id, kind: slot.kind, nome: slot.nome });
    }
    return true;
  }

  /** Progresso visivel do encaixe, 0..1. */
  progress(base: BaseCampDef, slot: StructureSlot): number {
    const st = this.stateOf(base.id, slot.kind);
    if (st.state === 'pronto') return 1;
    if (st.state === 'erguendo') {
      return 1 - st.buildLeft / Math.max(0.001, slot.buildSec);
    }
    return st.hits / slot.hits;
  }

  built(baseId: string, kind: StructureKind): boolean {
    return this.stateOf(baseId, kind).state === 'pronto';
  }

  /** Base mais proxima com deposito de pe — para onde a toupeira leva. */
  depotFor(depth: number): BaseCampDef | null {
    let melhor: BaseCampDef | null = null;
    for (const b of BASE_CAMPS) {
      if (!this.built(b.id, 'deposito')) continue;
      if (depth < b.depth - 40) continue;
      if (!melhor || Math.abs(b.depth - depth) < Math.abs(melhor.depth - depth)) melhor = b;
    }
    return melhor;
  }

  /** Entrega de minerio bruto direto na base. */
  deposit(baseId: string, resource: ResourceId, amount: number): void {
    const m = this.bruto.get(baseId);
    if (!m || amount <= 0) return;
    m.set(resource, (m.get(resource) ?? 0) + amount);
    Events.emit('base:deposit', { base: baseId, resource, amount });
  }

  brutoOf(baseId: string): Map<ResourceId, number> {
    return this.bruto.get(baseId) ?? new Map();
  }

  refinadoOf(baseId: string): Map<ResourceId, number> {
    return this.refinado.get(baseId) ?? new Map();
  }

  fuelOf(baseId: string): number {
    return this.fuel.get(baseId) ?? 0;
  }

  /** Fracao que sobe para virar moeda. O resto fica guardado para construir. */
  shareOf(baseId: string): number {
    return this.sobe.get(baseId) ?? 0.5;
  }

  setShare(baseId: string, v: number): void {
    this.sobe.set(baseId, Math.max(0, Math.min(1, v)));
  }

  update(dt: number): void {
    for (const base of BASE_CAMPS) {
      // --- obra em andamento ---
      for (const slot of base.slots) {
        const st = this.slots.get(this.key(base.id, slot.kind));
        if (!st || st.state !== 'erguendo') continue;
        st.buildLeft -= dt;
        if (st.buildLeft > 0) continue;
        st.state = 'pronto';
        st.buildLeft = 0;
        this.reavaliar(base);
        Events.emit('base:built', { base: base.id, kind: slot.kind, nome: slot.nome });
      }

      // --- carvao vira fogo ---
      const brutos = this.bruto.get(base.id)!;
      const fogo = this.fuel.get(base.id)!;
      if (fogo < 30) {
        const carvao = brutos.get('coal') ?? 0;
        if (carvao > 0) {
          const queima = Math.min(carvao, 5);
          brutos.set('coal', carvao - queima);
          // Carvao nao e so mais um minerio: e o que move a base inteira.
          this.fuel.set(base.id, fogo + queima * 12);
        }
      }

      // --- refino ---
      if (this.fuelOf(base.id) <= 0) continue;
      // Sem esteira o refinador AINDA funciona, a passo de tartaruga: alguem
      // tem que jogar minerio na boca dele a mao. E o que a esteira compra —
      // velocidade, nao existencia. Travar o refino por completo criava um no:
      // sem refino nao havia refinado, e a esteira custa refinado.
      const temEntrada = this.built(base.id, 'esteira_entrada');
      const alimentacao = temEntrada ? 1 : 0.25;
      const velho = !this.built(base.id, 'casa_capataz');
      // Alguem cuidando do fogo rende 70% a mais: e trabalho humano, nao
      // upgrade de maquina.
      const maos = this.hasWorker(base.id, 'refino') ? 1.7 : 1;
      const taxa = REFINERY_RATE * (velho ? OLD_REFINERY_PENALTY : 1) * maos * alimentacao * dt;
      let feito = 0;
      for (const [res, qtd] of brutos) {
        if (qtd <= 0) continue;
        // Carvao aqui e COMBUSTIVEL, nao materia-prima. Refina-lo na base faria
        // a maquina comer o proprio fogo e nunca chegar no ouro.
        if (res === 'coal') continue;
        const receita = REFINE_RECIPES[res];
        if (!receita) continue;
        const usa = Math.min(qtd, taxa);
        if (usa < 0.01) continue;
        brutos.set(res, qtd - usa);
        const saida = this.refinado.get(base.id)!;
        saida.set(receita.out, (saida.get(receita.out) ?? 0) + usa * receita.ratio);
        feito += usa;
        break;
      }
      if (feito > 0) {
        this.fuel.set(base.id, Math.max(0, this.fuelOf(base.id) - REFINERY_FUEL_PER_SEC * dt));
      }

      // --- elevador: o que sobe vira moeda la em cima ---
      if (!this.built(base.id, 'elevador')) continue;
      const saida = this.refinado.get(base.id)!;
      const fracao = this.shareOf(base.id);
      for (const [res, qtd] of saida) {
        if (qtd < 1) continue;
        const ritmo = this.hasWorker(base.id, 'elevador') ? 1.8 : 1;
        const sobe = Math.min(qtd, dt * 1.2 * ritmo) * fracao;
        if (sobe < 0.01) continue;
        saida.set(res, qtd - sobe);
        this.stock.deliver([[res, sobe]], 1);
      }
    }
  }

  toJSON(): BaseCampSave {
    const out: BaseCampSave = {};
    for (const base of BASE_CAMPS) {
      const slots: BaseCampSave[string]['slots'] = {};
      for (const slot of base.slots) {
        const st = this.stateOf(base.id, slot.kind);
        slots[slot.kind] = { state: st.state, hits: st.hits, buildLeft: st.buildLeft };
      }
      out[base.id] = {
        slots,
        bruto: Object.fromEntries(this.bruto.get(base.id)!) as Partial<Record<ResourceId, number>>,
        refinado: Object.fromEntries(this.refinado.get(base.id)!) as Partial<
          Record<ResourceId, number>
        >,
        fuel: this.fuelOf(base.id),
        sobe: this.shareOf(base.id),
      };
    }
    return out;
  }

  fromJSON(data: BaseCampSave | undefined): void {
    if (!data) return;
    for (const base of BASE_CAMPS) {
      const saved = data[base.id];
      if (!saved) continue;
      for (const slot of base.slots) {
        const s = saved.slots?.[slot.kind];
        if (!s) continue;
        this.slots.set(this.key(base.id, slot.kind), {
          state: s.state,
          hits: s.hits ?? 0,
          buildLeft: s.buildLeft ?? 0,
        });
      }
      this.bruto.set(base.id, new Map(Object.entries(saved.bruto ?? {}) as [ResourceId, number][]));
      this.refinado.set(
        base.id,
        new Map(Object.entries(saved.refinado ?? {}) as [ResourceId, number][])
      );
      this.fuel.set(base.id, saved.fuel ?? 0);
      this.sobe.set(base.id, saved.sobe ?? 0.5);
      this.reavaliar(base);
    }
  }
}
