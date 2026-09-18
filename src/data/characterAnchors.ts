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
        x: 0.0474,
        y: -0.6953
      },
      costas: {
        x: -0.1172,
        y: -0.3633
      },
      punho: {
        x: 0.0907,
        y: -0.262,
        angulo: 1.0474
      }
    },
    {
      cabeca: {
        x: 0.0474,
        y: -0.6875
      },
      costas: {
        x: -0.1172,
        y: -0.3633
      },
      punho: {
        x: 0.0892,
        y: -0.2679,
        angulo: 1.0791
      }
    },
    {
      cabeca: {
        x: 0.0473,
        y: -0.6875
      },
      costas: {
        x: -0.1172,
        y: -0.3633
      },
      punho: {
        x: 0.0882,
        y: -0.2612,
        angulo: 1.0433
      }
    },
    {
      cabeca: {
        x: 0.0481,
        y: -0.6953
      },
      costas: {
        x: -0.1172,
        y: -0.3633
      },
      punho: {
        x: 0.0904,
        y: -0.2612,
        angulo: 1.0516
      }
    },
    {
      cabeca: {
        x: 0.0495,
        y: -0.6875
      },
      costas: {
        x: -0.125,
        y: -0.3633
      },
      punho: {
        x: 0.0904,
        y: -0.2645,
        angulo: 1.0224
      }
    },
    {
      cabeca: {
        x: 0.0482,
        y: -0.6875
      },
      costas: {
        x: -0.125,
        y: -0.3633
      },
      punho: {
        x: 0.0896,
        y: -0.2604,
        angulo: 1.0578
      }
    },
    {
      cabeca: {
        x: 0.0522,
        y: -0.6875
      },
      costas: {
        x: -0.1172,
        y: -0.3633
      },
      punho: {
        x: 0.0977,
        y: -0.2612,
        angulo: 1.0351
      }
    },
    {
      cabeca: {
        x: 0.0476,
        y: -0.6875
      },
      costas: {
        x: -0.1172,
        y: -0.3633
      },
      punho: {
        x: 0.0971,
        y: -0.2606,
        angulo: 1.0205
      }
    }
  ],
  walk: [
    {
      cabeca: {
        x: 0.0685,
        y: -0.7188
      },
      costas: {
        x: -0.1875,
        y: -0.375
      },
      punho: {
        x: -0.1545,
        y: -0.2769,
        angulo: 2.3604
      }
    },
    {
      cabeca: {
        x: 0.0599,
        y: -0.7031
      },
      costas: {
        x: -0.125,
        y: -0.375
      },
      punho: {
        x: 0.0714,
        y: -0.2997,
        angulo: 1.0571
      }
    },
    {
      cabeca: {
        x: 0.0694,
        y: -0.7266
      },
      costas: {
        x: -0.125,
        y: -0.3867
      },
      punho: {
        x: 0.0938,
        y: -0.3069,
        angulo: 0.9604
      }
    },
    {
      cabeca: {
        x: 0.0618,
        y: -0.7266
      },
      costas: {
        x: -0.1328,
        y: -0.3867
      },
      punho: {
        x: -0.1019,
        y: -0.3003,
        angulo: 2.1005
      }
    },
    {
      cabeca: {
        x: 0.077,
        y: -0.7031
      },
      costas: {
        x: -0.1719,
        y: -0.375
      },
      punho: {
        x: -0.1325,
        y: -0.2753,
        angulo: 2.2614
      }
    },
    {
      cabeca: {
        x: 0.0653,
        y: -0.7031
      },
      costas: {
        x: -0.1328,
        y: -0.375
      },
      punho: {
        x: 0.0807,
        y: -0.3026,
        angulo: 0.9494
      }
    },
    {
      cabeca: {
        x: 0.0681,
        y: -0.7188
      },
      costas: {
        x: -0.1172,
        y: -0.3867
      },
      punho: {
        x: 0.0725,
        y: -0.3058,
        angulo: 1.0132
      }
    },
    {
      cabeca: {
        x: 0.0534,
        y: -0.7266
      },
      costas: {
        x: -0.1406,
        y: -0.3945
      },
      punho: {
        x: -0.1181,
        y: -0.3026,
        angulo: 2.3034
      }
    }
  ],
  run: [
    {
      cabeca: {
        x: 0.0972,
        y: -0.7344
      },
      costas: {
        x: -0.2422,
        y: -0.3945
      },
      punho: {
        x: 0.2125,
        y: -0.4391,
        angulo: 0.0315
      }
    },
    {
      cabeca: {
        x: 0.1133,
        y: -0.7344
      },
      costas: {
        x: -0.1172,
        y: -0.3867
      },
      punho: {
        x: 0.1024,
        y: -0.3244,
        angulo: 0.7134
      }
    },
    {
      cabeca: {
        x: 0.0966,
        y: -0.7422
      },
      costas: {
        x: -0.1328,
        y: -0.4063
      },
      punho: {
        x: 0.206,
        y: -0.4304,
        angulo: 0.1333
      }
    },
    {
      cabeca: {
        x: 0.099,
        y: -0.6875
      },
      costas: {
        x: -0.1172,
        y: -0.3945
      },
      punho: {
        x: 0.1847,
        y: -0.3993,
        angulo: 0.2061
      }
    },
    {
      cabeca: {
        x: 0.1306,
        y: -0.7188
      },
      costas: {
        x: -0.2188,
        y: -0.3828
      },
      punho: {
        x: 0.2154,
        y: -0.4408,
        angulo: -0.0352
      }
    },
    {
      cabeca: {
        x: 0.0768,
        y: -0.7422
      },
      costas: {
        x: -0.25,
        y: -0.3984
      },
      punho: {
        x: 0.169,
        y: -0.4183,
        angulo: 0.1857
      }
    },
    {
      cabeca: {
        x: 0.0969,
        y: -0.7266
      },
      costas: {
        x: -0.1172,
        y: -0.3945
      },
      punho: {
        x: 0.0928,
        y: -0.3241,
        angulo: 0.8656
      }
    },
    {
      cabeca: {
        x: 0.0725,
        y: -0.6641
      },
      costas: {
        x: -0.1641,
        y: -0.3711
      },
      punho: {
        x: 0.1468,
        y: -0.3663,
        angulo: 0.3443
      }
    }
  ],
  jump: [
    {
      cabeca: {
        x: 0.0494,
        y: -0.7344
      },
      costas: {
        x: -0.1328,
        y: -0.3945
      },
      punho: {
        x: 0.0889,
        y: -0.2885,
        angulo: 1.0432
      }
    },
    {
      cabeca: {
        x: 0.1326,
        y: -0.5469
      },
      costas: {
        x: -0.2578,
        y: -0.2344
      },
      punho: {
        x: -0.1742,
        y: -0.3656,
        angulo: -2.5904
      }
    },
    {
      cabeca: {
        x: 0.0702,
        y: -0.7813
      },
      costas: {
        x: -0.0859,
        y: -0.4063
      },
      punho: {
        x: -0.0197,
        y: -0.7659,
        angulo: -1.6609
      }
    },
    {
      cabeca: {
        x: 0.109,
        y: -0.6484
      },
      costas: {
        x: -0.1719,
        y: -0.3398
      },
      punho: {
        x: 0.099,
        y: -0.2962,
        angulo: 0.7364
      }
    },
    {
      cabeca: {
        x: 0.0444,
        y: -0.6016
      },
      costas: {
        x: -0.2109,
        y: -0.3164
      },
      punho: {
        x: 0.224,
        y: -0.3498,
        angulo: 0.0368
      }
    },
    {
      cabeca: {
        x: 0.0496,
        y: -0.7734
      },
      costas: {
        x: -0.2031,
        y: -0.4219
      },
      punho: {
        x: 0.1289,
        y: -0.3601,
        angulo: 0.715
      }
    },
    {
      cabeca: {
        x: 0.0932,
        y: -0.5469
      },
      costas: {
        x: -0.2188,
        y: -0.2422
      },
      punho: {
        x: 0.2031,
        y: -0.2422,
        angulo: 0.1602
      }
    },
    {
      cabeca: {
        x: 0.0769,
        y: -0.7578
      },
      costas: {
        x: -0.1484,
        y: -0.4063
      },
      punho: {
        x: 0.0966,
        y: -0.2981,
        angulo: 1.0706
      }
    }
  ],
  mine: [
    {
      cabeca: {
        x: 0.1187,
        y: -0.5
      },
      costas: {
        x: -0.125,
        y: -0.2969
      },
      punho: {
        x: -0.0391,
        y: -0.5859,
        angulo: -1.7877
      }
    },
    {
      cabeca: {
        x: 0.0196,
        y: -0.7813
      },
      costas: {
        x: -0.1875,
        y: -0.4648
      },
      punho: {
        x: -0.0095,
        y: -0.5651,
        angulo: -2.1846
      }
    },
    {
      cabeca: {
        x: 0.0665,
        y: -0.8047
      },
      costas: {
        x: -0.1953,
        y: -0.4609
      },
      punho: {
        x: -0.0916,
        y: -0.7659,
        angulo: -1.9584
      }
    },
    {
      cabeca: {
        x: 0.0387,
        y: -0.6953
      },
      costas: {
        x: -0.2266,
        y: -0.1797
      },
      punho: {
        x: 0.0534,
        y: -0.5028,
        angulo: -1.3545
      }
    },
    {
      cabeca: {
        x: 0.0107,
        y: -0.5859
      },
      costas: {
        x: -0.2656,
        y: -0.1094
      },
      punho: {
        x: -0.0067,
        y: -0.3538,
        angulo: -1.651
      }
    },
    {
      cabeca: {
        x: 0.0237,
        y: -0.6953
      },
      costas: {
        x: -0.125,
        y: -0.3828
      },
      punho: {
        x: 0.2206,
        y: -0.3729,
        angulo: 0.2497
      }
    },
    {
      cabeca: {
        x: 0.1336,
        y: -0.5391
      },
      costas: {
        x: -0.1328,
        y: -0.3203
      },
      punho: {
        x: 0.0629,
        y: -0.596,
        angulo: -1.2592
      }
    },
    {
      cabeca: {
        x: 0.1213,
        y: -0.5
      },
      costas: {
        x: -0.1172,
        y: -0.2969
      },
      punho: {
        x: 0.0654,
        y: -0.5957,
        angulo: -1.3807
      }
    }
  ],
  climb: [
    {
      cabeca: {
        x: 0.0515,
        y: -0.7578
      },
      costas: {
        x: -0.1016,
        y: -0.2227
      },
      punho: {
        x: 0.1243,
        y: -0.7308,
        angulo: -1.2927
      }
    },
    {
      cabeca: {
        x: 0.0004,
        y: -0.6719
      },
      costas: {
        x: -0.1641,
        y: -0.3555
      },
      punho: {
        x: 0.082,
        y: -0.6484,
        angulo: -1.245
      }
    },
    {
      cabeca: {
        x: 0.059,
        y: -0.7578
      },
      costas: {
        x: -0.0938,
        y: -0.2227
      },
      punho: {
        x: 0.0996,
        y: -0.7334,
        angulo: -1.3658
      }
    },
    {
      cabeca: {
        x: 0.0144,
        y: -0.7422
      },
      costas: {
        x: -0.1484,
        y: -0.3633
      },
      punho: {
        x: 0.0905,
        y: -0.6699,
        angulo: -1.1798
      }
    },
    {
      cabeca: {
        x: 0.0535,
        y: -0.7813
      },
      costas: {
        x: -0.1172,
        y: -0.2734
      },
      punho: {
        x: 0.1083,
        y: -0.7578,
        angulo: -1.3588
      }
    },
    {
      cabeca: {
        x: 0.0419,
        y: -0.7578
      },
      costas: {
        x: -0.1016,
        y: -0.2227
      },
      punho: {
        x: 0.0962,
        y: -0.735,
        angulo: -1.3655
      }
    },
    {
      cabeca: {
        x: 0.012,
        y: -0.6641
      },
      costas: {
        x: -0.1484,
        y: -0.3516
      },
      punho: {
        x: 0.1265,
        y: -0.6992,
        angulo: -1.1724
      }
    },
    {
      cabeca: {
        x: 0.0375,
        y: -0.7344
      },
      costas: {
        x: -0.1094,
        y: -0.1953
      },
      punho: {
        x: 0.1102,
        y: -0.7164,
        angulo: -1.3153
      }
    }
  ],
  aim: [
    {
      cabeca: {
        x: 0.0186,
        y: -0.6406
      },
      costas: {
        x: -0.1484,
        y: -0.3203
      },
      punho: {
        x: 0.2607,
        y: -0.3903,
        angulo: -0.1352
      }
    },
    {
      cabeca: {
        x: 0.0191,
        y: -0.6406
      },
      costas: {
        x: -0.1484,
        y: -0.3203
      },
      punho: {
        x: 0.2607,
        y: -0.3903,
        angulo: -0.1352
      }
    },
    {
      cabeca: {
        x: 0.0144,
        y: -0.6406
      },
      costas: {
        x: -0.1406,
        y: -0.3203
      },
      punho: {
        x: 0.2585,
        y: -0.5241,
        angulo: -0.6839
      }
    },
    {
      cabeca: {
        x: 0.0089,
        y: -0.6484
      },
      costas: {
        x: -0.1484,
        y: -0.3281
      },
      punho: {
        x: 0.2377,
        y: -0.551,
        angulo: -0.7873
      }
    },
    {
      cabeca: {
        x: 0.0279,
        y: -0.6328
      },
      costas: {
        x: -0.1172,
        y: -0.3203
      },
      punho: {
        x: 0.208,
        y: -0.2349,
        angulo: 0.689
      }
    },
    {
      cabeca: {
        x: 0.0323,
        y: -0.6406
      },
      costas: {
        x: -0.1172,
        y: -0.3203
      },
      punho: {
        x: 0.2209,
        y: -0.2455,
        angulo: 0.621
      }
    },
    {
      cabeca: {
        x: 0.0081,
        y: -0.6484
      },
      costas: {
        x: -0.1641,
        y: -0.3281
      },
      punho: {
        x: 0.1731,
        y: -0.4733,
        angulo: -0.5749
      }
    },
    {
      cabeca: {
        x: 0.0194,
        y: -0.6484
      },
      costas: {
        x: -0.1484,
        y: -0.3203
      },
      punho: {
        x: 0.2622,
        y: -0.3884,
        angulo: -0.1248
      }
    },
    {
      cabeca: {
        x: 0.0457,
        y: -0.7188
      },
      costas: {
        x: -0.1328,
        y: -0.3867
      },
      punho: {
        x: 0.2065,
        y: -0.4583,
        angulo: -0.0825
      }
    },
    {
      cabeca: {
        x: 0.049,
        y: -0.7109
      },
      costas: {
        x: -0.1172,
        y: -0.3828
      },
      punho: {
        x: 0.1991,
        y: -0.4498,
        angulo: -0.0777
      }
    }
  ],
  "arma_baixa": [
    {
      cabeca: {
        x: 0.0612,
        y: -0.6797
      },
      costas: {
        x: -0.1172,
        y: -0.3516
      },
      punho: {
        x: -0.0885,
        y: -0.2324,
        angulo: 2.0775
      }
    },
    {
      cabeca: {
        x: 0.0634,
        y: -0.6563
      },
      costas: {
        x: -0.1016,
        y: -0.3398
      },
      punho: {
        x: -0.0545,
        y: -0.2043,
        angulo: 1.8635
      }
    },
    {
      cabeca: {
        x: 0.0653,
        y: -0.6719
      },
      costas: {
        x: -0.1094,
        y: -0.3438
      },
      punho: {
        x: 0.0925,
        y: -0.2566,
        angulo: 0.9708
      }
    },
    {
      cabeca: {
        x: 0.0649,
        y: -0.6797
      },
      costas: {
        x: -0.125,
        y: -0.3555
      },
      punho: {
        x: -0.0978,
        y: -0.2433,
        angulo: 2.0203
      }
    },
    {
      cabeca: {
        x: 0.0695,
        y: -0.6563
      },
      costas: {
        x: -0.0938,
        y: -0.332
      },
      punho: {
        x: -0.0545,
        y: -0.2043,
        angulo: 1.7906
      }
    },
    {
      cabeca: {
        x: 0.0695,
        y: -0.6563
      },
      costas: {
        x: -0.0938,
        y: -0.3398
      },
      punho: {
        x: 0.0755,
        y: -0.2331,
        angulo: 1.0691
      }
    },
    {
      cabeca: {
        x: 0.0698,
        y: -0.6563
      },
      costas: {
        x: -0.0938,
        y: -0.3398
      },
      punho: {
        x: 0.0792,
        y: -0.2511,
        angulo: 0.8984
      }
    },
    {
      cabeca: {
        x: 0.0587,
        y: -0.6719
      },
      costas: {
        x: -0.1016,
        y: -0.3555
      },
      punho: {
        x: -0.066,
        y: -0.2306,
        angulo: 1.8715
      }
    }
  ],
  "arma_anda": [
    {
      cabeca: {
        x: 0.0457,
        y: -0.7188
      },
      costas: {
        x: -0.1328,
        y: -0.3867
      },
      punho: {
        x: 0.2065,
        y: -0.4583,
        angulo: -0.0825
      }
    },
    {
      cabeca: {
        x: 0.0503,
        y: -0.7109
      },
      costas: {
        x: -0.125,
        y: -0.3828
      },
      punho: {
        x: 0.2075,
        y: -0.4714,
        angulo: -0.1757
      }
    },
    {
      cabeca: {
        x: 0.0436,
        y: -0.7188
      },
      costas: {
        x: -0.125,
        y: -0.3945
      },
      punho: {
        x: 0.193,
        y: -0.4859,
        angulo: -0.2315
      }
    },
    {
      cabeca: {
        x: 0.0475,
        y: -0.7344
      },
      costas: {
        x: -0.1484,
        y: -0.3945
      },
      punho: {
        x: 0.2135,
        y: -0.4948,
        angulo: -0.2288
      }
    },
    {
      cabeca: {
        x: 0.049,
        y: -0.7109
      },
      costas: {
        x: -0.1172,
        y: -0.3828
      },
      punho: {
        x: 0.1991,
        y: -0.4498,
        angulo: -0.0777
      }
    },
    {
      cabeca: {
        x: 0.0519,
        y: -0.7266
      },
      costas: {
        x: -0.1328,
        y: -0.3867
      },
      punho: {
        x: 0.199,
        y: -0.4798,
        angulo: -0.1965
      }
    },
    {
      cabeca: {
        x: 0.0357,
        y: -0.7188
      },
      costas: {
        x: -0.1172,
        y: -0.3867
      },
      punho: {
        x: 0.1953,
        y: -0.45,
        angulo: -0.0464
      }
    },
    {
      cabeca: {
        x: 0.052,
        y: -0.7344
      },
      costas: {
        x: -0.1406,
        y: -0.3945
      },
      punho: {
        x: 0.2124,
        y: -0.473,
        angulo: -0.1296
      }
    }
  ]
};
