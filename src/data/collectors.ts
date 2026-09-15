/**
 * Toupeiras coletoras.
 *
 * Elas existem por causa de um desperdicio concreto: com a mochila cheia o
 * jogador sobe deixando recurso no chao, e boa parte desse recurso ele nunca
 * volta para buscar. A toupeira e barata, nao mina nada e nao briga com nada —
 * ela so recolhe o que ficou para tras e leva para a base.
 *
 * Por isso ela cava rapido na vertical: o trabalho dela e ir buscar longe e
 * voltar, nao abrir mina.
 */

export const COLLECTOR_CONFIG = {
  /** Preco da primeira, em moedas. */
  cost: 50,
  /** Cada toupeira seguinte custa isto vezes a anterior. */
  costGrowth: 1.45,
  /** Quantas cabem no total (o freio de verdade e o preco). */
  maxUnits: 12,

  /** Velocidade horizontal (px/s). */
  moveSpeed: 96,
  /** Velocidade cavando na vertical: o que elas fazem de melhor. */
  digSpeed: 150,
  /** Quanto mais devagar elas andam dentro da rocha. */
  buriedSpeedRatio: 0.55,
  /** Quanto carregam antes de precisar entregar. */
  capacity: 24,
  /**
   * Raio de busca por recurso no chao (px).
   * Grande de proposito: enquanto houver minerio solto na mina, ha trabalho —
   * elas nunca param com coisa espalhada por ai.
   */
  searchRadius: 100000,
  /** Raio em que recolhem o drop. */
  pickupRadius: 30,
  /** Sem nada para buscar, voltam para o poco e esperam. */
  idlePatrol: 140,
  /** Altura do sprite em pixels de mundo. */
  drawHeight: 38,
  /** Caixa de colisao. */
  w: 22,
  h: 18,
} as const;

export interface CollectorUpgradeDef {
  id: string;
  name: string;
  description: string;
  /** Custo da primeira compra, em moedas. */
  cost: number;
  /** Multiplicador do custo a cada nivel ja comprado. */
  costGrowth: number;
  maxLevel: number;
  /** Quanto cada nivel soma ao atributo correspondente. */
  target:
    | 'collectorSpeed'
    | 'collectorCapacity'
    | 'collectorRange'
    | 'collectorDigSpeed'
    | 'collectorBreak';
  perLevel: number;
  icon: string;
}

/** Melhorias compradas com moeda, dentro da propria tela das toupeiras. */
export const COLLECTOR_UPGRADES: CollectorUpgradeDef[] = [
  {
    id: 'col_speed',
    name: 'Patas Rapidas',
    description: 'Elas andam mais rapido entre um achado e outro.',
    cost: 120,
    costGrowth: 1.7,
    maxLevel: 5,
    target: 'collectorSpeed',
    perLevel: 0.18,
    icon: '🐾',
  },
  {
    id: 'col_dig',
    name: 'Garras de Aco',
    description: 'Atravessam a rocha muito mais rapido, subindo e descendo.',
    cost: 180,
    costGrowth: 1.7,
    maxLevel: 5,
    target: 'collectorDigSpeed',
    perLevel: 0.22,
    icon: '⛏',
  },
  {
    id: 'col_bag',
    name: 'Bolsa de Pele',
    description: 'Cada viagem traz mais coisa da mina.',
    cost: 150,
    costGrowth: 1.75,
    maxLevel: 6,
    target: 'collectorCapacity',
    perLevel: 0.25,
    icon: '🎒',
  },
  {
    id: 'col_break',
    name: 'Dentes de Diamante',
    description:
      'A rocha por onde elas passam comeca a ceder: o tunel fica aberto e o que ' +
      'estava dentro cai no chao para elas mesmas recolherem.',
    cost: 400,
    costGrowth: 2,
    maxLevel: 4,
    target: 'collectorBreak',
    perLevel: 0.3,
    icon: '💎',
  },
  {
    id: 'col_nose',
    name: 'Faro Apurado',
    description: 'Enxergam recurso caido de muito mais longe.',
    cost: 200,
    costGrowth: 1.8,
    maxLevel: 5,
    target: 'collectorRange',
    perLevel: 0.3,
    icon: '👃',
  },
];
