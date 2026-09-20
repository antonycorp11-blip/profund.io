import type { ResourceId } from './resources';
export interface SecretDef { id: string; col: number; row: number; roomW: number; roomH: number; barrier: { col: number; row: number }[]; marker: { id: string; label: string }; reward: Partial<Record<ResourceId, number>>; completionFlag?: string }
const R = 18;
export const SECRETS: SecretDef[] = [
  { id: 'secret_marca_pai', col: 49, row: R + 26, roomW: 5, roomH: 4, barrier: [{ col: 46, row: R + 25 }, { col: 46, row: R + 26 }], marker: { id: 'secret_marca_pai', label: 'Parede oca' }, reward: { copper: 6 }, completionFlag: 'secret_marca_pai' },
  { id: 'secret_55m', col: 35, row: R + 55, roomW: 5, roomH: 4, barrier: [{ col: 32, row: R + 54 }], marker: { id: 'secret_55m', label: 'Estoque antigo' }, reward: { copper: 8, coal: 10 } },
  { id: 'secret_150m', col: 75, row: R + 150, roomW: 5, roomH: 4, barrier: [{ col: 72, row: R + 149 }], marker: { id: 'secret_150m', label: 'Abrigo abandonado' }, reward: { coal: 12 } },
  { id: 'secret_250m', col: 30, row: R + 250, roomW: 6, roomH: 4, barrier: [{ col: 27, row: R + 249 }], marker: { id: 'secret_250m', label: 'Galeria lateral' }, reward: { iron: 10 } },
  { id: 'secret_430m', col: 82, row: R + 430, roomW: 5, roomH: 4, barrier: [{ col: 79, row: R + 429 }], marker: { id: 'secret_430m', label: 'Bolsao cristalino' }, reward: { crystal: 3 } },
  { id: 'secret_520m', col: 40, row: R + 520, roomW: 5, roomH: 4, barrier: [{ col: 37, row: R + 519 }], marker: { id: 'secret_520m', label: 'Deposito comercial' }, reward: { iron: 12, copper: 6 } },
];
