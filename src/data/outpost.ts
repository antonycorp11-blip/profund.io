import type { CityNpcDef } from './blockia';

/**
 * POSTO NOVE (BIBLIA.md 4 e missao M3).
 *
 * "Microassentamento: primeira prova de que alguem vive embaixo."
 *
 * Existe para resolver um buraco medido: entre o selo da Pedra (49 m) e o selo
 * do Cristal (194 m) havia 102 metros com uma missao so, que era "desca 145 m
 * e mate o chefe". O jogador atravessava o trecho inteiro sem nada acontecer.
 *
 * O posto e o meio-termo entre a mina vazia e Blockia: uma familia so, um
 * lampiao aceso, trilho consertado. Nao explica o mundo subterraneo — aponta
 * para ele e manda o jogador procurar as lanternas azuis.
 */
export const POSTO_NOVE = {
  /** Profundidade e coluna da camara principal. */
  depth: 150,
  col: 96,
  /** Largura e altura escavadas, em tiles. */
  largura: 26,
  altura: 7,
};

/** Rui Cabeca, operador de trilhos — o primeiro morador que o jogador conhece. */
export const OUTPOST_NPCS: (CityNpcDef & { depth: number; worldCol: number })[] = [
  {
    id: 'rui_cabeca',
    name: 'Rui Cabeca',
    role: 'Operador de trilhos',
    nivel: 0,
    offset: 0,
    depth: POSTO_NOVE.depth,
    worldCol: POSTO_NOVE.col + 4,
    color: '#c0713a',
    trust: 2,
    lines: [
      { speaker: 'Rui', text: 'Para ai. Voce veio de cima?' },
      { speaker: 'Elias', text: 'De onde mais eu viria?' },
      { speaker: 'Rui', text: '(ri) Voce vai se surpreender com a quantidade de respostas para essa pergunta.' },
      { speaker: 'Elias', text: 'Quanta gente vive aqui embaixo?' },
      { speaker: 'Rui', text: 'Aqui? Eu, minha irma e o gato. Mais fundo, e outra conversa.' },
      { speaker: 'Elias', text: 'Que conversa?' },
      { speaker: 'Rui', text: 'Desce mais. Quando enxergar as lanternas azuis, voce chegou.' },
      { speaker: 'Elias', text: 'E antes disso?' },
      { speaker: 'Rui', text: 'Antes disso tem uma coisa na parede dos duzentos que nao deixa ninguem passar. Boa sorte.' },
    ],
    idleLines: [
      'Trilho bom e trilho que ninguem repara. Ninguem agradece manutencao.',
      'Ja vi tres Ramires descerem por aqui em quatorze anos. Dois nao subiram.',
      'Minha irma diz que eu falo demais com quem passa. Ela nao fala com ninguem, entao alguem tem que falar.',
    ],
  },
];
