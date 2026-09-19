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
   * A missao em andamento: a primeira em aberto, e ponto.
   *
   * Cheguei a fazer ela escolher a mais funda alcancavel, para quem corre na
   * frente nao ficar olhando um objetivo raso. Era o conserto errado: tratava
   * o sintoma. O certo e ninguem CONSEGUIR correr na frente — quem garante
   * isso e o selo de bioma, que passou a exigir as missoes da faixa alem do
   * chefe. Ver `missingBefore`.
   */
  current(): MissionDef | null {
    return MISSIONS.find((m) => !this.done_(m)) ?? null;
  }

  /**
   * Missoes ainda em aberto acima de uma profundidade.
   *
   * E o que o selo consulta: nao basta derrubar o guardiao, e preciso nao ter
   * deixado nada para tras no caminho ate ele.
   */
  missingBefore(depth: number): MissionDef[] {
    return MISSIONS.filter((m) => m.depth <= depth && !this.done_(m));
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
      Events.emit('mission:done', {
        id: m.id,
        title: m.title,
        text: m.onDone,
        money: m.rewardMoney,
        points: m.rewardPoints,
      });
    }
    this.anunciarAtual(silent);
  }

  /**
   * Avisa quando a missao ATUAL muda.
   *
   * Nao havia aviso nenhum de missao NOVA: o card do HUD simplesmente trocava
   * de texto, e trocar texto num canto e o jeito mais discreto possivel de
   * contar uma coisa importante. Quem estava minerando nao via.
   *
   * O aviso e emitido uma vez por missao, e `silent` cobre o carregamento do
   * save — abrir o jogo nao pode parecer que a missao acabou de chegar.
   */
  private atualAvisada: string | null = null;
  private anunciarAtual(silent: boolean): void {
    const m = this.current();
    if (!m) return;
    if (this.atualAvisada === m.id) return;
    const primeiraVez = this.atualAvisada !== null;
    this.atualAvisada = m.id;
    if (silent || !primeiraVez) return;
    Events.emit('mission:nova', {
      id: m.id,
      title: m.title,
      goal: m.goal,
      porque: m.porque ?? '',
      depth: m.depth,
    });
  }

  /** Usado ao carregar: fixa a missao atual sem anunciar nada. */
  silenciarAtual(): void {
    this.atualAvisada = this.current()?.id ?? null;
  }
}
