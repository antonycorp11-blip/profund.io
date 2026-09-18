import { BLOCK_IDS, blockByKey, blockDef } from '../data/blocks';
import { LAYERS, layerAt } from '../data/layers';
import { bossForLayer } from '../data/creatures';
import { GATE_LAYERS, gateArenaCol, gateBandRows, gateLayerDef } from '../data/gates';
import { STORY_GATES, storyGateRows } from '../data/storyGates';
import { CONFIG } from '../data/config';
import { carveBlockia, carveCityCorridor } from './Blockia';
import { carvePostoNove } from './PostoNove';
import { carveBaseCamps } from './BaseCampCarve';
import { CLUES, RESCUE_NPCS } from '../data/story';
import { SCROLLS } from '../data/scrolls';
import { fbm2d, hash2d, Rng } from '../core/rng';
import type { World } from './World';

export interface GeneratedWorldInfo {
  spawnX: number;
  spawnY: number;
  /** Coluna do poco de entrada da mina. */
  shaftCol: number;
  /** Linha do piso da base. */
  baseFloorRow: number;
  /** Coluna do deposito de entrega. */
  depotCol: number;
  /** Um por camada com selo: onde a arena do chefe ficou e quem guarda ela. */
  gates: { layerId: string; bossId: string; col: number; row: number }[];
}

/**
 * Geracao procedural do mundo + salas feitas a mao.
 * Deterministica a partir de CONFIG.world.seed: o save guarda apenas as diferencas.
 */
