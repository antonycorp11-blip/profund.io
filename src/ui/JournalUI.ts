import { ART } from '../data/art';
import { LAYERS } from '../data/layers';
import { scrollsOfLayer } from '../data/scrolls';
import type { MissionDef } from '../data/missions';
import { Assets } from '../core/Assets';
import type { Journal, JournalEntry, JournalTab } from '../systems/Journal';

const ABAS: { id: JournalTab; nome: string; vazio: string }[] = [
  { id: 'missoes', nome: 'Objetivo', vazio: 'Nenhum objetivo.' },
  { id: 'paginas', nome: 'Anotacoes', vazio: 'Nenhuma anotacao recolhida. Elas estao espalhadas — cave de lado, nao so para baixo.' },
  { id: 'pistas', nome: 'Pistas', vazio: 'Nenhuma pagina do caderno ainda.' },
  { id: 'pessoas', nome: 'Pessoas', vazio: 'Ninguem anotado. Ainda nao encontrei ninguem la embaixo.' },
  { id: 'bichos', nome: 'Bichos', vazio: 'Nenhum bicho anotado. Melhor assim.' },
  { id: 'lugares', nome: 'Lugares', vazio: 'Nenhum lugar registrado.' },
];

/**
 * O Guia de Campo de Santiago.
 *
 * Nao e uma tela de colecionaveis com cadeados: e um caderno. Cada aba e uma
 * pagina de papel rasgado, e cada entrada e uma anotacao a mao, na ordem em
 * que foi descoberta. O que o jogador nao achou nao aparece — nem como
 * silhueta cinza, nem como "???". Vazio e informacao: a pagina em branco diz
 * "voce ainda nao viu isso".
 */
export class JournalUI {
  private wrap: HTMLDivElement;
  private corpo: HTMLElement;
  private abertaEl!: HTMLElement;
  /** Titulo da anotacao aberta na pagina da direita. */
  private aberta: string | null = null;
  private abaAtual: JournalTab = 'pistas';

  constructor(
    parent: HTMLElement,
    private journal: Journal,
    private missions: {
      current(): MissionDef | null;
      done(): MissionDef[];
      pending(): MissionDef[];
    }
  ) {
    this.wrap = document.createElement('div');
    this.wrap.className = 'panel-wrap journal';
    /*
     * UM LIVRO ABERTO, com as abas de couro saindo pela lateral.
     *
     * Era uma pagina so, com as abas em cima como qualquer menu, e a lista
     * despejava titulo e texto de TODAS as anotacoes uma embaixo da outra —
     * vinte e duas paginas de caderno empilhadas numa coluna. Achar a que se
     * queria reler era rolar e reconhecer.
     *
     * Agora sao duas paginas: a esquerda e o indice, a direita e a anotacao
     * aberta. E o formato do proprio objeto que a tela representa, e resolve o
     * problema de leitura de graca: o indice cabe inteiro, e o texto tem
     * largura de coluna de livro em vez de largura de tela.
     */
    this.wrap.innerHTML = `
      <div class="journal-book">
        <nav class="journal-tabs"></nav>
        <div class="journal-livro">
          <header class="journal-header">
            <h3>Guia de Campo</h3>
            <small>de Santiago Ramires</small>
            <button class="icon-btn" data-close>✕</button>
          </header>
          <div class="journal-score" hidden></div>
          <div class="journal-page">
            <div class="journal-indice"></div>
            <div class="journal-aberta"></div>
          </div>
        </div>
      </div>`;
    parent.appendChild(this.wrap);
    this.corpo = this.wrap.querySelector('.journal-indice') as HTMLElement;
    this.abertaEl = this.wrap.querySelector('.journal-aberta') as HTMLElement;

    const nav = this.wrap.querySelector('.journal-tabs') as HTMLElement;
    for (const aba of ABAS) {
      const b = document.createElement('button');
      b.className = 'journal-tab';
      b.dataset.tab = aba.id;
      b.textContent = aba.nome;
      b.addEventListener('click', () => {
        this.abaAtual = aba.id;
        this.aberta = null;
        this.render();
      });
      nav.appendChild(b);
    }

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

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    this.wrap.classList.add('open');
    this.journal.unread = 0;
    this.render();
  }

