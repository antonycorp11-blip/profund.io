import { Events } from '../core/events';

/**
 * A moldura da luta de chefe.
 *
 * Antes disto um guardiao era so uma criatura com 190 de vida numa sala
 * grande. Nao havia nome na tela, nao havia barra, e a FURIA — que dobra a
 * velocidade e encurta a recarga, ou seja, a virada inteira do combate —
 * acontecia sem que o jogador tivesse como perceber. Ele morria sem saber o
 * que tinha mudado.
 *
 * O que esta barra promete:
 * - a luta tem comeco declarado (o nome entra, a arena vira "o lugar disto");
 * - o progresso e legivel a qualquer momento;
 * - o limiar de furia fica MARCADO no trilho, entao a virada e algo que se ve
 *   chegando e nao uma surpresa;
 * - o fim e um acontecimento, nao o sumico silencioso de um inimigo.
 */
export class BossBar {
  private root: HTMLDivElement;
  private nomeEl: HTMLElement;
  private taglineEl: HTMLElement;
  private trilho: HTMLElement;
  private fill: HTMLElement;
  /** Fica atras do fill e desce devagar: mostra o tamanho da ultima mordida. */
  private ghost: HTMLElement;
  private marca: HTMLElement;
  private pctEl: HTMLElement;
  private ghostTimer: number | null = null;
  private vivo = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'boss-hud';
    this.root.innerHTML = `
      <div class="boss-nome"><b></b><span></span></div>
      <div class="boss-trilho">
        <i class="boss-ghost"></i>
        <i class="boss-fill"></i>
        <u class="boss-marca"></u>
      </div>
      <div class="boss-pct"></div>`;
    parent.appendChild(this.root);
    this.nomeEl = this.root.querySelector('.boss-nome b')!;
    this.taglineEl = this.root.querySelector('.boss-nome span')!;
    this.trilho = this.root.querySelector('.boss-trilho')!;
    this.fill = this.root.querySelector('.boss-fill')!;
    this.ghost = this.root.querySelector('.boss-ghost')!;
    this.marca = this.root.querySelector('.boss-marca')!;
    this.pctEl = this.root.querySelector('.boss-pct')!;

    Events.on('boss:engaged', (e) => this.abrir(e));
    Events.on('boss:health', (e) => this.vida(e.health, e.maxHealth));
    Events.on('boss:enraged', () => this.furia());
    Events.on('boss:ended', (e) => this.fechar(e.defeated));
    /*
     * Morrer tambem acaba a luta — para o jogador, pelo menos.
     *
     * Sem isto a barra do chefe ficava pendurada por cima da tela de morte,
     * contando a vida de um bicho que o jogador nao esta mais enfrentando. E
     * quando ele voltasse, a barra estaria mostrando um numero velho: o chefe
     * volta ao posto e nao perde a vida que perdeu, mas ninguem esta lendo
     * aquilo ate encostar nele de novo.
     */
    Events.on('player:died', () => this.esconder());
  }

  /**
   * Recolhe as pilulas de recurso enquanto a luta dura.
   *
   * Elas ficam no mesmo canto de cima. Numa luta de chefe, saber quanto
   * carvao se tem nao decide nada e ler a vida do bicho decide tudo — entao
   * elas apagam em vez de disputar o olhar. Nao somem: quem procurar,
   * encontra.
   */
  private faixaDeRecursos(emLuta: boolean): void {
    document.querySelector('.hud-top-center')?.classList.toggle('em-luta', emLuta);
  }

  /** Tira a moldura da tela sem ceremonia. */
  esconder(): void {
    this.vivo = false;
    this.faixaDeRecursos(false);
    if (this.ghostTimer !== null) {
      window.clearTimeout(this.ghostTimer);
      this.ghostTimer = null;
    }
    this.root.classList.remove('on', 'morto', 'furia', 'entrando');
  }

  private abrir(e: {
    name: string;
    tagline: string;
    health: number;
    maxHealth: number;
    enrageAt: number;
  }): void {
    this.vivo = true;
    this.nomeEl.textContent = e.name;
    this.taglineEl.textContent = e.tagline;
    this.root.classList.remove('furia', 'morto');
    this.root.classList.add('on', 'entrando');
    this.faixaDeRecursos(true);
    // A marca do limiar: daqui para baixo o bicho muda. Fica no trilho desde
    // o primeiro segundo, entao a virada e previsivel — e a tensao vem de ver
    // a barra se aproximando dela, nao do susto.
    this.marca.style.left = `${e.enrageAt * 100}%`;
    this.aplicar(e.health / e.maxHealth);
    this.ghost.style.width = this.fill.style.width;
    setTimeout(() => this.root.classList.remove('entrando'), 2600);
  }

  private aplicar(ratio: number): void {
    const p = Math.max(0, Math.min(1, ratio));
    this.fill.style.width = `${p * 100}%`;
    this.pctEl.textContent = `${Math.ceil(p * 100)}%`;
  }

  private vida(health: number, max: number): void {
    if (!this.vivo) return;
    this.aplicar(health / max);
    this.trilho.classList.remove('bateu');
    // Reiniciar a animacao exige um reflow; sem isto dois tiros seguidos so
    // piscam uma vez e o jogador para de sentir o acerto.
    void this.trilho.offsetWidth;
    this.trilho.classList.add('bateu');
    if (this.ghostTimer !== null) window.clearTimeout(this.ghostTimer);
    this.ghostTimer = window.setTimeout(() => {
      this.ghost.style.width = this.fill.style.width;
      this.ghostTimer = null;
    }, 380);
  }

  private furia(): void {
    if (!this.vivo) return;
    this.root.classList.add('furia');
  }

  private fechar(defeated: boolean): void {
    this.vivo = false;
    if (defeated) {
      this.aplicar(0);
      this.ghost.style.width = '0%';
      this.root.classList.add('morto');
    }
    // Derrotado a barra fica mais tempo: e o momento de ver o zero.
    setTimeout(
      () => {
        if (this.vivo) return; // outra luta comecou nesse meio tempo
        this.root.classList.remove('on', 'morto', 'furia');
        this.faixaDeRecursos(false);
      },
      defeated ? 1500 : 400
    );
  }
}
