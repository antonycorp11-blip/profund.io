import { Assets } from '../core/Assets';
import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import { skillCost, skillsOf, type SkillDef } from '../data/skills';
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
    const defs = skillsOf('active');
    if (defs.length === 0) {
      this.listEl.innerHTML = '<p class="map-empty">Nenhuma habilidade ativa ainda.</p>';
      return;
    }
    for (const def of defs) this.listEl.appendChild(this.card(def));
  }

  private card(def: SkillDef): HTMLElement {
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
        <span class="active-status" data-live-status></span>
      </div>
      <p class="active-desc">${def.description}</p>
      <div class="active-stats" data-live-stats></div>
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

  /** Valores que mudam enquanto se joga: cargas e recarga. */
  private refreshLive(): void {
    const st = this.host.active.state('shock');
    const status = this.wrap.querySelector('[data-live-status]');
    const stats = this.wrap.querySelector('[data-live-stats]');
    if (status) {
      const txt = !st.unlocked
        ? ''
        : st.charges > 0
          ? `LIGADA · ${st.charges} martelada${st.charges > 1 ? 's' : ''}`
          : st.cooldown > 0
            ? `recarregando ${Math.ceil(st.cooldown)}s`
            : 'pronta';
      if (status.textContent !== txt) status.textContent = txt;
      status.classList.toggle('on', st.charges > 0);
      status.classList.toggle('cooling', st.charges === 0 && st.cooldown > 0);
    }
    if (stats && st.unlocked) {
      const a = this.host.attrs;
      const linha = [
        `${Math.round(a.get('shockCharges'))} marteladas`,
        `${Math.round(a.get('shockJumps'))} saltos`,
        `${Math.round(a.get('shockPower') * 100)}% de forca`,
        `${Math.max(CONFIG.skills.minCooldown, Math.round(a.get('shockCooldown')))}s de recarga`,
      ].join(' · ');
      if (stats.textContent !== linha) stats.textContent = linha;
    }
  }

  /** Avisos que valem a pena ver mesmo com a tela fechada. */
  bindEvents(): void {
    Events.on('skill:ready', () =>
      Events.emit('ui:toast', { text: 'Choque recarregado.', tone: 'good' })
    );
  }
}
