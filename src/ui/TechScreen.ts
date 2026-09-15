import { CONFIG } from '../data/config';
import { RESOURCES, type ResourceId } from '../data/resources';
import { TECH_CATEGORIES, techsOf, type TechCategory, type TechDef } from '../data/tech';
import { Haptics } from '../fx/Haptics';
import type { Clone, CloneFocus } from '../entities/Clone';
import type { CloneManager } from '../systems/CloneManager';
import type { TechTree } from '../systems/TechTree';
import type { BaseStock } from '../systems/BaseStock';

export interface TechHost {
  tech: TechTree;
  clones: CloneManager;
  stock: BaseStock;
  deepest(): number;
  /** Profundidade em metros de um Y de mundo (para o monitor das copias). */
  depthOf(y: number): number;
  /** Onde a proxima copia deve nascer (perto do jogador). */
  spawnPoint(): { x: number; y: number };
  onToolUnlocked(index: number): void;
}

type Tab = TechCategory | 'copiadora';

/** Tela de Pesquisa e Tecnologia + painel da Copiadora. */
export class TechScreen {
  private wrap: HTMLDivElement;
  private tabsEl: HTMLElement;
  private bodyEl: HTMLElement;
  private stockEl: HTMLElement;
  private tab: Tab = 'copias';
  /** True depois que o jogador escolheu uma aba a mao nesta sessao. */
  private tabChosen = false;

  constructor(parent: HTMLElement, private host: TechHost) {
    this.wrap = document.createElement('div');
    this.wrap.className = 'panel-wrap techscreen';
    this.wrap.innerHTML = `
      <div class="tech-screen">
        <header class="tech-header">
          <div class="tech-tabs"></div>
          <div class="tech-stock"></div>
          <button class="icon-btn" data-close>✕</button>
        </header>
        <div class="tech-body"></div>
      </div>`;
    parent.appendChild(this.wrap);
    this.tabsEl = this.wrap.querySelector('.tech-tabs') as HTMLElement;
    this.bodyEl = this.wrap.querySelector('.tech-body') as HTMLElement;
    this.stockEl = this.wrap.querySelector('.tech-stock') as HTMLElement;

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

  /** Enquanto o painel das copias esta aberto, ele se atualiza sozinho: e um
   *  monitor do trabalho delas, nao uma foto do momento em que abriu. */
  private liveTimer = 0;

  private startLive(): void {
    this.stopLive();
    this.liveTimer = window.setInterval(() => {
      if (!this.isOpen || this.tab !== 'copiadora') return;
      this.refreshCloneLive();
    }, 400);
  }

  private stopLive(): void {
    if (this.liveTimer) window.clearInterval(this.liveTimer);
    this.liveTimer = 0;
  }

  open(tab?: Tab): void {
    if (tab) {
      this.tab = tab;
      this.tabChosen = true;
    } else if (!this.tabChosen && this.host.tech.unlocked('cloner')) {
      // Depois de pesquisar a copiadora, ela e o motivo de abrir esta tela.
      // Cair na aba de pesquisa e obrigar a procurar a aba certa era o caminho
      // mais longo possivel ate a coisa mais usada.
      this.tab = 'copiadora';
    }
    this.wrap.classList.add('open');
    this.render();
    if (this.tab === 'copiadora') this.startLive();
  }

  /** Atalho direto para o painel das copias. */
  openCloner(): void {
    this.open('copiadora');
  }

  close(): void {
    this.wrap.classList.remove('open');
    this.stopLive();
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  // --------------------------------------------------------------- render --

  private render(): void {
    this.renderTabs();
    this.renderStock();
    if (this.tab === 'copiadora') this.renderCloner();
    else this.renderTechs(this.tab);
  }

  private renderTabs(): void {
    const tabs: { id: Tab; name: string; icon: string; color: string }[] = Object.values(
      TECH_CATEGORIES
    ).map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }));
    if (this.host.tech.unlocked('cloner')) {
      tabs.unshift({ id: 'copiadora', name: 'Copiadora', icon: '⧉', color: '#5ac7d0' });
    }

