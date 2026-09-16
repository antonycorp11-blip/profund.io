import { CONFIG } from '../data/config';
import { COLLECTOR_UPGRADES } from '../data/collectors';
import { Events } from '../core/events';
import {
  EQUIP_SLOTS,
  equipDef,
  equipmentOfSlot,
  type EquipSlot,
} from '../data/equipment';
import { RESOURCES, type ResourceId } from '../data/resources';
import { TECH_CATEGORIES, techsOf, type TechCategory, type TechDef } from '../data/tech';
import { Haptics } from '../fx/Haptics';
import type { Clone, CloneFocus } from '../entities/Clone';
import type { CloneManager } from '../systems/CloneManager';
import type { CollectorManager } from '../systems/CollectorManager';
import type { Equipment } from '../systems/Equipment';
import type { Modifier } from '../systems/Attributes';
import type { TechTree } from '../systems/TechTree';
import type { BaseStock } from '../systems/BaseStock';

export interface TechHost {
  tech: TechTree;
  clones: CloneManager;
  collectors: CollectorManager;
  equipment: Equipment;
  stock: BaseStock;
  deepest(): number;
  /** Profundidade em metros de um Y de mundo (para o monitor das copias). */
  depthOf(y: number): number;
  /** Onde a proxima copia deve nascer (perto do jogador). */
  spawnPoint(): { x: number; y: number };
  onToolUnlocked(index: number): void;
}

type Tab = TechCategory | 'copiadora' | 'toupeiras';

/** Modificador em uma linha curta, do jeito que o jogador pensa. */
function describeMod(m: Modifier): string {
  const nomes: Record<string, string> = {
    lightRadius: 'luz',
    defense: 'defesa',
    maxHealth: 'vida',
    knockbackResistance: 'firmeza',
    moveSpeed: 'velocidade',
    inventoryCapacity: 'mochila',
    carryMovePenalty: 'peso da carga',
    climbSpeed: 'escalada',
    climbStamina: 'folego',
    jumpForce: 'salto',
    airControl: 'controle no ar',
    fireResistance: 'resistencia ao fogo',
    environmentalResistance: 'resistencia ambiental',
    healthRegeneration: 'regeneracao',
    rareOreDetectionRadius: 'faro para raro',
    rareOreGlow: 'minerio raro brilha',
    glide: 'planeio',
  };
  const nome = nomes[m.target] ?? m.target;
  if (m.op === 'unlock') return nome;
  if (m.op === 'percentAdd') {
    return `${m.value > 0 ? '+' : ''}${Math.round(m.value * 100)}% ${nome}`;
  }
  const v = Math.abs(m.value) < 1 ? `${Math.round(m.value * 100)}%` : `${m.value}`;
  return `${m.value > 0 ? '+' : ''}${v} ${nome}`;
}

