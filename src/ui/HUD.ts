import { Assets } from '../core/Assets';
import { Events } from '../core/events';
import { RESOURCES, RESOURCE_ORDER, type ResourceId } from '../data/resources';
import type { Inventory } from '../systems/Inventory';
import type { BaseStock } from '../systems/BaseStock';
import type { QuotaSystem } from '../systems/QuotaSystem';

/** HUD principal em DOM (fica fora do canvas: responsivo e facil de reestilizar). */
export class HUD {
  private root: HTMLDivElement;
  private chipEls = new Map<ResourceId, { el: HTMLElement; value: HTMLElement }>();
  private bagEl: HTMLDivElement;
  private bagFill: HTMLElement;
  private bagLabel: HTMLElement;
  private healthEl: HTMLDivElement;
  private healthFill: HTMLElement;
  private healthLabel: HTMLElement;
  private levelEl: HTMLDivElement;
  private levelNum: HTMLElement;
  private levelFill: HTMLElement;
  private lastLevel = -1;
  private lastLevelRatio = -1;
  private barsRow!: HTMLDivElement;
  private climbEl: HTMLDivElement;
  private climbFill: HTMLElement;
  private lastClimb = -1;
  private moneyEl: HTMLDivElement;
  private moneyValue: HTMLElement;
  private moneyFloat: HTMLElement;
  private mapSlotEl: HTMLDivElement;
  private quotaEl: HTMLDivElement;
  private quotaTotalFill!: HTMLElement;
  private quotaTotalLabel!: HTMLElement;
  private quotaRows = new Map<ResourceId, { fill: HTMLElement; label: HTMLElement }>();
  private promptEl: HTMLDivElement;
  private toastsEl: HTMLDivElement;
  private debugEl: HTMLDivElement;

  private lastValues = new Map<ResourceId, number>();
  private lastPrompt: string | null = null;
  private promptAction: (() => void) | null = null;
  private lastBag = -1;
  private lastHealth = -1;
  private lastPoints = -1;
  private skillBadge: HTMLElement | null = null;
  private clonerBtn!: HTMLButtonElement;
  private lastMoney: number | null = null;
  private shownMoney = 0;
  private moneyFrame = 0;
  private moneyPulseTimer = 0;
  private celebration: HTMLElement | null = null;
  private celebrationPriority = 0;
  private celebrationTimer = 0;

