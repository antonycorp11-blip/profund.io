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

export type ActiveSkillId = 'shock' | 'drill' | 'recall';
export type ActiveSkillKind = 'charges' | 'cast';

export interface ActiveSkillMeta {
  id: ActiveSkillId;
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
  /** Linha de status da tela de habilidades. */
  stats: { attr: AttrId; label: string; percent?: boolean }[];
}

export const ACTIVE_SKILLS: ActiveSkillMeta[] = [
  {
    id: 'shock',
    skill: 'mining_shock',
    name: 'Choque',
    icon: '⚡',
    kind: 'charges',
    flag: 'shockUnlocked',
    cooldownAttr: 'shockCooldown',
    chargesAttr: 'shockCharges',
    stats: [
      { attr: 'shockCharges', label: 'marteladas' },
      { attr: 'shockJumps', label: 'saltos' },
      { attr: 'shockPower', label: 'de forca', percent: true },
      { attr: 'shockCooldown', label: 's de recarga' },
    ],
  },
  {
    id: 'drill',
    skill: 'mining_drill',
    name: 'Broca',
    icon: '🛠',
    kind: 'charges',
    flag: 'drillUnlocked',
    cooldownAttr: 'drillCooldown',
    chargesAttr: 'drillCharges',
    stats: [
      { attr: 'drillCharges', label: 'marteladas' },
      { attr: 'drillDepth', label: 'blocos de avanco' },
      { attr: 'drillHeight', label: 'de altura' },
      { attr: 'drillCooldown', label: 's de recarga' },
    ],
  },
  {
    id: 'recall',
    skill: 'move_recall',
    name: 'Volta Rapida',
    icon: '⟲',
    kind: 'cast',
    flag: 'recallUnlocked',
    cooldownAttr: 'recallCooldown',
    castAttr: 'recallCastTime',
    stats: [
      { attr: 'recallCastTime', label: 's parado' },
      { attr: 'recallCooldown', label: 's de recarga' },
    ],
  },
];

export function activeSkillMeta(id: ActiveSkillId): ActiveSkillMeta {
  return ACTIVE_SKILLS.find((m) => m.id === id)!;
}
