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
 * e o que faz uma cidade parecer cidade e alguem ter decidido onde fica a
 * praca. O `rng` entra so no ruido decorativo (qual tijolo, onde tem limo).
 *
 * Ocupa colunas 132–232, que so passaram a existir quando o mundo dobrou de
 * largura. A mina antiga nao perdeu um tile.
 */
export function carveBlockia(world: World, rng: Rng, surfaceRow: number): void {
  const cfg = CONFIG.blockia;
  const brick = blockByKey('ruin_brick')?.id ?? BLOCK_IDS.STONE;
  const plank = BLOCK_IDS.PLANK;

  const row0 = surfaceRow + cfg.depth0;
  const row1 = surfaceRow + cfg.depth1;
  const { col0, col1 } = cfg;
  const altura = row1 - row0;

  // ---- 1. A caverna ------------------------------------------------------
  // Teto abobadado e piso irregular: uma caixa retangular denunciaria na hora
  // que aquilo foi carimbado por um gerador.
  for (let col = col0; col <= col1; col++) {
    const t = (col - col0) / (col1 - col0);
    // Duas abobadas, a maior no meio da cidade.
    const abobada = Math.sin(t * Math.PI) * 9 + Math.sin(t * Math.PI * 3) * 2.5;
    const topo = Math.round(row0 - abobada);
    const piso = Math.round(row1 + Math.sin(t * Math.PI * 2.3) * 2);
    for (let row = topo; row <= piso; row++) {
      world.setTileRaw(col, row, BLOCK_IDS.AIR);
    }
    // Chao de laje da cidade inteira.
    world.setTileRaw(col, piso + 1, brick);
    world.setTileRaw(col, piso + 2, brick);
  }

  // ---- 2. Os andares ------------------------------------------------------
  // Blockia e vertical: quatro niveis de passarela ligados por escadas. E o
  // que a biblia chama de formigueiro, e o que da a silhueta da cidade.
  const niveis = 4;
  for (let n = 1; n <= niveis; n++) {
    const row = row0 + Math.round((altura * n) / (niveis + 1));
    // A passarela nao atravessa a cidade inteira: cada andar para em lugares
    // diferentes, senao viram quatro linhas paralelas sem graca.
    const de = col0 + 4 + (n % 2 === 0 ? 14 : 0);
    const ate = col1 - 4 - (n % 2 === 0 ? 0 : 18);
    for (let col = de; col <= ate; col++) {
      world.setTileRaw(col, row, plank);
    }
    // Vaos de escada: buracos na passarela, dois por andar.
    for (const vao of [de + 12 + n * 3, ate - 9 - n * 2]) {
      for (let c = vao; c < vao + 3; c++) world.setTileRaw(c, row, BLOCK_IDS.AIR);
    }
  }

  // ---- 3. Camaras residenciais -------------------------------------------
  // Blocos de tijolo encostados nas duas paredes, com janela. Sao o que se ve
  // primeiro ao entrar: parede de pedra que alguem transformou em fachada.
  for (let n = 0; n < 9; n++) {
    const esquerda = n % 2 === 0;
    const largura = 6 + (n % 3);
    const alto = 4;
    const col = esquerda ? col0 + 2 + (n % 3) * 2 : col1 - 2 - largura - (n % 3) * 2;
    const row = row0 + 4 + n * Math.floor(altura / 10);
    if (row + alto >= row1) break;
    for (let c = col; c < col + largura; c++) {
      for (let r = row; r < row + alto; r++) {
        // So a casca: dentro fica oco, e e isso que faz parecer moradia.
        const borda = c === col || c === col + largura - 1 || r === row || r === row + alto - 1;
        world.setTileRaw(c, r, borda ? brick : BLOCK_IDS.AIR);
      }
    }
    // Janela: um vao de 2 na fachada virada para a praca.
    const janela = esquerda ? col + largura - 1 : col;
    world.setTileRaw(janela, row + 1, BLOCK_IDS.AIR);
    world.setTileRaw(janela, row + 2, BLOCK_IDS.AIR);
  }

  // ---- 4. A praca ---------------------------------------------------------
  // O centro, no piso, sem nada por cima ate o teto. Uma cidade precisa de um
  // lugar onde caiba uma multidao, senao e um corredor com portas.
  const pracaC = Math.round((col0 + col1) / 2);
  for (let col = pracaC - 11; col <= pracaC + 11; col++) {
    for (let row = row0 - 6; row <= row1; row++) {
      world.setTileRaw(col, row, BLOCK_IDS.AIR);
    }
    world.setTileRaw(col, row1 + 1, plank);
  }

  // ---- 5. Poco do elevador ------------------------------------------------
  // Breno Torga considera qualquer elevador parado uma ofensa pessoal, e a
  // rede vertical e o orgulho da cidade. Aqui ele e um vao limpo com moldura.
  const elevCol = col1 - 14;
  for (let row = row0 - 8; row <= row1; row++) {
    for (let c = elevCol; c < elevCol + 3; c++) world.setTileRaw(c, row, BLOCK_IDS.AIR);
    world.setTileRaw(elevCol - 1, row, brick);
    world.setTileRaw(elevCol + 3, row, brick);
  }

  // ---- 6. Horta e reservatorio -------------------------------------------
  // "Todo mundo acha que cidade subterranea vive de pedra. Vive de agua."
  const hortaCol = col0 + 8;
  for (let col = hortaCol; col < hortaCol + 16; col++) {
    world.setTileRaw(col, row1 - 1, blockByKey('dirt')?.id ?? brick);
    world.setTileRaw(col, row1, blockByKey('dirt')?.id ?? brick);
    if (rng.next() < 0.3) world.setTileRaw(col, row1 - 2, BLOCK_IDS.AIR);
  }

  // ---- 7. A porta ---------------------------------------------------------
  // "Nome e cidade." A galeria chega aqui, e a cidade comeca do outro lado.
  const porta = cfg.gateCol;
  const portaRow = surfaceRow + cfg.corridorDepth;
  for (let row = portaRow - 3; row <= portaRow; row++) {
    for (let col = porta; col < col0; col++) world.setTileRaw(col, row, BLOCK_IDS.AIR);
  }
  // Moldura, nao tapume: a passagem fica ABERTA e a madeira so a emoldura em
  // cima e embaixo. Uma coluna inteira de tabua aqui fechava o corredor e
  // transformava a chegada na cidade num muro sem aviso.
  world.setTileRaw(porta - 1, portaRow - 4, plank);
  world.setTileRaw(porta - 1, portaRow + 1, plank);
  for (let row = portaRow - 3; row <= portaRow; row++) {
    world.setTileRaw(porta - 1, row, BLOCK_IDS.AIR);
  }
}

/**
 * A galeria das Galerias Livres: liga o poco principal a porta de Blockia.
 *
 * Horizontal e longa de proposito. Depois de 600 m descendo, andar de lado
 * por 60 metros e o sinal fisico de que a mina acabou e comecou outra coisa.
 */
export function carveCityCorridor(world: World, rng: Rng, surfaceRow: number): void {
  const cfg = CONFIG.blockia;
  const row = surfaceRow + cfg.corridorDepth;
  const de = CONFIG.base.centerCol + CONFIG.base.layout.shaft;
  for (let col = de; col <= cfg.gateCol; col++) {
    // Ondula um pouco: um corredor perfeitamente reto de 60 tiles e um cano.
    const off = Math.round(Math.sin((col - de) * 0.11) * 2);
    for (let r = row + off - 2; r <= row + off + 1; r++) {
      world.setTileRaw(col, r, BLOCK_IDS.AIR);
    }
    // Escoramento de madeira de tantos em tantos metros: alguem manteve isto.
    if ((col - de) % 9 === 0 && rng.next() < 0.8) {
      world.setTileRaw(col, row + off - 3, BLOCK_IDS.PLANK);
      world.setTileRaw(col, row + off + 2, BLOCK_IDS.PLANK);
    }
  }
}