  constructor(
    parent: HTMLElement,
    private inventory: Inventory,
    private stock: BaseStock,
    private quota: QuotaSystem,
    private onMenu: () => void,
    private onWorkshop: () => void,
    private onSkills: () => void,
    private onBuild: () => void,
    private onCloner: () => void = () => {},
    private onActiveSkills: () => void = () => {}
  ) {
    this.root = document.createElement('div');
    this.root.style.position = 'absolute';
    this.root.style.inset = '0';
    this.root.style.pointerEvents = 'none';
    parent.appendChild(this.root);

    // --- topo esquerdo: saldo, recursos e mochila ---
    const left = document.createElement('div');
    left.className = 'hud-corner hud-top-left';
    this.moneyEl = document.createElement('div');
    this.moneyEl.className = 'money-card';
    this.moneyEl.innerHTML = `
      <span class="money-coin" aria-hidden="true">✦</span>
      <span class="money-copy"><small>SALDO DA BASE</small><strong data-money>0</strong></span>
      <span class="money-float" aria-hidden="true"></span>`;
    this.moneyValue = this.moneyEl.querySelector('[data-money]') as HTMLElement;
    this.moneyFloat = this.moneyEl.querySelector('.money-float') as HTMLElement;
    // Nivel entra DENTRO do card de saldo: o selo no canto e a barra fina na
    // base. Uma linha inteira so para isso empurrava todo o resto da coluna
    // para baixo sem precisar.
    this.levelEl = document.createElement('div');
    this.levelEl.className = 'level-inline';
    this.levelEl.innerHTML = `
      <span class="level-num">1</span>
      <span class="level-bar"><i></i></span>`;
    this.levelNum = this.levelEl.querySelector('.level-num') as HTMLElement;
    this.levelFill = this.levelEl.querySelector('.level-bar > i') as HTMLElement;
    this.moneyEl.appendChild(this.levelEl);

    left.appendChild(this.moneyEl);
    const chips = document.createElement('div');
    chips.className = 'chips';
    left.appendChild(chips);

    // Todos os recursos ganham chip; quem nao esta no bolso fica escondido.
    // Antes a lista era fixa em tres, entao pedra, ouro e cristal entravam na
    // mochila sem nenhum contador se mexer — parecia que nao eram coletados.
    for (const id of RESOURCE_ORDER) {
      const chip = document.createElement('div');
      chip.className = 'chip';
      // Icone real quando a arte existe; senao o losango colorido.
      const iconUrl = Assets.iconUrl(id);
      let dot: HTMLElement;
      if (iconUrl) {
        const img = document.createElement('img');
        img.className = 'chip-icon';
        img.src = iconUrl;
        img.alt = RESOURCES[id].name;
        dot = img;
      } else {
        dot = document.createElement('span');
        dot.className = 'dot';
        dot.style.background = RESOURCES[id].color;
        dot.style.boxShadow = `inset 0 0 0 1px ${RESOURCES[id].accent}`;
      }
      const value = document.createElement('span');
      value.textContent = '0';
      chip.appendChild(dot);
      chip.appendChild(value);
      chip.title = RESOURCES[id].name;
      chip.hidden = !RESOURCES[id].showInHud;
      chips.appendChild(chip);
      this.chipEls.set(id, { el: chip, value });
    }

    this.bagEl = document.createElement('div');
    this.bagEl.className = 'bag';
    this.bagEl.innerHTML = `
      <div class="bag-label"><span>Mochila</span><span data-bag-count>0/0</span></div>
      <div class="bar"><i></i></div>`;
    this.bagFill = this.bagEl.querySelector('.bar > i') as HTMLElement;
    this.bagLabel = this.bagEl.querySelector('[data-bag-count]') as HTMLElement;
    // Vida ao lado da mochila: as duas contam a mesma historia (quanto ainda da
    // para aguentar antes de voltar) e lado a lado custam metade da altura.
    this.healthEl = document.createElement('div');
    this.healthEl.className = 'bag vitals';
    this.healthEl.innerHTML = `
      <div class="bag-label"><span>Vida</span><span data-health-count>0/0</span></div>
      <div class="bar"><i></i></div>`;
    this.healthFill = this.healthEl.querySelector('.bar > i') as HTMLElement;
    this.healthLabel = this.healthEl.querySelector('[data-health-count]') as HTMLElement;

    // Vigor da escalada: fica junto das outras barras em vez de flutuar sobre a
    // cabeca do heroi, onde tapava o proprio personagem. So aparece escalando.
    this.climbEl = document.createElement('div');
    this.climbEl.className = 'bag climb-gauge';
    this.climbEl.hidden = true;
    this.climbEl.innerHTML = `
      <div class="bag-label"><span>Vigor</span><span data-climb-count></span></div>
      <div class="bar"><i></i></div>`;
    this.climbFill = this.climbEl.querySelector('.bar > i') as HTMLElement;

    const bars = document.createElement('div');
    bars.className = 'hud-bars';
    bars.appendChild(this.bagEl);
    bars.appendChild(this.healthEl);
    this.barsRow = bars;
    this.bagEl.hidden = true;
    this.healthEl.hidden = true;
    bars.hidden = true;
    left.appendChild(bars);
    left.appendChild(this.climbEl);

    // Minimapa fecha a coluna da esquerda. E o unico canto fora das duas zonas
    // de toque: o joystick fica no rodape esquerdo e os botoes no rodape
    // direito, entao aqui ele nunca disputa dedo com o controle.
    this.mapSlotEl = document.createElement('div');
    this.mapSlotEl.className = 'hud-map-slot';
    left.appendChild(this.mapSlotEl);

    this.root.appendChild(left);

    // --- topo direito: profundidade + cota + botoes ---
    const right = document.createElement('div');
    right.className = 'hud-corner hud-top-right';

    const buttons = document.createElement('div');
    buttons.className = 'hud-buttons';
    const btnWorkshop = this.buildIconButton('⚗', 'Tecnologia', () => this.onWorkshop());
    const btnMenu = this.buildIconButton('☰', 'Ajustes', () => this.onMenu());
    // Botao da copiadora: aparece assim que ela e pesquisada e vai direto para
    // o painel das copias.
    this.clonerBtn = this.buildIconButton('⧉', 'Cópias', () => this.onCloner());
    this.clonerBtn.hidden = true;
    buttons.appendChild(this.clonerBtn);

    buttons.appendChild(this.buildIconButton('⚡', 'Skills', () => this.onActiveSkills()));
    buttons.appendChild(this.buildSkillButton());
    buttons.appendChild(this.buildIconButton('⚒', 'Construir', () => this.onBuild()));
    buttons.appendChild(btnWorkshop);
    buttons.appendChild(btnMenu);
    right.appendChild(buttons);

    this.quotaEl = document.createElement('div');
    this.quotaEl.className = 'quota';
    this.buildQuota();
    right.appendChild(this.quotaEl);
    this.root.appendChild(right);

    // --- prompt de interacao ---
    this.promptEl = document.createElement('div');
    this.promptEl.className = 'prompt';
    this.promptEl.addEventListener('pointerdown', (e) => {
      if (!this.promptAction) return;
      e.preventDefault();
      this.promptAction();
    });
    this.root.appendChild(this.promptEl);

    // --- toasts ---
    this.toastsEl = document.createElement('div');
    this.toastsEl.className = 'toasts';
    this.root.appendChild(this.toastsEl);

    // --- debug ---
    this.debugEl = document.createElement('div');
    this.debugEl.className = 'debug';
    this.root.appendChild(this.debugEl);

    Events.on('ui:toast', (p) => this.toast(p.text, p.tone ?? 'info'));
    Events.on('inventory:full', () =>
      this.toast('Mochila cheia! Volte e entregue na base.', 'warn')
    );
    Events.on('clue:found', (p) => this.toast(p.logEntry, 'story'));
    Events.on('npc:rescued', (p) => this.toast(`${p.name} foi resgatado!`, 'good'));
    Events.on('quota:complete', (p) => {
      this.celebrate('COTA CUMPRIDA', `+${this.formatMoney(p.reward)} moedas`, `Semana ${this.quota.week} concluída`, 'quota', 3);
    });
    Events.on('delivery:done', (p) => {
      this.celebrate('ENTREGA CONCLUÍDA', `+${this.formatMoney(p.value)} moedas`, `${p.total} itens chegaram à base`, 'money', 1);
    });
    Events.on('tech:researched', (p) =>
      this.celebrate('PESQUISA CONCLUÍDA', p.name, 'Nova possibilidade desbloqueada', 'progress', 2)
    );
    Events.on('tool:upgraded', (p) =>
      this.celebrate('PICARETA MELHORADA', p.name, 'Você pode ir mais fundo', 'progress', 2)
    );
    Events.on('skill:learned', (p) =>
      this.celebrate('HABILIDADE EVOLUÍDA', p.name, `Nível ${p.level}`, 'progress', 2)
    );
    Events.on('skill:points', (p) => {
      if (p.gained > 0 && this.skillBadge) this.pulse(this.skillBadge.parentElement as HTMLElement, 'earned');
    });
    Events.on('layer:reached', (p) => this.announceLayer(p.name, p.tagline));
    Events.on('quota:new', (p) => {
      this.buildQuota();
      this.announceLayer(`Semana ${p.week}`, 'nova cota no quadro');
    });
    Events.on('map:discovered', (p) => this.toast(`Local marcado no mapa: ${p.label}`, 'info'));
    Events.on('level:up', (p) => {
      this.celebrate(
        `NÍVEL ${p.level}`,
        `+${p.points} ponto${p.points > 1 ? 's' : ''} de habilidade`,
        'Gaste na árvore quando quiser',
        'progress',
        2
      );
      this.moneyEl.classList.remove('level-up-flash');
      void this.moneyEl.offsetWidth;
      this.moneyEl.classList.add('level-up-flash');
    });
    Events.on('player:hurt', () => {
      this.healthEl.classList.remove('hurt');
      void this.healthEl.offsetWidth;
      this.healthEl.classList.add('hurt');
    });
    Events.on('player:died', (p) => {
      this.toast(
        p.lost > 0
          ? `Voce desmaiou. Perdeu ${p.lost} itens da mochila.`
          : 'Voce desmaiou e foi levado para a base.',
        'warn'
      );
    });
    Events.on('creature:killed', (p) => {
      if (p.guardian) {
        this.celebrate('GUARDIAO DERROTADO', p.name, 'O deposito atras dele e seu', 'progress', 3);
      }
    });
  }

