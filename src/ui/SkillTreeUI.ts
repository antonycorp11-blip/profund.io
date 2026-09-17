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

const CELL_X = 118;
const CELL_Y = 96;
const NODE = 60;

/**
 * O ninho inteiro numa pagina so.
 *
 * Antes cada categoria era uma ABA, e aba e o oposto de arvore: escondia as
 * outras ramificacoes justamente na hora em que o jogador precisa compara-las
 * para escolher um caminho. Agora todas as camaras estao no mesmo mapa, e a
 * escolha volta a ser dele — as abas do topo viraram atalhos que levam a vista
 * ate a camara, sem esconder nada.
 *
 * Cada categoria ocupa uma CAMARA em coordenadas de celula. Os valores sao
 * fixos e nao dependem de quais categorias estao visiveis: um ninho que muda
 * de planta conforme o jogador desbloqueia coisas nunca vira lugar na cabeca
 * de ninguem. As camaras se alternam esquerda/direita e descem, como galerias
 * saindo de um poco central.
 */
const CAMARA: Record<string, { x: number; y: number }> = {
  /*
   * Uma FAIXA larga e baixa, e nao uma coluna.
   *
   * As camaras estavam espalhadas por um mapa de 1160 x 1210 px, que nao cabe
   * em tela nenhuma — o jogador via quatro ilhas e tinha que arrastar para
   * achar as outras. Agora elas ficam lado a lado na ordem em que se abrem,
   * com a galeria entre uma e outra curta o bastante para se VER ligando.
   */
  mining: { x: 0, y: 0 },
  collect: { x: 4.6, y: 0.4 },
  movement: { x: 0.4, y: 4.4 },
  survival: { x: 4.6, y: 4.6 },
  engineering: { x: 8.4, y: 0.6 },
  legacy: { x: 8.4, y: 4.6 },
};

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
  const c = CAMARA[def.category] ?? { x: 0, y: 0 };
  return {
    x: (def.position.x + c.x) * CELL_X + jx,
    y: (def.position.y + c.y) * CELL_Y + jy,
  };
}

/**
 * Tudo que entra no ninho.
 *
 * As ativas tem tela propria e ficam de fora. Camara ainda nao revelada
 * tambem: uma pagina unica nao e desculpa para entregar de graca o que a
 * historia ainda nao contou — quando ela abre, ela aparece inteira no mapa.
 */
