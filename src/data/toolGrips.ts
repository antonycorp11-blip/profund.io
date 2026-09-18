/**
 * Onde a MAO fecha em cada picareta, em fracao do sprite.
 *
 * GERADO por tools/slice-equipamento.mjs — nao editar a mao.
 *
 * Mesmo papel que `weaponGrips.ts` faz para as armas: e o ponto que cai em
 * cima do punho do heroi, e em torno do qual a ferramenta gira no golpe. A
 * medida e diferente da das armas porque a forma e diferente — a arma pendura
 * a coronha abaixo do cano, a picareta e uma haste reta e a mao fecha SOBRE
 * ela, a pouco mais de um quinto do comprimento.
 */

export const TOOL_GRIPS: Record<string, { x: number; y: number }> = {
  pick_old: {
    x: 0.22,
    y: 0.404
  },
  pick_reinforced: {
    x: 0.22,
    y: 0.413
  },
  pick_copper: {
    x: 0.22,
    y: 0.387
  },
  pick_gold: {
    x: 0.22,
    y: 0.374
  },
  pick_crystal: {
    x: 0.22,
    y: 0.38
  },
  pick_ruby: {
    x: 0.22,
    y: 0.38
  }
};