  /** Monta as linhas da cota da semana atual. */
  private buildQuota(): void {
    this.quotaRows.clear();
    this.quotaEl.innerHTML = '';
    const h4 = document.createElement('h4');
    h4.innerHTML = `<span>${this.quota.title}</span><span data-quota-state></span>`;
    this.quotaEl.appendChild(h4);

    const total = document.createElement('div');
    total.className = 'quota-total';
    total.innerHTML = '<span>PROGRESSO</span><b data-quota-total>0%</b><div class="bar"><i></i></div>';
    this.quotaEl.appendChild(total);
    this.quotaTotalFill = total.querySelector('.bar > i') as HTMLElement;
    this.quotaTotalLabel = total.querySelector('[data-quota-total]') as HTMLElement;

    for (const entry of this.quota.entries) {
      const row = document.createElement('div');
      row.className = 'quota-row';
      row.innerHTML = `
        <span class="quota-resource">${RESOURCES[entry.resource].name}</span>
        <span class="bar"><i></i></span>
        <span data-q-label>0/${entry.amount}</span>`;
      this.quotaEl.appendChild(row);
      this.quotaRows.set(entry.resource, {
        fill: row.querySelector('.bar > i') as HTMLElement,
        label: row.querySelector('[data-q-label]') as HTMLElement,
      });
    }

    const days = document.createElement('div');
    days.className = 'quota-days';
    days.dataset.days = '1';
    this.quotaEl.appendChild(days);
  }

