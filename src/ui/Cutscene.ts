import { Events } from '../core/events';
import { cutsceneDef, type CutsceneBeat, type CutsceneCamada, type Enquadre } from '../data/cutscenes';

/**
 * O DIRETOR DE CENA.
 *
 * Recebe um roteiro de `/data/cutscenes.ts` e o poe na tela: camadas de arte
 * que caminham devagar, tarjas de cinema, e o texto entrando letra por letra.
 *
 * POR QUE EM DOM E NAO NO CANVAS.
 *
 * O jogo desenha em Canvas2D, entao o instinto seria desenhar a cena la
 * tambem. Duas razoes contra. A primeira e tecnica: o que uma cutscene faz e
 * mover, escalar e desvanecer retangulos com texto por cima — exatamente o que
 * o navegador faz sozinho com `transform` e `opacity`, acelerado, sem passar
 * pelo laco de quadro do jogo. A segunda e de convivencia: o canvas e o laco
 * de render estao sendo mexidos por outra mao neste momento, e uma camada
 * separada nao briga com ninguem.
 *
 * O JOGADOR MANDA NO RITMO. As camadas caminham no tempo do beat, mas o texto
 * so avanca no toque. Cena que corre sozinha e cena que passa por cima de quem
 * le devagar — e este prologo e a primeira coisa que qualquer testador ve.
 */
export class Cutscene {
  private wrap: HTMLDivElement;
  private palco: HTMLDivElement;
  /** Camadas que ficam ACIMA do veu: o assunto da cena. */
  private frente: HTMLDivElement;
  private veu: HTMLDivElement;
  private caixa: HTMLDivElement;
  private quem: HTMLElement;
  private texto: HTMLElement;
  private avanco: HTMLElement;

  private beats: CutsceneBeat[] = [];
  private beat = -1;
  private fala = -1;
  private aoFim: (() => void) | null = null;

  /** Timer da maquina de escrever, para poder ser cortado no toque. */
  private escrevendo: number | null = null;
  private falaCompleta = '';

  constructor(private root: HTMLElement) {
    this.wrap = document.createElement('div');
    this.wrap.className = 'cutscene';
    this.wrap.hidden = true;
    this.wrap.innerHTML = `
      <div class="cs-palco"></div>
      <div class="cs-veu"></div>
      <div class="cs-palco cs-palco-frente"></div>
      <div class="cs-tarja cs-tarja-topo"></div>
      <div class="cs-tarja cs-tarja-baixo"></div>
      <button class="cs-pular" type="button">PULAR</button>
      <div class="cs-caixa">
        <b class="cs-quem"></b>
        <p class="cs-texto"></p>
        <span class="cs-avanco">toque para continuar</span>
      </div>`;
    this.palco = this.wrap.querySelector('.cs-palco') as HTMLDivElement;
    this.frente = this.wrap.querySelector('.cs-palco-frente') as HTMLDivElement;
    this.veu = this.wrap.querySelector('.cs-veu') as HTMLDivElement;
    this.caixa = this.wrap.querySelector('.cs-caixa') as HTMLDivElement;
    this.quem = this.wrap.querySelector('.cs-quem') as HTMLElement;
    this.texto = this.wrap.querySelector('.cs-texto') as HTMLElement;
    this.avanco = this.wrap.querySelector('.cs-avanco') as HTMLElement;
    this.root.appendChild(this.wrap);

    /*
     * O PULAR e um botao de verdade, e nao "segure para pular".
     *
     * Segurar e um gesto que ninguem descobre sozinho, e quem ja viu a cena
     * uma vez quer sair dela no primeiro toque. O botao fica no canto, fora do
     * caminho do dedo que avanca o texto.
     */
    (this.wrap.querySelector('.cs-pular') as HTMLElement).addEventListener('click', (e) => {
      e.stopPropagation();
      this.encerrar();
    });
    this.wrap.addEventListener('click', () => this.avancar());
  }

  get ativa(): boolean {
    return !this.wrap.hidden;
  }

  tocar(id: string, aoFim?: () => void): boolean {
    const def = cutsceneDef(id);
    if (!def || def.beats.length === 0) {
      aoFim?.();
      return false;
    }
    this.beats = def.beats;
    this.beat = -1;
    this.aoFim = aoFim ?? null;
    this.wrap.hidden = false;
    // Um quadro de atraso para a classe pegar: sem isso a transicao de
    // entrada das tarjas nao acontece, ela ja nasce no estado final.
    requestAnimationFrame(() => this.wrap.classList.add('on'));
    Events.emit('cutscene:inicio', { id });
    this.proximoBeat();
    return true;
  }

