import { BLOCK_IDS, blockByKey } from '../data/blocks';
import { CONFIG } from '../data/config';
import type { Rng } from '../core/rng';
import type { World } from './World';

/**
 * BLOCKIA — 600 m (BIBLIA.md 6.1).
 *
 * "Um formigueiro humano": camaras residenciais, escadas, elevadores, pontes,
 * oficinas, hortas, reservatorios e pracas abertas dentro de cavernas enormes.
 * Lema: "Nenhuma lei acima de quem vive abaixo."
 *
 * Desenhada a mao, nao gerada. Cidade procedural vira labirinto sem intencao —
 * o que faz cidade parecer cidade e alguem ter decidido onde fica a praca.
 *
 * REGRA DE OURO: tudo aqui precisa ser ALCANCAVEL a pe. O jogador nao pode
 * precisar escalar parede para chegar num andar. Cada deck se liga ao de baixo
 * por uma escada de degraus de 1 tile — que e o que o passo sobe sozinho — e
 * `tools/` tem um teste que percorre a cidade andando e confere isso.
 */

/** Altura livre acima de qualquer piso onde o jogador anda. */
const VAO = 4;

/**
 * Altura do corpo do jogador, em tiles.
 *
 * NENHUMA construcao pode pousar solido nestas duas linhas acima de um piso.
 * Era o que quebrava a cidade: casa, forja, barraca e moldura de elevador
 * eram paredes de tijolo do chao para cima, e o piso de Blockia virava um
 * corredor picotado por muros de 4 tiles. Medido antes do conserto: 27 celulas
 * alcancaveis a pe na cidade inteira, e nenhuma passarela.
 *
 * Por isso as construcoes daqui para baixo sao ABERTAS embaixo: arcada, nao
 * caixa. Ainda leem como predio — o que diz "aqui mora gente" e a janela, o
 * telhado e a luz acesa, nao o muro na altura do joelho.
 */
const CORPO = 2;

/**
 * A PLANTA DE BLOCKIA: duas torres que sobem uma contra a outra.
 *
 * O relato do dono, e ele estava certo: "nao pode ser apenas um espaco vazio
 * reto com varias coisas colocadas em linha reta, precisamos de varios sobe e
 * desce, niveis e desniveis".
 *
 * A planta antiga era uma escada so. Quatro terracos de largura igual, todos
 * encostados na mesma parede, subindo sempre para o mesmo lado, com um piso
 * chapado de cem colunas embaixo. Lida de longe era uma prateleira, nao uma
 * cidade — e o pior: dava para ver a cidade inteira de um ponto so, entao nao
 * havia nada para descobrir andando.
 *
 * O QUE MUDA, e por que cada coisa:
 *
 *  - O PISO DEIXA DE SER PLANO. Tres patamares em alturas diferentes, ligados
 *    por degraus de 1 tile. O centro e o mais fundo porque e para la que a
 *    agua corre — e por isso a cisterna, a horta e o mercado ficam ali.
 *  - DUAS TORRES, uma em cada parede, subindo uma CONTRA a outra. A do oeste
 *    sobe para a direita, a do leste sobe para a esquerda. No alto elas quase
 *    se encontram, e uma PONTE fecha o vao: quem sobe por um lado desce pelo
 *    outro, e a cidade vira um circuito em vez de um beco.
 *  - LARGURAS DIFERENTES em cada nivel. Terraco de largura igual e prateleira.
 *
 * A REGRA GEOMETRICA que sustenta tudo isso, e que ja falhou duas vezes aqui:
 * um lance de escada e uma diagonal, e o terraco em que ele desemboca NAO pode
 * voltar por cima dessa diagonal — se voltar, o teto do lance e o chao do
 * terraco, e o jogador bate a cabeca no meio da subida. Entao cada terraco
 * cresce NA MESMA DIRECAO em que o lance dele subiu. E por isso que as torres
 * sobem para lados opostos: e a unica forma de as duas marcharem para dentro
 * sem uma passar por cima da outra.
 *
 * `tools/cidade-probe.ts` percorre a cidade andando e confere que todo nivel e
 * alcancavel a pe. Sem ele isto aqui e desenho bonito com ilhas dentro.
 */

/** Poe um solido, a menos que ele feche a passagem de um piso. */
function solido(world: World, col: number, row: number, id: number, pisoRow: number): void {
  if (row > pisoRow - CORPO && row <= pisoRow) return;
  world.setTileRaw(col, row, id);
}