  /**
   * Botao da HUD com legenda.
   *
   * So o icone nao bastava: no celular ninguem adivinha que "✦" e a arvore de
   * habilidades nem que "⧉" e a copiadora — e as duas telas ficaram perdidas.
   */
  private buildIconButton(icon: string, label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'icon-btn labeled';
    btn.title = label;
    btn.innerHTML = `<span class="ib-icon">${icon}</span><span class="ib-label">${label}</span>`;
    btn.addEventListener('click', onClick);
    return btn;
  }

  /** Botao da arvore de habilidades, com selo de pontos disponiveis. */
  private buildSkillButton(): HTMLElement {
    const btn = this.buildIconButton('✦', 'Atributos', () => this.onSkills());
    btn.insertAdjacentHTML('beforeend', '<span class="badge" data-skill-badge hidden></span>');
    this.skillBadge = btn.querySelector('[data-skill-badge]') as HTMLElement;
    return btn;
  }

  /** Chamado todo frame; so escreve no DOM quando algo mudou. */
  update(prompt: string | null, interactKeyHint: string, skillPoints = 0): void {
    this.updateMoney();
    if (skillPoints !== this.lastPoints && this.skillBadge) {
      this.lastPoints = skillPoints;
      this.skillBadge.textContent = String(skillPoints);
      this.skillBadge.hidden = skillPoints <= 0;
    }

    for (const [id, refs] of this.chipEls) {
      const v = this.inventory.count(id);
      if (this.lastValues.get(id) === v) continue;
      const prev = this.lastValues.get(id) ?? 0;
      this.lastValues.set(id, v);
      refs.value.textContent = String(v);
      // Aparece no instante em que o primeiro pedaco entra na mochila.
      refs.el.hidden = v <= 0 && !RESOURCES[id].showInHud;
      if (v > prev) {
        refs.el.classList.remove('gain');
        void refs.el.offsetWidth;
        refs.el.classList.add('gain');
      }
    }

    const used = this.inventory.used;
    if (used !== this.lastBag) {
      this.lastBag = used;
      const cap = this.inventory.capacity;
      const ratio = cap > 0 ? used / cap : 0;
      this.bagFill.style.width = `${Math.min(100, ratio * 100)}%`;
      this.bagLabel.textContent = `${used}/${cap}`;
      this.bagEl.classList.toggle('full', used >= cap);
      // Some enquanto ha espaco de sobra: barra cheia o tempo todo vira ruido.
      // Aparece a 80% — antes disso nao ha decisao a tomar, depois disso ha.
      const showBag = ratio >= 0.8;
      if (this.bagEl.hidden !== !showBag) this.bagEl.hidden = !showBag;
      this.syncBarsRow();
    }


    for (const [res, refs] of this.quotaRows) {
      const have = this.quota.progress(res);
      const need = this.quota.required(res);
      const text = `${have}/${need}`;
      if (refs.label.textContent !== text) {
        const previous = Number(refs.label.textContent?.split('/')[0] ?? 0);
        refs.label.textContent = text;
        refs.fill.style.width = `${Math.min(100, (have / need) * 100)}%`;
        if (have > previous) this.pulse(refs.fill.closest('.quota-row') as HTMLElement, 'advanced');
      }
    }
    const percent = Math.round(this.quota.ratio * 100);
    const percentText = `${percent}%`;
    if (this.quotaTotalLabel.textContent !== percentText) {
      this.quotaTotalLabel.textContent = percentText;
      this.quotaTotalFill.style.width = percentText;
    }
    const daysEl = this.quotaEl.querySelector('.quota-days') as HTMLElement | null;
    if (daysEl) {
      // Mostrar o DIA, e nao so quantos faltam: "5 dias restantes" fica igual
      // por dez minutos de jogo e da a impressao de que o relogio travou.
      const d = this.quota.daysLeft();
      const txt = this.quota.completed
        ? `dia ${this.quota.dayOfWeek()}/7 · livre`
        : `dia ${this.quota.dayOfWeek()}/7 · faltam ${d}`;
      if (daysEl.textContent !== txt) daysEl.textContent = txt;
      daysEl.classList.toggle('free', this.quota.completed);
      // A fatia mostra o quanto do dia de hoje ja correu.
      daysEl.style.setProperty('--day', `${Math.round(this.quota.dayProgress() * 100)}%`);
    }
    this.quotaEl.classList.toggle('done', this.quota.isMet);
    const stateEl = this.quotaEl.querySelector('[data-quota-state]');
    if (stateEl) stateEl.textContent = this.quota.isMet ? 'OK' : '';

    if (prompt !== this.lastPrompt) {
      this.lastPrompt = prompt;
      if (prompt) {
        this.promptEl.innerHTML = interactKeyHint
          ? `<b>${interactKeyHint}</b> ${prompt}`
          : `${prompt}`;
        this.promptEl.classList.add('show');
      } else {
        this.promptEl.classList.remove('show');
        this.promptEl.textContent = '';
      }
    }
  }

