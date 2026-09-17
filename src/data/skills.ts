/**
 * Arvore de habilidades.
 *
 * Todos os numeros ficam aqui: trocar 10% por 8% nao deve exigir tocar em logica.
 * `position` e em unidades de grade da UI (x = coluna, y = linha dentro da categoria).
 */

import type { Modifier } from '../systems/Attributes';

export type SkillCategory =
  | 'active'
  | 'mining'
  | 'collect'
  | 'movement'
  | 'survival'
  | 'engineering'
  | 'legacy';

export interface CategoryMeta {
  id: SkillCategory;
  name: string;
  /** Fantasia de gameplay que o ramo precisa entregar (spec, item 56). */
  fantasy: string;
  color: string;
  icon: string;
  /** Legado nao usa pontos normais. */
  usesPoints: boolean;
}

export const CATEGORY_ART: Partial<Record<SkillCategory, string>> = {
  mining: 'cat_mining',
  collect: 'cat_collect',
  movement: 'boots',
  legacy: 'legacy_mark',
};

export const CATEGORIES: Record<SkillCategory, CategoryMeta> = {
  /**
   * Habilidades ATIVAS. Nao aparecem na arvore de atributos: elas tem tela
   * propria, porque a pergunta que o jogador faz sobre elas e outra — nao e
   * "quanto isso melhora meu numero", e "o que isso faz quando eu aperto".
   */
  active: {
    id: 'active',
    name: 'Habilidades',
    fantasy: 'Quero um truque na manga quando a rocha nao ceder.',
    color: '#7fb6ff',
    icon: '⚡',
    // Pagas em moeda, nao em ponto: ver /data/activeSkills.ts.
    usesPoints: false,
  },
  mining: {
    id: 'mining',
    name: 'Mineracao',
    fantasy: 'Quero destruir paredes cada vez mais rapido.',
    color: '#ff8a3d',
    icon: '⛏',
    usesPoints: true,
  },
  collect: {
    id: 'collect',
    name: 'Coleta',
    fantasy: 'Quero fazer chover recursos.',
    color: '#ffc453',
    icon: '💎',
    usesPoints: true,
  },
  movement: {
    id: 'movement',
    name: 'Movimento',
    fantasy: 'Quero atravessar a mina com liberdade e achar o que esta escondido.',
    color: '#5aa9e6',
    icon: '👟',
    usesPoints: true,
  },
  survival: {
    id: 'survival',
    name: 'Sobrevivencia',
    fantasy: 'Quero conseguir chegar mais fundo.',
    color: '#e05a5a',
    icon: '🛡',
    usesPoints: true,
  },
  engineering: {
    id: 'engineering',
    name: 'Engenharia',
    fantasy: 'Quero transformar uma mina manual em uma industria.',
    color: '#5ac77d',
    icon: '⚙',
    usesPoints: true,
  },
  legacy: {
    id: 'legacy',
    name: 'Legado',
    fantasy: 'Quero descobrir o que aconteceu com meu pai.',
    color: '#a87ce0',
    icon: '✦',
    usesPoints: false,
  },
};

export interface SkillDef {
  id: string;
  category: SkillCategory;
  branch: string;
  name: string;
  description: string;
  maxLevel: number;
  /** Custo por nivel. Se houver so um valor, vale para todos. */
  cost: number[];
  requiredSkills: string[];
  requiredDepth: number;
  requiredStoryFlag: string | null;
  /** Modificadores por nivel: modifiers[0] vale do nivel 1 em diante. */
  modifiers: Modifier[][];
  /** Texto do efeito transformador (quando nao e so numero). */
  unlockEffect?: string;
  /** Emoji provisorio, usado enquanto nao ha arte. */
  icon: string;
  /** Nome do arquivo em public/art/skills (sem extensao). */
  art?: string;
  position: { x: number; y: number };
}

/**
 * Primeira leva implementada (spec, item 55).
 * O resto da arvore entra depois, sem mudanca de codigo: so dado.
 */
