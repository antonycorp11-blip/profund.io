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
      <button class="touch-fold" data-fold title="Recolher habilidades">⋯</button>
      <div class="touch-skills"></div>
      <div class="touch-buttons"></div>
    `;
    parent.appendChild(this.root);

    this.stickBase = this.root.querySelector('[data-stick]') as HTMLDivElement;
    this.stickKnob = this.root.querySelector('[data-knob]') as HTMLDivElement;

    const buttons = this.root.querySelector('.touch-buttons') as HTMLDivElement;
    const skillCol = this.root.querySelector('.touch-skills') as HTMLDivElement;
    // A coluna de habilidades recolhe: com tres habilidades ela cresce, e nem
    // toda descida e uma luta.

    const fold = this.root.querySelector('[data-fold]') as HTMLButtonElement;
    fold.addEventListener('click', () => {
      const oculto = skillCol.classList.toggle('folded');
      fold.classList.toggle('on', oculto);
      try {
        localStorage.setItem('hud.skills.folded', oculto ? '1' : '0');
      } catch {
        // sem persistencia em modo privado; o jogo segue igual
      }
    });
    try {
      if (localStorage.getItem('hud.skills.folded') === '1') {
        skillCol.classList.add('folded');
        fold.classList.add('on');
      }
    } catch {
      // idem
    }
    // Sem botao AGIR: chegar perto ja resolve o que e instantaneo, e o que
    // abre tela vira um toque no proprio aviso na tela.
    // GADGET e DASH sairam: o lugar deles e das habilidades ativas — uma por
    // botao, e cada uma so aparece depois de aprendida.
    const specs: PadButtonSpec[] = [
      // Tres lugares fixos. O que cada um FAZ vem do cinto, nao daqui.
      { id: 'btn-skill1', label: '', button: 'skill1', cls: 'skill', locked: false },
      { id: 'btn-skill2', label: '', button: 'skill2', cls: 'skill', locked: false },
      { id: 'btn-skill3', label: '', button: 'skill3', cls: 'skill', locked: false },
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
        el.innerHTML =
          `<span class="pad-icon">${spec.label}</span>` +
          '<span class="pad-badge" data-charges hidden></span>';
        el.hidden = true;
        this.skillBtns.push(el);
        // Habilidades vao para a propria coluna: no grid dos botoes elas
        // caiam todas na mesma celula e uma tapava a outra — so a ultima
        // recebia o toque, e nao dava para escolher qual usar.
        skillCol.appendChild(el);
      } else {
        buttons.appendChild(el);
      }
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
  /**
   * Posicoes do arco, por quantidade de habilidade DESBLOQUEADA.
   *
   * Sao coordenadas (right, bottom) em px, medidas a partir do canto inferior
   * direito. Nao foram escolhidas no olho: um solver testou raio, angulo
   * inicial e passo procurando o arranjo mais PERTO do polegar em que nenhum
   * botao encosta no MINERAR, no PULAR, em outro botao ou na borda da tela.
   *
   * Cinco botoes de 50px simplesmente NAO cabem num anel so em volta de um
   * MINERAR de 92px num celular — por isso 4 e 5 abrem um segundo anel. Foi o
   * solver que disse isso, depois de eu tentar tres vezes no olho e o
   * resultado ficar espalhado pela tela.
   */
  /**
   * O LEQUE de habilidades, acima do par MINERAR + PULAR.
   *
   * Sao coordenadas (right, bottom) em px a partir do canto inferior direito.
   *
   * Ja tentei anel em volta do MINERAR duas vezes. Nao funciona num celular: o
   * anel que nao encosta em nada fica irregular, e irregular nao se le — o
   * jogador precisa de RITMO para achar o botao sem olhar. Leque simetrico
   * acima das duas teclas de acao e o que quase todo jogo de toque faz, e e
   * por isso.
   *
   * Simetrico em torno do centro: com uma habilidade ela fica no meio, com
   * cinco o leque abre para os dois lados. Calculado por solver, conferindo
   * distancia ao MINERAR, ao PULAR, entre os proprios botoes e a borda.
   */
  private static readonly ARCO: Record<number, [number, number][]> = {
    1: [[150, 120]],
    2: [[122, 118], [178, 118]],
    3: [[94, 133], [150, 140], [206, 133]],
  };

  /**
   * Espalha as habilidades desbloqueadas no arco.
   *
   * A posicao depende de QUANTAS estao visiveis, e nao do indice fixo de cada
   * uma: com duas habilidades elas ficam coladas no polegar, com cinco o arco
   * abre. Posicao fixa por habilidade deixaria buracos no arco enquanto o
   * jogador nao comprou tudo.
   */
  private posicionarArco(estados: ({ unlocked: boolean } | undefined)[]): void {
    const visiveis: HTMLButtonElement[] = [];
    for (let i = 0; i < this.skillBtns.length; i++) {
      if (estados[i]?.unlocked) visiveis.push(this.skillBtns[i]);
    }
    const chave = Math.min(5, visiveis.length);
    const pontos = TouchControls.ARCO[chave];
    if (!pontos) return;
    visiveis.forEach((el, i) => {
      const p = pontos[i];
      if (!p) return;
      el.style.right = `${p[0] - 25}px`;
      el.style.bottom = `${p[1] - 25}px`;
    });
  }

  syncSkills(skills: {
    all(): { id: string; unlocked: boolean; charges: number; cooldown: number; casting: number }[];
    readyRatio(id: never): number;
    castRatio(id: never): number;
    equipped: (string | null)[];
    iconOf(id: string): string;
  }): void {
    const todos = skills.all();
    // Cada botao mostra a habilidade que esta NAQUELE lugar do cinto.
    const estados = skills.equipped.map((id) => {
      if (!id) return undefined;
      const st = todos.find((x) => x.id === id);
      return st && st.unlocked ? st : undefined;
    });
    for (let i = 0; i < this.skillBtns.length; i++) {
      const st = estados[i];
      const el = this.skillBtns[i];
      const atual = el.querySelector('.pad-icon') as HTMLElement | null;
      if (!atual) continue;
      const id = st?.id ?? '';
      // Troca so quando a habilidade do lugar muda. Sem esta guarda o botao
      // remontaria a imagem sessenta vezes por segundo e a arte piscaria.
      if (atual.dataset.skill === id) continue;
      atual.dataset.skill = id;
      atual.textContent = st ? skills.iconOf(st.id) : '';
      if (!st) continue;
      // Arte quando existir; o emoji fica como reserva ate ela carregar.
      const img = new Image();
      img.className = 'pad-img';
      img.alt = '';
      img.onload = () => {
        if (atual.dataset.skill !== id) return;
        atual.textContent = '';
        atual.appendChild(img);
      };
      img.src = `art/skills/${id}.png`;
    }
    this.posicionarArco(estados);
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
