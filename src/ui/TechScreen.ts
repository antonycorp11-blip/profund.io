import { Assets } from '../core/Assets';
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
import { melhorBotAte } from '../data/bots';
import { TECH_CATEGORIES, techsOf, type TechCategory, type TechDef } from '../data/tech';
import { Haptics } from '../fx/Haptics';
import type { Attributes } from '../systems/Attributes';
import type { Clone } from '../entities/Clone';
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
  /** Para o resumo de atributos do boneco. */
  attrs: Attributes;
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
  private mainEl!: HTMLElement;
  private asideEl!: HTMLElement;
  /** O que esta escolhido na lista agora: e isso que o painel lateral mostra. */
  private selecionado: string | null = null;
  /** Lembra a escolha por aba: trocar de aba e voltar nao pode perder o foco. */
  private ultimaEscolha = new Map<string, string>();
  private stockEl: HTMLElement;
  private tab: Tab = 'copias';
  /** True depois que o jogador escolheu uma aba a mao nesta sessao. */
  private tabChosen = false;
  /** Lembra se a gaveta de melhorias estava aberta. */

  constructor(parent: HTMLElement, private host: TechHost) {
    this.wrap = document.createElement('div');
    this.wrap.className = 'panel-wrap techscreen';
    /*
     * TRES ZONAS, e nao uma coluna que rola.
     *
     * A tela inteira era um `overflow-y: auto` com secoes empilhadas: o topo
     * com o titulo, a gaveta de melhorias fechada no meio e a lista embaixo.
     * Quem queria comparar duas pesquisas rolava para cima e para baixo, e o
     * detalhe de cada uma so existia dentro do proprio cartao — ou seja, nao
     * cabia, e por isso era curto.
     *
     * Agora: cabecalho fixo, LISTA de um lado e DETALHE do outro. O detalhe
     * fica parado enquanto a lista rola, que e a unica forma de escolher uma
     * coisa olhando para ela. Em tela estreita as duas viram uma coluna so.
     */
    this.wrap.innerHTML = `
      <div class="tech-screen">
        <header class="tech-header">
          <div class="tech-tabs"></div>
          <div class="tech-stock"></div>
          <button class="icon-btn" data-close>✕</button>
        </header>
        <div class="tech-body">
          <div class="tech-main"></div>
          <aside class="tech-aside"></aside>
        </div>
      </div>`;
    parent.appendChild(this.wrap);
    this.tabsEl = this.wrap.querySelector('.tech-tabs') as HTMLElement;
    this.bodyEl = this.wrap.querySelector('.tech-body') as HTMLElement;
    this.mainEl = this.wrap.querySelector('.tech-main') as HTMLElement;
    this.asideEl = this.wrap.querySelector('.tech-aside') as HTMLElement;
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
    this.bodyEl.classList.toggle('aside-esquerda', this.tab === 'equipamento');
    // A Automacao e a unica tela sem painel lateral; as outras dependem dele.
    this.asideEl.hidden = false;
    this.bodyEl.classList.toggle('sem-lateral', this.tab === 'copiadora' || this.tab === 'toupeiras');
    if (this.tab === 'copiadora' || this.tab === 'toupeiras') this.renderAutomacao();
    else if (this.tab === 'equipamento') this.renderEquipment();
    else this.renderTechs(this.tab);
  }

  private renderTabs(): void {
    const tabs: { id: Tab; name: string; icon: string; color: string }[] = Object.values(
      TECH_CATEGORIES
    ).map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }));
    /*
     * UMA aba para os ajudantes, nao duas.
     *
     * "Copiadora" e "Toupeiras" eram telas separadas que respondiam a MESMA
     * pergunta — "minha operacao esta rodando?" — e obrigavam a trocar de aba
     * para comparar as duas metades dela. Agora sao duas colunas da mesma
     * tela, com a faixa de estado em cima somando as duas.
     */
    tabs.unshift({ id: 'copiadora', name: 'Automacao', icon: '⚙', color: '#5ac7d0' });

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

  /**
   * PESQUISA: grade a esquerda, prancheta a direita.
   *
   * Cada cartao carregava descricao, custo e botao dentro de si — e por isso
   * nada cabia: a descricao virava uma linha, o custo uma fileira de numeros
   * sem contexto e o efeito nao aparecia em lugar nenhum. O cartao agora so
   * IDENTIFICA (icone, nome, estado); quem explica e o painel do lado, que tem
   * espaco para dizer o que a pesquisa faz, o que ela cobra e o que muda.
   */
  private renderTechs(cat: TechCategory): void {
    const meta = TECH_CATEGORIES[cat];
    const list = techsOf(cat);
    const lembrado = this.ultimaEscolha.get(cat);
    if (!list.some((t) => t.id === this.selecionado)) {
      this.selecionado = list.some((t) => t.id === lembrado) ? lembrado! : (list[0]?.id ?? null);
    }

    this.mainEl.innerHTML = `
      ${this.tituloDaTela(
        meta.icon,
        'Tecnologia',
        'Pesquise, melhore, cave mais fundo.',
        'Boas ferramentas fazem grandes descobertas!'
      )}
      <p class="tech-fantasy" style="color:${meta.color}">${meta.description}</p>
      <div class="tech-grid">
        ${list
          .map((def) => {
            const done = this.host.tech.has(def.id);
            const check = this.host.tech.canResearch(def.id, this.host.deepest());
            const cls = done ? 'done' : check.ok ? 'ready' : 'locked';
            const sel = def.id === this.selecionado ? ' sel' : '';
            return `
              <button class="tech-card ${cls}${sel}" style="--cat:${meta.color}" data-pick="${def.id}">
                <span class="tech-card-head">
                  <span class="tech-icon">${this.techArte(def)}</span>
                  <span class="tech-card-nome">
                    <b>${def.name}</b>
                    <small>${done ? 'PESQUISADA' : check.ok ? 'DISPONIVEL' : 'BLOQUEADA'}</small>
                  </span>
                </span>
                <span class="tech-card-desc">${def.description}</span>
                <span class="tech-cost">${this.costHtml(def)}</span>
                <span class="btn ${check.ok && !done ? 'primary' : ''} tech-card-acao"
                      ${done || !check.ok ? 'data-inerte' : ''}>
                  ${
                    done
                      ? '<img class="btn-icon" src="art/hud/confere.png" alt="">PESQUISADA'
                      : check.ok
                        ? '<img class="btn-icon" src="art/tech/frasco.png" alt="">PESQUISAR'
                        : (check.reason ?? 'BLOQUEADA')
                  }
                </span>
              </button>`;
          })
          .join('')}
      </div>`;

    /*
     * A aba COPIAS recebe as melhorias das TOUPEIRAS.
     *
     * Elas nao tinham casa: moravam numa secao da tela de Automacao, que e
     * onde o jogador vai para ver a equipe TRABALHANDO, nao para mexer nela.
     * Aqui embaixo das pesquisas, a aba passa a ser sobre a equipe inteira —
     * as copias por pesquisa, as toupeiras por moeda, e as duas no mesmo
     * lugar, que e onde alguem procuraria.
     */
    if (cat === 'copias') {
      this.mainEl.insertAdjacentHTML(
        'beforeend',
        `<section class="auto-melhorias">
           <header>
             <img src="art/auto/toupeira.png" alt="">
             <div>
               <h4>Melhorias das toupeiras</h4>
               <p>Valem para TODAS elas, as de agora e as que vierem depois.</p>
             </div>
           </header>
           <div class="up-grid">${this.moleUpgrades()}</div>
         </section>`
      );
    }

    this.renderTechDetalhe(cat);

    for (const btn of Array.from(this.mainEl.querySelectorAll('[data-pick]'))) {
      btn.addEventListener('click', (ev) => {
        const id = (btn as HTMLElement).dataset.pick!;
        // Tocar no BOTAO do cartao pesquisa na hora; tocar no resto escolhe e
        // manda o detalhe para o lado. Sem isso o cartao teria um botao que so
        // serve de enfeite, que e pior do que nao ter botao.
        const alvo = ev.target as HTMLElement;
        const acao = alvo.closest('.tech-card-acao');
        if (acao && !acao.hasAttribute('data-inerte')) {
          if (this.host.tech.research(id, this.host.deepest())) {
            Haptics.ui();
            this.host.onToolUnlocked(this.host.tech.maxToolIndex());
          }
        }
        this.selecionado = id;
        this.ultimaEscolha.set(cat, id);
        Haptics.ui();
        this.render();
      });
    }
  }

  /**
   * O bloco de titulo da tela.
   *
   * As cinco referencias abrem do mesmo jeito: icone grande, o NOME da tela em
   * caixa alta e uma linha de subtitulo embaixo. Sem ele o conteudo comecava
   * colado nas abas e nenhuma tela dizia onde o jogador estava — a unica pista
   * era qual aba estava acesa la em cima.
   */
  /**
   * A PLACA DE MADEIRA da Automacao, com o mineiro ao lado.
   *
   * Nao e o bloco de titulo comum das outras telas. No conceito esta tela abre
   * com uma tabua pregada na parede e o proprio Elias encostado nela, de
   * prancheta na mao — e isso muda o que a tela diz: nao e um relatorio, e o
   * quadro de aviso da equipe dele.
   *
   * O retrato e o primeiro quadro da folha que anda pela mina, o mesmo que a
   * tela de Equipamento ja usa: nao pede arte nova e garante que e a MESMA
   * pessoa.
   */
  private placaDaTela(): string {
    return `
      <header class="auto-placa">
        <img class="auto-placa-tabua" src="art/auto/placa.png" alt="">
        <img class="auto-placa-caixote" src="art/auto/caixote.png" alt="">
        <img class="auto-placa-heroi" src="${this.heroiUrl()}" alt="">
        <div class="auto-placa-txt">
          <b>Automação</b>
          <small>Seus ajudantes não param</small>
        </div>
        <span class="auto-placa-lema">Mais minério<br>menos esforço</span>
      </header>`;
  }

  private tituloDaTela(icone: string, nome: string, linha: string, lousa = ''): string {
    /*
     * O bloco de titulo ganhou os MOVEIS do conceito.
     *
     * O lampiao e a lousa nao sao enfeite gratuito: sao o que separa uma tela
     * de jogo de um painel de aplicativo. Eu tinha montado a estrutura certa e
     * parado ali, dizendo que "batia com a referencia" — batia de arranjo e
     * nao de acabamento, e a diferenca e o que da o cheiro de mina ao lugar.
     *
     * A arte ja existia e estava parada: `lampiao` e `cartao_missao` estavam
     * entre as vinte e uma pecas sem uso nenhum no projeto.
     */
    return `
      <header class="tela-cab">
        <img class="tela-lampiao" src="art/hud/lampiao.png" alt="">
        <span class="tela-cab-icone">${icone}</span>
        <span class="tela-cab-txt">
          <b>${nome}</b>
          <small>${linha}</small>
        </span>
        ${lousa ? `<span class="tela-lousa">${lousa}</span>` : ''}
      </header>`;
  }

  /** A prancheta: o que a pesquisa escolhida faz, cobra e muda. */
  private renderTechDetalhe(cat: TechCategory): void {
    const meta = TECH_CATEGORIES[cat];
    const def = techsOf(cat).find((t) => t.id === this.selecionado);
    if (!def) {
      this.asideEl.innerHTML = '<p class="dim">Escolha uma pesquisa ao lado.</p>';
      return;
    }
    const done = this.host.tech.has(def.id);
    const check = this.host.tech.canResearch(def.id, this.host.deepest());
    const efeitos = (def.modifiers ?? [])
      .map((m) => `<li>${describeMod(m)}</li>`)
      .join('');

    this.asideEl.innerHTML = `
      <div class="det-prancheta">
        <div class="det-head" style="--cat:${meta.color}">
          <span class="det-icone tech-icon">${this.techArte(def)}</span>
          <div class="det-nome">
            <b>${def.name}</b>
            <small>${meta.name}</small>
          </div>
          <span class="det-selo-cat" style="--cat:${meta.color}">${meta.icon} ${meta.name}</span>
        </div>
        <figure class="det-planta">
          <img src="art/tech/${done ? 'carimbo' : 'planta'}.png" alt="">
          <figcaption>${done ? 'Instalada na oficina' : 'Ideias viram progresso'}</figcaption>
        </figure>
        <p class="det-desc">${def.description}</p>
        ${
          efeitos
            ? `<div class="det-duplo">
                 <div class="det-caixa">
                   <h5 class="det-sub">Efeito atual</h5>
                   <span class="det-agora">${done ? 'instalada' : 'nao pesquisada'}</span>
                 </div>
                 <div class="det-caixa">
                   <h5 class="det-sub">Proximo nivel</h5>
                   <ul class="det-efeitos">${efeitos}</ul>
                 </div>
               </div>`
            : ''
        }
        <h5 class="det-sub">Custo da pesquisa</h5>
        <div class="tech-cost det-custo">${this.costHtml(def)}</div>
        ${
          def.requiredDepth > 0
            ? `<p class="det-prof">Precisa ter chegado a ${def.requiredDepth} m.</p>`
            : ''
        }
        ${
          done
            ? '<div class="tech-status ok">Pesquisada</div>'
            : check.ok
              ? `<button class="btn primary det-acao" data-research="${def.id}"><img class="btn-icon" src="art/tech/frasco.png" alt="">PESQUISAR</button>`
              : `<div class="tech-status">${check.reason ?? ''}</div>`
        }
      </div>`;

    const btn = this.asideEl.querySelector('[data-research]');
    btn?.addEventListener('click', () => {
      if (!this.host.tech.research(def.id, this.host.deepest())) return;
      Haptics.ui();
      this.host.onToolUnlocked(this.host.tech.maxToolIndex());
      this.render();
    });
  }

  /**
   * O custo em CHIPS, com a arte do minerio — nao em texto corrido.
   *
   * "Carvao 1672/30 Pedra 1567/20" e uma frase; o jogador quer bater o olho e
   * ver se da. Com o icone do proprio minerio ele reconhece o recurso antes de
   * ler a palavra, que e como a barra de recursos la em cima ja funciona.
   */
  private costHtml(def: TechDef, curto = false): string {
    return Object.entries(def.cost)
      .map(([id, qty]) => {
        const rid = id as ResourceId;
        const have = this.host.stock.count(rid);
        const falta = qty ?? 0;
        const ok = have >= falta;
        return `<span class="custo-chip ${ok ? 'ok' : 'miss'}" title="${RESOURCES[rid].name}">
          ${this.recursoArte(rid)}
          <b>${curto ? falta : `${have}/${falta}`}</b>
        </span>`;
      })
      .join('');
  }

  /** Arte do minerio quando existe; a bolinha da cor dele quando nao. */
  private recursoArte(rid: ResourceId): string {
    return `<img src="art/ore/${rid}.png" alt="" onerror="this.replaceWith(Object.assign(document.createElement('i'),{className:'custo-bola',style:'background:${RESOURCES[rid].color}'}))">`;
  }

  // ------------------------------------------------------------ copiadora --

  /**
   * AUTOMACAO: faixa de estado em cima, duas colunas embaixo.
   *
   * A pergunta que esta tela existe para responder e uma so — "isto aqui esta
   * rodando?" — e antes ela nao respondia: eram duas abas, cada uma com uma
   * lista longa, e o numero que importa (quantos trabalhando, quanto ja veio)
   * nao aparecia em lugar nenhum. A faixa de cima responde em cinco numeros,
   * e as colunas mostram quem esta fazendo o que.
   *
   * As melhorias sairam da gaveta fechada no meio da lista e foram para o
   * painel lateral: gaveta fechada e o mesmo que nao existir.
   */
  private renderAutomacao(): void {
    const clones = this.host.clones;
    const moles = this.host.collectors;
    const custoMole = moles.costFor();
    /*
     * O botao compra o MELHOR tipo que a profundidade ja liberou.
     *
     * Um menu de tipos aqui seria uma decisao sem informacao: o jogador nao
     * tem por que comprar um Bot Simples depois de alcancar o Reforcado. O
     * tipo escala com o quanto ele ja desceu, que e o proprio progresso.
     */
    const melhor = melhorBotAte(this.host.deepest());
    const carregando = moles.carriedTotal();
    const entregue = moles.units.reduce((n, u) => n + u.delivered, 0);

    /*
     * A FAIXA DE ESTADO: um painel so, com divisorias.
     *
     * Eram cinco caixas soltas com numeros do mesmo tamanho. No conceito e uma
     * regua unica, e o numero e GRANDE e colorido por tipo — porque a faixa
     * responde de relance "esta tudo rodando?", e para isso o olho precisa
     * pegar os numeros sem ler os rotulos.
     */
    /*
     * O numero em duas partes: o VALOR grande e o teto pequeno.
     *
     * "8/99" tudo do mesmo tamanho obriga a ler os dois para saber o que
     * importa, que e o 8. No conceito o teto e uma nota de rodape ao lado do
     * numero — ele diz "ainda cabe mais", nao "preste atencao em mim".
     */
    const celula = (v: string, teto: string, r: string, arte: string, cor: string, on = true) => `
      <div class="auto-stat ${on ? 'on' : ''}" style="--cor:${cor}">
        <img src="art/auto/${arte}.png" alt="">
        <div>
          <b>${v}${teto ? `<i>/${teto}</i>` : ''}</b>
          <span>${r}</span>
        </div>
      </div>`;

    // A ultima celula nao e numero: e o VEREDITO. No conceito ela e o botao
    // verde de ligado, e e o unico lugar da tela que diz se algo esta errado.
    const parados =
      clones.clones.filter((c: Clone) => c.state === 'parado').length +
      moles.units.filter((u) => u.state === 'procurando').length;
    const total = clones.clones.length + moles.units.length;
    const tudoOk = total > 0 && parados === 0;
    const veredito =
      total === 0
        ? { t: 'SEM EQUIPE', s: 'contrate alguem', c: 'off' }
        : tudoOk
          ? { t: 'TUDO OK', s: 'trabalhando normalmente', c: 'ok' }
          : { t: `${parados} PARADO${parados > 1 ? 'S' : ''}`, s: 'precisa de atencao', c: 'alerta' };

    const colunaCopias = `
      <section class="auto-col">
        <header class="auto-col-cab">
          <span class="auto-col-icone"><img src="art/auto/copia_aco.png" alt=""></span>
          <div class="auto-col-txt">
            <h4>Bots ativos <i>(${clones.clones.length}/${clones.slots})</i></h4>
            <p>Mineram, coletam e entregam automaticamente.</p>
          </div>
          <button class="btn primary" data-newclone ${
            clones.canAfford(melhor.id) ? '' : 'disabled'
          } title="${melhor.description}">
            + ${melhor.name.toUpperCase()} ✦${clones
              .costFor(melhor.id)
              .toLocaleString('pt-BR')}
          </button>
        </header>
        <div class="auto-list">
          ${
            clones.clones.length === 0
              ? '<p class="map-empty">Nenhum bot ainda.</p>'
              : clones.clones.map((c: Clone) => this.cloneCard(c)).join('')
          }
        </div>
      </section>`;

    const colunaMoles = `
      <section class="auto-col">
        <header class="auto-col-cab">
          <span class="auto-col-icone"><img src="art/auto/toupeira.png" alt=""></span>
          <div class="auto-col-txt">
            <h4>Toupeiras ativas <i>(${moles.units.length}/${moles.max})</i></h4>
            <p>Escavam tuneis e trazem recursos para a base.</p>
          </div>
          <button class="btn primary" data-hire ${
            moles.units.length < moles.max && moles.canAfford() ? '' : 'disabled'
          }>
            CONTRATAR ✦${custoMole.toLocaleString('pt-BR')}
          </button>
        </header>
        <div class="auto-list">
          ${
            moles.units.length === 0
              ? '<p class="map-empty">Nenhuma toupeira ainda.</p>'
              : moles.units.map((u) => this.moleCard(u)).join('')
          }
        </div>
      </section>`;

    this.mainEl.innerHTML = `
      <img class="auto-lampiao esq" src="art/hud/lampiao.png" alt="">
      <img class="auto-lampiao dir" src="art/hud/lampiao.png" alt="">
      <div class="auto-topo">
        ${this.placaDaTela()}
        <div class="auto-strip">
          ${celula(String(clones.clones.length), String(clones.slots), 'bots ativos', 'copia_aco', '#5ac7d0', clones.clones.length > 0)}
          ${celula(String(moles.units.length), String(moles.max), 'toupeiras ativas', 'toupeira', '#d8a35a', moles.units.length > 0)}
          ${celula(String(carregando), '', 'cargas em viagem', 'vagonete', '#e8dcc4', carregando > 0)}
          ${celula(String(entregue), '', 'entregas hoje', 'caixote', '#e8dcc4', entregue > 0)}
          <div class="auto-veredito ${veredito.c}">
            <span class="auto-luz"></span>
            <div><b>${veredito.t}</b><span>${veredito.s}</span></div>
          </div>
        </div>
      </div>
      <div class="auto-cols">${colunaCopias}${colunaMoles}</div>
      <footer class="auto-rodape">
        <span><img src="art/hud/nav_tecnologia.png" alt="">
          <b>A mineracao nunca para!</b> Seus ajudantes trabalham mesmo quando voce
          estiver explorando.</span>
        <button class="btn" data-dumpall ${carregando > 0 ? '' : 'disabled'}>
          MANDAR ENTREGAR (${carregando})
        </button>
      </footer>`;

    /*
     * Sem painel lateral aqui.
     *
     * No conceito as duas colunas ocupam a LARGURA TODA, e faz sentido: esta
     * tela nao tem um item selecionado para detalhar — ela tem duas equipes
     * trabalhando. O lateral roubava um terco da largura para mostrar as
     * melhorias, que sao uma decisao ocasional, e espremia as unidades, que
     * sao o assunto.
     */
    this.asideEl.innerHTML = '';
    this.asideEl.hidden = true;

    /*
     * AS MELHORIAS SAIRAM DAQUI.
     *
     * Elas dividiam a altura com as duas colunas e, em 393 px — a tela que o
     * jogo de fato roda —, isso cortava o cartao da copia pela metade. O
     * conceito nao tem esta secao aqui, e tem razao: melhorar a equipe e uma
     * decisao ocasional; as unidades trabalhando sao o assunto permanente.
     *
     * E metade delas era DUPLICATA: `cloneUpgrades('clone')` renderizava as
     * mesmas pesquisas que a aba Copias ja mostra. As das toupeiras, que nao
     * tinham outra casa, foram para la tambem — a aba e sobre a equipe, e
     * agora ela e sobre a equipe inteira.
     *
     * O que fica aqui e o que e OPERACAO e nao melhoria: mandar entregar.
     */
    this.bindCloner();
    this.bindCollectors();
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
    const slots = Object.values(EQUIP_SLOTS);
    const aberto = (this.ultimaEscolha.get('equip') ?? slots[0].id) as EquipSlot;

    /*
     * VITRINE de UM slot por vez, e nao os quatro empilhados.
     *
     * Antes a tela era uma pilha de quatro secoes com todas as pecas de todos
     * os encaixes: dezoito cartoes em coluna unica, e a peca que o jogador
     * esta usando ficava a tres rolagens de distancia da peca que ele esta
     * pensando em comprar. Comparar era impossivel, que e a unica coisa que se
     * faz numa loja de equipamento.
     */
    const itens = equipmentOfSlot(aberto)
      .map((def) => {
        const tem = eq.has(def.id);
        const vestido = eq.isEquipped(def.id);
        const longe = deepest < def.requiredDepth;
        const efeitos = def.modifiers
          .map((m) => `<li>${describeMod(m)}</li>`)
          .join('');

        let acao: string;
        if (vestido) acao = `<button class="btn" data-uneq="${aberto}">EQUIPADO</button>`;
        else if (tem) acao = `<button class="btn primary" data-eq="${def.id}">EQUIPAR</button>`;
        else if (longe) {
          acao = `<div class="tech-status"><img class="btn-icon" src="art/hud/cadeado.png" alt="">Chegue a ${def.requiredDepth} m</div>`;
        } else {
          acao = `<button class="btn ${money >= def.cost ? 'primary' : ''}" data-buyeq="${def.id}"
                    ${money >= def.cost ? '' : 'disabled'}>✦ ${def.cost.toLocaleString('pt-BR')}</button>`;
        }

        // Arte a ESQUERDA e o texto a direita, como no conceito. Com a arte em
        // cima o cartao virava uma coluna estreita onde o desenho da peca
        // ficava do tamanho de um icone de lista; deitado, a peca aparece e o
        // texto ganha a largura que ele precisa.
        const estado = vestido
          ? '<small class="eq-estado on">EQUIPADO</small>'
          : tem
            ? '<small class="eq-estado">NA MOCHILA</small>'
            : longe
              ? `<small class="eq-estado">A ${def.requiredDepth} M</small>`
              : '<small class="eq-estado">A VENDA</small>';

        return `
          <div class="eq-card ${vestido ? 'on' : ''} ${longe && !tem ? 'locked' : ''}">
            ${this.equipArte(def.id, def.icon)}
            <div class="eq-texto">
              <b>${def.name}</b>
              ${estado}
              <p>${def.description}</p>
              <ul class="eq-mods">${efeitos}</ul>
              <div class="eq-foot">${acao}</div>
            </div>
          </div>`;
      })
      .join('');

    this.mainEl.innerHTML = `
      ${this.tituloDaTela(
        '🛡',
        'Equipamento',
        'Prepare-se para cavar mais fundo.',
        'Equipamento certo, grandes descobertas.'
      )}
      <div class="eq-filtros">
        ${slots
          .map(
            (sl) => `
              <button class="seg-btn ${sl.id === aberto ? 'on' : ''}" data-slot="${sl.id}">
                ${sl.icon} ${sl.name}
              </button>`
          )
          .join('')}
      </div>
      <div class="eq-grid">${itens}</div>`;

    /*
     * O BONECO, como no conceito: o mineiro no meio e os encaixes em volta,
     * ligados a ele por cabos.
     *
     * Era uma lista de quatro linhas com o nome do item em letra pequena. O
     * conceito poe a pessoa no centro porque a pergunta da tela e "como EU
     * estou equipado" — e uma lista nao responde isso, um boneco responde.
     * Em 320 px de coluna nao cabe o palco inteiro do conceito, entao os
     * quatro encaixes ficam nos quatro cantos e o heroi no meio.
     */
    const encaixe = (sl: { id: EquipSlot; name: string; icon: string }, pos: string) => {
      const atual = eq.equippedIn(sl.id);
      const def = atual ? equipDef(atual) : null;
      // Rotulo do encaixe EM CIMA e a peca vestida na plaquinha embaixo, como
      // no conceito. O rotulo diz onde e o encaixe e nunca muda; a plaquinha
      // diz o que esta la e muda o tempo todo — em cima, o que se le primeiro
      // era justamente a palavra que nunca traz noticia.
      return `
        <button class="boneco-slot ${pos} ${def ? 'on' : ''} ${sl.id === aberto ? 'foco' : ''}"
                data-slot="${sl.id}" title="${sl.name}">
          <span class="boneco-rotulo"><i>${sl.name}</i></span>
          <span class="boneco-arte">${def ? this.equipArte(def.id, def.icon) : ''}</span>
          <span class="boneco-peca">${def ? def.name : 'vazio'}</span>
        </button>`;
    };
    const [c0, c1, c2, c3] = slots;

    this.asideEl.innerHTML = `
      <div class="boneco">
        ${encaixe(c0, 'ne')}
        <div class="boneco-palco">
          <img class="boneco-heroi" src="${this.heroiUrl()}" alt="">
        </div>
        ${encaixe(c1, 'nd')}
        ${encaixe(c2, 'se')}
        ${encaixe(c3, 'sd')}
      </div>
      <h5 class="det-sub">Seus atributos com equipamento</h5>
      <div class="boneco-stats">
        ${this.statLinha('vida', 'Vida', Math.round(this.host.attrs.get('maxHealth')))}
        ${this.statLinha('forca', 'Forca', Math.round(this.host.attrs.get('miningPower')))}
        ${this.statLinha('mobilidade', 'Mobilidade', Math.round(this.host.attrs.get('moveSpeed')))}
        ${this.statLinha('recarga', 'Defesa', `${Math.round(this.host.attrs.get('defense') * 100)}%`)}
      </div>`;

    for (const b of Array.from(this.wrap.querySelectorAll('[data-slot]'))) {
      b.addEventListener('click', () => {
        this.ultimaEscolha.set('equip', (b as HTMLElement).dataset.slot!);
        Haptics.ui();
        this.render();
      });
    }
    this.bindEquipment();
  }

  /**
   * O primeiro quadro da folha do heroi, recortado, para o boneco.
   *
   * A mesma arte que anda pela mina — nao pede desenho novo, e garante que o
   * bonequinho da tela de equipamento seja a MESMA pessoa que esta la embaixo.
   */
  private heroiCache: string | null = null;

  private heroiUrl(): string {
    if (this.heroiCache) return this.heroiCache;
    const tira = Assets.characterStrip('idle') ?? Assets.character();
    if (!tira || !tira.width) return '';
    const lado = tira.height;
    const c = document.createElement('canvas');
    c.width = lado;
    c.height = lado;
    const ctx = c.getContext('2d');
    if (!ctx) return '';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tira, 0, 0, lado, lado, 0, 0, lado, lado);
    this.heroiCache = c.toDataURL();
    return this.heroiCache;
  }

  /**
   * A arte da pesquisa.
   *
   * Nao existe um PNG por tecnologia — sao dez folhas de oficina. Cada
   * pesquisa recebe SEMPRE a mesma, escolhida pelo id: arte que muda de cara a
   * cada abertura nao parece o desenho daquela coisa. O emoji da ficha fica de
   * reserva enquanto a folha nao carrega.
   */
  private static readonly FOLHAS = [
    'bancada', 'engrenagens', 'lampada', 'compasso', 'planta',
    'prancheta', 'quadro', 'ampulheta', 'carimbo', 'frasco',
  ];

  private techArte(def: TechDef): string {
    let h = 0;
    for (let i = 0; i < def.id.length; i++) h = (h * 31 + def.id.charCodeAt(i)) >>> 0;
    const folha = TechScreen.FOLHAS[h % TechScreen.FOLHAS.length];
    return `<img src="art/tech/${folha}.png" alt=""
      onerror="this.replaceWith(document.createTextNode('${def.icon}'))">`;
  }

  /** Arte da peca quando existe; o emoji da ficha enquanto nao existe. */
  private equipArte(id: string, emoji: string): string {
    return `<span class="eq-icon"><img src="art/equip/${id}.png" alt=""
      onerror="this.replaceWith(document.createTextNode('${emoji}'))"></span>`;
  }

  private statLinha(arte: string, nome: string, valor: number | string): string {
    return `
      <div class="stat-linha">
        <img src="art/hud/encaixe/${arte}.png" alt="">
        <b>${valor}</b><span>${nome}</span>
      </div>`;
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
  /**
   * Os cartoes de melhoria, em coluna e SEM gaveta.
   *
   * Eles viviam dentro de um `<details>` no meio da lista. Gaveta fechada e o
   * mesmo que nao existir: o jogador chegava a dezesseis toupeiras sem nunca
   * ter comprado Patas Rapidas, que custa 120 e vale para todas elas.
   */
  private moleUpgrades(): string {
    const mgr = this.host.collectors;
    const money = Math.floor(this.host.stock.money);
    return COLLECTOR_UPGRADES.map((u) => {
      const nivel = mgr.levelOf(u.id);
      const cheio = nivel >= u.maxLevel;
      const preco = mgr.upgradeCost(u.id);
      return `
        <div class="up-card ${cheio ? 'done' : ''}">
          <div class="up-head">
            <span>${u.icon}</span><b>${u.name}</b>
            <span class="up-level">${nivel}/${u.maxLevel}</span>
          </div>
          <p>${u.description}</p>
          ${
            cheio
              ? '<div class="up-done">NO MAXIMO</div>'
              : `<button class="btn" data-colup="${u.id}" ${money >= preco ? '' : 'disabled'}>
                   ✦ ${preco.toLocaleString('pt-BR')}
                 </button>`
          }
        </div>`;
    }).join('');
  }

  /** Cartao de uma toupeira na coluna da direita. */
  /**
   * Os numeros que mudam sozinhos, sem repintar o cartao.
   *
   * Repintar apagaria o foco de quem esta com o dedo no interruptor e faria a
   * grade inteira piscar quatro vezes por segundo. So os campos marcados sao
   * tocados, e so quando o valor muda de verdade.
   */
  private refreshCloneLive(): void {
    const texto = (sel: string, v: string) => {
      const el = this.bodyEl.querySelector(sel);
      if (el && el.textContent !== v) el.textContent = v;
    };

    for (const c of this.host.clones.clones) {
      texto(`[data-live-state="${c.id}"]`, c.statusLabel());
      texto(`[data-live-load="${c.id}"]`, `${c.carried}/${c.capacity}`);
      texto(`[data-live-depth="${c.id}"]`, `${Math.round(this.host.depthOf(c.y))} m`);
      const barra = this.bodyEl.querySelector(`[data-live-bar="${c.id}"]`) as HTMLElement | null;
      if (barra) {
        const pct = `${Math.round((c.carried / Math.max(1, c.capacity)) * 100)}%`;
        if (barra.style.width !== pct) barra.style.width = pct;
      }
    }

    for (const u of this.host.collectors.units) {
      texto(`[data-live-cstate="${u.id}"]`, u.statusLabel());
      texto(`[data-live-cload="${u.id}"]`, `${u.carried}/${u.capacity}`);
      texto(`[data-live-ctotal="${u.id}"]`, String(u.delivered));
    }
  }

  /** O cartao da toupeira, no mesmo formato compacto do bot. */
  private moleCard(u: {
    id: string;
    index: number;
    x: number;
    y: number;
    carried: number;
    capacity: number;
    delivered: number;
    statusLabel(): string;
    entries(): [ResourceId, number][];
  }): string {
    const carga = Math.round((u.carried / Math.max(1, u.capacity)) * 100);
    const [rec] = u.entries();
    return `
      <div class="bot-card toupeira" style="--tint:#d8a35a">
        <img class="bot-face" src="art/auto/toupeira.png" alt="">
        <b class="bot-nome">Toupeira ${u.index + 1}</b>
        <small class="bot-tipo">Catadora</small>
        <span class="estado-pilula" data-live-cstate="${u.id}">${u.statusLabel()}</span>
        <span class="bot-coleta">
          ${
            rec
              ? `<img src="art/ore/${rec[0]}.png" alt="" title="${RESOURCES[rec[0]].name}">`
              : '<i class="vazia"></i>'
          }
        </span>
        <span class="bot-barra"><i style="width:${carga}%"></i></span>
        <span class="bot-pe">
          <b data-live-cload="${u.id}">${u.carried}/${u.capacity}</b>
          <i data-live-ctotal="${u.id}">${u.delivered}</i>
        </span>
      </div>`;
  }

  private cloneCard(c: Clone): string {
    const d = c.def;
    return `
      <div class="bot-card" style="--tint:${d.tint}" data-bot="${c.id}">
        <button class="liga ${c.config.autoDeliver ? 'on' : ''}" data-deliver="${c.id}"
                title="Entregar sozinho"><i></i></button>
        <img class="bot-face" src="art/auto/${d.arte}.png" alt="">
        <b class="bot-nome">Bot ${c.index + 1}</b>
        <small class="bot-tipo">${d.name}</small>
        <span class="estado-pilula" data-live-state="${c.id}">${c.statusLabel()}</span>
        <span class="bot-coleta">
          ${d.coleta
            .map(
              (r) =>
                `<img src="art/ore/${r}.png" alt="" title="${RESOURCES[r].name}"
                   onerror="this.replaceWith(Object.assign(document.createElement('i'),{style:'background:${RESOURCES[r].color}'}))">`
            )
            .join('')}
        </span>
        <span class="bot-barra"><i data-live-bar="${c.id}" style="width:0%"></i></span>
        <span class="bot-pe">
          <b data-live-load="${c.id}">${c.carried}/${c.capacity}</b>
          <i data-live-depth="${c.id}"></i>
        </span>
      </div>`;
  }

  private bindCloner(): void {
    const q = (sel: string) => Array.from(this.bodyEl.querySelectorAll(sel));

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
        // O tipo e o melhor que a profundidade ja liberou — o mesmo que o
        // botao anuncia.
        if (this.host.clones.create(p.x, p.y, melhorBotAte(this.host.deepest()).id)) {
          Haptics.ui();
          this.render();
        }
      })
    );
    /*
     * Sumiram os ligadores de FOCO, FILTRO e RAIO.
     *
     * Eles configuravam o que agora vem do TIPO do bot. Manter os tres seria
     * dar ao jogador controles que brigam com a ficha da maquina — e a ficha
     * ganharia, porque e dela que o comportamento sai.
     */
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
