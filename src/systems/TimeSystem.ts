import { CONFIG } from '../data/config';
import { Events } from '../core/events';

export type DayPhase = 'amanhecer' | 'dia' | 'entardecer' | 'noite';

/**
 * Relogio do jogo: hora do dia, dia e semana.
 *
 * E a base de tres coisas: o ciclo dia/noite, a cota semanal e (depois) o
 * comportamento noturno das criaturas. Tudo que precisa de tempo le daqui.
 */
export class TimeSystem {
  /** Segundos de jogo acumulados desde o inicio da partida. */
  elapsed = 0;

  get dayLength(): number {
    return CONFIG.time.dayLengthSec;
  }

  /** Dia atual, comecando em 1. */
  get day(): number {
    return Math.floor(this.elapsed / this.dayLength) + 1;
  }

  /** Semana atual, comecando em 1. */
  get week(): number {
    return Math.floor((this.day - 1) / CONFIG.time.daysPerWeek) + 1;
  }

  /** Dia dentro da semana, 1..daysPerWeek. */
  get dayOfWeek(): number {
    return ((this.day - 1) % CONFIG.time.daysPerWeek) + 1;
  }

  /** 0..1 dentro do dia. 0 = meia-noite. */
  get dayProgress(): number {
    return (this.elapsed % this.dayLength) / this.dayLength;
  }

  /** Hora 0..24 para exibicao. */
  get hour(): number {
    return this.dayProgress * 24;
  }

  get phase(): DayPhase {
    const h = this.hour;
    if (h < 5 || h >= 21) return 'noite';
    if (h < 8) return 'amanhecer';
    if (h < 17) return 'dia';
    return 'entardecer';
  }

  /** Quanto falta para a semana virar, em segundos de jogo. */
  get secondsToNextWeek(): number {
    const weekLength = this.dayLength * CONFIG.time.daysPerWeek;
    return weekLength - (this.elapsed % weekLength);
  }

  /**
   * Pesos dos tres ceus (dia, entardecer, noite), somando 1.
   * Uma curva por keyframes evita corte na troca.
   */
  skyWeights(): [number, number, number] {
    const h = this.hour;
    // [hora, dia, entardecer, noite]
    const keys: [number, number, number, number][] = [
      [0, 0, 0, 1],
      [5, 0, 0, 1],
      [7, 0, 0.7, 0.3],
      [9, 1, 0, 0],
      [16, 1, 0, 0],
      [18, 0, 1, 0],
      [20, 0, 0.45, 0.55],
      [22, 0, 0, 1],
      [24, 0, 0, 1],
    ];
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i];
      const b = keys[i + 1];
      if (h < a[0] || h > b[0]) continue;
      const t = b[0] === a[0] ? 0 : (h - a[0]) / (b[0] - a[0]);
      return [
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
        a[3] + (b[3] - a[3]) * t,
      ];
    }
    return [0, 0, 1];
  }

  /** 0 = superficie clara, 1 = noite fechada. Some com a luz do dia. */
  get nightDarkness(): number {
    const w = this.skyWeights();
    return Math.min(CONFIG.time.maxNightDarkness, w[2] * CONFIG.time.maxNightDarkness);
  }

  update(dt: number): void {
    const beforeDay = this.day;
    const beforeWeek = this.week;
    this.elapsed += dt * CONFIG.time.speed;

    if (this.day !== beforeDay) {
      Events.emit('time:day', { day: this.day, week: this.week, dayOfWeek: this.dayOfWeek });
    }
    if (this.week !== beforeWeek) {
      Events.emit('time:week', { week: this.week });
    }
  }

  /** Avanca ate o proximo amanhecer (usado por dormir/dev). */
  skipToMorning(): void {
    const target = Math.floor(this.elapsed / this.dayLength) + 1;
    this.elapsed = target * this.dayLength + this.dayLength * (7 / 24);
    Events.emit('time:day', { day: this.day, week: this.week, dayOfWeek: this.dayOfWeek });
  }

  label(): string {
    const h = Math.floor(this.hour);
    const m = Math.floor((this.hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  toJSON(): { elapsed: number } {
    return { elapsed: this.elapsed };
  }

  fromJSON(data: { elapsed?: number } | undefined): void {
    this.elapsed = data?.elapsed ?? CONFIG.time.dayLengthSec * (8 / 24);
  }
}