export function generateWorld(world: World): GeneratedWorldInfo {
  const seed = CONFIG.world.seed;
  const rng = new Rng(seed);
  const { width, height, surfaceRow } = world;

  // ---- 1. Relevo e camadas base -------------------------------------------
  const surfaceHeights = new Int32Array(width);
  for (let col = 0; col < width; col++) {
    const n = fbm2d(col * 0.06, 0, seed, 3);
    surfaceHeights[col] = surfaceRow + Math.round((n - 0.5) * 5);
  }

  // Plataforma da base: achatada ao redor do centro.
  const baseHalf = CONFIG.base.halfWidth;
  const baseCenter = CONFIG.base.centerCol;
  const baseFloorRow = surfaceRow;
  for (let col = baseCenter - baseHalf; col <= baseCenter + baseHalf; col++) {
    if (col < 0 || col >= width) continue;
    surfaceHeights[col] = baseFloorRow;
  }
  // Transicao suave nas bordas da plataforma.
  for (let k = 1; k <= 4; k++) {
    const l = baseCenter - baseHalf - k;
    const r = baseCenter + baseHalf + k;
    if (l >= 0) surfaceHeights[l] = Math.round((surfaceHeights[l] + baseFloorRow) / 2);
    if (r < width) surfaceHeights[r] = Math.round((surfaceHeights[r] + baseFloorRow) / 2);
  }

  for (let col = 0; col < width; col++) {
    const top = surfaceHeights[col];
    for (let row = 0; row < height; row++) {
      let id: number = BLOCK_IDS.AIR;
      if (row === height - 1 || col === 0 || col === width - 1) {
        id = BLOCK_IDS.BEDROCK;
      } else if (row === top) {
        id = BLOCK_IDS.GRASS;
      } else if (row > top) {
        const depth = world.depthOfRow(row);
        if (depth < 6) id = BLOCK_IDS.DIRT;
        else if (depth < 120) id = BLOCK_IDS.STONE;
        else id = BLOCK_IDS.DARKSTONE;
      }
      world.setTileRaw(col, row, id);
    }
  }

  // ---- 2. Cavernas ---------------------------------------------------------
  // O tamanho da caverna vem da camada: descer precisa MUDAR o espaco, nao so a cor.
  for (let col = 1; col < width - 1; col++) {
    for (let row = surfaceHeights[col] + 4; row < height - 1; row++) {
      const layer = layerAt(world.depthOfRow(row));
      const n = fbm2d(col * 0.11, row * 0.11, seed + 4242, 3);
      const threshold = 0.655 - layer.caveBonus;
      if (n > threshold) world.setTileRaw(col, row, BLOCK_IDS.AIR);
    }
  }

  // ---- 2b. Faixa de transicao entre camadas --------------------------------
  // Uma linha de rocha diferente marca a entrada: da para VER que mudou de andar.
  for (const layer of LAYERS) {
    if (!layer.generated || !layer.strata || layer.minDepth <= 0) continue;
    const id = blockByKey(layer.strata)?.id;
    if (id === undefined) continue;
    const baseRow = surfaceRow + layer.minDepth;
    for (let col = 1; col < width - 1; col++) {
      const wobble = Math.round((fbm2d(col * 0.13, layer.minDepth, seed + 77, 2) - 0.5) * 4);
      for (let k = 0; k < 2; k++) {
        const row = baseRow + wobble + k;
        if (row <= surfaceHeights[col] + 2 || row >= height - 2) continue;
        if (world.getTile(col, row) === BLOCK_IDS.AIR) continue;
        world.setTileRaw(col, row, id);
      }
    }
  }

  // ---- 3. Veios de minerio -------------------------------------------------
  // Cada camada tem sua propria tabela: e o que faz 30 m e 175 m renderem
  // coisas diferentes, em vez de "mais do mesmo, so que mais escuro".
  for (let col = 1; col < width - 1; col++) {
    for (let row = surfaceHeights[col] + 2; row < height - 1; row++) {
      const tile = world.getTile(col, row);
      if (tile !== BLOCK_IDS.STONE && tile !== BLOCK_IDS.DARKSTONE && tile !== BLOCK_IDS.DIRT) {
        continue;
      }
      const layer = layerAt(world.depthOfRow(row));
      for (const ore of layer.ores) {
        const def = blockByKey(ore.key);
        if (!def) continue;
        const roll = hash2d(col, row, seed + def.id * 7919);
        if (roll < ore.chance) {
          growVein(world, col, row, def.id, rng.int(ore.sizeMin, ore.sizeMax), rng);
          break;
        }
      }
    }
  }

  // ---- 3b. Selos entre biomas ----------------------------------------------
  // Uma faixa indestrutivel na fronteira de cada camada, com uma arena
  // escavada no meio: a UNICA passagem e enfrentar o chefe. O selo inteiro
  // (nao so a arena) so vira ar quando o BiomeGate confirma chefe morto +
  // todos os mineiros daquela camada resgatados — ver World.openGateBand.
  const gates: { layerId: string; bossId: string; col: number; row: number }[] = [];
  const arenaCol = gateArenaCol();
  const arenaHalf = Math.floor(CONFIG.gate.arenaWidth / 2);
  const entranceHalf = Math.floor(CONFIG.gate.entranceWidth / 2);
  for (const layerId of GATE_LAYERS) {
    const layer = gateLayerDef(layerId);
    const boss = bossForLayer(layerId);
    if (!boss) continue; // sem chefe cadastrado, sem selo — nao deveria acontecer
    const { row0, row1 } = gateBandRows(surfaceRow, layer);
    if (row0 <= 0 || row1 >= height - 1) continue; // fora do mundo, ignora

    // Faixa inteira, indestrutivel, na largura toda.
    for (let col = 1; col < width - 1; col++) {
      for (let row = row0; row <= row1; row++) {
        world.setTileRaw(col, row, BLOCK_IDS.SEAL);
      }
    }
    // Arena: oca por dentro, paredes e piso continuam selados ate a vitoria.
    for (let col = arenaCol - arenaHalf; col <= arenaCol + arenaHalf; col++) {
      for (let row = row0 + 1; row <= row1 - 1; row++) {
        world.setTileRaw(col, row, BLOCK_IDS.AIR);
      }
    }
    // Entrada diggable no teto da arena: rocha normal da propria camada de
    // cima, para o jogador cavar e cair dentro em vez de esbarrar em selo.
    const entranceRock = blockByKey(layer.rockKey)?.id ?? BLOCK_IDS.STONE;
    for (let col = arenaCol - entranceHalf; col <= arenaCol + entranceHalf; col++) {
      world.setTileRaw(col, row0, entranceRock);
    }

    gates.push({
      layerId,
      bossId: boss.id,
      col: arenaCol,
      row: row1 - 1, // encosta no piso selado — o chefe guarda a saida
    });
  }

  // ---- 3b2. A trilha do Jonas ---------------------------------------------
  // O primeiro mineiro preso nao pode ser um achado por acaso. Ele grita (ver
  // RescueNpc.listen), e daqui sai uma galeria ANTIGA, meio desabada, que
  // serpenteia do poco da base ate perto dele.
  //
  // Ela nao chega ate o Jonas de proposito: para nos ultimos metros, e o
  // jogador cava o resto guiado so pela voz. Uma trilha que termina na porta
  // entregaria o final; uma que termina perto transforma o ultimo trecho no
  // momento em que ele percebe que esta a um metro de alguem vivo.
  carveTrail(world, rng, surfaceRow);

  // ---- 3b3. Blockia ------------------------------------------------------
  // Esculpida ANTES dos veios prosperos para que a cidade nao ganhe minerio
  // brilhando dentro das casas, e depois do selo para nao furar barreira.
  carvePostoNove(world, surfaceRow);
  carveBaseCamps(world, surfaceRow);
  carveCityCorridor(world, rng, surfaceRow);
  carveBlockia(world, rng, surfaceRow);

  // ---- 3b4. Pergaminhos ---------------------------------------------------
  // Uma cavidade pequena em volta de cada um. Sem isso o papel nasce dentro da
  // pedra: existe, brilha, e o jogador nunca encosta nele.
  for (const sc of SCROLLS) {
    const row = surfaceRow + sc.depth;
    for (let c = sc.col - 2; c <= sc.col + 2; c++) {
      for (let r = row - 2; r <= row + 1; r++) {
        if (c < 1 || c >= width - 1 || r < 1 || r >= height - 1) continue;
        if (world.getTile(c, r) === BLOCK_IDS.SEAL) continue;
        world.setTileRaw(c, r, BLOCK_IDS.AIR);
      }
    }
    // Chao, para o papel nao ficar no ar.
    for (let c = sc.col - 2; c <= sc.col + 2; c++) {
      if (!world.isSolid(c, row + 2)) world.setTileRaw(c, row + 2, BLOCK_IDS.STONE);
    }
  }

  // ---- 3c. Veios prosperos espalhados -------------------------------------
  // Um punhado de minerios ja nasce com aura, permanentes. Sao a recompensa de
  // quem anda de lado em vez de so cavar reto para baixo — e o sorteio sai do
  // `rng` semeado, entao o mesmo mundo sempre tem os mesmos.
  for (let row = surfaceRow; row < height; row++) {
    for (let col = 1; col < width - 1; col++) {
      const id = world.getTile(col, row);
      if (id === BLOCK_IDS.AIR) continue;
      if (!blockDef(id).tags.includes('ore')) continue;
      if (rng.next() < CONFIG.rich.worldChance) world.markRich(col, row, Infinity);
    }
  }

  // ---- 4. Base na superficie ----------------------------------------------
  const shaftCol = baseCenter + CONFIG.base.layout.shaft;
  const depotCol = baseCenter + CONFIG.base.layout.depot;

  // Piso de tabuas da base.
  for (let col = baseCenter - baseHalf; col <= baseCenter + baseHalf; col++) {
    if (col < 0 || col >= width) continue;
    world.setTileRaw(col, baseFloorRow, BLOCK_IDS.PLANK);
  }

  /*
   * ENTRADA DA MINA: uma GALERIA que entra de lado e desce, e nao um buraco.
   *
   * Era um poco vertical de tres tiles, cavado reto para baixo a partir do
   * piso da base — e um poco assim nao e entrada de mina, e um alcapao. Mina de
   * verdade ataca a encosta pela lateral e vai descendo: e assim que se leva
   * vagonete, escada e gente para dentro.
   *
   * Muda tambem o que o primeiro minuto ENSINA. Num buraco a unica coisa a
   * fazer e cair; numa galeria em degraus o jogador ANDA para dentro da
   * montanha, e a descida vira uma escolha em vez de uma queda.
   *
   * Cada degrau desce um tile e avanca `AVANCO`, o que deixa a subida possivel
   * a pe: degrau de um tile e o que o movimento ja sobe andando (ver
   * tools/climb-probe). Com dois tiles o jogador ficaria preso la dentro.
   *
   * O teto e o que faz virar galeria e nao vala: so a altura livre e escavada,
   * e a rocha acima dela fica de pe.
   */
  const ALTURA_LIVRE = 3;
  const AVANCO = 2;
  for (let degrau = 0; degrau <= CONFIG.base.shaftDepth; degrau++) {
    const pisoRow = baseFloorRow + degrau;
    const colIni = shaftCol + degrau * AVANCO;
    for (let col = colIni; col < colIni + AVANCO; col++) {
      if (col < 0 || col >= width) continue;
      // O degrau em que se pisa: tabua, porque a galeria foi CONSTRUIDA.
      world.setTileRaw(col, pisoRow, BLOCK_IDS.PLANK);
      for (let r = pisoRow - 1; r >= pisoRow - ALTURA_LIVRE; r--) {
        world.setTileRaw(col, r, BLOCK_IDS.AIR);
      }
    }
  }

  // ---- 4b. Selos de historia ----------------------------------------------
  // Faixa fina e indestrutivel dentro da propria camada, sem arena e sem
  // entrada: nao se passa lutando, se passa tendo achado. Ver /data/storyGates.
  for (const sg of STORY_GATES) {
    const { row0, row1 } = storyGateRows(surfaceRow, sg);
    if (row0 <= 0 || row1 >= height - 1) continue;
    for (let col = 1; col < width - 1; col++) {
      for (let row = row0; row <= row1; row++) {
        world.setTileRaw(col, row, BLOCK_IDS.SEAL);
      }
    }
  }

  // ---- 5. Salas feitas a mao ----------------------------------------------
  for (const clue of CLUES) {
    if (clue.marcas) trilhaDeMarcas(world, shaftCol, clue.col, clue.row);
    carveRoom(world, clue.col, clue.row, clue.roomW, clue.roomH, BLOCK_IDS.RUIN_BRICK);
  }
  for (const npc of RESCUE_NPCS) {
    carveRoom(world, npc.col, npc.row, npc.roomW, npc.roomH, BLOCK_IDS.STONE);
    sealRing(world, npc.col, npc.row, Math.max(npc.roomW, npc.roomH));
  }

  return {
    spawnX: (baseCenter + CONFIG.base.layout.depot) * world.tileSize + world.tileSize / 2,
    spawnY: (baseFloorRow - 1) * world.tileSize + world.tileSize / 2,
    shaftCol,
    baseFloorRow,
    depotCol,
    gates,
  };
}

