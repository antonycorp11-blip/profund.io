import { Events } from '../core/events';

/** O minimo que uma tela precisa expor para entrar no registro. */
export interface TelaRegistravel {
  readonly isOpen: boolean;
  close(): void;
}

/**
 * O dono das telas de tela cheia.
 *
 * Antes disto nao havia dono nenhum: cada botao da barra chamava `toggle()`
 * na sua propria tela e ninguem coordenava. O resultado era facil de
 * reproduzir e dificil de acreditar — abrir Skills, Atributos, Guia e
 * Tecnologia deixava as QUATRO abertas ao mesmo tempo, empilhadas. E como a
 * ordem na pilha e a ordem de criacao, e nao a de abertura, clicar em
 * Tecnologia com o Guia aberto abria a Tecnologia ATRAS do Guia: o jogador
 * apertava um botao e continuava vendo a tela anterior.
 *
 * A regra aqui e uma so, e e absoluta: no maximo uma tela cheia por vez.
 * Abrir qualquer uma fecha todas as outras, sempre, sem a tela precisar saber
 * que as outras existem.
 */
export class Telas {
  private registro = new Map<string, TelaRegistravel>();

  constructor() {
    /*
     * Escape e Backspace fecham o que estiver aberto.
     *
     * Nenhuma tela escutava teclado: so dava para sair pelo X. Num celular
     * isso ate passa, mas quem testa no PC ficava preso num painel sem saber
     * que o unico jeito de sair era mirar num alvo de 20 px.
     */
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape' && e.code !== 'Backspace') return;
      if (!this.aberta) return;
      e.preventDefault();
      this.fecharTudo();
    });
  }

  registrar(nome: string, tela: TelaRegistravel): void {
    this.registro.set(nome, tela);
  }

  /** Nome da tela aberta, ou null. */
  get aberta(): string | null {
    for (const [nome, tela] of this.registro) if (tela.isOpen) return nome;
    return null;
  }

  get algumaAberta(): boolean {
    return this.aberta !== null;
  }

  fecharTudo(): void {
    const antes = this.aberta;
    for (const tela of this.registro.values()) if (tela.isOpen) tela.close();
    if (antes) Events.emit('tela:fechada', { nome: antes });
  }

  private fecharOutras(nome: string): void {
    for (const [n, tela] of this.registro) {
      if (n !== nome && tela.isOpen) tela.close();
    }
  }

  /**
   * Abre uma tela, fechando qualquer outra antes.
   *
   * `abrir` e a acao propria da tela porque algumas precisam de argumento
   * (a aba da Tecnologia, a base do acampamento) — o coordenador nao tem por
   * que conhecer isso.
   */
  abrir(nome: string, acao: () => void): void {
    this.fecharOutras(nome);
    acao();
    Events.emit('tela:aberta', { nome });
  }

  /** Botao da barra: abre se fechada, fecha se ja era esta que estava aberta. */
  alternar(nome: string, acao: () => void): void {
    const tela = this.registro.get(nome);
    if (tela?.isOpen) {
      tela.close();
      Events.emit('tela:fechada', { nome });
      return;
    }
    this.abrir(nome, acao);
  }
}
