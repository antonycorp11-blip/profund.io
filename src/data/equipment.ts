/**
 * Equipamentos.
 *
 * Compra-se com MOEDA, nao com ponto de habilidade. A divisao e essa: ponto
 * vem de jogar (descer, resolver historia, subir de nivel) e e raro;
 * moeda vem da economia (entregar, copias, toupeiras) e e abundante. Cada uma
 * compra um tipo de progresso diferente.
 *
 * Um item por slot ativo de cada vez. Trocar nao custa nada — a escolha e o
 * conteudo, nao a taxa.
 */

import type { Modifier } from '../systems/Attributes';

export type EquipSlot = 'cabeca' | 'corpo' | 'costas' | 'pes';

export interface EquipSlotMeta {
  id: EquipSlot;
  name: string;
  icon: string;
}

export const EQUIP_SLOTS: Record<EquipSlot, EquipSlotMeta> = {
  cabeca: { id: 'cabeca', name: 'Cabeca', icon: '⛑' },
  corpo: { id: 'corpo', name: 'Corpo', icon: '🦺' },
  costas: { id: 'costas', name: 'Costas', icon: '🎒' },
  pes: { id: 'pes', name: 'Pes', icon: '🥾' },
};

export interface EquipDef {
  id: string;
  slot: EquipSlot;
  name: string;
  description: string;
  /** Preco em moedas. */
  cost: number;
  /** Profundidade minima ja alcancada para o item aparecer na loja. */
  requiredDepth: number;
  modifiers: Modifier[];
  icon: string;
}

