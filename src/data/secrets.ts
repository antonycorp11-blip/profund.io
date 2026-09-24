import type { ResourceId } from './resources';
import { CONFIG } from './config';

/**
 * Salas lacradas. A flag de historia de cada uma e o proprio `id` — e ela que
 * impede a recompensa de sair duas vezes, inclusive depois de recarregar.
 */
export interface SecretDef { id: string; col: number; row: number; roomW: number; roomH: number; marker: { id: string; label: string }; reward: Partial<Record<ResourceId, number>> }

const R = CONFIG.world.surfaceRow;
export const SECRETS: SecretDef[] = [
  // Encostada na parede leste da sala da marca do pai (colunas 36..56), no
  // caminho de quem vem do poco seguindo as marcas: a parede que soa oca.
  { id: 'secret_marca_pai', col: 60, row: R + 26, roomW: 5, roomH: 4, marker: { id: 'secret_marca_pai', label: 'Parede oca' }, reward: { copper: 6 } },
  { id: 'secret_55m', col: 35, row: R + 55, roomW: 5, roomH: 4, marker: { id: 'secret_55m', label: 'Estoque antigo' }, reward: { copper: 8, coal: 10 } },
  { id: 'secret_150m', col: 75, row: R + 150, roomW: 5, roomH: 4, marker: { id: 'secret_150m', label: 'Abrigo abandonado' }, reward: { coal: 12 } },
  { id: 'secret_250m', col: 30, row: R + 250, roomW: 6, roomH: 4, marker: { id: 'secret_250m', label: 'Galeria lateral' }, reward: { iron: 10 } },
  { id: 'secret_430m', col: 82, row: R + 430, roomW: 5, roomH: 4, marker: { id: 'secret_430m', label: 'Bolsao cristalino' }, reward: { crystal: 3 } },
  { id: 'secret_520m', col: 40, row: R + 520, roomW: 5, roomH: 4, marker: { id: 'secret_520m', label: 'Deposito comercial' }, reward: { iron: 12, copper: 6 } },
];

/**
 * O vao de ar da sala, em tiles — a mesma conta do `carveRoom` do WorldGen.
 * A parede e o anel de um tile em volta disto.
 */
export function secretRoomRect(s: SecretDef): { c0: number; c1: number; r0: number; r1: number } {
  const halfW = Math.floor(s.roomW / 2);
  return { c0: s.col - halfW, c1: s.col + halfW, r0: s.row - (s.roomH - 1), r1: s.row };
}