/** Desnivel entre um terraco e o seguinte, em tiles. */
const VAO_DECK = 8;

/**
 * Larguras dos terracos de cada torre, de baixo para cima.
 *
 * Diminuem com a altura (a silhueta afina, como formigueiro) mas nao de forma
 * regular: 26, 21, 24, 18, 20 le como cidade construida aos poucos; 20, 20,
 * 20, 20 le como prateleira.
 */
const LARGURAS_OESTE = [26, 21, 24, 18, 20];
const LARGURAS_LESTE = [24, 20, 26, 17, 16];

/**
 * Quanto cada terraco se desloca em relacao ao de baixo.
 *
 * Sem isto a torre e um bloco retangulo. Com isto ela escalona — cada andar
 * um pouco recuado ou avancado, que e o que faz a silhueta ter cara de coisa
 * construida por muita gente em muitos anos.
 */
const RECUOS_OESTE = [0, 3, -2, 5, 1];
const RECUOS_LESTE = [0, -3, 2, -5, -1];

export interface Deck {
  row: number;
  col0: number;
  col1: number;
  /** De que torre ele e. */
  lado: 'oeste' | 'leste' | 'ponte';
}

/** Uma escada VERTICAL ligando dois pisos, com o furo no piso de cima. */
export interface Escada {
  col: number;
  /** Linha do degrau mais alto (o piso de cima) e do mais baixo. */
  topo: number;
  base: number;
}

/** Um pedaco do piso da praca, na altura dele. */
export interface Patamar {
  row: number;
  col0: number;
  col1: number;
}

export interface BlockiaPlanta {
  /** A linha mais funda do piso — o centro da praca. */
  piso: number;
  patamares: Patamar[];
  decks: Deck[];
  escadas: Escada[];
  ponte: Deck | null;
}

/**
 * Geometria de Blockia, calculada num lugar so.
 *
 * Existe para que quem POSICIONA coisas na cidade (moradores, mobilia) use os
 * mesmos numeros de quem a ESCULPE. Coordenada escrita a mao contra um desenho
 * imaginado errava sempre — os sete moradores ja nasceram dentro da pedra uma
 * vez por isso.
 *
 * AS ESCADAS SAO VERTICAIS, e essa foi a correcao que fez a planta fechar.
 *
 * A primeira versao destas torres subia por lances DIAGONAIS, um degrau por
 * coluna. Escada diagonal come uma coluna por tile de altura: com oito tiles
 * entre andares, cada lance gasta oito colunas, e cinco andares gastam
 * quarenta so de escada. As duas torres marchavam para dentro e a sonda
 * mostrou o resultado — elas se ATRAVESSAVAM no meio da caverna, com um
 * terraco de uma cruzando o de outra a um tile de distancia.
 *
 * Escada vertical gasta ZERO colunas. E por isso que as duas torres agora
 * cabem, cada uma na sua metade, com o atrio aberto no meio — que e onde a
 * cidade respira e por onde se ve os dois lados de uma vez.
 */
