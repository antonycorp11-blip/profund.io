import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import type { Attributes } from './Attributes';

export type ActiveSkillId = 'shock';

export interface ActiveSkillState {
  id: ActiveSkillId;
  unlocked: boolean;
  /** Marteladas restantes com o efeito ligado. */
  charges: number;
  /** Segundos restantes de recarga. */
  cooldown: number;
}

/**
 * Habilidades que o jogador liga na hora.
 *
 * O contrato do Choque (e o molde para as proximas): apertar liga N marteladas
 * com o efeito; quando as marteladas acabam, comeca a recarga. Nao e um passivo
 * que dispara sozinho — o jogador escolhe QUANDO gastar, e e essa escolha que
 * faz a habilidade valer alguma coisa.
 */
export class ActiveSkills {
  private states = new Map<ActiveSkillId, ActiveSkillState>();

  constructor(private attrs: Attributes) {
    this.states.set('shock', { id: 'shock', unlocked: false, charges: 0, cooldown: 0 });
  }

  update(dt: number): void {
    for (const st of this.states.values()) {
      st.unlocked = st.id === 'shock' ? this.attrs.has('shockUnlocked') : st.unlocked;
      if (st.charges > 0) continue;
      if (st.cooldown > 0) {
        st.cooldown = Math.max(0, st.cooldown - dt);
        if (st.cooldown === 0) Events.emit('skill:ready', { id: st.id });
      }
    }
  }

  state(id: ActiveSkillId): ActiveSkillState {
    return this.states.get(id)!;
  }

  isActive(id: ActiveSkillId): boolean {
    return this.state(id).charges > 0;
  }

  canActivate(id: ActiveSkillId): boolean {
    const st = this.state(id);
    return st.unlocked && st.charges === 0 && st.cooldown === 0;
  }

  /** @returns false quando ainda esta recarregando ou nem foi aprendida. */
  activate(id: ActiveSkillId): boolean {
    const st = this.state(id);
    if (!st.unlocked) return false;
    if (st.charges > 0 || st.cooldown > 0) return false;
    st.charges = Math.max(1, Math.round(this.attrs.get('shockCharges')));
    Events.emit('skill:activated', { id, charges: st.charges });
    return true;
  }

  /** Gasta uma martelada. Ao zerar, entra em recarga. */
  consume(id: ActiveSkillId): boolean {
    const st = this.state(id);
    if (st.charges <= 0) return false;
    st.charges--;
    if (st.charges === 0) {
      st.cooldown = Math.max(CONFIG.skills.minCooldown, this.attrs.get('shockCooldown'));
      Events.emit('skill:spent', { id });
    }
    return true;
  }

  /** 0..1 para o anel do botao (cheio = pronto). */
  readyRatio(id: ActiveSkillId): number {
    const st = this.state(id);
    if (st.charges > 0) return 1;
    const total = Math.max(CONFIG.skills.minCooldown, this.attrs.get('shockCooldown'));
    return total <= 0 ? 1 : 1 - st.cooldown / total;
  }

  toJSON(): Record<string, { charges: number; cooldown: number }> {
    const out: Record<string, { charges: number; cooldown: number }> = {};
    for (const [id, st] of this.states) out[id] = { charges: st.charges, cooldown: st.cooldown };
    return out;
  }

  fromJSON(data: Record<string, { charges: number; cooldown: number }> | undefined): void {
    if (!data) return;
    for (const [id, saved] of Object.entries(data)) {
      const st = this.states.get(id as ActiveSkillId);
      if (!st) continue;
      st.charges = saved.charges ?? 0;
      st.cooldown = saved.cooldown ?? 0;
    }
  }
}
