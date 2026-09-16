import { Events } from '../core/events';
import { MISSIONS, type MissionDef } from '../data/missions';

/**
 * Missoes da campanha.
 *
 * Nao guarda estado proprio: uma missao esta concluida quando TODAS as flags
 * de historia que ela pede existem. Isso significa que o save nao precisou de
 * campo novo, um save antigo ja entra na missao certa, e nao ha como o
 * progresso da missao discordar do que o jogador realmente fez.
 *
 * A unica coisa que ela lembra e quais ja foram ANUNCIADAS, para nao repetir o
 * aviso de conclusao a cada quadro.
 */
export class Missions {
  private announced = new Set<string>();

  constructor(private hasFlag: (id: string) => boolean) {}

  private done_(m: MissionDef): boolean {
    return m.requires.every((f) => this.hasFlag(f));
  }

  /** A missao em andamento: a primeira ainda nao concluida. */
  current(): MissionDef | null {
    return MISSIONS.find((m) => !this.done_(m)) ?? null;
  }

  /** As ja concluidas, na ordem em que foram fechadas. */
  done(): MissionDef[] {
    return MISSIONS.filter((m) => this.done_(m));
  }

  completedCount(): number {
    return MISSIONS.filter((m) => this.done_(m)).length;
  }

  /**
   * Procura missoes que acabaram de fechar e paga por elas.
   *
   * Chamado depois de qualquer flag nova. Na primeira chamada da sessao ele
   * marca as ja concluidas como anunciadas em silencio — senao carregar um
   * save despejaria dez toasts de uma vez.
   */
  check(silent: boolean, pay: (money: number, points: number, m: MissionDef) => void): void {
    for (const m of MISSIONS) {
      if (!this.done_(m) || this.announced.has(m.id)) continue;
      this.announced.add(m.id);
      if (silent) continue;
      pay(m.rewardMoney, m.rewardPoints, m);
      Events.emit('mission:done', { id: m.id, title: m.title, text: m.onDone });
    }
  }
}