export function blockiaLayout(surfaceRow: number): BlockiaPlanta {
  const cfg = CONFIG.blockia;
  const piso = surfaceRow + cfg.depth1;
  const { col0, col1 } = cfg;
  const largura = col1 - col0;

  /*
   * OS TRES PATAMARES DO PISO.
   *
   * O centro e o mais fundo, e isso nao e enfeite: e onde a agua junta, e
   * portanto onde a cisterna, a horta e o mercado tem motivo de estar. As duas
   * pontas sao mais altas porque sao pedra seca — a forja de um lado, o
   * estoque do outro.
   */
  const patamares: Patamar[] = [
    { row: piso - 3, col0, col1: col0 + Math.round(largura * 0.26) },
    { row: piso, col0: col0 + Math.round(largura * 0.26) + 1, col1: col0 + Math.round(largura * 0.64) },
    { row: piso - 4, col0: col0 + Math.round(largura * 0.64) + 1, col1 },
  ];

  const decks: Deck[] = [];
  const escadas: Escada[] = [];

  /**
   * Empilha uma torre encostada numa parede.
   *
   * A escada troca de ponta a cada andar (`n % 2`): subir sempre pelo mesmo
   * lado transformaria a torre num poco, e obriga o jogador a atravessar o
   * terraco inteiro a cada andar — que e justamente o que faz a cidade ser
   * percorrida em vez de atravessada.
   */
  const empilhar = (
    lado: 'oeste' | 'leste',
    larguras: number[],
    recuos: number[],
    pisoBase: Patamar,
    ancora: number
  ): void => {
    let row = pisoBase.row;
    for (let n = 0; n < larguras.length; n++) {
      const alvo = row - VAO_DECK;
      const w = larguras[n];
      const desloc = recuos[n] ?? 0;
      /*
       * ENCOSTA NA PAREDE em vez de desistir.
       *
       * A primeira versao abortava a torre inteira quando um recuo empurrava
       * o terraco para fora da caverna — e abortava no TERCEIRO andar, entao a
       * cidade nascia com tres terracos em vez de dez e a sonda acusava
       * "ilha". Um andar que bateu na parede se encosta nela; o que nao pode e
       * a torre acabar por causa disso.
       */
      let c0 = lado === 'oeste' ? ancora + desloc : ancora - desloc - w;
      c0 = Math.max(col0 + 2, Math.min(c0, col1 - 2 - w));
      const c1 = c0 + w;
      decks.push({ row: alvo, col0: c0, col1: c1, lado });

      /*
       * A ESCADA PRECISA PISAR NOS DOIS ANDARES, e a primeira versao so
       * olhava para o de cima.
       *
       * Eu punha a escada a duas colunas da ponta do terraco NOVO, alternando
       * de lado a cada andar. Mas os andares sao recuados uns em relacao aos
       * outros — e de proposito, e o que da o escalonamento. Entao a coluna
       * escolhida caia, com frequencia, FORA do terraco de baixo: a escada
       * comecava no ar, e quem estava no andar de baixo nao tinha como
       * alcancar o primeiro degrau.
       *
       * A sonda mediu exatamente isso: os dois primeiros andares de cada torre
       * alcancaveis, e do terceiro para cima "ILHA" — porque a terceira escada
       * foi a primeira a cair fora.
       *
       * A coluna certa vem da SOBREPOSICAO dos dois andares. Se dois andares
       * nao se sobrepoem, nao ha escada possivel entre eles, e isso precisa
       * doer aqui e nao na cara do jogador: o andar nao e criado.
       */
      const abaixoC0 = n === 0 ? pisoBase.col0 : decks[decks.length - 2].col0;
      const abaixoC1 = n === 0 ? pisoBase.col1 : decks[decks.length - 2].col1;
      const comumC0 = Math.max(c0, abaixoC0) + 1;
      const comumC1 = Math.min(c1, abaixoC1) - 1;
      if (comumC1 < comumC0) {
        decks.pop();
        break;
      }
      // Alterna a ponta a cada andar: subir sempre pelo mesmo lado faria a
      // torre virar um poco, e e a travessia do andar que faz a cidade ser
      // percorrida em vez de atravessada.
      const colEscada = n % 2 === 0 ? comumC0 : comumC1;
      const baseReal =
        n === 0 ? (lado === 'oeste' ? patamares[0].row : patamares[2].row) : row;
      escadas.push({ col: colEscada, topo: alvo, base: baseReal });
      row = alvo;
    }
  };

  /*
   * As duas torres ficam cada uma na sua metade, com um atrio aberto no meio.
   * `largura * 0.30` de folga central e o que garante que elas nao se
   * encostem nem nos andares mais largos.
   */
  /*
   * AS DUAS TORRES SOBEM NAS MESMAS LINHAS, e nao cada uma na sua.
   *
   * Elas partem de patamares de alturas diferentes (o oeste esta 3 tiles acima
   * do centro, o leste 4). Se cada torre contasse a altura a partir do proprio
   * patamar, os andares ficariam desencontrados por um tile para sempre — e a
   * ponte, que precisa ser horizontal, nunca acharia um par de andares na
   * mesma linha. Verificado: com as alturas separadas, zero pontes possiveis.
   *
   * Entao a grade vertical e uma so, medida do piso do centro. O que muda de
   * um lado para o outro e o COMPRIMENTO da primeira escada, que e o certo:
   * quem sobe do lado mais fundo sobe um pouco mais.
   */
  /* A grade vertical e medida do piso do CENTRO para os dois lados (ver
   * acima), mas a escada de entrada de cada torre nasce no patamar daquele
   * lado — que e onde o jogador esta. */
  const gradeOeste: Patamar = { ...patamares[0], row: piso };
  const gradeLeste: Patamar = { ...patamares[2], row: piso };
  empilhar('oeste', LARGURAS_OESTE, RECUOS_OESTE, gradeOeste, col0 + 3);
  empilhar('leste', LARGURAS_LESTE, RECUOS_LESTE, gradeLeste, col1 - 3);

  /*
   * A PONTE: fecha o circuito no alto.
   *
   * Sem ela as duas torres sao dois becos sem saida e o jogador desce a mesma
   * escada que subiu. Com ela a cidade tem uma VOLTA, que e a diferenca entre
   * um cenario e um lugar — e, de quebra, a travessia acontece pendurada sobre
   * o atrio, com a praca inteira visivel embaixo.
   */
  const oeste = decks.filter((d) => d.lado === 'oeste');
  const leste = decks.filter((d) => d.lado === 'leste');
  let ponte: Deck | null = null;
  if (oeste.length && leste.length) {
    /* Escolhe o par de andares mais alto em que as duas torres estao na MESMA
     * linha e nao se tocam. Uma ponte em diagonal nao existe. */
    for (let i = oeste.length - 1; i >= 0 && !ponte; i--) {
      for (let j = leste.length - 1; j >= 0 && !ponte; j--) {
        if (oeste[i].row !== leste[j].row) continue;
        if (oeste[i].col1 >= leste[j].col0 - 2) continue;
        ponte = { row: oeste[i].row, col0: oeste[i].col1, col1: leste[j].col0, lado: 'ponte' };
      }
    }
  }

  return { piso, patamares, decks, escadas, ponte };
}

