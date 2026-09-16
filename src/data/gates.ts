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
export const GATE_LAYERS: string[] = [
  'stone',
  'crystal',
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
