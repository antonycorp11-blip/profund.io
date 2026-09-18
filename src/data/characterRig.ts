/**
 * Onde prender cada peca no heroi, quadro a quadro.
 *
 * Junta as duas fontes de encaixe e responde a uma pergunta so: nesta tira,
 * neste quadro, onde fica a cabeca / as costas / o punho?
 *
 * A correcao escrita a mao SEMPRE ganha da medida. A medicao nao sabe dizer
 * "nao sei" — ela sempre acha algum borrao de pele e devolve um ponto — entao
 * quem ja olhou com os olhos tem a ultima palavra.
 *
 * Devolver `null` e uma resposta legitima: significa "nao ha onde prender
 * neste quadro", e quem desenha simplesmente nao desenha a peca. E melhor uma
 * mochila que some por um quadro do que uma mochila pregada no lugar errado.
 */

import { ENCAIXES, type Encaixe, type EncaixesDoQuadro } from './characterAnchors';
import { ENCAIXES_CORRIGIDOS } from './characterAnchorFixes';

export type PontoDeEncaixe = keyof EncaixesDoQuadro;

export function encaixe(tira: string, quadro: number, ponto: PontoDeEncaixe): Encaixe | null {
  const corrigido = ENCAIXES_CORRIGIDOS[tira]?.[quadro]?.[ponto];
  if (corrigido) return corrigido;
  return ENCAIXES[tira]?.[quadro]?.[ponto] ?? null;
}