/** Todos os pisos andaveis da cidade, do mais baixo para o mais alto. */
export function blockiaNiveis(surfaceRow: number): Deck[] {
  const p = blockiaLayout(surfaceRow);
  const tudo: Deck[] = [
    ...p.patamares.map((x) => ({ ...x, lado: 'oeste' as const })),
    ...p.decks,
  ];
  if (p.ponte) tudo.push(p.ponte);
  return tudo;
}

export function portaBounds(surfaceRow: number): {
  col0: number;
  col1: number;
  row0: number;
  row1: number;
} {
  const cfg = CONFIG.blockia;
  /*
   * A ALTURA VEM DO PATAMAR, e nao de `depth1`.
   *
   * A porta fica na ponta oeste, e desde que a praca ganhou desniveis essa
   * ponta e tres tiles mais alta que o centro. Usar `depth1` aqui cavaria a
   * porta tres tiles abaixo do chao que ela abre — uma passagem enterrada, com
   * a arte da porta flutuando acima dela.
   */
  const chao = blockiaLayout(surfaceRow).patamares[0].row;
  return { col0: cfg.gateCol, col1: cfg.col0 + 2, row0: chao - 3, row1: chao };
}

/** Abre a porta de Blockia: os tiles da passagem viram ar. */
export function abrirPortaBlockia(world: World, surfaceRow: number): void {
  const { col0, col1, row0, row1 } = portaBounds(surfaceRow);
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) world.setTileRaw(col, row, BLOCK_IDS.AIR);
  }
}

