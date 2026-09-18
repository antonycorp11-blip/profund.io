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
        x: 0.0255,
        y: -0.6875
      },
      costas: {
        x: -0.2188,
        y: -0.332
      },
      punho: null
    },
    {
      cabeca: {
        x: 0.0111,
        y: -0.7109
      },
      costas: {
        x: -0.2266,
        y: -0.3438
      },
      punho: null
    },
    {
      cabeca: {
        x: 0.0306,
        y: -0.7188
      },
      costas: {
        x: -0.2109,
        y: -0.3438
      },
      punho: null
    },
    {
      cabeca: {
        x: 0.0233,
        y: -0.7031
      },
      costas: {
        x: -0.2188,
        y: -0.3398
      },
      punho: null
    },
    {
      cabeca: {
        x: 0.0252,
        y: -0.7109
      },
      costas: {
        x: -0.2188,
        y: -0.3398
      },
      punho: null
    },
    {
      cabeca: {
        x: 0.02,
        y: -0.7031
      },
      costas: {
        x: -0.2188,
        y: -0.3398
      },
      punho: null
    },
    {
      cabeca: {
        x: 0.0272,
        y: -0.6953
      },
      costas: {
        x: -0.2188,
        y: -0.3398
      },
      punho: null
    },
    {
      cabeca: {
        x: 0.0264,
        y: -0.6953
      },
      costas: {
        x: -0.2188,
        y: -0.3398
      },
      punho: null
    }
  ],
  walk: [
    {
      cabeca: {
        x: -0.045,
        y: -0.6797
      },
      costas: {
        x: -0.1719,
        y: -0.3281
      },
      punho: {
        x: 0.0953,
        y: -0.2922,
        angulo: 0.8066
      }
    },
    {
      cabeca: {
        x: -0.0557,
        y: -0.6797
      },
      costas: {
        x: -0.1641,
        y: -0.3281
      },
      punho: {
        x: 0.0892,
        y: -0.3281,
        angulo: 0.5304
      }
    },
    {
      cabeca: {
        x: -0.0473,
        y: -0.6953
      },
      costas: {
        x: -0.1719,
        y: -0.332
      },
      punho: {
        x: 0.0887,
        y: -0.3419,
        angulo: 0.4823
      }
    },
    {
      cabeca: {
        x: -0.0542,
        y: -0.6953
      },
      costas: {
        x: -0.1641,
        y: -0.332
      },
      punho: {
        x: 0.0829,
        y: -0.3275,
        angulo: 0.6446
      }
    },
    {
      cabeca: {
        x: -0.0281,
        y: -0.6797
      },
      costas: {
        x: -0.1406,
        y: -0.332
      },
      punho: {
        x: 0.1012,
        y: -0.3318,
        angulo: 0.6722
      }
    },
    {
      cabeca: {
        x: -0.0654,
        y: -0.6797
      },
      costas: {
        x: -0.1719,
        y: -0.3203
      },
      punho: {
        x: 0.048,
        y: -0.3119,
        angulo: 0.7905
      }
    },
    {
      cabeca: {
        x: -0.0506,
        y: -0.6875
      },
      costas: {
        x: -0.1641,
        y: -0.3281
      },
      punho: {
        x: 0.0816,
        y: -0.3336,
        angulo: 0.5184
      }
    },
    {
      cabeca: {
        x: -0.0651,
        y: -0.6797
      },
      costas: {
        x: -0.1797,
        y: -0.3281
      },
      punho: {
        x: 0.0781,
        y: -0.293,
        angulo: 0.812
      }
    }
  ],
  jump: [
    {
      cabeca: {
        x: 0.1436,
        y: -0.4609
      },
      costas: {
        x: -0.1406,
        y: -0.1758
      },
      punho: {
        x: 0.0479,
        y: -0.2803,
        angulo: -1.7499
      }
    },
    {
      cabeca: {
        x: 0.168,
        y: -0.5703
      },
      costas: {
        x: -0.125,
        y: -0.2656
      },
      punho: {
        x: -0.0207,
        y: -0.3028,
        angulo: -3.1382
      }
    },
    {
      cabeca: {
        x: 0.1337,
        y: -0.5469
      },
      costas: {
        x: -0.1484,
        y: -0.25
      },
      punho: {
        x: 0.0391,
        y: -0.3672,
        angulo: -1.7073
      }
    },
    {
      cabeca: {
        x: 0.0903,
        y: -0.5859
      },
      costas: {
        x: -0.1875,
        y: -0.2734
      },
      punho: null
    },
    {
      cabeca: {
        x: 0.1162,
        y: -0.5781
      },
      costas: {
        x: -0.1641,
        y: -0.2656
      },
      punho: {
        x: 0.1358,
        y: -0.2794,
        angulo: 0.2251
      }
    },
    {
      cabeca: {
        x: 0.0373,
        y: -0.6094
      },
      costas: {
        x: -0.2422,
        y: -0.2969
      },
      punho: {
        x: 0.0447,
        y: -0.2841,
        angulo: 0.5227
      }
    },
    {
      cabeca: {
        x: 0.0805,
        y: -0.5391
      },
      costas: {
        x: -0.1953,
        y: -0.2422
      },
      punho: {
        x: 0.1317,
        y: -0.5045,
        angulo: -1.0627
      }
    },
    {
      cabeca: {
        x: 0.0615,
        y: -0.6016
      },
      costas: {
        x: -0.1563,
        y: -0.2891
      },
      punho: {
        x: -0.0518,
        y: -0.2771,
        angulo: 2.4476
      }
    }
  ],
  mine: [
    {
      cabeca: {
        x: 0.0215,
        y: -0.6016
      },
      costas: {
        x: -0.1875,
        y: -0.2891
      },
      punho: {
        x: -0.066,
        y: -0.4193,
        angulo: -2.1482
      }
    },
    {
      cabeca: {
        x: 0.0909,
        y: -0.6016
      },
      costas: {
        x: -0.1563,
        y: -0.2969
      },
      punho: {
        x: -0.0109,
        y: -0.3724,
        angulo: -1.5464
      }
    },
    {
      cabeca: {
        x: -0.0266,
        y: -0.6328
      },
      costas: {
        x: -0.1484,
        y: -0.2539
      },
      punho: {
        x: 0.0763,
        y: -0.4185,
        angulo: -0.9547
      }
    },
    {
      cabeca: {
        x: 0.0055,
        y: -0.5703
      },
      costas: {
        x: -0.2422,
        y: -0.2617
      },
      punho: {
        x: -0.0729,
        y: -0.4167,
        angulo: -2.0389
      }
    },
    {
      cabeca: {
        x: 0.0142,
        y: -0.5313
      },
      costas: {
        x: -0.1719,
        y: -0.1563
      },
      punho: {
        x: 0.1328,
        y: -0.4937,
        angulo: -1.1718
      }
    },
    {
      cabeca: {
        x: 0.0942,
        y: -0.5156
      },
      costas: {
        x: -0.2422,
        y: -0.1563
      },
      punho: {
        x: 0.1541,
        y: -0.3239,
        angulo: -0.7681
      }
    },
    {
      cabeca: {
        x: 0.0651,
        y: -0.5703
      },
      costas: {
        x: -0.1484,
        y: -0.2773
      },
      punho: {
        x: 0.085,
        y: -0.3271,
        angulo: -0.085
      }
    },
    {
      cabeca: {
        x: 0.0154,
        y: -0.6016
      },
      costas: {
        x: -0.1875,
        y: -0.2891
      },
      punho: {
        x: -0.0703,
        y: -0.4219,
        angulo: -2.1385
      }
    }
  ],
  climb: [
    {
      cabeca: {
        x: 0.0316,
        y: -0.7266
      },
      costas: {
        x: -0.1875,
        y: -0.375
      },
      punho: {
        x: 0.0729,
        y: -0.6615,
        angulo: -1.2402
      }
    },
    {
      cabeca: {
        x: 0.0442,
        y: -0.7266
      },
      costas: {
        x: -0.1797,
        y: -0.3711
      },
      punho: {
        x: 0.125,
        y: -0.5313,
        angulo: -0.7792
      }
    },
    {
      cabeca: {
        x: 0.015,
        y: -0.7188
      },
      costas: {
        x: -0.2031,
        y: -0.3633
      },
      punho: {
        x: 0.0763,
        y: -0.4517,
        angulo: -0.3887
      }
    },
    {
      cabeca: {
        x: 0.005,
        y: -0.7344
      },
      costas: {
        x: -0.2109,
        y: -0.3828
      },
      punho: {
        x: 0.0932,
        y: -0.5441,
        angulo: -0.7775
      }
    },
    {
      cabeca: {
        x: 0.0366,
        y: -0.7188
      },
      costas: {
        x: -0.1797,
        y: -0.3633
      },
      punho: {
        x: 0.1217,
        y: -0.4688,
        angulo: -0.4726
      }
    },
    {
      cabeca: {
        x: 0.0211,
        y: -0.7344
      },
      costas: {
        x: -0.1953,
        y: -0.375
      },
      punho: {
        x: 0.1029,
        y: -0.5179,
        angulo: -0.6914
      }
    },
    {
      cabeca: {
        x: 0.0351,
        y: -0.7344
      },
      costas: {
        x: -0.1875,
        y: -0.3711
      },
      punho: {
        x: 0.1047,
        y: -0.6875,
        angulo: -1.186
      }
    },
    {
      cabeca: {
        x: 0.027,
        y: -0.7266
      },
      costas: {
        x: -0.1875,
        y: -0.3711
      },
      punho: {
        x: 0.1232,
        y: -0.6394,
        angulo: -1.047
      }
    }
  ],
  aim: [
    {
      cabeca: {
        x: 0.0523,
        y: -0.6953
      },
      costas: {
        x: -0.1875,
        y: -0.332
      },
      punho: {
        x: 0.1074,
        y: -0.402,
        angulo: -0.2784
      }
    },
    {
      cabeca: {
        x: 0.0292,
        y: -0.6953
      },
      costas: {
        x: -0.1875,
        y: -0.2852
      },
      punho: {
        x: 0.0794,
        y: -0.5078,
        angulo: -1.2946
      }
    },
    {
      cabeca: {
        x: 0.0525,
        y: -0.6953
      },
      costas: {
        x: -0.1797,
        y: -0.2852
      },
      punho: {
        x: 0.0719,
        y: -0.5328,
        angulo: -1.4332
      }
    },
    {
      cabeca: {
        x: 0.0444,
        y: -0.6953
      },
      costas: {
        x: -0.1797,
        y: -0.2852
      },
      punho: {
        x: -0.0376,
        y: -0.3366,
        angulo: -2.979
      }
    },
    {
      cabeca: {
        x: 0.0339,
        y: -0.6953
      },
      costas: {
        x: -0.1797,
        y: -0.2344
      },
      punho: {
        x: 0.0732,
        y: -0.5192,
        angulo: -1.3746
      }
    },
    {
      cabeca: {
        x: 0.06,
        y: -0.6953
      },
      costas: {
        x: -0.1797,
        y: -0.332
      },
      punho: {
        x: 0.104,
        y: -0.3215,
        angulo: 0.6198
      }
    },
    {
      cabeca: {
        x: 0.0522,
        y: -0.6953
      },
      costas: {
        x: -0.1797,
        y: -0.332
      },
      punho: {
        x: 0.0201,
        y: -0.4007,
        angulo: -0.8218
      }
    },
    {
      cabeca: {
        x: 0.0356,
        y: -0.6953
      },
      costas: {
        x: -0.1797,
        y: -0.2852
      },
      punho: {
        x: 0.0904,
        y: -0.4901,
        angulo: -1.2499
      }
    },
    {
      cabeca: {
        x: 0.0312,
        y: -0.6953
      },
      costas: {
        x: -0.1875,
        y: -0.2852
      },
      punho: {
        x: 0.0703,
        y: -0.5165,
        angulo: -1.3511
      }
    },
    {
      cabeca: {
        x: 0.0463,
        y: -0.6953
      },
      costas: {
        x: -0.1797,
        y: -0.332
      },
      punho: {
        x: 0.1075,
        y: -0.4025,
        angulo: -0.2985
      }
    }
  ]
};
