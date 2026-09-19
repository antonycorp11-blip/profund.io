import { CONFIG } from './config';

/**
 * SELOS DE HISTORIA.
 *
 * O selo de bioma tranca a passagem entre CAMADAS. Estes trancam a passagem
 * dentro de uma camada, e existem por um motivo que so apareceu quando alguem
 * jogou de verdade: o primeiro bioma era uma linha reta de cinquenta metros com
 * a pista aos 26, o Jonas aos 38 e o chefe aos 48. Quem cavava reto para baixo
 * — que e a primeira coisa que qualquer jogador faz — chegava no chefe sem
 * nunca ter achado a marca do pai, e a historia inteira se contava fora de
 * ordem, ou nao se contava.
 *
 * A regra e a mesma do selo de bioma, e por isso ele usa o MESMO bloco: a
 * faixa e indestrutivel e vira ar de uma vez quando a condicao aparece. A
 * diferenca e a condicao — la e um chefe, aqui e uma coisa que o jogador
 * precisava ter visto.
 *
 * Nao ha arena e nao ha entrada escavada: nao se passa por aqui lutando. Se
 * passa tendo achado.
 */
export interface StoryGateDef {
  id: string;
  /** Profundidade da faixa, em metros. */
  depth: number;
  /** Flag de historia que abre. */
  requires: string;
  /** Titulo do aviso, quando o jogador bate nela. */
  titulo: string;
  /** O que ainda falta, em uma frase — sem entregar a localizacao. */
  aviso: string;
}

export const STORY_GATES: StoryGateDef[] = [
  {
    id: 'sg_marca',
    depth: 64,
    requires: 'clue_marca_do_pai',
    titulo: 'A ROCHA NAO ABRE',
    aviso:
      'O caderno marca 26 metros. Voce passou direto. Varra essa profundidade ' +
      'ate achar o que ele deixou la.',
  },
  {
    id: 'sg_jonas',
    depth: 144,
    requires: 'npc_jonas',
    titulo: 'A ROCHA NAO ABRE',
    aviso: 'Tem alguem gritando acima deste ponto. Ninguem passa por cima disso.',
  },
  /*
   * AS DUAS FAIXAS QUE ERAM DE CHEFE.
   *
   * Aos 180 e aos 360 havia guardiao. A BIBLIA nao poe nenhum antes dos 420 m,
   * e por um motivo que nao e de ritmo: guardiao existe porque uma CIDADE o
   * colocou para nao ser encontrada. Acima de Blockia nao ha cidade nenhuma —
   * aqueles dois guardavam portas que ninguem trancou.
   *
   * As faixas ficam. O que muda e a chave: passa quem ACHOU o que havia para
   * achar naquele trecho, e nao quem matou o que estava na frente.
   */
  {
    /*
     * 240, e nao 180.
     *
     * Esta parede nasceu aos 180 porque era ali que ficava o selo do chefe que
     * ela substituiu. So que a chave dela — o trilho remendado — esta aos 216,
     * ou seja, DO OUTRO LADO. O jogador chegava aos 180, batia numa rocha que
     * so abre com uma coisa que so existe abaixo dela, e acabava o jogo ali.
     *
     * Herdei a profundidade do que estava antes em vez de perguntar onde
     * estava a chave. Uma parede se posiciona depois da chave, nunca antes.
     */
    id: 'sg_trilhos',
    depth: 240,
    requires: 'clue_trilhos',
    titulo: 'A ROCHA NAO ABRE',
    aviso:
      'Ha trilho remendado com solda nova acima deste ponto, numa mina fechada ' +
      'ha quatorze anos. Ache antes de descer mais.',
  },
  {
    id: 'sg_rui',
    depth: 360,
    requires: 'rui_cabeca',
    titulo: 'A ROCHA NAO ABRE',
    aviso:
      'Alguem mantem estes trilhos. Encontre quem mora no fim da linha antes ' +
      'de descer mais.',
  },
];

/** Linhas da faixa selada, do mesmo jeito que o selo de bioma calcula a dele. */
export function storyGateRows(
  surfaceRow: number,
  gate: StoryGateDef
): { row0: number; row1: number } {
  const row1 = surfaceRow + gate.depth;
  const row0 = row1 - CONFIG.gate.storyBandThickness + 1;
  return { row0, row1 };
}

export function storyGateAtRow(surfaceRow: number, row: number): StoryGateDef | null {
  for (const g of STORY_GATES) {
    const { row0, row1 } = storyGateRows(surfaceRow, g);
    if (row >= row0 && row <= row1) return g;
  }
  return null;
}
