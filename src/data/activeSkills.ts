/**
 * Habilidades ativas: o que cada uma e, e de quais atributos ela vive.
 *
 * Duas formas de gasto, so:
 * - `charges`: ligar da N marteladas com o efeito; ao acabar, recarrega.
 * - `cast`:    segurar por X segundos faz a coisa acontecer uma vez.
 *
 * Tudo o mais (quanto, quao longe, quanto tempo) e atributo, entao subir de
 * nivel e so somar modificador — nenhuma habilidade precisa de codigo novo
 * para ficar melhor.
 */

import type { AttrId, FlagId } from './attributes';

export type ActiveSkillId = 'shock' | 'drill' | 'blast' | 'sense' | 'recall';
export type ActiveSkillKind = 'charges' | 'cast';

export interface ActiveSkillMeta {
  id: ActiveSkillId;
  /**
   * Preco em MOEDAS de cada nivel (o primeiro compra a habilidade).
   *
   * Habilidade ativa deixou de custar ponto de atributo: ponto vem de jogar e e
   * raro; moeda vem da economia (entregar, copias, toupeiras) e e abundante.
   * Cada uma compra um tipo de progresso diferente, e a economia passa a ter
   * onde ser gasta.
   */
  prices: number[];
  /** No da arvore que a libera (categoria 'active'). */
  skill: string;
  name: string;
  icon: string;
  kind: ActiveSkillKind;
  flag: FlagId;
  cooldownAttr: AttrId;
  /** `charges`: quantas marteladas. */
  chargesAttr?: AttrId;
  /** `cast`: quantos segundos segurando. */
  castAttr?: AttrId;
  /**
   * As leituras da habilidade, em DUAS formas.
   *
   * `label` e o sufixo da linha corrida do cartao ("5 marteladas"); `noun` e o
   * nome da linha na tabela da ficha ("Marteladas | 5"). Sao formas
   * diferentes porque respondem perguntas diferentes: o cartao e para bater o
   * olho e comparar, a tabela e para conferir numero por numero. Sem o `noun`
   * a tabela sairia com linhas chamadas "de forca" e "s de recarga".
   */
  stats: { attr: AttrId; label: string; noun: string; unit?: string; art?: string; percent?: boolean }[];

  /** Frase do conceito: a fala do Santiago sobre a habilidade. */
  flavor: string;
}

export const ACTIVE_SKILLS: ActiveSkillMeta[] = [
  {
    id: 'shock',
    skill: 'mining_shock',
    prices: [900, 2200, 4800, 9500],
    name: 'Choque',
    flavor: 'A pedra conduz melhor do que parece.',
    icon: '⚡',
    kind: 'charges',
    flag: 'shockUnlocked',
    cooldownAttr: 'shockCooldown',
    chargesAttr: 'shockCharges',
    stats: [
      { attr: 'shockCharges', label: 'marteladas', noun: 'Marteladas', art: 'carga' },
      { attr: 'shockJumps', label: 'saltos', noun: 'Saltos da corrente', art: 'no' },
      { attr: 'shockPower', label: 'de força', noun: 'Dano', art: 'forca', percent: true },
      { attr: 'shockCooldown', label: 's de recarga', noun: 'Recarga', unit: 'segundos', art: 'recarga' },
    ],
  },
  {
    id: 'drill',
    skill: 'mining_drill',
    prices: [1200, 2800, 6000, 12000],
    name: 'Broca',
    flavor: 'Quando o caminho tem que ser reto.',
    icon: '🛠',
    kind: 'charges',
    flag: 'drillUnlocked',
    cooldownAttr: 'drillCooldown',
    chargesAttr: 'drillCharges',
    stats: [
      { attr: 'drillCharges', label: 'marteladas', noun: 'Marteladas', art: 'carga' },
      { attr: 'drillDepth', label: 'blocos de avanço', noun: 'Avanço por martelada', unit: 'blocos', art: 'forca' },
      { attr: 'drillHeight', label: 'de altura', noun: 'Altura do túnel', unit: 'blocos', art: 'plataforma' },
      { attr: 'drillCooldown', label: 's de recarga', noun: 'Recarga', unit: 'segundos', art: 'recarga' },
    ],
  },
  {
    id: 'blast',
    skill: 'mining_blast',
    prices: [2600, 5200, 11000, 22000],
    name: 'Detonação',
    flavor: 'Uma boa explosão resolve muitos problemas.',
    icon: '💥',
    kind: 'charges',
    flag: 'blastUnlocked',
    cooldownAttr: 'blastCooldown',
    chargesAttr: 'blastCharges',
    stats: [
      { attr: 'blastRadius', label: 'de raio', noun: 'Raio da explosão', unit: 'blocos', art: 'no' },
      { attr: 'blastPower', label: 'de força', noun: 'Dano', art: 'forca', percent: true },
      { attr: 'blastCharges', label: 'cargas', noun: 'Cargas', art: 'carga' },
      { attr: 'blastCooldown', label: 's de recarga', noun: 'Recarga', unit: 'segundos', art: 'recarga' },
    ],
  },
  {
    id: 'sense',
    skill: 'explore_sense',
    prices: [1800, 3600, 7200],
    name: 'Faro',
    flavor: 'O pai dizia que a rocha avisa antes.',
    icon: '👁',
    kind: 'cast',
    flag: 'senseUnlocked',
    cooldownAttr: 'senseCooldown',
    castAttr: 'senseDuration',
    stats: [
      { attr: 'senseRadius', label: 'tiles de alcance', noun: 'Alcance', unit: 'tiles', art: 'no' },
      { attr: 'senseDuration', label: 's acordado', noun: 'Duração', unit: 'segundos', art: 'mobilidade' },
      { attr: 'senseCooldown', label: 's de recarga', noun: 'Recarga', unit: 'segundos', art: 'recarga' },
    ],
  },
  {
    id: 'recall',
    skill: 'move_recall',
    prices: [1500, 4000, 9000],
    name: 'Volta Rápida',
    flavor: 'Mochila cheia nao se carrega escada acima.',
    icon: '⟲',
    kind: 'cast',
    flag: 'recallUnlocked',
    cooldownAttr: 'recallCooldown',
    castAttr: 'recallCastTime',
    stats: [
      { attr: 'recallCastTime', label: 's parado', noun: 'Tempo parado', unit: 'segundos', art: 'mobilidade' },
      { attr: 'recallCooldown', label: 's de recarga', noun: 'Recarga', unit: 'segundos', art: 'recarga' },
    ],
  },
];

export function activeSkillMeta(id: ActiveSkillId): ActiveSkillMeta {
  return ACTIVE_SKILLS.find((m) => m.id === id)!;
}
