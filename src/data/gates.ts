/**
 * Selos entre biomas: geometria compartilhada entre o WorldGen (que esculpe o
 * selo e a arena) e o BiomeGate (que sabe quando abrir o selo em runtime).
 *
 * Fica num arquivo separado, sem depender de World nem de Game, porque as
 * DUAS pontas (geracao e abertura) precisam calcular exatamente as mesmas
 * linhas e a mesma coluna — se cada lado calculasse por conta propria, um
 * ajuste de CONFIG quebraria silenciosamente a outra ponta.
 */

import { CONFIG } from './config';
import { LAYERS, type LayerDef } from './layers';

/**
 * Camadas com selo, na ordem em que sao encontradas descendo.
 * A superficie nao tem selo (e o ponto de partida); o Portal tambem nao
 * (`generated: false` — ainda nao existe geracao para ele).
 */
/*
 * PEDRA E CRISTAL SAIRAM DAQUI.
 *
 * A BIBLIA poe o primeiro chefe em 420-500 m — a Rainha Escavadora bloqueando
 * a rota comercial para Blockia — e nao poe nenhum antes. O jogo tinha DOIS
 * antes disso, aos 180 e aos 360, e o efeito era exatamente o relatado:
 * "primeiro boss muito cedo, pouco desenvolvimento".
 *
 * Nao e so ritmo, e sentido. Um guardiao existe porque uma CIDADE o colocou
 * ali para impedir que a encontrassem (BIBLIA 2.2). Acima de Blockia nao ha
 * cidade nenhuma para ter colocado guardiao — os dois primeiros guardavam
 * portas que ninguem trancou.
 *
 * As duas faixas continuam existindo e continuam trancando: viraram SELOS DE
 * HISTORIA (/data/storyGates.ts), que abrem por ter achado e nao por ter
 * matado. A primeira metade do jogo passa a ser sobre procurar, que e o que
 * ela sempre quis ser.
 */
export const GATE_LAYERS: string[] = [
  'minerals',
  'magma',
  'ruins',
  'abyss',
];

export function gateLayerDef(layerId: string): LayerDef {
  const layer = LAYERS.find((l) => l.id === layerId);
  if (!layer) throw new Error(`camada de selo desconhecida: ${layerId}`);
  return layer;
}

/** Linhas [row0, row1] do selo desta camada (inclusive), em tiles absolutos. */
export function gateBandRows(surfaceRow: number, layer: LayerDef): { row0: number; row1: number } {
  const row1 = surfaceRow + layer.minDepth - 1;
  const row0 = row1 - CONFIG.gate.bandThickness + 1;
  return { row0, row1 };
}

/**
 * Coluna central da arena — sempre a mesma do poco principal da base.
 * Descer pelo poco leva direto a cada chefe, em sequencia; quem cava para o
 * lado esbarra no selo em qualquer outro ponto e precisa voltar para o poco.
 */
export function gateArenaCol(): number {
  return CONFIG.base.centerCol + CONFIG.base.layout.shaft;
}


/**
 * O retangulo de Blockia em tiles, com a margem de zona segura ja somada.
 *
 * Fica aqui pelo mesmo motivo que a geometria dos selos: iluminacao, spawn de
 * criatura e geracao precisam concordar sobre onde a cidade comeca. Tres
 * copias desse calculo divergiriam na primeira vez que a cidade se mexesse.
 */
export function blockiaBounds(surfaceRow: number, margin = 0): {
  col0: number;
  col1: number;
  row0: number;
  row1: number;
} {
  const bl = CONFIG.blockia;
  return {
    col0: bl.col0 - margin,
    col1: bl.col1 + margin,
    row0: surfaceRow + bl.depth0 - 12 - margin,
    row1: surfaceRow + bl.depth1 + 4 + margin,
  };
}

/** O ponto (em tiles) esta dentro de Blockia? */
export function insideBlockia(col: number, row: number, surfaceRow: number, margin = 0): boolean {
  const b = blockiaBounds(surfaceRow, margin);
  return col >= b.col0 && col <= b.col1 && row >= b.row0 && row <= b.row1;
}
