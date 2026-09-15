/**
 * Cota semanal.
 *
 * A empresa pede uma quantidade que escala a cada semana. Cumprida a cota, a
 * semana continua livre — o jogador minera o que quiser ate ela virar.
 * Semana nova, cota nova e maior.
 */

import type { ResourceId } from './resources';

export interface QuotaEntry {
  resource: ResourceId;
  amount: number;
}

export interface QuotaTierDef {
  /** Semana a partir da qual este conjunto de recursos pode ser pedido. */
  fromWeek: number;
  /** Profundidade maxima ja alcancada necessaria para o recurso entrar. */
  requiredDepth: number;
  resource: ResourceId;
  /** Quantidade base na primeira semana em que aparece. */
  base: number;
  /** Peso na escolha (maior = pedido com mais frequencia). */
  weight: number;
}

export const QUOTA_CONFIG = {
  /** Quantas linhas a cota pede. Cresce com as semanas. */
  minEntries: 1,
  maxEntries: 4,
  /** Crescimento por semana da quantidade pedida. */
  growth: 1.22,
  /** Recompensa em moedas por unidade pedida. */
  rewardPerUnit: 3.2,
  /** Pontos de habilidade por cota cumprida. */
  rewardPoints: 2,
  /** Multa em moedas por semana nao cumprida (proporcional a cota). */
  failPenaltyRatio: 0.4,
};

export const QUOTA_TIERS: QuotaTierDef[] = [
  { fromWeek: 1, requiredDepth: 0, resource: 'coal', base: 90, weight: 5 },
  { fromWeek: 1, requiredDepth: 20, resource: 'stone', base: 120, weight: 2 },
  { fromWeek: 2, requiredDepth: 55, resource: 'copper', base: 45, weight: 4 },
  { fromWeek: 3, requiredDepth: 120, resource: 'iron', base: 35, weight: 4 },
  { fromWeek: 5, requiredDepth: 220, resource: 'crystal', base: 14, weight: 3 },
  { fromWeek: 6, requiredDepth: 260, resource: 'gold', base: 18, weight: 3 },
  { fromWeek: 9, requiredDepth: 900, resource: 'ruby', base: 10, weight: 2 },
  { fromWeek: 12, requiredDepth: 1300, resource: 'relic', base: 8, weight: 2 },
  { fromWeek: 15, requiredDepth: 1700, resource: 'voidstone', base: 6, weight: 2 },
];