  /**
   * Define se o aviso de interacao e clicavel e o que ele faz.
   *
   * Sem botao AGIR, o proprio aviso na tela vira o botao — e o unico jeito de
   * abrir a oficina no celular sem que passar perto dela abra sozinha.
   */
  setPromptTarget(action: (() => void) | null): void {
    this.promptAction = action;
    this.promptEl.classList.toggle('tappable', action !== null);
    this.promptEl.style.pointerEvents = action ? 'auto' : 'none';
  }

  /** Onde o minimapa deve se montar. */
  mapSlot(): HTMLElement {
    return this.mapSlotEl;
  }

  /** Mostra o botao da copiadora depois que ela e pesquisada. */
  setClonerAvailable(available: boolean): void {
    if (this.clonerBtn.hidden !== !available) this.clonerBtn.hidden = !available;
  }

  /** Nivel e barra de XP. */
  setLevel(level: number, ratio: number): void {
    if (level !== this.lastLevel) {
      this.lastLevel = level;
      this.levelNum.textContent = String(level);
    }
    const pct = Math.round(ratio * 100);
    if (pct !== this.lastLevelRatio) {
      this.lastLevelRatio = pct;
      this.levelFill.style.width = `${pct}%`;
    }
  }

  /** Vigor da escalada. Some quando o jogador nao esta agarrado. */
  setClimb(ratio: number, visible: boolean): void {
    const shouldHide = !visible;
    if (this.climbEl.hidden !== shouldHide) this.climbEl.hidden = shouldHide;
    if (!visible) return;
    const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
    if (pct === this.lastClimb) return;
    this.lastClimb = pct;
    this.climbFill.style.width = `${pct}%`;
    this.climbEl.classList.toggle('low', pct <= 25);
  }

  /** Barra de vida; escreve so quando muda. */
  setHealth(current: number, max: number): void {
    const cur = Math.max(0, Math.ceil(current));
    if (cur === this.lastHealth) return;
    this.lastHealth = cur;
    const ratio = max > 0 ? cur / max : 0;
    this.healthFill.style.width = `${Math.min(100, ratio * 100)}%`;
    this.healthLabel.textContent = `${cur}/${Math.round(max)}`;
    this.healthEl.classList.toggle('low', ratio <= 0.3);
    // So aparece depois de levar dano: com a vida cheia nao ha o que decidir.
    const showHealth = ratio < 1;
    if (this.healthEl.hidden !== !showHealth) this.healthEl.hidden = !showHealth;
    this.syncBarsRow();
  }

