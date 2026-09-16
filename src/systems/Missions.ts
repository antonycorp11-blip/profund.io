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

  constructor(
    private hasFlag: (id: string) => boolean,
    /** Profundidade maxima ja alcancada, em metros. */
    private deepest: () => number = () => 0
  ) {}

  private done_(m: MissionDef): boolean {
    return m.requires.every((f) => this.hasFlag(f));
  }

  /**
   * A missao em andamento.
   *
   * NAO e simplesmente a primeira em aberto. Quem ja desceu muito passa por
   * cima de objetivos rasos sem fechar todos, e a fila travava na primeira
   * pendencia — o jogador derrubava a Matriarca aos 194 m e continuava lendo
   * "Trilhos Novos, 112 m" para sempre, com a sensacao de que nada acontecia.
   *
   * Entao a escolhida e a mais FUNDA entre as que ele ja alcanca. As rasas nao
   * somem: viram pendencias, listadas no Guia com a profundidade de cada uma.
   */
  current(): MissionDef | null {
    const abertas = MISSIONS.filter((m) => !this.done_(m));
    if (abertas.length === 0) return null;
    const fundo = this.deepest() + 40;
    const alcancaveis = abertas.filter((m) => m.depth <= fundo);
    if (alcancaveis.length === 0) return abertas[0];
    return alcancaveis.reduce((a, b) => (b.depth > a.depth ? b : a));
  }

  /**
   * Objetivos que o jogador JA ULTRAPASSOU e deixou em aberto.
   *
   * So conta o que esta acima dele. Listar o que ainda vem pela frente seria
   * spoiler, e encheria a lista com dez linhas que ele nao pode fazer.
   */
  pending(): MissionDef[] {
    const atual = this.current();
    const fundo = this.deepest();
    return MISSIONS.filter((m) => !this.done_(m) && m.id !== atual?.id && m.depth <= fundo);
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
