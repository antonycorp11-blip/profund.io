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
  /** Moedas pagas ao derrotar (chefes de bioma). */
  moneyReward?: number;
  /**
   * Id da camada que este chefe tranca. Presente SO nos 6 chefes de bioma —
   * e o que o BiomeGate usa para saber qual selo abrir quando `creature:killed`
   * dispara. Nunca aparece em criatura ambiente nem no guardiao de veio.
   */
  bossOfLayer?: string;
  /**
   * Mecanica de chefe. Ausente em criatura comum.
   *
   * Sao tres pecas, e cada uma existe por um motivo diferente: a furia da a
   * virada de luta, a investida obriga o jogador a sair do lugar (senao a
   * briga vira trocar golpe parado), e a convocacao lembra de quem o chefe e
   * — ele foi posto ali para comandar a barreira, nao para brigar sozinho.
   */
  boss?: {
    /** Fracao de vida em que entra em furia (0.4 = 40%). */
    enrageAt: number;
    enrageSpeed: number;
    enrageDamage: number;
    /** Multiplicador do intervalo entre golpes na furia (menor = mais rapido). */
    enrageCooldown: number;
    /** Investida telegrafada: intervalo, tempo de preparo e velocidade. */
    chargeEverySec: number;
    chargeWindupSec: number;
    chargeSpeed: number;
    /** Convoca lacaios: intervalo, qual bicho, quantos por vez e o teto vivo. */
    summonEverySec: number;
    summonId: string;
    summonCount: number;
    summonMax: number;
  };
  tagline: string;
}

/*
 * A Toupeira Mineira saiu daqui: ela virou ajudante, nao inimigo. Recolhe o
 * que o jogador deixou para tras quando a mochila encheu — ver /data/collectors.
 * A arte dela continua em public/art/creatures/toupeira_*.
 */