/*
 * O NINHO E UM SO.
 *
 * Cada categoria tinha as proprias raizes soltas, e o resultado na tela eram
 * cinco ilhas boiando num mapa grande sem nada ligando uma na outra — o
 * contrario de um ninho, que e justamente um lugar onde toda camara se alcanca
 * por uma galeria.
 *
 * Agora ha UMA entrada em todo o mapa (Braco Forte I) e cada camara se abre a
 * partir da anterior: mineracao -> coleta -> movimento -> sobrevivencia ->
 * legado. Isso tambem e o que faz a revelacao progressiva ter sentido — cavar
 * um no acende o trecho seguinte em vez de mostrar tudo desde o comeco.
 */
export const SKILLS: SkillDef[] = [
  // ---------------------------------------------------------------- MINERACAO
  {
    id: 'mining_power_1',
    category: 'mining',
    branch: 'forca',
    name: 'Braco Forte I',
    description: 'Cada golpe arranca mais rocha.',
    maxLevel: 1,
    cost: [1],
    requiredSkills: [],
    requiredDepth: 0,
    requiredStoryFlag: null,
    modifiers: [[{ target: 'miningPower', op: 'percentAdd', value: 0.1 }]],
    icon: '💪',
    art: 'power',
    position: { x: 0, y: 1 },
  },
  {
    id: 'mining_power_2',
    category: 'mining',
    branch: 'forca',
    name: 'Braco Forte II',
    description: 'O peso da picareta passa a trabalhar a seu favor.',
    maxLevel: 1,
    cost: [2],
    requiredSkills: ['mining_power_1'],
    requiredDepth: 30,
    requiredStoryFlag: null,
    modifiers: [[{ target: 'miningPower', op: 'percentAdd', value: 0.15 }]],
    icon: '💪',
    art: 'power',
    position: { x: 1, y: 1 },
  },
  {
    id: 'mining_hard_block',
    category: 'mining',
    branch: 'forca',
    name: 'Quebra Rochas',
    description: 'Dano extra contra pedra e blocos duros.',
    maxLevel: 1,
    cost: [2],
    requiredSkills: ['mining_power_2'],
    requiredDepth: 60,
    requiredStoryFlag: null,
    modifiers: [[{ target: 'hardBlockDamage', op: 'percentAdd', value: 0.2 }]],
    icon: '🪨',
    art: 'hardstone',
    position: { x: 2, y: 1 },
  },
  {
    id: 'mining_speed_1',
    category: 'mining',
    branch: 'velocidade',
    name: 'Maos Rapidas I',
    description: 'Menos tempo entre um golpe e o proximo.',
    maxLevel: 1,
    cost: [1],
    requiredSkills: ['mining_power_1'],
    requiredDepth: 0,
    requiredStoryFlag: null,
    modifiers: [[{ target: 'miningSpeed', op: 'percentAdd', value: 0.1 }]],
    icon: '⚡',
    art: 'speed',
    position: { x: 0, y: 2 },
  },
  {
    id: 'mining_speed_2',
    category: 'mining',
    branch: 'velocidade',
    name: 'Maos Rapidas II',
    description: 'A picareta vira extensao do braco.',
    maxLevel: 1,
    cost: [2],
    requiredSkills: ['mining_speed_1'],
    requiredDepth: 30,
    requiredStoryFlag: null,
    modifiers: [[{ target: 'miningSpeed', op: 'percentAdd', value: 0.15 }]],
    icon: '⚡',
    art: 'speed',
    position: { x: 1, y: 2 },
  },
  {
    id: 'mining_ore_bonus',
    category: 'mining',
    branch: 'velocidade',
    name: 'Mineracao Especializada',
    description: 'Voce aprende onde bater num veio.',
    maxLevel: 1,
    cost: [2],
    requiredSkills: ['mining_speed_2'],
    requiredDepth: 45,
    requiredStoryFlag: null,
    modifiers: [[{ target: 'oreDamageBonus', op: 'percentAdd', value: 0.15 }]],
    icon: '🎯',
    art: 'ore_target',
    position: { x: 2, y: 2 },
  },
  {
    id: 'mining_crit_1',
    category: 'mining',
    branch: 'fratura',
    name: 'Ponto Fraco',
    description: 'Voce comeca a enxergar a falha na rocha.',
    maxLevel: 3,
    cost: [1, 1, 2],
    requiredSkills: ['mining_power_1'],
    requiredDepth: 15,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'blockCriticalChance', op: 'flat', value: 0.05 }],
      [{ target: 'blockCriticalChance', op: 'flat', value: 0.05 }],
      [{ target: 'blockCriticalChance', op: 'flat', value: 0.05 }],
    ],
    icon: '✶',
    art: 'crit',
    position: { x: 1, y: 3 },
  },
  {
    id: 'mining_crit_2',
    category: 'mining',
    branch: 'fratura',
    name: 'Golpe Preciso',
    description: 'Criticos arrancam o dobro.',
    maxLevel: 1,
    cost: [2],
    requiredSkills: ['mining_crit_1'],
    requiredDepth: 40,
    requiredStoryFlag: null,
    modifiers: [[{ target: 'blockCriticalMultiplier', op: 'flat', value: 0.4 }]],
    icon: '✷',
    art: 'crit_mult',
    position: { x: 2, y: 3 },
  },
  {
    id: 'mining_fracture_01',
    category: 'mining',
    branch: 'fratura',
    name: 'Fratura',
    description: 'Ao destruir um bloco, ha chance de rachar os quatro vizinhos.',
    maxLevel: 2,
    cost: [3, 3],
    requiredSkills: ['mining_crit_2'],
    requiredDepth: 70,
    requiredStoryFlag: null,
    modifiers: [
      [
        { target: 'fracture', op: 'proc', value: 0.15 },
        { target: 'adjacentBlockDamage', op: 'flat', value: 0.25 },
      ],
      [
        { target: 'fracture', op: 'proc', value: 0.1 },
        { target: 'adjacentBlockDamage', op: 'flat', value: 0.15 },
      ],
    ],
    unlockEffect: 'A rachadura se espalha para os blocos vizinhos.',
    icon: '💥',
    art: 'fracture',
    position: { x: 3, y: 3 },
  },

  {
    id: 'mining_shock',
    category: 'active',
    branch: 'choque',
    name: 'Choque',
    description:
      'Liga uma corrente eletrica na picareta. Ao bater, o raio salta para os blocos ' +
      'em volta — e prefere os do mesmo material, entao veios inteiros caem juntos.',
    maxLevel: 4,
    cost: [2, 2, 3, 3],
    requiredSkills: ['mining_power_1'],
    requiredDepth: 30,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'shockUnlocked', op: 'unlock', value: 1 }],
      [
        { target: 'shockJumps', op: 'flat', value: 2 },
        { target: 'shockPower', op: 'flat', value: 0.12 },
      ],
      [
        { target: 'shockCharges', op: 'flat', value: 2 },
        { target: 'shockCooldown', op: 'flat', value: -4 },
      ],
      [
        { target: 'shockJumps', op: 'flat', value: 3 },
        { target: 'shockRange', op: 'flat', value: 1 },
        { target: 'shockPower', op: 'flat', value: 0.18 },
      ],
    ],
    unlockEffect: 'Botao de habilidade: 3 marteladas com corrente, depois recarrega.',
    icon: '⚡',
    art: 'charged',
    position: { x: 2, y: 3 },
  },

  {
    id: 'mining_drill',
    category: 'active',
    branch: 'broca',
    name: 'Broca',
    description:
      'Acopla uma broca na picareta. Enquanto ligada, cada martelada abre um tunel ' +
      'inteiro na direcao da mira — para o lado, para baixo ou para cima.',
    maxLevel: 4,
    cost: [2, 2, 3, 3],
    requiredSkills: ['mining_speed_1'],
    requiredDepth: 60,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'drillUnlocked', op: 'unlock', value: 1 }],
      [{ target: 'drillDepth', op: 'flat', value: 1 }],
      [
        { target: 'drillCharges', op: 'flat', value: 3 },
        { target: 'drillCooldown', op: 'flat', value: -5 },
      ],
      [
        { target: 'drillHeight', op: 'flat', value: 2 },
        { target: 'drillPower', op: 'percentAdd', value: 0.35 },
      ],
    ],
    unlockEffect: 'Botao de habilidade: 4 marteladas abrindo tunel, depois recarrega.',
    icon: '🛠',
    art: 'power',
    position: { x: 0, y: 2 },
  },
  {
    id: 'mining_blast',
    category: 'active',
    branch: 'detonacao',
    name: 'Detonacao',
    description:
      'Uma carga que arrebenta tudo em volta do bloco atingido — rocha e bicho. Nao e ' +
      'precisao, e forca bruta: serve para abrir camara, limpar um ninho ou sair de ' +
      'uma toca sem saida.',
    maxLevel: 4,
    cost: [3, 3, 4, 4],
    requiredSkills: ['mining_shock'],
    requiredDepth: 200,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'blastUnlocked', op: 'unlock', value: 1 }],
      [
        { target: 'blastRadius', op: 'flat', value: 1 },
        { target: 'blastPower', op: 'flat', value: 0.6 },
      ],
      [
        { target: 'blastCharges', op: 'flat', value: 1 },
        { target: 'blastCooldown', op: 'flat', value: -12 },
      ],
      [
        { target: 'blastRadius', op: 'flat', value: 2 },
        { target: 'blastPower', op: 'flat', value: 1.2 },
      ],
    ],
    unlockEffect: 'Dano em area, em bloco E em criatura.',
    icon: '💥',
    position: { x: 2, y: 4 },
  },
  {
    id: 'explore_sense',
    category: 'active',
    branch: 'faro',
    name: 'Faro',
    description:
      'Encosta o ouvido na pedra e, por alguns segundos, o minerio em volta acende ' +
      'atraves da rocha. Nao quebra nada: so mostra onde vale bater.',
    maxLevel: 3,
    cost: [2, 3, 3],
    requiredSkills: [],
    requiredDepth: 120,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'senseUnlocked', op: 'unlock', value: 1 }],
      [
        { target: 'senseRadius', op: 'flat', value: 8 },
        { target: 'senseDuration', op: 'flat', value: 5 },
      ],
      [
        { target: 'senseRadius', op: 'flat', value: 10 },
        { target: 'senseCooldown', op: 'flat', value: -25 },
      ],
    ],
    unlockEffect: 'Minerio visivel atraves da rocha.',
    icon: '👁',
    position: { x: 3, y: 3 },
  },
  {
    id: 'move_recall',
    category: 'active',
    branch: 'volta',
    name: 'Volta Rapida',
    description:
      'Fica parado alguns segundos e a mina te devolve na base. Levar dano ou sair ' +
      'andando cancela. Serve para nao perder a viagem de volta com a mochila cheia.',
    maxLevel: 3,
    cost: [2, 3, 4],
    requiredSkills: [],
    requiredDepth: 100,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'recallUnlocked', op: 'unlock', value: 1 }],
      [
        { target: 'recallCastTime', op: 'flat', value: -1 },
        { target: 'recallCooldown', op: 'flat', value: -30 },
      ],
      [
        { target: 'recallDive', op: 'unlock', value: 1 },
        { target: 'recallCooldown', op: 'flat', value: -30 },
      ],
    ],
    unlockEffect: 'No ultimo nivel, usar de novo te devolve ao ponto onde voce estava.',
    icon: '⟲',
    art: 'boots',
    position: { x: 1, y: 2 },
  },

  // ------------------------------------------------------------------ COLETA
  {
    id: 'collect_speed_1',
    category: 'collect',
    branch: 'coleta',
    name: 'Coleta Rapida',
    description: 'Os recursos voam mais rapido ate voce.',
    maxLevel: 2,
    cost: [1, 1],
    requiredSkills: ['mining_power_1'],
    requiredDepth: 0,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'pickupSpeed', op: 'percentAdd', value: 0.2 }],
      [{ target: 'pickupSpeed', op: 'percentAdd', value: 0.3 }],
    ],
    icon: '🤲',
    art: 'pickup',
    position: { x: 0, y: 1 },
  },
  {
    id: 'collect_radius_1',
    category: 'collect',
    branch: 'coleta',
    name: 'Maos Ageis',
    description: 'Aumenta a distancia em que os recursos sao puxados.',
    maxLevel: 2,
    cost: [1, 2],
    requiredSkills: ['collect_speed_1'],
    requiredDepth: 10,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'pickupRadius', op: 'percentAdd', value: 0.25 }],
      [{ target: 'pickupRadius', op: 'percentAdd', value: 0.35 }],
    ],
    icon: '🧲',
    art: 'radius',
    position: { x: 1, y: 1 },
  },
  {
    id: 'collect_magnet',
    category: 'collect',
    branch: 'coleta',
    name: 'Ima de Minerio',
    description: 'Tudo que cai no seu raio comeca a vir sozinho, mesmo de mochila cheia.',
    maxLevel: 1,
    cost: [3],
    requiredSkills: ['collect_radius_1'],
    requiredDepth: 50,
    requiredStoryFlag: null,
    modifiers: [
      [
        { target: 'autoPickup', op: 'unlock', value: 1 },
        { target: 'pickupRadius', op: 'percentAdd', value: 0.4 },
      ],
    ],
    unlockEffect: 'Os drops curvam a trajetoria em direcao a voce.',
    icon: '🧲',
    art: 'magnet',
    position: { x: 2, y: 1 },
  },
  {
    id: 'collect_yield_1',
    category: 'collect',
    branch: 'rendimento',
    name: 'Aproveitamento',
    description: 'Voce perde menos material em cada bloco.',
    maxLevel: 2,
    cost: [1, 2],
    requiredSkills: ['collect_speed_1'],
    requiredDepth: 0,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'resourceYield', op: 'percentAdd', value: 0.1 }],
      [{ target: 'resourceYield', op: 'percentAdd', value: 0.15 }],
    ],
    icon: '📦',
    art: 'yield',
    position: { x: 0, y: 2 },
  },
  {
    id: 'collect_extra_drop',
    category: 'collect',
    branch: 'rendimento',
    name: 'Sorte do Mineiro',
    description: 'Chance de um bloco render uma pepita a mais.',
    maxLevel: 3,
    cost: [1, 2, 2],
    requiredSkills: ['collect_yield_1'],
    requiredDepth: 25,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'extraDropChance', op: 'flat', value: 0.08 }],
      [{ target: 'extraDropChance', op: 'flat', value: 0.08 }],
      [{ target: 'doubleDropChance', op: 'flat', value: 0.08 }],
    ],
    icon: '🍀',
    art: 'luck',
    position: { x: 1, y: 2 },
  },
  {
    id: 'collect_jackpot',
    category: 'collect',
    branch: 'rendimento',
    name: 'Jackpot',
    description: 'Chance rara de um veio explodir numa quantidade absurda de recursos.',
    maxLevel: 2,
    cost: [3, 3],
    requiredSkills: ['collect_extra_drop'],
    requiredDepth: 90,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'jackpot', op: 'proc', value: 0.012 }],
      [{ target: 'jackpot', op: 'proc', value: 0.012 }],
    ],
    unlockEffect: 'Flash, som proprio e uma chuva de pepitas na tela.',
    icon: '🎰',
    art: 'jackpot',
    position: { x: 2, y: 2 },
  },
  {
    id: 'collect_capacity_1',
    category: 'collect',
    branch: 'mochila',
    name: 'Mochila Reforcada',
    description: 'Mais espaco antes de precisar subir.',
    maxLevel: 3,
    cost: [1, 2, 2],
    requiredSkills: ['collect_speed_1'],
    requiredDepth: 0,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'inventoryCapacity', op: 'flat', value: 20 }],
      [{ target: 'inventoryCapacity', op: 'flat', value: 25 }],
      [{ target: 'inventoryCapacity', op: 'percentAdd', value: 0.25 }],
    ],
    icon: '🎒',
    art: 'backpack',
    position: { x: 0, y: 3 },
  },
  {
    id: 'collect_weight',
    category: 'collect',
    branch: 'mochila',
    name: 'Organizacao',
    description: 'Recursos comuns ocupam menos espaco.',
    maxLevel: 2,
    cost: [2, 2],
    requiredSkills: ['collect_capacity_1'],
    requiredDepth: 35,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'resourceWeightReduction', op: 'flat', value: 0.15 }],
      [{ target: 'resourceWeightReduction', op: 'flat', value: 0.15 }],
    ],
    icon: '🧰',
    art: 'organize',
    position: { x: 1, y: 3 },
  },

  // --------------------------------------------------- MOVIMENTO / EXPLORACAO
  {
    id: 'move_speed_1',
    category: 'movement',
    branch: 'passo',
    name: 'Velocidade de Movimento',
    description: 'Anda mais rapido. Cada nivel encurta a volta para a base.',
    maxLevel: 4,
    cost: [1, 1, 2, 3],
    requiredSkills: ['collect_speed_1'],
    requiredDepth: 0,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'moveSpeed', op: 'percentAdd', value: 0.12 }],
      [{ target: 'moveSpeed', op: 'percentAdd', value: 0.12 }],
      [{ target: 'moveSpeed', op: 'percentAdd', value: 0.15 }],
      [{ target: 'moveSpeed', op: 'percentAdd', value: 0.18 }],
    ],
    icon: '👟',
    art: 'boots',
    position: { x: 0, y: 1 },
  },
  {
    id: 'move_carry',
    category: 'movement',
    branch: 'passo',
    name: 'Distribuicao de Peso',
    description: 'Carregar muito atrapalha menos.',
    maxLevel: 2,
    cost: [2, 2],
    requiredSkills: ['move_speed_1'],
    requiredDepth: 30,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'carryMovePenalty', op: 'percentAdd', value: -0.3 }],
      [{ target: 'carryMovePenalty', op: 'percentAdd', value: -0.3 }],
    ],
    icon: '⚖',
    art: 'weight',
    position: { x: 1, y: 1 },
  },
  {
    id: 'move_jump_1',
    category: 'movement',
    branch: 'salto',
    name: 'Pernas Fortes',
    description: 'Salto mais alto — e menos poco sem saida.',
    maxLevel: 2,
    cost: [1, 2],
    requiredSkills: ['move_speed_1'],
    requiredDepth: 0,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'jumpForce', op: 'percentAdd', value: 0.1 }],
      [{ target: 'jumpForce', op: 'percentAdd', value: 0.1 }],
    ],
    icon: '🦵',
    art: 'jump',
    position: { x: 0, y: 2 },
  },
  {
    id: 'move_air_control',
    category: 'movement',
    branch: 'salto',
    name: 'Controle Aereo',
    description: 'Corrige melhor a trajetoria no ar.',
    maxLevel: 1,
    cost: [2],
    requiredSkills: ['move_jump_1'],
    requiredDepth: 25,
    requiredStoryFlag: null,
    modifiers: [[{ target: 'airControl', op: 'percentAdd', value: 0.2 }]],
    icon: '🪂',
    art: 'aircontrol',
    position: { x: 1, y: 2 },
  },
  {
    id: 'move_climb_1',
    category: 'movement',
    branch: 'escalada',
    name: 'Escalador',
    description: 'Sobe paredes mais rapido e aguenta mais tempo agarrado.',
    maxLevel: 3,
    cost: [1, 1, 2],
    requiredSkills: ['move_speed_1'],
    requiredDepth: 0,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'climbSpeed', op: 'percentAdd', value: 0.25 }],
      [{ target: 'climbSpeed', op: 'percentAdd', value: 0.25 }],
      [{ target: 'climbSpeed', op: 'percentAdd', value: 0.3 }],
    ],
    icon: '🧗',
    art: 'jump',
    position: { x: 0, y: 4 },
  },
  {
    id: 'move_wall_jump',
    category: 'movement',
    branch: 'escalada',
    name: 'Salto de Parede',
    description: 'Pular agarrado arremessa voce para o lado oposto.',
    maxLevel: 1,
    cost: [3],
    requiredSkills: ['move_climb_1'],
    requiredDepth: 80,
    requiredStoryFlag: null,
    modifiers: [[{ target: 'wallJump', op: 'unlock', value: 1 }]],
    unlockEffect: 'Permite subir pocos verticais em ziguezague.',
    icon: '🧗',
    art: 'aircontrol',
    position: { x: 1, y: 4 },
  },
  {
    id: 'explore_light_1',
    category: 'movement',
    branch: 'exploracao',
    name: 'Lanterna Melhorada',
    description: 'Enxergar mais fundo e o primeiro passo para descer mais fundo.',
    maxLevel: 3,
    cost: [1, 1, 2],
    requiredSkills: ['move_speed_1'],
    requiredDepth: 0,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'lightRadius', op: 'percentAdd', value: 0.2 }],
      [{ target: 'lightRadius', op: 'percentAdd', value: 0.2 }],
      [{ target: 'lightRadius', op: 'percentAdd', value: 0.25 }],
    ],
    icon: '🔦',
    art: 'lantern',
    position: { x: 0, y: 3 },
  },
  {
    id: 'explore_ore_sense',
    category: 'movement',
    branch: 'exploracao',
    name: 'Olhos Treinados',
    description: 'Minerio raro perto de voce passa a brilhar atraves da rocha.',
    maxLevel: 2,
    cost: [2, 2],
    requiredSkills: ['explore_light_1'],
    requiredDepth: 40,
    requiredStoryFlag: null,
    modifiers: [
      [
        { target: 'rareOreGlow', op: 'unlock', value: 1 },
        { target: 'rareOreDetectionRadius', op: 'flat', value: 110 },
      ],
      [{ target: 'rareOreDetectionRadius', op: 'flat', value: 90 }],
    ],
    unlockEffect: 'Ouro e cristais proximos emitem um brilho discreto.',
    icon: '👁',
    art: 'eye',
    position: { x: 1, y: 3 },
  },
  {
    id: 'explore_reach',
    category: 'movement',
    branch: 'exploracao',
    name: 'Braco Longo',
    description: 'Alcanca blocos e objetos de mais longe.',
    maxLevel: 2,
    cost: [1, 2],
    requiredSkills: ['explore_light_1'],
    requiredDepth: 20,
    requiredStoryFlag: null,
    modifiers: [
      [
        { target: 'miningRange', op: 'percentAdd', value: 0.12 },
        { target: 'interactionRange', op: 'percentAdd', value: 0.15 },
      ],
      [
        { target: 'miningRange', op: 'percentAdd', value: 0.12 },
        { target: 'interactionRange', op: 'percentAdd', value: 0.15 },
      ],
    ],
    icon: '📏',
    art: 'reach',
    position: { x: 1, y: 4 },
  },

  // --------------------------------------------------------- SOBREVIVENCIA
  // Existe porque agora a mina morde: criaturas guardam os depositos generosos.
  {
    id: 'survival_vitality',
    category: 'survival',
    branch: 'corpo',
    name: 'Couro Grosso',
    description: 'Anos de mina endurecem o corpo. Mais vida para aguentar o fundo.',
    maxLevel: 3,
    cost: [1, 1, 2],
    requiredSkills: ['move_speed_1'],
    requiredDepth: 0,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'maxHealth', op: 'flat', value: 25 }],
      [{ target: 'maxHealth', op: 'flat', value: 30 }],
      [{ target: 'maxHealth', op: 'flat', value: 45 }],
    ],
    icon: '🫀',
    art: 'weight',
    position: { x: 0, y: 0 },
  },
  {
    id: 'survival_defense',
    category: 'survival',
    branch: 'corpo',
    name: 'Casco de Mineiro',
    description: 'O capacete e o traje absorvem parte de cada golpe.',
    maxLevel: 3,
    cost: [1, 2, 2],
    requiredSkills: ['survival_vitality'],
    requiredDepth: 60,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'defense', op: 'flat', value: 0.08 }],
      [{ target: 'defense', op: 'flat', value: 0.08 }],
      [{ target: 'defense', op: 'flat', value: 0.1 }],
    ],
    icon: '🛡',
    art: 'hardstone',
    position: { x: 1, y: 0 },
  },
  {
    id: 'survival_regen',
    category: 'survival',
    branch: 'corpo',
    name: 'Folego Longo',
    description: 'Voce se recupera enquanto caminha, sem precisar voltar.',
    maxLevel: 2,
    cost: [2, 3],
    requiredSkills: ['survival_defense'],
    requiredDepth: 200,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'healthRegeneration', op: 'flat', value: 1.2 }],
      [{ target: 'healthRegeneration', op: 'flat', value: 1.8 }],
    ],
    icon: '💚',
    art: 'organize',
    position: { x: 2, y: 0 },
  },
  {
    id: 'survival_footing',
    category: 'survival',
    branch: 'corpo',
    name: 'Pe Firme',
    description: 'Criatura nenhuma te arranca do lugar.',
    maxLevel: 2,
    cost: [1, 2],
    requiredSkills: ['survival_vitality'],
    requiredDepth: 100,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'knockbackResistance', op: 'flat', value: 0.3 }],
      [{ target: 'knockbackResistance', op: 'flat', value: 0.35 }],
    ],
    icon: '🥾',
    art: 'boots',
    position: { x: 1, y: 1 },
  },
  {
    id: 'survival_strike',
    category: 'survival',
    branch: 'combate',
    name: 'Picareta de Guerra',
    description: 'A mesma picareta, usada com outra intencao.',
    maxLevel: 3,
    cost: [1, 2, 2],
    requiredSkills: ['survival_vitality'],
    requiredDepth: 0,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'combatDamage', op: 'flat', value: 6 }],
      [{ target: 'combatDamage', op: 'flat', value: 8 }],
      [{ target: 'combatDamage', op: 'percentAdd', value: 0.4 }],
    ],
    icon: '⛏',
    art: 'power',
    position: { x: 0, y: 2 },
  },
  {
    id: 'survival_crit',
    category: 'survival',
    branch: 'combate',
    name: 'Ponto Cego',
    description: 'Voce aprende onde cada criatura e fragil.',
    maxLevel: 2,
    cost: [2, 3],
    requiredSkills: ['survival_strike'],
    requiredDepth: 120,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'combatCriticalChance', op: 'flat', value: 0.1 }],
      [
        { target: 'combatCriticalChance', op: 'flat', value: 0.1 },
        { target: 'combatCriticalMultiplier', op: 'flat', value: 0.5 },
      ],
    ],
    icon: '🎯',
    art: 'crit',
    position: { x: 1, y: 2 },
  },
  {
    id: 'survival_guardian_slayer',
    category: 'survival',
    branch: 'combate',
    name: 'Cacador de Guardioes',
    description: 'O que eles protegem passa a ser seu.',
    maxLevel: 2,
    cost: [3, 4],
    requiredSkills: ['survival_crit'],
    requiredDepth: 300,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'bossDamage', op: 'flat', value: 0.35 }],
      [{ target: 'bossDamage', op: 'flat', value: 0.45 }],
    ],
    unlockEffect: 'Dano extra contra guardioes de deposito.',
    icon: '💀',
    art: 'crit_mult',
    position: { x: 2, y: 2 },
  },

  // ------------------------------------------------------------------ LEGADO
  {
    id: 'explore_cartographer',
    category: 'movement',
    branch: 'exploracao',
    name: 'Cartografo',
    description: 'Voce registra no mapa uma area maior por onde passa.',
    maxLevel: 2,
    cost: [1, 2],
    requiredSkills: ['explore_light_1'],
    requiredDepth: 15,
    requiredStoryFlag: null,
    modifiers: [
      [{ target: 'mapRevealRadius', op: 'flat', value: 96 }],
      [{ target: 'mapRevealRadius', op: 'flat', value: 128 }],
    ],
    icon: '🗺',
    art: 'reach',
    position: { x: 2, y: 3 },
  },
  {
    id: 'legacy_mark',
    category: 'legacy',
    branch: 'legado',
    name: 'Marca do Pai',
    description: 'A primeira prova de que ele esteve aqui. Revela o caminho do Legado.',
    maxLevel: 1,
    cost: [0],
    requiredSkills: ['survival_vitality'],
    requiredDepth: 0,
    requiredStoryFlag: 'clue_marca_do_pai',
    modifiers: [[{ target: 'legacyTreeVisible', op: 'unlock', value: 1 }]],
    unlockEffect: 'Abre a arvore de Legado.',
    icon: '✦',
    art: 'legacy_mark',
    position: { x: 0, y: 2 },
  },
  {
    id: 'legacy_veteran_hands',
    category: 'legacy',
    branch: 'legado',
    name: 'Maos de Veterano',
    description: 'Voce repete os gestos dele sem perceber.',
    maxLevel: 1,
    cost: [0],
    requiredSkills: ['legacy_mark'],
    requiredDepth: 0,
    requiredStoryFlag: 'npc_jonas',
    modifiers: [
      [
        { target: 'miningPower', op: 'percentAdd', value: 0.1 },
        { target: 'miningSpeed', op: 'percentAdd', value: 0.1 },
      ],
    ],
    icon: '🖐',
    art: 'veteran_hand',
    position: { x: 1, y: 2 },
  },
];

const BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

export function skillDef(id: string): SkillDef | undefined {
  return BY_ID.get(id);
}

export function skillsOf(category: SkillCategory): SkillDef[] {
  return SKILLS.filter((s) => s.category === category);
}

export function skillCost(def: SkillDef, level: number): number {
  return def.cost[Math.min(level, def.cost.length - 1)];
}
