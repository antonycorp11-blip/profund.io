import { Events } from '../core/events';
import { QUOTA_CONFIG, QUOTA_TIERS, type QuotaEntry } from '../data/quota';
import { Rng } from '../core/rng';
import type { BaseStock } from './BaseStock';
import type { ResourceId } from '../data/resources';
import type { SkillTree } from './SkillTree';
import type { TimeSystem } from './TimeSystem';

export interface QuotaSave {
  week: number;
  entries: QuotaEntry[];
  delivered: Record<string, number>;
  completed: boolean;
  history: { week: number; completed: boolean }[];
}

/**
 * Cota da semana.
 *
 * Conta apenas o que foi entregue DENTRO da semana — o estoque acumulado antes
 * nao conta, senao a cota deixaria de ser um objetivo.
 */
export class QuotaSystem {
  week = 1;
  entries: QuotaEntry[] = [];
  completed = false;
  private delivered = new Map<ResourceId, number>();
  private history: { week: number; completed: boolean }[] = [];

  constructor(
    private stock: BaseStock,
    private clock: TimeSystem,
    private skills: SkillTree,
    private deepest: () => number
  ) {
    this.generate(1);
  }

  /** Gera a cota da semana a partir da profundidade ja alcancada. */
  generate(week: number): void {
    this.week = week;
    this.completed = false;
    this.delivered.clear();

    const rng = new Rng(week * 7919 + 13);
    const deepest = this.deepest();
    const pool = QUOTA_TIERS.filter((t) => t.fromWeek <= week && t.requiredDepth <= deepest);
    const usable = pool.length > 0 ? pool : [QUOTA_TIERS[0]];

    const count = Math.min(
      QUOTA_CONFIG.maxEntries,
      Math.max(QUOTA_CONFIG.minEntries, Math.floor(1 + week / 3))
    );

    const chosen: typeof usable = [];
    const bag = usable.slice();
    for (let i = 0; i < count && bag.length > 0; i++) {
      // Sorteio ponderado: carvao aparece sempre, raros aparecem as vezes.
      let total = bag.reduce((n, t) => n + t.weight, 0);
      let roll = rng.next() * total;
      let pick = 0;
      for (let j = 0; j < bag.length; j++) {
        roll -= bag[j].weight;
        if (roll <= 0) {
          pick = j;
          break;
        }
      }
      chosen.push(bag[pick]);
      bag.splice(pick, 1);
    }

    this.entries = chosen.map((t) => {
      const weeksActive = Math.max(0, week - t.fromWeek);
      const amount = Math.round(t.base * Math.pow(QUOTA_CONFIG.growth, weeksActive));
      return { resource: t.resource, amount };
    });

    Events.emit('quota:new', { week, entries: this.entries });
  }

  progress(resource: ResourceId): number {
    const entry = this.entries.find((e) => e.resource === resource);
    if (!entry) return 0;
    return Math.min(this.delivered.get(resource) ?? 0, entry.amount);
  }

  required(resource: ResourceId): number {
    return this.entries.find((e) => e.resource === resource)?.amount ?? 0;
  }

  get ratio(): number {
    let have = 0;
    let need = 0;
    for (const e of this.entries) {
      have += this.progress(e.resource);
      need += e.amount;
    }
    return need === 0 ? 1 : have / need;
  }

  get isMet(): boolean {
    return this.entries.every((e) => this.progress(e.resource) >= e.amount);
  }

  /** Total pedido, usado para calcular recompensa e multa. */
  private totalRequested(): number {
    return this.entries.reduce((n, e) => n + e.amount, 0);
  }

  /** Chamado a cada entrega (jogador, copia ou linha de automacao). */
  registerDelivery(resource: ResourceId, amount: number): void {
    if (amount <= 0) return;
    this.delivered.set(resource, (this.delivered.get(resource) ?? 0) + amount);
    this.check();
  }

  check(): void {
    const met = this.isMet;
    Events.emit('quota:progress', { completed: met });
    if (!met || this.completed) return;

    this.completed = true;
    const reward = Math.round(this.totalRequested() * QUOTA_CONFIG.rewardPerUnit);
    this.stock.money += reward;
    this.skills.addPoints(QUOTA_CONFIG.rewardPoints, `cota da semana ${this.week}`);
    Events.emit('quota:complete', {
      message: `Cota da semana ${this.week} cumprida! +${reward} moedas. A semana e sua ate virar.`,
      reward,
    });
  }

  /** Virada de semana: fecha a anterior e gera a proxima. */
  onWeekChanged(week: number): void {
    const wasCompleted = this.completed;
    this.history.push({ week: this.week, completed: wasCompleted });
    if (this.history.length > 20) this.history.shift();

    if (!wasCompleted) {
      const penalty = Math.round(
        this.totalRequested() * QUOTA_CONFIG.rewardPerUnit * QUOTA_CONFIG.failPenaltyRatio
      );
      this.stock.money = Math.max(0, this.stock.money - penalty);
      Events.emit('ui:toast', {
        text: `Semana ${this.week} fechou sem a cota. Multa de ${penalty} moedas.`,
        tone: 'warn',
      });
    }
    this.generate(week);
  }

  /** Dias restantes ate a semana virar. */
  daysLeft(): number {
    return Math.max(0, Math.ceil(this.clock.secondsToNextWeek / this.clock.dayLength));
  }

  /** Dia corrente dentro da semana (1..7). */
  dayOfWeek(): number {
    return this.clock.dayOfWeek;
  }

  /** Quanto do dia de hoje ja passou, 0..1. */
  dayProgress(): number {
    return this.clock.dayProgress;
  }

  /** Nome curto da fase do dia, para o jogador se localizar no relogio. */
  phaseLabel(): string {
    const nomes: Record<string, string> = {
      amanhecer: 'amanhecer',
      dia: 'dia',
      entardecer: 'entardecer',
      noite: 'noite',
    };
    return nomes[this.clock.phase] ?? '';
  }

  get title(): string {
    return `Cota da Semana ${this.week}`;
  }

  toJSON(): QuotaSave {
    return {
      week: this.week,
      entries: this.entries,
      delivered: Object.fromEntries(this.delivered) as Record<string, number>,
      completed: this.completed,
      history: this.history,
    };
  }

  fromJSON(data: QuotaSave | undefined): void {
    if (!data) return;
    this.week = data.week ?? 1;
    this.entries = data.entries ?? [];
    this.completed = data.completed ?? false;
    this.delivered = new Map(Object.entries(data.delivered ?? {}) as [ResourceId, number][]);
    this.history = data.history ?? [];
    if (this.entries.length === 0) this.generate(this.week);
  }
}
