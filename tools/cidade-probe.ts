/*
 * Sonda da cidade: Blockia e percorrivel A PE, e cada coisa esta onde a
 * historia diz.
 *
 *   npm run cidade
 *
 * A cidade e uma planta (`src/data/cidades/blockia.ts`) escavada pelo
 * esqueleto generico (`src/world/cidade/`). Esta sonda gera o mundo de verdade
 * e anda por ele como o jogador anda — passo de um tile, escada de mao,
 * queda — a partir da porta. Tudo que ela nao alcanca e uma ilha.
 *
 * Tambem confere o que muda com a historia: a porta fecha e abre, a galeria
 * alagada tranca as caixas ate a bomba rodar, a ponte quebrada nao isola
 * nenhum bairro, a saida inferior so leva para baixo quando abre.
 */
import { World } from '../src/world/World';
import { generateWorld } from '../src/world/WorldGen';
import { BLOCKIA_PLANTA as planta } from '../src/data/cidades/blockia';
import { BLOCKIA_NPCS } from '../src/data/blockia';
import { MISSION_ACTIONS } from '../src/data/missionActions';
import { BLOCK_IDS, blockDef } from '../src/data/blocks';
import { aplicarEstadoCidade } from '../src/world/cidade/escavar';
import { colunaDe, escadaLinhas, linhaDe, lugaresDosMoradores, piso, portaRect, salaRect } from '../src/world/cidade/geometria';
import { missionActionTile } from '../src/systems/MissionActions';

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
const SUP = world.surfaceRow;
const flags = new Set<string>();
const estado = () => aplicarEstadoCidade(world, planta, (f) => flags.has(f));

console.log('\nA PLANTA');
{
  const elevados = planta.pisos.filter((p) => !p.chao);
  ok(planta.pisos.length >= 12, `${planta.pisos.length} pisos`, 'uma cidade rasa tem poucos');
  ok(new Set(planta.pisos.map((p) => p.pe)).size >= 7, `${new Set(planta.pisos.map((p) => p.pe)).size} alturas distintas`);
  ok(
    elevados.some((p) => p.encosto === 'oeste') && elevados.some((p) => p.encosto === 'leste'),
    'a cidade sobe pelos dois lados'
  );
  // Escada: apoiada no piso de baixo, encostada na PONTA do de cima e fora
  // dele. Escada no meio de um piso vira um buraco onde se cai andando.
  for (const e of planta.escadas) {
    const de = piso(planta, e.de);
    const para = piso(planta, e.para);
    ok(e.x >= de.x0 && e.x <= de.x1, `escada ${e.de}->${e.para} (x ${e.x}) apoiada no piso de baixo`);
    ok(e.x === para.x0 - 1 || e.x === para.x1 + 1, `escada ${e.de}->${e.para} encostada na ponta do piso de cima`, `piso de cima vai de ${para.x0} a ${para.x1}`);
    ok(para.pe < de.pe, `escada ${e.de}->${e.para} sobe`);
  }
  for (const n of BLOCKIA_NPCS) {
    const lugar = planta.moradores[n.id];
    if (!ok(!!lugar, `${n.name} tem lugar na planta`)) continue;
    const p = piso(planta, lugar.piso);
    ok(lugar.x >= p.x0 && lugar.x <= p.x1, `${n.name} mora dentro do piso ${p.id}`, `x ${lugar.x} fora de ${p.x0}-${p.x1}`);
  }
}

console.log('\nA CIDADE E INDESTRUTIVEL');
{
  // Nada de mina dentro da cidade: rocha, laje, tabua e agua nao cedem.
  let cavaveis = 0;
  let exemplo = '';
  for (let x = -2; x <= planta.col1 - planta.col0 + 2; x++) {
    const col = colunaDe(planta, x);
    for (let pe = planta.teto - 4; pe <= planta.fundo + 2; pe++) {
      const id = world.getTile(col, linhaDe(SUP, pe));
      if (id === BLOCK_IDS.AIR || id === BLOCK_IDS.LADDER) continue;
      if (!blockDef(id).indestructible) {
        cavaveis++;
        exemplo ||= `${blockDef(id).key} em x ${x}, ${pe} m`;
      }
    }
  }
  ok(cavaveis === 0, 'nenhum tile da cidade cede a picareta', `${cavaveis} tiles, ex.: ${exemplo}`);
  // A sala na parede fica fora da caverna: a casca dela tambem precisa
  // aguentar, senao a galeria alagada tem porta dos fundos.
  for (const sala of planta.salas) {
    const r = salaRect(planta, SUP, sala);
    let fracos = 0;
    for (let col = r.col0 - 2; col <= r.col1 + 2; col++) {
      for (let row = r.row0 - 2; row <= r.row1 + 2; row++) {
        const id = world.getTile(col, row);
        if (id !== BLOCK_IDS.AIR && !blockDef(id).indestructible) fracos++;
      }
    }
    ok(fracos === 0, `sala ${sala.id}: a parede em volta nao cede`, `${fracos} tiles cavaveis`);
  }
}

