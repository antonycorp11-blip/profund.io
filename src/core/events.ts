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
  /** O jogador bateu no Selo Ancestral. Quem explica o porque e o Game. */
  'seal:hit': { col: number; row: number };
  /** Um selo de historia cedeu: a rocha voltou a ser rocha. */
  'storygate:opened': { id: string };
  'resource:collect': { resource: ResourceId; amount: number; worldX: number; worldY: number };
  'inventory:full': { resource: ResourceId };
  'delivery:done': { total: number; value: number };
  'quota:progress': { completed: boolean };
  'quota:complete': { message: string; reward: number };
  /** A semana virou sem a cota: a mina fecha e a run termina. */
  'quota:failed': { week: number };
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
  /**
   * Um mineiro preso gritou. `strength` 0..1 e o quao perto o jogador esta —
   * e o unico numero que o jogo da: nao ha seta nem distancia em metros,
   * so "esta esquentando".
   */
  'npc:shout': { id: string; x: number; y: number; text: string; strength: number };
  'scroll:found': { id: string; title: string; author: string; layer: string; cron: number; text: string[] };
  /** Obra iniciada: a ultima martelada caiu, agora e tempo. */
  'base:building': { base: string; kind: string; nome: string };
  'base:built': { base: string; kind: string; nome: string };
  'base:upgraded': { base: string; kind: string; nome: string };
  'base:deposit': { base: string; resource: string; amount: number };
  'journal:written': { title: string; novo: boolean };
  'city:met': { id: string; name: string; city: string; trust: number };
  'rep:changed': { city: string; axis: string; value: number };
  'mission:done': { id: string; title: string; text: string };
  /** Uma tela cheia abriu ou fechou. Quem coordena e /ui/Telas.ts. */
  'tela:aberta': { nome: string };
  'tela:fechada': { nome: string };
  'boss:summon': { id: string; name: string; count: number };
  /**
   * O guardiao viu o jogador. A luta comecou de verdade.
   *
   * Emitido uma vez por encontro, no instante em que o chefe engaja — nao ao
   * entrar na camara. Quem desce so para olhar a arena nao dispara nada.
   */
  'boss:engaged': {
    id: string;
    name: string;
    tagline: string;
    health: number;
    maxHealth: number;
    enrageAt: number;
  };
  /** Vida do chefe mudou. So enquanto a luta esta em curso. */
  'boss:health': { id: string; health: number; maxHealth: number };
  /** O chefe virou. Passou do limiar e mudou de comportamento. */
  'boss:enraged': { id: string; name: string };
  /** O chefe caiu, ou o jogador sumiu e o encontro esfriou. */
  'boss:ended': { id: string; defeated: boolean };
  /** Chefe caiu mas o selo nao abriu: ha missao pendente na faixa. */
  'gate:blocked': { layerId: string; faltam: string[] };
  'gate:opened': { layerId: string; layerName: string };
  'creature:hurt': {
    worldX: number;
    worldY: number;
    damage: number;
    critical: boolean;
    name: string;
  };
  /** Um tiro saiu: a HUD pisca o contador e o audio toca o estampido. */
  'weapon:fired': { id: string; x: number; y: number };
  /** Municao fabricada na base. */
  'ammo:crafted': { amount: number };
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
