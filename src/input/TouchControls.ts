import type { Button, InputManager } from './InputManager';

interface PadButtonSpec {
  id: string;
  label: string;
  button: Button;
  cls: string;
  locked?: boolean;
}

/**
 * Controles virtuais (mobile landscape).
 * Esquerda: joystick dinamico. Direita: MINERAR / PULAR / INTERAGIR
 * (+ espacos reservados para DASH e GADGET).
 */
export class TouchControls {
  readonly root: HTMLDivElement;
  private stickBase: HTMLDivElement;
  private stickKnob: HTMLDivElement;
  private stickId: number | null = null;
  private skillBtns: HTMLButtonElement[] = [];
  private stickOx = 0;
  private stickOy = 0;
  private readonly radius = 56;
  private visible = false;

  constructor(private input: InputManager, parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'touch-layer';
    this.root.innerHTML = `
      <div class="touch-stick-zone" data-zone="stick"></div>
      <div class="touch-stick" data-stick>
        <div class="touch-stick-knob" data-knob></div>
      </div>
      <div class="touch-buttons"></div>
    `;
    parent.appendChild(this.root);

    this.stickBase = this.root.querySelector('[data-stick]') as HTMLDivElement;
    this.stickKnob = this.root.querySelector('[data-knob]') as HTMLDivElement;

    const buttons = this.root.querySelector('.touch-buttons') as HTMLDivElement;
    // Sem botao AGIR: chegar perto ja resolve o que e instantaneo, e o que
    // abre tela vira um toque no proprio aviso na tela.
    // GADGET e DASH sairam: o lugar deles e das habilidades ativas — uma por
    // botao, e cada uma so aparece depois de aprendida.
    const specs: PadButtonSpec[] = [
      { id: 'btn-skill1', label: '⚡', button: 'skill1', cls: 'skill', locked: false },
      { id: 'btn-skill2', label: '🛠', button: 'skill2', cls: 'skill', locked: false },
      { id: 'btn-skill3', label: '⟲', button: 'skill3', cls: 'skill', locked: false },
      { id: 'btn-jump', label: 'PULAR', button: 'jump', cls: 'medium' },
      { id: 'btn-mine', label: 'MINERAR', button: 'mine', cls: 'big' },
    ];
    for (const spec of specs) {
      const el = document.createElement('button');
      el.id = spec.id;
      el.className = `touch-btn ${spec.cls}`;
      el.textContent = spec.label;
      el.setAttribute('aria-label', spec.label);
      if (spec.cls === 'skill') {
        el.innerHTML = `${spec.label}<span class="pad-badge" data-charges hidden></span>`;
        el.hidden = true;
        this.skillBtns.push(el);
      }
      buttons.appendChild(el);
      if (spec.locked) {
        el.disabled = true;
        continue;
      }
      this.bindButton(el, spec.button);
    }

    this.bindStick();

    // Mostra automaticamente em dispositivos de toque.
    if (window.matchMedia('(pointer: coarse)').matches) this.setVisible(true);
    window.addEventListener(
      'touchstart',
      () => this.setVisible(true),
      { once: true, passive: true }
    );
  }

  /**
   * Um botao por habilidade ativa, na ordem em que elas existem.
   *
   * Habilidade nao aprendida nao ocupa espaco no pad: o polegar do celular nao
   * tem lugar para botao que nao faz nada.
   */
  syncSkills(skills: {
    all(): { id: string; unlocked: boolean; charges: number; cooldown: number; casting: number }[];
    readyRatio(id: never): number;
    castRatio(id: never): number;
  }): void {
    const estados = skills.all();
    for (let i = 0; i < this.skillBtns.length; i++) {
      const el = this.skillBtns[i];
      const st = estados[i];
      if (!st) {
        el.hidden = true;
        continue;
      }
      if (el.hidden === st.unlocked) el.hidden = !st.unlocked;
      if (!st.unlocked) continue;

      const canalizando = st.casting > 0;
      const ratio = canalizando
        ? skills.castRatio(st.id as never)
        : skills.readyRatio(st.id as never);
      el.classList.toggle('armed', st.charges > 0 || canalizando);
      el.classList.toggle('ready', st.charges === 0 && !canalizando && ratio >= 1);
      el.classList.toggle('casting', canalizando);
      el.style.setProperty('--ring', `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`);

      const badge = el.querySelector('[data-charges]') as HTMLElement | null;
      if (badge) {
        const txt = st.charges > 0 ? String(st.charges) : '';
        if (badge.textContent !== txt) badge.textContent = txt;
        badge.hidden = txt === '';
      }
    }
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.root.classList.toggle('visible', v);
  }

  isVisible(): boolean {
    return this.visible;
  }

  private bindButton(el: HTMLElement, button: Button): void {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('active');
      this.input.press(button);
    });
    const up = (e: PointerEvent) => {
      e.preventDefault();
      el.classList.remove('active');
      this.input.release(button);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', () => {
      el.classList.remove('active');
      this.input.release(button);
    });
  }

  private bindStick(): void {
    const zone = this.root.querySelector('[data-zone="stick"]') as HTMLDivElement;

    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.stickId !== null) return;
      this.stickId = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      this.stickOx = e.clientX;
      this.stickOy = e.clientY;
      this.stickBase.style.left = `${this.stickOx}px`;
      this.stickBase.style.top = `${this.stickOy}px`;
      this.stickBase.classList.add('active');
      this.moveKnob(0, 0);
    });

    zone.addEventListener('pointermove', (e) => {
      if (this.stickId !== e.pointerId) return;
      e.preventDefault();
      let dx = e.clientX - this.stickOx;
      let dy = e.clientY - this.stickOy;
      const len = Math.hypot(dx, dy);
      if (len > this.radius) {
        dx = (dx / len) * this.radius;
        dy = (dy / len) * this.radius;
      }
      this.moveKnob(dx, dy);
      const nx = dx / this.radius;
      const ny = dy / this.radius;
      // Zona morta.
      this.input.setPadAxis(Math.abs(nx) < 0.18 ? 0 : nx, Math.abs(ny) < 0.18 ? 0 : ny);
    });

    const end = (e: PointerEvent) => {
      if (this.stickId !== e.pointerId) return;
      this.stickId = null;
      this.stickBase.classList.remove('active');
      this.moveKnob(0, 0);
      this.input.setPadAxis(0, 0);
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  private moveKnob(dx: number, dy: number): void {
    this.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
}
