/**
 * Entrada unificada: teclado, mouse e controles virtuais escrevem no mesmo estado.
 * O gameplay so le "intencoes" (axisX, jump, mine...), nunca o dispositivo.
 */

export type Button = 'jump' | 'mine' | 'interact' | 'dash' | 'gadget';

export class InputManager {
  /** -1..1 */
  axisX = 0;
  /** -1..1 (para mira vertical) */
  axisY = 0;

  private held = new Set<Button>();
  private pressed = new Set<Button>();
  private released = new Set<Button>();

  private keyAxisX = 0;
  private keyAxisY = 0;
  private padAxisX = 0;
  private padAxisY = 0;

  /** Posicao do ponteiro em pixels de tela (mouse desktop ou toque na area do mundo). */
  pointerX = 0;
  pointerY = 0;
  pointerActive = false;
  /** True enquanto o jogador mira ativamente com ponteiro (mouse movido / dedo na tela). */
  pointerAiming = false;
  /**
   * De onde veio a ultima intencao de mira.
   * Mouse parado nao deve sequestrar a mira quando o jogador usa as teclas.
   */
  aimSource: 'pointer' | 'axis' = 'axis';

  private keys = new Set<string>();
  private attached = false;

  attach(target: HTMLElement): void {
    if (this.attached) return;
    this.attached = true;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.syncKeyboard();
      const btn = KEY_BUTTONS[e.code];
      if (btn) {
        this.press(btn);
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.syncKeyboard();
      const btn = KEY_BUTTONS[e.code];
      if (btn) this.release(btn);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.syncKeyboard();
      for (const b of Array.from(this.held)) this.release(b);
    });

    target.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') {
        const moved = e.clientX !== this.pointerX || e.clientY !== this.pointerY;
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
        this.pointerActive = true;
        this.pointerAiming = true;
        if (moved) this.aimSource = 'pointer';
      }
    });

    target.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.pointerX = e.clientX;
      this.pointerY = e.clientY;
      this.pointerActive = true;
      this.pointerAiming = true;
      this.aimSource = 'pointer';
      if (e.button === 0) this.press('mine');
      if (e.button === 2) this.press('interact');
    });

    window.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (e.button === 0) this.release('mine');
      if (e.button === 2) this.release('interact');
    });

    target.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private syncKeyboard(): void {
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    const up = this.keys.has('ArrowUp') || this.keys.has('KeyW');
    const down = this.keys.has('ArrowDown') || this.keys.has('KeyS');
    this.keyAxisX = (right ? 1 : 0) - (left ? 1 : 0);
    this.keyAxisY = (down ? 1 : 0) - (up ? 1 : 0);
    if (this.keyAxisX !== 0 || this.keyAxisY !== 0) this.aimSource = 'axis';
    this.recomputeAxes();
  }

  /** Chamado pelo joystick virtual. */
  setPadAxis(x: number, y: number): void {
    this.padAxisX = x;
    this.padAxisY = y;
    if (x !== 0 || y !== 0) this.aimSource = 'axis';
    this.recomputeAxes();
  }

  private recomputeAxes(): void {
    this.axisX = Math.abs(this.padAxisX) > 0.01 ? this.padAxisX : this.keyAxisX;
    this.axisY = Math.abs(this.padAxisY) > 0.01 ? this.padAxisY : this.keyAxisY;
  }

  press(btn: Button): void {
    if (!this.held.has(btn)) this.pressed.add(btn);
    this.held.add(btn);
  }

  release(btn: Button): void {
    if (this.held.has(btn)) this.released.add(btn);
    this.held.delete(btn);
  }

  isHeld(btn: Button): boolean {
    return this.held.has(btn);
  }

  wasPressed(btn: Button): boolean {
    return this.pressed.has(btn);
  }

  wasReleased(btn: Button): boolean {
    return this.released.has(btn);
  }

  /** Limpa os eventos de borda; chamar no fim de cada frame. */
  endFrame(): void {
    this.pressed.clear();
    this.released.clear();
    this.pointerAiming = false;
  }

  releaseAll(): void {
    for (const b of Array.from(this.held)) this.release(b);
    this.setPadAxis(0, 0);
  }
}

const KEY_BUTTONS: Record<string, Button> = {
  Space: 'jump',
  KeyK: 'jump',
  KeyZ: 'jump',
  KeyJ: 'mine',
  KeyX: 'mine',
  Enter: 'interact',
  KeyE: 'interact',
  KeyF: 'interact',
  ShiftLeft: 'dash',
  KeyQ: 'gadget',
};
