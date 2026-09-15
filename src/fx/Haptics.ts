import { CONFIG } from '../data/config';

/** Vibracao curta em dispositivos que suportam (silencioso onde nao existe). */
class HapticsImpl {
  private last = 0;
  enabled = CONFIG.haptics.enabled;

  private get supported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  pulse(ms: number): void {
    if (!this.enabled || !this.supported) return;
    const now = performance.now();
    if (now - this.last < CONFIG.haptics.minIntervalMs) return;
    this.last = now;
    try {
      navigator.vibrate(ms);
    } catch {
      /* ignorado */
    }
  }

  hit(): void {
    this.pulse(CONFIG.haptics.hit);
  }

  break_(): void {
    this.pulse(CONFIG.haptics.break);
  }

  pickup(): void {
    this.pulse(CONFIG.haptics.pickup);
  }

  ui(): void {
    this.pulse(CONFIG.haptics.ui);
  }
}

export const Haptics = new HapticsImpl();
