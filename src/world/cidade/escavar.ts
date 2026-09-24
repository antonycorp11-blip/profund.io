import { BLOCK_IDS } from '../../data/blocks';
import type { CidadePlanta, PisoDef } from '../../data/cidade';
import type { World } from '../World';
import {
  chaoEm,
  colunaDe,
  escadaLinhas,
  linhaDe,
  piso,
  portaRect,
  salaRect,
  tetoEm,
} from './geometria';

/** Folga livre acima de qualquer piso, em tiles: corpo (2) e mais um. */
const VAO = 3;
/** Espessura da casca de rocha da cidade em volta da caverna. */
const CASCA = 3;

function materialDoPiso(p: PisoDef): number {
  return p.tipo === 'tabua' ? BLOCK_IDS.CITY_WOOD : BLOCK_IDS.CITY_STONE;
}

/**
 * Escava uma cidade a partir da planta.
 *
 * A ordem importa e cada passo diz por que esta onde esta — a Blockia antiga
 * quebrou tres vezes por ordem errada (calcamento tapando escada, escada
 * enterrada por casa, porta reaberta pelo calcamento).
 *
 *  1. Casca: tudo em volta da caverna vira rocha da cidade, indestrutivel.
 *     Sem isto a cidade era cavavel de fora para dentro, e a galeria alagada
 *     tinha porta dos fundos.
 *  2. A caverna: do teto ate o chao, seguindo o perfil dos pisos de chao.
 *  3. Agua: o poco embaixo da passarela do reservatorio.
 *  4. Passarelas e balcoes: so o tile do piso e o vao em cima. Nada pousa
 *     solido nas linhas do corpo — predio e mobilia sao desenho, nao tile.
 *  5. Salas nas paredes.
 *  6. Escadas de mao, por ultimo entre as coisas de andar: nada as enterra.
 *  7. Saida inferior e porta, seladas.
 *
 * O estado que muda com a historia (ponte, galeria, saida, porta) NAO e
 * decidido aqui: `aplicarEstadoCidade` roda no carregamento, com as flags.
 */
export function escavarCidade(world: World, planta: CidadePlanta): void {
  const sup = world.surfaceRow;
  const largura = planta.col1 - planta.col0;
  const topoCasca = tetoEm(planta, sup, largura / 2) - 4 - CASCA;
  const fundoCasca = linhaDe(sup, planta.fundo) + 2 + CASCA;

  // ---- 1. Casca --------------------------------------------------------
  for (let col = planta.col0 - CASCA; col <= planta.col1 + CASCA; col++) {
    for (let row = topoCasca; row <= fundoCasca; row++) {
      if (world.inBounds(col, row)) world.setTileRaw(col, row, BLOCK_IDS.CITY_ROCK);
    }
  }

  // ---- 2. A caverna ----------------------------------------------------
  for (let x = 0; x <= largura; x++) {
    const col = colunaDe(planta, x);
    const chao = chaoEm(planta, x);
    if (!chao) continue;
    const pe = linhaDe(sup, chao.pe);
    for (let row = tetoEm(planta, sup, x); row <= pe; row++) world.setTileRaw(col, row, BLOCK_IDS.AIR);
    world.setTileRaw(col, pe + 1, materialDoPiso(chao));
  }

  // ---- 3. Agua ---------------------------------------------------------
  // O poco fica embaixo de uma passarela: e desenho, ninguem entra nele.
  for (const a of planta.agua) {
    for (let x = a.x0; x <= a.x1; x++) {
      for (let pe = a.topo; pe <= a.fundo; pe++) {
        world.setTileRaw(colunaDe(planta, x), linhaDe(sup, pe), BLOCK_IDS.AIR);
      }
    }
  }

  // ---- 4. Passarelas, balcoes e a ponte --------------------------------
  for (const p of planta.pisos) {
    if (p.chao) continue;
    const pe = linhaDe(sup, p.pe);
    for (let x = p.x0; x <= p.x1; x++) {
      const col = colunaDe(planta, x);
      world.setTileRaw(col, pe + 1, materialDoPiso(p));
      for (let k = 0; k < VAO; k++) world.setTileRaw(col, pe - k, BLOCK_IDS.AIR);
    }
  }

  // ---- 5. Salas nas paredes --------------------------------------------
  for (const sala of planta.salas) {
    const r = salaRect(planta, sup, sala);
    // A sala fica fora da caverna, na rocha comum: sem casca propria ela
    // tinha porta dos fundos — dava para cavar ate as caixas por fora e
    // pular a bomba.
    for (let col = r.col0 - CASCA; col <= r.col1 + CASCA; col++) {
      for (let row = r.row0 - CASCA; row <= r.row1 + CASCA; row++) {
        if (world.inBounds(col, row) && world.getTile(col, row) !== BLOCK_IDS.AIR) {
          world.setTileRaw(col, row, BLOCK_IDS.CITY_ROCK);
        }
      }
    }
    for (let col = r.col0; col <= r.col1; col++) {
      for (let row = r.row0; row <= r.row1; row++) world.setTileRaw(col, row, BLOCK_IDS.AIR);
      world.setTileRaw(col, r.row1 + 1, BLOCK_IDS.CITY_STONE);
    }
  }

  // ---- 6. Escadas de mao -----------------------------------------------
  for (const e of planta.escadas) {
    const { topo, base } = escadaLinhas(planta, sup, e);
    const col = colunaDe(planta, e.x);
    for (let row = topo; row <= base; row++) world.setTileRaw(col, row, BLOCK_IDS.LADDER);
  }

  // ---- 7. Saida inferior -----------------------------------------------
  // Um poco com escada ate abaixo da cidade, e uma camara pequena no fim: de
  // la para baixo e mina de novo, e a regra da picareta da cidade vale.
  if (planta.saida) {
    const s = planta.saida;
    const chao = linhaDe(sup, piso(planta, s.piso).pe);
    const fim = linhaDe(sup, s.ate);
    for (let x = s.x; x < s.x + s.largura; x++) {
      const col = colunaDe(planta, x);
      for (let row = chao + 1; row <= fim; row++) world.setTileRaw(col, row, BLOCK_IDS.AIR);
    }
    const meio = colunaDe(planta, s.x + Math.floor(s.largura / 2));
    for (let row = chao + 1; row <= fim; row++) world.setTileRaw(meio, row, BLOCK_IDS.LADDER);
    for (let x = s.x - 3; x < s.x + s.largura + 3; x++) {
      for (let row = fim - 3; row <= fim; row++) {
        const col = colunaDe(planta, x);
        if (world.getTile(col, row) !== BLOCK_IDS.LADDER) world.setTileRaw(col, row, BLOCK_IDS.AIR);
      }
      world.setTileRaw(colunaDe(planta, x), fim + 1, BLOCK_IDS.STONE);
    }
  }

  // ---- 8. A porta: a passagem da galeria de chegada ---------------------
  const pr = portaRect(planta, sup);
  for (let col = pr.col0 - 4; col <= pr.col1; col++) {
    for (let row = pr.row0; row <= pr.row1; row++) world.setTileRaw(col, row, BLOCK_IDS.AIR);
    // Fora da caverna o chao e rocha com arte de rocha (a laje da cidade e
    // desenhada so dentro dela; aqui ficaria um buraco pintado).
    world.setTileRaw(col, pr.row1 + 1, col < planta.col0 ? BLOCK_IDS.CITY_ROCK : BLOCK_IDS.CITY_STONE);
  }
}

