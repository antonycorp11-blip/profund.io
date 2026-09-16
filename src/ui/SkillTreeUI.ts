import { ATTRIBUTES, type AttrId } from '../data/attributes';
import { Assets } from '../core/Assets';
import {
  CATEGORIES,
  CATEGORY_ART,
  SKILLS,
  skillCost,
  skillDef,
  type SkillCategory,
  type SkillDef,
} from '../data/skills';
import { Events } from '../core/events';
import { Haptics } from '../fx/Haptics';
import type { Attributes } from '../systems/Attributes';
import type { SkillTree } from '../systems/SkillTree';

const CELL_X = 132;
const CELL_Y = 108;
const NODE = 60;

/**
 * Deslocamento organico por no, em pixels.
 *
 * A grade perfeita e o que fazia a arvore parecer planilha. Um empurrao de ate
 * ~18 px em cada eixo, deterministico pelo id, e o suficiente para o olho
 * parar de ver as colunas — e pequeno demais para embaralhar a leitura de quem
 * ja decorou onde fica cada coisa.
 */
function hash01(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function nodePos(def: SkillDef): { x: number; y: number } {
  const jx = (hash01(def.id + 'x') - 0.5) * 36;
  const jy = (hash01(def.id + 'y') - 0.5) * 30;
  return {
    x: def.position.x * CELL_X + jx,
    y: def.position.y * CELL_Y + jy,
  };
}

export interface SkillTreeHost {
  tree: SkillTree;
  attrs: Attributes;
  currentDepth(): number;
  /** Ferramentas de desenvolvimento (spec, item 53). */
  dev: {
    addPoint(n: number): void;
    unlockAll(): void;
    resetSkills(): void;
    testProc(id: 'jackpot' | 'blockCritical' | 'fracture'): void;
    setDepth(meters: number): void;
  };
}

/**
 * Tela da arvore de habilidades.
 * Mobile landscape: uma categoria por vez, arrastavel e com zoom,
 * painel lateral com o detalhe do no selecionado.
 */
export class SkillTreeUI {
  private wrap: HTMLDivElement;
  private canvasEl: HTMLDivElement;
  private viewport: HTMLDivElement;
  private tabsEl: HTMLDivElement;
  private detailEl: HTMLDivElement;
  private pointsEl: HTMLElement;
  private svg: SVGSVGElement;

  private category: SkillCategory = 'mining';
  private selected: string | null = null;
  private nodes = new Map<string, HTMLButtonElement>();

  private panX = 0;
  private panY = 0;
  private zoom = 1;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;

  constructor(parent: HTMLElement, private host: SkillTreeHost) {
    this.wrap = document.createElement('div');
    this.wrap.className = 'panel-wrap skilltree';
    this.wrap.innerHTML = `
      <div class="skill-screen">
        <header class="skill-header">
          <div class="skill-tabs"></div>
          <div class="skill-points"><b data-points>0</b> pontos</div>
          <button class="icon-btn" data-close>✕</button>
        </header>
        <div class="skill-body">
          <div class="skill-viewport">
            <div class="skill-canvas">
              <svg class="skill-links"></svg>
            </div>
          </div>
          <aside class="skill-detail"></aside>
        </div>
      </div>`;
    parent.appendChild(this.wrap);

    this.tabsEl = this.wrap.querySelector('.skill-tabs') as HTMLDivElement;
    this.viewport = this.wrap.querySelector('.skill-viewport') as HTMLDivElement;
    this.canvasEl = this.wrap.querySelector('.skill-canvas') as HTMLDivElement;
    this.detailEl = this.wrap.querySelector('.skill-detail') as HTMLDivElement;
    this.pointsEl = this.wrap.querySelector('[data-points]') as HTMLElement;
    this.svg = this.wrap.querySelector('.skill-links') as unknown as SVGSVGElement;

    (this.wrap.querySelector('[data-close]') as HTMLElement).addEventListener('click', () =>
      this.close()
    );
    this.wrap.addEventListener('pointerdown', (e) => {
      if (e.target === this.wrap) this.close();
    });

    this.buildTabs();
    this.bindPan();

    Events.on('skill:points', () => this.refresh());
    Events.on('skill:learned', () => this.refresh());
  }

  get isOpen(): boolean {
    return this.wrap.classList.contains('open');
  }

  open(): void {
    this.wrap.classList.add('open');
    this.buildTabs();
    this.buildNodes();
    this.refresh();
  }

  close(): void {
    this.wrap.classList.remove('open');
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  // ------------------------------------------------------------- estrutura --

  private buildTabs(): void {
    this.tabsEl.innerHTML = '';
    for (const cat of Object.values(CATEGORIES)) {
      // Ativas tem tela propria.
      if (cat.id === 'active') continue;
      if (!this.host.tree.isCategoryVisible(cat.id)) continue;
      const btn = document.createElement('button');
      btn.className = `skill-tab ${cat.id === this.category ? 'active' : ''}`;
      btn.style.setProperty('--cat', cat.color);
      btn.innerHTML = `<span class="tab-icon">${iconMarkup(CATEGORY_ART[cat.id], cat.icon)}</span><span>${cat.name}</span>`;
      btn.addEventListener('click', () => {
        this.category = cat.id;
        this.selected = null;
        this.panX = 0;
        this.panY = 0;
        this.buildTabs();
        this.buildNodes();
        this.refresh();
      });
      this.tabsEl.appendChild(btn);
    }
  }

  private buildNodes(): void {
    this.nodes.clear();
    for (const el of Array.from(this.canvasEl.querySelectorAll('.skill-node'))) el.remove();

    const list = SKILLS.filter((s) => s.category === this.category);
    const color = CATEGORIES[this.category].color;

    for (const def of list) {
      const btn = document.createElement('button');
      btn.className = 'skill-node';
      const p = nodePos(def);
      btn.style.left = `${p.x}px`;
      btn.style.top = `${p.y}px`;
      btn.style.setProperty('--cat', color);
      btn.innerHTML = `
        <span class="node-icon">${iconMarkup(def.art, def.icon)}</span>
        <span class="node-name">${def.name}</span>
        <span class="node-level"></span>`;
      btn.addEventListener('click', () => {
        this.selected = def.id;
        this.refresh();
        Haptics.ui();
      });
      this.canvasEl.appendChild(btn);
      this.nodes.set(def.id, btn);
    }

    this.drawLinks(list);
    this.applyTransform();
  }

  /**
   * As ligacoes como GALERIAS, nao como linhas.
   *
   * A arvore era uma grade de bolinhas ligadas por tracos retos — parecia
   * organograma, que e a ultima coisa que este jogo devia parecer. Agora cada
   * ligacao e um tunel escavado: uma curva com desvio proprio, desenhada em
   * tres passadas (escavacao escura larga, parede, e o vao claro por dentro).
   *
   * O desvio sai de um hash dos dois ids, e nao de `Math.random`: a mesma
   * dupla curva sempre para o mesmo lado, em toda sessao. Um ninho que muda de
   * forma a cada abertura nao vira lugar na cabeca do jogador.
   */
  private drawLinks(list: SkillDef[]): void {
    const ns = 'http://www.w3.org/2000/svg';
    this.svg.innerHTML = '';
    let maxX = 0;
    let maxY = 0;

    const camadas: SVGPathElement[][] = [[], [], []];
    for (const def of list) {
      const a = nodePos(def);
      maxX = Math.max(maxX, a.x + NODE);
      maxY = Math.max(maxY, a.y + NODE);
      for (const reqId of def.requiredSkills) {
        const req = skillDef(reqId);
        if (!req || req.category !== def.category) continue;
        const b = nodePos(req);
        const aberto = this.host.tree.levelOf(reqId) > 0;

        const x1 = b.x + NODE / 2;
        const y1 = b.y + NODE / 2;
        const x2 = a.x + NODE / 2;
        const y2 = a.y + NODE / 2;
        // Controle perpendicular ao trecho: e o que curva o tunel.
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const comp = Math.hypot(dx, dy) || 1;
        const desvio = (hash01(reqId + def.id) - 0.5) * comp * 0.42;
        const cx = mx + (-dy / comp) * desvio;
        const cy = my + (dx / comp) * desvio;
        const d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

        // Tres passadas: terra escavada, parede e vao.
        const classes = ['tunel-terra', 'tunel-parede', aberto ? 'tunel-vao on' : 'tunel-vao'];
        classes.forEach((cls, i) => {
          const path = document.createElementNS(ns, 'path');
          path.setAttribute('d', d);
          path.setAttribute('class', cls);
          camadas[i].push(path);
        });
      }
    }
    // Todas as terras primeiro, depois todas as paredes, depois todos os vaos:
    // senao um tunel desenhado depois corta o de baixo ao meio.
    for (const camada of camadas) for (const el of camada) this.svg.appendChild(el);

    this.svg.setAttribute('width', String(maxX + 60));
    this.svg.setAttribute('height', String(maxY + 60));
  }

  // ---------------------------------------------------------------- estado --

  private refresh(): void {
    if (!this.isOpen) return;
    this.pointsEl.textContent = String(this.host.tree.points);

    const depth = this.host.currentDepth();
    for (const [id, btn] of this.nodes) {
      const def = skillDef(id)!;
      const level = this.host.tree.levelOf(id);
      const check = this.host.tree.canLearn(id, depth);
      btn.classList.toggle('owned', level > 0);
      btn.classList.toggle('maxed', level >= def.maxLevel);
      btn.classList.toggle('available', level < def.maxLevel && check.ok);
      btn.classList.toggle('locked', level === 0 && !check.ok);
      btn.classList.toggle('selected', this.selected === id);
      const lvl = btn.querySelector('.node-level') as HTMLElement;
      lvl.textContent = def.maxLevel > 1 ? `${level}/${def.maxLevel}` : level > 0 ? '✓' : '';
    }
    this.drawLinks(SKILLS.filter((s) => s.category === this.category));
    this.renderDetail();
  }

  private renderDetail(): void {
    const cat = CATEGORIES[this.category];
    if (!this.selected) {
      this.detailEl.innerHTML = `
        <div class="detail-empty">
          <div class="detail-fantasy" style="color:${cat.color}">${cat.name}</div>
          <p>${cat.fantasy}</p>
          <p class="hint">Toque em um no para ver o efeito.</p>
        </div>`;
      return;
    }

    const def = skillDef(this.selected)!;
    const level = this.host.tree.levelOf(def.id);
    const maxed = level >= def.maxLevel;
    const check = this.host.tree.canLearn(def.id, this.host.currentDepth());
    const cost = skillCost(def, Math.min(level, def.cost.length - 1));

    const effects = this.describeEffects(def, level);

    this.detailEl.innerHTML = `
      <div class="detail-head" style="--cat:${cat.color}">
        <span class="detail-icon">${iconMarkup(def.art, def.icon)}</span>
        <div>
          <div class="detail-name">${def.name}</div>
          <div class="detail-branch">${cat.name} · ${def.branch}</div>
        </div>
      </div>
      <p class="detail-desc">${def.description}</p>
      ${def.unlockEffect ? `<p class="detail-unlock">✦ ${def.unlockEffect}</p>` : ''}
      <div class="detail-level">${
        def.maxLevel > 1 ? `Nivel ${level} de ${def.maxLevel}` : level > 0 ? 'Aprendida' : 'Nao aprendida'
      }</div>
      <ul class="detail-effects">${effects}</ul>
      ${
        maxed
          ? '<div class="detail-status ok">No maximo</div>'
          : check.ok
            ? `<button class="btn primary" data-learn>APRENDER — ${cost} ponto${cost > 1 ? 's' : ''}</button>`
            : `<div class="detail-status">${check.reason ?? ''}</div>`
      }`;

    const learn = this.detailEl.querySelector('[data-learn]');
    learn?.addEventListener('click', () => {
      if (this.host.tree.learn(def.id, this.host.currentDepth())) {
        Haptics.ui();
        this.refresh();
      }
    });
  }

  /** Mostra efeito atual e proximo nivel, em vez de so o texto da skill. */
  private describeEffects(def: SkillDef, level: number): string {
    const next = def.modifiers[Math.min(level, def.modifiers.length - 1)] ?? [];
    const rows: string[] = [];
    for (const m of next) {
      const meta = (ATTRIBUTES as Record<string, { name: string; format: string; live: boolean }>)[
        m.target
      ];
      if (!meta) {
        rows.push(`<li><span>${m.target}</span><b class="up">novo efeito</b></li>`);
        continue;
      }
      const atual = this.host.attrs.get(m.target as AttrId);
      const delta = this.formatDelta(m.op, m.value, meta.format);
      const inert = meta.live ? '' : ' <em>(sistema ainda nao implementado)</em>';
      rows.push(
        `<li><span>${meta.name}${inert}</span><b class="up">${delta}</b>
         <small>agora: ${this.formatValue(atual, meta.format)}</small></li>`
      );
    }
    return rows.join('') || '<li><span>Efeito narrativo</span></li>';
  }

  private formatDelta(op: string, value: number, format: string): string {
    if (op === 'unlock') return 'desbloqueia';
    if (op === 'proc') return `+${(value * 100).toFixed(1)}% de chance`;
    if (op === 'percentAdd' || op === 'percentMultiply') {
      return `${value >= 0 ? '+' : ''}${Math.round(value * 100)}%`;
    }
    if (format === 'percent') return `${value >= 0 ? '+' : ''}${Math.round(value * 100)} pp`;
    return `${value >= 0 ? '+' : ''}${value}`;
  }

  private formatValue(v: number, format: string): string {
    switch (format) {
      case 'percent':
        return `${Math.round(v * 100)}%`;
      case 'multiplier':
        return `${v.toFixed(2)}x`;
      case 'seconds':
        return `${v.toFixed(2)}s`;
      default:
        return `${Math.round(v)}`;
    }
  }

  // ------------------------------------------------------------ pan e zoom --

  private bindPan(): void {
    const vp = this.viewport;
    vp.addEventListener('pointerdown', (e) => {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) {
        this.dragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    });
    vp.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.pointers.size >= 2) {
        const [a, b] = Array.from(this.pointers.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinchDist > 0) {
          this.zoom = Math.max(0.55, Math.min(1.6, this.zoom * (dist / this.pinchDist)));
          this.applyTransform();
        }
        this.pinchDist = dist;
        return;
      }
      if (!this.dragging) return;
      this.panX += e.clientX - this.lastX;
      this.panY += e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.applyTransform();
    });
    const end = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinchDist = 0;
      if (this.pointers.size === 0) this.dragging = false;
    };
    vp.addEventListener('pointerup', end);
    vp.addEventListener('pointercancel', end);
    vp.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoom = Math.max(0.55, Math.min(1.6, this.zoom - e.deltaY * 0.001));
        this.applyTransform();
      },
      { passive: false }
    );
  }

  private applyTransform(): void {
    this.canvasEl.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }
}


/** Arte quando existe; emoji enquanto nao existe. */
function iconMarkup(art: string | undefined, emoji: string): string {
  const url = art ? Assets.skillIcon(art) : null;
  return url ? `<img class="skill-art" src="${url}" alt="">` : emoji;
}