console.log('\nNADA DA GERACAO ATROPELOU A CIDADE');
{
  // O WorldGen roda outras coisas depois da cidade (pergaminhos, salas,
  // veios). Qualquer uma que cave aqui fura passarela sem avisar.
  for (const p of planta.pisos) {
    let furos = 0;
    let tampados = 0;
    const q = planta.ponteQuebrada;
    const porta = portaRect(planta, SUP);
    for (let x = p.x0; x <= p.x1; x++) {
      if (q && q.piso === p.id && x >= q.x0 && x <= q.x1) continue;
      const col = colunaDe(planta, x);
      // A passagem da porta nasce selada de proposito (secao seguinte).
      if (col >= porta.col0 && col <= porta.col1) continue;
      const pe = linhaDe(SUP, p.pe);
      if (!world.isSolid(col, pe + 1) && world.getTile(col, pe + 1) !== BLOCK_IDS.LADDER) furos++;
      if (world.isSolid(col, pe) || world.isSolid(col, pe - 1)) tampados++;
    }
    ok(furos === 0 && tampados === 0, `${p.id}: chao inteiro e vao livre`, `${furos} furo(s) no chao, ${tampados} tile(s) no vao do corpo`);
  }
}

console.log('\nA PORTA FECHA, E ABRE');
{
  estado();
  const r = portaRect(planta, SUP);
  const total = (r.row1 - r.row0 + 1) * (r.col1 - r.col0 + 1);
  let solidos = 0;
  for (let row = r.row0; row <= r.row1; row++) for (let col = r.col0; col <= r.col1; col++) if (world.isSolid(col, row)) solidos++;
  ok(solidos === total, 'a porta nasce fechada de verdade', `${solidos} de ${total}`);
  flags.add('porta_blockia');
  estado();
  let livres = 0;
  for (let row = r.row0; row <= r.row1; row++) for (let col = r.col0; col <= r.col1; col++) if (!world.isSolid(col, row)) livres++;
  ok(livres === total, 'e abre por inteiro quando alguem atende', `${livres} de ${total}`);
}

/** Anda como o jogador, a partir de fora da porta. */
function andar(): Set<string> {
  const cabe = (c: number, r: number) => !world.isSolid(c, r) && !world.isSolid(c, r - 1);
  const escada = (c: number, r: number) => world.getTile(c, r) === BLOCK_IDS.LADDER;
  const r = portaRect(planta, SUP);
  const inicio: [number, number] = [r.col0 - 2, r.row1];
  const vistos = new Set<string>([`${inicio[0]},${inicio[1]}`]);
  const fila: [number, number][] = [inicio];
  const limite0 = planta.col0 - 20;
  const limite1 = planta.col1 + 6;
  const topo = linhaDe(SUP, planta.teto) - 16;
  const fundo = linhaDe(SUP, planta.fundo) + 30;
  while (fila.length) {
    const [c, rr] = fila.pop()!;
    const viz: [number, number][] = [[c - 1, rr], [c + 1, rr], [c - 1, rr - 1], [c + 1, rr - 1]];
    if (escada(c, rr)) {
      if (escada(c, rr - 1) || cabe(c, rr - 1)) viz.push([c, rr - 1]);
      if (escada(c, rr + 1)) viz.push([c, rr + 1]);
    }
    if (escada(c, rr + 1)) viz.push([c, rr + 1]);
    let q = rr;
    while (q < fundo && !world.isSolid(c, q + 1) && !escada(c, q + 1)) q++;
    if (q !== rr) viz.push([c, q]);
    for (const [nc, nr] of viz) {
      if (nc < limite0 || nc > limite1 || nr < topo || nr > fundo) continue;
      const k = `${nc},${nr}`;
      if (vistos.has(k) || !cabe(nc, nr)) continue;
      if (!world.isSolid(nc, nr + 1) && !escada(nc, nr) && !escada(nc, nr + 1) && nr !== q) continue;
      vistos.add(k);
      fila.push([nc, nr]);
    }
  }
  return vistos;
}

const alcanca = (vistos: Set<string>, col: number, row: number) =>
  [-1, 0, 1].some((d) => vistos.has(`${col + d},${row}`));

