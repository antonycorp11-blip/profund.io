/**
 * Bestiario.
 *
 * Criaturas guardam os pontos generosos e dao cara a cada camada: a recompensa
 * fica atras delas em vez de espalhada. Combate existe, mas continua secundario
 * — nenhuma criatura persegue o jogador para sempre.
 *
 * Distribuicao: cada bicho aparece em duas camadas vizinhas, entao a troca de
 * fauna acontece ANTES de a rocha mudar. Descer sempre apresenta algo novo.
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
  /** Chance por tentativa de spawn (0 = so nasce como guardiao). */
  spawnWeight: number;
  /** Caixa de colisao. */
  w: number;
  h: number;
  /** Voa: ignora gravidade e persegue em linha reta. */
  flying?: boolean;
  /** Pasta da arte em public/art/creatures (sem o sufixo da animacao). */
  art?: string;
  /** Altura do sprite em pixels de mundo. */
  drawHeight: number;
  /** Cores do desenho vetorial (usado enquanto a arte nao carrega). */
  color: string;
  accent: string;
  /** Recompensa ao derrotar. */
  drops: { resource: ResourceId; min: number; max: number; chance: number }[];
  /** Pontos de habilidade por derrotar (raro: so guardioes). */
  skillPoints?: number;
  tagline: string;
}

