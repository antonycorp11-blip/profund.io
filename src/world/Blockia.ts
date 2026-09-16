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

/** Quantos terracos a cidade tem, e o desnivel entre eles. */
const NIVEIS = 4;
const VAO_DECK = 8;
const LARGURA_DECK = 14;

/** Poe um solido, a menos que ele feche a passagem de um piso. */
function solido(world: World, col: number, row: number, id: number, pisoRow: number): void {
  if (row > pisoRow - CORPO && row <= pisoRow) return;
  world.setTileRaw(col, row, id);
}

export interface Deck {
  row: number;
  col0: number;
  col1: number;
}

/**
 * Geometria de Blockia: o piso e os terracos, com as colunas de cada um.
 *
 * Existe para que quem POSICIONA coisas na cidade (moradores, hoje) use os
 * mesmos numeros de quem a ESCULPE. Coordenada escrita a mao contra um desenho
 * imaginado errava sempre — os sete moradores ja nasceram dentro da pedra uma
 * vez por isso.
 */
export function blockiaLayout(surfaceRow: number): { piso: number; decks: Deck[] } {
  const cfg = CONFIG.blockia;
  const piso = surfaceRow + cfg.depth1;
  const decks: Deck[] = [];
  let baseCol = cfg.col0 + 8;
  let baseRow = piso;
  for (let n = 1; n <= NIVEIS; n++) {
    const row = baseRow - VAO_DECK;
    const inicio = baseCol + VAO_DECK;
    if (inicio + LARGURA_DECK > cfg.col1 - 2) break;
    decks.push({ row, col0: inicio, col1: inicio + LARGURA_DECK });
    baseCol = inicio + LARGURA_DECK;
    baseRow = row;
  }
  return { piso, decks };
}

