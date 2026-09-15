import { Events } from '../core/events';
import type { DialogLine } from '../data/story';

/** Caixa de dialogo: avanca com toque, clique, Espaco ou Enter. */
export class DialogUI {
  private root: HTMLDivElement;
  private speakerEl: HTMLElement;
  private textEl: HTMLElement;
  private lines: DialogLine[] = [];
  private index = 0;
  private onClose: (() => void) | undefined;
  private typed = '';
  private typeTimer = 0;
  private typing = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'dialog';
    this.root.innerHTML = `
      <div class="dialog-box">
        <div class="dialog-speaker"></div>
        <div class="dialog-text"></div>
        <div class="dialog-next">toque para continuar <span>▾</span></div>
      </div>`;
    parent.appendChild(this.root);
    this.speakerEl = this.root.querySelector('.dialog-speaker') as HTMLElement;
    this.textEl = this.root.querySelector('.dialog-text') as HTMLElement;

    this.root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.advance();
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
        e.preventDefault();
        this.advance();
      }
    });

    Events.on('dialog:open', (p) => this.open(p.lines, p.onClose));
  }

  get isOpen(): boolean {
    return this.root.classList.contains('open');
  }

  open(lines: DialogLine[], onClose?: () => void): void {
    if (lines.length === 0) return;
    this.lines = lines;
    this.index = 0;
    this.onClose = onClose;
    this.root.classList.add('open');
    this.showLine();
  }

  private showLine(): void {
    const line = this.lines[this.index];
    this.speakerEl.textContent = line.speaker;
    this.typed = '';
    this.typeTimer = 0;
    this.typing = true;
    this.textEl.textContent = '';
  }

  /** Efeito de digitacao (chamado pelo loop do jogo). */
  update(dt: number): void {
    if (!this.isOpen || !this.typing) return;
    const full = this.lines[this.index].text;
    this.typeTimer += dt;
    const charsPerSecond = 52;
    const target = Math.floor(this.typeTimer * charsPerSecond);
    if (target >= full.length) {
      this.typed = full;
      this.typing = false;
    } else {
      this.typed = full.slice(0, target);
    }
    this.textEl.textContent = this.typed;
  }

  advance(): void {
    if (!this.isOpen) return;
    if (this.typing) {
      this.typed = this.lines[this.index].text;
      this.textEl.textContent = this.typed;
      this.typing = false;
      return;
    }
    this.index++;
    if (this.index >= this.lines.length) {
      this.close();
      return;
    }
    this.showLine();
  }

  close(): void {
    this.root.classList.remove('open');
    const cb = this.onClose;
    this.onClose = undefined;
    cb?.();
  }
}
