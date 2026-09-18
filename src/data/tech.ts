/**
 * Arvore de Pesquisa e Tecnologia.
 *
 * Substitui a contratacao de trabalhadores: aqui saem a Copiadora, as fabricas
 * de refino, os upgrades de picareta e os equipamentos.
 * Custa RECURSO (nao ponto de habilidade) — sao progressoes paralelas.
 */

import type { ResourceId } from './resources';
import type { Modifier } from '../systems/Attributes';

export type TechCategory = 'copias' | 'ferramentas' | 'refino' | 'equipamento';

export interface TechCategoryMeta {
  id: TechCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const TECH_CATEGORIES: Record<TechCategory, TechCategoryMeta> = {
  copias: {
    id: 'copias',
    /*
     * A aba se chama PESQUISA, e nao "Copias".
     *
     * Ela deixou de ser so sobre a copiadora: agora traz as melhorias das
     * toupeiras junto, e "Copias" passou a mentir sobre metade do conteudo. O
     * `id` continua `copias` de proposito — trocar chave de dado por causa de
     * rotulo quebra save e nao arruma nada.
     */
    name: 'Pesquisa',
    description: 'A bancada onde a equipe inteira melhora: copias e toupeiras.',
    icon: '⧉',
    color: '#5ac7d0',
  },
  ferramentas: {
    id: 'ferramentas',
    name: 'Ferramentas',
    description: 'Picaretas e equipamentos de mineracao.',
    icon: '⛏',
    color: '#ff8a3d',
  },
  refino: {
    id: 'refino',
    name: 'Refino',
    description: 'Processar minerio bruto rende mais que vender pedra.',
    icon: '⚗',
    color: '#5ac77d',
  },
  equipamento: {
    id: 'equipamento',
    name: 'Equipamento',
    description: 'Capacete, traje e mochila.',
    icon: '🛡',
    color: '#c45ad0',
  },
};

export interface TechDef {
  /** Ja nasce pesquisada (a maquina existe; usar e que custa). */
  startsResearched?: boolean;
  id: string;
  category: TechCategory;
  name: string;
  description: string;
  cost: Partial<Record<ResourceId, number>>;
  requires: string[];
  /** Profundidade maxima ja alcancada necessaria. */
  requiredDepth: number;
  /** Modificadores permanentes ganhos ao pesquisar. */
  modifiers?: Modifier[];
  /** Chave de desbloqueio lida por outros sistemas. */
  unlocks?: string;
  icon: string;
  position: { x: number; y: number };
}

export const TECHS: TechDef[] = [
  // ------------------------------------------------------------- copias ----
  {
    id: 'tech_cloner',
    category: 'copias',
    name: 'Copiadora',
    description:
      'Uma maquina que le o seu padrao e imprime outro voce. Cada copia mina sozinha. ' +
      'Ela veio com a mina; imprimir cada copia e que custa.',
    /** Ja vem montada: o custo do pilar de automacao esta nas copias, nao aqui. */
    startsResearched: true,
    cost: {},
    requires: [],
    requiredDepth: 0,
    unlocks: 'cloner',
    icon: '⧉',
    position: { x: 0, y: 1 },
  },
  {
    id: 'tech_clone_power',
    category: 'copias',
    name: 'Padrao Reforcado',
    description: 'As copias saem com braco mais firme: mineram mais rapido.',
    cost: { copper: 120, iron: 90 },
    requires: ['tech_cloner'],
    requiredDepth: 90,
    modifiers: [
      { target: 'cloneMiningPower', op: 'percentAdd', value: 0.35 },
      { target: 'cloneMiningSpeed', op: 'percentAdd', value: 0.25 },
    ],
    icon: '💪',
    position: { x: 1, y: 2 },
  },
  {
    id: 'tech_clone_bag',
    category: 'copias',
    name: 'Mochila de Copia',
    description: 'Cada copia carrega mais antes de precisar voltar ao deposito.',
    cost: { coal: 200, iron: 60 },
    requires: ['tech_cloner'],
    requiredDepth: 60,
    modifiers: [{ target: 'cloneCapacity', op: 'flat', value: 40 }],
    icon: '🎒',
    position: { x: 1, y: 3 },
  },
  {
    id: 'tech_clone_speed',
    category: 'copias',
    name: 'Pernas Sinteticas',
    description: 'As copias se movem bem mais rapido entre o veio e o deposito.',
    cost: { crystal: 12, gold: 25 },
    requires: ['tech_clone_bag'],
    requiredDepth: 260,
    modifiers: [{ target: 'cloneMoveSpeed', op: 'percentAdd', value: 0.5 }],
    icon: '👟',
    position: { x: 2, y: 3 },
  },

  // -------------------------------------------------------- ferramentas ----
  {
    id: 'tech_pick_2',
    category: 'ferramentas',
    name: 'Picareta Reforcada',
    description: 'Cabo novo, cabeca mais pesada.',
    cost: { coal: 30, stone: 20 },
    requires: [],
    requiredDepth: 0,
    unlocks: 'tool:1',
    icon: '⛏',
    position: { x: 0, y: 1 },
  },
  {
    id: 'tech_pick_3',
    category: 'ferramentas',
    name: 'Picareta de Cobre',
    description: 'Abre caminho na pedra profunda.',
    cost: { copper: 40, coal: 60 },
    requires: ['tech_pick_2'],
    requiredDepth: 40,
    unlocks: 'tool:2',
    icon: '⛏',
    position: { x: 1, y: 1 },
  },
  {
    id: 'tech_pick_4',
    category: 'ferramentas',
    name: 'Picareta de Ferro',
    description: 'Confiavel e resistente.',
    cost: { iron: 35, copper: 60 },
    requires: ['tech_pick_3'],
    requiredDepth: 150,
    unlocks: 'tool:3',
    icon: '⛏',
    position: { x: 2, y: 1 },
  },
  {
    id: 'tech_pick_5',
    category: 'ferramentas',
    name: 'Picareta das Profundezas',
    description: 'Feita para o que existe la embaixo.',
    cost: { iron: 90, gold: 12, crystal: 6 },
    requires: ['tech_pick_4'],
    requiredDepth: 420,
    unlocks: 'tool:4',
    icon: '⛏',
    position: { x: 3, y: 1 },
  },
  {
    id: 'tech_lamp',
    category: 'ferramentas',
    name: 'Lanterna de Arco',
    description: 'A lanterna do capacete alcanca bem mais longe.',
    cost: { copper: 80, crystal: 5 },
    requires: ['tech_pick_2'],
    requiredDepth: 80,
    modifiers: [{ target: 'lightRadius', op: 'percentAdd', value: 0.35 }],
    icon: '🔦',
    position: { x: 1, y: 2 },
  },

  // ---------------------------------------------------------- automacao ----
  {
    id: 'tech_conveyor',
    category: 'refino',
    name: 'Esteira',
    description:
      'Transporte continuo. As copias jogam a carga nela e a linha leva para cima.',
    cost: { iron: 60, copper: 80 },
    requires: [],
    requiredDepth: 40,
    unlocks: 'build:conveyor',
    icon: '▸',
    position: { x: 0, y: 2 },
  },
  {
    id: 'tech_lift',
    category: 'refino',
    name: 'Elevador de Carga',
    description: 'Sobe recursos na vertical. Tira a carga do fundo sem ninguem carregar.',
    cost: { iron: 120, copper: 90, crystal: 6 },
    requires: ['tech_conveyor'],
    requiredDepth: 120,
    unlocks: 'build:lift',
    icon: '▴',
    position: { x: 1, y: 2 },
  },
  {
    id: 'tech_storage',
    category: 'refino',
    name: 'Armazem',
    description: 'Deposito intermediario. Pode ser dedicado a um unico recurso.',
    cost: { stone: 200, iron: 70 },
    requires: ['tech_conveyor'],
    requiredDepth: 60,
    unlocks: 'build:storage',
    icon: '▣',
    position: { x: 1, y: 3 },
  },
  {
    id: 'tech_refinery_line',
    category: 'refino',
    name: 'Refinaria de Linha',
    description: 'Processa o que passa na esteira e devolve mais do que entrou.',
    cost: { iron: 220, gold: 40, crystal: 20 },
    requires: ['tech_lift', 'tech_refinery'],
    requiredDepth: 260,
    unlocks: 'build:refinery',
    modifiers: [{ target: 'refineryYield', op: 'percentAdd', value: 0.3 }],
    icon: '⚗',
    position: { x: 2, y: 2 },
  },
  {
    id: 'tech_generator',
    category: 'refino',
    name: 'Gerador a Carvao',
    description:
      'A base fornece pouca energia. O gerador queima carvao e sustenta linhas grandes.',
    cost: { iron: 90, copper: 70, stone: 120 },
    requires: ['tech_conveyor'],
    requiredDepth: 70,
    unlocks: 'build:generator',
    icon: '⚡',
    position: { x: 0, y: 3 },
  },
  {
    id: 'tech_energy_eff',
    category: 'refino',
    name: 'Motores Eficientes',
    description: 'Toda a rede consome menos energia.',
    cost: { iron: 150, crystal: 12 },
    requires: ['tech_generator'],
    requiredDepth: 180,
    modifiers: [{ target: 'energyConsumptionReduction', op: 'flat', value: 0.25 }],
    icon: '⚙',
    position: { x: 3, y: 3 },
  },
  {
    id: 'tech_conveyor_speed',
    category: 'refino',
    name: 'Rolamentos Reforcados',
    description: 'Toda a linha corre mais rapido.',
    cost: { iron: 180, gold: 25 },
    requires: ['tech_lift'],
    requiredDepth: 200,
    modifiers: [{ target: 'conveyorSpeed', op: 'percentAdd', value: 0.45 }],
    icon: '⚙',
    position: { x: 2, y: 3 },
  },

  // -------------------------------------------------------------- refino ---
  {
    id: 'tech_refinery',
    category: 'refino',
    name: 'Fornalha',
    description: 'Minerio entregue rende mais moedas.',
    cost: { stone: 150, coal: 120, iron: 20 },
    requires: [],
    requiredDepth: 30,
    modifiers: [{ target: 'deliveryValue', op: 'percentAdd', value: 0.25 }],
    unlocks: 'refinery',
    icon: '⚗',
    position: { x: 0, y: 1 },
  },
  {
    id: 'tech_refinery_2',
    category: 'refino',
    name: 'Refino Avancado',
    description: 'Separacao melhor: mais moeda por carga entregue.',
    cost: { iron: 120, gold: 20 },
    requires: ['tech_refinery'],
    requiredDepth: 220,
    modifiers: [{ target: 'deliveryValue', op: 'percentAdd', value: 0.35 }],
    icon: '⚗',
    position: { x: 1, y: 1 },
  },
];

const BY_ID = new Map(TECHS.map((t) => [t.id, t]));

export function techDef(id: string): TechDef | undefined {
  return BY_ID.get(id);
}

export function techsOf(category: TechCategory): TechDef[] {
  return TECHS.filter((t) => t.category === category);
}
