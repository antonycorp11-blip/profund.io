import { ART } from '../data/art';
import { LAYERS } from '../data/layers';
import { scrollsOfLayer } from '../data/scrolls';
import { Assets } from '../core/Assets';
import type { Journal, JournalEntry, JournalTab } from '../systems/Journal';

const ABAS: { id: JournalTab; nome: string; vazio: string }[] = [
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
  private abaAtual: JournalTab = 'pistas';

  constructor(parent: HTMLElement, private journal: Journal) {
    this.wrap = document.createElement('div');
    this.wrap.className = 'panel-wrap journal';
    this.wrap.innerHTML = `
      <div class="journal-book">
        <header class="journal-header">
          <h3>Guia de Campo</h3>
          <small>de Santiago Ramires</small>
          <button class="icon-btn" data-close>✕</button>
        </header>
        <nav class="journal-tabs"></nav>
        <div class="journal-score" hidden></div>
        <div class="journal-page"><div class="journal-body"></div></div>
      </div>`;
    parent.appendChild(this.wrap);
    this.corpo = this.wrap.querySelector('.journal-body') as HTMLElement;

    const nav = this.wrap.querySelector('.journal-tabs') as HTMLElement;
    for (const aba of ABAS) {
      const b = document.createElement('button');
      b.className = 'journal-tab';
      b.dataset.tab = aba.id;
      b.textContent = aba.nome;
      b.addEventListener('click', () => {
        this.abaAtual = aba.id;
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
      const n = this.journal.count(aba);
      b.textContent = n > 0 ? `${ABAS.find((a) => a.id === aba)!.nome} ${n}` : ABAS.find((a) => a.id === aba)!.nome;
    }

    // Cada aba tem um papel proprio, entao virar de aba parece virar pagina.
    const pagina = ((ABAS.findIndex((a) => a.id === this.abaAtual)) % 5) + 1;
    const fundo = `${ART.basePath}journal/pagina_${pagina}.png`;
    (this.wrap.querySelector('.journal-page') as HTMLElement).style.backgroundImage = `url(${fundo})`;

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

    const itens = this.journal.byTab(this.abaAtual);
    if (itens.length === 0) {
      this.corpo.innerHTML = `<p class="journal-vazio">${
        ABAS.find((a) => a.id === this.abaAtual)!.vazio
      }</p>`;
      return;
    }
    this.corpo.innerHTML = '';
    for (const e of itens) this.corpo.appendChild(this.linha(e));
  }

  private linha(e: JournalEntry): HTMLElement {
    const el = document.createElement('article');
    el.className = 'journal-entry';

    const face = e.face ? Assets.npcStrip(e.face, 'idle') : null;
    if (face && face.width) {
      // Retrato recortado da mesma folha que anda pela cidade.
      const lado = face.height;
      const c = document.createElement('canvas');
      const alt = Math.round(lado * 0.44);
      c.width = alt;
      c.height = alt;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(face, Math.round((lado - alt) / 2), 0, alt, alt, 0, 0, alt, alt);
        const img = document.createElement('img');
        img.className = 'journal-face';
        img.src = c.toDataURL();
        img.alt = e.title;
        el.appendChild(img);
      }
    }

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
    el.appendChild(texto);
    return el;
  }
}
