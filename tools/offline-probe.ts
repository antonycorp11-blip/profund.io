/*
 * Sonda do turno da noite: a conta offline bate com o jogo rodando?
 *
 *   npm run offline
 *
 * POR QUE ESTA E A SONDA MAIS NECESSARIA DO PROJETO.
 *
 * Todo o resto do jogo o jogador confere sozinho: se a picareta parece fraca,
 * ele bate na pedra e ve. O turno da noite ninguem confere — ele fecha o jogo,
 * volta no dia seguinte e le um numero. Se esse numero estiver errado em
 * relacao ao online, fica errado para sempre e ninguem descobre, nem eu.
 *
 * Entao aqui a copia DE VERDADE mina no mundo DE VERDADE por alguns minutos
 * simulados, e o que ela entregou e comparado com o que `calcularOffline`
 * promete para a mesma copia na mesma profundidade.
 *
 * O que e comparado e a TAXA BRUTA de mineracao — a parte que sai do dado. A
 * `eficiencia` de CONFIG e uma decisao de projeto ("o bot sozinho rende
 * menos"), nao uma medicao, e por isso e retirada dos dois lados antes da
 * comparacao em vez de ser validada como se fosse fato.
 */
import { CONFIG } from '../src/data/config';
import { World } from '../src/world/World';
import { generateWorld } from '../src/world/WorldGen';
import { CloneManager } from '../src/systems/CloneManager';
import { BaseStock } from '../src/systems/BaseStock';
import { DropManager } from '../src/entities/DropManager';
import { Inventory } from '../src/systems/Inventory';
import { Attributes } from '../src/systems/Attributes';
import { calcularOffline } from '../src/systems/Offline';
import { BOTS, type BotId } from '../src/data/bots';
import { RESOURCES } from '../src/data/resources';
import { STORY_GATES } from '../src/data/storyGates';
import { LAYERS } from '../src/data/layers';
import { GATE_LAYERS, gateLayerDef } from '../src/data/gates';

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

/** Roda a copia de verdade e devolve o valor entregue por segundo. */
function medirOnline(tipo: BotId, depth: number, minutos: number, col: number): number {
  const inventory = new Inventory(attrs);
  const drops = new DropManager(world, inventory, attrs);
  const stock = new BaseStock();
  const row = world.surfaceRow + depth;
  /*
   * O DEPOSITO FICA COLADO NA COPIA, de proposito.
   *
   * Nao e para facilitar: e para isolar o que esta sendo medido. Com o
   * deposito na superficie, a copia passaria a maior parte dos minutos
   * simulados ANDANDO, e a sonda estaria medindo a distancia ate a base em vez
   * da taxa de mineracao. A viagem e justamente o que a `eficiencia` cobre.
   */
  const depot = { x: col * TS, y: row * TS };
  const clones = new CloneManager(world, attrs, drops, stock, depot);
  clones.fromJSON({
    created: 1,
    clones: [
      {
        id: 'sonda',
        index: 0,
        x: col * TS,
        y: row * TS,
        homeX: col * TS,
        homeY: row * TS,
        config: { bot: tipo, autoDeliver: true },
      },
    ],
  });

  const dt = 1 / 60;
  const passos = Math.round(minutos * 60 * 60);
  for (let i = 0; i < passos; i++) {
    // Só o loop da copia. `drops.update` e o ima do JOGADOR, que nao existe
    // aqui; o que a copia recolhe passa por `drops.collectFor`, chamado de
    // dentro de `clones.update`.
    clones.update(dt);
  }
  // O valor entregue, pelo mesmo preco de tabela que o offline usa.
  /*
   * MEDE O QUE FOI ARRANCADO DA PEDRA, e nao o que chegou no deposito.
   *
   * A primeira versao somava so o estoque, e tres das quatro colunas deram
   * zero: a copia enchia a mochila, entrava em "entregando" e ia atras de um
   * deposito que, nesta bancada, esta enterrado na rocha de onde ela saiu. Ela
   * minerou o tempo todo e nao entregou nada.
   *
   * Isso e problema da bancada, nao do jogo — na partida o deposito fica na
   * base, em vao aberto. E a conta offline prediz PRODUCAO; a viagem ate o
   * deposito e justamente o que a `eficiencia` desconta. Entao o que se
   * compara aqui e produzido contra produzido: estoque mais o que esta na
   * mochila.
   */
  let valor = 0;
  for (const [id, qtd] of stock.entries()) valor += RESOURCES[id].value * qtd;
  for (const c of clones.clones) {
    for (const [id, qtd] of c.entries()) valor += RESOURCES[id].value * qtd;
  }
  return valor / (minutos * 60);
}