/** Tela de Pesquisa e Tecnologia + painel da Copiadora. */
export class TechScreen {
  private wrap: HTMLDivElement;
  private tabsEl: HTMLElement;
  private bodyEl: HTMLElement;
  private stockEl: HTMLElement;
  private tab: Tab = 'copias';
  /** True depois que o jogador escolheu uma aba a mao nesta sessao. */
  private tabChosen = false;
  /** Lembra se a gaveta de melhorias estava aberta. */
  private upgradesOpen = false;

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
      if (!this.isOpen) return;
      if (this.tab !== 'copiadora' && this.tab !== 'toupeiras') return;
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
    if (this.tab === 'copiadora' || this.tab === 'toupeiras') this.startLive();
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
    else if (this.tab === 'toupeiras') this.renderCollectors();
    else if (this.tab === 'equipamento') this.renderEquipment();
    else this.renderTechs(this.tab);
  }

  private renderTabs(): void {
    const tabs: { id: Tab; name: string; icon: string; color: string }[] = Object.values(
      TECH_CATEGORIES
    ).map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }));
    tabs.unshift({ id: 'toupeiras', name: 'Toupeiras', icon: '🐀', color: '#d8a35a' });
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
        if (t.id === 'copiadora' || t.id === 'toupeiras') this.startLive();
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
      ${this.cloneUpgrades()}
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

  // ---------------------------------------------------------- equipamento --

  /**
   * Loja de equipamento, por slot.
   *
   * Comprar custa moeda; equipar nao custa nada. A escolha interessante e qual
   * levar — cobrar pela troca so faria o jogador evitar experimentar.
   */
  private renderEquipment(): void {
    const eq = this.host.equipment;
    const money = Math.floor(this.host.stock.money);
    const deepest = this.host.deepest();

    const blocos = Object.values(EQUIP_SLOTS)
      .map((slot) => {
        const itens = equipmentOfSlot(slot.id)
          .map((def) => {
            const tem = eq.has(def.id);
            const vestido = eq.isEquipped(def.id);
            const longe = deepest < def.requiredDepth;
            const efeitos = def.modifiers.map((m) => describeMod(m)).join(' · ');

            let acao: string;
            if (vestido) {
              acao = `<button class="btn" data-uneq="${slot.id}">TIRAR</button>`;
            } else if (tem) {
              acao = `<button class="btn primary" data-eq="${def.id}">EQUIPAR</button>`;
            } else if (longe) {
              acao = `<div class="tech-status">Chegue a ${def.requiredDepth} m</div>`;
            } else {
              acao = `<button class="btn ${money >= def.cost ? 'primary' : ''}" data-buyeq="${def.id}"
                        ${money >= def.cost ? '' : 'disabled'}>✦ ${def.cost.toLocaleString('pt-BR')}</button>`;
            }

            return `
              <div class="eq-card ${vestido ? 'on' : ''} ${longe && !tem ? 'locked' : ''}">
                <div class="eq-head"><span class="eq-icon">${def.icon}</span><b>${def.name}</b></div>
                <p>${def.description}</p>
                <div class="eq-mods">${efeitos}</div>
                <div class="eq-foot">${acao}</div>
              </div>`;
          })
          .join('');

        const atual = eq.equippedIn(slot.id);
        const nomeAtual = atual ? (equipDef(atual)?.name ?? '') : 'vazio';
        return `
          <div class="eq-slot">
            <h4><span>${slot.icon}</span> ${slot.name}
              <small>${nomeAtual}</small></h4>
            <div class="eq-grid">${itens}</div>
          </div>`;
      })
      .join('');

    this.bodyEl.innerHTML = `<div class="eq-list">${blocos}</div>`;
    this.bindEquipment();
  }

  private bindEquipment(): void {
    const eq = this.host.equipment;
    for (const b of Array.from(this.bodyEl.querySelectorAll('[data-buyeq]'))) {
      b.addEventListener('click', () => {
        if (eq.buy((b as HTMLElement).dataset.buyeq!)) {
          Haptics.ui();
          this.render();
        }
      });
    }
    for (const b of Array.from(this.bodyEl.querySelectorAll('[data-eq]'))) {
      b.addEventListener('click', () => {
        eq.equip((b as HTMLElement).dataset.eq!);
        Haptics.ui();
        this.render();
      });
    }
    for (const b of Array.from(this.bodyEl.querySelectorAll('[data-uneq]'))) {
      b.addEventListener('click', () => {
        eq.unequip((b as HTMLElement).dataset.uneq as EquipSlot);
        Haptics.ui();
        this.render();
      });
    }
  }

  // ------------------------------------------------------------ toupeiras --

  /**
   * Painel das toupeiras coletoras.
   *
   * Tudo aqui se paga com moeda. Elas existem para recolher o que ficou para
   * tras quando a mochila encheu — e o dinheiro que compra mais toupeiras vem
   * justamente do que elas trazem.
   */
  private renderCollectors(): void {
    const mgr = this.host.collectors;
    const money = Math.floor(this.host.stock.money);
    const custo = mgr.costFor();
    const cheio = mgr.units.length >= mgr.max;

    const upgrades = COLLECTOR_UPGRADES.map((u) => {
      const nivel = mgr.levelOf(u.id);
      const max = nivel >= u.maxLevel;
      const preco = mgr.upgradeCost(u.id);
      return `
        <div class="up-card ${max ? 'done' : ''}">
          <div class="up-head"><span>${u.icon}</span><b>${u.name}</b>
            <span class="up-level">${nivel}/${u.maxLevel}</span></div>
          <p>${u.description}</p>
          ${
            max
              ? '<div class="up-done">NO MAXIMO</div>'
              : `<button class="btn" data-colup="${u.id}" ${money >= preco ? '' : 'disabled'}>
                   ✦ ${preco.toLocaleString('pt-BR')}
                 </button>`
          }
        </div>`;
    }).join('');

    let html = `
      <div class="cloner-head">
        <div>
          <h4>Toupeiras coletoras</h4>
          <p>Elas nao mineram: buscam o que ficou no chao e trazem para a base.
             Cavam reto, entao chegam onde voce nao volta mais.
             Ativas: <b>${mgr.units.length}/${mgr.max}</b></p>
          <p class="dim">Cada <b>deposito de base</b> construido abre mais vagas — e vira
             um balcao novo: a toupeira descarrega la em vez de subir a mina inteira.</p>
        </div>
        <div class="cloner-new">
          <div class="tech-cost">
            <span class="${money >= custo ? 'ok' : 'miss'}">✦ ${custo.toLocaleString('pt-BR')} moedas
            <small> (voce tem ${money.toLocaleString('pt-BR')})</small></span>
          </div>
          <button class="btn primary" data-hire ${!cheio && mgr.canAfford() ? '' : 'disabled'}>
            CONTRATAR TOUPEIRA
          </button>
          <button class="btn" data-dumpall ${mgr.carriedTotal() > 0 ? '' : 'disabled'}>
            MANDAR ENTREGAR (${mgr.carriedTotal()})
          </button>
        </div>
      </div>
      <details class="clone-upgrades" open>
        <summary>Melhorias das toupeiras</summary>
        <div class="up-grid">${upgrades}</div>
      </details>
      <div class="clone-list">`;

    if (mgr.units.length === 0) {
      html += '<p class="map-empty">Nenhuma toupeira ainda. Contrate a primeira acima.</p>';
    }
    for (const u of mgr.units) {
      html += `
        <div class="clone-card" style="--tint:#d8a35a">
          <div class="clone-card-head">
            <span class="clone-dot" style="background:#d8a35a"></span>
            <b>Toupeira ${u.index + 1}</b>
            <span class="clone-state" data-live-cstate="${u.id}">${u.statusLabel()}</span>
            <span class="clone-depth" data-live-cdepth="${u.id}"></span>
            <span class="clone-load" data-live-cload="${u.id}">${u.carried}/${u.capacity}</span>
          </div>
          <div class="clone-live">
            <span data-live-ccarry="${u.id}"></span>
            <b data-live-ctotal="${u.id}"></b>
          </div>
        </div>`;
    }
    html += '</div>';
    this.bodyEl.innerHTML = html;
    this.bindCollectors();
  }

  private bindCollectors(): void {
    const dump = this.bodyEl.querySelector('[data-dumpall]');
    dump?.addEventListener('click', () => {
      const r = this.host.collectors.deliverAll();
      if (r.unidades > 0) {
        Haptics.ui();
        Events.emit('ui:toast', {
          text: `${r.unidades} toupeira${r.unidades > 1 ? 's' : ''} subindo com ${r.itens} itens.`,
          tone: 'info',
        });
      }
      this.render();
    });

    const hire = this.bodyEl.querySelector('[data-hire]');
    hire?.addEventListener('click', () => {
      const p = this.host.spawnPoint();
      if (this.host.collectors.buy(p.x, p.y)) {
        Haptics.ui();
        this.render();
      }
    });
    for (const b of Array.from(this.bodyEl.querySelectorAll('[data-colup]'))) {
      b.addEventListener('click', () => {
        const id = (b as HTMLElement).dataset.colup!;
        if (this.host.collectors.buyUpgrade(id)) {
          Haptics.ui();
          this.render();
        }
      });
    }
  }

  /**
   * Melhorias das copias dentro do painel delas.
   *
   * Elas moravam na aba de pesquisa, a duas telas de distancia de quem estava
   * olhando as copias e querendo melhora-las. A pergunta "como deixo minhas
   * copias melhores?" tem que ser respondida onde as copias estao.
   */
  private cloneUpgrades(): string {
    const techs = techsOf('copias').filter((t) => t.id !== 'tech_cloner');
    if (techs.length === 0) return '';

    const cartoes = techs
      .map((t) => {
        const feita = this.host.tech.has(t.id);
        const check = this.host.tech.canResearch(t.id, this.host.deepest());
        const custo = Object.entries(t.cost)
          .map(([id, qty]) => {
            const rid = id as ResourceId;
            const have = this.host.stock.count(rid);
            return `<span class="${have >= qty ? 'ok' : 'miss'}">${RESOURCES[rid].name} ${have}/${qty}</span>`;
          })
          .join('');
        return `
          <div class="up-card ${feita ? 'done' : ''}">
            <div class="up-head"><span>${t.icon}</span><b>${t.name}</b></div>
            <p>${t.description}</p>
            ${feita ? '<div class="up-done">INSTALADO</div>' : `
              <div class="tech-cost">${custo}</div>
              <button class="btn" data-up="${t.id}" ${check.ok ? '' : 'disabled'}>
                ${check.ok ? 'INSTALAR' : (check.reason ?? 'Indisponivel')}
              </button>`}
          </div>`;
      })
      .join('');

    return `
      <details class="clone-upgrades" ${this.upgradesOpen ? 'open' : ''}>
        <summary>Melhorias das copias</summary>
        <div class="up-grid">${cartoes}</div>
      </details>`;
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
    for (const u of this.host.collectors.units) {
      const set = (attr: string, txt: string) => {
        const el = this.bodyEl.querySelector(`[data-live-c${attr}="${u.id}"]`);
        if (el && el.textContent !== txt) el.textContent = txt;
      };
      set('state', u.statusLabel());
      set('depth', `${Math.round(this.host.depthOf(u.y))} m`);
      set('load', `${u.carried}/${u.capacity}`);
      set('carry', u.summary());
      set('total', `${u.delivered} entregues`);
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

    const det = this.bodyEl.querySelector('.clone-upgrades') as HTMLDetailsElement | null;
    if (det) {
      det.addEventListener('toggle', () => {
        this.upgradesOpen = det.open;
      });
    }
    q('[data-up]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = (b as HTMLElement).dataset.up!;
        if (this.host.tech.research(id, this.host.deepest())) {
          Haptics.ui();
          this.render();
        }
      })
    );

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
