/**
 * Bestiario.
 *
 * Criaturas guardam os pontos generosos e as camadas novas: a recompensa fica
 * atras delas em vez de espalhada. Combate existe, mas continua secundario —
 * nenhuma criatura persegue o jogador para sempre.
 */

import type { ResourceId } from './resources';

export type CreatureBehavior = 'passivo' | 'territorial' | 'agressivo' | 'guardiao';

export interface CreatureDef {
  id: string;
  name: string;
  /** Camadas em que aparece (id de LayerDef). */
  layers: string[];
  behavior: CreatureBehavior;
  health: number;
  /** Dano por golpe no jogador. */
  damage: number;
  moveSpeed: number;
  /** Distancia em que percebe o jogador (px). */
  aggroRange: number;
  /** Distancia em que ataca (px). */
  attackRange: number;
  /** Intervalo entre ataques (s). */
  attackCooldown: number;
  /** Chance por tentativa de spawn. */
  spawnWeight: number;
  /** Largura e altura da caixa. */
  w: number;
  h: number;
  /** Cores do desenho vetorial (arte final depois). */
  color: string;
  accent: string;
  /** Recompensa ao derrotar. */
  drops: { resource: ResourceId; min: number; max: number; chance: number }[];
  /** Pontos de habilidade por derrotar (raro: so guardioes). */
  skillPoints?: number;
  tagline: string;
}

export const CREATURES: CreatureDef[] = [
  {
    id: 'toupeira',
    name: 'Toupeira Subterranea',
    layers: ['surface', 'stone'],
    behavior: 'territorial',
    health: 34,
    damage: 6,
    moveSpeed: 52,
    aggroRange: 150,
    attackRange: 26,
    attackCooldown: 1.4,
    spawnWeight: 5,
    w: 24,
    h: 20,
    color: '#5b4632',
    accent: '#d8c3a5',
    drops: [{ resource: 'coal', min: 1, max: 3, chance: 0.7 }],
    tagline: 'Cava tuneis e nao gosta de visita.',
  },
  {
    id: 'morcego',
    name: 'Morcego de Caverna',
    layers: ['stone', 'crystal'],
    behavior: 'agressivo',
    health: 22,
    damage: 5,
    moveSpeed: 96,
    aggroRange: 210,
    attackRange: 22,
    attackCooldown: 1,
    spawnWeight: 4,
    w: 20,
    h: 16,
    color: '#2e2636',
    accent: '#8a6ac0',
    drops: [{ resource: 'stone', min: 1, max: 2, chance: 0.4 }],
    tagline: 'Vem do escuro sem avisar.',
  },
  {
    id: 'besouro',
    name: 'Besouro Mineral',
    layers: ['crystal', 'minerals'],
    behavior: 'passivo',
    health: 60,
    damage: 8,
    moveSpeed: 40,
    aggroRange: 110,
    attackRange: 26,
    attackCooldown: 1.6,
    spawnWeight: 3,
    w: 28,
    h: 22,
    color: '#3a4a58',
    accent: '#7fd8e8',
    drops: [
      { resource: 'iron', min: 1, max: 3, chance: 0.8 },
      { resource: 'crystal', min: 1, max: 1, chance: 0.25 },
    ],
    tagline: 'A carapaca e mineral de verdade.',
  },
  {
    id: 'verme',
    name: 'Verme das Profundezas',
    layers: ['minerals', 'magma'],
    behavior: 'territorial',
    health: 110,
    damage: 14,
    moveSpeed: 70,
    aggroRange: 190,
    attackRange: 30,
    attackCooldown: 1.3,
    spawnWeight: 3,
    w: 34,
    h: 24,
    color: '#6a2f3a',
    accent: '#e08a6a',
    drops: [
      { resource: 'gold', min: 1, max: 2, chance: 0.5 },
      { resource: 'ruby', min: 1, max: 1, chance: 0.2 },
    ],
    tagline: 'A rocha treme antes dele aparecer.',
  },
  {
    id: 'elemental',
    name: 'Elemental de Magma',
    layers: ['magma', 'ruins'],
    behavior: 'agressivo',
    health: 170,
    damage: 22,
    moveSpeed: 58,
    aggroRange: 230,
    attackRange: 34,
    attackCooldown: 1.5,
    spawnWeight: 2,
    w: 30,
    h: 34,
    color: '#8a2f18',
    accent: '#ffb02f',
    drops: [
      { resource: 'ruby', min: 1, max: 2, chance: 0.6 },
      { resource: 'gold', min: 2, max: 5, chance: 0.5 },
    ],
    tagline: 'Feito do calor que derrete a picareta.',
  },
  {
    id: 'guardiao_cristal',
    name: 'Guardiao de Cristal',
    layers: ['crystal', 'minerals', 'ruins', 'abyss'],
    behavior: 'guardiao',
    health: 260,
    damage: 18,
    moveSpeed: 46,
    aggroRange: 200,
    attackRange: 36,
    attackCooldown: 1.7,
    spawnWeight: 0,
    w: 32,
    h: 40,
    color: '#3f2f5a',
    accent: '#c08aff',
    drops: [
      { resource: 'crystal', min: 3, max: 6, chance: 1 },
      { resource: 'voidstone', min: 1, max: 1, chance: 0.15 },
    ],
    skillPoints: 1,
    tagline: 'Protege o que a mina ainda nao quer entregar.',
  },
];

const BY_ID = new Map(CREATURES.map((c) => [c.id, c]));

export function creatureDef(id: string): CreatureDef | undefined {
  return BY_ID.get(id);
}

export function creaturesOfLayer(layerId: string): CreatureDef[] {
  return CREATURES.filter((c) => c.layers.includes(layerId) && c.spawnWeight > 0);
}

export const CREATURE_CONFIG = {
  /** Maximo de criaturas vivas perto do jogador. */
  maxActive: 8,
  /** Intervalo entre tentativas de spawn (s). */
  spawnInterval: 4,
  /** Distancia minima e maxima de spawn em relacao ao jogador (px). */
  spawnMin: 260,
  spawnMax: 620,
  /** Alem disso a criatura some. */
  despawn: 1100,
  /** Empurrao ao atingir o jogador. */
  knockback: 190,
  /** Invulnerabilidade do jogador apos levar dano (s). */
  playerIFrames: 0.9,
  /** Quanto do que o jogador carrega se perde ao ser resgatado. */
  deathLossRatio: 0.35,
};
