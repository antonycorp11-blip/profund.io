import { ACTIVE_SKILLS, activeSkillMeta, type ActiveSkillId } from '../data/activeSkills';
import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import type { Attributes } from './Attributes';

export interface ActiveSkillState {
  id: ActiveSkillId;
  unlocked: boolean;
  /** Marteladas restantes com o efeito ligado (habilidades de carga). */
  charges: number;
  /** Segundos restantes de recarga. */
  cooldown: number;
  /** Segundos ja parados (habilidades canalizadas). */
  casting: number;
}

/**
 * Habilidades que o jogador liga na hora.
 *
 * O contrato: o jogador escolhe QUANDO gastar, e e essa escolha que faz a
 * habilidade valer alguma coisa. Nada aqui dispara sozinho.
 *
 * Duas formas de gasto, ambas descritas em /data/activeSkills.ts:
 * - carga: ligar da N marteladas com o efeito, depois recarrega;
 * - canalizada: segurar parado por X segundos faz a coisa acontecer uma vez.
 */
export class ActiveSkills {
  private states = new Map<ActiveSkillId, ActiveSkillState>();
  /** Chamado quando uma canalizada completa. */
  onCast: ((id: ActiveSkillId) => void) | null = null;

  constructor(private attrs: Attributes) {
    for (const meta of ACTIVE_SKILLS) {
      this.states.set(meta.id, {
        id: meta.id,
        unlocked: false,
        charges: 0,
        cooldown: 0,
        casting: 0,
      });
    }
  }

  /** Todas, na ordem em que aparecem no pad. */
  /**
   * As equipadas, na ordem dos botoes do pad.
   *
   * QUATRO e nao cinco: cinco botoes viram um teclado que ninguem le no meio
   * de uma luta, e escolher o que levar continua sendo parte da preparacao.
   * Quatro e o que o conceito mostra, e e o que fecha o cinto em dois por
   * dois — que e a forma de um cinto, nao de uma lista.
   */
  equipped: (ActiveSkillId | null)[] = ['shock', 'drill', 'recall', null];

  /** Maximo de habilidades levadas ao mesmo tempo. */
  static readonly SLOTS = 4;

  /** Icone da habilidade, para o botao do pad. */
  iconOf(id: string): string {
    return activeSkillMeta(id as ActiveSkillId).icon;
  }

  isEquipped(id: ActiveSkillId): boolean {
    return this.equipped.includes(id);
  }

  /**
   * Poe ou tira do cinto.
   *
   * Sem slot livre, a nova entra no lugar da PRIMEIRA equipada — e mais util
   * trocar direto do que receber um "cinto cheio" e ter que desequipar antes.
   */
  toggleEquip(id: ActiveSkillId): void {
    const i = this.equipped.indexOf(id);
    if (i >= 0) {
      this.equipped[i] = null;
      return;
    }
    const vaga = this.equipped.indexOf(null);
    if (vaga >= 0) {
      this.equipped[vaga] = id;
      return;
    }
    this.equipped[0] = id;
  }

  all(): ActiveSkillState[] {
    return ACTIVE_SKILLS.map((m) => this.state(m.id));
  }

  update(dt: number, canChannel: boolean): void {
    for (const st of this.states.values()) {
      const meta = activeSkillMeta(st.id);

      if (st.casting > 0) {
        // Canalizar exige ficar parado e inteiro: levar dano ou sair andando
        // cancela. E o preco de um atalho que corta a caminhada de volta.
        if (!canChannel) {
          this.cancelCast(st.id, 'interrompida');
          continue;
        }
        st.casting += dt;
        if (st.casting >= this.castTime(st.id)) {
          st.casting = 0;
          st.cooldown = this.cooldownOf(st.id);
          Events.emit('skill:spent', { id: st.id });
          this.onCast?.(st.id);
        }
        continue;
      }

      if (st.charges > 0) continue;
      if (st.cooldown > 0) {
        st.cooldown = Math.max(0, st.cooldown - dt);
        if (st.cooldown === 0) Events.emit('skill:ready', { id: st.id, name: meta.name });
      }
    }
  }

