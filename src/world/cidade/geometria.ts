import type { CidadePlanta, PisoDef, SalaDef } from '../../data/cidade';
import type { World } from '../World';

/**
 * As contas de posicao de uma cidade, num lugar so.
 *
 * Escavador, renderizador, moradores, acoes de missao e sondas perguntam as
 * mesmas coisas ("em que linha fica este piso?", "onde a Irene fica de
 * pe?"). Cada um fazer a propria conta foi o que ja emparedou os sete
 * moradores de Blockia uma vez.
 */

export type Tile = { col: number; row: number };

/** Linha do mundo onde o jogador pisa naquele piso. O chao solido e a de baixo. */
export function linhaDe(surfaceRow: number, pe: number): number {
  return surfaceRow + pe;
}

export function colunaDe(planta: CidadePlanta, x: number): number {
  return planta.col0 + x;
}

export function piso(planta: CidadePlanta, id: string): PisoDef {
  const p = planta.pisos.find((q) => q.id === id);
  if (!p) throw new Error(`cidade ${planta.id}: piso desconhecido "${id}"`);
  return p;
}

/** O piso de chao sob a coluna `x`, ou null fora da caverna. */
export function chaoEm(planta: CidadePlanta, x: number): PisoDef | null {
  return planta.pisos.find((p) => p.chao && x >= p.x0 && x <= p.x1) ?? null;
}

/**
 * A linha do teto naquela coluna: abobada, mais alta no meio.
 *
 * Duas ondas somadas para a abobada nao ser um arco de compasso — caverna de
 * verdade tem bolsao e descaida.
 */
export function tetoEm(planta: CidadePlanta, surfaceRow: number, x: number): number {
  const largura = planta.col1 - planta.col0;
  const t = Math.max(0, Math.min(1, x / largura));
  const abobada = Math.sin(t * Math.PI) * 10 + Math.sin(t * Math.PI * 3) * 2.5;
  return Math.round(linhaDe(surfaceRow, planta.teto) - abobada);
}

/** Escada de mao: da linha de pe do piso de baixo ate uma acima do de cima. */
export function escadaLinhas(
  planta: CidadePlanta,
  surfaceRow: number,
  e: { de: string; para: string }
): { topo: number; base: number } {
  return {
    // Uma linha ACIMA do piso de cima: o corpo precisa chegar a altura dele
    // ainda agarrado, para sair de lado.
    topo: linhaDe(surfaceRow, piso(planta, e.para).pe) - 1,
    base: linhaDe(surfaceRow, piso(planta, e.de).pe),
  };
}

/** O vao de uma sala escavada na parede, em tiles do mundo. */
export function salaRect(
  planta: CidadePlanta,
  surfaceRow: number,
  sala: SalaDef
): { col0: number; col1: number; row0: number; row1: number; entrada: number } {
  const p = piso(planta, sala.piso);
  const row1 = linhaDe(surfaceRow, p.pe);
  const row0 = row1 - sala.altura + 1;
  if (sala.lado === 'oeste') {
    const col1 = planta.col0 - 1;
    return { col0: col1 - sala.largura + 1, col1, row0, row1, entrada: col1 };
  }
  const col0 = planta.col1 + 1;
  return { col0, col1: col0 + sala.largura - 1, row0, row1, entrada: col0 };
}

/**
 * A passagem da porta da cidade: quatro colunas a partir da porta, quatro
 * linhas de altura a partir do piso de entrada.
 */
export function portaRect(
  planta: CidadePlanta,
  surfaceRow: number
): { col0: number; col1: number; row0: number; row1: number } {
  const chao = linhaDe(surfaceRow, piso(planta, planta.porta.piso).pe);
  // Quatro colunas: exatamente o que a arte da porta cobre. Com cinco, a
  // ultima coluna do selo aparecia roxa ao lado do arco.
  return { col0: planta.porta.col, col1: planta.porta.col + 3, row0: chao - 3, row1: chao };
}

/**
 * Onde cada morador fica de pe. A ficha e uma sugestao: `findStandingSpot`
 * encaixa no chao mais proximo, com raio curto — um raio grande ja jogou
 * morador para o andar de cima sem ninguem perceber.
 */
export function lugaresDosMoradores(world: World, planta: CidadePlanta): Map<string, Tile> {
  const out = new Map<string, Tile>();
  for (const [id, lugar] of Object.entries(planta.moradores)) {
    const p = piso(planta, lugar.piso);
    const alvo = { col: Math.round(colunaDe(planta, lugar.x)), row: linhaDe(world.surfaceRow, p.pe) };
    out.set(id, world.findStandingSpot(alvo.col, alvo.row, 3) ?? alvo);
  }
  return out;
}

/** Um ponto de um piso, em tiles: para acoes de missao e gatilhos. */
export function pontoNoPiso(planta: CidadePlanta, surfaceRow: number, pisoId: string, x: number): Tile {
  return { col: Math.round(colunaDe(planta, x)), row: linhaDe(surfaceRow, piso(planta, pisoId).pe) };
}
