import { Assets } from '../core/Assets';
import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import { ACTIVE_SKILLS, type ActiveSkillMeta } from '../data/activeSkills';
import { skillDef, type SkillDef } from '../data/skills';
import type { ActiveSkills } from '../systems/ActiveSkills';
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
    this.wrap.innerHTML = `
      <div class="tech-screen">
        <header class="tech-header">
          <div class="tech-tabs"><h3 class="screen-title">⚡ Habilidades</h3></div>
          <div class="tech-stock">✦ <b data-points>0</b></div>
          <button class="icon-btn" data-close>✕</button>
        </header>
        <div class="tech-body skl-tres">
          <aside class="skl-cinto"></aside>
          <div class="tech-main skl-grade"></div>
          <aside class="tech-aside skl-detalhe"></aside>
        </div>
      </div>`;
    parent.appendChild(this.wrap);
    this.cintoEl = this.wrap.querySelector('.skl-cinto') as HTMLElement;
    this.gradeEl = this.wrap.querySelector('.skl-grade') as HTMLElement;
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
   * O cinto: os lugares em GRADE, com a placa embaixo.
   *
   * Era uma coluna de tres, e coluna e a forma de uma lista — o cinto nao e
   * uma lista, e um objeto com lugares. Em grade os tres ficam lado a lado no
   * mesmo golpe de vista, que e o que o conceito mostra. Sao tres e nao
   * quatro de proposito: o limite do cinto e uma decisao do jogo, entao o
   * ultimo lugar se centra em vez de fingir um quarto encaixe vazio.
   */
  private renderCinto(metas: ActiveSkillMeta[]): void {
    const cinto = this.host.active.equipped;
    const lugares = [0, 1, 2]
      .map((i) => {
        const id = cinto[i];
        const meta = id ? metas.find((m) => m.id === id) : null;
        const def = meta ? skillDef(meta.skill) : null;
        const nivel = def ? this.host.tree.levelOf(def.id) : 0;
        return `
          <button class="cinto-lugar ${def ? 'on' : ''}" data-cinto="${meta?.id ?? ''}">
            <span class="cinto-anel">${def ? this.arte(def, meta!) : '<i>+</i>'}</span>
            <b>${def ? def.name : 'vazio'}</b>
            <small>${def ? `NV ${nivel}` : 'escolha ao lado'}</small>
          </button>`;
      })
      .join('');

    this.cintoEl.innerHTML = `
      <h4 class="cinto-titulo">Cinto</h4>
      <p class="dim">O que esta aqui aparece nos botoes do jogo.</p>
      <div class="cinto-lugares">${lugares}</div>
      <p class="cinto-placa">Cinto cheio? A nova entra no lugar da primeira.</p>`;

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
   * A vitrine: cartao COMPLETO, como no conceito.
   *
   * O cartao so identificava — icone, nome, estado — e para saber o que cada
   * habilidade fazia era preciso clicar uma por uma e ler a ficha do lado. Com
   * tres habilidades isso e tres viagens para responder uma pergunta so.
   * Agora o cartao diz o que ela faz, quanto ela custa e traz o proprio botao
   * de aprender; a ficha continua existindo para quem quer o detalhe fino.
   */
  private renderGrade(metas: ActiveSkillMeta[]): void {
    if (metas.length === 0) {
      this.gradeEl.innerHTML = '<p class="map-empty">Nenhuma habilidade ativa ainda.</p>';
      return;
    }
    const tree = this.host.tree;
    const money = Math.floor(this.host.stock.money);
    const prof = this.host.currentDepth();

    this.gradeEl.innerHTML = `
      <h4 class="cinto-titulo">Todas as habilidades</h4>
      <div class="skl-cards">
        ${metas
          .map((meta) => {
            const def = skillDef(meta.skill)!;
            const nivel = tree.levelOf(def.id);
            const maxed = nivel >= def.maxLevel;
            const check = tree.canLearn(def.id, prof);
            const preco = meta.prices[Math.min(nivel, meta.prices.length - 1)] ?? 0;
            const podePagar = money >= preco;
            const pode = !maxed && check.ok && podePagar;
            const equipada = this.host.active.isEquipped(meta.id);
            const sel = meta.id === this.selecionada ? ' sel' : '';
            const estado = maxed
              ? '<span class="skl-flag on">completa</span>'
              : nivel === 0
                ? '<span class="skl-flag"><img src="art/hud/cadeado.png" alt="">nao aprendida</span>'
                : equipada
                  ? '<span class="skl-flag on">no cinto</span>'
                  : '<span class="skl-flag">pronta</span>';

            let acao: string;
            if (maxed) acao = '✓ COMPLETA';
            else if (!check.ok) acao = check.reason ?? 'BLOQUEADA';
            else if (!podePagar) acao = `FALTAM ✦${(preco - money).toLocaleString('pt-BR')}`;
            else acao = `${nivel > 0 ? 'MELHORAR' : 'APRENDER'} · ✦${preco.toLocaleString('pt-BR')}`;

            return `
              <button class="skl-card ${nivel > 0 ? 'owned' : ''}${sel}" data-pick="${meta.id}">
                <span class="skl-card-head">
                  <span class="skl-icone">${this.arte(def, meta)}</span>
                  <span class="skl-card-nome">
                    <b>${def.name}</b>
                    <small>${nivel > 0 ? `NIVEL ${nivel}/${def.maxLevel}` : 'NAO APRENDIDA'}</small>
                  </span>
                  ${estado}
                </span>
                <span class="skl-card-desc">${def.description}</span>
                <span class="active-stats skl-card-stats" data-live-stats="${meta.id}"></span>
                <span class="btn ${pode ? 'primary' : ''} skl-card-acao" ${pode ? '' : 'data-inerte'}>
                  ${acao}
                </span>
              </button>`;
          })
          .join('')}
      </div>`;

    for (const b of Array.from(this.gradeEl.querySelectorAll('[data-pick]'))) {
      b.addEventListener('click', (ev) => {
        const id = (b as HTMLElement).dataset.pick!;
        const meta = metas.find((m) => m.id === id)!;
        const def = skillDef(meta.skill)!;
        // Tocar no BOTAO aprende na hora; tocar no resto do cartao escolhe e
        // manda a ficha para o lado. Botao que so enfeita e pior que nenhum.
        const acao = (ev.target as HTMLElement).closest('.skl-card-acao');
        if (acao && !acao.hasAttribute('data-inerte')) {
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

  /** A ficha: o que ela faz, o que ela custa, e os dois botoes. */
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
    const cheio = this.host.active.equipped.filter(Boolean).length >= 3;

    let motivo = '';
    if (maxed) motivo = 'No maximo';
    else if (!check.ok) motivo = check.reason ?? '';
    else if (!podePagar) motivo = `Faltam ✦${(preco - money).toLocaleString('pt-BR')}`;

    this.detalheEl.innerHTML = `
      <div class="det-head" style="--cat:#7fb6ff">
        <span class="det-icone skl-icone">${this.arte(def, meta)}</span>
        <div>
          <b>${def.name}</b>
          <small>${level > 0 ? `Nivel ${level} de ${def.maxLevel}` : 'Nao aprendida'}</small>
        </div>
        <span class="active-status" data-live-status="${meta.id}"></span>
      </div>
      <p class="det-desc">${def.description}</p>
      <h5 class="det-sub">Agora</h5>
      <div class="active-stats" data-live-stats="${meta.id}"></div>
      ${
        maxed
          ? ''
          : `<h5 class="det-sub">Proximo nivel</h5>
             <div class="active-next">${this.nextText(def, level)}</div>`
      }
      ${motivo ? `<p class="active-req">${motivo}</p>` : ''}
      <div class="det-botoes">
        ${
          level > 0
            ? `<button class="btn ${equipada ? 'on' : ''}" data-equip>${
                equipada ? 'TIRAR DO CINTO' : 'LEVAR NO CINTO'
              }</button>`
            : ''
        }
        <button class="btn primary" data-learn ${maxed || !check.ok || !podePagar ? 'disabled' : ''}>
          ${maxed ? 'COMPLETA' : `${level > 0 ? 'MELHORAR' : 'APRENDER'} · ✦${preco.toLocaleString('pt-BR')}`}
        </button>
      </div>`;

    const eq = this.detalheEl.querySelector('[data-equip]');
    eq?.addEventListener('click', () => {
      const trocou = !equipada && cheio;
      this.host.active.toggleEquip(meta.id);
      if (trocou) {
        Events.emit('ui:toast', { text: `${def.name} entrou no cinto.`, tone: 'info' });
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

  /** O que o proximo nivel acrescenta, em palavras do jogo. */
  private nextText(def: SkillDef, level: number): string {
    if (level >= def.maxLevel) return '';
    const mods = def.modifiers[level] ?? [];
    const nomes: Record<string, string> = {
      shockUnlocked: 'libera a habilidade',
      shockCharges: 'marteladas com a habilidade ligada',
      shockJumps: 'saltos da corrente',
      shockPower: 'forca do choque',
      shockCooldown: 'recarga (segundos)',
      shockRange: 'alcance do salto',
      drillUnlocked: 'libera a habilidade',
      drillCharges: 'marteladas com broca',
      drillDepth: 'blocos de avanco por martelada',
      drillHeight: 'altura do tunel',
      drillPower: 'forca da broca',
      drillCooldown: 'recarga (segundos)',
      recallUnlocked: 'libera a habilidade',
      recallCastTime: 'segundos parado',
      recallCooldown: 'recarga (segundos)',
      recallDive: 'volta para o ponto onde voce estava',
    };
    const partes = mods.map((m) => {
      const nome = nomes[m.target] ?? m.target;
      if (m.op === 'unlock') return nome;
      const v = m.value;
      const txt = m.op === 'percentAdd' ? `${v > 0 ? '+' : ''}${Math.round(v * 100)}%` : `${v > 0 ? '+' : ''}${v}`;
      return `${txt} ${nome}`;
    });
    // Sem o rotulo "Proximo nivel:" na frente: agora ele e o titulo da secao
    // na ficha, e repetir a mesma palavra duas linhas seguidas so gasta espaco.
    return partes.join(' · ');
  }

  /** Valores que mudam enquanto se joga: cargas, canalizacao e recarga. */
  private refreshLive(): void {
    for (const meta of ACTIVE_SKILLS) {
      const st = this.host.active.state(meta.id);
      const status = this.wrap.querySelector(`[data-live-status="${meta.id}"]`);
      if (status) {
        const txt = !st.unlocked
          ? ''
          : st.casting > 0
            ? `canalizando ${Math.round(this.host.active.castRatio(meta.id) * 100)}%`
            : st.charges > 0
              ? `LIGADA · ${st.charges} martelada${st.charges > 1 ? 's' : ''}`
              : st.cooldown > 0
                ? `recarregando ${Math.ceil(st.cooldown)}s`
                : 'pronta';
        if (status.textContent !== txt) status.textContent = txt;
        status.classList.toggle('on', st.charges > 0 || st.casting > 0);
        status.classList.toggle('cooling', st.charges === 0 && st.cooldown > 0);
      }

      // querySelectorAll, e nao querySelector: a mesma leitura aparece no
      // cartao e na ficha, e o primeiro que aparecesse roubaria o valor do
      // outro, que ficaria em branco para sempre.
      const stats = Array.from(this.wrap.querySelectorAll(`[data-live-stats="${meta.id}"]`));
      const linha = !st.unlocked
        ? ''
        : meta.stats
            .map((s) => {
              const v = this.host.attrs.get(s.attr);
              const num = s.percent ? `${Math.round(v * 100)}%` : `${Math.round(v)}`;
              return `${num} ${s.label}`;
            })
            .join(' · ');
      for (const el of stats) if (el.textContent !== linha) el.textContent = linha;
    }
    void CONFIG;
  }

  /** Avisos que valem a pena ver mesmo com a tela fechada. */
  bindEvents(): void {
    Events.on('skill:ready', (p) =>
      Events.emit('ui:toast', { text: `${p.name} recarregada.`, tone: 'good' })
    );
  }
}
