import { Events } from '../core/events';
import { CONFIG } from '../data/config';
import { portaBounds } from '../world/Blockia';
import type { Interactable } from './Interactable';

/**
 * A PORTA DE BLOCKIA.
 *
 * "A rota termina numa porta de madeira reforçada, e há voz do outro lado.
 * Diga seu nome." É o objetivo da missão M5 e o momento em que o jogo para de
 * ser uma mina e passa a ter gente morando embaixo dela.
 *
 * Até agora isso acontecia contra um vão aberto com um desenho de porta por
 * cima: o jogador via duas folhas trancadas e atravessava elas andando. A
 * cidade que decide quem desce tinha a porta encostada.
 *
 * NÃO É `auto`, de propósito. Passar perto não pode abrir: bater na porta é a
 * ação que a missão pede do jogador, e tirar essa ação dele transformaria a
 * chegada em Blockia numa coisa que simplesmente aconteceu com ele.
 */
export class PortaBlockia implements Interactable {
  readonly id = 'porta_blockia';
  x: number;
  y: number;
  radius = CONFIG.player.interactRadius * 1.6;
  aberta = false;

  constructor(surfaceRow: number) {
    const { col0, row0, row1 } = portaBounds(surfaceRow);
    const ts = CONFIG.tileSize;
    // Encostado na folha, do lado de FORA: quem chega vem da galeria.
    this.x = (col0 - 0.5) * ts;
    this.y = ((row0 + row1) / 2) * ts;
  }

  prompt(): string | null {
    if (this.aberta) return null;
    return 'Bater na porta';
  }

  interact(): void {
    if (this.aberta) return;
    /*
     * A conversa acontece ATRAVÉS da porta, e por isso quem fala do outro lado
     * não tem nome ainda. O nome vem depois, quando ela abre — e é a Mara que
     * se apresenta, na primeira conversa dela.
     *
     * Ela pergunta o nome e a porta abre antes da resposta. Isso é o ponto: em
     * Blockia "Ramires" não é um nome qualquer, é o homem que passou por aqui
     * há quatorze anos.
     */
    Events.emit('dialog:open', {
      lines: [
        { speaker: '???', text: '(três batidas. Silêncio. E então, do outro lado:) Quem é?' },
        { speaker: 'Elias', text: 'Eu vim de cima.' },
        { speaker: '???', text: 'Isso eu ouvi pela pedra. Perguntei quem é.' },
        { speaker: 'Elias', text: 'Elias. Elias Ramires.' },
        { speaker: '???', text: '...' },
        { speaker: '???', text: 'Ramires.' },
        { speaker: '???', text: '(a barra do outro lado corre) Entra antes que eu mude de ideia.' },
      ],
      onClose: () => {
        this.aberta = true;
        Events.emit('cidade:porta', { city: 'blockia' });
      },
    });
  }

  render(): void {
    /* A porta é desenhada pelo `CidadeRenderer`, junto com o resto da cidade:
     * aqui só mora a interação. Desenhar nos dois lugares abriria a chance de
     * a folha aberta aparecer por cima da fechada. */
  }
}
