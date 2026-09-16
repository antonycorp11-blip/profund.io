import { RESOURCES, type ResourceId } from '../data/resources';
import { BASE_CAMPS, type BaseCampDef } from '../data/basecamp';
import type { BaseCamps } from '../systems/BaseCamps';

/**
 * O painel do refinador.
 *
 * A decisao que ele existe para tomar e uma so: do que sai refinado, quanto
 * SOBE para virar moeda e quanto FICA para construir. Nao e um menu de
 * gerencia — e uma alavanca, e ela tem consequencia imediata nos dois lados.
 *
 * Guardar demais paga a cota com aperto. Subir demais deixa a base sem
 * material para crescer. O jogo nao diz qual e o certo porque depende da
 * semana.
 */
export class BaseCampUI {
  private wrap: HTMLDivElement;
  private corpo: HTMLElement;
  private baseAtual: BaseCampDef = BASE_CAMPS[0];
  private timer = 0;

  constructor(
    parent: HTMLElement,
    private camps: BaseCamps,
    /**
     * A contratacao de toupeira, vista daqui.
     *
     * Contratar mora nesta tela porque e AQUI que faz sentido: o deposito e o
     * balcao delas, e foi o deposito que abriu a vaga. Mandar o jogador subir
     * ate a superficie para contratar uma toupeira que vai trabalhar nesta
     * camada seria burocracia.
     */
    private equipe?: {
      total(): number;
      max(): number;
      custo(): number;
      moedas(): number;
      contratar(base: BaseCampDef): boolean;
    }
  ) {
    this.wrap = document.createElement('div');
    this.wrap.className = 'panel-wrap basecamp';
    this.wrap.innerHTML = `
      <div class="camp-panel">
        <header class="camp-header">
          <h3 data-nome>Base</h3>
          <button class="icon-btn" data-close>✕</button>
        </header>
        <div class="camp-body"></div>
      </div>`;
    parent.appendChild(this.wrap);
    this.corpo = this.wrap.querySelector('.camp-body') as HTMLElement;
    (this.wrap.querySelector('[data-close]') as HTMLElement).addEventListener('click', () =>
      this.close()
    );
    this.wrap.addEventListener('pointerdown', (e) => {
      if (e.target === this.wrap) this.close();
    });
  }

  get isOpen(): boolean {
    return this.wrap.classList.contains('open');
  }

  open(base: BaseCampDef): void {
    this.baseAtual = base;
    this.wrap.classList.add('open');
    (this.wrap.querySelector('[data-nome]') as HTMLElement).textContent = base.nome;
    this.render();
  }

  close(): void {
    this.wrap.classList.remove('open');
  }

  /** Repinta enquanto aberto: a producao anda, e o painel tem que andar junto. */
  update(dt: number): void {
    if (!this.isOpen) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.4;
    this.render();
  }

  /**
   * As toupeiras desta base.
   *
   * Sem deposito de pe elas ainda sobem a mina inteira para entregar, e a
   * secao diz exatamente isso — e o argumento para construir o deposito, e ele
   * vale mais escrito aqui do que num tutorial.
   */
  private secaoToupeiras(base: BaseCampDef): string {
    if (!this.equipe) return '';
    const temDeposito = this.camps.built(base.id, 'deposito');
    if (!temDeposito) {
      return `
        <section class="camp-pool">
          <h4>Toupeiras</h4>
          <p class="camp-aviso">Sem o deposito, elas continuam subindo ate a superficie
             para entregar. Construa o deposito: elas passam a descarregar aqui, e
             ele abre vagas para contratar mais.</p>
        </section>`;
    }
    const total = this.equipe.total();
    const max = this.equipe.max();
    const custo = this.equipe.custo();
    const moedas = this.equipe.moedas();
    const cheio = total >= max;
    const pobre = moedas < custo;
    return `
      <section class="camp-pool">
        <h4>Toupeiras</h4>
        <div class="camp-list"><span><b>${total}</b> de ${max} vagas</span></div>
        <p class="camp-hint">Elas descarregam neste deposito. Contratada aqui, comeca aqui.</p>
        <button class="btn primary" data-hire-mole ${cheio || pobre ? 'disabled' : ''}>
          ${
            cheio
              ? 'SEM VAGA — CONSTRUA OUTRA BASE'
              : `CONTRATAR — ✦ ${custo.toLocaleString('pt-BR')}`
          }
        </button>
        ${pobre && !cheio ? `<p class="camp-hint">Voce tem ✦ ${Math.floor(moedas).toLocaleString('pt-BR')}.</p>` : ''}
      </section>`;
  }

  private render(): void {
    const base = this.baseAtual;
    const fogo = this.camps.fuelOf(base.id);
    const sobe = this.camps.shareOf(base.id);
    const pct = Math.round(sobe * 100);

    const lista = (m: Map<ResourceId, number>): string => {
      const itens = [...m].filter(([, n]) => n >= 0.05);
      if (itens.length === 0) return '<i>vazio</i>';
      return itens
        .map(([r, n]) => `<span><b>${Math.floor(n)}</b> ${RESOURCES[r].name}</span>`)
        .join('');
    };

    // Preserva o foco do controle deslizante entre repinturas.
    const arrastando = document.activeElement?.getAttribute('data-share') !== null;
    if (arrastando && this.corpo.querySelector('[data-share]')) {
      const alvo = this.corpo.querySelector('[data-pct]') as HTMLElement | null;
      if (alvo) alvo.textContent = `${pct}%`;
      return;
    }

    this.corpo.innerHTML = `
      <div class="camp-fire ${fogo > 0 ? 'on' : ''}">
        <span>${fogo > 0 ? '🔥' : '🜂'}</span>
        <div><b>${Math.round(fogo)}</b> de fogo
          <small>${fogo > 0 ? 'o refinador esta trabalhando' : 'sem carvao: a base parou'}</small>
        </div>
      </div>

      <section class="camp-pool">
        <h4>Bruto no deposito</h4>
        <div class="camp-list">${lista(this.camps.brutoOf(base.id))}</div>
      </section>

      <section class="camp-pool">
        <h4>Refinado pronto</h4>
        <div class="camp-list">${lista(this.camps.refinadoOf(base.id))}</div>
      </section>

      <section class="camp-share">
        <h4>O que fazer com o refinado</h4>
        <input type="range" min="0" max="100" value="${pct}" data-share>
        <div class="camp-share-labels">
          <span>guardar para construir<b>${100 - pct}%</b></span>
          <span>subir e virar moeda<b data-pct>${pct}%</b></span>
        </div>
      </section>

      ${this.secaoToupeiras(base)}

      ${
        this.camps.built(base.id, 'elevador')
          ? ''
          : '<p class="camp-aviso">Sem elevador, nada sobe. O refinado fica todo aqui.</p>'
      }`;

    const contratar = this.corpo.querySelector('[data-hire-mole]');
    contratar?.addEventListener('click', () => {
      if (this.equipe?.contratar(base)) this.render();
    });

    const slider = this.corpo.querySelector('[data-share]') as HTMLInputElement;
    slider.addEventListener('input', () => {
      this.camps.setShare(base.id, Number(slider.value) / 100);
      const v = Number(slider.value);
      const labels = this.corpo.querySelectorAll('.camp-share-labels b');
      if (labels[0]) labels[0].textContent = `${100 - v}%`;
      if (labels[1]) labels[1].textContent = `${v}%`;
    });
  }
}