  state(id: ActiveSkillId): ActiveSkillState {
    const st = this.states.get(id)!;
    // Lido na hora, e nao guardado no update: as telas consultam fora do laco
    // do jogo e mostravam tudo como bloqueado.
    st.unlocked = this.attrs.has(activeSkillMeta(id).flag);
    return st;
  }

  isActive(id: ActiveSkillId): boolean {
    return this.state(id).charges > 0;
  }

  isCasting(id: ActiveSkillId): boolean {
    return this.state(id).casting > 0;
  }

  /** 0..1 da canalizacao em andamento. */
  castRatio(id: ActiveSkillId): number {
    const st = this.state(id);
    if (st.casting <= 0) return 0;
    return Math.min(1, st.casting / this.castTime(id));
  }

  castTime(id: ActiveSkillId): number {
    const meta = activeSkillMeta(id);
    return meta.castAttr ? Math.max(0.3, this.attrs.get(meta.castAttr)) : 0;
  }

  cooldownOf(id: ActiveSkillId): number {
    return Math.max(CONFIG.skills.minCooldown, this.attrs.get(activeSkillMeta(id).cooldownAttr));
  }

  canActivate(id: ActiveSkillId): boolean {
    const st = this.state(id);
    return st.unlocked && st.charges === 0 && st.cooldown === 0 && st.casting === 0;
  }

  /** @returns false quando ainda recarrega ou nem foi aprendida. */
  activate(id: ActiveSkillId): boolean {
    const st = this.state(id);
    if (!this.canActivate(id)) return false;
    const meta = activeSkillMeta(id);

    if (meta.kind === 'cast') {
      // Comeca a contar; quem confirma e o update, com o jogador parado.
      st.casting = 0.0001;
      Events.emit('skill:activated', { id, charges: 0 });
      return true;
    }

    st.charges = Math.max(1, Math.round(this.attrs.get(meta.chargesAttr!)));
    Events.emit('skill:activated', { id, charges: st.charges });
    return true;
  }

  /** Canalizacao interrompida: devolve o uso, so cobra um respiro. */
  cancelCast(id: ActiveSkillId, motivo: string): void {
    const st = this.state(id);
    if (st.casting <= 0) return;
    st.casting = 0;
    st.cooldown = Math.min(this.cooldownOf(id), 4);
    Events.emit('ui:toast', { text: `${activeSkillMeta(id).name} ${motivo}.`, tone: 'warn' });
  }

  /** Gasta uma martelada. Ao zerar, entra em recarga. */
  consume(id: ActiveSkillId): boolean {
    const st = this.state(id);
    if (st.charges <= 0) return false;
    st.charges--;
    if (st.charges === 0) {
      st.cooldown = this.cooldownOf(id);
      Events.emit('skill:spent', { id });
    }
    return true;
  }

  /** 0..1 para o anel do botao (cheio = pronto). */
  readyRatio(id: ActiveSkillId): number {
    const st = this.state(id);
    if (st.charges > 0 || st.casting > 0) return 1;
    const total = this.cooldownOf(id);
    return total <= 0 ? 1 : 1 - st.cooldown / total;
  }

  equippedToJSON(): (ActiveSkillId | null)[] {
    return [...this.equipped];
  }

  equippedFromJSON(data: (ActiveSkillId | null)[] | undefined): void {
    if (!data || data.length === 0) return;
    // Lido pelo tamanho ATUAL do cinto: um save antigo tem tres lugares, e
    // sem isso o quarto voltaria como undefined em vez de vazio.
    this.equipped = Array.from({ length: ActiveSkills.SLOTS }, (_, i) => data[i] ?? null);
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
      st.casting = 0;
    }
  }
}