/**
 * O que muda na cidade com a historia, aplicado sobre o mundo gerado.
 *
 * Roda na geracao (estado inicial) e de novo sempre que uma flag destas muda
 * ou o save carrega. O mundo e regerado do zero a cada carga, entao uma ponte
 * consertada e reconstruida aqui, e nao guardada como tile no save.
 */
export function aplicarEstadoCidade(world: World, planta: CidadePlanta, flag: (id: string) => boolean): void {
  const sup = world.surfaceRow;

  if (planta.ponteQuebrada) {
    const q = planta.ponteQuebrada;
    const p = piso(planta, q.piso);
    const row = linhaDe(sup, p.pe) + 1;
    const inteira = flag(q.flag);
    for (let x = q.x0; x <= q.x1; x++) {
      world.setTileRaw(colunaDe(planta, x), row, inteira ? materialDoPiso(p) : BLOCK_IDS.AIR);
    }
  }

  for (const sala of planta.salas) {
    if (!sala.alagadaAte) continue;
    const r = salaRect(planta, sup, sala);
    const seca = flag(sala.alagadaAte);
    // A agua represada e a boca da sala: um muro de agua que o jogador nao
    // atravessa enquanto a bomba nao roda.
    for (let row = r.row0; row <= r.row1; row++) {
      world.setTileRaw(r.entrada, row, seca ? BLOCK_IDS.AIR : BLOCK_IDS.CITY_WATER);
    }
  }

  if (planta.saida) {
    const s = planta.saida;
    const row = linhaDe(sup, piso(planta, s.piso).pe) + 1;
    const aberta = flag(s.flag);
    const meio = s.x + Math.floor(s.largura / 2);
    for (let x = s.x; x < s.x + s.largura; x++) {
      const col = colunaDe(planta, x);
      // Fechado, e um alcapao de tabua (desenhado pela cidade), indestrutivel.
      if (aberta) world.setTileRaw(col, row, x === meio ? BLOCK_IDS.LADDER : BLOCK_IDS.AIR);
      else world.setTileRaw(col, row, BLOCK_IDS.CITY_WOOD);
    }
  }

  const pr = portaRect(planta, sup);
  const aberta = flag(`porta_${planta.id}`);
  for (let row = pr.row0; row <= pr.row1; row++) {
    for (let col = pr.col0; col <= pr.col1; col++) {
      world.setTileRaw(col, row, aberta ? BLOCK_IDS.AIR : BLOCK_IDS.SEAL);
    }
  }
  world.markAllDirty();
}

/** As flags que mudam o mapa da cidade: quem as liga precisa reaplicar o estado. */
export function flagsDoEstado(planta: CidadePlanta): Set<string> {
  const out = new Set<string>([`porta_${planta.id}`]);
  if (planta.ponteQuebrada) out.add(planta.ponteQuebrada.flag);
  if (planta.saida) out.add(planta.saida.flag);
  for (const s of planta.salas) if (s.alagadaAte) out.add(s.alagadaAte);
  return out;
}