/** Cresce um blob de minerio a partir de uma semente. */
function growVein(world: World, col: number, row: number, oreId: number, size: number, rng: Rng): void {
  let cx = col;
  let cy = row;
  for (let i = 0; i < size; i++) {
    const t = world.getTile(cx, cy);
    if (t === BLOCK_IDS.STONE || t === BLOCK_IDS.DARKSTONE || t === BLOCK_IDS.DIRT) {
      world.setTileRaw(cx, cy, oreId);
    }
    cx += rng.int(-1, 1);
    cy += rng.int(-1, 1);
    if (!world.inBounds(cx, cy)) return;
  }
}

/**
 * Escava uma sala retangular centrada em (col,row) e coloca uma borda de `wallId`.
 * O piso fica sempre na linha `row` (o objeto/NPC fica em cima dela).
 */
/**
 * A trilha de marcas do Santiago ate uma sala.
 *
 * Tijolo antigo de dois em dois tiles, na altura da sala, do poco principal ate
 * a porta dela. Cavando naquela profundidade o jogador esbarra numa pedra que
 * obviamente foi POSTA ali, e seguir a fileira leva ao lugar — que e exatamente
 * o que o pai escreveu que fazia.
 *
 * So troca pedra por marca: onde ja e ar, nao poe nada. Marca flutuando no vao
 * de uma caverna denunciaria que foi o gerador, e nao um homem com uma picareta.
 */
