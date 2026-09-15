import { BUILDABLE, STRUCTURES, type StructureType } from '../data/structures';
import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import { Haptics } from '../fx/Haptics';
import { RESOURCES, RESOURCE_ORDER, type ResourceId } from '../data/resources';
import type { Automation, Structure } from '../systems/Automation';
import type { BaseStock } from '../systems/BaseStock';
import type { Camera } from '../core/camera';
import type { TechTree } from '../systems/TechTree';

export interface BuildHost {
  automation: Automation;
  tech: TechTree;
  stock: BaseStock;
  camera: Camera;
  /** Canvas do jogo, para converter toque em tile. */
  canvas: HTMLCanvasElement;
}

type Tool = StructureType | 'remove' | 'rotate';

/**
 * Modo construir.
 * Barra inferior com as estruturas liberadas; toque no mundo posiciona.
 * Tocar numa estrutura existente abre a configuracao dela (filtro do armazem).
 */
export class BuildMode {
  private root: HTMLDivElement;
  private barEl: HTMLElement;
  private configEl: HTMLElement;
  private energyEl: HTMLElement;
  private active = false;
  private tool: Tool = 'conveyor';
  private dir: 1 | -1 = 1;
  private selected: Structure | null = null;
  /** Tile sob o cursor, para o fantasma de posicionamento. */
  hoverCol = -1;
  hoverRow = -1;

  constructor(parent: HTMLElement, private host: BuildHost) {
    this.root = document.createElement('div');
    this.root.className = 'build-layer';
    this.root.innerHTML = `
      <div class="build-energy"></div>
      <div class="build-bar"></div>
      <div class="build-config"></div>`;
    parent.appendChild(this.root);
    this.barEl = this.root.querySelector('.build-bar') as HTMLElement;
    this.energyEl = this.root.querySelector('.build-energy') as HTMLElement;
    this.configEl = this.root.querySelector('.build-config') as HTMLElement;

    this.bindWorldInput();
  }

  get isActive(): boolean {
    return this.active;
  }

  toggle(): void {
    this.active = !this.active;
    this.root.classList.toggle('open', this.active);
    this.selected = null;
    if (this.active) this.renderBar();
    else this.configEl.innerHTML = '';
    Events.emit('ui:toast', {
      text: this.active ? 'Modo construir ligado.' : 'Modo construir desligado.',
      tone: 'info',
    });
  }

  close(): void {
    if (!this.active) return;
    this.toggle();
  }

  private available(): StructureType[] {
    return BUILDABLE.filter((t) => this.host.tech.unlocked('build:' + t));
  }

  // ----------------------------------------------------------------- barra --

  private renderBar(): void {
    const list = this.available();
    if (list.length === 0) {
      this.barEl.innerHTML =
        '<div class="build-empty">Pesquise a Esteira na tela de Tecnologia para comecar a construir.</div>';
      return;
    }

    let html = '';
    for (const type of list) {
      const def = STRUCTURES[type];
      const afford = this.host.stock.canAfford(def.cost);
      const cost = Object.entries(def.cost)
        .map(([id, qty]) => {
          const rid = id as ResourceId;
          return `<span class="${this.host.stock.count(rid) >= (qty ?? 0) ? '' : 'miss'}">${
            RESOURCES[rid].name
          } ${qty}</span>`;
        })
        .join('');
      html += `
        <button class="build-item ${this.tool === type ? 'on' : ''} ${afford ? '' : 'poor'}"
                data-tool="${type}" style="--cat:${def.color}">
          <span class="build-icon">${def.icon}</span>
          <span class="build-name">${def.name}</span>
          <span class="build-cost">${cost}</span>
        </button>`;
    }
    html += `
      <button class="build-item ${this.tool === 'rotate' ? 'on' : ''}" data-tool="rotate">
        <span class="build-icon">⟳</span><span class="build-name">Girar</span>
      </button>
      <button class="build-item danger ${this.tool === 'remove' ? 'on' : ''}" data-tool="remove">
        <span class="build-icon">✕</span><span class="build-name">Remover</span>
      </button>`;

    this.barEl.innerHTML = html;
    for (const btn of Array.from(this.barEl.querySelectorAll('[data-tool]'))) {
      btn.addEventListener('click', () => {
        this.tool = (btn as HTMLElement).dataset.tool as Tool;
        this.selected = null;
        this.configEl.innerHTML = '';
        this.renderBar();
        Haptics.ui();
      });
    }
  }

  // ----------------------------------------------------------------- mundo --

  private bindWorldInput(): void {
    const canvas = this.host.canvas;

    canvas.addEventListener('pointermove', (e) => {
      if (!this.active) return;
      const t = this.tileAt(e.clientX, e.clientY);
      this.hoverCol = t.col;
      this.hoverRow = t.row;
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      e.preventDefault();
      e.stopPropagation();
      const t = this.tileAt(e.clientX, e.clientY);
      this.hoverCol = t.col;
      this.hoverRow = t.row;
      this.apply(t.col, t.row);
    });
  }