export function carveBlockia(world: World, rng: Rng, surfaceRow: number): void {
  const cfg = CONFIG.blockia;
  const brick = blockByKey('ruin_brick')?.id ?? BLOCK_IDS.STONE;
  const dirt = blockByKey('dirt')?.id ?? brick;
  const plank = BLOCK_IDS.PLANK;

  const row0 = surfaceRow + cfg.depth0;
  // `depth1` agora chega pela planta (`planta.piso`), que e quem sabe os
  // patamares. Ler o CONFIG de novo aqui abriria uma segunda verdade.
  const { col0, col1 } = cfg;
  const centro = Math.round((col0 + col1) / 2);

  // ---- 0. A rampa de entrada ---------------------------------------------
  // Escavada ANTES de tudo, de proposito.
  //
  // Ela ja foi a ultima coisa, e a galeria chegava 64 m acima do piso: a rampa
  // descia 64 tiles atravessando a cidade inteira e passava por cima de decks
  // e escadas. Resultado medido na epoca: 0 de 4 passarelas alcancaveis a pe.
  // Agora a galeria chega quase no nivel do piso e a rampa tem 4 degraus.
  const corredorRow = surfaceRow + cfg.corridorDepth;
  // A rampa desemboca no PATAMAR OESTE, que e onde a porta esta — e nao no
  // piso do centro, tres tiles mais fundo.
  rampa(world, cfg.gateCol, corredorRow, blockiaLayout(surfaceRow).patamares[0].row, brick);

  // ---- 1. A caverna -------------------------------------------------------
  // Teto abobadado; piso PLANO. O piso ondulado de antes era bonito no papel e
  // pessimo na pratica: cada ondulacao era um degrau a mais entre o jogador e
  // a escada, e os moradores encaixavam em alturas diferentes.
  const planta = blockiaLayout(surfaceRow);
  const piso = planta.piso;

  /**
   * A altura do chao naquela coluna, seguindo os patamares.
   *
   * Entre um patamar e o proximo o chao sobe UM TILE POR COLUNA, que e o
   * desnivel que o passo do jogador vence sozinho. Um degrau de tres tiles de
   * uma vez seria uma parede — e uma parede no meio da praca picota a cidade,
   * que foi exatamente o que ja aconteceu aqui uma vez.
   */
  const chaoDe = (col: number): number => {
    const p = planta.patamares;
    for (let i = 0; i < p.length; i++) {
      if (col >= p[i].col0 && col <= p[i].col1) return p[i].row;
    }
    return piso;
  };
  /* Suaviza as juntas: cada degrau vira uma rampa de 1 tile por coluna. */
  const chaoSuave = (col: number): number => {
    const bruto = chaoDe(col);
    const p = planta.patamares;
    for (let i = 0; i + 1 < p.length; i++) {
      const junta = p[i].col1;
      const salto = p[i + 1].row - p[i].row;
      const passos = Math.abs(salto);
      if (col > junta && col <= junta + passos) {
        return p[i].row + Math.sign(salto) * (col - junta);
      }
    }
    return bruto;
  };

  for (let col = col0; col <= col1; col++) {
    const t = (col - col0) / (col1 - col0);
    const abobada = Math.sin(t * Math.PI) * 10 + Math.sin(t * Math.PI * 3) * 2.5;
    const topo = Math.round(row0 - abobada);
    const chao = chaoSuave(col);
    for (let row = topo; row <= chao; row++) world.setTileRaw(col, row, BLOCK_IDS.AIR);
    // Duas linhas de tijolo embaixo de cada patamar: e o que sustenta o
    // desnivel em vez de deixar o piso alto pairando sobre o vazio.
    for (let row = chao + 1; row <= piso + 2; row++) world.setTileRaw(col, row, brick);
  }

  // ---- 2. Os terracos e a ponte -------------------------------------------
  /*
   * DUAS TORRES SUBINDO UMA CONTRA A OUTRA, e uma ponte fechando o circuito.
   * A razao geometrica de cada escolha esta em `blockiaLayout`; aqui so se
   * escava o que ela calculou.
   *
   * Tudo que e piso — patamar, terraco e ponte — recebe o mesmo tratamento:
   * tabua embaixo, ar de sobra em cima. Escrever isso uma vez so e o que
   * garante que a ponte nao vire um caso especial esquecido.
   */
  const niveis = [...planta.decks, ...(planta.ponte ? [planta.ponte] : [])];
  for (const d of niveis) {
    for (let col = d.col0; col <= d.col1; col++) {
      world.setTileRaw(col, d.row, plank);
      // Vao livre por cima: sem isto o jogador bate a cabeca no terraco de
      // cima e o andar vira um tunel de rastejar.
      for (let r = d.row - VAO; r < d.row; r++) world.setTileRaw(col, r, BLOCK_IDS.AIR);
    }
  }

  // ---- 4. Construcoes -----------------------------------------------------
  // Fachadas encostadas nas paredes, com porta no nivel do piso do deck onde
  // ficam. Cada uma e uma casca oca: e a janela e a porta que dizem "aqui mora
  // gente", nao o volume.
  const casas: { col: number; row: number; w: number; h: number }[] = [];
  /* Casa em patamar de praca TAMBEM: antes so o piso do meio ganhava fachada,
   * e as pontas altas da praca ficavam sendo chao de pedra com nada em cima. */
  const niveisComPiso = [...planta.patamares, ...niveis];
  niveisComPiso.forEach((nivel, i) => {
    const quantas = i === 0 ? 3 : 2;
    for (let k = 0; k < quantas; k++) {
      const largura = 7 + ((i + k) % 3);
      const esquerda = (i + k) % 2 === 0;
      const col = esquerda
        ? nivel.col0 + 1 + k * (largura + 3)
        : nivel.col1 - 1 - largura - k * (largura + 3);
      if (col <= col0 || col + largura >= col1) continue;
      casa(world, col, nivel.row, largura, brick, rng);
      casas.push({ col, row: nivel.row, w: largura, h: 4 });
    }
  });

  // Ferraria de Silas: bigorna e forja no piso, ponta esquerda.
  predioEspecial(world, col0 + 4, planta.patamares[0].row, 9, brick, plank, 'forja');
  // Mercado da Ponte, de Nina: barracas no meio do piso.
  // O mercado fica no patamar do MEIO — o mais fundo, onde a agua junta e onde
  // a cidade se encontra. Era `piso` chapado; com a praca em degraus, o numero
  // certo e o do patamar.
  for (let n = 0; n < 4; n++) {
    barraca(world, centro - 10 + n * 6, planta.patamares[1].row, plank);
  }
  // Quadro de missoes do Conselho: um painel de tabua na praca.
  const rowQuadro = planta.patamares[1].row;
  for (let r = rowQuadro - 3; r >= rowQuadro - 5; r--) {
    world.setTileRaw(centro + 12, r, plank);
    world.setTileRaw(centro + 13, r, plank);
  }

  // ---- 5. Poco do elevador -----------------------------------------------
  // Breno considera elevador parado uma ofensa pessoal. Aqui e um vao limpo
  // com moldura, do piso ate acima do deck mais alto.
  const elevCol = col0 + 6;
  const topoElev = niveis[niveis.length - 1].row - VAO - 2;
  for (let row = topoElev; row <= planta.patamares[0].row; row++) {
    for (let c = elevCol; c < elevCol + 3; c++) world.setTileRaw(c, row, BLOCK_IDS.AIR);
    solido(world, elevCol - 1, row, brick, planta.patamares[0].row);
    solido(world, elevCol + 3, row, brick, planta.patamares[0].row);
  }

  // ---- 6. Horta e reservatorio -------------------------------------------
  // "Todo mundo acha que cidade subterranea vive de pedra. Vive de agua."
  const rowHorta = planta.patamares[1].row;
  for (let col = col0 + 16; col < col0 + 32; col++) {
    // A terra e o PISO da horta, nao um canteiro em cima dele. Canteiro no
    // nivel do chao e so um muro baixo com nome bonito.
    world.setTileRaw(col, rowHorta + 1, dirt);
  }

  // ---- 7. Luz -------------------------------------------------------------
  // Blockia e a primeira coisa iluminada em 600 metros de mina. O contraste
  // com a galeria de onde o jogador saiu e metade da chegada.
  for (let col = col0 + 3; col <= col1 - 3; col += 5) {
    const t = (col - col0) / (col1 - col0);
    world.setTileRaw(col, Math.round(row0 - Math.sin(t * Math.PI) * 10) + 1, BLOCK_IDS.LAMP);
  }
  for (const d of niveis) {
    for (let col = d.col0 + 2; col <= d.col1 - 2; col += 7) {
      world.setTileRaw(col, d.row - VAO + 1, BLOCK_IDS.LAMP);
    }
  }
  for (let col = col0 + 4; col <= col1 - 4; col += 6) {
    world.setTileRaw(col, piso - VAO, BLOCK_IDS.LAMP);
  }

  // ---- 9. Calcamento e escadas, por ultimo --------------------------------
  // A garantia, e nao a esperanca.
  //
  // Eu vinha posicionando casa, forja, barraca, horta e moldura de elevador a
  // mao e torcendo para nenhuma fechar a passagem. Sempre fechava alguma, e
  // descobrir qual custava uma investigacao inteira por vez. Agora o ultimo
  // passo simplesmente abre as duas linhas do corpo acima de todo piso, doa a
  // quem doer: se uma construcao invadiu o caminho, ela perde o pedaco que
  // invadiu.
  //
  // Vem DEPOIS de todas as construcoes por isso mesmo. E as escadas vem depois
  // dele, senao as casas do piso enterravam a escada que passa por baixo
  // delas — foi exatamente o que aconteceu na primeira tentativa.
  /*
   * O PISO DA PRACA E CALCADO PELO PERFIL, e nao por uma linha reta.
   *
   * Calcar cada patamar na linha dele parecia certo e quebrava a cidade: a
   * junta entre dois patamares e uma rampa de um tile por coluna, e `calcar`
   * passava por cima dela pondo tabua na altura do patamar. O resultado media
   * "patamar 2: ILHA, 0 de 36 colunas" — o lado leste inteiro inacessivel,
   * porque a rampa que levava ate ele tinha sido tapada pelo proprio piso que
   * ela servia.
   *
   * Aqui o calcamento segue a mesma funcao que escavou o chao, entao a rampa
   * continua rampa.
   */
  for (let col = col0; col <= col1; col++) {
    const chao = chaoSuave(col);
    for (let k = 0; k < CORPO; k++) world.setTileRaw(col, chao - k, BLOCK_IDS.AIR);
    if (!world.isSolid(col, chao + 1)) world.setTileRaw(col, chao + 1, BLOCK_IDS.PLANK);
  }
  // No terraco a tabua E a superficie, entao a linha onde o jogador pisa e a
  // de cima. Passar `d.row` aqui apagava a propria passarela.
  for (const d of niveis) calcar(world, d.col0, d.col1, d.row - 1);

  // ---- 10. Os lances de escada --------------------------------------------
  // Por ultimo, para nada enterrar degrau. Ver o comentario dos terracos.
  /*
   * ESCADA VERTICAL, e um FURO no piso de cima para ela sair.
   *
   * Escada que encosta no teto e escada que nao leva a lugar nenhum. Isso ja
   * aconteceu aqui: a passarela era calcada DEPOIS da escada e tapava a saida
   * dela. Por isso o furo e aberto por ultimo, e por isso ele e aberto pelo
   * mesmo laco que poe os degraus — quem mexer num vai ver o outro.
   */
  for (const e of planta.escadas) {
    for (let r = e.topo; r <= e.base; r++) world.setTileRaw(e.col, r, BLOCK_IDS.LADDER);
    // O furo: duas colunas de ar acima do degrau mais alto, para o corpo sair.
    for (let k = 0; k < CORPO; k++) world.setTileRaw(e.col, e.topo - 1 - k, BLOCK_IDS.AIR);
  }

  // ---- 11. A porta, por ultimo de tudo ------------------------------------
  /*
   * DEPOIS DO CALCAMENTO, e isso nao e detalhe.
   *
   * Ela era escavada no passo 8 e o calcamento vinha no 9 — e o calcamento
   * abre as duas linhas do corpo acima de todo piso, doa a quem doer. Doia
   * justamente na porta: das vinte celulas seladas, seis eram reabertas pelo
   * proprio calcamento, e sobrava uma fresta de dois tiles de altura por onde
   * o jogador entrava em Blockia sem bater na porta.
   *
   * A sonda mediu "14 de 20 tiles solidos". Eu nao teria visto isso jogando —
   * a arte da porta cobre a fresta inteira.
   */
  /*
   * "Nome e cidade." A galeria chega aqui, no nivel do piso.
   *
   * A PASSAGEM NASCE FECHADA, e isso e novo. Ela era um vao aberto com um
   * desenho de porta por cima — o jogador via duas folhas de madeira trancadas
   * e atravessava elas andando. A missao que a cidade inteira existe para
   * produzir ("ha voz do outro lado; diga seu nome") acontecia contra uma
   * porta que nao estava fechada.
   *
   * O bloco e o SELO, o mesmo dos guardioes: indestrutivel, para ninguem
   * entrar em Blockia com picareta. Ele nunca aparece na tela — a arte da
   * porta cobre a passagem inteira — e some quando `porta_blockia` existe.
   */
  const { col0: pc0, col1: pc1, row0: pr0, row1: pr1 } = portaBounds(surfaceRow);
  for (let row = pr0; row <= pr1; row++) {
    for (let col = pc0; col <= pc1; col++) world.setTileRaw(col, row, BLOCK_IDS.SEAL);
  }
  world.setTileRaw(cfg.gateCol - 1, piso - 4, plank);
  world.setTileRaw(cfg.gateCol - 1, piso + 1, plank);



}