function trilhaDeMarcas(world: World, deCol: number, ateCol: number, row: number): void {
  const passo = deCol > ateCol ? -4 : 4;
  for (let c = deCol; passo > 0 ? c <= ateCol : c >= ateCol; c += passo) {
    for (let r = row - 1; r <= row; r++) {
      if (!world.inBounds(c, r)) continue;
      const atual = world.getTile(c, r);
      if (atual === BLOCK_IDS.AIR || atual === BLOCK_IDS.BEDROCK) continue;
      world.setTileRaw(c, r, BLOCK_IDS.RUIN_BRICK);
    }
  }
}

function carveRoom(world: World, col: number, row: number, w: number, h: number, wallId: number): void {
  const halfW = Math.floor(w / 2);
  const c0 = col - halfW;
  const c1 = col + halfW;
  const r0 = row - (h - 1);
  const r1 = row;

  for (let r = r0 - 1; r <= r1 + 1; r++) {
    for (let c = c0 - 1; c <= c1 + 1; c++) {
      if (!world.inBounds(c, r)) continue;
      const isBorder = r < r0 || r > r1 || c < c0 || c > c1;
      if (isBorder) {
        if (world.getTile(c, r) !== BLOCK_IDS.BEDROCK) world.setTileRaw(c, r, wallId);
      } else {
        world.setTileRaw(c, r, BLOCK_IDS.AIR);
      }
    }
  }
}

