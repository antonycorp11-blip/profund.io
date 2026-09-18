import { Assets } from '../core/Assets';
import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import { ACTIVE_SKILLS, type ActiveSkillMeta } from '../data/activeSkills';
import { ATTRIBUTES, type AttrId } from '../data/attributes';
import { skillDef, type SkillDef } from '../data/skills';
import { ActiveSkills } from '../systems/ActiveSkills';
import type { Attributes } from '../systems/Attributes';
import type { BaseStock } from '../systems/BaseStock';
import type { SkillTree } from '../systems/SkillTree';

export interface ActiveSkillsHost {
  tree: SkillTree;
  attrs: Attributes;
  active: ActiveSkills;
  stock: BaseStock;
  currentDepth(): number;
}

/**
 * Tela das habilidades ATIVAS.
 *
 * Separada da arvore de atributos de proposito: la a pergunta e "quanto isso
 * melhora meu numero" e a resposta cabe num no de arvore. Aqui a pergunta e "o
 * que acontece quando eu aperto o botao", e a resposta precisa de espaco —
 * cargas, recarga, alcance e o que cada nivel acrescenta.
 */
export class ActiveSkillsUI {
  private wrap: HTMLDivElement;
  private cintoEl!: HTMLElement;
  private gradeEl!: HTMLElement;
  private detalheEl!: HTMLElement;
  private pointsEl: HTMLElement;
  private liveTimer = 0;
  /** Qual habilidade o painel da direita esta explicando. */
  private selecionada: string | null = null;