  private proximoBeat(): void {
    this.beat++;
    if (this.beat >= this.beats.length) {
      this.encerrar();
      return;
    }
    const b = this.beats[this.beat];
    this.montarCamadas(b);
    this.veu.style.background = b.veu ?? 'transparent';
    this.fala = -1;
    this.avancar();
  }

  /**
   * Monta as camadas no ponto de partida e, um quadro depois, manda elas para
   * o ponto de chegada.
   *
   * O quadro de atraso e o truque inteiro: o navegador so anima uma
   * propriedade se ela MUDAR depois do elemento ja estar no documento. Sem
   * ele, `de` e `para` seriam aplicados no mesmo ciclo e a camada nasceria
   * direto no fim, parada.
   */
  private montarCamadas(b: CutsceneBeat): void {
    this.palco.innerHTML = '';
    this.frente.innerHTML = '';
    const elementos: { el: HTMLElement; cam: CutsceneCamada }[] = [];
    for (const cam of b.camadas) {
      const el = document.createElement('div');
      el.className = 'cs-camada';
      el.style.backgroundImage = `url(art/${cam.arte})`;
      if (cam.quadro) {
        /*
         * Um quadro de uma TIRA de animacao.
         *
         * `character/idle.png` sao oito quadros de 128 lado a lado. Sem
         * recortar, a silhueta do Elias entraria na cena como uma fileira de
         * oito Elias — e eu so descobriria isso olhando.
         */
        const { lado, indice } = cam.quadro;
        el.dataset.quadros = String(lado);
        el.style.backgroundRepeat = 'no-repeat';
        el.style.setProperty('--quadro', String(indice));
      }
      el.style.transitionDuration = `${b.duracao}s`;
      this.aplicar(el, cam.de, cam);
      (cam.frente ? this.frente : this.palco).appendChild(el);
      elementos.push({ el, cam });
    }
    requestAnimationFrame(() => {
      for (const { el, cam } of elementos) {
        if (cam.para) this.aplicar(el, cam.para, cam);
      }
    });
  }

  private aplicar(el: HTMLElement, q: Enquadre, cam: CutsceneCamada): void {
    /*
     * A ESCALA E FRACAO DA ALTURA DA TELA, nao pixel.
     *
     * A cena roda em 852x393 no celular e em qualquer coisa no navegador. Com
     * pixel fixo, o mesmo beat enquadraria diferente nos dois — e enquadramento
     * e a unica coisa que uma cena tem.
     */
    el.style.height = `${q.escala * 100}%`;
    // A largura sai da propria imagem: `contain` mantem a proporcao dela sem
    // eu precisar repetir as medidas de cada PNG aqui.
    el.style.width = cam.quadro ? `${q.escala * 100}%` : '100%';
    el.style.left = `${q.x * 100}%`;
    el.style.top = `${q.y * 100}%`;
    el.style.opacity = String(q.alfa ?? 1);
  }

  private avancar(): void {
    // Toque no meio da digitacao completa a fala em vez de pular para a
    // proxima: quem tocou com pressa quer LER logo, nao perder a linha.
    if (this.escrevendo !== null) {
      window.clearInterval(this.escrevendo);
      this.escrevendo = null;
      this.texto.textContent = this.falaCompleta;
      this.avanco.hidden = false;
      return;
    }
    const b = this.beats[this.beat];
    if (!b) return;
    this.fala++;
    if (this.fala >= b.falas.length) {
      this.proximoBeat();
      return;
    }
    const linha = b.falas[this.fala];
    this.quem.textContent = linha.speaker;
    this.caixa.classList.toggle('cs-narrador', linha.speaker.includes('gravacao'));
    this.datilografar(linha.text);
  }

  private datilografar(txt: string): void {
    this.falaCompleta = txt;
    this.texto.textContent = '';
    this.avanco.hidden = true;
    let i = 0;
    this.escrevendo = window.setInterval(() => {
      i++;
      this.texto.textContent = txt.slice(0, i);
      if (i < txt.length) return;
      window.clearInterval(this.escrevendo as number);
      this.escrevendo = null;
      this.avanco.hidden = false;
    }, 22);
  }

  private encerrar(): void {
    if (this.wrap.hidden) return;
    if (this.escrevendo !== null) {
      window.clearInterval(this.escrevendo);
      this.escrevendo = null;
    }
    this.wrap.classList.remove('on');
    const fim = this.aoFim;
    this.aoFim = null;
    // Espera a cortina fechar antes de devolver o jogo: cortar no meio do
    // desvanecer entrega a tela de jogo por baixo da cena ainda visivel.
    window.setTimeout(() => {
      this.wrap.hidden = true;
      this.palco.innerHTML = '';
      this.frente.innerHTML = '';
      Events.emit('cutscene:fim', {});
      fim?.();
    }, 420);
  }
}
