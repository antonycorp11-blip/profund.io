/**
 * PONTOS DE ENCAIXE DO HEROI — arquivo GERADO. Nao edite a mao.
 *
 *   npm run medir-encaixes
 *
 * Um ponto por QUADRO, e nao um por animacao. Essa foi a licao que a arma ja
 * ensinou: andando de arma em punho o corpo usa quadros com o braco a frente,
 * e uma ancora "media" pendura a peca fora do corpo. A ancora tem que seguir o
 * desenho que esta na tela.
 *
 * Coordenadas em FRACAO DA ALTURA DESENHADA, com o zero na linha dos pes:
 * x cresce para a frente do heroi, y sobe negativo. Nao dependem do tamanho em
 * que o heroi e desenhado.
 *
 * Correcoes a mao vao em `ENCAIXES_CORRIGIDOS` (characterAnchorFixes.ts), que
 * e escrito por humano e sobrevive a proxima medicao.
 */

export interface Encaixe {
  x: number;
  y: number;
  /**
   * Para onde o ANTEBRACO aponta neste quadro, em radianos. So no punho.
   *
   * Sem ele a ferramenta ficaria horizontal em todo quadro, inclusive no meio
   * do golpe com o braco esticado acima da cabeca — uma picareta deitada no ar
   * ao lado de um punho erguido.
   *
   * E o angulo do ombro ate o punho, e nao o do antebraco de verdade: o
   * cotovelo nao e achavel no desenho, mas ombro-punho acompanha o movimento
   * de perto o bastante, porque e o braco inteiro que gira no golpe.
   */
  angulo?: number;
}

export interface EncaixesDoQuadro {
  /** Testa, onde um capacete assenta. */
  cabeca: Encaixe | null;
  /** Omoplatas, onde a mochila encosta. */
  costas: Encaixe | null;
  /** Punho fechado, onde entra o cabo da ferramenta ou da arma. */
  punho: Encaixe | null;
}