  constructor(parent: HTMLElement, private host: ActiveSkillsHost) {
    this.wrap = document.createElement('div');
    this.wrap.className = 'panel-wrap skillscreen';
    this.wrap.dataset.fundo = 'cristal';
    this.wrap.innerHTML = `
      <div class="tech-screen skl-tela">
        <div class="tech-body skl-tres">
          <aside class="skl-cinto"></aside>
          <div class="tech-main skl-grade">
            <header class="skl-cab">
              <img class="skl-cab-icone" src="art/hud/nav_skills.png" alt="">
              <span class="skl-cab-txt">
                <b>Todas as skills</b>
                <small>Desbloqueie, melhore e personalize seu estilo</small>
              </span>
              <span class="skl-pontos">
                <img src="art/hud/moeda.png" alt="">
                <b data-points>0</b><small>em caixa</small>
              </span>
              <button class="icon-btn" data-close>✕</button>
            </header>
            <div class="skl-cards" data-cards></div>
          </div>
          <aside class="tech-aside skl-detalhe"></aside>
        </div>
      </div>`;
    parent.appendChild(this.wrap);
    this.cintoEl = this.wrap.querySelector('.skl-cinto') as HTMLElement;
    this.gradeEl = this.wrap.querySelector('[data-cards]') as HTMLElement;
    this.detalheEl = this.wrap.querySelector('.skl-detalhe') as HTMLElement;
    this.pointsEl = this.wrap.querySelector('[data-points]') as HTMLElement;

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

  open(): void {
    this.wrap.classList.add('open');
    this.render();
    this.liveTimer = window.setInterval(() => {
      if (this.isOpen) this.refreshLive();
    }, 300);
  }

  close(): void {
    this.wrap.classList.remove('open');
    if (this.liveTimer) window.clearInterval(this.liveTimer);
    this.liveTimer = 0;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  /**
   * TRES ZONAS: o cinto, a vitrine e a ficha.
   *
   * Era uma lista de cartoes gordos, um embaixo do outro, cada um carregando
   * tudo: icone, descricao, numeros ao vivo, proximo nivel e dois botoes. Duas
   * coisas quebravam nisso. O CINTO — que e a decisao central da tela, quais
   * tres voce leva — nao existia em lugar nenhum: era uma etiqueta "NO CINTO"
   * espalhada por cartoes distantes, e para saber o que estava equipado o
   * jogador rolava a lista inteira. E comparar duas habilidades era impossivel,
   * porque nunca cabiam as duas na tela.
   *
   * Agora o cinto e um objeto, na esquerda, com os tres lugares sempre a
   * vista; a vitrine no meio so identifica; e a ficha da direita fica parada
   * enquanto a vitrine rola.
   */
  private render(): void {
    this.pointsEl.textContent = Math.floor(this.host.stock.money).toLocaleString('pt-BR');
    const metas = ACTIVE_SKILLS.filter((m) => skillDef(m.skill));
    if (!metas.some((m) => m.id === this.selecionada)) {
      // Abre na primeira que esta no cinto; sem cinto, na primeira aprendida.
      const noCinto = metas.find((m) => this.host.active.isEquipped(m.id));
      const aprendida = metas.find((m) => this.host.tree.levelOf(m.skill) > 0);
      this.selecionada = (noCinto ?? aprendida ?? metas[0])?.id ?? null;
    }
    this.renderCinto(metas);
    this.renderGrade(metas);
    this.renderDetalhe(metas);
    this.refreshLive();
  }

  /**
   * O CINTO, como no conceito: quatro lugares em dois por dois.
   *
   * Cada lugar e um anel aceso com a placa do nome embaixo — a mesma leitura
   * dos botoes do pad, para o jogador reconhecer no jogo o que montou aqui. A
   * placa de madeira no pe da coluna e o lembrete do conceito, e nao mais uma
   * linha cinza de texto de ajuda.
   */
  private renderCinto(metas: ActiveSkillMeta[]): void {
    const cinto = this.host.active.equipped;
    const lugares = Array.from({ length: ActiveSkills.SLOTS }, (_, i) => {
      const id = cinto[i];
      const meta = id ? metas.find((m) => m.id === id) : null;
      const def = meta ? skillDef(meta.skill) : null;
      const nivel = def ? this.host.tree.levelOf(def.id) : 0;
      return `
        <button class="cinto-lugar ${meta ? 'on' : ''}" data-cinto="${meta?.id ?? ''}">
          <span class="cinto-anel">${meta ? this.arte(def!, meta) : '<i>+</i>'}</span>
          <span class="cinto-placa">
            <b>${meta ? meta.name : 'vazio'}</b>
            <small>${meta ? `NV ${nivel}` : 'escolha ao lado'}</small>
          </span>
        </button>`;
    }).join('');

    this.cintoEl.innerHTML = `
      <h4 class="cinto-titulo">Skills ativas</h4>
      <p class="cinto-sub">Equipe ${ActiveSkills.SLOTS} habilidades</p>
      <div class="cinto-lugares">${lugares}</div>
      <p class="cinto-lema">Cave<br>Explore<br>Evolua<br>Vá mais fundo!</p>`;

    for (const b of Array.from(this.cintoEl.querySelectorAll('[data-cinto]'))) {
      const id = (b as HTMLElement).dataset.cinto;
      if (!id) continue;
      b.addEventListener('click', () => {
        this.selecionada = id;
        this.render();
      });
    }
  }

  /**
   * A VITRINE, como no conceito.
   *
   * O cartao e uma ficha de pe: anel redondo em cima a esquerda, o selo de
   * estado em cima a direita, nome grande, nivel, o que ela faz, os numeros e
   * — so quando ha o que fazer — o botao. O botao sumir quando nao ha acao e
   * de proposito: "FALTAM ✦21.201" ocupando o mesmo peso visual de um botao
   * de comprar era a tela inteira gritando coisas que nao dao para clicar.
   */
  private renderGrade(metas: ActiveSkillMeta[]): void {
    if (metas.length === 0) {
      this.gradeEl.innerHTML = '<p class="map-empty">Nenhuma habilidade ativa ainda.</p>';
      return;
    }
    const tree = this.host.tree;
    const money = Math.floor(this.host.stock.money);
    const prof = this.host.currentDepth();

    this.gradeEl.innerHTML = metas
      .map((meta) => {
        const def = skillDef(meta.skill)!;
        const nivel = tree.levelOf(def.id);
        const maxed = nivel >= def.maxLevel;
        const check = tree.canLearn(def.id, prof);
        const preco = meta.prices[Math.min(nivel, meta.prices.length - 1)] ?? 0;
        const pode = !maxed && check.ok && money >= preco;
        const sel = meta.id === this.selecionada ? ' sel' : '';
        const cls = nivel === 0 ? (check.ok ? 'pronta' : 'locked') : 'owned';

        const selo = maxed
          ? '<span class="skl-selo max">COMPLETA</span>'
          : nivel === 0
            ? check.ok
              ? '<span class="skl-selo">DISPONIVEL</span>'
              : '<img class="skl-cadeado" src="art/hud/cadeado.png" alt="bloqueada">'
            : '<span class="skl-selo on">PRONTA</span>';

        return `
          <button class="skl-card ${cls}${sel}" data-pick="${meta.id}">
            <span class="skl-card-topo">
              <span class="skl-icone">${this.arte(def, meta)}</span>
              ${selo}
            </span>
            <b>${meta.name}</b>
            <small>NIVEL ${nivel}/${def.maxLevel}</small>
            <span class="skl-card-desc">${def.description}</span>
            <span class="skl-card-stats" data-live-stats="${meta.id}"></span>
            ${
              pode
                ? `<span class="btn primary skl-card-acao">${
                    nivel > 0 ? 'MELHORAR' : 'APRENDER'
                  }<img class="btn-icon" src="art/hud/moeda.png" alt="">${preco.toLocaleString('pt-BR')}</span>`
                : ''
            }
          </button>`;
      })
      .join('');

    for (const b of Array.from(this.gradeEl.querySelectorAll('[data-pick]'))) {
      b.addEventListener('click', (ev) => {
        const id = (b as HTMLElement).dataset.pick!;
        const meta = metas.find((m) => m.id === id)!;
        const def = skillDef(meta.skill)!;
        // Tocar no BOTAO aprende na hora; tocar no resto do cartao escolhe e
        // manda a ficha para o lado. Botao que so enfeita e pior que nenhum.
        if ((ev.target as HTMLElement).closest('.skl-card-acao')) {
          const preco = meta.prices[Math.min(tree.levelOf(def.id), meta.prices.length - 1)] ?? 0;
          if (this.host.stock.money >= preco && tree.learn(def.id, prof)) {
            this.host.stock.money -= preco;
          }
        }
        this.selecionada = id;
        this.render();
      });
    }
  }

  /**
   * A FICHA, como no conceito: leitura de cima para baixo.
   *
   * Cabeca com anel e selo, a frase do Santiago em italico, o que a
   * habilidade faz, a TABELA de efeitos atuais — nome da leitura a esquerda e
   * numero a direita, que e o que deixa conferir valor por valor — a lista do
   * que o proximo nivel acrescenta em verde, e o rodape com o preco.
   *
   * O botao de cinto fica acima do rodape e menor: o ouro grande e um so por
   * tela, e nesta tela ele e o de gastar.
   */
  private renderDetalhe(metas: ActiveSkillMeta[]): void {
    const meta = metas.find((m) => m.id === this.selecionada);
    const def = meta ? skillDef(meta.skill) : null;
    if (!meta || !def) {
      this.detalheEl.innerHTML = '<p class="dim">Escolha uma habilidade.</p>';
      return;
    }
    const tree = this.host.tree;
    const level = tree.levelOf(def.id);
    const maxed = level >= def.maxLevel;
    const check = tree.canLearn(def.id, this.host.currentDepth());
    const preco = meta.prices[Math.min(level, meta.prices.length - 1)] ?? 0;
    const money = Math.floor(this.host.stock.money);
    const podePagar = money >= preco;
    const equipada = this.host.active.isEquipped(meta.id);
    const cheio = this.host.active.equipped.filter(Boolean).length >= ActiveSkills.SLOTS;

    const selo = maxed
      ? '<span class="skl-selo max">COMPLETA</span>'
      : level === 0
        ? check.ok
          ? '<span class="skl-selo">DISPONIVEL</span>'
          : '<span class="skl-selo off">BLOQUEADA</span>'
        : '<span class="skl-selo on">PRONTA</span>';

    const motivo = maxed ? '' : !check.ok ? (check.reason ?? '') : '';

    this.detalheEl.innerHTML = `
      <div class="det-head">
        <span class="det-icone skl-icone">${this.arte(def, meta)}</span>
        <div class="det-nome">
          <b>${meta.name}</b>
          <small>NIVEL ${level}/${def.maxLevel}</small>
        </div>
        ${selo}
      </div>
      <p class="det-flavor">${meta.flavor}</p>
      <p class="det-desc">${def.description}</p>
      <div class="active-status" data-live-status="${meta.id}"></div>
      <h5 class="det-sub">Efeitos atuais</h5>
      <ul class="det-tabela">
        ${meta.stats
          .map(
            (st) => `
              <li>
                <img src="art/hud/encaixe/${st.art ?? 'no'}.png" alt="">
                <span>${st.noun}</span>
                <b data-live-attr="${st.attr}"></b>
              </li>`
          )
          .join('')}
      </ul>
      ${
        maxed
          ? ''
          : `<h5 class="det-sub">Próximo nível (${level + 1}/${def.maxLevel})</h5>
             <ul class="det-ganhos">${this.nextText(def, level)}</ul>`
      }
      ${motivo ? `<p class="active-req">${motivo}</p>` : ''}
      ${
        level > 0
          ? `<button class="btn cinto-troca ${equipada ? 'on' : ''}" data-equip>${
              equipada ? 'TIRAR DO CINTO' : 'LEVAR NO CINTO'
            }</button>`
          : ''
      }
      ${
        maxed
          ? '<footer class="det-rodape"><span class="det-faltam">Nada mais a melhorar.</span></footer>'
          : `<footer class="det-rodape">
               ${
                 podePagar
                   ? ''
                   : `<span class="det-faltam">Faltam
                        <img src="art/hud/moeda.png" alt="">${(preco - money).toLocaleString('pt-BR')}</span>`
               }
               <button class="btn primary det-comprar" data-learn ${
                 !check.ok || !podePagar ? 'disabled' : ''
               }>
                 ${level > 0 ? 'MELHORAR' : 'APRENDER'}
                 <img class="btn-icon" src="art/hud/moeda.png" alt="">${preco.toLocaleString('pt-BR')}
               </button>
             </footer>`
      }`;

    const eq = this.detalheEl.querySelector('[data-equip]');
    eq?.addEventListener('click', () => {
      const trocou = !equipada && cheio;
      this.host.active.toggleEquip(meta.id);
      if (trocou) {
        Events.emit('ui:toast', { text: `${meta.name} entrou no cinto.`, tone: 'info' });
      }
      this.render();
    });

    const btn = this.detalheEl.querySelector('[data-learn]');
    btn?.addEventListener('click', () => {
      if (this.host.stock.money < preco) return;
      if (!tree.learn(def.id, this.host.currentDepth())) return;
      this.host.stock.money -= preco;
      this.render();
    });
  }

  /** A arte da habilidade; o emoji da ficha enquanto ela nao existir. */
  private arte(def: SkillDef, meta: ActiveSkillMeta): string {
    const art = def.art ? Assets.skillIcon(def.art) : null;
    return art ? `<img src="${art}" alt="">` : meta.icon;
  }

  /** O que o proximo nivel acrescenta, uma linha verde por ganho. */
  private nextText(def: SkillDef, level: number): string {
    if (level >= def.maxLevel) return '';
    const mods = def.modifiers[level] ?? [];
    const nomes: Record<string, string> = {
      shockUnlocked: 'libera a habilidade',
      shockCharges: 'marteladas com a habilidade ligada',
      shockJumps: 'saltos da corrente',
      shockPower: 'de dano',
      shockCooldown: 'de recarga',
      shockRange: 'de alcance do salto',
      drillUnlocked: 'libera a habilidade',
      drillCharges: 'marteladas com broca',
      drillDepth: 'blocos de avanço por martelada',
      drillHeight: 'de altura do túnel',
      drillPower: 'de força da broca',
      drillCooldown: 'de recarga',
      blastUnlocked: 'libera a habilidade',
      blastRadius: 'de raio da explosão',
      blastPower: 'de dano',
      blastCharges: 'carga',
      blastCooldown: 'de recarga',
      senseUnlocked: 'libera a habilidade',
      senseRadius: 'de alcance',
      senseDuration: 'de duração',
      senseCooldown: 'de recarga',
      recallUnlocked: 'libera a habilidade',
      recallCastTime: 'de tempo parado',
      recallCooldown: 'de recarga',
      recallDive: 'volta para o ponto onde você estava',
    };
    return mods
      .map((m) => {
        const nome = nomes[m.target] ?? m.target;
        if (m.op === 'unlock') return `<li>${nome}</li>`;
        const v = m.value;
        // Quem decide se o numero e porcentagem e o ATRIBUTO, nao o tamanho
        // do numero: um `flat` de 0,18 em Forca do choque e +18%, e o palpite
        // de "menor que 1 vira porcentagem" erra em "+0,5 bloco".
        const pct =
          m.op === 'percentAdd' || ATTRIBUTES[m.target as AttrId]?.format === 'percent';
        const txt = pct
          ? `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`
          : `${v > 0 ? '+' : ''}${v}`;
        // Melhora que ABAIXA um numero (recarga) tambem e ganho: a seta e o
        // sinal contam a historia certa sem precisar de duas listas.
        return `<li class="${v < 0 ? 'baixa' : ''}">${txt} ${nome}</li>`;
      })
      .join('');
  }

  /** Valores que mudam enquanto se joga: cargas, canalizacao e recarga. */
  private refreshLive(): void {
    for (const meta of ACTIVE_SKILLS) {
      const st = this.host.active.state(meta.id);
      const status = this.wrap.querySelector(`[data-live-status="${meta.id}"]`);
      if (status) {
        // "pronta" NAO entra: o selo do cabecalho ja diz isso, e repetir a
        // mesma palavra duas linhas abaixo so gasta espaco. Aqui so aparece o
        // que muda enquanto se joga.
        const txt = !st.unlocked
          ? ''
          : st.casting > 0
            ? `canalizando ${Math.round(this.host.active.castRatio(meta.id) * 100)}%`
            : st.charges > 0
              ? `LIGADA · ${st.charges} martelada${st.charges > 1 ? 's' : ''}`
              : st.cooldown > 0
                ? `recarregando ${Math.ceil(st.cooldown)}s`
                : '';
        if (status.textContent !== txt) status.textContent = txt;
        status.classList.toggle('on', st.charges > 0 || st.casting > 0);
        status.classList.toggle('cooling', st.charges === 0 && st.cooldown > 0);
      }

      // A linha corrida do cartao.
      const linha = !st.unlocked
        ? ''
        : meta.stats.map((x) => `${this.valor(x)} ${x.label}`).join(' · ');
      for (const el of Array.from(
        this.wrap.querySelectorAll(`[data-live-stats="${meta.id}"]`)
      )) {
        if (el.textContent !== linha) el.textContent = linha;
      }

      // A tabela da ficha: numero a direita, com unidade quando ela existe.
      if (meta.id !== this.selecionada) continue;
      for (const x of meta.stats) {
        const cel = this.detalheEl.querySelector(`[data-live-attr="${x.attr}"]`);
        if (!cel) continue;
        const txt = `${this.valor(x)}${x.unit ? ` ${x.unit}` : ''}`;
        if (cel.textContent !== txt) cel.textContent = txt;
      }
    }
    void CONFIG;
  }

  /** O numero de uma leitura, ja em porcentagem quando for o caso. */
  private valor(st: { attr: ActiveSkillMeta['stats'][number]['attr']; percent?: boolean }): string {
    const v = this.host.attrs.get(st.attr);
    return st.percent ? `${Math.round(v * 100)}%` : `${Math.round(v)}`;
  }

  /** Avisos que valem a pena ver mesmo com a tela fechada. */
  bindEvents(): void {
    Events.on('skill:ready', (p) =>
      Events.emit('ui:toast', { text: `${p.name} recarregada.`, tone: 'good' })
    );
  }
}
