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

export type BuildState = 'bloqueado' | 'disponivel' | 'erguendo' | 'pronto' | 'melhorando';

interface SlotState {
  state: BuildState;
  /** Marteladas ja dadas na obra (ou na melhoria, depois de pronta). */
  hits: number;
  /** Segundos de obra restantes. */
  buildLeft: number;
  /** 0 = de pe. 1 = melhorada. */
  nivel: number;
}

export interface BaseCampSave {
  [baseId: string]: {
    slots: Record<string, { state: BuildState; hits: number; buildLeft: number; nivel?: number }>;
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
  /**
   * De qual minerio o refinador comeca a olhar, por base.
   *
   * O laco pegava sempre o PRIMEIRO da pilha e parava ali. Como carvao e o que
   * mais chega, a base virava uma fabrica exclusiva de Coque: ouro e cristal
   * ficavam encostados para sempre, e as melhorias que pedem Barra de Ouro e
   * Prisma nunca teriam de onde sair. Girar a vez resolve sem fila nenhuma.
   */
  private giro = new Map<string, number>();
  /**
   * Quanto cada base produz, medido em vez de estimado.
   *
   * O painel precisa responder "isto aqui esta rendendo?" e essa resposta nao
   * pode ser uma conta de multiplicadores na cabeca do jogador — sao cinco
   * fatores (fogo, esteira, nivel, trabalhador, alimentacao) e nenhum deles
   * esta escrito na tela. Entao a base conta o que realmente saiu no ultimo
   * segundo e mostra isso.
   */
  private ritmo = new Map<
    string,
    { t: number; refAcc: number; subAcc: number; refSec: number; subSec: number }
  >();
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
          nivel: 0,
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
      this.slots.get(this.key(baseId, kind)) ?? {
        state: 'bloqueado',
        hits: 0,
        buildLeft: 0,
        nivel: 0,
      }
    );
  }

  /** Refinado por minuto e carga que sobe por minuto, medidos agora. */
  ritmoDe(baseId: string): { refino: number; subida: number } {
    const r = this.ritmo.get(baseId);
    return { refino: (r?.refSec ?? 0) * 60, subida: (r?.subSec ?? 0) * 60 };
  }

  private janela(baseId: string) {
    let r = this.ritmo.get(baseId);
    if (!r) {
      r = { t: 0, refAcc: 0, subAcc: 0, refSec: 0, subSec: 0 };
      this.ritmo.set(baseId, r);
    }
    return r;
  }

  private marcar(baseId: string, ref: number, sub: number): void {
    const r = this.janela(baseId);
    r.refAcc += ref;
    r.subAcc += sub;
  }

  /**
   * Fecha a janela de medicao da base.
   *
   * Roda ANTES de qualquer `continue` do laco de producao, de proposito: se a
   * contagem so avancasse quando ha producao, uma base que parou ficaria
   * mostrando para sempre o ultimo numero bom que ela teve. O jogador abriria
   * o painel de uma base sem carvao e leria "30/min".
   */
  private fecharJanela(baseId: string, dt: number): void {
    const r = this.janela(baseId);
    r.t += dt;
    if (r.t < 1) return;
    // Janela de um segundo: curta o bastante para reagir quando o fogo apaga,
    // longa o bastante para o numero nao tremer na tela.
    r.refSec = r.refAcc / r.t;
    r.subSec = r.subAcc / r.t;
    r.t = 0;
    r.refAcc = 0;
    r.subAcc = 0;
  }

  /** Quantos depositos estao de pe, e quantos desses ja foram melhorados. */
  depotsUpgraded(): number {
    return BASE_CAMPS.filter(
      (b) => this.built(b.id, 'deposito') && this.nivelDe(b.id, 'deposito') >= 1
    ).length;
  }

  /** Total guardado no deposito bruto de uma base. */
  brutoTotal(baseId: string): number {
    let n = 0;
    for (const v of this.bruto.get(baseId)?.values() ?? []) n += v;
    return n;
  }

  /** Nivel da estrutura: 0 de pe, 1 melhorada. */
  nivelDe(baseId: string, kind: StructureKind): number {
    return this.stateOf(baseId, kind).nivel ?? 0;
  }

  /** O jogador bateu no encaixe. Retorna true se a martelada contou. */
  hit(base: BaseCampDef, slot: StructureSlot): boolean {
    const st = this.slots.get(this.key(base.id, slot.kind));
    if (!st) return false;
    if (st.state === 'erguendo' || st.state === 'melhorando') return false;
    // De pe: a picareta passa a MELHORAR. E o unico lugar do jogo onde
    // material refinado e cobrado — ver a regra 3 em /data/basecamp.ts.
    if (st.state === 'pronto') return this.hitMelhoria(base, slot, st);
    if (st.state === 'bloqueado') {
      Events.emit('ui:toast', { text: `${slot.nome}: falta o que vem antes.`, tone: 'warn' });
      return false;
    }
    // A primeira martelada e a que cobra o material: cobrar ao terminar faria
    // o jogador martelar cinquenta vezes para descobrir que nao tinha ferro.
    if (st.hits === 0) {
      // Dizer O QUE falta, e quanto. "Material insuficiente" manda o jogador
      // adivinhar entre dez recursos qual e o que segura a obra.
      const faltando = Object.entries(slot.cost)
        .map(([id, qtd]) => {
          const res = id as ResourceId;
          const falta = (qtd ?? 0) - this.disponivel(base.id, res);
          return falta > 0 ? `${Math.ceil(falta)} ${RESOURCES[res].name}` : null;
        })
        .filter(Boolean);
      if (faltando.length > 0) {
        Events.emit('ui:toast', {
          text: `${slot.nome}: falta ${faltando.join(' e ')}.`,
          tone: 'warn',
        });
        return false;
      }
      this.pagar(base.id, slot.cost);
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

  /**
   * Martelada numa estrutura que ja esta de pe: isso e melhoria.
   *
   * Mesmo ritual da obra — o material sai na primeira martelada, depois vem
   * golpe e tempo. So o que ela cobra e diferente: aqui, e so aqui, o preco e
   * em REFINADO.
   */
  private hitMelhoria(base: BaseCampDef, slot: StructureSlot, st: SlotState): boolean {
    const mel = slot.melhoria;
    if (!mel || (st.nivel ?? 0) >= 1) return false;
    if (st.hits === 0) {
      const faltando = Object.entries(mel.cost)
        .map(([id, qtd]) => {
          const res = id as ResourceId;
          const falta = (qtd ?? 0) - this.disponivel(base.id, res);
          return falta > 0 ? `${Math.ceil(falta)} ${RESOURCES[res].name}` : null;
        })
        .filter(Boolean);
      if (faltando.length > 0) {
        // Melhoria SEMPRE cobra refinado, entao a dica de onde conseguir vale
        // sempre: o refinador da propria base faz isso, mesmo velho.
        Events.emit('ui:toast', {
          text: `Melhorar ${slot.nome}: falta ${faltando.join(' e ')}. O refinador faz isso — despeje carvao e minerio no deposito e espere.`,
          tone: 'warn',
        });
        return false;
      }
      this.pagar(base.id, mel.cost);
      Events.emit('ui:toast', { text: `Melhoria iniciada: ${slot.nome}.`, tone: 'info' });
    }
    st.hits++;
    if (st.hits >= mel.hits) {
      st.state = 'melhorando';
      st.buildLeft = mel.buildSec;
      Events.emit('base:building', { base: base.id, kind: slot.kind, nome: slot.nome });
    }
    return true;
  }

  /**
   * Quanto de um material a obra pode gastar: o que esta AQUI mais o que ja
   * subiu para a superficie.
   *
   * As duas pilhas da base contam — o bruto que as toupeiras trouxeram e o
   * refinado que o fogo produziu. Sem isso a melhoria era impossivel de pagar:
   * o refinado so chega ao estoque de cima pelo ELEVADOR, que e a ultima peca
   * da cadeia. Seria a armadilha de sempre com outra fantasia — a melhoria do
   * refinador exigindo o elevador que exige o refinador funcionando.
   *
   * Vale tambem para a obra em bruto, e ali e so bom senso: o minerio esta a
   * dois metros do encaixe, dentro do deposito. Mandar o jogador subir 236 m
   * para buscar o que ele mesmo acabou de despejar ali seria implicancia.
   */
  private disponivel(baseId: string, res: ResourceId): number {
    return (
      (this.bruto.get(baseId)?.get(res) ?? 0) +
      (this.refinado.get(baseId)?.get(res) ?? 0) +
      this.stock.count(res)
    );
  }

  /** Tira das pilhas da propria base primeiro; o que faltar vem de cima. */
  private pagar(baseId: string, cost: Partial<Record<ResourceId, number>>): void {
    const pilhas = [this.bruto.get(baseId), this.refinado.get(baseId)];
    const deCima: Partial<Record<ResourceId, number>> = {};
    for (const [id, qtd] of Object.entries(cost)) {
      const res = id as ResourceId;
      let falta = qtd ?? 0;
      for (const pilha of pilhas) {
        if (!pilha || falta <= 0.001) continue;
        const aqui = pilha.get(res) ?? 0;
        const usa = Math.min(aqui, falta);
        if (usa <= 0) continue;
        pilha.set(res, aqui - usa);
        falta -= usa;
      }
      if (falta > 0.001) deCima[res] = falta;
    }
    if (Object.keys(deCima).length > 0) this.stock.spend(deCima);
  }

  /** Progresso visivel do encaixe, 0..1. */
  progress(base: BaseCampDef, slot: StructureSlot): number {
    const st = this.stateOf(base.id, slot.kind);
    if (st.state === 'pronto') return 1;
    if (st.state === 'erguendo') {
      return 1 - st.buildLeft / Math.max(0.001, slot.buildSec);
    }
    if (st.state === 'melhorando') return 1;
    return st.hits / slot.hits;
  }

  /**
   * Progresso da MELHORIA, 0..1, ou null quando nao ha melhoria em vista.
   *
   * Separado do `progress` de proposito: a estrutura continua funcionando
   * enquanto melhora, entao a barra da obra nao serve para contar essa.
   */
  melhoriaProgress(base: BaseCampDef, slot: StructureSlot): number | null {
    const mel = slot.melhoria;
    if (!mel) return null;
    const st = this.stateOf(base.id, slot.kind);
    if ((st.nivel ?? 0) >= 1) return 1;
    if (st.state === 'melhorando') return 1 - st.buildLeft / Math.max(0.001, mel.buildSec);
    if (st.state !== 'pronto') return null;
    return st.hits / mel.hits;
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

  /**
   * Onde fica o BALCAO do deposito de uma base, em pixels de mundo.
   *
   * E o meio do encaixe, em cima do piso da camara — o mesmo ponto onde a arte
   * do deposito esta desenhada. A toupeira anda ate aqui.
   */
  depotPos(base: BaseCampDef, surfaceRow: number, tileSize: number): { x: number; y: number } {
    const slot = base.slots.find((s) => s.kind === 'deposito');
    const col = base.col + (slot?.col ?? 4) + (slot?.tiles ?? 4) / 2;
    return { x: col * tileSize, y: (surfaceRow + base.depth) * tileSize };
  }

  /** Quantos depositos de base ja estao de pe. Cada um abre vaga de toupeira. */
  depotsBuilt(): number {
    return BASE_CAMPS.filter((b) => this.built(b.id, 'deposito')).length;
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
      this.fecharJanela(base.id, dt);

      // --- obra em andamento ---
      for (const slot of base.slots) {
        const st = this.slots.get(this.key(base.id, slot.kind));
        if (!st) continue;
        if (st.state !== 'erguendo' && st.state !== 'melhorando') continue;
        st.buildLeft -= dt;
        if (st.buildLeft > 0) continue;
        const eraMelhoria = st.state === 'melhorando';
        st.state = 'pronto';
        st.buildLeft = 0;
        // Zerar as marteladas e o que abre a proxima etapa: depois da obra,
        // elas passam a contar para a melhoria.
        st.hits = 0;
        if (eraMelhoria) st.nivel = (st.nivel ?? 0) + 1;
        this.reavaliar(base);
        Events.emit(eraMelhoria ? 'base:upgraded' : 'base:built', {
          base: base.id,
          kind: slot.kind,
          nome: slot.nome,
        });
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
      // Esteira melhorada empurra 60% mais bruto para dentro do fogo.
      const alimentacao = temEntrada ? (this.nivelDe(base.id, 'esteira_entrada') >= 1 ? 1.6 : 1) : 0.25;
      // O freio do refinador VELHO agora sai com a melhoria dele, e nao com a
      // casa do capataz. E a maquina que esta velha; e ela que tem conserto.
      const velho = this.nivelDe(base.id, 'refinador') < 1;
      // Alguem cuidando do fogo rende 70% a mais: e trabalho humano, nao
      // upgrade de maquina.
      const maos = this.hasWorker(base.id, 'refino') ? 1.7 : 1;
      const taxa = REFINERY_RATE * (velho ? OLD_REFINERY_PENALTY : 1) * maos * alimentacao * dt;
      let feito = 0;
      const pilha = Array.from(brutos.entries());
      const vez = this.giro.get(base.id) ?? 0;
      for (let i = 0; i < pilha.length; i++) {
        const [res, qtd] = pilha[(vez + i) % pilha.length];
        if (qtd <= 0) continue;
        /*
         * Carvao e combustivel PRIMEIRO, materia-prima DEPOIS.
         *
         * Eu tinha proibido refinar carvao aqui para a maquina nao comer o
         * proprio fogo. So que a Esteira de Entrada custa Coque, e Coque so sai
         * de carvao — entao a base nunca produzia o que ela mesma precisava
         * para crescer. Outra trava dura, pelo caminho oposto da primeira.
         *
         * A regra certa: com o fogo folgado (acima de 25), o excedente de
         * carvao vira Coque. Com o fogo apertado, tudo vai para a fornalha.
         */
        if (res === 'coal' && this.fuelOf(base.id) < 25) continue;
        const receita = REFINE_RECIPES[res];
        if (!receita) continue;
        /*
         * O corte era `usa < 0.01`, e ele matava a refinaria inteira.
         *
         * `usa` e o que cabe NUM QUADRO: com o refinador velho e sem esteira
         * dava 0,0012 por quadro — sempre abaixo de 0,01, sempre pulado. A
         * base parecia acesa e nao produzia nada, nunca, em nenhum cenario.
         * Medido depois do conserto: 400 de carvao viram 160 de Coque.
         *
         * Acumular fracao pequena em ponto flutuante nao tem problema nenhum;
         * o que tinha problema era comparar um valor por quadro com um limiar
         * pensado para valor por segundo.
         */
        const usa = Math.min(qtd, taxa);
        if (usa <= 0) continue;
        brutos.set(res, qtd - usa);
        const saida = this.refinado.get(base.id)!;
        saida.set(receita.out, (saida.get(receita.out) ?? 0) + usa * receita.ratio);
        feito += usa;
        this.giro.set(base.id, (vez + i + 1) % pilha.length);
        break;
      }
      if (feito > 0) {
        this.fuel.set(base.id, Math.max(0, this.fuelOf(base.id) - REFINERY_FUEL_PER_SEC * dt));
      }
      this.marcar(base.id, feito, 0);

      // --- elevador: o que sobe vira moeda la em cima ---
      if (!this.built(base.id, 'elevador')) continue;
      const saida = this.refinado.get(base.id)!;
      const fracao = this.shareOf(base.id);
      for (const [res, qtd] of saida) {
        if (qtd < 1) continue;
        const ritmo = this.hasWorker(base.id, 'elevador') ? 1.8 : 1;
        // Esteira de saida e elevador melhorados somam: uma entrega mais, o
        // outro leva mais de uma vez.
        const cabine = this.nivelDe(base.id, 'elevador') >= 1 ? 1.9 : 1;
        const entrega = this.nivelDe(base.id, 'esteira_saida') >= 1 ? 1.5 : 1;
        const sobe = Math.min(qtd, dt * 1.2 * ritmo * cabine * entrega) * fracao;
        if (sobe < 0.01) continue;
        saida.set(res, qtd - sobe);
        this.marcar(base.id, 0, sobe);
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
        slots[slot.kind] = {
          state: st.state,
          hits: st.hits,
          buildLeft: st.buildLeft,
          nivel: st.nivel ?? 0,
        };
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
          nivel: s.nivel ?? 0,
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
