import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import type { SkillTree } from './SkillTree';

export interface ProgressionSave {
  level: number;
  xp: number;
}

/**
 * Nivel do jogador.
 *
 * Existe para dar um pingo constante de progresso: profundidade e historia dao
 * pontos em saltos raros, e entre um salto e outro o jogador ficava sem nada
 * acontecendo. Aqui cada bloco quebrado, cada entrega e cada criatura derrotada
 * empurram uma barra que, ao encher, vira ponto de habilidade.
 *
 * Regra que nao muda: o ponto vem do nivel, e o nivel vem de JOGAR — nunca de
 * gastar dinheiro nem de esperar.
 */
export class Progression {
  level = 1;
  xp = 0;

  constructor(private skills: SkillTree) {}

  /** XP para sair deste nivel. Curva suave: cresce, mas nunca trava. */
  get xpToNext(): number {
    const c = CONFIG.progression;
    return Math.round(c.baseXp * Math.pow(this.level, c.curve));
  }

  get ratio(): number {
    return Math.max(0, Math.min(1, this.xp / this.xpToNext));
  }

  /**
   * Soma XP e sobe de nivel quantas vezes couber.
   * @param reason aparece no aviso do ponto ganho
   */
  add(amount: number, reason: string): void {
    if (amount <= 0) return;
    this.xp += amount;
    Events.emit('xp:gained', { amount, level: this.level, ratio: this.ratio });

    let guard = 0;
    while (this.xp >= this.xpToNext && guard++ < 50) {
      this.xp -= this.xpToNext;
      this.level++;
      const points = CONFIG.progression.pointsPerLevel;
      this.skills.addPoints(points, `nivel ${this.level}`);
      Events.emit('level:up', { level: this.level, points });
    }
    void reason;
  }

  toJSON(): ProgressionSave {
    return { level: this.level, xp: Math.round(this.xp) };
  }

  fromJSON(data: ProgressionSave | undefined): void {
    if (!data) return;
    this.level = Math.max(1, data.level ?? 1);
    this.xp = Math.max(0, data.xp ?? 0);
  }
}
