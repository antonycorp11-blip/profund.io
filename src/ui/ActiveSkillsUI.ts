import { Assets } from '../core/Assets';
import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import { ACTIVE_SKILLS, type ActiveSkillMeta } from '../data/activeSkills';
import { skillCost, skillDef, type SkillDef } from '../data/skills';
import type { ActiveSkills } from '../systems/ActiveSkills';
import type { Attributes } from '../systems/Attributes';
import type { SkillTree } from '../systems/SkillTree';

export interface ActiveSkillsHost {
  tree: SkillTree;
  attrs: Attributes;
  active: ActiveSkills;
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
  private listEl: HTMLElement;
  private pointsEl: HTMLElement;
  private liveTimer = 0;

  constructor(parent: HTMLElement, private host: ActiveSkillsHost) {
    this.wrap = document.createElement('div');
    this.wrap.className = 'panel-wrap skillscreen';
    this.wrap.innerHTML = `
      <div class="tech-screen">
        <header class="tech-header">
          <div class="tech-tabs"><h3 class="screen-title">⚡ Habilidades</h3></div>
          <div class="tech-stock"><b data-points>0</b> pontos</div>
          <button class="icon-btn" data-close>✕</button>
        </header>
        <div class="tech-body active-list"></div>
      </div>`;
    parent.appendChild(this.wrap);
    this.listEl = this.wrap.querySelector('.active-list') as HTMLElement;
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

  private render(): void {
    this.pointsEl.textContent = String(this.host.tree.points);
    this.listEl.innerHTML = '';
    let n = 0;
    for (const meta of ACTIVE_SKILLS) {
      const def = skillDef(meta.skill);
      if (!def) continue;
      this.listEl.appendChild(this.card(def, meta));
      n++;
    }
    if (n === 0) {
      this.listEl.innerHTML = '<p class="map-empty">Nenhuma habilidade ativa ainda.</p>';
    }
  }

  private card(def: SkillDef, meta: ActiveSkillMeta): HTMLElement {
    const tree = this.host.tree;
    const level = tree.levelOf(def.id);
    const maxed = level >= def.maxLevel;
    const check = tree.canLearn(def.id, this.host.currentDepth());
    const cost = skillCost(def, level);

    const el = document.createElement('div');
    el.className = `active-card ${level > 0 ? 'owned' : ''}`;
    const art = def.art ? Assets.skillIcon(def.art) : null;
    const icone = art ? `<img src="${art}" alt="">` : def.icon;

    el.innerHTML = `
      <div class="active-head">
        <span class="active-icon">${icone}</span>
        <div class="active-title">
          <b>${def.name}</b>
          <span class="active-level">${level > 0 ? `nivel ${level}/${def.maxLevel}` : 'nao aprendida'}</span>
        </div>
        <span class="active-status" data-live-status="${meta.id}"></span>
      </div>
      <p class="active-desc">${def.description}</p>
      <div class="active-stats" data-live-stats="${meta.id}"></div>
      <div class="active-next">${this.nextText(def, level)}</div>
      <div class="active-foot">
        <span class="active-req">${maxed ? 'No maximo' : check.ok ? `Custa ${cost} ponto${cost > 1 ? 's' : ''}` : (check.reason ?? '')}</span>
        <button class="btn primary" data-learn ${maxed || !check.ok ? 'disabled' : ''}>
          ${level > 0 ? 'MELHORAR' : 'APRENDER'}
        </button>
      </div>`;

    const btn = el.querySelector('[data-learn]') as HTMLButtonElement;
    btn.addEventListener('click', () => {
      if (tree.learn(def.id, this.host.currentDepth())) this.render();
    });
    return el;
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
    return partes.length ? `<b>Proximo nivel:</b> ${partes.join(' · ')}` : '';
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

      const stats = this.wrap.querySelector(`[data-live-stats="${meta.id}"]`);
      if (!stats) continue;
      if (!st.unlocked) {
        if (stats.textContent !== '') stats.textContent = '';
        continue;
      }
      const linha = meta.stats
        .map((s) => {
          const v = this.host.attrs.get(s.attr);
          const num = s.percent ? `${Math.round(v * 100)}%` : `${Math.round(v)}`;
          return `${num} ${s.label}`;
        })
        .join(' · ');
      if (stats.textContent !== linha) stats.textContent = linha;
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