/**
 * Abre as linhas do corpo acima de um piso e garante chao solido embaixo.
 *
 * Roda DEPOIS das construcoes, de proposito: e ela que decide quem passa.
 */
function calcar(world: World, col0: number, col1: number, pisoRow: number): void {
  for (let col = col0; col <= col1; col++) {
    for (let k = 0; k < CORPO; k++) world.setTileRaw(col, pisoRow - k, BLOCK_IDS.AIR);
    if (!world.isSolid(col, pisoRow + 1)) {
      world.setTileRaw(col, pisoRow + 1, BLOCK_IDS.PLANK);
    }
  }
}

/*
 * A escada DIAGONAL saiu daqui.
 *
 * Ela subia um degrau por coluna, o que e otimo para um desnivel curto e
 * ruinoso para uma torre: oito tiles de altura custavam oito colunas, e cinco
 * andares custavam quarenta so de escada. Com duas torres, as duas marchavam
 * para dentro e se atravessavam no meio da caverna — a sonda `npm run cidade`
 * mediu isso antes de qualquer pessoa ver.
 *
 * Escada vertical custa zero colunas. A rampa de entrada abaixo continua
 * diagonal porque ali o desnivel e de quatro tiles e o efeito desejado e
 * justamente o de descer andando.
 */

/** Rampa de descida da galeria ate o piso da cidade. */
function rampa(world: World, col: number, de: number, ate: number, brick: number): void {
  const passos = Math.max(0, ate - de);
  for (let n = 0; n <= passos; n++) {
    const c = col + n;
    const r = de + n;
    world.setTileRaw(c, r + 1, brick);
    for (let k = 0; k <= VAO; k++) world.setTileRaw(c, r - k, BLOCK_IDS.AIR);
  }
}