export const CREATURES: CreatureDef[] = [
  // ------------------------------------------------- superficie e pedra ---
  {
    id: 'toupeira',
    name: 'Toupeira Mineira',
    layers: ['surface', 'stone'],
    behavior: 'territorial',
    health: 34,
    damage: 6,
    moveSpeed: 54,
    aggroRange: 150,
    attackRange: 28,
    attackCooldown: 1.4,
    spawnWeight: 5,
    w: 26,
    h: 20,
    art: 'toupeira',
    drawHeight: 38,
    color: '#5b4632',
    accent: '#d8c3a5',
    drops: [{ resource: 'coal', min: 1, max: 3, chance: 0.7 }],
    tagline: 'Achou o capacete de alguem e nao devolve.',
  },
  {
    id: 'larva',
    name: 'Larva Palida',
    layers: ['surface', 'stone'],
    behavior: 'passivo',
    health: 48,
    damage: 5,
    moveSpeed: 34,
    aggroRange: 110,
    attackRange: 26,
    attackCooldown: 1.6,
    spawnWeight: 4,
    w: 30,
    h: 18,
    art: 'larva',
    drawHeight: 34,
    color: '#cbb89b',
    accent: '#8a4a4a',
    drops: [{ resource: 'stone', min: 1, max: 3, chance: 0.8 }],
    tagline: 'Nao ataca quem nao a incomoda.',
  },

  // ------------------------------------------------------ pedra e cristal ---
  {
    id: 'morcego',
    name: 'Morcego Rubro',
    layers: ['stone', 'crystal'],
    behavior: 'agressivo',
    health: 26,
    damage: 7,
    moveSpeed: 104,
    aggroRange: 220,
    attackRange: 24,
    attackCooldown: 1,
    spawnWeight: 5,
    w: 22,
    h: 16,
    flying: true,
    art: 'morcego',
    drawHeight: 32,
    color: '#2e2636',
    accent: '#c0392b',
    drops: [{ resource: 'coal', min: 1, max: 2, chance: 0.5 }],
    tagline: 'Vem do escuro sem avisar.',
  },
  {
    id: 'aranha',
    name: 'Aranha Violeta',
    layers: ['stone', 'crystal', 'minerals'],
    behavior: 'agressivo',
    health: 54,
    damage: 10,
    moveSpeed: 86,
    aggroRange: 200,
    attackRange: 28,
    attackCooldown: 1.2,
    spawnWeight: 4,
    w: 28,
    h: 20,
    art: 'aranha',
    drawHeight: 38,
    color: '#4a2f5a',
    accent: '#a06ad0',
    drops: [
      { resource: 'iron', min: 1, max: 2, chance: 0.4 },
      { resource: 'stone', min: 1, max: 2, chance: 0.5 },
    ],
    tagline: 'Fez teia onde voce ia passar.',
  },

  // --------------------------------------------------- cristal e minerais ---
  {
    id: 'cogumelo',
    name: 'Cogumelo Venenoso',
    layers: ['crystal', 'minerals'],
    behavior: 'territorial',
    health: 80,
    damage: 12,
    moveSpeed: 30,
    aggroRange: 120,
    attackRange: 30,
    attackCooldown: 1.5,
    spawnWeight: 4,
    w: 26,
    h: 24,
    art: 'cogumelo',
    drawHeight: 40,
    color: '#8a2f2f',
    accent: '#f0e0c0',
    drops: [{ resource: 'crystal', min: 1, max: 2, chance: 0.35 }],
    tagline: 'Parece parte da caverna, ate se mexer.',
  },
  {
    id: 'cristalino',
    name: 'Casco de Cristal',
    layers: ['crystal', 'minerals', 'ruins'],
    behavior: 'passivo',
    health: 130,
    damage: 14,
    moveSpeed: 44,
    aggroRange: 120,
    attackRange: 28,
    attackCooldown: 1.6,
    spawnWeight: 3,
    w: 30,
    h: 22,
    art: 'cristalino',
    drawHeight: 42,
    color: '#3a4a58',
    accent: '#7fd8e8',
    drops: [
      { resource: 'crystal', min: 1, max: 3, chance: 0.9 },
      { resource: 'iron', min: 1, max: 2, chance: 0.5 },
    ],
    tagline: 'A carapaca e minerio de verdade.',
  },

  // ---------------------------------------------------- minerais e ruinas ---
  {
    id: 'limo',
    name: 'Limo Acido',
    layers: ['minerals', 'ruins', 'magma', 'abyss'],
    behavior: 'agressivo',
    health: 100,
    damage: 16,
    moveSpeed: 58,
    aggroRange: 190,
    attackRange: 28,
    attackCooldown: 1.2,
    spawnWeight: 4,
    w: 28,
    h: 20,
    art: 'limo',
    drawHeight: 36,
    color: '#5aa02f',
    accent: '#cdf05a',
    drops: [
      { resource: 'gold', min: 1, max: 2, chance: 0.4 },
      { resource: 'crystal', min: 1, max: 1, chance: 0.3 },
    ],
    tagline: 'Engoliu alguem que passou por aqui.',
  },

  // ------------------------------------------------------- magma e ruinas ---
  {
    id: 'vespa',
    name: 'Vespa Ignea',
    layers: ['magma', 'ruins'],
    behavior: 'agressivo',
    health: 72,
    damage: 20,
    moveSpeed: 122,
    aggroRange: 240,
    attackRange: 26,
    attackCooldown: 0.9,
    spawnWeight: 3,
    w: 24,
    h: 18,
    flying: true,
    art: 'vespa',
    drawHeight: 34,
    color: '#3a2318',
    accent: '#ff8a2f',
    drops: [{ resource: 'ruby', min: 1, max: 1, chance: 0.3 }],
    tagline: 'O zumbido chega antes dela.',
  },
  {
    id: 'escaravelho',
    name: 'Escaravelho de Magma',
    layers: ['magma', 'ruins', 'abyss'],
    behavior: 'territorial',
    health: 170,
    damage: 24,
    moveSpeed: 62,
    aggroRange: 200,
    attackRange: 32,
    attackCooldown: 1.4,
    spawnWeight: 3,
    w: 32,
    h: 22,
    art: 'escaravelho',
    drawHeight: 48,
    color: '#8a2f18',
    accent: '#ffb02f',
    drops: [
      { resource: 'gold', min: 2, max: 4, chance: 0.6 },
      { resource: 'ruby', min: 1, max: 2, chance: 0.35 },
    ],
    tagline: 'A casca dele derrete picareta ruim.',
  },

  // -------------------------------------------------------- abismo e alem ---
  {
    id: 'alma',
    name: 'Alma Perdida',
    layers: ['ruins', 'abyss', 'portal'],
    behavior: 'agressivo',
    health: 220,
    damage: 30,
    moveSpeed: 94,
    aggroRange: 260,
    attackRange: 28,
    attackCooldown: 1.1,
    spawnWeight: 3,
    w: 22,
    h: 24,
    flying: true,
    art: 'alma',
    drawHeight: 42,
    color: '#2f6a7a',
    accent: '#7fe8ff',
    drops: [
      { resource: 'voidstone', min: 1, max: 1, chance: 0.25 },
      { resource: 'relic', min: 1, max: 1, chance: 0.12 },
    ],
    tagline: 'Alguem que desceu demais e nao voltou.',
  },

  // ----------------------------------------------------------- guardioes ---
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
    w: 34,
    h: 30,
    // Mesma arte do Casco de Cristal, em outro tamanho: o guardiao e o mesmo
    // bicho que cresceu comendo o deposito que protege.
    art: 'cristalino',
    drawHeight: 74,
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
  /** Quadros por segundo das animacoes. */
  fps: { idle: 6, walk: 10, attack: 12, hurt: 10, death: 9 },
  /** Quadros por tira (a folha e 6 x 5). */
  frames: 6,
  /** Lado do quadro nas tiras geradas. */
  frameSize: 96,
};
