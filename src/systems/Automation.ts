import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import { REFINE_RECIPES, REFUND_RATIO, STRUCTURES, type StructureType } from '../data/structures';
import type { Attributes } from './Attributes';
import type { BaseStock } from './BaseStock';
import type { DropManager } from '../entities/DropManager';
import type { ResourceId } from '../data/resources';
import type { World } from '../world/World';

export interface TransportItem {
  resource: ResourceId;
  amount: number;
  /** 0..1 dentro da estrutura atual. */
  progress: number;
}

export interface Structure {
  id: number;
  type: StructureType;
  col: number;
  row: number;
  /** Direcao horizontal da esteira/refinaria. */
  dir: 1 | -1;
  items: TransportItem[];
  /** Armazem: conteudo e filtro. */
  stored: Map<ResourceId, number>;
  filter: ResourceId | null;
  /** Refinaria: tempo do lote atual. */
  processTimer: number;
  /** Armazem: envia para o estoque da base automaticamente. */
  autoSend: boolean;
  /** Gerador: esta com combustivel? */
  fueled: boolean;
}

export interface AutomationSave {
  structures: {
    id: number;
    type: StructureType;
    col: number;
    row: number;
    dir: 1 | -1;
    filter: ResourceId | null;
    autoSend: boolean;
    stored: Record<string, number>;
  }[];
  nextId: number;
}

/**
 * Rede de automacao.
 *
 * Regra unica: quando um item chega ao fim de uma estrutura, ele e oferecido ao
 * tile seguinte. Se nao houver quem receba, cai no chao — a linha quebrada fica
 * visivel em vez de engolir recurso.
 */
export class Automation {
  private byTile = new Map<number, Structure>();
  private list: Structure[] = [];
  private nextId = 1;

  /** Balanco de energia do ultimo frame (lido pela UI). */
  energy = { produced: 0, demand: 0, efficiency: 1 };

  constructor(
    private world: World,
    private attrs: Attributes,
    private stock: BaseStock,
    private drops: DropManager,
    /** Tiles que entregam direto no estoque da base (deposito). */
    private baseTiles: Set<number>
  ) {}

  private key(col: number, row: number): number {
    return row * this.world.width + col;
  }

  at(col: number, row: number): Structure | undefined {
    return this.byTile.get(this.key(col, row));
  }

  all(): Structure[] {
    return this.list;
  }

  count(type: StructureType): number {
    return this.list.reduce((n, s) => n + (s.type === type ? 1 : 0), 0);
  }

  // ------------------------------------------------------------ construcao --

  canPlace(type: StructureType, col: number, row: number): { ok: boolean; reason?: string } {
    if (!this.world.inBounds(col, row)) return { ok: false, reason: 'Fora do mundo' };
    if (this.at(col, row)) return { ok: false, reason: 'Ja existe algo aqui' };
    if (this.world.isSolid(col, row)) return { ok: false, reason: 'Escave primeiro' };
    if (!this.stock.canAfford(STRUCTURES[type].cost)) {
      return { ok: false, reason: 'Recursos insuficientes' };
    }
    return { ok: true };
  }

  place(type: StructureType, col: number, row: number, dir: 1 | -1 = 1): Structure | null {
    const check = this.canPlace(type, col, row);
    if (!check.ok) {
      if (check.reason) Events.emit('ui:toast', { text: check.reason, tone: 'warn' });
      return null;
    }
    this.stock.spend(STRUCTURES[type].cost);
    const s: Structure = {
      id: this.nextId++,
      type,
      col,
      row,
      dir,
      items: [],
      stored: new Map(),
      filter: null,
      processTimer: 0,
      autoSend: type === 'storage',
      fueled: true,
    };
    this.byTile.set(this.key(col, row), s);
    this.list.push(s);
    return s;
  }

  remove(col: number, row: number): boolean {
    const s = this.at(col, row);
    if (!s) return false;
    // Devolve metade do custo e derruba o que estava guardado.
    for (const [id, qty] of Object.entries(STRUCTURES[s.type].cost)) {
      this.stock.add(id as ResourceId, Math.floor((qty ?? 0) * REFUND_RATIO), false);
    }
    const ts = this.world.tileSize;
    for (const [id, qty] of s.stored) {
      if (qty > 0) this.drops.spawn(col * ts + ts / 2, row * ts + ts / 2, id, Math.min(qty, 5));
    }
    this.byTile.delete(this.key(col, row));
    this.list.splice(this.list.indexOf(s), 1);
    return true;
  }

