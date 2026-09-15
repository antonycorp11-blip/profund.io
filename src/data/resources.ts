/** Recursos coletaveis (o que entra na mochila / estoque da base). */

export type ResourceId =
  | 'stone'
  | 'coal'
  | 'copper'
  | 'iron'
  | 'gold'
  | 'crystal'
  | 'ruby'
  | 'relic'
  | 'voidstone';

export type Rarity = 'comum' | 'incomum' | 'raro' | 'epico';

export interface ResourceDef {
  id: ResourceId;
  name: string;
  /** Valor de venda por unidade. */
  value: number;
  rarity: Rarity;
  /** Cor placeholder (substituivel por sprite depois). */
  color: string;
  accent: string;
  /** Peso na mochila por unidade. */
  weight: number;
  /** Aparece na HUD principal? */
  showInHud: boolean;
  /**
   * Quando definido, o icone e gerado tingindo o icone de outro recurso.
   * Permite criar recursos de camadas profundas sem arte nova.
   */
  tintFrom?: ResourceId;
  tint?: string;
  tintStrength?: number;
}

export const RESOURCES: Record<ResourceId, ResourceDef> = {
  stone: {
    id: 'stone',
    name: 'Pedra',
    value: 1,
    rarity: 'comum',
    color: '#8d8d95',
    accent: '#b6b6be',
    weight: 1,
    showInHud: false,
  },
  coal: {
    id: 'coal',
    name: 'Carvao',
    value: 4,
    rarity: 'comum',
    color: '#2e2e34',
    accent: '#5c5c66',
    weight: 1,
    showInHud: true,
  },
  copper: {
    id: 'copper',
    name: 'Cobre',
    value: 9,
    rarity: 'incomum',
    color: '#c0713a',
    accent: '#e8a56a',
    weight: 1,
    showInHud: true,
  },
  iron: {
    id: 'iron',
    name: 'Ferro',
    value: 16,
    rarity: 'incomum',
    color: '#9aa3ad',
    accent: '#cfd6dd',
    weight: 1,
    showInHud: true,
  },
  gold: {
    id: 'gold',
    name: 'Ouro',
    value: 42,
    rarity: 'raro',
    color: '#d9a828',
    accent: '#ffe08a',
    weight: 1,
    showInHud: false,
  },
  crystal: {
    id: 'crystal',
    name: 'Cristal',
    value: 110,
    rarity: 'epico',
    color: '#8c5ce0',
    accent: '#d3b4ff',
    weight: 1,
    showInHud: false,
  },
  ruby: {
    id: 'ruby',
    name: 'Rubi',
    value: 210,
    rarity: 'epico',
    color: '#c0392b',
    accent: '#ff8a7a',
    weight: 1,
    showInHud: false,
    tintFrom: 'crystal',
    tint: '#e02b2b',
    tintStrength: 0.85,
  },
  relic: {
    id: 'relic',
    name: 'Reliquia',
    value: 380,
    rarity: 'epico',
    color: '#2f9a7a',
    accent: '#9affd8',
    weight: 1,
    showInHud: false,
    tintFrom: 'gold',
    tint: '#2fd0a0',
    tintStrength: 0.8,
  },
  voidstone: {
    id: 'voidstone',
    name: 'Pedra do Vazio',
    value: 640,
    rarity: 'epico',
    color: '#4a2a6a',
    accent: '#c08aff',
    weight: 1,
    showInHud: false,
    tintFrom: 'crystal',
    tint: '#7a2fd0',
    tintStrength: 0.9,
  },
};

export const RESOURCE_ORDER: ResourceId[] = [
  'coal',
  'copper',
  'iron',
  'gold',
  'crystal',
  'ruby',
  'relic',
  'voidstone',
  'stone',
];

export function resourceDef(id: ResourceId): ResourceDef {
  return RESOURCES[id];
}
