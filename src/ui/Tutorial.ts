import { Events } from '../core/events';

/** Um passo do tutorial: o que dizer, onde apontar, e o que encerra. */
interface Passo {
  id: string;
  titulo: string;
  texto: string;
  /** Seletor do elemento a destacar. Vazio = so o cartao, sem holofote. */
  alvo?: string;
  /** Quando o passo se cumpre sozinho. Sem isto, o passo tem botao de OK. */
  espera?: 'andar' | 'pular' | 'minerar' | 'arma-na-mao' | 'atirar' | 'picareta-na-mao';
}

/**
 * O TUTORIAL GUIADO.
 *
 * O relato, repetido: "o jogo nao ensina nada. Basicamente nada. Eu deixei
 * algumas pessoas jogarem, as pessoas simplesmente nao sabiam o que tinha que
 * fazer."
 *
 * Havia dicas em toast — texto que aparece num canto por tres segundos, no
 * meio de outros cinco toasts. Isso nao e ensinar, e avisar. Quem nunca viu o
 * jogo nao sabe nem onde olhar.
 *
 * Aqui a tela ESCURECE, o que tem que ser tocado fica aceso no buraco do
 * escuro, e o passo so termina quando o jogador FAZ a coisa — nao quando ele
 * fecha um aviso. Ler "aperte para pular" e diferente de ter pulado.
 *
 * Dois passos existem porque ninguem adivinha, e foram pedidos por nome: que
 * a arma se carrega com PEDRA, e como trocar a picareta pela arma.
 */
export class Tutorial {
  private wrap: HTMLDivElement;
  private buraco: HTMLElement;
  private cartao: HTMLElement;
  private passos: Passo[] = [];
  private indice = -1;
  private ativo = false;
  private movido = 0;
  private ultimoX: number | null = null;
  private seguir: string | null = null;

  constructor(
    private parent: HTMLElement,
    private marcarFeito: (id: string) => void,
    private jaFeito: (id: string) => boolean
  ) {
    this.wrap = document.createElement('div');
    this.wrap.className = 'tut-wrap';
    this.wrap.innerHTML = `
      <div class="tut-buraco"></div>
      <div class="tut-cartao">
        <span class="tut-passo"></span>
        <b class="tut-titulo"></b>
        <p class="tut-texto"></p>
        <button class="tut-ok" type="button">ENTENDI</button>
      </div>`;
    parent.appendChild(this.wrap);
    this.buraco = this.wrap.querySelector('.tut-buraco') as HTMLElement;
    this.cartao = this.wrap.querySelector('.tut-cartao') as HTMLElement;
    (this.wrap.querySelector('.tut-ok') as HTMLElement).addEventListener('click', () =>
      this.avancar()
    );

    Events.on('block:break', () => this.cumpriu('minerar'));
    Events.on('weapon:fired', () => this.cumpriu('atirar'));
    Events.on('mao:trocada', (p) =>
      this.cumpriu(p.mao === 'arma' ? 'arma-na-mao' : 'picareta-na-mao')
    );

    this.passos = [
      {
        id: 'tut_andar',
        titulo: 'Ande',
        texto: 'Arraste o polegar na metade esquerda da tela para andar. No computador, A e D.',
        espera: 'andar',
      },
      {
        id: 'tut_pular',
        titulo: 'Pule',
        texto: 'Toque na metade direita da tela para pular. No computador, barra de espaco.',
        espera: 'pular',
      },
      {
        id: 'tut_minerar',
        titulo: 'Bata na rocha',
        texto:
          'Toque numa pedra perto de voce para picaretar. Segure para continuar batendo. Cada pedra quebrada vira material — e e disso que sai tudo no jogo.',
        espera: 'minerar',
      },
      {
        id: 'tut_trocar',
        titulo: 'Troque para a arma',
        texto:
          'Este botao troca o que voce tem na mao: picareta ou revolver. Toque nele agora. No computador, a tecla Q.',
        alvo: '.hud-mao',
        espera: 'arma-na-mao',
      },
      {
        id: 'tut_municao',
        titulo: 'A arma come PEDRA',
        texto:
          'Nao ha loja de municao aqui embaixo. O revolver do seu pai cospe estilhaco de pedra: cada pedra que voce quebra rende cinco tiros. Este contador mostra quantos tiros voce ainda tem — quando zerar, a resposta e voltar a picaretar.',
        alvo: '.slim.ammo',
      },
      {
        id: 'tut_atirar',
        titulo: 'Atire',
        texto: 'Com a arma na mao, toque onde quer acertar. Bicho nao se mata com picareta.',
        espera: 'atirar',
      },
      {
        id: 'tut_voltar',
        titulo: 'E volte para a picareta',
        texto:
          'Mesmo botao. Ande sempre com a picareta na mao: ela quebra rocha, e rocha e munição, dinheiro e caminho.',
        alvo: '.hud-mao',
        espera: 'picareta-na-mao',
      },
    ];
  }