/** O que a conta offline promete para a mesma copia, sem o desconto de viagem. */
function preverOffline(tipo: BotId, depth: number): number {
  const rel = calcularOffline(3600, [{ tipo, depth }], 0, {
    poder: attrs.get('cloneMiningPower'),
    velocidade: attrs.get('cloneMiningSpeed'),
    valorEntrega: attrs.get('deliveryValue'),
  });
  let valor = 0;
  for (const [id, qtd] of rel.itens) valor += RESOURCES[id].value * qtd;
  return valor / 3600 / CONFIG.offline.eficiencia;
}

/**
 * Uma profundidade LONGE DE QUALQUER PAREDE SELADA.
 *
 * A copia escolhe alvo dentro de um raio; se esse raio alcanca a faixa de um
 * selo, ela fica batendo em rocha indestrutivel e o rendimento despenca. Foi o
 * que aconteceu com o Bot Reforcado: 140 m cai a quatro metros do selo do
 * Jonas (144), e ele rendeu um sexto do previsto — a sonda estava medindo a
 * parede, nao o bot.
 *
 * O afastamento sai da propria lista de selos. Escolher os numeros a mao
 * funcionaria hoje e quebraria no proximo ajuste de progressao.
 */
function profundidadeLimpa(alvo: number): number {
  /*
   * As fronteiras de CAMADA entram na lista pelo mesmo motivo, embora nao
   * sejam parede.
   *
   * A conta offline usa a tabela de minerio da camada em que o bot esta. O bot
   * real minera dentro de um raio, que numa fronteira pega as duas camadas. A
   * 179 m — um metro acima da Camada de Pedra — ele rendeu 51% a mais do que a
   * conta, porque metade do raio dele estava no bioma de baixo, mais rico.
   *
   * Nao e erro da conta: e o limite declarado dela. Ela vale para o bot no
   * meio de uma camada, e e ali que a sonda deve medir.
   */
  const paredes = [
    ...STORY_GATES.map((g) => g.depth),
    ...GATE_LAYERS.map((id) => gateLayerDef(id).minDepth),
    ...LAYERS.map((l) => l.minDepth),
  ];
  const longe = (d: number): boolean => paredes.every((p) => Math.abs(p - d) > 34);
  for (let passo = 0; passo < 200; passo++) {
    if (longe(alvo + passo)) return alvo + passo;
  }
  return alvo;
}

console.log('\nTURNO DA NOITE (copia de verdade contra a conta)');
const MINUTOS = 4;
for (const bot of BOTS) {
  const depth = profundidadeLimpa(Math.max(bot.requiredDepth + 20, 30));
  /*
   * VARIAS COLUNAS, e nao uma.
   *
   * Medir num ponto so nao mede o bot: mede o buraco em que ele caiu. A
   * primeira versao desta sonda punha a copia no meio do mundo e pronto — e
   * dois dos quatro bots renderam exatamente zero, o que parecia um bug no
   * jogo e era a sonda tendo azar com o veio. A media de varias colunas e o
   * minimo honesto para falar de rendimento.
   */
  const colunas = [24, 42, 60, 78, 96, 114].filter((c) => c > 6 && c < world.width - 6);
  const medidas = colunas.map((c) => medirOnline(bot.id, depth, MINUTOS, c));
  const online = medidas.reduce((a, b) => a + b, 0) / medidas.length;
  const previsto = preverOffline(bot.id, depth);
  if (previsto <= 0 && online <= 0) {
    console.log(`  ·    ${bot.name} a ${depth} m: nao rende nos dois lados (nada que ele recolha aqui)`);
    continue;
  }
  const razao = previsto > 0 ? online / previsto : 0;
  /*
   * A FAIXA E LARGA, e a largura tem motivo.
   *
   * A copia online perde tempo procurando alvo, cai e se desentala; a conta
   * offline supoe ela batendo na pedra o tempo todo. Por isso a conta e um
   * TETO, e a razao medida fica abaixo de 1 — hoje entre 0,75 e 0,99 nos
   * quatro bots.
   *
   * A faixa aceita (0,6 a 1,2) e larga o bastante para o ruido de onde o veio
   * calhou de nascer e estreita o bastante para pegar o erro que importa: a
   * conta render varias vezes mais que o jogo, ou varias vezes menos, sem
   * ninguem nunca notar — porque ninguem consegue conferir o turno da noite.
   */
  ok(
    razao >= 0.6 && razao <= 1.2,
    `${bot.name} a ${depth} m: a conta acompanha o jogo`,
    `online ${online.toFixed(2)}/s (${medidas.map((m) => m.toFixed(1)).join(', ')}), conta ${previsto.toFixed(2)}/s, razao ${razao.toFixed(2)}`
  );
  console.log(
    `  ·    ${bot.name} a ${depth} m: online ${online.toFixed(2)}/s · conta ${previsto.toFixed(2)}/s · razao ${razao.toFixed(2)}`
  );
}