  rotate(col: number, row: number): void {
    const s = this.at(col, row);
    if (!s || !STRUCTURES[s.type].rotatable) return;
    s.dir = s.dir === 1 ? -1 : 1;
  }

  // ------------------------------------------------------------- transporte --

  /** Insere um item na estrutura do tile, se ela aceitar. Usado pelas copias. */
  insertAt(col: number, row: number, resource: ResourceId, amount: number): number {
    const s = this.at(col, row);
    if (!s) return 0;
    return this.insert(s, resource, amount);
  }

  private insert(s: Structure, resource: ResourceId, amount: number): number {
    const def = STRUCTURES[s.type];

    if (s.type === 'storage') {
      if (s.filter && s.filter !== resource) return 0;
      const total = this.storedTotal(s);
      const free = (def.capacity ?? 0) - total;
      const added = Math.min(amount, free);
      if (added > 0) s.stored.set(resource, (s.stored.get(resource) ?? 0) + added);
      return added;
    }

    if (s.items.length >= def.slots) return 0;
    s.items.push({ resource, amount, progress: 0 });
    return amount;
  }

  storedTotal(s: Structure): number {
    let n = 0;
    for (const v of s.stored.values()) n += v;
    return n;
  }

  /** Tile para onde esta estrutura empurra. */
  private outputTile(s: Structure): { col: number; row: number } {
    if (s.type === 'lift') return { col: s.col, row: s.row - 1 };
    return { col: s.col + s.dir, row: s.row };
  }

