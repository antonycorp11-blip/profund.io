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
        x: 0.0748,
        y: -0.245,
        angulo: 1.0959
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
        x: 0.0807,
        y: -0.25,
        angulo: 1.0923
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
        x: 0.0745,
        y: -0.2458,
        angulo: 1.1146
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
        x: 0.076,
        y: -0.2505,
        angulo: 1.115
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
        x: 0.0742,
        y: -0.2461,
        angulo: 1.0959
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
        x: 0.0823,
        y: -0.2458,
        angulo: 1.1143
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
        x: 0.0823,
        y: -0.2458,
        angulo: 1.076
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
        x: -0.1111,
        y: -0.2326,
        angulo: 2.1256
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
        x: 0.0732,
        y: -0.2515,
        angulo: 1.1068
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
        x: -0.0374,
        y: -0.253,
        angulo: 1.7697
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
        x: 0.1094,
        y: -0.2964,
        angulo: 0.8439
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
        x: 0.0401,
        y: -0.253,
        angulo: 1.312
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
        x: -0.119,
        y: -0.2867,
        angulo: 2.2371
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
        x: 0.1152,
        y: -0.2943,
        angulo: 0.7816
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
        x: 0.0982,
        y: -0.2576,
        angulo: 1.0255
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
        x: 0.1016,
        y: -0.2594,
        angulo: 1.0051
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
        x: -0.0614,
        y: -0.2536,
        angulo: 1.9255
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
        x: 0.0708,
        y: -0.2523,
        angulo: 1.184
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
        x: -0.0613,
        y: -0.2549,
        angulo: 1.9068
      }
    },
    {
      cabeca: {
        x: 0.1165,
        y: -0.5781
      },
      costas: {
        x: -0.2109,
        y: -0.2773
      },
      punho: {
        x: -0.1777,
        y: -0.3201,
        angulo: -3.1201
      }
    },
    {
      cabeca: {
        x: 0.0655,
        y: -0.8359
      },
      costas: {
        x: -0.0781,
        y: -0.418
      },
      punho: null
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
        x: -0.1026,
        y: -0.3077,
        angulo: 2.3262
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
        x: 0.1162,
        y: -0.3311,
        angulo: -0.0088
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
        x: 0.1192,
        y: -0.2463,
        angulo: 0.1247
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
        x: 0.0394,
        y: -0.5156
      },
      costas: {
        x: -0.1797,
        y: -0.2344
      },
      punho: {
        x: 0.138,
        y: -0.2637,
        angulo: 0.0323
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
        x: -0.0831,
        y: -0.2592,
        angulo: 2.0302
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
        x: 0.142,
        y: -0.2697,
        angulo: 0.0373
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
        x: 0.0728,
        y: -0.5259,
        angulo: -0.2201
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
        x: 0.1797,
        y: -0.2332,
        angulo: 0.514
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
        x: 0.0849,
        y: -0.1005,
        angulo: 0.9831
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
        x: 0.1668,
        y: -0.2741,
        angulo: 0.2858
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
        x: 0.1049,
        y: -0.2474,
        angulo: 0.1965
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
        x: 0.0104,
        y: -0.4695,
        angulo: -1.1187
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
        x: -0.0109,
        y: -0.3175,
        angulo: 1.6598
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
        x: 0.1299,
        y: -0.4629,
        angulo: -0.5272
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
        x: 0.0216,
        y: -0.4792,
        angulo: -0.629
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
        x: 0.01,
        y: -0.3256,
        angulo: 1.4969
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
        x: 0.1336,
        y: -0.4647,
        angulo: -0.5378
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
        x: 0.0285,
        y: -0.473,
        angulo: -0.4108
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
        x: 0.0227,
        y: -0.4785,
        angulo: -0.6684
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
        x: 0.1664,
        y: -0.4481,
        angulo: -0.1708
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
        x: 0.1664,
        y: -0.4481,
        angulo: -0.1708
      }
    },
    {
      cabeca: {
        x: -0.0412,
        y: -0.6953
      },
      costas: {
        x: -0.1563,
        y: -0.3711
      },
      punho: {
        x: 0.1502,
        y: -0.5855,
        angulo: -0.8358
      }
    },
    {
      cabeca: {
        x: -0.0412,
        y: -0.6953
      },
      costas: {
        x: -0.1563,
        y: -0.3711
      },
      punho: {
        x: 0.1502,
        y: -0.5855,
        angulo: -0.8358
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
        x: 0.1553,
        y: -0.2886,
        angulo: 0.7123
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
        x: 0.1553,
        y: -0.2886,
        angulo: 0.7123
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
        x: 0.1669,
        y: -0.3025,
        angulo: 0.6112
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
        x: 0.1683,
        y: -0.4222,
        angulo: -0.0564
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
        x: 0.181,
        y: -0.4297,
        angulo: -0.0557
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
        x: 0.1868,
        y: -0.4237,
        angulo: -0.0942
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
        x: -0.0795,
        y: -0.2524,
        angulo: 1.9809
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
        x: 0.1543,
        y: -0.3465,
        angulo: 0.3577
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
        x: -0.1297,
        y: -0.2888,
        angulo: 2.38
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
        x: 0.0813,
        y: -0.3255,
        angulo: 0.8569
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
        x: -0.1123,
        y: -0.2428,
        angulo: 2.1947
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
        x: -0.0778,
        y: -0.2554,
        angulo: 2.0139
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
        x: -0.0328,
        y: -0.2625,
        angulo: 1.8007
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
        x: 0.0835,
        y: -0.2728,
        angulo: 1.0328
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
        x: 0.1038,
        y: -0.2656,
        angulo: 0.977
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
        x: -0.1226,
        y: -0.2659,
        angulo: 2.2292
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
        x: -0.0855,
        y: -0.2711,
        angulo: 2.0939
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
        x: 0.0328,
        y: -0.2625,
        angulo: 1.3646
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
        x: 0.1559,
        y: -0.4567,
        angulo: -0.1881
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
        x: 0.1293,
        y: -0.4535,
        angulo: -0.1564
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
        x: 0.1842,
        y: -0.4568,
        angulo: -0.1611
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
        x: 0.1458,
        y: -0.4594,
        angulo: -0.1786
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
        x: 0.0996,
        y: -0.4582,
        angulo: -0.1808
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
        x: 0.1786,
        y: -0.4576,
        angulo: -0.1701
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
        x: 0.1224,
        y: -0.4513,
        angulo: -0.1955
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
        x: 0.146,
        y: -0.4511,
        angulo: -0.1641
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
        x: 0.181,
        y: -0.4557,
        angulo: -0.1581
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
        x: 0.1558,
        y: -0.4576,
        angulo: -0.1941
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
        x: 0.0854,
        y: -0.3164,
        angulo: 0.8785
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
        x: 0.0807,
        y: -0.3092,
        angulo: 0.9156
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
        x: 0.0842,
        y: -0.3082,
        angulo: 0.9228
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
        x: 0.0938,
        y: -0.3672,
        angulo: 0.5758
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
        x: 0.0949,
        y: -0.317,
        angulo: 0.8236
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
        x: 0.0826,
        y: -0.3142,
        angulo: 0.8493
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
        x: 0.0773,
        y: -0.3,
        angulo: 0.9229
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
        x: 0.1016,
        y: -0.3094,
        angulo: 0.793
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
        x: 0.0709,
        y: -0.3131,
        angulo: 0.9574
      }
    }
  ]
};
