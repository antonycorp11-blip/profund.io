/*
 * Sonda da cerca: nenhum ajudante troca de lado de um selo.
 *
 *   npm run cerca
 *
 * O QUE ELA GUARDA.
 *
 * Um selo divide o mundo em dois e nada que anda pode trocar de lado. E a
 * regra que sustenta a progressao inteira: se o bot passa, ele mina do outro
 * lado e entrega minerio de uma camada que o jogador ainda nao abriu — e a
 * barreira vira enfeite sem ninguem perceber, porque a moeda chega igual.
 *
 * O BURACO ERA UM TELEPORTE, e por isso nenhuma checagem de colisao pegava.
 * O cao de guarda de `Clone` desentala a copia jogando ela no posto de
 * trabalho; `digDeeper` mexia no posto sem perguntar se dava para chegar la.
 * A copia andava ate a parede, travava, e era teleportada para o outro lado.
 *
 * Duas licoes que ficam escritas na sonda, e nao so no conserto:
 *  - "impossivel atravessar" precisa ser MEDIDO no mundo gerado, e nao
 *    deduzido de que a faixa e solida. A faixa era solida. Conferi.
 *  - quem move entidade sem colisao (teleporte, respawn, desentalar) e o
 *    primeiro lugar para olhar quando algo aparece onde nao podia.
 */
import { CONFIG } from '../src/data/config';
import { World } from '../src/world/World';
import { generateWorld } from '../src/world/WorldGen';
import { CloneManager } from '../src/systems/CloneManager';
import { BaseStock } from '../src/systems/BaseStock';
import { DropManager } from '../src/entities/DropManager';
import { Inventory } from '../src/systems/Inventory';
import { Attributes } from '../src/systems/Attributes';
import { blockDef } from '../src/data/blocks';
import { STORY_GATES, storyGateRows } from '../src/data/storyGates';
import { GATE_LAYERS, gateArenaCol, gateBandRows, gateLayerDef } from '../src/data/gates';

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

interface Faixa {
  nome: string;
  row0: number;
  row1: number;
}
const faixas: Faixa[] = [];
for (const g of STORY_GATES) {
  const { row0, row1 } = storyGateRows(world.surfaceRow, g);
  faixas.push({ nome: g.id, row0, row1 });
}
for (const id of GATE_LAYERS) {
  const { row0, row1 } = gateBandRows(world.surfaceRow, gateLayerDef(id));
  faixas.push({ nome: `selo de ${id}`, row0, row1 });
}

/*
 * Instantaneo do que E selo antes de qualquer simulacao rodar.
 *
 * Tem de ser tirado ANTES: depois nao ha como distinguir "sempre foi tijolo"
 * de "era selo e viraram tijolo".
 */
const selosAntes = new Map<string, number>();
for (const f of faixas) {
  for (let col = 0; col < world.width; col++) {
    for (let row = f.row0; row <= f.row1; row++) {
      const id = world.getTile(col, row);
      if (blockDef(id).indestructible) selosAntes.set(`${col},${row}`, id);
    }
  }
}

console.log('\nA FAIXA E MACICA? (mundo gerado de verdade)');
/*
 * Primeiro o obvio, porque o obvio ja falhou noutro projeto e porque a
 * resposta aqui muda o diagnostico do resto: se houver vao, o problema e de
 * geracao; se nao houver e o bot passar mesmo assim, e teleporte.
 */
for (const f of faixas) {
  let vaos = 0;
  for (let col = 0; col < world.width; col++) {
    for (let row = f.row0; row <= f.row1; row++) {
      if (!world.isSolid(col, row)) vaos++;
    }
  }
  if (vaos > 0) {
    ok(false, `${f.nome}: a faixa tem vao`, `${vaos} tile(s) nao solidos entre ${f.row0} e ${f.row1}`);
  }
}
if (falhas === 0) ok(true, 'toda faixa selada e macica de ponta a ponta');

console.log('\nA COPIA RESPEITA A CERCA? (tres minutos simulados por faixa)');
for (const f of faixas) {
  const inv = new Inventory(attrs);
  const drops = new DropManager(world, inv, attrs);
  const stock = new BaseStock();
  const depot = { x: 60 * TS, y: (f.row0 - 30) * TS };
  const clones = new CloneManager(world, attrs, drops, stock, depot);

  /* Seis copias logo acima da faixa, espalhadas: e a situacao real de quem
   * comprou bot e desceu ate a parede sem abrir ela ainda. */
  const N = 6;
  clones.fromJSON({
    created: N,
    clones: Array.from({ length: N }, (_, i) => {
      const col = 20 + i * 30;
      const row = f.row0 - 2 - (i % 3);
      return {
        id: `c${i}`,
        index: i,
        x: col * TS,
        y: row * TS,
        homeX: col * TS,
        homeY: row * TS,
        config: { bot: 'bot_simples' as const, autoDeliver: true },
      };
    }),
  });

  let maisFunda = -1;
  for (let i = 0; i < 60 * 180; i++) {
    clones.update(1 / 60);
    for (const c of clones.clones) {
      const r = Math.floor(c.y / TS);
      if (r > maisFunda) maisFunda = r;
    }
  }
  ok(
    maisFunda < f.row0,
    `${f.nome}: as copias ficam do lado de cima`,
    `a mais funda chegou a linha ${maisFunda}, e a faixa comeca em ${f.row0}`
  );
}