export const CREATURES: CreatureDef[] = [
  // ------------------------------------------------- superficie e pedra ---
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

  // ------------------------------------------------- chefes de bioma ------
  /*
   * Um por camada gerada (exceto a superficie). Nascem fixos na arena que o
   * WorldGen esculpe dentro do selo daquela camada — nunca como spawn
   * ambiente. Ver /systems/BiomeGate.ts: matar o chefe + resgatar todos os
   * mineiros da mesma camada e a UNICA forma de abrir o selo e descer.
   *
   * A progressao deles conta uma historia por baixo da mecanica: a mina nao
   * e so geologia. Alguem — ou algo — construiu isto, e vinha reagindo a cada
   * intruso muito antes do seu pai chegar.
   */
  {
    id: 'boss_golem_escombros',
    name: 'Mae dos Esporos',
    layers: ['stone'],
    behavior: 'guardiao',
    health: 190,
    damage: 12,
    moveSpeed: 42,
    aggroRange: 320,
    attackRange: 40,
    attackCooldown: 1.9,
    spawnWeight: 0,
    w: 44,
    h: 40,
    art: 'cogumelo',
    drawHeight: 72,
    color: '#6b8f4a',
    accent: '#d8f0a0',
    drops: [
      { resource: 'coal', min: 6, max: 10, chance: 1 },
      { resource: 'iron', min: 2, max: 4, chance: 0.6 },
    ],
    skillPoints: 2,
    moneyReward: 500,
    boss: {
      enrageAt: 0.4,
      enrageSpeed: 1.5,
      enrageDamage: 1.25,
      enrageCooldown: 0.6,
      chargeEverySec: 7,
      chargeWindupSec: 0.7,
      chargeSpeed: 260,
      summonEverySec: 14,
      summonId: 'larva',
      summonCount: 1,
      summonMax: 2,
    },
    bossOfLayer: 'stone',
    tagline: 'Blockia semeou os esporos na fronteira. Nada pessoal: ninguem sobe.',
  },
  {
    id: 'boss_arauto_quartzo',
    name: 'Matriarca de Cristal',
    layers: ['crystal'],
    behavior: 'guardiao',
    health: 700,
    damage: 30,
    moveSpeed: 54,
    aggroRange: 360,
    attackRange: 46,
    attackCooldown: 1.5,
    spawnWeight: 0,
    w: 46,
    h: 48,
    art: 'aranha',
    drawHeight: 80,
    color: '#8c5ce0',
    accent: '#e0c8ff',
    drops: [
      { resource: 'crystal', min: 4, max: 8, chance: 1 },
      { resource: 'gold', min: 2, max: 4, chance: 0.5 },
    ],
    skillPoints: 2,
    moneyReward: 1100,
    boss: {
      enrageAt: 0.4,
      enrageSpeed: 1.5,
      enrageDamage: 1.25,
      enrageCooldown: 0.6,
      chargeEverySec: 7,
      chargeWindupSec: 0.7,
      chargeSpeed: 260,
      summonEverySec: 12,
      summonId: 'aranha',
      summonCount: 2,
      summonMax: 3,
    },
    bossOfLayer: 'crystal',
    tagline: 'As teias sao antigas. Quem as plantou queria a rota fechada.',
  },
  {
    id: 'boss_automato_enferrujado',
    name: 'Rainha Escavadora',
    layers: ['minerals'],
    behavior: 'guardiao',
    health: 1150,
    damage: 42,
    moveSpeed: 48,
    aggroRange: 380,
    attackRange: 50,
    attackCooldown: 1.7,
    spawnWeight: 0,
    w: 50,
    h: 58,
    art: 'larva',
    drawHeight: 88,
    color: '#c8a070',
    accent: '#ffe0b0',
    drops: [
      { resource: 'iron', min: 8, max: 14, chance: 1 },
      { resource: 'gold', min: 3, max: 6, chance: 0.6 },
    ],
    skillPoints: 3,
    moneyReward: 1900,
    boss: {
      enrageAt: 0.4,
      enrageSpeed: 1.5,
      enrageDamage: 1.25,
      enrageCooldown: 0.6,
      chargeEverySec: 7,
      chargeWindupSec: 0.7,
      chargeSpeed: 260,
      summonEverySec: 11,
      summonId: 'larva',
      summonCount: 2,
      summonMax: 4,
    },
    bossOfLayer: 'minerals',
    tagline: 'Criada em cativeiro e solta na rota comercial. Blockia nunca admitiu.',
  },
  {
    id: 'boss_fundidor_incandescente',
    name: 'Escaravelho Colossal',
    layers: ['magma'],
    behavior: 'guardiao',
    health: 1750,
    damage: 58,
    moveSpeed: 50,
    aggroRange: 400,
    attackRange: 54,
    attackCooldown: 1.8,
    spawnWeight: 0,
    w: 56,
    h: 62,
    art: 'escaravelho',
    drawHeight: 96,
    color: '#c24a1e',
    accent: '#ffb070',
    drops: [
      { resource: 'gold', min: 6, max: 12, chance: 1 },
      { resource: 'ruby', min: 2, max: 4, chance: 0.55 },
    ],
    skillPoints: 3,
    moneyReward: 3000,
    boss: {
      enrageAt: 0.4,
      enrageSpeed: 1.5,
      enrageDamage: 1.25,
      enrageCooldown: 0.6,
      chargeEverySec: 7,
      chargeWindupSec: 0.7,
      chargeSpeed: 260,
      summonEverySec: 10,
      summonId: 'vespa',
      summonCount: 2,
      summonMax: 4,
    },
    bossOfLayer: 'magma',
    tagline: 'Ferruria chama de "controle de acesso". Os mineiros chamam de outra coisa.',
  },
  {
    id: 'boss_escriba_selado',
    name: 'Colosso Prismatico',
    layers: ['ruins'],
    behavior: 'guardiao',
    health: 2500,
    damage: 74,
    moveSpeed: 46,
    aggroRange: 420,
    attackRange: 58,
    attackCooldown: 1.9,
    spawnWeight: 0,
    w: 52,
    h: 66,
    art: 'cristalino',
    drawHeight: 104,
    color: '#2f9a7a',
    accent: '#9affd8',
    drops: [
      { resource: 'relic', min: 2, max: 3, chance: 0.8 },
      { resource: 'crystal', min: 5, max: 9, chance: 0.7 },
    ],
    skillPoints: 4,
    moneyReward: 4600,
    boss: {
      enrageAt: 0.4,
      enrageSpeed: 1.5,
      enrageDamage: 1.25,
      enrageCooldown: 0.6,
      chargeEverySec: 7,
      chargeWindupSec: 0.7,
      chargeSpeed: 260,
      summonEverySec: 10,
      summonId: 'cristalino',
      summonCount: 2,
      summonMax: 3,
    },
    bossOfLayer: 'ruins',
    tagline: 'Lumora escutou antes de quebrar. Depois pos isto na porta.',
  },
  {
    id: 'boss_eco_portal',
    name: 'Eco do Portal',
    layers: ['abyss'],
    behavior: 'guardiao',
    health: 3600,
    damage: 96,
    moveSpeed: 58,
    aggroRange: 440,
    attackRange: 60,
    attackCooldown: 2,
    spawnWeight: 0,
    w: 58,
    h: 70,
    art: 'alma',
    drawHeight: 112,
    color: '#6a2fd0',
    accent: '#c08aff',
    drops: [
      { resource: 'voidstone', min: 3, max: 5, chance: 1 },
      { resource: 'relic', min: 1, max: 2, chance: 0.4 },
    ],
    skillPoints: 5,
    moneyReward: 7000,
    boss: {
      enrageAt: 0.4,
      enrageSpeed: 1.5,
      enrageDamage: 1.25,
      enrageCooldown: 0.6,
      chargeEverySec: 7,
      chargeWindupSec: 0.7,
      chargeSpeed: 260,
      summonEverySec: 9,
      summonId: 'alma',
      summonCount: 2,
      summonMax: 4,
    },
    bossOfLayer: 'abyss',
    tagline: 'Vespera nao pos nada aqui. Isto ja estava.',
  },
];

const BY_ID = new Map(CREATURES.map((c) => [c.id, c]));

export function creatureDef(id: string): CreatureDef | undefined {
  return BY_ID.get(id);
}

export function creaturesOfLayer(layerId: string): CreatureDef[] {
  return CREATURES.filter((c) => c.layers.includes(layerId) && c.spawnWeight > 0);
}

/** O chefe fixo daquela camada, se houver. */
export function bossForLayer(layerId: string): CreatureDef | undefined {
  return CREATURES.find((c) => c.bossOfLayer === layerId);
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
