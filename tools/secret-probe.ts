/*
 * Sonda das salas lacradas.
 *
 *   npm run secret-probe
 *
 * A versao anterior desta sonda testava um Set declarado dentro dela mesma —
 * passava sem olhar uma linha do jogo, e o jogo tinha dois defeitos que ela
 * deveria pegar:
 *  - a "barreira" de duas salas nascia AR no mundo gerado (a da marca do pai
 *    caia dentro da sala da pista), entao o primeiro bloco quebrado em
 *    qualquer lugar "achava" o segredo;
 *  - o achado so vivia em memoria: recarregar o jogo e quebrar um bloco
 *    pagava de novo todo segredo ja aberto.
 * Aqui as perguntas sao feitas ao mundo gerado e ao sistema de verdade.
 */
import { World } from '../src/world/World';
import { generateWorld } from '../src/world/WorldGen';
import { SECRETS, secretRoomRect } from '../src/data/secrets';
import { CLUES, RESCUE_NPCS } from '../src/data/story';
import { Secrets } from '../src/systems/Secrets';
import { BaseStock } from '../src/systems/BaseStock';
import { Events } from '../src/core/events';
import type { ResourceId } from '../src/data/resources';

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

console.log('\nTODA SALA NASCE OCA E LACRADA');
for (const s of SECRETS) {
  const r = secretRoomRect(s);
  let solidosNoVao = 0;
  let abertosNaParede = 0;
  for (let row = r.r0 - 1; row <= r.r1 + 1; row++) {
    for (let col = r.c0 - 1; col <= r.c1 + 1; col++) {
      const noVao = col >= r.c0 && col <= r.c1 && row >= r.r0 && row <= r.r1;
      if (noVao && world.isSolid(col, row)) solidosNoVao++;
      if (!noVao && !world.isSolid(col, row)) abertosNaParede++;
    }
  }
  ok(solidosNoVao === 0, `${s.id}: o vao e oco`, `${solidosNoVao} tile(s) solido(s) dentro`);
  // Parede furada = da para entrar sem quebrar nada, e o segredo nunca dispara.
  ok(abertosNaParede === 0, `${s.id}: a parede e inteira`, `${abertosNaParede} buraco(s) na parede`);
}

console.log('\nNENHUMA SALA ATROPELA PISTA OU RESGATE');
for (const s of SECRETS) {
  const r = secretRoomRect(s);
  for (const alvo of [...CLUES, ...RESCUE_NPCS]) {
    const dentro = alvo.col >= r.c0 - 1 && alvo.col <= r.c1 + 1 && alvo.row >= r.r0 - 1 && alvo.row <= r.r1 + 1;
    if (dentro) ok(false, `${s.id} nao cobre ${alvo.id}`);
  }
}
ok(falhas === 0, 'nenhuma sala encosta numa pista ou num resgate');

console.log('\nA RECOMPENSA SAI UMA VEZ, INCLUSIVE DEPOIS DE RECARREGAR');
{
  const flags = new Set<string>();
  const total = (st: BaseStock) => (['copper', 'coal', 'iron', 'crystal'] as ResourceId[]).reduce((a, id) => a + st.count(id), 0);
  const quebra = (col: number, row: number) =>
    Events.emit('block:break', { col, row } as never);
  const antes = new BaseStock();
  new Secrets(antes, (id) => flags.has(id), (id) => flags.add(id), () => {});

  const s = SECRETS[0];
  const r = secretRoomRect(s);
  quebra(r.c1 + 20, r.r1 + 20);
  ok(total(antes) === 0, 'bloco longe da sala nao paga nada', `estoque ${total(antes)}`);
  quebra(r.c1 + 1, r.r1);
  const pago = total(antes);
  ok(pago > 0 && flags.has(s.id), `${s.id}: quebrar a parede paga e marca a flag`, `estoque ${pago}`);
  quebra(r.c0 - 1, r.r1);
  ok(total(antes) === pago, `${s.id}: quebrar outro tile da mesma parede nao paga de novo`);

  // "Recarregar": sistema novo, estoque novo, as mesmas flags do save.
  const depois = new BaseStock();
  new Secrets(depois, (id) => flags.has(id), (id) => flags.add(id), () => {});
  quebra(r.c1 + 1, r.r0);
  ok(total(depois) === 0 && total(antes) === pago, `${s.id}: depois de recarregar, nao paga de novo`, `estoque ${total(depois)}`);
}

console.log(falhas === 0 ? '\nsecret probe: salas ocas, lacradas e de achado unico.\n' : `\n${falhas} falha(s).\n`);
process.exit(falhas > 0 ? 1 : 0);
