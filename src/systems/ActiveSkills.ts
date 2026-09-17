import {
  ACTIVE_SKILLS,
  activeSkillMeta,
  type ActiveSkillId,
  type SkillHand,
} from '../data/activeSkills';
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

  /**
   * DOIS CINTOS, um por mao, de tres lugares cada.
   *
   * Nao e um cinto de seis: o pad tem tres botoes de habilidade porque o
   * quarto lugar do polegar e o PULAR, e pular nao e negociavel. Entao cada
   * mao leva tres, e trocar de mao troca o cinto inteiro — o que voce montou
   * para cavar nao atrapalha o que voce montou para atirar.
   *
   * Tinha aberto um quarto lugar seguindo o conceito desenhado. Estava errado:
   * a imagem nao sabia que o quarto botao ja tem dono.
   */
  private cintos: Record<SkillHand, (ActiveSkillId | null)[]> = {
    picareta: ['shock', 'drill', 'recall'],
    arma: [null, null, null],
  };

  /** Qual cinto esta valendo agora. O Game troca junto com a mao. */
  mao: SkillHand = 'picareta';

  /** Maximo de habilidades por mao. */
  static readonly SLOTS = 3;

  /** O cinto da mao atual — e o que o pad mostra. */
  get equipped(): (ActiveSkillId | null)[] {
    return this.cintos[this.mao];
  }

  /** O cinto de uma mao especifica, para a tela de habilidades. */
  cintoDe(mao: SkillHand): (ActiveSkillId | null)[] {
    return this.cintos[mao];
  }

  /** Icone da habilidade, para o botao do pad. */
  iconOf(id: string): string {
    return activeSkillMeta(id as ActiveSkillId).icon;
  }

  isEquipped(id: ActiveSkillId): boolean {
    return this.cintos[activeSkillMeta(id).hand].includes(id);
  }

  /**
   * Poe ou tira do cinto DA PROPRIA MAO da habilidade.
   *
   * Uma skill de arma nunca entra no cinto da picareta: nao ha decisao ali, so
   * chance de errar. Sem lugar livre, a nova entra no lugar da PRIMEIRA — e
   * mais util trocar direto do que receber um "cinto cheio" e ter que
   * desequipar antes.
   */
  toggleEquip(id: ActiveSkillId): void {
    const cinto = this.cintos[activeSkillMeta(id).hand];
    const i = cinto.indexOf(id);
    if (i >= 0) {
      cinto[i] = null;
      return;
    }
    const vaga = cinto.indexOf(null);
    cinto[vaga >= 0 ? vaga : 0] = id;
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

  equippedToJSON(): Record<SkillHand, (ActiveSkillId | null)[]> {
    return { picareta: [...this.cintos.picareta], arma: [...this.cintos.arma] };
  }

  /**
   * Le os dois cintos, e ACEITA o save antigo de um cinto so.
   *
   * O formato anterior era uma lista simples; ela era o cinto da picareta,
   * porque arma nao existia. Sem esta ponte, quem ja jogava perderia o que
   * tinha montado.
   */
  equippedFromJSON(
    data: (ActiveSkillId | null)[] | Record<SkillHand, (ActiveSkillId | null)[]> | undefined
  ): void {
    if (!data) return;
    const ler = (lista: (ActiveSkillId | null)[] | undefined): (ActiveSkillId | null)[] =>
      Array.from({ length: ActiveSkills.SLOTS }, (_, i) => lista?.[i] ?? null);
    if (Array.isArray(data)) {
      this.cintos.picareta = ler(data);
      return;
    }
    this.cintos.picareta = ler(data.picareta);
    this.cintos.arma = ler(data.arma);
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
