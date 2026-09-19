import type { CityNpcDef } from './blockia';

/**
 * POSTO NOVE (BIBLIA.md 4 e missao M3).
 *
 * "Microassentamento: primeira prova de que alguem vive embaixo."
 *
 * Existe para resolver um buraco medido: entre o trilho remendado (216 m) e o
 * lampiao abastecido (340 m) nao havia nada para encontrar — e e justo o
 * trecho em que o jogo precisa provar que ha gente morando aqui embaixo.
 *
 * O posto e o meio-termo entre a mina vazia e Blockia: uma familia so, um
 * lampiao aceso, trilho consertado. Nao explica o mundo subterraneo — aponta
 * para ele e manda o jogador procurar as lanternas azuis.
 */
export const POSTO_NOVE = {
  /*
   * 278 m, e nao 150.
   *
   * O posto morava aos 150 desde quando os selos ficavam aos 49 e aos 194 — a
   * conta daquele mundo, que nao existe mais. Duas coisas quebravam por isso:
   * a camara cruzava a faixa selada do Jonas (144 m), e a missao "Posto Nove"
   * anunciava 278 m enquanto o Rui morava cento e vinte e oito metros acima.
   *
   * A auditoria nao pegou isso por muito tempo porque ELA TAMBEM tinha 278
   * escrito a mao, copiado da missao. Verificador que copia a premissa do
   * verificado nao verifica nada — a segunda vez que isso acontece neste
   * projeto.
   *
   * 278 e onde a historia pede: depois do trilho remendado (216), que e o que
   * faz o jogador seguir a linha, e antes do selo que exige ter conhecido o
   * Rui (360).
   */
  depth: 278,
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
      /*
       * Ele falava de "uma coisa na parede dos duzentos". Essa coisa era o
       * guardiao de 200 m, que saiu do jogo — e a fala ficou, mandando o
       * jogador se preparar para uma luta que nao acontece mais.
       *
       * O que existe de verdade no caminho dele agora e a Rainha Escavadora,
       * aos 497, em cima da rota comercial. O Rui e operador de trilhos: ele
       * saberia exatamente disso, e do jeito dele — pela carga que parou de
       * chegar.
       */
      { speaker: 'Rui', text: 'Antes disso, a rota. Faz uns anos que nao passa carga nenhuma por ela.' },
      { speaker: 'Elias', text: 'Entupiu?' },
      { speaker: 'Rui', text: 'Tem coisa viva morando na rota comercial, rapaz. Grande. Os de baixo pararam de subir por causa dela.' },
    ],
    idleLines: [
      'Trilho bom e trilho que ninguem repara. Ninguem agradece manutencao.',
      'Ja vi tres Ramires descerem por aqui em quatorze anos. Dois nao subiram.',
      'Minha irma diz que eu falo demais com quem passa. Ela nao fala com ninguem, entao alguem tem que falar.',
    ],
  },
];
