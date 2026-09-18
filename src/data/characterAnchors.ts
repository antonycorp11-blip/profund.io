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
        x: 0.0374,
        y: -0.6875
      },
      costas: {
        x: -0.0938,
        y: -0.3555
      },
      punho: {
        x: -0.0682,
        y: -0.2693,
        angulo: 2.0573
      }
    },
    {
      cabeca: {
        x: 0.0354,
        y: -0.6953
      },
      costas: {
        x: -0.1016,
        y: -0.3633
      },
      punho: {
        x: 0.0828,
        y: -0.2562,
        angulo: 1.1032
      }
    },
    {
      cabeca: {
        x: 0.0344,
        y: -0.6875
      },
      costas: {
        x: -0.1016,
        y: -0.3555
      },
      punho: {
        x: 0.0833,
        y: -0.2552,
        angulo: 1.0649
      }
    },
    {
      cabeca: {
        x: 0.0328,
        y: -0.6953
      },
      costas: {
        x: -0.1016,
        y: -0.3633
      },
      punho: {
        x: 0.0848,
        y: -0.26,
        angulo: 1.0437
      }
    },
    {
      cabeca: {
        x: 0.0364,
        y: -0.6875
      },
      costas: {
        x: -0.1016,
        y: -0.3555
      },
      punho: {
        x: 0.0833,
        y: -0.2526,
        angulo: 1.092
      }
    },
    {
      cabeca: {
        x: 0.0352,
        y: -0.6953
      },
      costas: {
        x: -0.1016,
        y: -0.3633
      },
      punho: {
        x: 0.0846,
        y: -0.2565,
        angulo: 1.0737
      }
    },
    {
      cabeca: {
        x: 0.0335,
        y: -0.6875
      },
      costas: {
        x: -0.1016,
        y: -0.3555
      },
      punho: {
        x: 0.0828,
        y: -0.2531,
        angulo: 1.0733
      }
    },
    {
      cabeca: {
        x: 0.032,
        y: -0.6875
      },
      costas: {
        x: -0.1016,
        y: -0.3555
      },
      punho: {
        x: 0.0815,
        y: -0.2511,
        angulo: 1.0855
      }
    }
  ],
  walk: [
    {
      cabeca: {
        x: 0.0566,
        y: -0.6875
      },
      costas: {
        x: -0.1484,
        y: -0.3555
      },
      punho: {
        x: -0.0994,
        y: -0.2867,
        angulo: 2.2269
      }
    },
    {
      cabeca: {
        x: 0.0625,
        y: -0.6953
      },
      costas: {
        x: -0.1328,
        y: -0.3633
      },
      punho: {
        x: 0.1086,
        y: -0.2977,
        angulo: 0.7503
      }
    },
    {
      cabeca: {
        x: 0.0564,
        y: -0.6875
      },
      costas: {
        x: -0.1328,
        y: -0.3555
      },
      punho: {
        x: 0.1037,
        y: -0.3056,
        angulo: 0.6977
      }
    },
    {
      cabeca: {
        x: 0.0535,
        y: -0.6953
      },
      costas: {
        x: -0.1563,
        y: -0.3633
      },
      punho: {
        x: 0.1241,
        y: -0.3073,
        angulo: 0.6194
      }
    },
    {
      cabeca: {
        x: 0.0541,
        y: -0.6953
      },
      costas: {
        x: -0.1563,
        y: -0.3555
      },
      punho: {
        x: -0.1083,
        y: -0.296,
        angulo: 2.2687
      }
    },
    {
      cabeca: {
        x: 0.0586,
        y: -0.6953
      },
      costas: {
        x: -0.1641,
        y: -0.3633
      },
      punho: {
        x: -0.1136,
        y: -0.3081,
        angulo: 2.3042
      }
    },
    {
      cabeca: {
        x: 0.0656,
        y: -0.6953
      },
      costas: {
        x: -0.1406,
        y: -0.3555
      },
      punho: {
        x: 0.0911,
        y: -0.3058,
        angulo: 0.7168
      }
    },
    {
      cabeca: {
        x: 0.0632,
        y: -0.6875
      },
      costas: {
        x: -0.1484,
        y: -0.3555
      },
      punho: {
        x: -0.0983,
        y: -0.2874,
        angulo: 2.2447
      }
    }
  ],
  run: [
    {
      cabeca: {
        x: 0.1047,
        y: -0.6641
      },
      costas: {
        x: -0.1797,
        y: -0.332
      },
      punho: {
        x: 0.157,
        y: -0.3417,
        angulo: 0.1992
      }
    },
    {
      cabeca: {
        x: 0.0913,
        y: -0.6641
      },
      costas: {
        x: -0.1563,
        y: -0.3398
      },
      punho: {
        x: 0.1479,
        y: -0.3455,
        angulo: 0.2543
      }
    },
    {
      cabeca: {
        x: 0.0791,
        y: -0.6016
      },
      costas: {
        x: -0.2031,
        y: -0.2852
      },
      punho: {
        x: 0.1563,
        y: -0.288,
        angulo: 0.1777
      }
    },
    {
      cabeca: {
        x: 0.1035,
        y: -0.6563
      },
      costas: {
        x: -0.1719,
        y: -0.3281
      },
      punho: {
        x: 0.1274,
        y: -0.3288,
        angulo: 0.2292
      }
    },
    {
      cabeca: {
        x: 0.0922,
        y: -0.6094
      },
      costas: {
        x: -0.2891,
        y: -0.2969
      },
      punho: {
        x: 0.1611,
        y: -0.2999,
        angulo: 0.1792
      }
    },
    {
      cabeca: {
        x: 0.111,
        y: -0.6563
      },
      costas: {
        x: -0.1406,
        y: -0.3281
      },
      punho: {
        x: 0.1819,
        y: -0.3421,
        angulo: 0.1385
      }
    },
    {
      cabeca: {
        x: 0.1074,
        y: -0.6641
      },
      costas: {
        x: -0.1875,
        y: -0.3398
      },
      punho: {
        x: 0.1382,
        y: -0.3146,
        angulo: 0.4387
      }
    },
    {
      cabeca: {
        x: 0.1083,
        y: -0.6641
      },
      costas: {
        x: -0.1797,
        y: -0.332
      },
      punho: {
        x: 0.1626,
        y: -0.3383,
        angulo: 0.2106
      }
    }
  ],
  jump: [
    {
      cabeca: {
        x: 0.0466,
        y: -0.6953
      },
      costas: {
        x: -0.1406,
        y: -0.3516
      },
      punho: {
        x: 0.0874,
        y: -0.2419,
        angulo: 1.0437
      }
    },
    {
      cabeca: {
        x: 0.1092,
        y: -0.5703
      },
      costas: {
        x: -0.2578,
        y: -0.25
      },
      punho: {
        x: -0.1707,
        y: -0.2766,
        angulo: 3.1003
      }
    },
    {
      cabeca: {
        x: -0.008,
        y: -0.7578
      },
      costas: {
        x: -0.1094,
        y: -0.4063
      },
      punho: {
        x: 0.1845,
        y: -0.6424,
        angulo: -0.8313
      }
    },
    {
      cabeca: {
        x: 0.1014,
        y: -0.7188
      },
      costas: {
        x: -0.1953,
        y: -0.3711
      },
      punho: {
        x: 0.0172,
        y: -0.5328,
        angulo: -1.4883
      }
    },
    {
      cabeca: {
        x: 0.0682,
        y: -0.5703
      },
      costas: {
        x: -0.2891,
        y: -0.2539
      },
      punho: {
        x: 0.1925,
        y: -0.304,
        angulo: -0.0743
      }
    },
    {
      cabeca: {
        x: 0.0884,
        y: -0.7422
      },
      costas: {
        x: -0.2031,
        y: -0.375
      },
      punho: {
        x: -0.0026,
        y: -0.5534,
        angulo: -1.5606
      }
    },
    {
      cabeca: {
        x: 0.0804,
        y: -0.5
      },
      costas: {
        x: -0.2656,
        y: -0.1953
      },
      punho: {
        x: 0.1347,
        y: -0.1558,
        angulo: 0.3691
      }
    },
    {
      cabeca: {
        x: 0.0466,
        y: -0.6953
      },
      costas: {
        x: -0.1563,
        y: -0.3516
      },
      punho: {
        x: 0.0928,
        y: -0.2266,
        angulo: 1.0589
      }
    }
  ],
  mine: [
    {
      cabeca: {
        x: 0.0442,
        y: -0.6953
      },
      costas: {
        x: -0.1016,
        y: -0.3438
      },
      punho: {
        x: -0.0469,
        y: -0.5056,
        angulo: -1.8707
      }
    },
    {
      cabeca: {
        x: 0.0734,
        y: -0.6875
      },
      costas: {
        x: -0.2031,
        y: -0.3516
      },
      punho: {
        x: -0.0141,
        y: -0.5016,
        angulo: -1.6693
      }
    },
    {
      cabeca: {
        x: -0.0279,
        y: -0.7266
      },
      costas: {
        x: -0.1094,
        y: -0.3867
      },
      punho: {
        x: 0.0541,
        y: -0.4945,
        angulo: -0.7891
      }
    },
    {
      cabeca: {
        x: 0.0491,
        y: -0.6484
      },
      costas: {
        x: -0.1641,
        y: -0.3086
      },
      punho: {
        x: 0.1234,
        y: -0.2922,
        angulo: 0.3978
      }
    },
    {
      cabeca: {
        x: 0.0584,
        y: -0.5078
      },
      costas: {
        x: -0.1719,
        y: -0.207
      },
      punho: {
        x: -0.0257,
        y: -0.3393,
        angulo: -1.7022
      }
    },
    {
      cabeca: {
        x: 0.0665,
        y: -0.6328
      },
      costas: {
        x: -0.1797,
        y: -0.2969
      },
      punho: {
        x: 0.112,
        y: -0.2761,
        angulo: 0.4384
      }
    },
    {
      cabeca: {
        x: 0.0134,
        y: -0.6875
      },
      costas: {
        x: -0.1172,
        y: -0.3438
      },
      punho: {
        x: -0.0714,
        y: -0.5033,
        angulo: -2.1888
      }
    },
    {
      cabeca: {
        x: 0.0407,
        y: -0.6953
      },
      costas: {
        x: -0.1016,
        y: -0.3438
      },
      punho: {
        x: -0.0495,
        y: -0.5052,
        angulo: -1.8924
      }
    }
  ],
  aim: [
    {
      cabeca: {
        x: 0.0208,
        y: -0.7031
      },
      costas: {
        x: -0.1563,
        y: -0.375
      },
      punho: {
        x: 0.181,
        y: -0.4621,
        angulo: -0.303
      }
    },
    {
      cabeca: {
        x: 0.0178,
        y: -0.7109
      },
      costas: {
        x: -0.1641,
        y: -0.3828
      },
      punho: {
        x: 0.1791,
        y: -0.4663,
        angulo: -0.2773
      }
    },
    {
      cabeca: {
        x: 0.0092,
        y: -0.7422
      },
      costas: {
        x: -0.1563,
        y: -0.3945
      },
      punho: {
        x: 0.1596,
        y: -0.5948,
        angulo: -0.884
      }
    },
    {
      cabeca: {
        x: 0.0092,
        y: -0.7422
      },
      costas: {
        x: -0.1563,
        y: -0.3945
      },
      punho: {
        x: 0.1596,
        y: -0.5948,
        angulo: -0.884
      }
    },
    {
      cabeca: {
        x: 0.0224,
        y: -0.7031
      },
      costas: {
        x: -0.1406,
        y: -0.3711
      },
      punho: {
        x: 0.1498,
        y: -0.3622,
        angulo: 0.4765
      }
    },
    {
      cabeca: {
        x: 0.0224,
        y: -0.7031
      },
      costas: {
        x: -0.1406,
        y: -0.3711
      },
      punho: {
        x: 0.1498,
        y: -0.3622,
        angulo: 0.4765
      }
    },
    {
      cabeca: {
        x: -0.0207,
        y: -0.7188
      },
      costas: {
        x: -0.1953,
        y: -0.3867
      },
      punho: {
        x: 0.1151,
        y: -0.4786,
        angulo: -0.3459
      }
    },
    {
      cabeca: {
        x: 0.0137,
        y: -0.7109
      },
      costas: {
        x: -0.1563,
        y: -0.375
      },
      punho: {
        x: 0.1741,
        y: -0.462,
        angulo: -0.2997
      }
    },
    {
      cabeca: {
        x: 0.0282,
        y: -0.7109
      },
      costas: {
        x: -0.1797,
        y: -0.3828
      },
      punho: {
        x: 0.1663,
        y: -0.4669,
        angulo: -0.2263
      }
    },
    {
      cabeca: {
        x: 0.0136,
        y: -0.7109
      },
      costas: {
        x: -0.1641,
        y: -0.375
      },
      punho: {
        x: 0.1715,
        y: -0.462,
        angulo: -0.2711
      }
    }
  ]
};
