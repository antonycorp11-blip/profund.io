import { CONFIG } from '../data/config';
import type { BaseCampDef } from '../data/basecamp';
import type { Interactable } from './Interactable';

/**
 * O deposito da base, do lado do jogador.
 *
 * As toupeiras ja entregam aqui sozinhas; faltava o jogador poder fazer o
 * mesmo. Chegar na base com a mochila cheia e ter que subir 236 metros para
 * esvaziar e exatamente o que a base existe para evitar.
 *
 * NAO e `auto`: despejar a mochila e uma decisao. O que entra aqui vai para o
 * refino, nao direto para a moeda — quem quiser vender sobe e entrega na base
 * da superficie, como sempre.
 */
export class BaseDepot implements Interactable {
  readonly id: string;
  x: number;
  y: number;
  radius = CONFIG.player.interactRadius * 1.2;

  constructor(
    readonly base: BaseCampDef,
    surfaceRow: number,
    private pronto: () => boolean,
    private onDespejar: () => void,
    private carga: () => number
  ) {
    this.id = `deposito_${base.id}`;
    const ts = CONFIG.tileSize;
    const slot = base.slots.find((s) => s.kind === 'deposito');
    this.x = (base.col + (slot?.col ?? 0) + 2) * ts;
    this.y = (surfaceRow + base.depth) * ts;
  }

  prompt(): string | null {
    // Enquanto a caixa nao existe, o encaixe manda a mensagem dele.
    if (!this.pronto()) return null;
    const n = this.carga();
    return n > 0 ? `Despejar mochila (${n})` : 'Deposito vazio na mochila';
  }

  interact(): void {
    if (!this.pronto() || this.carga() <= 0) return;
    this.onDespejar();
  }

  render(): void {
    // Sem desenho: o BaseCampRenderer ja desenha o deposito.
  }
}
