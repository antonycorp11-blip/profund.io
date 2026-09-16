/**
 * Barramento de eventos do jogo.
 * Regra: sistemas de gameplay EMITEM, UI e Audio ESCUTAM.
 * Nenhum sistema de gameplay deve importar UI diretamente.
 */

import type { ResourceId } from '../data/resources';

export interface GameEvents {
  'block:hit': {
    col: number;
    row: number;
    blockId: number;
    material: string;
    progress: number;
    worldX: number;
    worldY: number;
  };
  'block:break': {
    col: number;
    row: number;
    blockId: number;
    material: string;
    worldX: number;
    worldY: number;
  };
  'block:blocked': { reason: 'tool' | 'indestructible'; requiredTool: number };
  'resource:collect': { resource: ResourceId; amount: number; worldX: number; worldY: number };
  'inventory:full': { resource: ResourceId };
  'delivery:done': { total: number; value: number };
  'quota:progress': { completed: boolean };
  'quota:complete': { message: string; reward: number };
  'quota:new': { week: number; entries: { resource: string; amount: number }[] };
  'tool:upgraded': { index: number; name: string };
  'clue:found': { id: string; title: string; logEntry: string };
  'npc:rescued': { id: string; name: string };
  'dialog:open': { lines: { speaker: string; text: string }[]; onClose?: () => void };
  'ui:toast': { text: string; tone?: 'info' | 'good' | 'warn' | 'story' };
  'player:depth': { meters: number };
  'skill:learned': { id: string; name: string; level: number };
  'skill:points': { total: number; gained: number; reason: string };
  'proc:jackpot': { worldX: number; worldY: number; resource: string; amount: number };
  'proc:critical': { worldX: number; worldY: number; damage: number };
  'map:discovered': { id: string; label: string };
  'time:day': { day: number; week: number; dayOfWeek: number };
  'time:week': { week: number };
  'tech:researched': { id: string; name: string; unlocks: string };
  'clone:created': { id: string; index: number };
  'clone:delivered': { index: number; total: number; money: number; depth: number };
  'collector:delivered': { index: number; total: number; money: number; depth: number };
  'block:regrow': {
    col: number;
    row: number;
    blockId: number;
    worldX: number;
    worldY: number;
  };
  'collector:burrow': { worldX: number; worldY: number; col: number; row: number };
  'automation:delivered': { resource: string; amount: number };
  'creature:killed': {
    id: string;
    name: string;
    guardian: boolean;
    skillPoints: number;
    worldX: number;
    worldY: number;
  };
  /** Um selo entre biomas se abriu porque o chefe da camada foi derrotado. */
  'mission:done': { id: string; title: string; text: string };
  'boss:summon': { id: string; name: string; count: number };
  'gate:opened': { layerId: string; layerName: string };
  'creature:hurt': {
    worldX: number;
    worldY: number;
    damage: number;
    critical: boolean;
    name: string;
  };
  'xp:gained': { amount: number; level: number; ratio: number };
  'level:up': { level: number; points: number };
  'skill:activated': { id: string; charges: number };
  'skill:spent': { id: string };
  'skill:ready': { id: string; name: string };
  'skill:shock': { worldX: number; worldY: number; hits: number };
  'skill:drill': {
    worldX: number;
    worldY: number;
    hits: number;
    dirX: number;
    dirY: number;
  };
  'skill:recall': { from: { x: number; y: number } };
  'player:hurt': { damage: number; health: number; max: number };
  'player:died': { lost: number };
  'player:revived': Record<string, never>;
  'layer:reached': { id: string; name: string; tagline: string };
  'equip:changed': Record<string, never>;
  'save:written': Record<string, never>;
  'game:reset': Record<string, never>;
}

type Handler<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;

class EventBus {
  private handlers = new Map<string, Set<(p: unknown) => void>>();

  on<K extends keyof GameEvents>(event: K, handler: Handler<K>): () => void {
    let set = this.handlers.get(event as string);
    if (!set) {
      set = new Set();
      this.handlers.set(event as string, set);
    }
    set.add(handler as (p: unknown) => void);
    return () => this.off(event, handler);
  }

  off<K extends keyof GameEvents>(event: K, handler: Handler<K>): void {
    this.handlers.get(event as string)?.delete(handler as (p: unknown) => void);
  }

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    const set = this.handlers.get(event as string);
    if (!set) return;
    for (const h of set) h(payload as unknown);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const Events = new EventBus();
