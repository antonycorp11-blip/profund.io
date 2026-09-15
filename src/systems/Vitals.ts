import { CONFIG } from '../data/config';
import { CREATURE_CONFIG } from '../data/creatures';
import { Events } from '../core/events';
import { clamp } from '../core/math';
import type { Attributes } from './Attributes';

export interface VitalsSave {
  health: number;
}

/**
 * Vida do jogador.
 *
 * Regra do GDD (§20): morrer nao pode ser brutal. O castigo e o tempo de voltar
 * e parte da carga — nunca progressao (habilidades, tecnologia, mapa, base).
 * A base cura: sair da mina sempre vale a pena.
 */
export class Vitals {
  health: number;
  /** Segundos restantes de invulnerabilidade. */
  iFrames = 0;
  /** True entre o golpe fatal e o resgate. */
  dead = false;
  /** Contagem regressiva do resgate. */
  deathTimer = 0;
  /** 0..1 — intensidade do vermelho na tela. */
  hurtFlash = 0;

  constructor(private attrs: Attributes) {
    this.health = this.max;
  }

  get max(): number {
    return Math.max(1, Math.round(this.attrs.get('maxHealth')));
  }

  get ratio(): number {
    return clamp(this.health / this.max, 0, 1);
  }

  get invulnerable(): boolean {
    return this.dead || this.iFrames > 0;
  }

  /** @returns true quando o resgate deve acontecer agora. */
  update(dt: number, depthMeters: number): boolean {
    this.iFrames = Math.max(0, this.iFrames - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt / CONFIG.combat.hurtFlashSec);

    if (this.dead) {
      this.deathTimer -= dt;
      return this.deathTimer <= 0;
    }

    // A base cura rapido; a regeneracao de atributo funciona em qualquer lugar.
    const inBase = depthMeters <= CONFIG.combat.baseHealDepth;
    const rate =
      (inBase ? CONFIG.combat.baseHealPerSec : 0) + this.attrs.get('healthRegeneration');
    if (rate > 0 && this.health < this.max) {
      this.health = Math.min(this.max, this.health + rate * dt);
    }
    return false;
  }

  /** @returns o dano aplicado depois da defesa (0 se estava invulneravel). */
  hurt(amount: number): number {
    if (this.invulnerable) return 0;
    const dealt = Math.max(1, Math.round(amount * (1 - this.attrs.get('defense'))));
    this.health = Math.max(0, this.health - dealt);
    this.iFrames = CREATURE_CONFIG.playerIFrames;
    this.hurtFlash = 1;
    Events.emit('player:hurt', { damage: dealt, health: this.health, max: this.max });
    if (this.health <= 0) {
      this.dead = true;
      this.deathTimer = CONFIG.combat.deathDelaySec;
    }
    return dealt;
  }

  /** Resgate: volta inteiro, com um respiro de invulnerabilidade. */
  revive(): void {
    this.dead = false;
    this.deathTimer = 0;
    this.health = this.max;
    this.iFrames = 2;
    this.hurtFlash = 0;
  }

  toJSON(): VitalsSave {
    return { health: Math.round(this.health) };
  }

  fromJSON(data: VitalsSave | undefined): void {
    if (!data) return;
    this.health = clamp(data.health, 1, this.max);
  }
}