  /** A linha some junto quando as duas barras estao escondidas. */
  private syncBarsRow(): void {
    const empty = this.bagEl.hidden && this.healthEl.hidden;
    if (this.barsRow.hidden !== empty) this.barsRow.hidden = empty;
  }

  private formatMoney(value: number): string {
    return Math.round(value).toLocaleString('pt-BR');
  }

  private updateMoney(): void {
    const target = this.stock.money;
    if (this.lastMoney === target) return;
    if (this.lastMoney === null) {
      this.lastMoney = target;
      this.shownMoney = target;
      this.moneyValue.textContent = this.formatMoney(target);
      return;
    }
    const previous = this.lastMoney;
    const gained = target > previous;
    this.lastMoney = target;
    cancelAnimationFrame(this.moneyFrame);
    const from = this.shownMoney;
    const started = performance.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 0 : 600;
    const tick = (now: number): void => {
      const t = duration === 0 ? 1 : Math.min(1, (now - started) / duration);
      this.shownMoney = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      this.moneyValue.textContent = this.formatMoney(this.shownMoney);
      if (t < 1) this.moneyFrame = requestAnimationFrame(tick);
    };
    this.moneyFrame = requestAnimationFrame(tick);
    if (gained) {
      this.pulse(this.moneyEl, 'earned');
      this.floatMoney(target - previous);
    }
  }

  private pulse(el: HTMLElement, className: string): void {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    window.setTimeout(() => el.classList.remove(className), 750);
  }

  private floatMoney(amount: number): void {
    this.moneyFloat.textContent = `+${this.formatMoney(amount)}`;
    this.moneyFloat.classList.remove('show');
    void this.moneyFloat.offsetWidth;
    this.moneyFloat.classList.add('show');
    clearTimeout(this.moneyPulseTimer);
    this.moneyPulseTimer = window.setTimeout(() => this.moneyFloat.classList.remove('show'), 1400);
  }

  private celebrate(
    eyebrow: string,
    title: string,
    detail: string,
    tone: 'money' | 'quota' | 'progress',
    priority: number
  ): void {
    if (this.celebration && priority < this.celebrationPriority) return;
    clearTimeout(this.celebrationTimer);
    this.celebration?.remove();
    const card = document.createElement('div');
    card.className = `hud-celebration celebration-${tone}`;
    card.innerHTML = '<div class="celebration-sparks" aria-hidden="true"></div><small></small><strong></strong><span></span>';
    (card.querySelector('small') as HTMLElement).textContent = eyebrow;
    (card.querySelector('strong') as HTMLElement).textContent = title;
    (card.querySelector('span') as HTMLElement).textContent = detail;
    this.root.appendChild(card);
    this.celebration = card;
    this.celebrationPriority = priority;
    this.celebrationTimer = window.setTimeout(() => {
      card.classList.add('out');
      window.setTimeout(() => card.remove(), 350);
      if (this.celebration === card) {
        this.celebration = null;
        this.celebrationPriority = 0;
      }
    }, 2300);
  }

  /** Cartao de entrada numa camada nova — o momento tem que ser percebido. */
  private announceLayer(name: string, tagline: string): void {
    const el = document.createElement('div');
    el.className = 'layer-card';
    el.innerHTML = `<b>${name}</b><span>${tagline}</span>`;
    this.root.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 700);
    }, 2600);
  }

  setDebug(text: string): void {
    if (this.debugEl.textContent !== text) this.debugEl.textContent = text;
  }

  toast(text: string, tone: 'info' | 'good' | 'warn' | 'story' = 'info'): void {
    const el = document.createElement('div');
    el.className = `toast ${tone}`;
    el.textContent = text;
    this.toastsEl.appendChild(el);
    while (this.toastsEl.children.length > 4) {
      this.toastsEl.removeChild(this.toastsEl.children[0]);
    }
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 320);
    }, 2400);
  }

  resetCaches(): void {
    this.lastValues.clear();
    this.lastBag = -1;
    this.lastHealth = -1;
    this.lastPrompt = null;
    this.lastMoney = null;
  }
}