/** Casca de moradia com porta no nivel do piso e janela. */
function casa(world: World, col: number, pisoRow: number, largura: number, brick: number, rng: Rng): void {
  const alto = 4;
  const topo = pisoRow - alto;
  for (let c = col; c < col + largura; c++) {
    for (let r = topo; r < pisoRow; r++) {
      const borda = c === col || c === col + largura - 1 || r === topo;
      if (borda) solido(world, c, r, brick, pisoRow);
      else world.setTileRaw(c, r, BLOCK_IDS.AIR);
    }
  }
  // Janela iluminada, de um lado ou do outro.
  const janela = rng.next() < 0.5 ? col : col + largura - 1;
  world.setTileRaw(janela, topo + 1, BLOCK_IDS.LAMP);
}

/** Forja de Silas: chamine, bigorna e fogo. */
function predioEspecial(
  world: World,
  col: number,
  pisoRow: number,
  largura: number,
  brick: number,
  plank: number,
  tipo: 'forja'
): void {
  for (let c = col; c < col + largura; c++) {
    world.setTileRaw(c, pisoRow - 4, plank);
    world.setTileRaw(c, pisoRow - 1, BLOCK_IDS.AIR);
    world.setTileRaw(c, pisoRow - 2, BLOCK_IDS.AIR);
    world.setTileRaw(c, pisoRow - 3, BLOCK_IDS.AIR);
  }
  solido(world, col, pisoRow - 3, brick, pisoRow);
  solido(world, col + largura - 1, pisoRow - 3, brick, pisoRow);
  if (tipo === 'forja') {
    // A forja acesa: e o ponto mais quente da cidade e da para ver de longe.
    world.setTileRaw(col + 2, pisoRow - 1, BLOCK_IDS.LAMP);
    world.setTileRaw(col + 2, pisoRow - 2, BLOCK_IDS.LAMP);
    for (let r = pisoRow - 5; r >= pisoRow - 8; r--) world.setTileRaw(col + 2, r, brick);
  }
}

