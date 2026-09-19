/** Picaretas: progressao de poder/velocidade e custo de upgrade. */

import type { ResourceId } from './resources';

export interface ToolDef {
  index: number;
  key: string;
  name: string;
  /**
   * Sai de uma CIDADE, e nao da oficina.
   *
   * Sem esta marca a oficina venderia as quatro por nada — elas tem `cost`
   * vazio, e "custa nada" e indistinguivel de "posso pagar". Seria um furo
   * direto na regra que sustenta a metade de baixo do jogo.
   */
  daCidade?: boolean;
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
    /*
     * A RESERVA.
     *
     * Esta nao e a picareta que Santiago levou — aquela desceu com ele e nao
     * voltou. Esta e a SEGUNDA, a que ficou na caixa de casa, e e por isso que
     * ela e a pior da lista: e a ferramenta que ninguem escolheu.
     *
     * Ela custa zero e nao tem requisito porque nao foi comprada. Veio junto do
     * caderno e do revolver (ver /data/prologue.ts) — os tres objetos que o pai
     * deixou para tras, e o jogo comeca com os tres na mao.
     */
    index: 0,
    key: 'pick_old',
    name: 'Picareta do Pai',
    tier: 1,
    miningPower: 10,
    miningSpeed: 1.0,
    rangeBonus: 0,
    cost: {},
    color: '#8a5c34',
    description: 'A reserva dele. A boa desceu junto e nao voltou.',
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
    // A melhor picareta pede Barra de Ouro, nao ouro cru — so sai da
    // Refinaria (ver REFINE_RECIPES). E o que da proposito real a linha de
    // automacao: sem refinar, esta picareta nunca fica ao alcance.
    cost: { iron: 90, gold_bar: 6 },
    color: '#a88bd8',
    description: 'Feita para o que existe la embaixo. Precisa de ouro refinado.',
  },
  /*
   * AS PICARETAS DAS CIDADES.
   *
   * Nao se compram. Cada uma sai da confianca de uma cidade, e abaixo dela a
   * rocha nao cede a mais nada (ver /data/cities.ts). Por isso `cost` esta
   * vazio: dinheiro nao resolve, e a loja nao pode ofere-las nem por engano.
   *
   * Elas sao a razao de as cidades serem porteiras, e a razao de as cidades
   * mais fundas existirem — quem nao foi aceito continuou descendo e fundou a
   * propria. Santiago passou por todas.
   */
  {
    index: 5,
    key: 'pick_fundadores',
    daCidade: true,
    name: 'Picareta dos Fundadores',
    tier: 4,
    miningPower: 96,
    miningSpeed: 1.85,
    rangeBonus: 22,
    cost: {},
    color: '#d8a35a',
    description: 'De Blockia. Abaixo dos 600 m, nenhuma outra abre a pedra.',
  },
  {
    index: 6,
    key: 'pick_ferruria',
    daCidade: true,
    name: 'Marreta de Ferruria',
    tier: 5,
    miningPower: 130,
    miningSpeed: 1.95,
    rangeBonus: 24,
    cost: {},
    color: '#c46a3a',
    description: 'De Ferruria. Abaixo dos 980 m, nenhuma outra abre a pedra.',
  },
  {
    index: 7,
    key: 'pick_lumora',
    daCidade: true,
    name: 'Diapasao de Lumora',
    tier: 6,
    miningPower: 168,
    miningSpeed: 2.05,
    rangeBonus: 26,
    cost: {},
    color: '#6fc6d8',
    description: 'De Lumora. Abaixo dos 1.380 m, nenhuma outra abre a pedra.',
  },
  {
    index: 8,
    key: 'pick_vespera',
    daCidade: true,
    name: 'Chave de Vespera',
    tier: 7,
    miningPower: 210,
    miningSpeed: 2.15,
    rangeBonus: 28,
    cost: {},
    color: '#b9a7e8',
    description: 'De Vespera. Abaixo dos 1.720 m, nenhuma outra abre a pedra.',
  },
];

export function toolAt(index: number): ToolDef {
  return TOOLS[Math.max(0, Math.min(TOOLS.length - 1, index))];
}

/**
 * A proxima picareta COMPRAVEL.
 *
 * Pula as das cidades: elas nao tem preco porque nao tem venda. Antes disto a
 * oficina oferecia a Picareta dos Fundadores por zero moedas, e a porteira que
 * segura a metade de baixo do jogo caia no primeiro clique.
 */
export function nextTool(index: number): ToolDef | null {
  for (let i = index + 1; i < TOOLS.length; i++) {
    if (!TOOLS[i].daCidade) return TOOLS[i];
  }
  return null;
}

/** Procura uma picareta pela chave. Usado por quem CONCEDE, nao por quem vende. */
export function toolByKey(key: string): ToolDef | undefined {
  return TOOLS.find((t) => t.key === key);
}
