/*
 * Sonda de lotacao: o jogo aguenta a frota cheia?
 *
 *   npm run lotacao
 *
 * POR QUE EXISTE.
 *
 * O teto de ajudantes subiu para 50 de cada a pedido do dono. Teto e uma
 * promessa barata de escrever e cara de cumprir: cada bot e cada toupeira
 * pensam todo quadro — procuram alvo, varrem drop, colidem com a rocha. Cem
 * ajudantes sao cem dessas contas a sessenta vezes por segundo, num celular.
 *
 * Eu poderia dizer "deve dar" e seguir. Nao dou: esta sonda MEDE, com os
 * sistemas de verdade no mundo de verdade, e imprime o custo de quadro. Se um
 * dia deixar de caber, ela falha antes de o jogador sentir.
 *
 * O que ela NAO mede, e e honesto dizer: desenho. Aqui nao ha canvas, entao
 * isto e o custo de PENSAR a frota, nao o de desenha-la. O orcamento abaixo
 * deixa folga para isso de proposito.
 */
import { CONFIG } from '../src/data/config';
import { World } from '../src/world/World';
import { generateWorld } from '../src/world/WorldGen';
import { CloneManager } from '../src/systems/CloneManager';
import { CollectorManager } from '../src/systems/CollectorManager';
import { BaseStock } from '../src/systems/BaseStock';
import { DropManager } from '../src/entities/DropManager';
import { Inventory } from '../src/systems/Inventory';
import { Attributes } from '../src/systems/Attributes';
import { COLLECTOR_CONFIG } from '../src/data/collectors';
import { ATTRIBUTES } from '../src/data/attributes';

const TS = CONFIG.tileSize;
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
const attrs = new Attributes();
const inventory = new Inventory(attrs);
const drops = new DropManager(world, inventory, attrs);
const stock = new BaseStock();

const BOTS_TETO = ATTRIBUTES.cloneSlots.base;
const TOUPEIRAS_TETO = COLLECTOR_CONFIG.maxUnits;

console.log(`\nLOTACAO (${BOTS_TETO} bots + ${TOUPEIRAS_TETO} toupeiras, mundo de verdade)`);

// Espalha a frota pela primeira camada, que e onde o teto vale desde o inicio.
const row0 = world.surfaceRow + 30;
const depot = { x: Math.floor(world.width / 2) * TS, y: row0 * TS };

const clones = new CloneManager(world, attrs, drops, stock, depot);
clones.fromJSON({
  created: BOTS_TETO,
  clones: Array.from({ length: BOTS_TETO }, (_, i) => {
    const col = 10 + ((i * 2) % (world.width - 20));
    const row = row0 + (i % 40);
    return {
      id: `bot_${i}`,
      index: i,
      x: col * TS,
      y: row * TS,
      homeX: col * TS,
      homeY: row * TS,
      config: { bot: 'bot_simples' as const, autoDeliver: true },
    };
  }),
});

const collectors = new CollectorManager(world, attrs, stock, drops, depot);
// Dinheiro suficiente para o teto inteiro: o preco cresce 1,1 por unidade.
stock.money = 1e12;
for (let i = 0; i < TOUPEIRAS_TETO; i++) {
  const col = 10 + ((i * 3) % (world.width - 20));
  collectors.buy(col * TS, (row0 + (i % 30)) * TS);
}

ok(clones.clones.length === BOTS_TETO, `os ${BOTS_TETO} bots existem`, `${clones.clones.length} nasceram`);
ok(
  collectors.units.length === TOUPEIRAS_TETO,
  `as ${TOUPEIRAS_TETO} toupeiras existem`,
  `${collectors.units.length} nasceram`
);

// Aquece: a primeira volta paga alocacao e JIT, e nao representa o regime.
for (let i = 0; i < 600; i++) {
  clones.update(1 / 60);
  collectors.update(1 / 60);
}

const QUADROS = 3600; // um minuto de jogo
const t0 = process.hrtime.bigint();
for (let i = 0; i < QUADROS; i++) {
  clones.update(1 / 60);
  collectors.update(1 / 60);
}
const t1 = process.hrtime.bigint();
const msPorQuadro = Number(t1 - t0) / 1e6 / QUADROS;

console.log(
  `  ·    ${msPorQuadro.toFixed(3)} ms por quadro para pensar ${BOTS_TETO} bots e ${TOUPEIRAS_TETO} toupeiras`
);

/*
 * O ORCAMENTO, e de onde ele sai.
 *
 * A 60 fps cada quadro tem 16,7 ms para TUDO: mundo, jogador, criaturas,
 * particulas, iluminacao, HUD e desenho. Dois milissegundos e 12% disso —
 * folgado para uma parte so, e apertado o bastante para acusar se a frota
 * virar o dono do quadro.
 *
 * Esta maquina nao e um celular. Por isso o orcamento e severo aqui: a margem
 * entre este numero e o do aparelho do jogador e justamente o que ele protege.
 */
const ORCAMENTO_MS = 2;
ok(
  msPorQuadro < ORCAMENTO_MS,
  `a frota cheia cabe no orcamento de quadro`,
  `${msPorQuadro.toFixed(3)} ms, teto ${ORCAMENTO_MS} ms`
);

/*
 * E o preco continua sendo o freio de verdade, agora que o teto nao e.
 *
 * Com 50 vagas abertas de saida, o que impede alguem de encher a mina no
 * primeiro dia e o custo, que cresce por unidade. Se essa curva algum dia
 * ficar barata, as 50 vagas viram 50 bots no minuto cinco — entao ela e
 * conferida aqui, ao lado do teto que depende dela.
 */
const custoUltimoBot = clones.costFor('bot_simples', BOTS_TETO - 1);
const custoUltimaToupeira = collectors.costFor(TOUPEIRAS_TETO - 1);
console.log(
  `  ·    o ${BOTS_TETO}o bot custa ✦${Math.round(custoUltimoBot).toLocaleString('pt-BR')}; ` +
    `a ${TOUPEIRAS_TETO}a toupeira, ✦${Math.round(custoUltimaToupeira).toLocaleString('pt-BR')}`
);
/*
 * A FAIXA TEM DOIS LADOS, e o de cima e o que quase passou batido.
 *
 * Barato demais e obvio: as 50 vagas viram 50 bots no minuto cinco. Caro
 * demais e pior justamente por ser discreto — com o crescimento em 1,25 o 50o
 * bot custava 44,8 milhoes, entao as vagas existiam e ninguem chegava nelas.
 * Abrir vaga e prometer que da para ocupar; teto que o preco tranca e teto
 * mentiroso.
 */
ok(
  custoUltimoBot > 1e5 && custoUltimoBot < 5e6,
  'encher as camaras custa uma fortuna alcancavel, nao uma impossivel',
  `o ultimo bot sai por ${Math.round(custoUltimoBot).toLocaleString('pt-BR')}`
);
const frotaInteira = Array.from({ length: BOTS_TETO }, (_, i) =>
  clones.costFor('bot_simples', i)
).reduce((a, b) => a + b, 0);
console.log(`  ·    a frota inteira de ${BOTS_TETO} bots custa ✦${Math.round(frotaInteira).toLocaleString('pt-BR')}`);

console.log(falhas === 0 ? '\ntodas as sondas de lotacao passaram.\n' : `\n${falhas} falha(s).\n`);
process.exit(falhas > 0 ? 1 : 0);