export const EQUIPMENT: EquipDef[] = [
  // ------------------------------------------------------------- cabeca ---
  {
    id: 'eq_lanterna',
    slot: 'cabeca',
    name: 'Lanterna de Cabeca',
    description: 'Ilumina bem mais do caminho. O escuro para de decidir por voce.',
    cost: 450,
    requiredDepth: 0,
    modifiers: [{ target: 'lightRadius', op: 'percentAdd', value: 0.55 }],
    icon: '🔦',
  },
  {
    id: 'eq_capacete',
    slot: 'cabeca',
    name: 'Capacete Reforcado',
    description: 'Casco de aco: menos dano de criatura e de queda.',
    cost: 1200,
    requiredDepth: 120,
    modifiers: [
      { target: 'defense', op: 'flat', value: 0.12 },
      { target: 'maxHealth', op: 'flat', value: 30 },
    ],
    icon: '⛑',
  },
  {
    id: 'eq_visor',
    slot: 'cabeca',
    name: 'Visor de Prospector',
    description: 'Minerio raro brilha atraves da rocha ao seu redor.',
    cost: 3200,
    requiredDepth: 300,
    modifiers: [
      { target: 'rareOreGlow', op: 'unlock', value: 1 },
      { target: 'rareOreDetectionRadius', op: 'flat', value: 150 },
      { target: 'lightRadius', op: 'percentAdd', value: 0.2 },
    ],
    icon: '👁',
  },

  // -------------------------------------------------------------- corpo ---
  {
    id: 'eq_traje_couro',
    slot: 'corpo',
    name: 'Traje de Couro',
    description: 'Grosso o bastante para o primeiro bicho que te morder.',
    cost: 600,
    requiredDepth: 40,
    modifiers: [
      { target: 'defense', op: 'flat', value: 0.1 },
      { target: 'knockbackResistance', op: 'flat', value: 0.25 },
    ],
    icon: '🦺',
  },
  {
    id: 'eq_traje_placas',
    slot: 'corpo',
    name: 'Traje de Placas',
    description: 'Defesa de verdade, ao preco de andar um pouco mais devagar.',
    cost: 2600,
    requiredDepth: 250,
    modifiers: [
      { target: 'defense', op: 'flat', value: 0.24 },
      { target: 'maxHealth', op: 'flat', value: 60 },
      { target: 'moveSpeed', op: 'percentAdd', value: -0.08 },
    ],
    icon: '🛡',
  },
  {
    /*
     * Este traje custava 5.200 moedas e dois tercos dele nao FAZIA NADA.
     *
     * Ele modificava `fireResistance` e `environmentalResistance`, e os dois
     * estao marcados `live: false` em /data/attributes.ts — nao existe dano de
     * calor nem de ambiente no jogo. A ficha prometia "o calor la embaixo para
     * de cobrar caro" e nao havia calor cobrando nada. Mesma armadilha da
     * mochila a jato, que prometia empuxo e entregava planeio.
     *
     * Enquanto nao existir o sistema de calor, o traje entrega o que a ficha
     * diz, com atributos que o jogo le de verdade. `npm run check` agora
     * impede que qualquer item volte a cobrar moeda por atributo morto.
     */
    id: 'eq_traje_termico',
    slot: 'corpo',
    name: 'Traje Termico',
    description: 'Forro pesado para o fundo: aguenta muito mais castigo e se fecha sozinho.',
    cost: 5200,
    requiredDepth: 700,
    modifiers: [
      { target: 'defense', op: 'flat', value: 0.3 },
      { target: 'maxHealth', op: 'flat', value: 90 },
      { target: 'healthRegeneration', op: 'flat', value: 3 },
      { target: 'moveSpeed', op: 'percentAdd', value: -0.05 },
    ],
    icon: '🔥',
  },

  // ------------------------------------------------------------- costas ---
  {
    id: 'eq_mochila_carga',
    slot: 'costas',
    name: 'Mochila Cargueira',
    description: 'Cabe muito mais antes de precisar voltar.',
    cost: 800,
    requiredDepth: 30,
    modifiers: [
      { target: 'inventoryCapacity', op: 'flat', value: 30 },
      { target: 'carryMovePenalty', op: 'percentAdd', value: -0.2 },
    ],
    icon: '🎒',
  },
  {
    id: 'eq_asas',
    slot: 'costas',
    name: 'Asas de Planador',
    description: 'A queda vira planeio: da para atravessar vao e pousar inteiro.',
    cost: 2200,
    requiredDepth: 180,
    modifiers: [
      { target: 'glide', op: 'unlock', value: 1 },
      { target: 'airControl', op: 'percentAdd', value: 0.5 },
      { target: 'jumpForce', op: 'percentAdd', value: 0.1 },
    ],
    icon: '🪽',
  },
  /*
   * A LINHA DO JATO.
   *
   * Tres modelos no mesmo slot, como toda linha de equipamento daqui: o
   * seguinte nao muda de funcao, muda de TANQUE. O que se compra com a
   * profundidade e tempo de voo, nao um truque novo — assim o jogador aprende
   * o jato uma vez e depois so ganha folga.
   *
   * O primeiro deles nao fazia nada, e por muito tempo: a ficha prometia
   * "empuxo para subir" e os modificadores ligavam o mesmo planeio das asas.
   * Seis mil moedas para repetir um item de duas mil.
   */
  {
    id: 'eq_jato',
    slot: 'costas',
    name: 'Mochila a Jato',
    description: 'Segure PULAR no ar para subir. O tanque e curto e enche no chao.',
    cost: 6000,
    requiredDepth: 400,
    modifiers: [
      { target: 'jetpack', op: 'unlock', value: 1 },
      { target: 'glide', op: 'unlock', value: 1 },
      { target: 'climbSpeed', op: 'percentAdd', value: 0.6 },
      { target: 'climbStamina', op: 'percentAdd', value: 0.8 },
      { target: 'jumpForce', op: 'percentAdd', value: 0.22 },
    ],
    icon: '🚀',
  },
  {
    id: 'eq_jato_duplo',
    slot: 'costas',
    name: 'Jato de Dois Bicos',
    description: 'Mais empuxo e quase o dobro de tanque: da para vencer um poco inteiro.',
    cost: 14000,
    requiredDepth: 900,
    modifiers: [
      { target: 'jetpack', op: 'unlock', value: 1 },
      { target: 'glide', op: 'unlock', value: 1 },
      { target: 'jetFuel', op: 'percentAdd', value: 0.9 },
      { target: 'jetThrust', op: 'percentAdd', value: 0.25 },
      { target: 'climbSpeed', op: 'percentAdd', value: 0.6 },
      { target: 'jumpForce', op: 'percentAdd', value: 0.22 },
    ],
    icon: '🚀',
  },
  {
    id: 'eq_jato_abissal',
    slot: 'costas',
    name: 'Turbina Abissal',
    description: 'Tanque longo o bastante para o abismo deixar de ser um caminho so de ida.',
    cost: 32000,
    requiredDepth: 1500,
    modifiers: [
      { target: 'jetpack', op: 'unlock', value: 1 },
      { target: 'glide', op: 'unlock', value: 1 },
      { target: 'jetFuel', op: 'percentAdd', value: 2.1 },
      { target: 'jetThrust', op: 'percentAdd', value: 0.45 },
      { target: 'climbSpeed', op: 'percentAdd', value: 0.8 },
      { target: 'climbStamina', op: 'percentAdd', value: 1.2 },
      { target: 'jumpForce', op: 'percentAdd', value: 0.3 },
      { target: 'inventoryCapacity', op: 'flat', value: 20 },
    ],
    icon: '🛸',
  },

  // ---------------------------------------------------------------- pes ---
  {
    id: 'eq_botas',
    slot: 'pes',
    name: 'Botas de Aderencia',
    description: 'Agarram na pedra: escalar cansa muito menos.',
    cost: 700,
    requiredDepth: 60,
    modifiers: [
      { target: 'climbStamina', op: 'percentAdd', value: 0.6 },
      { target: 'climbSpeed', op: 'percentAdd', value: 0.2 },
    ],
    icon: '🥾',
  },
  {
    id: 'eq_botas_rapidas',
    slot: 'pes',
    name: 'Botas do Mensageiro',
    description: 'Leves e firmes: voce anda bem mais rapido pela mina.',
    cost: 2400,
    requiredDepth: 200,
    modifiers: [
      { target: 'moveSpeed', op: 'percentAdd', value: 0.25 },
      { target: 'climbSpeed', op: 'percentAdd', value: 0.15 },
    ],
    icon: '👟',
  },
];

export function equipDef(id: string): EquipDef | undefined {
  return EQUIPMENT.find((e) => e.id === id);
}

export function equipmentOfSlot(slot: EquipSlot): EquipDef[] {
  return EQUIPMENT.filter((e) => e.slot === slot);
}