  /** Comeca do primeiro passo ainda nao feito. Nada a fazer = nao aparece. */
  comecar(): void {
    this.indice = this.passos.findIndex((p) => !this.jaFeito(p.id));
    if (this.indice < 0) return;
    this.ativo = true;
    this.mostrar();
  }

  /** O jogo pausa enquanto um passo espera uma acao? Nao: ele tem que agir. */
  get bloqueando(): boolean {
    // So o passo informativo (sem `espera`) bloqueia, porque nele nao ha o que
    // fazer no mundo. Os outros PRECISAM do jogo respondendo ao toque.
    return this.ativo && !this.passoAtual?.espera;
  }

  private get passoAtual(): Passo | undefined {
    return this.passos[this.indice];
  }

  private mostrar(): void {
    const p = this.passoAtual;
    if (!p) {
      this.encerrar();
      return;
    }
    this.seguir = p.alvo ?? null;
    this.movido = 0;
    this.ultimoX = null;
    (this.wrap.querySelector('.tut-passo') as HTMLElement).textContent =
      `PASSO ${this.indice + 1} DE ${this.passos.length}`;
    (this.wrap.querySelector('.tut-titulo') as HTMLElement).textContent = p.titulo;
    (this.wrap.querySelector('.tut-texto') as HTMLElement).textContent = p.texto;
    // Passo que espera uma acao nao tem botao: o botao seria a saida facil, e
    // a saida facil e exatamente o que faz ninguem aprender.
    (this.wrap.querySelector('.tut-ok') as HTMLElement).hidden = !!p.espera;
    this.wrap.classList.toggle('com-alvo', !!p.alvo);
    this.wrap.classList.add('on');
    this.posicionarBuraco();
  }

  /**
   * O holofote segue o elemento, quadro a quadro.
   *
   * O HUD se move: o contador de municao muda de largura, o botao da mao troca
   * de rotulo. Um buraco calculado uma vez sai de cima do alvo no primeiro
   * numero que mudar, e ai o tutorial aponta para o lugar errado — pior que
   * nao apontar.
   */
  private posicionarBuraco(): void {
    if (!this.seguir) {
      this.buraco.style.opacity = '0';
      return;
    }
    const alvo = document.querySelector(this.seguir) as HTMLElement | null;
    if (!alvo || !alvo.offsetParent) {
      this.buraco.style.opacity = '0';
      return;
    }
    const r = alvo.getBoundingClientRect();
    const folga = 6;
    this.buraco.style.opacity = '1';
    this.buraco.style.left = `${r.left - folga}px`;
    this.buraco.style.top = `${r.top - folga}px`;
    this.buraco.style.width = `${r.width + folga * 2}px`;
    this.buraco.style.height = `${r.height + folga * 2}px`;
    // O cartao foge do alvo: se ficar por cima, ele esconde justamente o que
    // esta mandando tocar.
    this.cartao.classList.toggle('embaixo', r.top < window.innerHeight * 0.5);
  }

  /** Chamado todo quadro pelo Game. */
  update(playerX: number, noChao: boolean): void {
    if (!this.ativo) return;
    this.posicionarBuraco();
    const p = this.passoAtual;
    if (!p?.espera) return;
    if (p.espera === 'andar') {
      if (this.ultimoX !== null) this.movido += Math.abs(playerX - this.ultimoX);
      this.ultimoX = playerX;
      // Tres tiles: longe o bastante para ser andar, perto o bastante para
      // nao virar tarefa.
      if (this.movido > 96) this.cumpriu('andar');
      return;
    }
    if (p.espera === 'pular' && !noChao) this.cumpriu('pular');
  }

  private cumpriu(o: NonNullable<Passo['espera']>): void {
    if (!this.ativo) return;
    if (this.passoAtual?.espera !== o) return;
    this.avancar();
  }

  private avancar(): void {
    const p = this.passoAtual;
    if (p) this.marcarFeito(p.id);
    this.indice++;
    if (this.indice >= this.passos.length) {
      this.encerrar();
      return;
    }
    // Um respiro entre passos: encadear sem pausa parece piscada de erro.
    this.wrap.classList.remove('on');
    window.setTimeout(() => this.mostrar(), 260);
  }

  private encerrar(): void {
    this.ativo = false;
    this.wrap.classList.remove('on');
  }

  /** Esconde tudo sem marcar nada: usado ao trocar de mundo. */
  fechar(): void {
    this.encerrar();
    void this.parent;
  }
}