  private tileAt(clientX: number, clientY: number): { col: number; row: number } {
    const rect = this.host.canvas.getBoundingClientRect();
    const w = this.host.camera.screenToWorld(clientX - rect.left, clientY - rect.top);
    return {
      col: Math.floor(w.x / CONFIG.tileSize),
      row: Math.floor(w.y / CONFIG.tileSize),
    };
  }

  private apply(col: number, row: number): void {
    const existing = this.host.automation.at(col, row);

    if (this.tool === 'remove') {
      if (this.host.automation.remove(col, row)) {
        Haptics.ui();
        this.selected = null;
        this.configEl.innerHTML = '';
        this.renderBar();
      }
      return;
    }

    if (this.tool === 'rotate') {
      this.host.automation.rotate(col, row);
      Haptics.ui();
      return;
    }

    if (existing) {
      // Tocar numa estrutura ja construida abre a configuracao dela.
      this.selected = existing;
      this.renderConfig();
      return;
    }

    const placed = this.host.automation.place(this.tool as StructureType, col, row, this.dir);
    if (placed) {
      Haptics.ui();
      this.renderBar();
    }
  }

  /** Painel do armazem: filtro de recurso e envio automatico. */
  private renderConfig(): void {
    const s = this.selected;
    if (!s) {
      this.configEl.innerHTML = '';
      return;
    }
    const def = STRUCTURES[s.type];

    if (s.type !== 'storage') {
      this.configEl.innerHTML = `
        <div class="build-config-card">
          <b>${def.name}</b>
          <span>${def.description}</span>
          ${def.rotatable ? `<span class="dim">Direcao: ${s.dir === 1 ? 'direita' : 'esquerda'}</span>` : ''}
        </div>`;
      return;
    }

    const stored = Array.from(s.stored.entries())
      .filter(([, n]) => n > 0)
      .map(([id, n]) => `${RESOURCES[id].name} ${n}`)
      .join(' · ');

    this.configEl.innerHTML = `
      <div class="build-config-card">
        <b>Armazem</b>
        <span class="dim">${stored || 'vazio'} — ${this.host.automation.storedTotal(s)}/${
          def.capacity
        }</span>
        <div class="build-filter">
          <button class="${s.filter === null ? 'on' : ''}" data-filter="__all">Tudo</button>
          ${RESOURCE_ORDER.map(
            (r) =>
              `<button class="${s.filter === r ? 'on' : ''}" data-filter="${r}">
                 <i style="background:${RESOURCES[r].color}"></i>${RESOURCES[r].name}
               </button>`
          ).join('')}
        </div>
        <button class="switch ${s.autoSend ? 'on' : ''}" data-auto>
          ${s.autoSend ? 'ENVIANDO PARA A BASE' : 'SO GUARDAR'}
        </button>
      </div>`;

    for (const b of Array.from(this.configEl.querySelectorAll('[data-filter]'))) {
      b.addEventListener('click', () => {
        const v = (b as HTMLElement).dataset.filter!;
        s.filter = v === '__all' ? null : (v as ResourceId);
        this.renderConfig();
      });
    }
    this.configEl.querySelector('[data-auto]')?.addEventListener('click', () => {
      s.autoSend = !s.autoSend;
      this.renderConfig();
    });
  }

  /** Atualiza o medidor de energia (chamado pelo loop). */
  updateEnergy(): void {
    if (!this.active) return;
    const e = this.host.automation.energy;
    const pct = e.demand <= 0 ? 100 : Math.round(e.efficiency * 100);
    const falta = e.demand > e.produced;
    this.energyEl.innerHTML = `
      <div class="energy-card ${falta ? 'low' : ''}">
        <span class="energy-icon">⚡</span>
        <span><b>${Math.round(e.produced)}</b> gerados · <b>${Math.round(e.demand)}</b> usados</span>
        <span class="energy-pct">${pct}%</span>
        ${falta ? '<span class="energy-warn">construa um gerador</span>' : ''}
      </div>`;
  }

  /** Fantasma da peca e grade, desenhados no mundo. */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const ts = CONFIG.tileSize;

    if (this.hoverCol < 0) return;
    const x = this.hoverCol * ts;
    const y = this.hoverRow * ts;

    if (this.tool === 'remove' || this.tool === 'rotate') {
      ctx.strokeStyle = this.tool === 'remove' ? '#ff6b5a' : '#ffc453';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, ts - 2, ts - 2);
      return;
    }

    const def = STRUCTURES[this.tool as StructureType];
    const check = this.host.automation.canPlace(this.tool as StructureType, this.hoverCol, this.hoverRow);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = check.ok ? def.color : '#ff6b5a';
    ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = check.ok ? '#ffffff' : '#ff6b5a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1, y + 1, ts - 2, ts - 2);
  }
}
