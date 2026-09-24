/*
 * Sonda das acoes de missao: da para ficar de pe ao alcance de cada uma?
 *
 *   npm run acoes
 *
 * POR QUE PRECISA DE SONDA.
 *
 * Acao de missao nao tem desenho: e um ponto invisivel no mapa que acende um
 * aviso quando o jogador chega perto. Se o ponto cai dentro da rocha, nada
 * quebra, nada avisa — a etapa so nunca termina. Na primeira versao, seis das
 * nove acoes estavam assim, medidas neste mundo gerado: o gerador do Posto
 * Nove a 34 tiles do posto, o guincho dentro da faixa selada, e as tres obras
 * de Blockia fora da cidade. Tres delas eram obrigatorias, e a campanha
 * travava sem nenhum erro.
 *
 * Aqui o mundo e gerado de verdade e os moradores sao posicionados pela MESMA
 * funcao que o jogo usa.
 */
import { CONFIG } from '../src/data/config';
import { World } from '../src/world/World';
import { generateWorld } from '../src/world/WorldGen';
import { posicionarMoradores } from '../src/world/Blockia';
import { BLOCKIA_NPCS } from '../src/data/blockia';
import { MISSION_ACTIONS } from '../src/data/missionActions';
import { missionActionTile } from '../src/systems/MissionActions';
import { ZONE_TRIGGERS, POSTO_DEFESA } from '../src/data/campaignBeats';
import { CampaignBeats } from '../src/systems/CampaignBeats';
import { RESCUE_NPCS } from '../src/data/story';

let falhas = 0;
const ok = (cond: boolean, titulo: string, detalhe = ''): boolean => {
  if (cond) console.log(`  ok   ${titulo}`);
  else {
    falhas++;
    console.log(`  FALHA ${titulo}${detalhe ? ` — ${detalhe}` : ''}`);
  }
  return cond;
};

const world = new World();
generateWorld(world);
const moradores = posicionarMoradores(world, BLOCKIA_NPCS);
const ts = CONFIG.tileSize;
const alcance = CONFIG.player.interactRadius;

/*
 * "De pe ao alcance": existe um tile de pe cujo centro do corpo fica dentro do
 * raio de toque do centro da acao. O corpo ocupa o tile dos pes e o de cima,
 * entao o centro dele e a borda de cima do tile dos pes — a mesma conta que o
 * `findInteractable` faz com `player.cx/cy`.
 */
function pontoDePe(col: number, row: number): { col: number; row: number; dist: number } | null {
  const cx = (col + 0.5) * ts;
  const cy = (row + 0.5) * ts;
  let melhor: { col: number; row: number; dist: number } | null = null;
  const raio = Math.ceil(alcance / ts) + 1;
  for (let r = row - raio; r <= row + raio; r++) {
    for (let c = col - raio; c <= col + raio; c++) {
      if (world.isSolid(c, r) || world.isSolid(c, r - 1) || !world.isSolid(c, r + 1)) continue;
      const dist = Math.hypot((c + 0.5) * ts - cx, r * ts - cy);
      if (dist <= alcance && (!melhor || dist < melhor.dist)) melhor = { col: c, row: r, dist };
    }
  }
  return melhor;
}

console.log('\nTODA ACAO TEM ONDE FICAR DE PE AO ALCANCE');
for (const a of MISSION_ACTIONS) {
  const tile = missionActionTile(a, world, moradores);
  if (!ok(tile !== null, `${a.id}: tem posicao`, a.perto ? `morador ${a.perto.npc} nao existe ou nao ha chao perto` : 'sem col/row')) continue;
  const pe = pontoDePe(tile!.col, tile!.row);
  ok(
    pe !== null,
    `${a.id} (${tile!.col}, ${tile!.row - world.surfaceRow} m): da para ficar de pe ao alcance`,
    `tile ${world.isSolid(tile!.col, tile!.row) ? 'solido' : 'de ar'}, nenhum chao a ${alcance}px`
  );
}

console.log('\nACAO ANCORADA FICA NO MESMO PISO DO MORADOR, SEM DISPUTAR O TOQUE');
for (const a of MISSION_ACTIONS) {
  if (!a.perto) continue;
  const npc = moradores.get(a.perto.npc);
  const tile = missionActionTile(a, world, moradores);
  if (!npc || !tile) continue;
  ok(tile.row === npc.row, `${a.id}: no piso de ${a.perto.npc}`, `morador na linha ${npc.row}, acao na ${tile.row}`);
  // Andar de um ao outro sem pular: ar na altura do corpo e chao embaixo.
  let andavel = true;
  for (let c = Math.min(npc.col, tile.col); c <= Math.max(npc.col, tile.col); c++) {
    if (world.isSolid(c, tile.row) || world.isSolid(c, tile.row - 1) || !world.isSolid(c, tile.row + 1)) andavel = false;
  }
  ok(andavel, `${a.id}: da para andar do morador ate ela`);
  // O toque escolhe o MAIS PERTO. Colados, um dos dois nunca seria alcancado.
  ok(Math.abs(tile.col - npc.col) >= 2, `${a.id}: longe o bastante do morador para os dois avisos`, `${Math.abs(tile.col - npc.col)} tile(s)`);
}