export function carveBlockia(world: World, rng: Rng, surfaceRow: number): void {
  const cfg = CONFIG.blockia;
  const brick = blockByKey('ruin_brick')?.id ?? BLOCK_IDS.STONE;
  const dirt = blockByKey('dirt')?.id ?? brick;
  const plank = BLOCK_IDS.PLANK;

  const row0 = surfaceRow + cfg.depth0;
  const row1 = surfaceRow + cfg.depth1;
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
  rampa(world, cfg.gateCol, corredorRow, surfaceRow + cfg.depth1, brick);

  // ---- 1. A caverna -------------------------------------------------------
  // Teto abobadado; piso PLANO. O piso ondulado de antes era bonito no papel e
  // pessimo na pratica: cada ondulacao era um degrau a mais entre o jogador e
  // a escada, e os moradores encaixavam em alturas diferentes.
  const piso = row1;
  for (let col = col0; col <= col1; col++) {
    const t = (col - col0) / (col1 - col0);
    const abobada = Math.sin(t * Math.PI) * 10 + Math.sin(t * Math.PI * 3) * 2.5;
    const topo = Math.round(row0 - abobada);
    for (let row = topo; row <= piso; row++) world.setTileRaw(col, row, BLOCK_IDS.AIR);
    world.setTileRaw(col, piso + 1, brick);
    world.setTileRaw(col, piso + 2, brick);
  }

  // ---- 2. Os decks --------------------------------------------------------
  // Quatro passarelas, cada uma mais curta que a de baixo: e o que da a
  // silhueta de formigueiro, com o ceu da caverna aparecendo nas pontas.
  /*
   * TERRACOS, nao arranha-ceu.
   *
   * Tentei duas vezes ligar passarelas altas por escada e as duas falharam
   * pela mesma razao geometrica, que vale anotar:
   *
   *  - Escada em diagonal saindo de dentro de uma passarela precisa de vao
   *    livre acima de cada degrau, e esse vao E a cabeca de quem anda naquela
   *    passarela. A passarela racha em duas e a metade de la vira ilha.
   *  - Escada em vai-e-vem (tipo predio) nao existe em 2D de perfil: na
   *    virada, o primeiro degrau da volta fica UM tile acima do ultimo degrau
   *    da ida, e o corpo do jogador tem dois. Verificado: o caminho morre
   *    exatamente na primeira curva.
   *
   * O que funciona e o obvio depois de ver: terracos subindo para um lado. Um
   * lance curto sobe fora de qualquer passarela e desemboca na PONTA de
   * terraco seguinte, que cresce no sentido oposto ao lance. Nada passa por
   * cima de nada.
   */

  // Todos os decks encostam na torre de escadas (a direita) e se estendem
  // para a esquerda, cada um um pouco mais curto que o de baixo. E o que da a
  // silhueta de formigueiro e, principalmente, garante que nenhum deck seja
  // cortado por uma escada passando por cima dele.
  const { decks } = blockiaLayout(surfaceRow);
  // Cada lance comeca onde o terraco de baixo termina e sobe para a direita,
  // sempre por cima de vao aberto.
  const lances: { col: number; de: number; ate: number }[] = [];
  let baseRow = piso;
  let baseCol = col0 + 8;
  for (const d of decks) {
    lances.push({ col: baseCol, de: baseRow, ate: d.row });
    baseRow = d.row;
    baseCol = d.col1;
  }

  for (const d of decks) {
    for (let col = d.col0; col <= d.col1; col++) {
      world.setTileRaw(col, d.row, plank);
      // Vao livre por cima do deck: sem isto o jogador bate a cabeca no deck
      // de cima e o andar vira um tunel de rastejar.
      for (let r = d.row - VAO; r < d.row; r++) world.setTileRaw(col, r, BLOCK_IDS.AIR);
    }
  }

  // ---- 4. Construcoes -----------------------------------------------------
  // Fachadas encostadas nas paredes, com porta no nivel do piso do deck onde
  // ficam. Cada uma e uma casca oca: e a janela e a porta que dizem "aqui mora
  // gente", nao o volume.
  const casas: { col: number; row: number; w: number; h: number }[] = [];
  const niveisComPiso = [{ row: piso, col0, col1 }, ...decks];
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
  predioEspecial(world, col0 + 4, piso, 9, brick, plank, 'forja');
  // Mercado da Ponte, de Nina: barracas no meio do piso.
  for (let n = 0; n < 4; n++) barraca(world, centro - 10 + n * 6, piso, plank);
  // Quadro de missoes do Conselho: um painel de tabua na praca.
  for (let r = piso - 3; r >= piso - 5; r--) {
    world.setTileRaw(centro + 12, r, plank);
    world.setTileRaw(centro + 13, r, plank);
  }

  // ---- 5. Poco do elevador -----------------------------------------------
  // Breno considera elevador parado uma ofensa pessoal. Aqui e um vao limpo
  // com moldura, do piso ate acima do deck mais alto.
  const elevCol = col0 + 6;
  const topoElev = decks[decks.length - 1].row - VAO - 2;
  for (let row = topoElev; row <= piso; row++) {
    for (let c = elevCol; c < elevCol + 3; c++) world.setTileRaw(c, row, BLOCK_IDS.AIR);
    solido(world, elevCol - 1, row, brick, piso);
    solido(world, elevCol + 3, row, brick, piso);
  }

  // ---- 6. Horta e reservatorio -------------------------------------------
  // "Todo mundo acha que cidade subterranea vive de pedra. Vive de agua."
  for (let col = col0 + 16; col < col0 + 32; col++) {
    // A terra e o PISO da horta, nao um canteiro em cima dele. Canteiro no
    // nivel do chao e so um muro baixo com nome bonito.
    world.setTileRaw(col, piso + 1, dirt);
  }

  // ---- 7. Luz -------------------------------------------------------------
  // Blockia e a primeira coisa iluminada em 600 metros de mina. O contraste
  // com a galeria de onde o jogador saiu e metade da chegada.
  for (let col = col0 + 3; col <= col1 - 3; col += 5) {
    const t = (col - col0) / (col1 - col0);
    world.setTileRaw(col, Math.round(row0 - Math.sin(t * Math.PI) * 10) + 1, BLOCK_IDS.LAMP);
  }
  for (const d of decks) {
    for (let col = d.col0 + 2; col <= d.col1 - 2; col += 7) {
      world.setTileRaw(col, d.row - VAO + 1, BLOCK_IDS.LAMP);
    }
  }
  for (let col = col0 + 4; col <= col1 - 4; col += 6) {
    world.setTileRaw(col, piso - VAO, BLOCK_IDS.LAMP);
  }

  // ---- 8. A porta ---------------------------------------------------------
  // "Nome e cidade." A galeria chega aqui, no nivel do piso.
  const porta = cfg.gateCol;
  const portaRow = piso;
  for (let row = portaRow - 3; row <= portaRow; row++) {
    for (let col = porta; col <= col0 + 2; col++) world.setTileRaw(col, row, BLOCK_IDS.AIR);
  }
  world.setTileRaw(porta - 1, portaRow - 4, plank);
  world.setTileRaw(porta - 1, portaRow + 1, plank);

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
  calcar(world, col0, col1, piso);
  // No deck a tabua E a superficie, entao a linha onde o jogador pisa e a de
  // cima. Passar `d.row` aqui apagava a propria passarela.
  for (const d of decks) calcar(world, d.col0, d.col1, d.row - 1);

  // ---- 10. Os lances de escada --------------------------------------------
  // Por ultimo, para nada enterrar degrau. Ver o comentario dos terracos.
  for (const l of lances) lance(world, l.col, l.de, l.ate, plank);

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

/**
 * Um lance de escada em diagonal, subindo para a direita.
 *
 * Um degrau por coluna — que e o desnivel que o passo do jogador vence sozinho
 * — com VAO tiles de ar por cima de cada um. Sem o vao a escada existe e nao
 * da para usar: o jogador bate a cabeca no primeiro degrau e para.
 */
function lance(world: World, col: number, de: number, ate: number, plank: number): void {
  const passos = Math.max(0, de - ate);
  for (let n = 0; n <= passos; n++) {
    const c = col + n;
    const r = de - n;
    if (c < 1 || c >= world.width - 1) return;
    world.setTileRaw(c, r, plank);
    for (let k = 1; k <= VAO; k++) world.setTileRaw(c, r - k, BLOCK_IDS.AIR);
  }
}

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
