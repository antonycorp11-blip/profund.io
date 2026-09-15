/** Picaretas: progressao de poder/velocidade e custo de upgrade. */

import type { ResourceId } from './resources';

export interface ToolDef {
  index: number;
  key: string;
  name: string;
  /** Tier: define quais blocos podem ser quebrados (BlockDef.minTool). */
  tier: number;
  /** Dano por golpe. */
  miningPower: number;
  /** Multiplicador de golpes por segundo. */
  miningSpeed: number;
  /** Alcance extra em pixels. */
  rangeBonus: number;
  /** Custo para comprar este nivel (pago do estoque da base). */
  cost: Partial<Record<ResourceId, number>>;
  color: string;
  description: string;
}

export const TOOLS: ToolDef[] = [
  {
    index: 0,
    key: 'pick_old',
    name: 'Picareta do Pai',
    tier: 1,
    miningPower: 10,
    miningSpeed: 1.0,
    rangeBonus: 0,
    cost: {},
    color: '#8a5c34',
    description: 'Velha, gasta, mas ainda corta pedra.',
  },
  {
    index: 1,
    key: 'pick_reinforced',
    name: 'Picareta Reforcada',
    tier: 1,
    miningPower: 17,
    miningSpeed: 1.15,
    rangeBonus: 6,
    cost: { coal: 30, stone: 20 },
    color: '#9a7a4a',
    description: 'Cabo novo, cabeca mais pesada.',
  },
  {
    index: 2,
    key: 'pick_copper',
    name: 'Picareta de Cobre',
    tier: 2,
    miningPower: 27,
    miningSpeed: 1.3,
    rangeBonus: 10,
    cost: { copper: 40, coal: 60 },
    color: '#c0713a',
    description: 'Abre caminho na pedra profunda.',
  },
  {
    index: 3,
    key: 'pick_iron',
    name: 'Picareta de Ferro',
    tier: 3,
    miningPower: 44,
    miningSpeed: 1.45,
    rangeBonus: 14,
    cost: { iron: 35, copper: 60 },
    color: '#c7d0da',
    description: 'Confiavel e resistente.',
  },
  {
    index: 4,
    key: 'pick_deep',
    name: 'Picareta das Profundezas',
    tier: 3,
    miningPower: 70,
    miningSpeed: 1.7,
    rangeBonus: 20,
    cost: { iron: 90, gold: 12 },
    color: '#a88bd8',
    description: 'Feita para o que existe la embaixo.',
  },
];

export function toolAt(index: number): ToolDef {
  return TOOLS[Math.max(0, Math.min(TOOLS.length - 1, index))];
}

export function nextTool(index: number): ToolDef | null {
  return TOOLS[index + 1] ?? null;
}