    this.tabsEl.innerHTML = '';
    for (const t of tabs) {
      const btn = document.createElement('button');
      btn.className = `skill-tab ${t.id === this.tab ? 'active' : ''}`;
      btn.style.setProperty('--cat', t.color);
      btn.innerHTML = `<span class="tab-icon">${t.icon}</span><span>${t.name}</span>`;
      btn.addEventListener('click', () => {
        this.tab = t.id;
        this.tabChosen = true;
        if (t.id === 'copiadora') this.startLive();
        else this.stopLive();
        this.render();
      });
      this.tabsEl.appendChild(btn);
    }
  }

  private renderStock(): void {
    const parts: string[] = [];
    for (const [id, qty] of this.host.stock.entries()) {
      if (qty <= 0) continue;
      parts.push(
        `<span><i style="background:${RESOURCES[id].color}"></i>${RESOURCES[id].name} ${qty}</span>`
      );
    }
    this.stockEl.innerHTML = parts.join('') || '<span class="dim">estoque vazio</span>';
  }

  private renderTechs(cat: TechCategory): void {
    const meta = TECH_CATEGORIES[cat];
    const list = techsOf(cat);
    let html = `<p class="tech-fantasy" style="color:${meta.color}">${meta.description}</p><div class="tech-grid">`;

    for (const def of list) {
      const done = this.host.tech.has(def.id);
      const check = this.host.tech.canResearch(def.id, this.host.deepest());
      const cls = done ? 'done' : check.ok ? 'ready' : 'locked';
      html += `
        <div class="tech-card ${cls}" style="--cat:${meta.color}">
          <div class="tech-card-head">
            <span class="tech-icon">${def.icon}</span>
            <b>${def.name}</b>
          </div>
          <p>${def.description}</p>
          <div class="tech-cost">${this.costHtml(def)}</div>
          ${
            done
              ? '<div class="tech-status ok">Pesquisada</div>'
              : check.ok
                ? `<button class="btn primary" data-research="${def.id}">PESQUISAR</button>`
                : `<div class="tech-status">${check.reason ?? ''}</div>`
          }
        </div>`;
    }
    html += '</div>';
    this.bodyEl.innerHTML = html;

    for (const btn of Array.from(this.bodyEl.querySelectorAll('[data-research]'))) {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.research!;
        if (!this.host.tech.research(id, this.host.deepest())) return;
        Haptics.ui();
        const unlocks = this.host.tech.maxToolIndex();
        this.host.onToolUnlocked(unlocks);
        this.render();
      });
    }
  }

  private costHtml(def: TechDef): string {
    return Object.entries(def.cost)
      .map(([id, qty]) => {
        const rid = id as ResourceId;
        const have = this.host.stock.count(rid);
        const ok = have >= (qty ?? 0);
        return `<span class="${ok ? 'ok' : 'miss'}">${RESOURCES[rid].name} ${have}/${qty}</span>`;
      })
      .join('');
  }

  // ------------------------------------------------------------ copiadora --

  private renderCloner(): void {
    const mgr = this.host.clones;
    const cost = mgr.costFor();
    const money = Math.floor(this.host.stock.money);
    const costHtml =
      `<span class="${money >= cost ? 'ok' : 'miss'}">` +
      `✦ ${cost.toLocaleString('pt-BR')} moedas` +
      `<small> (voce tem ${money.toLocaleString('pt-BR')})</small></span>`;

    let html = `
      <div class="cloner-head">
        <div>
          <h4>Copiadora</h4>
          <p>Cada copia mina, coleta e entrega sozinha. Camaras usadas:
             <b>${mgr.clones.length}/${mgr.slots}</b></p>
        </div>
        <div class="cloner-new">
          <div class="tech-cost">${costHtml}</div>
          <button class="btn primary" data-create ${mgr.canCreate && mgr.canAfford() ? '' : 'disabled'}>
            IMPRIMIR COPIA
          </button>
          ${
            !mgr.canCreate
              ? '<div class="tech-status">Pesquise mais camaras para ampliar</div>'
              : ''
          }
        </div>
      </div>
      <div class="clone-list">`;

    if (mgr.clones.length === 0) {
      html += '<p class="map-empty">Nenhuma copia ativa. Imprima a primeira acima.</p>';
    }

    for (const c of mgr.clones) {
      html += this.cloneCard(c);
    }
    html += '</div>';
    this.bodyEl.innerHTML = html;
    this.bindCloner();
  }

  /**
   * Atualiza so os numeros vivos dos cartoes (estado, profundidade, carga,
   * total entregue). Redesenhar o painel inteiro a cada 400 ms mataria o
   * arrastar dos controles e piscaria a tela.
   */
  private refreshCloneLive(): void {
    for (const c of this.host.clones.clones) {
      const set = (attr: string, txt: string) => {
        const el = this.bodyEl.querySelector(`[data-live-${attr}="${c.id}"]`);
        if (el && el.textContent !== txt) el.textContent = txt;
      };
      set('state', c.statusLabel());
      set('depth', `${Math.round(this.host.depthOf(c.y))} m`);
      set('load', `${c.carried}/${c.capacity}`);
      set('carry', c.summary());
      set('total', `${c.delivered} entregues`);
    }
  }

  private cloneCard(c: Clone): string {
    const focos: { id: CloneFocus; label: string }[] = [
      { id: 'minerar', label: 'Minerar' },
      { id: 'coletar', label: 'Coletar' },
      { id: 'equilibrado', label: 'Os dois' },
    ];
    const recursos: ResourceId[] = ['coal', 'copper', 'iron', 'gold', 'crystal', 'stone'];

    return `
      <div class="clone-card" style="--tint:${c.tint}">
        <div class="clone-card-head">
          <span class="clone-dot" style="background:${c.tint}"></span>
          <b>Copia ${c.index + 1}</b>
          <span class="clone-state" data-live-state="${c.id}">${c.statusLabel()}</span>
          <span class="clone-depth" data-live-depth="${c.id}"></span>
          <span class="clone-load" data-live-load="${c.id}">${c.carried}/${c.capacity}</span>
        </div>
        <div class="clone-live">
          <span data-live-carry="${c.id}"></span>
          <b data-live-total="${c.id}"></b>
        </div>
        <div class="clone-row">
          <label>Foco</label>
          <div class="seg">
            ${focos
              .map(
                (f) =>
                  `<button class="${c.config.focus === f.id ? 'on' : ''}"
                     data-focus="${c.id}:${f.id}">${f.label}</button>`
              )
              .join('')}
          </div>
        </div>
        <div class="clone-row">
          <label>O que procurar</label>
          <div class="chips-filter">
            ${recursos
              .map(
                (r) =>
                  `<button class="${c.config.filter.includes(r) ? 'on' : ''}"
                     data-filter="${c.id}:${r}">
                     <i style="background:${RESOURCES[r].color}"></i>${RESOURCES[r].name}
                   </button>`
              )
              .join('')}
            <button class="${c.config.filter.length === 0 ? 'on' : ''}" data-filter="${c.id}:__all">
              Tudo
            </button>
          </div>
        </div>
        <div class="clone-row">
          <label>Area de trabalho</label>
          <input type="range" min="6" max="40" value="${c.config.workRadius}"
                 data-radius="${c.id}">
          <span class="clone-radius">${c.config.workRadius} tiles</span>
        </div>
        <div class="clone-row">
          <label>Entregar sozinho</label>
          <button class="switch ${c.config.autoDeliver ? 'on' : ''}" data-deliver="${c.id}">
            ${c.config.autoDeliver ? 'LIGADO' : 'DESLIGADO'}
          </button>
        </div>
        <div class="clone-row">
          <span class="clone-carry">Carregando: ${c.summary()}</span>
          <button class="btn" data-recall="${c.id}">TRAZER PARA MIM</button>
        </div>
      </div>`;
  }

  private bindCloner(): void {
    const q = (sel: string) => Array.from(this.bodyEl.querySelectorAll(sel));

    q('[data-create]').forEach((b) =>
      b.addEventListener('click', () => {
        const p = this.host.spawnPoint();
        if (this.host.clones.create(p.x, p.y)) {
          Haptics.ui();
          this.render();
        }
      })
    );
    q('[data-focus]').forEach((b) =>
      b.addEventListener('click', () => {
        const [id, focus] = (b as HTMLElement).dataset.focus!.split(':');
        const clone = this.host.clones.clones.find((c) => c.id === id);
        if (!clone) return;
        clone.config.focus = focus as CloneFocus;
        this.render();
      })
    );
    q('[data-filter]').forEach((b) =>
      b.addEventListener('click', () => {
        const [id, res] = (b as HTMLElement).dataset.filter!.split(':');
        const clone = this.host.clones.clones.find((c) => c.id === id);
        if (!clone) return;
        if (res === '__all') clone.config.filter = [];
        else {
          const r = res as ResourceId;
          const i = clone.config.filter.indexOf(r);
          if (i >= 0) clone.config.filter.splice(i, 1);
          else clone.config.filter.push(r);
        }
        this.render();
      })
    );
    q('[data-radius]').forEach((b) =>
      b.addEventListener('input', () => {
        const el = b as HTMLInputElement;
        const clone = this.host.clones.clones.find((c) => c.id === el.dataset.radius);
        if (!clone) return;
        clone.config.workRadius = Number(el.value);
        const label = el.parentElement?.querySelector('.clone-radius');
        if (label) label.textContent = `${el.value} tiles`;
      })
    );
    q('[data-deliver]').forEach((b) =>
      b.addEventListener('click', () => {
        const clone = this.host.clones.clones.find(
          (c) => c.id === (b as HTMLElement).dataset.deliver
        );
        if (!clone) return;
        clone.config.autoDeliver = !clone.config.autoDeliver;
        this.render();
      })
    );
    q('[data-recall]').forEach((b) =>
      b.addEventListener('click', () => {
        const p = this.host.spawnPoint();
        this.host.clones.recall((b as HTMLElement).dataset.recall!, p.x, p.y);
        this.close();
      })
    );
    void CONFIG;
  }
}
