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
        x: -0.0994,
        y: -0.2678,
        angulo: 2.1769
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
        x: 0.0553,
        y: -0.6875
      },
      costas: {
        x: -0.0625,
        y: -0.3711
      },
      punho: {
        x: -0.0329,
        y: -0.3039,
        angulo: 1.817
      }
    },
    {
      cabeca: {
        x: 0.0506,
        y: -0.6875
      },
      costas: {
        x: -0.1172,
        y: -0.3711
      },
      punho: {
        x: 0.0954,
        y: -0.3079,
        angulo: 0.863
      }
    },
    {
      cabeca: {
        x: 0.0399,
        y: -0.6875
      },
      costas: {
        x: -0.125,
        y: -0.3711
      },
      punho: {
        x: 0.0109,
        y: -0.2994,
        angulo: 1.448
      }
    },
    {
      cabeca: {
        x: 0.0396,
        y: -0.6953
      },
      costas: {
        x: -0.1484,
        y: -0.3828
      },
      punho: {
        x: -0.0996,
        y: -0.3387,
        angulo: 2.3632
      }
    },
    {
      cabeca: {
        x: 0.0437,
        y: -0.6797
      },
      costas: {
        x: -0.1484,
        y: -0.3633
      },
      punho: {
        x: 0.1109,
        y: -0.2948,
        angulo: 0.7977
      }
    },
    {
      cabeca: {
        x: 0.0403,
        y: -0.6875
      },
      costas: {
        x: -0.1172,
        y: -0.3711
      },
      punho: {
        x: 0.0629,
        y: -0.3057,
        angulo: 1.0652
      }
    },
    {
      cabeca: {
        x: 0.0633,
        y: -0.6875
      },
      costas: {
        x: -0.0859,
        y: -0.3711
      },
      punho: {
        x: 0.0828,
        y: -0.2828,
        angulo: 1.005
      }
    },
    {
      cabeca: {
        x: 0.06,
        y: -0.6875
      },
      costas: {
        x: -0.1016,
        y: -0.3711
      },
      punho: {
        x: 0.0734,
        y: -0.3078,
        angulo: 0.9888
      }
    },
    {
      cabeca: {
        x: 0.0542,
        y: -0.6875
      },
      costas: {
        x: -0.0859,
        y: -0.3711
      },
      punho: {
        x: -0.0524,
        y: -0.308,
        angulo: 2.0105
      }
    },
    {
      cabeca: {
        x: 0.0581,
        y: -0.6875
      },
      costas: {
        x: -0.0703,
        y: -0.375
      },
      punho: {
        x: 0.0491,
        y: -0.3045,
        angulo: 1.1878
      }
    }
  ],
  jump: [
    {
      cabeca: {
        x: 0.0352,
        y: -0.6953
      },
      costas: {
        x: -0.0938,
        y: -0.3711
      },
      punho: {
        x: -0.0604,
        y: -0.3007,
        angulo: 2.0149
      }
    },
    {
      cabeca: {
        x: -0.1308,
        y: -0.3906
      },
      costas: {
        x: -0.2031,
        y: -0.2227
      },
      punho: {
        x: 0.1165,
        y: -0.3888,
        angulo: -0.8565
      }
    },
    {
      cabeca: {
        x: -0.0457,
        y: -0.7813
      },
      costas: {
        x: -0.0859,
        y: -0.4375
      },
      punho: {
        x: 0.0844,
        y: -0.7805,
        angulo: -1.2709
      }
    },
    {
      cabeca: {
        x: 0.0844,
        y: -0.6875
      },
      costas: {
        x: -0.1406,
        y: -0.3633
      },
      punho: {
        x: -0.0827,
        y: -0.3417,
        angulo: 2.4092
      }
    },
    {
      cabeca: {
        x: 0.0125,
        y: -0.5938
      },
      costas: {
        x: -0.1641,
        y: -0.2891
      },
      punho: {
        x: 0.0595,
        y: -0.3191,
        angulo: 0.1697
      }
    },
    {
      cabeca: {
        x: 0.0276,
        y: -0.5156
      },
      costas: {
        x: -0.1563,
        y: -0.2305
      },
      punho: {
        x: 0.0601,
        y: -0.2433,
        angulo: 0.2896
      }
    },
    {
      cabeca: {
        x: 0.0678,
        y: -0.6875
      },
      costas: {
        x: -0.1797,
        y: -0.3633
      },
      punho: {
        x: -0.0047,
        y: -0.5188,
        angulo: -1.6149
      }
    },
    {
      cabeca: {
        x: 0.0743,
        y: -0.5078
      },
      costas: {
        x: -0.1797,
        y: -0.1875
      },
      punho: {
        x: 0.0394,
        y: -0.3306,
        angulo: -1.2475
      }
    },
    {
      cabeca: {
        x: 0.0442,
        y: -0.6953
      },
      costas: {
        x: -0.1172,
        y: -0.3711
      },
      punho: {
        x: -0.0769,
        y: -0.3066,
        angulo: 2.1449
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
        x: 0.0844,
        y: -0.625
      },
      costas: {
        x: -0.1328,
        y: -0.3867
      },
      punho: {
        x: 0.0024,
        y: -0.4597,
        angulo: -1.2622
      }
    },
    {
      cabeca: {
        x: 0.0983,
        y: -0.625
      },
      costas: {
        x: -0.1172,
        y: -0.3867
      },
      punho: {
        x: 0.0156,
        y: -0.3385,
        angulo: 1.4181
      }
    },
    {
      cabeca: {
        x: 0.0225,
        y: -0.6016
      },
      costas: {
        x: -0.1328,
        y: -0.3398
      },
      punho: {
        x: 0.101,
        y: -0.4292,
        angulo: -0.3991
      }
    },
    {
      cabeca: {
        x: 0.0923,
        y: -0.6484
      },
      costas: {
        x: -0.125,
        y: -0.4063
      },
      punho: {
        x: 0.0114,
        y: -0.4724,
        angulo: -0.6535
      }
    },
    {
      cabeca: {
        x: 0.1028,
        y: -0.6484
      },
      costas: {
        x: -0.1094,
        y: -0.4063
      },
      punho: {
        x: 0.0345,
        y: -0.3493,
        angulo: 1.27
      }
    },
    {
      cabeca: {
        x: 0.0244,
        y: -0.6016
      },
      costas: {
        x: -0.1328,
        y: -0.3398
      },
      punho: {
        x: 0.1001,
        y: -0.4237,
        angulo: -0.3691
      }
    },
    {
      cabeca: {
        x: 0.0944,
        y: -0.6484
      },
      costas: {
        x: -0.1172,
        y: -0.4063
      },
      punho: {
        x: 0.0145,
        y: -0.4693,
        angulo: -0.5424
      }
    },
    {
      cabeca: {
        x: 0.0953,
        y: -0.6484
      },
      costas: {
        x: -0.1172,
        y: -0.4063
      },
      punho: {
        x: 0.0112,
        y: -0.4691,
        angulo: -0.6487
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
  ],
  arranca: [
    {
      cabeca: {
        x: 0.0259,
        y: -0.6953
      },
      costas: {
        x: -0.1094,
        y: -0.375
      },
      punho: {
        x: -0.0778,
        y: -0.3011,
        angulo: 2.1041
      }
    },
    {
      cabeca: {
        x: 0.1249,
        y: -0.6875
      },
      costas: {
        x: -0.1328,
        y: -0.3633
      },
      punho: {
        x: 0.1609,
        y: -0.3063,
        angulo: 0.5725
      }
    },
    {
      cabeca: {
        x: 0.0959,
        y: -0.6875
      },
      costas: {
        x: -0.1563,
        y: -0.3633
      },
      punho: {
        x: 0.1312,
        y: -0.3273,
        angulo: 0.5755
      }
    },
    {
      cabeca: {
        x: 0.1199,
        y: -0.6875
      },
      costas: {
        x: -0.1719,
        y: -0.3555
      },
      punho: {
        x: 0.1462,
        y: -0.3477,
        angulo: 0.3685
      }
    },
    {
      cabeca: {
        x: 0.0901,
        y: -0.6953
      },
      costas: {
        x: -0.125,
        y: -0.3711
      },
      punho: {
        x: 0.1445,
        y: -0.3154,
        angulo: 0.6235
      }
    }
  ],
  freia: [
    {
      cabeca: {
        x: 0.066,
        y: -0.6797
      },
      costas: {
        x: -0.1563,
        y: -0.3633
      },
      punho: {
        x: -0.1065,
        y: -0.329,
        angulo: 2.4771
      }
    },
    {
      cabeca: {
        x: -0.059,
        y: -0.6875
      },
      costas: {
        x: -0.1953,
        y: -0.3711
      },
      punho: {
        x: 0.0305,
        y: -0.3501,
        angulo: 1.1564
      }
    },
    {
      cabeca: {
        x: 0.0113,
        y: -0.6719
      },
      costas: {
        x: -0.1641,
        y: -0.3516
      },
      punho: {
        x: -0.1183,
        y: -0.2844,
        angulo: 2.3731
      }
    },
    {
      cabeca: {
        x: 0.0552,
        y: -0.6406
      },
      costas: {
        x: -0.1406,
        y: -0.3203
      },
      punho: {
        x: 0.0717,
        y: -0.255,
        angulo: 0.9659
      }
    },
    {
      cabeca: {
        x: 0.0401,
        y: -0.6953
      },
      costas: {
        x: -0.1094,
        y: -0.3711
      },
      punho: {
        x: -0.0748,
        y: -0.3001,
        angulo: 2.131
      }
    }
  ],
  gira: [
    {
      cabeca: {
        x: 0.0341,
        y: -0.6953
      },
      costas: {
        x: -0.0703,
        y: -0.3711
      },
      punho: {
        x: -0.0411,
        y: -0.3083,
        angulo: 1.9559
      }
    },
    {
      cabeca: {
        x: 0.0269,
        y: -0.6953
      },
      costas: {
        x: -0.1406,
        y: -0.3711
      },
      punho: {
        x: 0.0728,
        y: -0.3034,
        angulo: 0.9861
      }
    },
    {
      cabeca: {
        x: 0.0135,
        y: -0.6953
      },
      costas: {
        x: -0.1406,
        y: -0.3711
      },
      punho: {
        x: 0.096,
        y: -0.3001,
        angulo: 0.8933
      }
    },
    {
      cabeca: {
        x: -0.0018,
        y: -0.6953
      },
      costas: {
        x: -0.1484,
        y: -0.3711
      },
      punho: {
        x: -0.1201,
        y: -0.2978,
        angulo: 2.3333
      }
    },
    {
      cabeca: {
        x: -0.0259,
        y: -0.6953
      },
      costas: {
        x: -0.1094,
        y: -0.3711
      },
      punho: {
        x: -0.0781,
        y: -0.2982,
        angulo: 2.1434
      }
    },
    {
      cabeca: {
        x: -0.033,
        y: -0.6953
      },
      costas: {
        x: -0.0547,
        y: -0.3711
      },
      punho: {
        x: 0.04,
        y: -0.3092,
        angulo: 1.2224
      }
    }
  ],
  "arma_anda": [
    {
      cabeca: {
        x: 0.0164,
        y: -0.6875
      },
      costas: {
        x: -0.1563,
        y: -0.375
      },
      punho: {
        x: 0.106,
        y: -0.452,
        angulo: -0.2304
      }
    },
    {
      cabeca: {
        x: 0.0471,
        y: -0.6875
      },
      costas: {
        x: -0.125,
        y: -0.3828
      },
      punho: {
        x: 0.1073,
        y: -0.4521,
        angulo: -0.175
      }
    },
    {
      cabeca: {
        x: 0.0391,
        y: -0.6875
      },
      costas: {
        x: -0.2266,
        y: -0.375
      },
      punho: {
        x: 0.133,
        y: -0.4523,
        angulo: -0.1881
      }
    },
    {
      cabeca: {
        x: -0.0029,
        y: -0.6875
      },
      costas: {
        x: -0.1797,
        y: -0.3828
      },
      punho: {
        x: 0.096,
        y: -0.4551,
        angulo: -0.2248
      }
    },
    {
      cabeca: {
        x: 0.013,
        y: -0.6953
      },
      costas: {
        x: -0.0938,
        y: -0.3867
      },
      punho: {
        x: 0.0791,
        y: -0.4573,
        angulo: -0.2156
      }
    },
    {
      cabeca: {
        x: 0.0441,
        y: -0.6875
      },
      costas: {
        x: -0.2266,
        y: -0.375
      },
      punho: {
        x: 0.1314,
        y: -0.4523,
        angulo: -0.1902
      }
    },
    {
      cabeca: {
        x: 0.0427,
        y: -0.6875
      },
      costas: {
        x: -0.1484,
        y: -0.375
      },
      punho: {
        x: 0.1046,
        y: -0.4505,
        angulo: -0.2195
      }
    },
    {
      cabeca: {
        x: 0.0602,
        y: -0.6875
      },
      costas: {
        x: -0.1719,
        y: -0.375
      },
      punho: {
        x: 0.1213,
        y: -0.4498,
        angulo: -0.1856
      }
    },
    {
      cabeca: {
        x: 0.0601,
        y: -0.6875
      },
      costas: {
        x: -0.2031,
        y: -0.375
      },
      punho: {
        x: 0.1394,
        y: -0.4515,
        angulo: -0.1743
      }
    },
    {
      cabeca: {
        x: 0.0197,
        y: -0.6875
      },
      costas: {
        x: -0.2031,
        y: -0.375
      },
      punho: {
        x: 0.1057,
        y: -0.4522,
        angulo: -0.2323
      }
    }
  ],
  "arma_baixa": [
    {
      cabeca: {
        x: 0.0316,
        y: -0.6875
      },
      costas: {
        x: -0.125,
        y: -0.3711
      },
      punho: {
        x: 0.0753,
        y: -0.3266,
        angulo: 0.8891
      }
    },
    {
      cabeca: {
        x: 0.0398,
        y: -0.6875
      },
      costas: {
        x: -0.0938,
        y: -0.3711
      },
      punho: {
        x: 0.073,
        y: -0.3195,
        angulo: 0.9142
      }
    },
    {
      cabeca: {
        x: 0.0606,
        y: -0.6875
      },
      costas: {
        x: -0.0703,
        y: -0.3711
      },
      punho: {
        x: 0.0836,
        y: -0.3102,
        angulo: 0.9175
      }
    },
    {
      cabeca: {
        x: 0.0527,
        y: -0.6953
      },
      costas: {
        x: -0.0938,
        y: -0.3828
      },
      punho: {
        x: 0.0882,
        y: -0.3694,
        angulo: 0.586
      }
    },
    {
      cabeca: {
        x: 0.0393,
        y: -0.6875
      },
      costas: {
        x: -0.1094,
        y: -0.3711
      },
      punho: {
        x: 0.0814,
        y: -0.3284,
        angulo: 0.8406
      }
    },
    {
      cabeca: {
        x: 0.0358,
        y: -0.6797
      },
      costas: {
        x: -0.0938,
        y: -0.3633
      },
      punho: {
        x: 0.0742,
        y: -0.3228,
        angulo: 0.8543
      }
    },
    {
      cabeca: {
        x: 0.0558,
        y: -0.6797
      },
      costas: {
        x: -0.0703,
        y: -0.3633
      },
      punho: {
        x: 0.0762,
        y: -0.304,
        angulo: 0.9119
      }
    },
    {
      cabeca: {
        x: 0.0572,
        y: -0.6953
      },
      costas: {
        x: -0.0938,
        y: -0.3828
      },
      punho: {
        x: 0.0889,
        y: -0.3678,
        angulo: 0.5939
      }
    },
    {
      cabeca: {
        x: 0.0499,
        y: -0.6797
      },
      costas: {
        x: -0.0781,
        y: -0.3633
      },
      punho: {
        x: 0.0924,
        y: -0.3184,
        angulo: 0.7945
      }
    },
    {
      cabeca: {
        x: 0.0384,
        y: -0.6875
      },
      costas: {
        x: -0.1094,
        y: -0.3711
      },
      punho: {
        x: 0.065,
        y: -0.322,
        angulo: 0.9554
      }
    }
  ]
};