console.log('\nE PELA PORTA DA ARENA? (a unica coluna que nao e selo)');
/*
 * A pergunta que o falso alarme acima me deu de presente.
 *
 * A faixa de cada selo de bioma tem nove colunas que NAO sao selo: e a porta
 * murada da arena do chefe, feita de tijolo comum. Tijolo comum cede a
 * picareta — e cede a copia, que cava com nivel 3.
 *
 * Ou seja: existe uma coluna, em cada barreira de bioma, por onde a regra
 * "nada troca de lado" depende de tijolo e nao de selo. Vale medir em vez de
 * torcer, e a copia vai ser posta exatamente em cima dela.
 */
for (const id of GATE_LAYERS) {
  const { row0, row1 } = gateBandRows(world.surfaceRow, gateLayerDef(id));
  const col = gateArenaCol();
  const inv = new Inventory(attrs);
  const drops = new DropManager(world, inv, attrs);
  const stock = new BaseStock();
  const clones = new CloneManager(world, attrs, drops, stock, {
    x: col * TS,
    y: (row0 - 30) * TS,
  });
  const N = 4;
  clones.fromJSON({
    created: N,
    clones: Array.from({ length: N }, (_, i) => ({
      id: `p${i}`,
      index: i,
      x: (col - 2 + i) * TS,
      y: (row0 - 2) * TS,
      homeX: (col - 2 + i) * TS,
      homeY: (row0 - 2) * TS,
      config: { bot: 'bot_simples' as const, autoDeliver: true },
    })),
  });
  let maisFunda = -1;
  for (let i = 0; i < 60 * 180; i++) {
    clones.update(1 / 60);
    for (const c of clones.clones) {
      const r = Math.floor(c.y / TS);
      if (r > maisFunda) maisFunda = r;
    }
  }
  /*
   * O QUE SE COBRA AQUI E "NAO CRUZOU", e nao "nao encostou".
   *
   * A minha primeira versao exigia ficar acima de `row0` e acusou a faixa de
   * minerais. Fui ver a faixa tile a tile antes de mexer no jogo, e a acusacao
   * e que estava errada: so a PRIMEIRA linha da porta e `ruin_door`
   * destrutivel (120 de vida); as cinco debaixo dela sao selo. A copia tinha
   * roido o tijolo da fachada e parado no selo, que e exatamente o que devia
   * acontecer.
   *
   * Afrouxar um teste para ele passar e como se esconde bug. Por isso o limite
   * novo nao e "um pouco mais folgado": e a outra pergunta, a que importa —
   * alguem chegou do lado de la? E a integridade do selo continua sendo
   * cobrada inteira, no instantaneo la embaixo.
   */
  ok(
    maisFunda <= row1,
    `porta de ${id} (coluna ${col}): as copias nao cruzam`,
    `a mais funda chegou a linha ${maisFunda}, e a faixa acaba em ${row1}`
  );
}

console.log('\nO SELO CONTINUA INTACTO DEPOIS DE TUDO');
/*
 * ANTES contra DEPOIS, e nao "todo tile da faixa e indestrutivel".
 *
 * Eu escrevi a segunda pergunta primeiro e ela acusou 36 furos numa rodada em
 * que nenhuma copia chegou perto da faixa. Os 36 nunca foram selo: sao a
 * PORTA murada de cada arena de chefe — nove colunas de tijolo por faixa,
 * vezes as quatro faixas de bioma. A pergunta e que estava errada.
 *
 * A comparacao com o instantaneo do comeco responde exatamente o que importa:
 * alguem quebrou alguma coisa que era selo?
 */
{
  let furos = 0;
  for (const f of faixas) {
    for (let col = 0; col < world.width; col++) {
      for (let row = f.row0; row <= f.row1; row++) {
        const antes = selosAntes.get(`${col},${row}`);
        if (antes === undefined) continue;
        if (world.getTile(col, row) !== antes) furos++;
      }
    }
  }
  ok(furos === 0, 'nenhum tile que era selo mudou durante as simulacoes', `${furos} furo(s)`);
}

console.log(falhas === 0 ? '\ntodas as sondas de cerca passaram.\n' : `\n${falhas} falha(s).\n`);
process.exit(falhas > 0 ? 1 : 0);
