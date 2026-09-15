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
  private lastBag = -1;
  private lastHealth = -1;
  private lastPoints = -1;
  private skillBadge: HTMLElement | null = null;
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
    private onBuild: () => void
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
    left.appendChild(this.moneyEl);
    const chips = document.createElement('div');
    chips.className = 'chips';
    left.appendChild(chips);

    for (const id of RESOURCE_ORDER) {
      if (!RESOURCES[id].showInHud) continue;
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

    const bars = document.createElement('div');
    bars.className = 'hud-bars';
    bars.appendChild(this.bagEl);
    bars.appendChild(this.healthEl);
    left.appendChild(bars);

    this.root.appendChild(left);

    // --- topo direito: profundidade + cota + botoes ---
    const right = document.createElement('div');
    right.className = 'hud-corner hud-top-right';

    const buttons = document.createElement('div');
    buttons.className = 'hud-buttons';
    const btnWorkshop = document.createElement('button');
    btnWorkshop.className = 'icon-btn';
    btnWorkshop.textContent = '⚗';
    btnWorkshop.title = 'Tecnologia';
    btnWorkshop.addEventListener('click', () => this.onWorkshop());
    const btnMenu = document.createElement('button');
    btnMenu.className = 'icon-btn';
    btnMenu.textContent = '☰';
    btnMenu.title = 'Ajustes';
    btnMenu.addEventListener('click', () => this.onMenu());
    buttons.appendChild(this.buildSkillButton());
    const btnBuild = document.createElement('button');
    btnBuild.className = 'icon-btn';
    btnBuild.textContent = '⚒';
    btnBuild.title = 'Construir';
    btnBuild.addEventListener('click', () => this.onBuild());
    buttons.appendChild(btnBuild);
    buttons.appendChild(btnWorkshop);
    buttons.appendChild(btnMenu);
    right.appendChild(buttons);

    // Vaga do minimapa: ele entra aqui, na coluna da direita, em vez de ficar
    // solto no meio do topo tapando justamente o que esta a frente do jogador.
    this.mapSlotEl = document.createElement('div');
    this.mapSlotEl.className = 'hud-map-slot';
    right.appendChild(this.mapSlotEl);

    this.quotaEl = document.createElement('div');
    this.quotaEl.className = 'quota';
    this.buildQuota();
    right.appendChild(this.quotaEl);
    this.root.appendChild(right);

    // --- prompt de interacao ---
    this.promptEl = document.createElement('div');
    this.promptEl.className = 'prompt';
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

  /** Botao da arvore de habilidades, com selo de pontos disponiveis. */
  private buildSkillButton(): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'icon-btn';
    btn.title = 'Habilidades';
    btn.innerHTML = '✦<span class="badge" data-skill-badge hidden></span>';
    btn.addEventListener('click', () => this.onSkills());
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
      this.bagFill.style.width = `${Math.min(100, (used / cap) * 100)}%`;
      this.bagLabel.textContent = `${used}/${cap}`;
      this.bagEl.classList.toggle('full', used >= cap);
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
      const d = this.quota.daysLeft();
      const txt = this.quota.completed
        ? `livre por mais ${d} dia${d === 1 ? '' : 's'}`
        : `${d} dia${d === 1 ? '' : 's'} restante${d === 1 ? '' : 's'}`;
      if (daysEl.textContent !== txt) daysEl.textContent = txt;
      daysEl.classList.toggle('free', this.quota.completed);
    }
    this.quotaEl.classList.toggle('done', this.quota.isMet);
    const stateEl = this.quotaEl.querySelector('[data-quota-state]');
    if (stateEl) stateEl.textContent = this.quota.isMet ? 'OK' : '';

    if (prompt !== this.lastPrompt) {
      this.lastPrompt = prompt;
      if (prompt) {
        this.promptEl.innerHTML = `<b>${interactKeyHint}</b> ${prompt}`;
        this.promptEl.classList.add('show');
      } else {
        this.promptEl.classList.remove('show');
        this.promptEl.textContent = '';
      }
    }
  }

  /** Onde o minimapa deve se montar (coluna da direita, sob os botoes). */
  mapSlot(): HTMLElement {
    return this.mapSlotEl;
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
