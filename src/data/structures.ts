/**
 * Estruturas de automacao construidas pelo jogador.
 *
 * A rede funciona por vizinhanca: cada estrutura entrega no tile seguinte na
 * direcao do transporte. Nao existe grafo global — o item simplesmente anda.
 */

import type { ResourceId } from './resources';

export type StructureType = 'conveyor' | 'lift' | 'storage' | 'refinery' | 'generator';

export interface StructureDef {
  type: StructureType;
  name: string;
  description: string;
  /** Custo em recursos do estoque da base. */
  cost: Partial<Record<ResourceId, number>>;
  /** Tecnologia que libera a construcao. */
  tech: string;
  /** Tiles por segundo que o item percorre dentro desta estrutura. */
  speed: number;
  /** Quantos itens cabem em transito ao mesmo tempo. */
  slots: number;
  /** Capacidade de armazenamento (so armazem). */
  capacity?: number;
  /** Segundos para processar um lote (so refinaria). */
  processTime?: number;
  icon: string;
  color: string;
  /** Pode ser girada? */
  rotatable: boolean;
  /** Energia consumida por segundo enquanto ligada. */
  energyUse: number;
  /** Energia produzida por segundo (gerador). */
  energyOutput?: number;
  /** Combustivel queimado por segundo, tirado do estoque da base. */
  fuel?: { resource: ResourceId; perSecond: number };
}

export const STRUCTURES: Record<StructureType, StructureDef> = {
  conveyor: {
    type: 'conveyor',
    name: 'Esteira',
    description: 'Leva recursos na horizontal. A base de toda a linha.',
    cost: { iron: 4, copper: 3 },
    tech: 'tech_conveyor',
    speed: 2.2,
    slots: 3,
    icon: '▸',
    color: '#c9a227',
    rotatable: true,
    energyUse: 1,
  },
  lift: {
    type: 'lift',
    name: 'Elevador',
    description: 'Sobe recursos na vertical. E o que tira a carga do fundo da mina.',
    cost: { iron: 10, copper: 6 },
    tech: 'tech_lift',
    speed: 1.6,
    slots: 3,
    icon: '▴',
    color: '#5aa9e6',
    rotatable: false,
    energyUse: 2.5,
  },
  storage: {
    type: 'storage',
    name: 'Armazem',
    description: 'Guarda recursos. Pode ser dedicado a um tipo so.',
    cost: { stone: 25, iron: 8 },
    tech: 'tech_storage',
    speed: 0,
    slots: 0,
    capacity: 250,
    icon: '▣',
    color: '#8a6a3f',
    rotatable: false,
    energyUse: 0.5,
  },
  refinery: {
    type: 'refinery',
    name: 'Refinaria',
    description: 'Processa o minerio que passa e rende mais do que entrou.',
    cost: { iron: 35, copper: 30, gold: 4 },
    tech: 'tech_refinery_line',
    speed: 0.9,
    slots: 4,
    processTime: 3.5,
    icon: '⚗',
    color: '#5ac77d',
    rotatable: true,
    energyUse: 6,
  },
  generator: {
    type: 'generator',
    name: 'Gerador',
    description: 'Queima carvao e alimenta a linha. Sem energia, tudo anda devagar.',
    cost: { iron: 45, copper: 35, stone: 60 },
    tech: 'tech_generator',
    speed: 0,
    slots: 0,
    icon: '⚡',
    color: '#ffb02f',
    rotatable: false,
    energyUse: 0,
    energyOutput: 28,
    fuel: { resource: 'coal', perSecond: 0.35 },
  },
};

export const BUILDABLE: StructureType[] = [
  'conveyor',
  'lift',
  'storage',
  'refinery',
  'generator',
];

/** Devolve metade do custo ao remover. */
export const REFUND_RATIO = 0.5;