  close(): void {
    this.wrap.classList.remove('open');
  }

  private render(): void {
    for (const b of this.wrap.querySelectorAll<HTMLElement>('.journal-tab')) {
      const aba = b.dataset.tab as JournalTab;
      b.classList.toggle('active', aba === this.abaAtual);
      const n = aba === 'missoes' ? 0 : this.journal.count(aba);
      b.textContent = n > 0 ? `${ABAS.find((a) => a.id === aba)!.nome} ${n}` : ABAS.find((a) => a.id === aba)!.nome;
    }

    /*
     * As paginas do caderno NAO sao papel de parede desta tela.
     *
     * `journal/pagina_N.png` sao as anotacoes longas do Santiago e do John —
     * ITENS que se acha no mapa e recolhe. Eu tinha sorteado uma delas como
     * fundo de cada aba, e isso fazia duas coisas erradas ao mesmo tempo: dava
     * um mapa do tesouro de cenario para a aba de Bichos, e gastava a unica
     * coisa que o jogador devia sentir que CONQUISTOU.
     *
     * O fundo aqui e papel, e so. A pagina de verdade aparece quando o
     * jogador abre a anotacao que ele achou (ver `renderAberta`).
     */

    // Placar por camada: e o que diz ao jogador que ainda falta coisa ali e
    // que vale voltar. Sem um total conhecido, colecionavel vira acaso.
    const placar = this.wrap.querySelector('.journal-score') as HTMLElement;
    if (this.abaAtual === 'paginas') {
      placar.hidden = false;
      placar.innerHTML = LAYERS.filter((l) => scrollsOfLayer(l.id).length > 0)
        .map((l) => {
          const tem = this.journal.scrollsFound(l.id);
          const total = scrollsOfLayer(l.id).length;
          return `<span class="${tem >= total ? 'ok' : ''}">${l.name}<b>${tem}/${total}</b></span>`;
        })
        .join('');
    } else {
      placar.hidden = true;
    }

    // A aba do objetivo nao vem do caderno: ela le as missoes direto, porque
    // o objetivo ATUAL precisa estar sempre completo e no topo. Era o texto
    // que a faixa da HUD cortava.
    if (this.abaAtual === 'missoes') {
      this.corpo.innerHTML = '';
      const atual = this.missions.current();
      if (atual) {
        const el = document.createElement('article');
        el.className = 'journal-entry atual';
        el.innerHTML = `<div class="journal-text">
          <h4>${atual.title}<span class="journal-depth">agora</span></h4>
          <p>${atual.goal}</p></div>`;
        this.corpo.appendChild(el);
      }
      // Pendencias: objetivos rasos que o jogador ultrapassou. Ficam listados
      // com a profundidade, porque o conteudo continua la esperando.
      const pendentes = this.missions.pending();
      if (pendentes.length > 0) {
        const t = document.createElement('h5');
        t.className = 'journal-sub';
        t.textContent = 'Ficou para tras';
        this.corpo.appendChild(t);
        for (const m of pendentes) {
          const el = document.createElement('article');
          el.className = 'journal-entry pendente';
          el.innerHTML = `<div class="journal-text">
            <h4>${m.title}<span class="journal-depth">${m.depth} m</span></h4>
            <p>${m.goal}</p></div>`;
          this.corpo.appendChild(el);
        }
      }

      const feitas = this.missions.done();
      if (feitas.length > 0) {
        const t = document.createElement('h5');
        t.className = 'journal-sub';
        t.textContent = 'Concluido';
        this.corpo.appendChild(t);
      }
      for (const m of [...feitas].reverse()) {
        const el = document.createElement('article');
        el.className = 'journal-entry';
        el.innerHTML = `<div class="journal-text">
          <h4>${m.title}<span class="journal-depth">feito</span></h4>
          <p>${m.onDone}</p></div>`;
        this.corpo.appendChild(el);
      }
      if (!atual && feitas.length === 0) {
        this.corpo.innerHTML = '<p class="journal-vazio">Nenhum objetivo.</p>';
      }
      return;
    }

    const itens = this.journal.byTab(this.abaAtual);
    if (itens.length === 0) {
      this.corpo.innerHTML = `<p class="journal-vazio">${
        ABAS.find((a) => a.id === this.abaAtual)!.vazio
      }</p>`;
      return;
    }
    if (!itens.some((e) => this.chave(e) === this.aberta)) {
      this.aberta = this.chave(itens[0]);
    }
    this.corpo.innerHTML = '';
    for (const e of itens) this.corpo.appendChild(this.linhaIndice(e));
    this.renderAberta(itens.find((e) => this.chave(e) === this.aberta) ?? itens[0]);
  }