/** Barraca do Mercado da Ponte: toldo de tabua com lampiao. */
function barraca(world: World, col: number, pisoRow: number, plank: number): void {
  for (let c = col; c < col + 4; c++) world.setTileRaw(c, pisoRow - 3, plank);
  world.setTileRaw(col, pisoRow - 4, plank);
  world.setTileRaw(col + 3, pisoRow - 4, plank);
  world.setTileRaw(col + 1, pisoRow - 4, BLOCK_IDS.LAMP);
}

/**
 * A galeria das Galerias Livres: liga o poco principal a porta de Blockia.
 *
 * Horizontal e longa de proposito. Depois de 600 m descendo, andar de lado por
 * 60 metros e o sinal fisico de que a mina acabou e comecou outra coisa.
 */
export function carveCityCorridor(world: World, rng: Rng, surfaceRow: number): void {
  const cfg = CONFIG.blockia;
  const row = surfaceRow + cfg.corridorDepth;
  const de = CONFIG.base.centerCol + CONFIG.base.layout.shaft;
  for (let col = de; col <= cfg.gateCol; col++) {
    // Ondula um pouco: um corredor reto de 60 tiles e um cano. Mas ondula com
    // degrau de 1 tile, que o passo do jogador vence andando.
    const off = Math.round(Math.sin((col - de) * 0.11) * 2);
    for (let r = row + off - 3; r <= row + off; r++) world.setTileRaw(col, r, BLOCK_IDS.AIR);
    world.setTileRaw(col, row + off + 1, BLOCK_IDS.PLANK);
    if ((col - de) % 9 === 0 && rng.next() < 0.8) {
      world.setTileRaw(col, row + off - 4, BLOCK_IDS.PLANK);
    }
  }
}
