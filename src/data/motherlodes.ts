import type { ResourceId } from './resources';
export interface MotherlodeDef { id: string; name: string; resource: ResourceId; reserve: number; faceTiles: { col: number; row: number }[]; respawnSec: number; unlockFlag: string; marker: { id: string; col: number; row: number; label: string } }
const R = 18;
export const MOTHERLODES: MotherlodeDef[] = [{ id: 'veio_fundadores', name: 'Veio dos Fundadores', resource: 'iron', reserve: 8000, faceTiles: Array.from({ length: 10 }, (_, i) => ({ col: 108 + i % 5, row: R + 614 + Math.floor(i / 5) })), respawnSec: 90, unlockFlag: 'passagem_blockia', marker: { id: 'veio_fundadores', col: 110, row: R + 614, label: 'Veio dos Fundadores' } }];
