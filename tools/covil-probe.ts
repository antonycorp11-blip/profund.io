/*
 * Sonda dos covis: os encontros opcionais nascem, e nascem no lugar certo?
 *
 *   npm run covil
 *
 * POR QUE PRECISA DE SONDA.
 *
 * `buildLairs` procura um vao livre e DESISTE EM SILENCIO se nao achar. Isso e
 * o comportamento certo — melhor um covil a menos do que um bicho dentro da
 * pedra — mas e tambem o pior tipo de falha para descobrir jogando: nada
 * quebra, nada avisa, o lugar simplesmente nunca existe. Eu ja escrevi um
 * botao de comprar bot que estava desenhado, habilitado, com preco, e ligado a
 * nada; a diferenca entre aquilo e um covil que nao nasce e nenhuma.
 *
 * Aqui o mundo e gerado de verdade e as perguntas sao as do contrato do covil:
 * ele existe, da para chegar nele, e ele esta LONGE do poco — porque um
 * encontro opcional que fica no caminho de quem cava reto nao e opcional.
 */
import { CONFIG } from '../src/data/config';
import { World } from '../src/world/World';
import { generateWorld } from '../src/world/WorldGen';
import { CreatureManager } from '../src/systems/CreatureManager';
import { Exploration } from '../src/systems/Exploration';
import { DropManager } from '../src/entities/DropManager';
import { Inventory } from '../src/systems/Inventory';
import { Attributes } from '../src/systems/Attributes';
import { ENCOUNTERS } from '../src/data/encounters';
import { creatureDef } from '../src/data/creatures';
import { gateArenaCol } from '../src/data/gates';
import { storyGateAtRow } from '../src/data/storyGates';
import { blockDef } from '../src/data/blocks';

let falhas = 0;
/*
 * DEVOLVE O VEREDITO, e nao void.
 *
 * Escrevi `if (!ok(...) || !achou) continue;` com um `ok` que devolvia void.
 * `!undefined` e sempre true, entao TODAS as checagens seguintes eram puladas
 * e a sonda imprimia "todas as sondas de covil passaram" sem ter olhado uma
 * linha do mundo. E a terceira vez que um teste meu passa por nao testar —
 * e o unico tipo de bug que mente sobre si mesmo.
 */
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
const attrs = new Attributes();
const inventory = new Inventory(attrs);
const exploration = new Exploration(world, attrs);
const drops = new DropManager(world, inventory, attrs);
const creatures = new CreatureManager(world, drops, exploration);
creatures.buildLairs();

/*
 * Os postos sao privados, e assim deve ser. A sonda olha pelo mesmo buraco que
 * o jogo usa: acordar o covil andando ate perto dele.
 */
const poco = gateArenaCol();
console.log('\nCOVIS (mundo gerado de verdade)');

for (const enc of ENCOUNTERS) {
  const def = creatureDef(enc.creatureId);
  const nome = `${enc.lugar} (${def?.name ?? enc.creatureId})`;
  /* Varre a faixa procurando o ponto onde o covil acorda: e a unica coisa que
   * o jogador tambem pode fazer. */
  let achou: { col: number; row: number } | null = null;
  for (let d = enc.minDepth - 10; d <= enc.maxDepth + 10 && !achou; d += 1) {
    const row = world.surfaceRow + d;
    for (let col = 4; col < world.width - 4; col += 1) {
      const antes = creatures.creatures.length;
      creatures.update(1 / 60, { x: col * CONFIG.tileSize, y: row * CONFIG.tileSize, invulnerable: true }, () => {});
      const novo = creatures.creatures.find((c) => c.def.id === enc.creatureId);
      if (novo) {
        achou = { col: Math.floor(novo.x / CONFIG.tileSize), row: Math.floor(novo.y / CONFIG.tileSize) };
        break;
      }
      if (creatures.creatures.length !== antes) {
        // Ambiente nasceu junto; limpa para nao confundir a proxima volta.
        creatures.creatures.length = 0;
      }
    }
  }

  if (!ok(achou !== null, `${nome}: existe no mundo`, 'buildLairs nao achou vao nenhum') || !achou) {
    continue;
  }
  const { col, row } = achou;
  const dist = Math.abs(col - poco);
  ok(
    dist >= enc.longeDoPocoCols,
    `${nome}: fica longe do poco`,
    `${dist} colunas, pedia ${enc.longeDoPocoCols}`
  );
  ok(!world.isSolid(col, row), `${nome}: nasce no ar`, 'nasceu dentro da pedra');
  ok(world.isSolid(col, row + 1), `${nome}: tem chao debaixo`, 'nasceu no vazio');
  ok(storyGateAtRow(world.surfaceRow, row) === null, `${nome}: nao nasce em rocha selada`);
  const d = row - world.surfaceRow;
  ok(
    d >= enc.minDepth - 12 && d <= enc.maxDepth + 12,
    `${nome}: nasce na faixa combinada`,
    `${d} m, faixa ${enc.minDepth}-${enc.maxDepth}`
  );
  const ninhada = creatures.creatures.filter((c) => c.def.id === enc.ninhada.creatureId).length;
  ok(ninhada > 0, `${nome}: a ninhada acorda junto`, `${ninhada} de ${enc.ninhada.quantos}`);
  console.log(`  ·    ${nome}: ${d} m, coluna ${col}, ${dist} colunas do poco, ${ninhada} na ninhada`);
  creatures.creatures.length = 0;
}

console.log(falhas === 0 ? '\ntodas as sondas de covil passaram.\n' : `\n${falhas} falha(s).\n`);
process.exit(falhas > 0 ? 1 : 0);
