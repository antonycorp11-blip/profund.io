/**
 * Onde a MAO fecha em cada arma, em fracao do sprite.
 *
 * GERADO por tools/slice-armas-lateral.mjs — nao editar a mao.
 *
 * E o ponto em torno do qual a arma gira quando o jogador muda a mira. Cada
 * arma tem a empunhadura num lugar diferente (o revolver e curto, o fuzil tem
 * coronha atras), e prender todas pelo mesmo ponto deixaria umas adiantadas e
 * outras atrasadas na mao.
 */
export const WEAPON_GRIPS: Record<string, { x: number; y: number }> = {
  "pistola": {
    "x": 0.225,
    "y": 0.46
  },
  "pistola_2": {
    "x": 0.215,
    "y": 0.428
  },
  "escopeta": {
    "x": 0.166,
    "y": 0.59
  },
  "escopeta_2": {
    "x": 0.17,
    "y": 0.595
  },
  "fuzil": {
    "x": 0.189,
    "y": 0.552
  },
  "fuzil_2": {
    "x": 0.186,
    "y": 0.616
  }
};