console.log('\nTODO GATILHO DE CHEGADA TEM CHAO DENTRO DO RAIO');
for (const z of ZONE_TRIGGERS) {
  let achou = false;
  for (let r = z.row - z.raio; r <= z.row + z.raio && !achou; r++) {
    for (let c = z.col - z.raio; c <= z.col + z.raio && !achou; c++) {
      if (Math.hypot(c - z.col, r - z.row) > z.raio) continue;
      if (!world.isSolid(c, r) && !world.isSolid(c, r - 1) && world.isSolid(c, r + 1)) achou = true;
    }
  }
  ok(achou, `${z.id} (${z.row - world.surfaceRow} m): da para chegar e ficar de pe no raio`);
}

console.log('\nQUEM SO SAI DEPOIS DE UMA ACAO TEM A ACAO DENTRO DA SALA');
for (const n of RESCUE_NPCS) {
  if (!n.soltaCom) continue;
  const acao = MISSION_ACTIONS.find((a) => a.completionFlag === n.soltaCom!.flag);
  if (!ok(!!acao, `${n.id}: alguma acao liga "${n.soltaCom.flag}"`)) continue;
  const halfW = Math.floor(n.roomW / 2);
  const dentro =
    acao!.col !== undefined && acao!.row !== undefined &&
    acao!.col >= n.col - halfW && acao!.col <= n.col + halfW &&
    acao!.row >= n.row - (n.roomH - 1) && acao!.row <= n.row;
  // Fora da sala, o jogador teria de cavar ate um ponto invisivel; dentro,
  // ele ja esta la quando rompe a parede.
  ok(dentro, `${n.id}: "${acao!.prompt}" fica dentro da sala`, `acao em ${acao!.col},${acao!.row}`);
}

console.log('\nA DEFESA DO POSTO NOVE NASCE, E TERMINA');
{
  for (const b of POSTO_DEFESA.leva) {
    ok(!world.isSolid(b.col, POSTO_DEFESA.row), `${b.id} na coluna ${b.col}: nasce no ar do posto`);
  }
  // O sistema de verdade, com um anfitriao falso: flags num Set, bichos
  // fingidos que so sabem estar vivos ou nao.
  type Falso = { alive: boolean };
  const flags = new Set<string>();
  const mundo: Falso[] = [];
  const beats = new CampaignBeats({
    hasFlag: (id) => flags.has(id),
    setFlag: (id) => flags.add(id),
    spawn: () => { const c = { alive: true }; mundo.push(c); return c as never; },
    contains: (c) => mundo.includes(c as never),
    visitado: () => {},
  });
  const meio = POSTO_DEFESA.leva[1].col;
  const px = (meio + 0.5) * ts;
  const py = (POSTO_DEFESA.row + 0.5) * ts;
  beats.update(px, py);
  ok(mundo.length === 0, 'sem gerador, nenhum bicho');
  flags.add(POSTO_DEFESA.requires);
  beats.update(px, py);
  ok(mundo.length === POSTO_DEFESA.leva.length, 'gerador aceso chama a leva inteira', `${mundo.length} bicho(s)`);
  mundo[0].alive = false;
  beats.update(px, py);
  ok(!flags.has(POSTO_DEFESA.flag), 'com bicho vivo, o posto nao esta seguro');
  // Um bicho entalado some do mundo vivo, perto do jogador: nao pode travar.
  mundo.splice(1, 1);
  mundo[1].alive = false;
  beats.update(px, py);
  ok(flags.has(POSTO_DEFESA.flag), 'leva derrubada (ou sumida perto) liga posto_nove_defendido');
}

console.log('\nCHEGAR PERTO LIGA A FLAG DO GATILHO');
{
  const flags = new Set<string>();
  const beats = new CampaignBeats({
    hasFlag: (id) => flags.has(id), setFlag: (id) => flags.add(id),
    spawn: () => null, contains: () => false, visitado: () => {},
  });
  const z = ZONE_TRIGGERS[0];
  beats.update((z.col + z.raio + 3) * ts, (z.row + 0.5) * ts);
  ok(!flags.has(z.flag), `${z.id}: longe, nada`);
  beats.update((z.col + 0.5) * ts, (z.row + 0.5) * ts);
  ok(flags.has(z.flag), `${z.id}: no centro, liga ${z.flag}`);
}

console.log(falhas === 0 ? '\nToda acao de missao esta ao alcance.\n' : `\n${falhas} falha(s).\n`);
process.exit(falhas > 0 ? 1 : 0);
