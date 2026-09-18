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
        y: -0.5371
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
        y: -0.582
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
        y: -0.5918
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
        y: -0.5449
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
        y: -0.584
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
        y: -0.5449
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
        y: -0.5742
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
        y: -0.5742
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
        y: -0.5098
      },
      costas: {
        x: -0.1719,
        y: -0.3281
      },
      punho: {
        x: 0.0953,
        y: -0.2922
      }
    },
    {
      cabeca: {
        x: -0.0557,
        y: -0.5098
      },
      costas: {
        x: -0.1641,
        y: -0.3281
      },
      punho: {
        x: 0.0681,
        y: -0.3572
      }
    },
    {
      cabeca: {
        x: -0.0473,
        y: -0.5273
      },
      costas: {
        x: -0.1719,
        y: -0.332
      },
      punho: {
        x: 0.065,
        y: -0.3693
      }
    },
    {
      cabeca: {
        x: -0.0542,
        y: -0.5371
      },
      costas: {
        x: -0.1641,
        y: -0.332
      },
      punho: {
        x: 0.0829,
        y: -0.3275
      }
    },
    {
      cabeca: {
        x: -0.0281,
        y: -0.5566
      },
      costas: {
        x: -0.1406,
        y: -0.332
      },
      punho: {
        x: 0.0866,
        y: -0.3606
      }
    },
    {
      cabeca: {
        x: -0.0654,
        y: -0.502
      },
      costas: {
        x: -0.1719,
        y: -0.3203
      },
      punho: {
        x: 0.048,
        y: -0.3119
      }
    },
    {
      cabeca: {
        x: -0.0506,
        y: -0.5195
      },
      costas: {
        x: -0.1641,
        y: -0.3281
      },
      punho: {
        x: 0.0628,
        y: -0.3607
      }
    },
    {
      cabeca: {
        x: -0.0651,
        y: -0.5098
      },
      costas: {
        x: -0.1797,
        y: -0.3281
      },
      punho: {
        x: 0.0781,
        y: -0.293
      }
    }
  ],
  jump: [
    {
      cabeca: {
        x: 0.1436,
        y: -0.3047
      },
      costas: {
        x: -0.1406,
        y: -0.1758
      },
      punho: {
        x: -0.0099,
        y: -0.2193
      }
    },
    {
      cabeca: {
        x: 0.168,
        y: -0.4219
      },
      costas: {
        x: -0.125,
        y: -0.2656
      },
      punho: {
        x: 0.0207,
        y: -0.3131
      }
    },
    {
      cabeca: {
        x: 0.1337,
        y: -0.3984
      },
      costas: {
        x: -0.1484,
        y: -0.25
      },
      punho: {
        x: -0.0032,
        y: -0.2721
      }
    },
    {
      cabeca: {
        x: 0.0903,
        y: -0.4297
      },
      costas: {
        x: -0.1875,
        y: -0.2734
      },
      punho: {
        x: -0.0449,
        y: -0.3004
      }
    },
    {
      cabeca: {
        x: 0.1162,
        y: -0.4219
      },
      costas: {
        x: -0.1641,
        y: -0.2656
      },
      punho: {
        x: 0.1323,
        y: -0.2808
      }
    },
    {
      cabeca: {
        x: 0.0373,
        y: -0.4512
      },
      costas: {
        x: -0.2422,
        y: -0.2969
      },
      punho: {
        x: 0.0396,
        y: -0.2915
      }
    },
    {
      cabeca: {
        x: 0.0805,
        y: -0.3906
      },
      costas: {
        x: -0.1953,
        y: -0.2422
      },
      punho: {
        x: 0.0716,
        y: -0.2422
      }
    },
    {
      cabeca: {
        x: 0.0615,
        y: -0.4434
      },
      costas: {
        x: -0.1563,
        y: -0.2891
      },
      punho: {
        x: -0.0373,
        y: -0.3044
      }
    }
  ],
  mine: [
    {
      cabeca: {
        x: 0.0215,
        y: -0.4531
      },
      costas: {
        x: -0.1875,
        y: -0.2891
      },
      punho: {
        x: -0.064,
        y: -0.3029
      }
    },
    {
      cabeca: {
        x: 0.0909,
        y: -0.4512
      },
      costas: {
        x: -0.1563,
        y: -0.2969
      },
      punho: {
        x: -0.0239,
        y: -0.3477
      }
    },
    {
      cabeca: {
        x: -0.0266,
        y: -0.543
      },
      costas: {
        x: -0.1484,
        y: -0.2539
      },
      punho: {
        x: 0.0529,
        y: -0.4069
      }
    },
    {
      cabeca: {
        x: 0.0055,
        y: -0.4141
      },
      costas: {
        x: -0.2422,
        y: -0.2617
      },
      punho: {
        x: -0.0117,
        y: -0.2461
      }
    },
    {
      cabeca: {
        x: 0.0625,
        y: -0.3809
      },
      costas: {
        x: -0.1875,
        y: -0.2422
      },
      punho: {
        x: 0.0142,
        y: -0.2627
      }
    },
    {
      cabeca: {
        x: 0.129,
        y: -0.3672
      },
      costas: {
        x: -0.2422,
        y: -0.2227
      },
      punho: {
        x: 0.0942,
        y: -0.248
      }
    },
    {
      cabeca: {
        x: 0.0651,
        y: -0.4277
      },
      costas: {
        x: -0.1484,
        y: -0.2773
      },
      punho: null
    },
    {
      cabeca: {
        x: 0.0154,
        y: -0.4531
      },
      costas: {
        x: -0.1875,
        y: -0.2891
      },
      punho: null
    }
  ],
  climb: [
    {
      cabeca: {
        x: 0.0316,
        y: -0.5723
      },
      costas: {
        x: -0.1875,
        y: -0.375
      },
      punho: {
        x: 0.0703,
        y: -0.3711
      }
    },
    {
      cabeca: {
        x: 0.0442,
        y: -0.5645
      },
      costas: {
        x: -0.1797,
        y: -0.3711
      },
      punho: {
        x: -0.0092,
        y: -0.392
      }
    },
    {
      cabeca: {
        x: 0.015,
        y: -0.5566
      },
      costas: {
        x: -0.2031,
        y: -0.3633
      },
      punho: null
    },
    {
      cabeca: {
        x: 0.005,
        y: -0.5801
      },
      costas: {
        x: -0.2109,
        y: -0.3828
      },
      punho: {
        x: -0.0273,
        y: -0.4472
      }
    },
    {
      cabeca: {
        x: 0.0366,
        y: -0.5566
      },
      costas: {
        x: -0.1797,
        y: -0.3633
      },
      punho: null
    },
    {
      cabeca: {
        x: 0.0211,
        y: -0.5723
      },
      costas: {
        x: -0.1953,
        y: -0.375
      },
      punho: null
    },
    {
      cabeca: {
        x: 0.0351,
        y: -0.5645
      },
      costas: {
        x: -0.1875,
        y: -0.3711
      },
      punho: {
        x: 0.0438,
        y: -0.3941
      }
    },
    {
      cabeca: {
        x: 0.027,
        y: -0.584
      },
      costas: {
        x: -0.1875,
        y: -0.3711
      },
      punho: {
        x: -0.004,
        y: -0.4154
      }
    }
  ],
  aim: [
    {
      cabeca: {
        x: 0.0523,
        y: -0.5371
      },
      costas: {
        x: -0.1875,
        y: -0.332
      },
      punho: {
        x: -0.0427,
        y: -0.3365
      }
    },
    {
      cabeca: {
        x: 0.0494,
        y: -0.5566
      },
      costas: {
        x: -0.1875,
        y: -0.332
      },
      punho: {
        x: -0.0404,
        y: -0.3366
      }
    },
    {
      cabeca: {
        x: 0.0525,
        y: -0.543
      },
      costas: {
        x: -0.1797,
        y: -0.2852
      },
      punho: {
        x: -0.0294,
        y: -0.3365
      }
    },
    {
      cabeca: {
        x: 0.0444,
        y: -0.582
      },
      costas: {
        x: -0.1797,
        y: -0.2852
      },
      punho: {
        x: -0.0376,
        y: -0.3366
      }
    },
    {
      cabeca: {
        x: 0.0506,
        y: -0.5664
      },
      costas: {
        x: -0.1797,
        y: -0.332
      },
      punho: {
        x: -0.0413,
        y: -0.3371
      }
    },
    {
      cabeca: {
        x: 0.06,
        y: -0.5664
      },
      costas: {
        x: -0.1797,
        y: -0.332
      },
      punho: {
        x: -0.0391,
        y: -0.3326
      }
    },
    {
      cabeca: {
        x: 0.0522,
        y: -0.5273
      },
      costas: {
        x: -0.1797,
        y: -0.332
      },
      punho: {
        x: -0.0358,
        y: -0.3372
      }
    },
    {
      cabeca: {
        x: 0.0609,
        y: -0.5273
      },
      costas: {
        x: -0.1797,
        y: -0.332
      },
      punho: {
        x: -0.0384,
        y: -0.3359
      }
    },
    {
      cabeca: {
        x: 0.0466,
        y: -0.5664
      },
      costas: {
        x: -0.1875,
        y: -0.332
      },
      punho: {
        x: -0.0376,
        y: -0.3395
      }
    },
    {
      cabeca: {
        x: 0.0463,
        y: -0.5664
      },
      costas: {
        x: -0.1797,
        y: -0.332
      },
      punho: {
        x: -0.0433,
        y: -0.3389
      }
    }
  ]
};
