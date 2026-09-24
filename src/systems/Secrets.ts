import { Events } from '../core/events';
import { SECRETS, secretRoomRect, type SecretDef } from '../data/secrets';
import type { BaseStock } from './BaseStock';

/**
 * Uma sala lacrada e achada quando o jogador quebra um tile da PAREDE dela.
 *
 * A primeira versao conferia "todas as barreiras deixaram de ser solidas" a
 * cada bloco quebrado em qualquer lugar do mapa, e guardava o achado so num
 * Set em memoria. Duas coisas quebravam por isso, medidas no mundo gerado:
 *  - duas salas tinham a barreira em tile que ja nascia ar (a da marca do
 *    pai caia dentro da sala da pista), entao o primeiro golpe na superficie
 *    "achava" o segredo a 26 m de distancia;
 *  - o mundo e reconstruido a cada carga com a barreira ja aberta e o Set
 *    vazio: todo segredo ja achado pagava de novo no primeiro bloco quebrado
 *    depois de recarregar.
 * Agora o gatilho e o proprio golpe na parede, e o "ja achei" e a flag de
 * historia com o id da sala, que o save ja guarda.
 */
export class Secrets {
  constructor(
    private stock: BaseStock,
    private hasFlag: (id: string) => boolean,
    private setFlag: (id: string) => void,
    private reveal: (id: string) => void,
    defs: readonly SecretDef[] = SECRETS
  ) {
    Events.on('block:break', (p) => {
      for (const secret of defs) if (naParede(secret, p.col, p.row)) this.found(secret);
    });
  }

  private found(secret: SecretDef): void {
    if (this.hasFlag(secret.id)) return;
    for (const [resource, amount] of Object.entries(secret.reward)) this.stock.add(resource as never, amount ?? 0, false);
    this.setFlag(secret.id);
    this.reveal(secret.marker.id);
    Events.emit('secret:found', { id: secret.id, label: secret.marker.label });
  }
}

/** O tile esta no anel de parede em volta do vao da sala? */
export function naParede(secret: SecretDef, col: number, row: number): boolean {
  const r = secretRoomRect(secret);
  const dentroDoAnel = col >= r.c0 - 1 && col <= r.c1 + 1 && row >= r.r0 - 1 && row <= r.r1 + 1;
  const noVao = col >= r.c0 && col <= r.c1 && row >= r.r0 && row <= r.r1;
  return dentroDoAnel && !noVao;
}
