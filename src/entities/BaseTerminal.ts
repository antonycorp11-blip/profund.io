import { CONFIG } from '../data/config';
import type { BaseCampDef } from '../data/basecamp';
import type { Interactable } from './Interactable';

/**
 * O ponto de controle da base, no refinador.
 *
 * NAO e `auto`: passar perto do refinador nao pode abrir um painel na cara do
 * jogador, ainda mais num lugar onde ele vai passar dezenas de vezes indo e
 * voltando da esteira.
 */
export class BaseTerminal implements Interactable {
  readonly id: string;
  x: number;
  y: number;
  radius = CONFIG.player.interactRadius * 1.3;

  constructor(readonly base: BaseCampDef, surfaceRow: number, private onOpen: (b: BaseCampDef) => void) {
    this.id = `terminal_${base.id}`;
    const ts = CONFIG.tileSize;
    const slot = base.slots.find((s) => s.kind === 'refinador');
    this.x = (base.col + (slot?.col ?? 0) + 1.5) * ts;
    this.y = (surfaceRow + base.depth) * ts;
  }

  prompt(): string | null {
    return `Painel da ${this.base.nome}`;
  }

  interact(): void {
    this.onOpen(this.base);
  }

  render(): void {
    // Sem desenho proprio: o refinador ja esta la, desenhado pelo
    // BaseCampRenderer. Dois desenhos no mesmo lugar so brigariam.
  }
}
