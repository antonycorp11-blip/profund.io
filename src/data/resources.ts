/** Recursos coletaveis (o que entra na mochila / estoque da base). */

export type ResourceId =
  | 'stone'
  | 'coal'
  | 'copper'
  | 'iron'
  | 'gold'
  | 'crystal'
  | 'amber'
  | 'azurite'
  | 'ruby'
  | 'relic'
  | 'voidstone'
  | 'coal_coke'
  | 'gold_bar'
  | 'crystal_prism'
  | 'ammo_round';

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
    /*
     * A PEDRA NAO PESA NA MOCHILA.
     *
     * Ela nao e minerio que se leva para vender: e materia de municao, e o
     * cinturao tritura no lugar. Enquanto pesava, cada tiro disputava espaco
     * com o carvao e o ferro, e o jogador chegava ao chefe com a mochila cheia
     * de pedra e sem o que vender — sendo punido por ter atirado.
     */
    weight: 0,
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
  amber: {
    id: 'amber', name: 'Ambar fossil', value: 26, rarity: 'raro',
    color: '#dc8b27', accent: '#ffe4a3', weight: 1, showInHud: false,
  },
  azurite: {
    id: 'azurite', name: 'Azurita', value: 74, rarity: 'raro',
    color: '#164bc0', accent: '#7ca8ff', weight: 1, showInHud: false,
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

  // --- refinados: so saem da Refinaria, nunca do bloco direto ---
  coal_coke: {
    id: 'coal_coke',
    name: 'Coque',
    value: 14,
    rarity: 'incomum',
    color: '#4a1f1a',
    accent: '#ff6a3a',
    weight: 1,
    showInHud: false,
    tintFrom: 'coal',
    tint: '#ff5a2a',
    tintStrength: 0.7,
  },
  gold_bar: {
    id: 'gold_bar',
    name: 'Barra de Ouro',
    value: 130,
    rarity: 'raro',
    color: '#f0d060',
    accent: '#fff6c8',
    weight: 1,
    showInHud: false,
    tintFrom: 'gold',
    tint: '#fff2a0',
    tintStrength: 0.55,
  },
  /*
   * MUNICAO.
   *
   * Nao sai de bloco nenhum: e fabricada na bancada da base, com ferro. Fica
   * entre os refinados de proposito — ela e a prova de que a base serve para
   * alguma coisa alem de vender pedra. Peso zero: bala pesando na mochila
   * faria o jogador escolher entre levar minerio e sobreviver, e essa nao e
   * uma escolha interessante, e so uma punicao.
   */
  ammo_round: {
    id: 'ammo_round',
    name: 'Municao',
    value: 3,
    rarity: 'incomum',
    color: '#c8a24a',
    accent: '#ffe9a8',
    weight: 0,
    showInHud: false,
    tintFrom: 'iron',
    tint: '#ffd98a',
    tintStrength: 0.6,
  },
  crystal_prism: {
    id: 'crystal_prism',
    name: 'Prisma de Cristal',
    value: 300,
    rarity: 'epico',
    color: '#cfeeff',
    accent: '#ffffff',
    weight: 1,
    showInHud: false,
    tintFrom: 'crystal',
    tint: '#bfe8ff',
    tintStrength: 0.6,
  },
};

export const RESOURCE_ORDER: ResourceId[] = [
  'coal',
  'copper',
  'iron',
  'gold',
  'crystal',
  'amber',
  'azurite',
  'ruby',
  'relic',
  'voidstone',
  'coal_coke',
  'gold_bar',
  'crystal_prism',
  'ammo_round',
  'stone',
];

export function resourceDef(id: ResourceId): ResourceDef {
  return RESOURCES[id];
}
