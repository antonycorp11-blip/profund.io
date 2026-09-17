import { RESOURCES, type ResourceId } from '../data/resources';
import { BASE_CAMPS, type BaseCampDef, type StructureSlot } from '../data/basecamp';
import type { BaseCamps } from '../systems/BaseCamps';

/**
 * O PAINEL DA BASE.
 *
 * Era so a alavanca do refinador. Virou o lugar de onde se toca a operacao
 * inteira, porque era isso que faltava: o jogador tinha cinco maquinas
 * espalhadas por trinta e oito colunas e nenhum lugar que dissesse se aquilo
 * tudo junto estava rendendo.
 *
 * O que ele responde, nesta ordem:
 *
 *  1. ISTO ESTA RENDENDO? — producao MEDIDA, nao estimada. Sao cinco fatores
 *     multiplicando (fogo, esteira, nivel, trabalhador, alimentacao) e nenhum
 *     deles aparece na tela; entao a base conta o que realmente saiu e mostra.
 *  2. O QUE FALTA AQUI? — cada estrutura com nivel e o que ela pede.
 *  3. QUANTAS TOUPEIRAS EU AGUENTO? — vagas, preco e o botao de contratar.
 *
 * Contratar e botao. MELHORAR nao e, e isso e regra da casa: obra se faz com
 * picareta e tempo (ver /data/basecamp.ts). O painel diz o preco e onde bater;
 * quem bate e o jogador, no proprio encaixe.
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
      naBase(base: BaseCampDef): number;
      contratar(base: BaseCampDef): boolean;
    },
    /**
     * A BANCADA de municao.
     *
     * Fabricar mora aqui, e nao numa receita automatica da refinaria, por um
     * motivo duro: `REFINE_RECIPES` converte TUDO que chega, entao pendurar
     * `ferro -> municao` nela faria a base comer sozinha o ferro das
     * construcoes. Municao e uma decisao, nao um efeito colateral.
     */
    private bancada?: {
      custo(): { ferro: number; leva: number };
      ferroNaBase(base: BaseCampDef): number;
      municaoAtual(): number;
      fabricar(base: BaseCampDef): boolean;
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
    this.timer = 0.5;
    this.render();
  }

  // ------------------------------------------------------------- pedacos --

  private lista(m: Map<ResourceId, number>): string {
    const itens = [...m].filter(([, n]) => n >= 0.05);
    if (itens.length === 0) return '<i>vazio</i>';
    return itens
      .map(([r, n]) => `<span><b>${Math.floor(n)}</b> ${RESOURCES[r].name}</span>`)
      .join('');
  }

  private custoTexto(c: Partial<Record<ResourceId, number>>): string {
    return Object.entries(c)
      .map(([id, n]) => `${n} ${RESOURCES[id as ResourceId].name}`)
      .join(' · ');
  }

  /**
   * Producao medida da base.
   *
   * Dois numeros, e os dois importam por motivos diferentes: o que o fogo
   * REFINA por minuto diz se a maquina esta viva; o que o elevador SOBE por
   * minuto diz se a cota vai ser paga. Uma base pode estar refinando muito e
   * subindo nada — e ai o problema e a alavanca, nao o carvao.
   */
  private secaoProducao(base: BaseCampDef): string {
    const fogo = this.camps.fuelOf(base.id);
    const r = this.camps.ritmoDe(base.id);
    const num = (v: number): string => (v >= 10 ? Math.round(v).toString() : v.toFixed(1));
    const temElevador = this.camps.built(base.id, 'elevador');
    return `
      <div class="camp-fire ${fogo > 0 ? 'on' : ''}">
        <span>${fogo > 0 ? '🔥' : '🜂'}</span>
        <div><b>${Math.round(fogo)}</b> de fogo
          <small>${
            fogo > 0 ? 'o refinador esta trabalhando' : 'sem carvao no deposito: a base parou'
          }</small>
        </div>
      </div>
      <div class="camp-rate">
        <div class="camp-rate-card ${r.refino > 0 ? 'on' : ''}">
          <b>${num(r.refino)}</b><span>refinado / min</span>
        </div>
        <div class="camp-rate-card ${r.subida > 0 ? 'on' : ''}">
          <b>${temElevador ? num(r.subida) : '—'}</b><span>subindo / min</span>
        </div>
      </div>`;
  }

  /**
   * As maquinas, uma linha cada.
   *
   * Nivel, estado e — quando cabe melhoria — o preco dela e a instrucao de
   * onde bater. Sem esta lista o jogador so descobre que existe segundo nivel
   * se por acaso bater numa maquina que ja esta pronta, e isso nao ocorre a
   * ninguem.
   */
  private secaoEstruturas(base: BaseCampDef): string {
    const linhas = base.slots
      .map((slot) => this.linhaEstrutura(base, slot))
      .filter((l) => l !== '')
      .join('');
    return `
      <section class="camp-pool">
        <h4>Maquinas</h4>
        <div class="camp-machines">${linhas}</div>
      </section>`;
  }

  private linhaEstrutura(base: BaseCampDef, slot: StructureSlot): string {
    const st = this.camps.stateOf(base.id, slot.kind);
    if (st.state === 'bloqueado') return '';
    const nivel = this.camps.nivelDe(base.id, slot.kind);
    const prog = this.camps.progress(base, slot);

    if (st.state === 'erguendo' || (st.state === 'disponivel' && st.hits > 0)) {
      return this.linha(slot.nome, nivel, 'em obra', prog);
    }
    if (st.state === 'disponivel') {
      return this.linha(slot.nome, nivel, `falta erguer — ${this.custoTexto(slot.cost)}`, null);
    }
    if (st.state === 'melhorando') return this.linha(slot.nome, nivel, 'melhorando', null);

    const mel = slot.melhoria;
    if (!mel) return this.linha(slot.nome, nivel, 'pronta', null);
    if (nivel >= 1) return this.linha(slot.nome, nivel, 'no maximo', null);
    const mp = this.camps.melhoriaProgress(base, slot) ?? 0;
    if (mp > 0) return this.linha(slot.nome, nivel, 'melhorando', mp);
    return this.linha(
      slot.nome,
      nivel,
      `melhorar: ${this.custoTexto(mel.cost)} — bata nela com a picareta`,
      null,
      mel.ganho
    );
  }

  private linha(
    nome: string,
    nivel: number,
    estado: string,
    prog: number | null,
    ganho?: string
  ): string {
    return `
      <div class="camp-machine">
        <div class="camp-machine-head">
          <b>${nome}</b>
          <span class="camp-nivel">${nivel >= 1 ? 'NIVEL II' : 'NIVEL I'}</span>
        </div>
        <small>${estado}</small>
        ${ganho ? `<small class="camp-ganho">✦ ${ganho}</small>` : ''}
        ${
          prog !== null
            ? `<span class="camp-prog"><i style="width:${Math.round(prog * 100)}%"></i></span>`
            : ''
        }
      </div>`;
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
    if (!this.camps.built(base.id, 'deposito')) {
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
    const aqui = this.equipe.naBase(base);
    const custo = this.equipe.custo();
    const moedas = this.equipe.moedas();
    const cheio = total >= max;
    const pobre = moedas < custo;
    const galpao = this.camps.nivelDe(base.id, 'deposito') >= 1;
    return `
      <section class="camp-pool">
        <h4>Toupeiras</h4>
        <div class="camp-list">
          <span><b>${aqui}</b> nesta base</span>
          <span><b>${total}</b> de ${max} vagas no total</span>
        </div>
        <p class="camp-hint">Elas descarregam neste deposito. Contratada aqui, comeca aqui.</p>
        <button class="btn primary" data-hire-mole ${cheio || pobre ? 'disabled' : ''}>
          ${cheio ? 'SEM VAGA' : `CONTRATAR — ✦ ${custo.toLocaleString('pt-BR')}`}
        </button>
        ${
          cheio && !galpao
            ? '<p class="camp-aviso">Melhore o Deposito Bruto para abrir mais vagas aqui mesmo.</p>'
            : ''
        }
        ${
          pobre && !cheio
            ? `<p class="camp-hint">Voce tem ✦ ${Math.floor(moedas).toLocaleString('pt-BR')}.</p>`
            : ''
        }
      </section>`;
  }

  // -------------------------------------------------------------- pintura --

  /** A bancada: ferro vira bala. */
  private secaoBancada(base: BaseCampDef): string {
    if (!this.bancada) return '';
    const { ferro, leva } = this.bancada.custo();
    const tem = Math.floor(this.bancada.ferroNaBase(base));
    const da = tem >= ferro;
    return `
      <section class="camp-pool">
        <h4>Bancada de municao</h4>
        <p class="camp-hint">A picareta abre pedra. Bicho e outra conversa —
           e ela sai daqui, do seu proprio ferro.</p>
        <div class="camp-list">
          <span><b>${this.bancada.municaoAtual()}</b> na cartucheira</span>
          <span><b>${tem}</b> de ferro nesta base</span>
        </div>
        <button class="btn primary" data-craft-ammo ${da ? '' : 'disabled'}>
          ${da ? `FABRICAR ${leva} BALAS — ${ferro} DE FERRO` : `FALTA FERRO (${tem}/${ferro})`}
        </button>
      </section>`;
  }

  private render(): void {
    const base = this.baseAtual;
    const pct = Math.round(this.camps.shareOf(base.id) * 100);

    // Preserva o foco do controle deslizante entre repinturas.
    const arrastando = document.activeElement?.getAttribute('data-share') !== null;
    if (arrastando && this.corpo.querySelector('[data-share]')) {
      const alvo = this.corpo.querySelector('[data-pct]') as HTMLElement | null;
      if (alvo) alvo.textContent = `${pct}%`;
      return;
    }

    this.corpo.innerHTML = `
      ${this.secaoProducao(base)}

      <section class="camp-pool">
        <h4>Bruto no deposito</h4>
        <div class="camp-list">${this.lista(this.camps.brutoOf(base.id))}</div>
      </section>

      <section class="camp-pool">
        <h4>Refinado pronto</h4>
        <div class="camp-list">${this.lista(this.camps.refinadoOf(base.id))}</div>
      </section>

      <section class="camp-share">
        <h4>O que fazer com o refinado</h4>
        <input type="range" min="0" max="100" value="${pct}" data-share>
        <div class="camp-share-labels">
          <span>guardar para construir<b>${100 - pct}%</b></span>
          <span>subir e virar moeda<b data-pct>${pct}%</b></span>
        </div>
      </section>

      ${this.secaoBancada(base)}
      ${this.secaoToupeiras(base)}
      ${this.secaoEstruturas(base)}

      ${
        this.camps.built(base.id, 'elevador')
          ? ''
          : '<p class="camp-aviso">Sem elevador, nada sobe. O refinado fica todo aqui.</p>'
      }`;

    this.corpo.querySelector('[data-craft-ammo]')?.addEventListener('click', () => {
      if (this.bancada?.fabricar(base)) this.render();
    });

    this.corpo.querySelector('[data-hire-mole]')?.addEventListener('click', () => {
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
