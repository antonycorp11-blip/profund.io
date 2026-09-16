import { Assets } from '../core/Assets';
import { npcIdForSpeaker } from '../data/story';
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
  /**
   * Sobrevida depois de fechar.
   *
   * O toque (ou o Espaco/Enter/E) que fecha a ultima linha e o MESMO gesto que
   * o jogo le como "interagir". Sem essa carencia curta, fechar a fala colado
   * no NPC reabria a fala no quadro seguinte, para sempre.
   */
  private graca = 0;
  private faceEl!: HTMLImageElement;
  /** Cache dos retratos ja recortados: um canvas por falante. */
  private faces = new Map<string, string | null>();

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'dialog';
    this.root.innerHTML = `
      <div class="dialog-box">
        <img class="dialog-face" alt="" hidden>
        <div class="dialog-speaker"></div>
        <div class="dialog-text"></div>
        <div class="dialog-next">toque para continuar <span>▾</span></div>
      </div>`;
    parent.appendChild(this.root);
    this.speakerEl = this.root.querySelector('.dialog-speaker') as HTMLElement;
    this.faceEl = this.root.querySelector('.dialog-face') as HTMLImageElement;
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
    // Uma conversa de cada vez. Sem isto, um toque a mais durante a fala
    // empilhava o mesmo dialogo por cima dele mesmo e o `onClose` do primeiro
    // se perdia — a pista era registrada duas vezes ou nenhuma.
    if (this.isOpen) return;
    this.lines = lines;
    this.index = 0;
    this.onClose = onClose;
    this.root.classList.add('open');
    this.showLine();
  }

  private showLine(): void {
    const line = this.lines[this.index];
    this.speakerEl.textContent = line.speaker;
    this.showFace(line.speaker);
    this.typed = '';
    this.typeTimer = 0;
    this.typing = true;
    this.textEl.textContent = '';
  }

  /**
   * Retrato de quem esta falando.
   *
   * Recorta a cabeca do primeiro quadro da folha do NPC — a mesma arte que
   * anda pela cidade, sem pedir desenho novo. Quem nao tem folha (o proprio
   * Elias, o Caderno, uma gravacao) fala sem retrato, e isso esta certo: nem
   * toda voz tem rosto.
   */
  private showFace(speaker: string): void {
    const url = this.faceFor(speaker);
    this.faceEl.hidden = !url;
    if (url) this.faceEl.src = url;
  }

  private faceFor(speaker: string): string | null {
    const cached = this.faces.get(speaker);
    if (cached !== undefined) return cached;
    const id = npcIdForSpeaker(speaker);
    const strip = id ? Assets.npcStrip(id, 'idle') : null;
    if (!strip || !strip.width) {
      this.faces.set(speaker, null);
      return null;
    }
    const lado = strip.height;
    // So o terco de cima do quadro: cabeca e ombros.
    const alt = Math.round(lado * 0.42);
    const c = document.createElement('canvas');
    c.width = alt;
    c.height = alt;
    const ctx = c.getContext('2d');
    if (!ctx) {
      this.faces.set(speaker, null);
      return null;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(strip, Math.round((lado - alt) / 2), 0, alt, alt, 0, 0, alt, alt);
    const url = c.toDataURL();
    this.faces.set(speaker, url);
    return url;
  }

  /** True no instante seguinte ao fechamento: ver `graca`. */
  get justClosed(): boolean {
    return this.graca > 0;
  }

  /** Efeito de digitacao (chamado pelo loop do jogo). */
  update(dt: number): void {
    this.graca = Math.max(0, this.graca - dt);
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
    if (this.isOpen) this.graca = 0.35;
    this.root.classList.remove('open');
    const cb = this.onClose;
    this.onClose = undefined;
    cb?.();
  }
}