function nosDoNinho(visivel: (c: SkillCategory) => boolean): SkillDef[] {
  return SKILLS.filter((s) => s.category !== 'active' && visivel(s.category));
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
 * Tela da arvore de atributos.
 *
 * Mobile landscape: UM ninho so, arrastavel e com zoom, painel lateral com o
 * detalhe do no selecionado. Nao ha mais "categoria atual" — o que existe e
 * uma camara em foco, que so muda para onde a vista aponta.
 */
export class SkillTreeUI {
  private wrap: HTMLDivElement;
  private canvasEl: HTMLDivElement;
  private viewport: HTMLDivElement;
  private tabsEl: HTMLDivElement;
  private detailEl: HTMLDivElement;
  private pointsEl: HTMLElement;
  private svg: SVGSVGElement;

  /** Camara em foco: serve ao painel lateral e ao destaque da aba. */
  private category: SkillCategory = 'mining';
  private selected: string | null = null;
  private nodes = new Map<string, HTMLButtonElement>();
  private montado = false;

  private panX = 0;
  private panY = 0;
  private zoom = 0.72;
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
          <button class="btn ver-tudo" data-tudo>VER O NINHO</button>
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

    /*
     * O mapa inteiro continua a UM toque.
     *
     * A tela abre numa camara para o anel ser grande e o nome legivel, mas a
     * pergunta "que caminhos existem" precisa da vista de cima — e ela era a
     * unica leitura que a tela dava antes. Agora sao duas, e o jogador escolhe
     * qual quer.
     */
    (this.wrap.querySelector('[data-tudo]') as HTMLElement).addEventListener('click', () => {
      this.enquadrarTudo();
      Haptics.ui();
    });

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
    // Abre onde o jogador parou de olhar. Na primeira vez, na camara de
    // mineracao: e a unica que todo mundo tem no minuto zero.
    if (!this.montado) {
      this.montado = true;
    }
    // Abre na CAMARA EM FOCO, e nao no ninho inteiro. Ver tudo de uma vez
    // parecia a resposta certa — "que caminhos existem" — mas com trinta e
    // tres nos o zoom caia para 0,59 e cada anel virava uma moeda com o nome
    // ilegivel embaixo. O conceito mostra uma camara por vez, com o anel
    // grande e o nome legivel, e os tuneis saindo pelas bordas para dizer que
    // ha mais. A leitura do mapa inteiro continua a um gesto de distancia (a
    // pinca, a roda, e o botao de ver tudo).
    this.enquadrarCamara(this.category, false);
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

  /**
   * As abas viraram ATALHOS, nao filtros.
   *
   * Clicar leva a vista ate a camara daquela categoria; nada some da tela. A
   * marcada e so a camara que esta em foco agora.
   */
  private buildTabs(): void {
    this.tabsEl.innerHTML = '';
    for (const cat of Object.values(CATEGORIES)) {
      // Ativas tem tela propria.
      if (cat.id === 'active') continue;
      if (!this.host.tree.isCategoryVisible(cat.id)) continue;
      if (!nosDoNinho((c) => this.host.tree.isCategoryVisible(c)).some((sk) => sk.category === cat.id)) continue;
      const btn = document.createElement('button');
      btn.className = `skill-tab ${cat.id === this.category ? 'active' : ''}`;
      btn.style.setProperty('--cat', cat.color);
      btn.innerHTML = `<span class="tab-icon">${iconMarkup(CATEGORY_ART[cat.id], cat.icon)}</span><span>${cat.name}</span>`;
      btn.addEventListener('click', () => {
        this.irParaCamara(cat.id, true);
        Haptics.ui();
      });
      this.tabsEl.appendChild(btn);
    }
  }

  /**
   * Poe o ninho inteiro na tela.
   *
   * Calcula a caixa de todos os nos visiveis e escolhe o zoom que faz ela
   * caber, com uma folga para os nomes que ficam embaixo de cada camara. E o
   * que garante "todas as camaras conectadas e visiveis" mesmo depois de a
   * arvore crescer — nao depende de eu ter acertado as coordenadas a mao.
   */
  /**
   * Quanto a UI inteira ja esta encolhida (`--ui-zoom`).
   *
   * ISTO era o bug do enquadramento. `getBoundingClientRect()` devolve pixels
   * DE TELA, ja multiplicados pelo zoom da interface; as coordenadas dos nos
   * sao unidades do canvas, que ainda vao passar por esse mesmo zoom. Dividir
   * um pelo outro sem descontar a escala dava um numero 0,56 vezes menor do
   * que o certo — e era por isso que o ninho abria ocupando pouco mais da
   * metade da area, com o anel do tamanho de uma moeda, por mais que eu
   * mexesse nos limites.
   */
  private escalaDaUI(): number {
    const v = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom')
    );
    return Number.isFinite(v) && v > 0.05 ? v : 1;
  }

  private enquadrarTudo(): void {
    const lista = nosDoNinho((c) => this.host.tree.isCategoryVisible(c)).filter(
      (sk) => this.host.tree.visibility(sk.id) !== 'escondido'
    );
    if (lista.length === 0) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const def of lista) {
      const q = nodePos(def);
      minX = Math.min(minX, q.x);
      minY = Math.min(minY, q.y - 54); // placa da camara fica acima do no
      maxX = Math.max(maxX, q.x + NODE);
      maxY = Math.max(maxY, q.y + NODE + 26); // nome fica abaixo
    }
    const r = this.viewport.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    const margem = 28;
    const ui = this.escalaDaUI();
    const z = Math.min(
      (r.width - margem * 2) / Math.max(1, (maxX - minX) * ui),
      (r.height - margem * 2) / Math.max(1, (maxY - minY) * ui)
    );
    this.zoom = Math.max(0.3, Math.min(1.6, z));
    this.panX = r.width / (2 * ui) - ((minX + maxX) / 2) * this.zoom - 40;
    this.panY = r.height / (2 * ui) - ((minY + maxY) / 2) * this.zoom - 20;
    this.canvasEl.classList.remove('gliding');
    this.applyTransform();
  }

  /** Leva a vista ate uma camara, sem esconder o resto do ninho. */
  private irParaCamara(cat: SkillCategory, animar: boolean): void {
    this.enquadrarCamara(cat, animar);
    this.buildTabs();
    this.refresh();
  }

  /**
   * Enquadra UMA camara: zoom e posicao, nao so posicao.
   *
   * Antes isto so centralizava, e herdava o zoom minusculo com que a tela
   * tinha aberto — trocar de aba mudava o pedaco do mapa mas os aneis
   * continuavam do tamanho de moeda. O zoom e calculado pela caixa da camara e
   * tem PISO: nenhuma camara aparece menor do que da para ler, mesmo que para
   * isso ela passe um pouco das bordas.
   */
  private enquadrarCamara(cat: SkillCategory, animar: boolean): void {
    this.category = cat;
    const lista = nosDoNinho((c) => this.host.tree.isCategoryVisible(c)).filter(
      (sk) => sk.category === cat && this.host.tree.visibility(sk.id) !== 'escondido'
    );
    if (lista.length === 0) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const def of lista) {
      const q = nodePos(def);
      minX = Math.min(minX, q.x);
      minY = Math.min(minY, q.y - 54); // placa da camara fica acima do no
      maxX = Math.max(maxX, q.x + NODE);
      maxY = Math.max(maxY, q.y + NODE + 26); // nome fica abaixo
    }
    const r = this.viewport.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    const margem = 34;
    const ui = this.escalaDaUI();
    const z = Math.min(
      (r.width - margem * 2) / Math.max(1, (maxX - minX) * ui),
      (r.height - margem * 2) / Math.max(1, (maxY - minY) * ui)
    );
    // Piso de 0,9: abaixo disso o nome embaixo do anel para de ser legivel, e
    // um mapa que nao se le nao serve de mapa.
    this.zoom = Math.max(0.9, Math.min(1.9, z));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    // O canvas ja nasce deslocado pelo CSS (left/top); descontar isso e o que
    // faz a camara parar no meio da tela, e nao um pouco fora dela.
    this.panX = r.width / (2 * ui) - cx * this.zoom - 40;
    this.panY = r.height / (2 * ui) - cy * this.zoom - 20;
    this.canvasEl.classList.toggle('gliding', animar);
    this.applyTransform();
  }

  private buildNodes(): void {
    this.nodes.clear();
    for (const el of Array.from(this.canvasEl.querySelectorAll('.skill-node'))) el.remove();
    for (const el of Array.from(this.canvasEl.querySelectorAll('.skill-chamber'))) el.remove();

    const list = nosDoNinho((c) => this.host.tree.isCategoryVisible(c));

    // Placa de cada camara, para o ninho nao virar um monte de bolinha solta.
    for (const cat of Object.values(CATEGORIES)) {
      if (cat.id === 'active') continue;
      const daCamara = list.filter(
        (sk) => sk.category === cat.id && this.host.tree.visibility(sk.id) !== 'escondido'
      );
      if (daCamara.length === 0) continue;
      let minX = Infinity;
      let minY = Infinity;
      for (const def of daCamara) {
        const q = nodePos(def);
        minX = Math.min(minX, q.x);
        minY = Math.min(minY, q.y);
      }
      const placa = document.createElement('div');
      placa.className = 'skill-chamber';
      // A placa ficou maior com a arte: precisa subir mais e centralizar na
      // primeira camara, senao ela encosta no anel de cima.
      placa.style.left = `${minX - 44}px`;
      placa.style.top = `${minY - 66}px`;
      placa.style.setProperty('--cat', cat.color);
      placa.textContent = cat.name;
      this.canvasEl.appendChild(placa);
    }

    for (const def of list) {
      const visao = this.host.tree.visibility(def.id);
      if (visao === 'escondido') continue;
      const btn = document.createElement('button');
      btn.className = `skill-node${visao === 'vizinho' ? ' apagado' : ''}`;
      const p = nodePos(def);
      btn.style.left = `${p.x}px`;
      btn.style.top = `${p.y}px`;
      btn.style.setProperty('--cat', CATEGORIES[def.category].color);
      btn.innerHTML = `
        <span class="node-icon">${iconMarkup(def.art, def.icon)}</span>
        <span class="node-name">${def.name}</span>
        <span class="node-level"></span>`;
      btn.addEventListener('click', () => {
        // Camara ainda nao acesa nao abre ficha: o nome dela ja e o convite, e
        // ler o efeito inteiro de algo a tres passos de distancia devolveria a
        // planilha que a revelacao progressiva veio tirar.
        if (this.host.tree.visibility(def.id) === 'vizinho') {
          Events.emit('ui:toast', {
            text: `${def.name}: cave a galeria que chega ate aqui primeiro.`,
            tone: 'info',
          });
          return;
        }
        this.selected = def.id;
        this.category = def.category;
        this.buildTabs();
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
        // Ligacao entre camaras agora DESENHA. Antes era descartada porque as
        // duas pontas nunca estavam na mesma aba; num ninho so, ela e
        // justamente a informacao que faltava — e o tunel que mostra que um
        // caminho depende do outro.
        if (!req || req.category === 'active') continue;
        // Galeria para camara que ainda nao existe na tela nao se desenha:
        // seria um tunel saindo do nada para lugar nenhum.
        if (this.host.tree.visibility(def.id) === 'escondido') continue;
        if (this.host.tree.visibility(reqId) === 'escondido') continue;
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
    this.drawLinks(nosDoNinho((c) => this.host.tree.isCategoryVisible(c)));
    this.renderDetail();
  }

  private renderDetail(): void {
    if (!this.selected) {
      const cat = CATEGORIES[this.category];
      this.detailEl.innerHTML = `
        <div class="detail-empty">
          <div class="detail-fantasy" style="color:${cat.color}">O ninho</div>
          <p>Todas as camaras estao neste mesmo mapa. Arraste para andar por
             ele, junte os dedos para afastar, e escolha voce que caminho
             cavar.</p>
          <p class="hint">Em foco agora: <b style="color:${cat.color}">${cat.name}</b> — ${cat.fantasy}</p>
          <p class="hint">Toque em uma camara para ver o efeito.</p>
        </div>`;
      return;
    }

    const def = skillDef(this.selected)!;
    const level = this.host.tree.levelOf(def.id);
    const maxed = level >= def.maxLevel;
    const check = this.host.tree.canLearn(def.id, this.host.currentDepth());
    const cost = skillCost(def, Math.min(level, def.cost.length - 1));

    const effects = this.describeEffects(def, level);
    // A cor e o nome vem da camara DO NO, nao da que esta em foco: num ninho
    // unico o jogador seleciona atravessando camaras o tempo todo.
    const cat = CATEGORIES[def.category];

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
          this.zoom = Math.max(0.28, Math.min(1.6, this.zoom * (dist / this.pinchDist)));
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
        this.zoom = Math.max(0.28, Math.min(1.6, this.zoom - e.deltaY * 0.001));
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
