import { ART } from '../data/art';
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
  private jetEl: HTMLDivElement;
  private jetFill: HTMLElement;
  private lastJet = -1;
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
  private journalBtn!: HTMLButtonElement;
  private mapFold!: HTMLButtonElement;
  private journalBadge!: HTMLElement;
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
    private onJournal: () => void,
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

    // Retrato do heroi: o card do topo-esquerdo deixa de ser "saldo" e passa a
    // ser "voce". Vida, vigor e EXP moram dentro dele — sao os tres numeros que
    // falam do personagem, e estavam espalhados por tres caixas diferentes.
    const face = document.createElement('div');
    face.className = 'hero-face';
    const faceUrl = Assets.heroPortraitUrl?.();
    if (faceUrl) {
      const img = document.createElement('img');
      img.src = faceUrl;
      img.alt = 'Elias';
      face.appendChild(img);
    } else {
      face.textContent = '⛏';
    }
    this.moneyEl.insertBefore(face, this.moneyEl.firstChild);

    left.appendChild(this.moneyEl);
    // Recursos saem da coluna da esquerda e viram uma fileira no topo-centro:
    // e a unica zona larga da tela que nao disputa espaco com nada.
    const center = document.createElement('div');
    center.className = 'hud-top-center';
    const chips = document.createElement('div');
    chips.className = 'chips';
    center.appendChild(chips);
    this.root.appendChild(center);

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

    // Barras finas com icone, sem caixa nem rotulo: elas so precisam dizer
    // "quanto falta", e faziam isso ocupando um terco da coluna.
    this.bagEl = document.createElement('div');
    this.bagEl.className = 'slim bag';
    this.bagEl.innerHTML = `
      <span class="slim-icon">🎒</span>
      <span class="slim-bar"><i></i></span>
      <span class="slim-num" data-bag-count>0</span>`;
    this.bagFill = this.bagEl.querySelector('.slim-bar > i') as HTMLElement;
    this.bagLabel = this.bagEl.querySelector('[data-bag-count]') as HTMLElement;
    // Vida ao lado da mochila: as duas contam a mesma historia (quanto ainda da
    // para aguentar antes de voltar) e lado a lado custam metade da altura.
    this.healthEl = document.createElement('div');
    this.healthEl.className = 'slim vitals';
    this.healthEl.innerHTML = `
      <span class="slim-icon">❤</span>
      <span class="slim-bar"><i></i></span>
      <span class="slim-num" data-health-count>0</span>`;
    this.healthFill = this.healthEl.querySelector('.slim-bar > i') as HTMLElement;
    this.healthLabel = this.healthEl.querySelector('[data-health-count]') as HTMLElement;

    // Vigor da escalada: fica junto das outras barras em vez de flutuar sobre a
    // cabeca do heroi, onde tapava o proprio personagem. So aparece escalando.
    this.climbEl = document.createElement('div');
    this.climbEl.className = 'slim climb-gauge';
    this.climbEl.hidden = true;
    this.climbEl.innerHTML = `
      <span class="slim-icon">🧗</span>
      <span class="slim-bar"><i></i></span>`;
    this.climbFill = this.climbEl.querySelector('.slim-bar > i') as HTMLElement;

    // Tanque do jato. Mesma barra fina, mesmo canto: quem esta no ar com o
    // dedo no PULAR precisa ver quanto falta para o motor morrer, e precisa
    // ver isso SEM tirar o olho do buraco para onde esta subindo.
    this.jetEl = document.createElement('div');
    this.jetEl.className = 'slim jet-gauge';
    this.jetEl.hidden = true;
    this.jetEl.innerHTML = `
      <span class="slim-icon">🚀</span>
      <span class="slim-bar"><i></i></span>`;
    this.jetFill = this.jetEl.querySelector('.slim-bar > i') as HTMLElement;

    const bars = document.createElement('div');
    bars.className = 'hud-bars';
    bars.appendChild(this.bagEl);
    bars.appendChild(this.healthEl);
    this.barsRow = bars;
    this.bagEl.hidden = true;
    this.healthEl.hidden = true;
    bars.hidden = true;
    this.moneyEl.appendChild(bars);
    this.moneyEl.appendChild(this.climbEl);
    this.moneyEl.appendChild(this.jetEl);

    // Minimapa fecha a coluna da esquerda. E o unico canto fora das duas zonas
    // de toque: o joystick fica no rodape esquerdo e os botoes no rodape
    // direito, entao aqui ele nunca disputa dedo com o controle.
    this.mapSlotEl = document.createElement('div');
    this.mapSlotEl.className = 'hud-map-slot';
    // Recolher o minimapa. Numa tela de celular em landscape ele come o canto
    // inteiro, e ha momentos (luta, escalada longa) em que o jogador quer ver
    // o mundo e nao o mapa.
    const dobrar = document.createElement('button');
    dobrar.className = 'hud-fold';
    dobrar.title = 'Recolher o mapa';
    dobrar.textContent = '▾';
    dobrar.addEventListener('click', () => {
      const oculto = this.mapSlotEl.classList.toggle('folded');
      dobrar.textContent = oculto ? '▸' : '▾';
      try {
        localStorage.setItem('hud.map.folded', oculto ? '1' : '0');
      } catch {
        // Modo privado: a preferencia some, o jogo nao.
      }
    });
    try {
      if (localStorage.getItem('hud.map.folded') === '1') {
        this.mapSlotEl.classList.add('folded');
        dobrar.textContent = '▸';
      }
    } catch {
      // idem
    }
    this.mapFold = dobrar;

    // A cota vira "Objetivo Atual" e fecha a coluna da esquerda, logo abaixo do
    // retrato: e onde o olho ja esta quando o jogador pergunta "e agora?".
    this.quotaEl = document.createElement('div');
    this.quotaEl.className = 'quota objective';
    this.buildQuota();
    left.appendChild(this.quotaEl);

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
    // CÓPIAS saiu: abria a MESMA tela que TECNOLOGIA. Dois botoes para o mesmo
    // lugar so gastam largura de HUD, que no celular e o recurso mais escasso.
    buttons.appendChild(this.buildIconButton('⚡', 'Skills', () => this.onActiveSkills()));
    buttons.appendChild(this.buildSkillButton());
    // O Guia de Campo toma o lugar de CONSTRUIR. Construir era um modo que o
    // jogador quase nunca abria; o caderno e o que ele vai querer reler.
    this.journalBtn = this.buildIconButton('📕', 'Guia', () => this.onJournal());
    const capa = `${ART.basePath}journal/capa.png`;
    const icone = this.journalBtn.querySelector('.ib-icon') as HTMLElement;
    icone.innerHTML = `<img class="ib-img" src="${capa}" alt="">`;
    this.journalBadge = document.createElement('span');
    this.journalBadge.className = 'ib-badge';
    this.journalBadge.hidden = true;
    this.journalBtn.appendChild(this.journalBadge);
    buttons.appendChild(this.journalBtn);
    buttons.appendChild(btnWorkshop);
    buttons.appendChild(btnMenu);
    right.appendChild(buttons);
    right.appendChild(this.mapFold);
    right.appendChild(this.mapSlotEl);
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
    // Sem aviso de mochila cheia: a barra ja fica vermelha e o aviso aparecia
    // de novo a cada tentativa de coletar — virava um piscar constante.
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

  /**
   * Objetivo narrativo: assume o card quando a cota da semana ja esta cumprida.
   *
   * O pedido do dono: "objetivo atual seria a cota e depois de cumprir a cota
   * volta a ser as missoes". Sao o mesmo card — o jogador nunca fica sem uma
   * frase dizendo o que fazer agora.
   */
  setMissionObjective(text: string | null): void {
    const line = this.quotaEl.querySelector('.quota-mission') as HTMLElement | null;
    const quotaBody = this.quotaEl.querySelectorAll('.quota-line, .quota-detail, .quota-days');
    if (!text) {
      line?.remove();
      this.quotaEl.classList.remove('mission');
      for (const el of quotaBody) (el as HTMLElement).hidden = false;
      return;
    }
    // A cota nao some mais: ela vira a linha fina embaixo da missao. Sao duas
    // pressoes diferentes (a historia e o prazo) e o jogador precisa das duas.
    this.quotaEl.classList.add('mission');
    for (const el of quotaBody) (el as HTMLElement).hidden = el.classList.contains('quota-detail');
    if (line) {
      line.textContent = text;
      return;
    }
    const el = document.createElement('div');
    el.className = 'quota-mission';
    el.textContent = text;
    // Tocar abre o texto inteiro. A faixa mostra tres linhas para nao invadir
    // a tela, e isso cortava o objetivo no meio — o jogador via "trilho
    // remendado algo assim" e nao sabia o que fazer.
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.quotaEl.classList.toggle('aberto');
    });
    this.quotaEl.style.pointerEvents = 'auto';
    this.quotaEl.appendChild(el);
  }

  /** Monta as linhas da cota da semana atual. */
  /**
   * A cota como UMA barra.
   *
   * Era um card com uma linha por recurso; ocupava o canto inteiro para dizer
   * algo que cabe numa faixa: quanto falta e quantos dias restam. O detalhe por
   * recurso continua ali, em texto pequeno, sob a barra.
   */
  private buildQuota(): void {
    this.quotaRows.clear();
    this.quotaEl.innerHTML = `
      <div class="quota-line">
        <span class="quota-week">S${this.quota.week}</span>
        <span class="quota-bar"><i></i></span>
        <b data-quota-total>0%</b>
      </div>
      <div class="quota-detail"></div>
      <div class="quota-days"></div>`;

    this.quotaTotalFill = this.quotaEl.querySelector('.quota-bar > i') as HTMLElement;
    this.quotaTotalLabel = this.quotaEl.querySelector('[data-quota-total]') as HTMLElement;

    const detail = this.quotaEl.querySelector('.quota-detail') as HTMLElement;
    for (const entry of this.quota.entries) {
      const item = document.createElement('span');
      item.className = 'quota-item';
      item.innerHTML =
        `<em>${RESOURCES[entry.resource].name}</em> <span data-q-label>0/${entry.amount}</span>`;
      detail.appendChild(item);
      this.quotaRows.set(entry.resource, {
        fill: item,
        label: item.querySelector('[data-q-label]') as HTMLElement,
      });
    }
  }

  /** Quantas anotacoes novas esperam no guia. 0 esconde o selo. */
  setJournalUnread(n: number): void {
    this.journalBadge.hidden = n <= 0;
    this.journalBadge.textContent = n > 9 ? '9+' : String(n);
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
        refs.fill.classList.toggle('ok', have >= need);
        if (have > previous) this.pulse(refs.fill, 'advanced');
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

  /**
   * Tanque do jato.
   *
   * Some quando esta cheio E o jogador esta no chao: barra que nunca muda vira
   * decoracao, e o HUD deste jogo ja e apertado. Ela aparece no instante em que
   * o tanque comeca a importar.
   */
  setJet(ratio: number, unlocked: boolean, emUso: boolean): void {
    const mostrar = unlocked && (emUso || ratio < 0.999);
    if (this.jetEl.hidden === mostrar) this.jetEl.hidden = !mostrar;
    if (!mostrar) return;
    const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
    if (pct === this.lastJet) return;
    this.lastJet = pct;
    this.jetFill.style.width = `${pct}%`;
    this.jetEl.classList.toggle('low', pct <= 25);
  }

  /** Barra de vida; escreve so quando muda. */
  setHealth(current: number, max: number): void {
    const cur = Math.max(0, Math.ceil(current));
    if (cur === this.lastHealth) return;
    this.lastHealth = cur;
    const ratio = max > 0 ? cur / max : 0;
    this.healthFill.style.width = `${Math.min(100, ratio * 100)}%`;
    this.healthLabel.textContent = String(cur);
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

  celebrate(
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
