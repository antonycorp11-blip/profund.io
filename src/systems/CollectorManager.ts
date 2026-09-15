import { COLLECTOR_CONFIG, COLLECTOR_UPGRADES } from '../data/collectors';
import { Collector } from '../entities/Collector';
import { Events } from '../core/events';
import type { Attributes } from './Attributes';
import type { BaseStock } from './BaseStock';
import type { DropManager } from '../entities/DropManager';
import type { ResourceId } from '../data/resources';
import type { World } from '../world/World';

export interface CollectorSave {
  units: { id: string; index: number; x: number; y: number; delivered: number }[];
  upgrades: Record<string, number>;
}

/**
 * As toupeiras e as melhorias delas.
 *
 * Tudo aqui se paga com MOEDA, nao com ponto de habilidade: comprar ajuda e um
 * gasto de dinheiro, e o dinheiro vem justamente do que elas trazem. O ciclo se
 * fecha sozinho — e por isso o preco sobe rapido a cada unidade.
 */
export class CollectorManager {
  readonly units: Collector[] = [];
  private levels = new Map<string, number>();
  private created = 0;

  constructor(
    private world: World,
    private attrs: Attributes,
    private stock: BaseStock,
    private drops: DropManager,
    private depot: { x: number; y: number },
    private onDelivered?: (r: ResourceId, n: number) => void
  ) {}

  get max(): number {
    return COLLECTOR_CONFIG.maxUnits;
  }

  /** Preco da proxima toupeira. */
  costFor(index = this.units.length): number {
    return Math.round(COLLECTOR_CONFIG.cost * Math.pow(COLLECTOR_CONFIG.costGrowth, index));
  }

  canAfford(): boolean {
    return this.stock.money >= this.costFor();
  }

  levelOf(id: string): number {
    return this.levels.get(id) ?? 0;
  }

  /** Preco da proxima melhoria daquele tipo. */
  upgradeCost(id: string): number {
    const def = COLLECTOR_UPGRADES.find((u) => u.id === id);
    if (!def) return 0;
    return Math.round(def.cost * Math.pow(def.costGrowth, this.levelOf(id)));
  }

  buy(x: number, y: number): Collector | null {
    if (this.units.length >= this.max) {
      Events.emit('ui:toast', { text: 'Toupeiras demais na mina.', tone: 'warn' });
      return null;
    }
    const custo = this.costFor();
    if (this.stock.money < custo) {
      Events.emit('ui:toast', {
        text: `Faltam ${Math.ceil(custo - this.stock.money)} moedas.`,
        tone: 'warn',
      });
      return null;
    }
    this.stock.money -= custo;
    const unit = this.spawn(`toupeira_${this.created}`, this.units.length, x, y);
    Events.emit('ui:toast', {
      text: `Toupeira ${unit.index + 1} contratada.`,
      tone: 'good',
    });
    return unit;
  }

  buyUpgrade(id: string): boolean {
    const def = COLLECTOR_UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    const nivel = this.levelOf(id);
    if (nivel >= def.maxLevel) return false;
    const custo = this.upgradeCost(id);
    if (this.stock.money < custo) {
      Events.emit('ui:toast', {
        text: `Faltam ${Math.ceil(custo - this.stock.money)} moedas.`,
        tone: 'warn',
      });
      return false;
    }
    this.stock.money -= custo;
    this.levels.set(id, nivel + 1);
    this.applyUpgrades();
    Events.emit('ui:toast', { text: `${def.name} nivel ${nivel + 1}.`, tone: 'good' });
    return true;
  }

  /** Reescreve os modificadores a partir dos niveis comprados. */
  private applyUpgrades(): void {
    for (const def of COLLECTOR_UPGRADES) {
      const nivel = this.levelOf(def.id);
      if (nivel <= 0) {
        this.attrs.removeSource(`collector:${def.id}`);
        continue;
      }
      this.attrs.setSource(`collector:${def.id}`, [
        { target: def.target, op: 'percentAdd', value: def.perLevel * nivel },
      ]);
    }
  }

  private spawn(id: string, index: number, x: number, y: number): Collector {
    const unit = new Collector(id, index, this.world, this.attrs, this.depot, x, y);
    this.units.push(unit);
    this.created++;
    return unit;
  }

  update(dt: number): void {
    for (const unit of this.units) {
      unit.update(
        dt,
        (x, y, raio) => this.drops.findNearest(x, y, raio, () => true),
        (x, y, raio, take) =>
          this.drops.collectFor(
            {
              cx: x,
              cy: y,
              radius: raio,
              accepts: () => true,
              add: (r, n) => {
                take(r, n);
                return n;
              },
              isFull: unit.isFull,
            },
            dt
          ),
        (items) => {
          let total = 0;
          for (const [r, n] of items) {
            this.stock.add(r, n);
            this.onDelivered?.(r, n);
            total += n;
          }
          if (total > 0) {
            Events.emit('collector:delivered', {
              index: unit.index,
              total,
              depth: this.world.depthOfPixel(unit.y),
            });
          }
        }
      );
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const unit of this.units) unit.render(ctx);
  }

  toJSON(): CollectorSave {
    return {
      units: this.units.map((u) => u.toJSON()),
      upgrades: Object.fromEntries(this.levels),
    };
  }

  fromJSON(data: CollectorSave | undefined): void {
    if (!data) return;
    this.levels = new Map(Object.entries(data.upgrades ?? {}));
    this.applyUpgrades();
    this.units.length = 0;
    for (const saved of data.units ?? []) {
      const unit = this.spawn(saved.id, saved.index, saved.x, saved.y);
      unit.delivered = saved.delivered ?? 0;
    }
    this.created = Math.max(this.created, this.units.length);
  }
}