/** Garante que a sala esteja realmente lacrada (nenhum tunel natural chegando). */
function sealRing(world: World, col: number, row: number, span: number): void {
  const pad = Math.ceil(span / 2) + 2;
  for (let r = row - pad; r <= row + pad; r++) {
    for (let c = col - pad; c <= col + pad; c++) {
      if (!world.inBounds(c, r)) continue;
      const ring =
        Math.abs(c - col) >= pad - 1 || r <= row - pad + 1 || r >= row + pad - 1;
      if (ring && world.getTile(c, r) === BLOCK_IDS.AIR) {
        world.setTileRaw(c, r, BLOCK_IDS.STONE);
      }
    }
  }
}


/**
 * Galeria antiga que leva ao primeiro mineiro preso.
 *
 * Serpenteia em vez de descer reto (um corredor reto e um elevador, nao uma
 * mina) e vem com trechos desabados: o jogador anda, esbarra em entulho, quebra
 * pouca coisa e segue. E o que faz parecer um lugar que existiu antes dele.
 */
function carveTrail(world: World, rng: Rng, surfaceRow: number): void {
  const jonas = RESCUE_NPCS.find((n) => n.id === 'npc_jonas');
  if (!jonas) return;

  const inicio = CONFIG.base.centerCol + CONFIG.base.layout.shaft;
  const fimRow = jonas.row - 8; // para antes dele: os ultimos metros sao do ouvido
  let col = inicio;
  let row = surfaceRow + CONFIG.base.shaftDepth + 4;
  // Serpenteia sempre para o lado do Jonas, mas sem mirar nele diretamente.
  let dir: 1 | -1 = jonas.col > inicio ? 1 : -1;

  while (row < fimRow) {
    // Um trecho horizontal, depois uma descida. O tamanho varia para o ritmo
    // nao virar escada.
    const largura = rng.int(4, 11);
    for (let n = 0; n < largura; n++) {
      col += dir;
      if (col < 4 || col > world.width - 5) {
        dir = -dir as 1 | -1;
        col += dir * 2;
      }
      carveCell(world, rng, col, row);
    }
    const queda = rng.int(5, 12);
    for (let n = 0; n < queda && row < fimRow; n++) {
      row++;
      carveCell(world, rng, col, row);
    }
    // Vira para o lado do Jonas com mais frequencia do que para longe: a
    // trilha vagueia, mas vagueia na direcao certa.
    if (rng.next() < 0.28) dir = -dir as 1 | -1;
    else dir = (jonas.col > col ? 1 : -1) as 1 | -1;
  }
}

/**
 * Abre um pedaco de galeria de 2 tiles de altura.
 *
 * Uma em cada seis celulas fica entupida: sem isso o caminho e um corredor
 * limpo e o jogador so anda. Com o entulho ele ainda usa a picareta, e a
 * galeria parece velha em vez de recem-cavada.
 */
function carveCell(world: World, rng: Rng, col: number, row: number): void {
  if (col < 1 || col >= world.width - 1 || row < 1 || row >= world.height - 1) return;
  if (rng.next() < 0.17) return;
  // O selo nunca cede a uma galeria antiga: a trilha morre nele. Ver essa
  // parede cortar um tunel que claramente continuava do outro lado e a melhor
  // apresentacao possivel da regra da barreira.
  for (const r of [row, row - 1]) {
    if (world.getTile(col, r) === BLOCK_IDS.SEAL) continue;
    world.setTileRaw(col, r, BLOCK_IDS.AIR);
  }
}