console.log('\nTETO E PISO');
{
  const rel = calcularOffline(
    99 * 3600,
    [{ tipo: 'bot_simples', depth: 40 }],
    0,
    { poder: attrs.get('cloneMiningPower'), velocidade: attrs.get('cloneMiningSpeed'), valorEntrega: 1 }
  );
  ok(rel.limitado, 'noventa e nove horas sao cortadas no teto');
  ok(
    rel.segundos === CONFIG.offline.maxHoras * 3600,
    'o teto creditado e o de CONFIG',
    `${rel.segundos}s contra ${CONFIG.offline.maxHoras * 3600}s`
  );
}
{
  const rel = calcularOffline(-500, [{ tipo: 'bot_simples', depth: 40 }], 0, {
    poder: attrs.get('cloneMiningPower'),
    velocidade: attrs.get('cloneMiningSpeed'),
    valorEntrega: 1,
  });
  /* Relogio de celular anda para tras (fuso, ajuste de rede). Sem esta guarda,
   * um relogio atrasado viraria producao negativa — ou, pior, positiva. */
  ok(rel.segundos === 0 && rel.itens.length === 0, 'relogio para tras nao gera nada');
}
{
  /* Abaixo de Blockia a rocha so cede a picareta da cidade, e a copia cava com
   * nivel 3. Um bot esquecido la nao pode render offline o que nao renderia
   * online. */
  const rel = calcularOffline(3600, [{ tipo: 'bot_prisma', depth: 900 }], 0, {
    poder: attrs.get('cloneMiningPower'),
    velocidade: attrs.get('cloneMiningSpeed'),
    valorEntrega: 1,
  });
  ok(
    rel.itens.length === 0 && rel.bots[0]?.impedido !== undefined,
    'bot abaixo da cidade nao rende, e o relatorio diz por que',
    rel.bots[0]?.impedido ?? 'sem motivo declarado'
  );
}
{
  const semToupeira = calcularOffline(3600, [{ tipo: 'bot_simples', depth: 40 }], 0, {
    poder: attrs.get('cloneMiningPower'), velocidade: attrs.get('cloneMiningSpeed'), valorEntrega: 1,
  });
  const comToupeiras = calcularOffline(3600, [{ tipo: 'bot_simples', depth: 40 }], 6, {
    poder: attrs.get('cloneMiningPower'), velocidade: attrs.get('cloneMiningSpeed'), valorEntrega: 1,
  });
  const a = semToupeira.itens.reduce((s, [, n]) => s + n, 0);
  const b = comToupeiras.itens.reduce((s, [, n]) => s + n, 0);
  ok(b > a, 'toupeira aumenta o que chega no deposito', `${a} sem, ${b} com seis`);
}

console.log(falhas === 0 ? '\ntodas as sondas do turno da noite passaram.\n' : `\n${falhas} falha(s).\n`);
process.exit(falhas > 0 ? 1 : 0);