console.log('\nTODO PISO E ALCANCAVEL A PE (ponte ainda quebrada)');
let vistos = andar();
console.log(`  ·    ${vistos.size} celulas alcancaveis a partir da porta`);
for (const p of planta.pisos) {
  const q = planta.ponteQuebrada;
  let pisadas = 0;
  let total = 0;
  for (let x = p.x0; x <= p.x1; x++) {
    if (q && q.piso === p.id && x >= q.x0 && x <= q.x1) continue;
    total++;
    if (vistos.has(`${colunaDe(planta, x)},${linhaDe(SUP, p.pe)}`)) pisadas++;
  }
  ok(pisadas === total, `${p.nome}: andavel de ponta a ponta`, pisadas === 0 ? 'ILHA' : `${pisadas} de ${total} colunas`);
}

console.log('\nTODO MORADOR E TODA OBRA SE ALCANCA');
{
  const lugares = lugaresDosMoradores(world, planta);
  for (const n of BLOCKIA_NPCS) {
    const t = lugares.get(n.id);
    if (t) ok(alcanca(vistos, t.col, t.row), `${n.name} (${t.col}, ${t.row - SUP} m)`);
  }
  for (const a of MISSION_ACTIONS) {
    if (!a.naCidade && !a.perto) continue;
    const t = missionActionTile(a, world, lugares);
    if (!t) {
      ok(false, `${a.id}: tem lugar`);
      continue;
    }
    const naGaleria = a.requiresFlags.includes('blockia_galeria_drenada');
    if (naGaleria) {
      // Com a galeria alagada, a caixa NAO pode estar ao alcance: e o que da
      // sentido a bomba.
      ok(!alcanca(vistos, t.col, t.row), `${a.id}: trancada pela agua enquanto a galeria esta alagada`);
    } else {
      ok(alcanca(vistos, t.col, t.row), `${a.id} (${a.prompt})`);
    }
  }
  const e = planta.elevador;
  if (e) {
    for (const id of e.paradas) {
      const row = linhaDe(SUP, piso(planta, id).pe);
      ok(alcanca(vistos, colunaDe(planta, e.x), row), `elevador: parada em ${id}`);
    }
  }
}

console.log('\nA GALERIA ABRE COM A BOMBA');
{
  for (const sala of planta.salas) {
    if (!sala.alagadaAte) continue;
    flags.add(sala.alagadaAte);
    estado();
    vistos = andar();
    const r = salaRect(planta, SUP, sala);
    ok(alcanca(vistos, r.col0 + 2, r.row1), `${sala.id}: drenada, da para chegar no fundo`);
    for (const a of MISSION_ACTIONS.filter((x) => x.requiresFlags.includes(sala.alagadaAte!))) {
      const t = missionActionTile(a, world, new Map())!;
      ok(alcanca(vistos, t.col, t.row), `${a.id}: ao alcance depois da bomba`);
    }
  }
}

console.log('\nA PONTE: QUEBRADA NAO ISOLA, CONSERTADA ATRAVESSA');
{
  const q = planta.ponteQuebrada!;
  const p = piso(planta, q.piso);
  const row = linhaDe(SUP, p.pe);
  ok(!world.isSolid(colunaDe(planta, q.x0), row + 1), 'o vao nasce aberto');
  flags.add(q.flag);
  estado();
  vistos = andar();
  let todas = true;
  for (let x = q.x0; x <= q.x1; x++) if (!vistos.has(`${colunaDe(planta, x)},${row}`)) todas = false;
  ok(todas, 'consertada, da para atravessar o vao a pe');
}

console.log('\nA SAIDA INFERIOR SO LEVA PARA BAIXO QUANDO ABRE');
{
  const s = planta.saida!;
  const fundoSaida = linhaDe(SUP, s.ate);
  const meio = colunaDe(planta, s.x + Math.floor(s.largura / 2));
  ok(!alcanca(vistos, meio, fundoSaida), 'fechada, o fundo do poco nao se alcanca');
  flags.add(s.flag);
  estado();
  vistos = andar();
  ok(alcanca(vistos, meio, fundoSaida), 'aberta, desce ate o fim do poco');
}

console.log('\nAS ESCADAS VAO DE UM PISO AO OUTRO');
for (const e of planta.escadas) {
  const { topo, base } = escadaLinhas(planta, SUP, e);
  const col = colunaDe(planta, e.x);
  let inteira = true;
  for (let r = topo; r <= base; r++) if (world.getTile(col, r) !== BLOCK_IDS.LADDER) inteira = false;
  ok(inteira, `escada ${e.de}->${e.para}: inteira de ${topo - SUP} a ${base - SUP} m`);
}

console.log(falhas === 0 ? '\nBlockia esta inteira, andavel e trancada onde a historia tranca.\n' : `\n${falhas} falha(s).\n`);
process.exit(falhas > 0 ? 1 : 0);