  /** Uma anotacao nao tem id proprio; titulo + profundidade bastam. */
  private chave(e: JournalEntry): string {
    return `${e.title}@${e.depth}`;
  }

  /** Linha do indice: so o que identifica. O texto mora na outra pagina. */
  private linhaIndice(e: JournalEntry): HTMLElement {
    const el = document.createElement('button');
    el.className = `journal-item ${this.chave(e) === this.aberta ? 'aberta' : ''}`;
    el.innerHTML = `
      <span class="journal-item-txt">
        <b>${e.title}</b>
        <small>${e.notes[0] ?? ''}</small>
      </span>
      <span class="journal-depth">${e.depth} m</span>`;
    el.addEventListener('click', () => {
      this.aberta = this.chave(e);
      this.render();
    });
    return el;
  }

  /** A pagina da direita: a anotacao inteira, com o retrato quando houver. */
  private renderAberta(e: JournalEntry | undefined): void {
    if (!e) {
      this.abertaEl.innerHTML = '';
      return;
    }
    this.abertaEl.innerHTML = '';
    const art = document.createElement('article');
    art.className = 'journal-entry';
    // Pergaminho achado: a folha que ele recolheu aparece aqui, inteira. E o
    // unico lugar onde essa arte faz sentido — ela E a anotacao.
    const folha = this.folhaDaPagina(e);
    if (folha) art.appendChild(folha);
    const retrato = this.retrato(e);
    if (retrato) art.appendChild(retrato);
    const texto = document.createElement('div');
    texto.className = 'journal-text';
    const h = document.createElement('h4');
    h.textContent = e.title;
    const prof = document.createElement('span');
    prof.className = 'journal-depth';
    prof.textContent = `${e.depth} m`;
    h.appendChild(prof);
    texto.appendChild(h);
    for (const n of e.notes) {
      const p = document.createElement('p');
      p.textContent = n;
      texto.appendChild(p);
    }
    art.appendChild(texto);
    this.abertaEl.appendChild(art);
  }

  /**
   * A folha de papel de um pergaminho recolhido.
   *
   * So para a aba de paginas: sao cinco artes e a escolha e pelo id, entao a
   * mesma anotacao mostra sempre a mesma folha — papel que muda de cara a cada
   * abertura nao parece um objeto que voce guardou.
   */
  private folhaDaPagina(e: JournalEntry): HTMLElement | null {
    if (!e.id.startsWith('scroll:')) return null;
    let h = 0;
    for (let i = 0; i < e.id.length; i++) h = (h * 31 + e.id.charCodeAt(i)) >>> 0;
    const img = document.createElement('img');
    img.className = 'journal-folha';
    img.src = `${ART.basePath}journal/pagina_${(h % 5) + 1}.png`;
    img.alt = e.title;
    return img;
  }

  /** Retrato recortado da mesma folha que anda pela cidade, quando houver. */
  private retrato(e: JournalEntry): HTMLElement | null {
    const face = e.face ? Assets.npcStrip(e.face, 'idle') : null;
    if (!face || !face.width) return null;
    const lado = face.height;
    const c = document.createElement('canvas');
    const alt = Math.round(lado * 0.44);
    c.width = alt;
    c.height = alt;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(face, Math.round((lado - alt) / 2), 0, alt, alt, 0, 0, alt, alt);
    const img = document.createElement('img');
    img.className = 'journal-face';
    img.src = c.toDataURL();
    img.alt = e.title;
    return img;
  }
}