  /**
   * Encontra a entrada de rede mais proxima de um ponto.
   * E o que a copia procura quando enche a mochila.
   */
  findInput(x: number, y: number, maxTiles: number): Structure | null {
    const ts = this.world.tileSize;
    const col0 = Math.floor(x / ts);
    const row0 = Math.floor(y / ts);
    let best: Structure | null = null;
    let bestD = maxTiles * maxTiles;
    for (const s of this.list) {
      if (s.type === 'refinery' || s.type === 'generator') continue;
      if (s.type === 'storage' && this.storedTotal(s) >= (STRUCTURES.storage.capacity ?? 0)) continue;
      const dc = s.col - col0;
      const dr = s.row - row0;
      const d = dc * dc + dr * dr;
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  /**
   * Balanco de energia.
   * Falta de energia nao para a linha: ela desacelera proporcionalmente, o que
   * e legivel na tela (as esteiras visivelmente arrastam) e nao quebra o save.
   */
  private updateEnergy(dt: number): void {
    let produced = CONFIG.automation.baseEnergy;
    let demand = 0;
    const reduction = this.attrs.get('energyConsumptionReduction');

    for (const s of this.list) {
      const def = STRUCTURES[s.type];
      if (def.energyOutput) {
        // Gerador queima combustivel do estoque da base.
        if (def.fuel) {
          const need = def.fuel.perSecond * dt;
          s.fueled = this.stock.count(def.fuel.resource) > 0;
          if (s.fueled) {
            s.processTimer += need;
            if (s.processTimer >= 1) {
              const burn = Math.floor(s.processTimer);
              if (this.stock.spend({ [def.fuel.resource]: burn })) s.processTimer -= burn;
              else s.fueled = false;
            }
          }
        }
        if (s.fueled) produced += def.energyOutput;
        continue;
      }
      demand += def.energyUse * (1 - reduction);
    }

    const efficiency = demand <= 0 ? 1 : Math.min(1, produced / demand);
    this.energy = {
      produced,
      demand,
      efficiency: efficiency < CONFIG.automation.minEfficiency ? 0 : efficiency,
    };
  }

  update(dt: number): void {
    this.updateEnergy(dt);
    const speedMult = this.attrs.get('conveyorSpeed') * this.energy.efficiency;
    const yieldMult = this.attrs.get('refineryYield');

    for (const s of this.list) {
      const def = STRUCTURES[s.type];

      if (s.type === 'generator') continue;

      if (s.type === 'storage') {
        if (s.autoSend) this.flushStorage(s, dt);
        continue;
      }

      if (s.type === 'refinery') {
        this.updateRefinery(s, dt * this.energy.efficiency, yieldMult);
        continue;
      }

      const speed = def.speed * speedMult;
      for (let i = s.items.length - 1; i >= 0; i--) {
        const item = s.items[i];
        item.progress += speed * dt;
        if (item.progress < 1) continue;
        if (this.handOff(s, item)) s.items.splice(i, 1);
        else item.progress = 1;
      }
    }
  }

  private updateRefinery(s: Structure, dt: number, yieldMult: number): void {
    if (s.items.length === 0) return;
    s.processTimer += dt;
    const time = STRUCTURES.refinery.processTime ?? 3.5;
    if (s.processTimer < time) return;
    s.processTimer = 0;
    const item = s.items[0];
    const recipe = REFINE_RECIPES[item.resource];
    if (recipe) {
      // Refino de verdade: perde quantidade, ganha tipo (e valor por unidade).
      // O yieldMult das habilidades ainda ajuda, aplicado ANTES da perda da
      // receita — refinar bem continua compensando quem investiu em automacao.
      const bruto = item.amount * yieldMult;
      item.resource = recipe.out;
      item.amount = Math.max(1, Math.round(bruto * recipe.ratio));
    } else {
      // Sem receita: comportamento antigo, so rende mais do mesmo recurso.
      item.amount = Math.max(1, Math.round(item.amount * yieldMult));
    }
    item.progress = 1;
    if (this.handOff(s, item)) s.items.shift();
  }

  /**
   * Entrega o item ao proximo tile. False se ninguem aceitou.
   *
   * Armazem com filtro funciona como SEPARADOR: pega o que e dele e deixa o
   * resto seguir adiante, em vez de entupir a linha.
   */
  private handOff(s: Structure, item: TransportItem): boolean {
    let out = this.outputTile(s);
    const step = s.type === 'lift' ? { dc: 0, dr: -1 } : { dc: s.dir, dr: 0 };

    // Atravessa ate 4 armazens que recusem o item.
    for (let hop = 0; hop < 5; hop++) {
      const key = this.key(out.col, out.row);

      if (this.baseTiles.has(key)) {
        this.stock.add(item.resource, item.amount);
        Events.emit('automation:delivered', { resource: item.resource, amount: item.amount });
        return true;
      }

      const next = this.byTile.get(key);
      if (!next) {
        if (hop > 0) return false; // atras de um armazem cheio: espera
        // Fim de linha sem destino: cai no chao, para o erro ficar visivel.
        const ts = this.world.tileSize;
        this.drops.spawn(out.col * ts + ts / 2, out.row * ts + ts / 2, item.resource, item.amount);
        return true;
      }

      const accepted = this.insert(next, item.resource, item.amount);
      if (accepted >= item.amount) return true;
      if (accepted > 0) {
        item.amount -= accepted;
        return false;
      }

      // Recusou. Se for armazem, tenta passar por cima dele; senao a linha espera.
      if (next.type !== 'storage') return false;
      out = { col: out.col + step.dc, row: out.row + step.dr };
    }
    return false;
  }

  /** Armazem com envio automatico manda para o estoque aos poucos. */
  private flushStorage(s: Structure, dt: number): void {
    s.processTimer += dt;
    if (s.processTimer < CONFIG.automation.storageSendInterval) return;
    s.processTimer = 0;
    for (const [id, qty] of s.stored) {
      if (qty <= 0) continue;
      const send = Math.min(qty, CONFIG.automation.storageSendAmount);
      this.stock.add(id, send);
      s.stored.set(id, qty - send);
      Events.emit('automation:delivered', { resource: id, amount: send });
      return;
    }
  }

  // ------------------------------------------------------------------ save --

  toJSON(): AutomationSave {
    return {
      nextId: this.nextId,
      structures: this.list.map((s) => ({
        id: s.id,
        type: s.type,
        col: s.col,
        row: s.row,
        dir: s.dir,
        filter: s.filter,
        autoSend: s.autoSend,
        stored: Object.fromEntries(s.stored) as Record<string, number>,
      })),
    };
  }

  fromJSON(data: AutomationSave | undefined): void {
    this.byTile.clear();
    this.list.length = 0;
    this.nextId = data?.nextId ?? 1;
    for (const raw of data?.structures ?? []) {
      if (!STRUCTURES[raw.type]) continue;
      const s: Structure = {
        id: raw.id,
        type: raw.type,
        col: raw.col,
        row: raw.row,
        dir: raw.dir,
        items: [],
        stored: new Map(Object.entries(raw.stored ?? {}) as [ResourceId, number][]),
        filter: raw.filter,
        processTimer: 0,
        autoSend: raw.autoSend,
        fueled: true,
      };
      this.byTile.set(this.key(s.col, s.row), s);
      this.list.push(s);
    }
  }
}