export const ENCAIXES: Record<string, (EncaixesDoQuadro | null)[]> = {
  idle: [
    {
      cabeca: {
        x: 0.0267,
        y: -0.6953
      },
      costas: {
        x: -0.125,
        y: -0.3555
      },
      punho: {
        x: 0.0687,
        y: -0.2631,
        angulo: 1.0778
      }
    },
    {
      cabeca: {
        x: 0.0324,
        y: -0.6953
      },
      costas: {
        x: -0.1094,
        y: -0.3555
      },
      punho: {
        x: 0.0754,
        y: -0.266,
        angulo: 1.0757
      }
    },
    {
      cabeca: {
        x: 0.0275,
        y: -0.6875
      },
      costas: {
        x: -0.125,
        y: -0.3555
      },
      punho: {
        x: 0.0684,
        y: -0.2643,
        angulo: 1.098
      }
    },
    {
      cabeca: {
        x: 0.0292,
        y: -0.6953
      },
      costas: {
        x: -0.125,
        y: -0.3555
      },
      punho: {
        x: 0.072,
        y: -0.2663,
        angulo: 1.0937
      }
    },
    {
      cabeca: {
        x: 0.0288,
        y: -0.6953
      },
      costas: {
        x: -0.125,
        y: -0.3555
      },
      punho: {
        x: 0.0726,
        y: -0.2528,
        angulo: 1.0865
      }
    },
    {
      cabeca: {
        x: 0.0353,
        y: -0.6953
      },
      costas: {
        x: -0.1172,
        y: -0.3633
      },
      punho: {
        x: 0.0769,
        y: -0.2641,
        angulo: 1.0955
      }
    },
    {
      cabeca: {
        x: 0.0325,
        y: -0.6875
      },
      costas: {
        x: -0.125,
        y: -0.3555
      },
      punho: {
        x: 0.0813,
        y: -0.2484,
        angulo: 1.0743
      }
    },
    {
      cabeca: {
        x: 0.0289,
        y: -0.6953
      },
      costas: {
        x: -0.1406,
        y: -0.3555
      },
      punho: {
        x: 0.0703,
        y: -0.2738,
        angulo: 1.058
      }
    },
    {
      cabeca: {
        x: 0.0304,
        y: -0.6875
      },
      costas: {
        x: -0.125,
        y: -0.3555
      },
      punho: {
        x: 0.0703,
        y: -0.265,
        angulo: 1.0852
      }
    }
  ],
  walk: [
    {
      cabeca: {
        x: 0.0834,
        y: -0.6875
      },
      costas: {
        x: -0.1016,
        y: -0.3555
      },
      punho: {
        x: 0.1157,
        y: -0.3086,
        angulo: 0.7026
      }
    },
    {
      cabeca: {
        x: 0.0802,
        y: -0.6797
      },
      costas: {
        x: -0.1328,
        y: -0.3516
      },
      punho: {
        x: 0.1139,
        y: -0.2941,
        angulo: 0.7264
      }
    },
    {
      cabeca: {
        x: 0.0951,
        y: -0.6875
      },
      costas: {
        x: -0.125,
        y: -0.3555
      },
      punho: {
        x: 0.1263,
        y: -0.3085,
        angulo: 0.6557
      }
    },
    {
      cabeca: {
        x: 0.103,
        y: -0.6875
      },
      costas: {
        x: -0.125,
        y: -0.3555
      },
      punho: {
        x: 0.1166,
        y: -0.3118,
        angulo: 0.6779
      }
    },
    {
      cabeca: {
        x: 0.0959,
        y: -0.6875
      },
      costas: {
        x: -0.0703,
        y: -0.3555
      },
      punho: {
        x: 0.1282,
        y: -0.3085,
        angulo: 0.6341
      }
    },
    {
      cabeca: {
        x: 0.0681,
        y: -0.6875
      },
      costas: {
        x: -0.1016,
        y: -0.3555
      },
      punho: {
        x: 0.0618,
        y: -0.307,
        angulo: 1.0108
      }
    },
    {
      cabeca: {
        x: 0.0703,
        y: -0.6875
      },
      costas: {
        x: -0.1094,
        y: -0.3555
      },
      punho: {
        x: 0.0757,
        y: -0.2985,
        angulo: 0.9318
      }
    },
    {
      cabeca: {
        x: 0.0773,
        y: -0.6875
      },
      costas: {
        x: -0.0938,
        y: -0.3555
      },
      punho: {
        x: 0.1094,
        y: -0.2906,
        angulo: 0.797
      }
    },
    {
      cabeca: {
        x: 0.0371,
        y: -0.6875
      },
      costas: {
        x: -0.1406,
        y: -0.3555
      },
      punho: {
        x: 0.0806,
        y: -0.2863,
        angulo: 0.9545
      }
    }
  ],
  jump: [
    {
      cabeca: {
        x: 0.0561,
        y: -0.4844
      },
      costas: {
        x: -0.1719,
        y: -0.1992
      },
      punho: {
        x: 0.0799,
        y: -0.1866,
        angulo: 0.4303
      }
    },
    {
      cabeca: {
        x: 0.0586,
        y: -0.6172
      },
      costas: {
        x: -0.1797,
        y: -0.3008
      },
      punho: {
        x: 0.1183,
        y: -0.2963,
        angulo: 0.3562
      }
    },
    {
      cabeca: {
        x: 0.0605,
        y: -0.6641
      },
      costas: {
        x: -0.1641,
        y: -0.3398
      },
      punho: {
        x: 0.0888,
        y: -0.3402,
        angulo: 0.4943
      }
    },
    {
      cabeca: {
        x: 0.0377,
        y: -0.5547
      },
      costas: {
        x: -0.1406,
        y: -0.2539
      },
      punho: {
        x: 0.1071,
        y: -0.2785,
        angulo: 0.0924
      }
    },
    {
      cabeca: {
        x: 0.0397,
        y: -0.6172
      },
      costas: {
        x: -0.1641,
        y: -0.3008
      },
      punho: {
        x: 0.1462,
        y: -0.3281,
        angulo: 0.1037
      }
    },
    {
      cabeca: {
        x: 0.0386,
        y: -0.6094
      },
      costas: {
        x: -0.1328,
        y: -0.2969
      },
      punho: {
        x: 0.0771,
        y: -0.2769,
        angulo: 0.6612
      }
    }
  ],
  mine: [
    {
      cabeca: {
        x: 0.0693,
        y: -0.6016
      },
      costas: {
        x: -0.1563,
        y: -0.2852
      },
      punho: {
        x: -0.0141,
        y: -0.4313,
        angulo: -1.7001
      }
    },
    {
      cabeca: {
        x: 0.0967,
        y: -0.5
      },
      costas: {
        x: -0.1797,
        y: -0.207
      },
      punho: {
        x: 0.0266,
        y: -0.3438,
        angulo: -1.3677
      }
    },
    {
      cabeca: {
        x: 0.0434,
        y: -0.5391
      },
      costas: {
        x: -0.1016,
        y: -0.2422
      },
      punho: {
        x: 0.0839,
        y: -0.2416,
        angulo: 0.3789
      }
    },
    {
      cabeca: {
        x: 0.0948,
        y: -0.6406
      },
      costas: {
        x: -0.1172,
        y: -0.3516
      },
      punho: null
    },
    {
      cabeca: {
        x: -0.0012,
        y: -0.7578
      },
      costas: {
        x: -0.1328,
        y: -0.4492
      },
      punho: {
        x: 0.0713,
        y: -0.5192,
        angulo: -0.1382
      }
    },
    {
      cabeca: {
        x: 0.0745,
        y: -0.6172
      },
      costas: {
        x: -0.1328,
        y: -0.2969
      },
      punho: {
        x: 0.1334,
        y: -0.2607,
        angulo: 0.5063
      }
    },
    {
      cabeca: {
        x: 0.0806,
        y: -0.4922
      },
      costas: {
        x: -0.1797,
        y: -0.207
      },
      punho: {
        x: 0.0385,
        y: -0.1441,
        angulo: 1.1291
      }
    },
    {
      cabeca: {
        x: 0.0393,
        y: -0.5938
      },
      costas: {
        x: -0.1016,
        y: -0.2852
      },
      punho: {
        x: 0.1201,
        y: -0.2769,
        angulo: 0.3676
      }
    },
    {
      cabeca: {
        x: 0.0663,
        y: -0.6172
      },
      costas: {
        x: -0.0469,
        y: -0.3008
      },
      punho: {
        x: -0.0169,
        y: -0.4453,
        angulo: -1.7359
      }
    },
    {
      cabeca: {
        x: 0.0646,
        y: -0.5234
      },
      costas: {
        x: -0.1094,
        y: -0.2227
      },
      punho: {
        x: 0.0922,
        y: -0.225,
        angulo: 0.3085
      }
    },
    {
      cabeca: {
        x: 0.0365,
        y: -0.6016
      },
      costas: {
        x: -0.1016,
        y: -0.2969
      },
      punho: {
        x: 0.0563,
        y: -0.4844,
        angulo: -1.1836
      }
    },
    {
      cabeca: {
        x: 0.0683,
        y: -0.5234
      },
      costas: {
        x: -0.125,
        y: -0.2344
      },
      punho: {
        x: 0.0805,
        y: -0.2491,
        angulo: 0.2324
      }
    }
  ],
  climb: [
    {
      cabeca: {
        x: 0.0819,
        y: -0.625
      },
      costas: {
        x: -0.125,
        y: -0.3633
      },
      punho: {
        x: 0.0117,
        y: -0.4575,
        angulo: -1.2367
      }
    },
    {
      cabeca: {
        x: 0.0947,
        y: -0.6328
      },
      costas: {
        x: -0.1406,
        y: -0.3438
      },
      punho: {
        x: -0.104,
        y: -0.4162,
        angulo: -2.9034
      }
    },
    {
      cabeca: {
        x: 0.0845,
        y: -0.6172
      },
      costas: {
        x: -0.125,
        y: -0.3633
      },
      punho: {
        x: 0.0132,
        y: -0.4497,
        angulo: -1.1402
      }
    },
    {
      cabeca: {
        x: 0.1064,
        y: -0.625
      },
      costas: {
        x: -0.1406,
        y: -0.3555
      },
      punho: {
        x: 0.0635,
        y: -0.4469,
        angulo: -0.5758
      }
    },
    {
      cabeca: {
        x: 0.0832,
        y: -0.6172
      },
      costas: {
        x: -0.125,
        y: -0.3633
      },
      punho: {
        x: 0.0149,
        y: -0.4553,
        angulo: -1.1561
      }
    },
    {
      cabeca: {
        x: 0.105,
        y: -0.625
      },
      costas: {
        x: -0.1484,
        y: -0.3633
      },
      punho: {
        x: 0.0575,
        y: -0.4526,
        angulo: -0.5783
      }
    }
  ],
  aim: [
    {
      cabeca: {
        x: -0.0559,
        y: -0.6953
      },
      costas: {
        x: -0.1719,
        y: -0.3711
      },
      punho: {
        x: 0.1084,
        y: -0.4437,
        angulo: -0.2204
      }
    },
    {
      cabeca: {
        x: -0.0559,
        y: -0.6953
      },
      costas: {
        x: -0.1719,
        y: -0.3711
      },
      punho: {
        x: 0.1084,
        y: -0.4437,
        angulo: -0.2204
      }
    },
    {
      cabeca: {
        x: 0.0981,
        y: -0.6172
      },
      costas: {
        x: -0.1563,
        y: -0.3711
      },
      punho: {
        x: -0.0412,
        y: -0.5061,
        angulo: -2.0141
      }
    },
    {
      cabeca: {
        x: 0.0981,
        y: -0.6172
      },
      costas: {
        x: -0.1563,
        y: -0.3711
      },
      punho: {
        x: -0.0412,
        y: -0.5061,
        angulo: -2.0141
      }
    },
    {
      cabeca: {
        x: -0.0253,
        y: -0.6953
      },
      costas: {
        x: -0.1406,
        y: -0.3711
      },
      punho: {
        x: 0.1088,
        y: -0.3232,
        angulo: 0.7417
      }
    },
    {
      cabeca: {
        x: -0.0253,
        y: -0.6953
      },
      costas: {
        x: -0.1406,
        y: -0.3711
      },
      punho: {
        x: 0.1088,
        y: -0.3232,
        angulo: 0.7417
      }
    },
    {
      cabeca: {
        x: -0.0212,
        y: -0.6875
      },
      costas: {
        x: -0.2109,
        y: -0.3711
      },
      punho: {
        x: 0.1632,
        y: -0.3051,
        angulo: 0.6108
      }
    },
    {
      cabeca: {
        x: -0.0451,
        y: -0.6953
      },
      costas: {
        x: -0.2109,
        y: -0.3633
      },
      punho: {
        x: 0.1147,
        y: -0.4207,
        angulo: -0.0694
      }
    },
    {
      cabeca: {
        x: -0.0128,
        y: -0.7031
      },
      costas: {
        x: -0.1875,
        y: -0.3711
      },
      punho: {
        x: 0.1157,
        y: -0.4264,
        angulo: -0.0588
      }
    },
    {
      cabeca: {
        x: -0.0225,
        y: -0.6875
      },
      costas: {
        x: -0.1875,
        y: -0.3555
      },
      punho: {
        x: 0.1207,
        y: -0.4188,
        angulo: -0.1052
      }
    }
  ]
};
