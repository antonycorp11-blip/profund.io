/*
 * Sonda da praca: a mobilia de Blockia nao se atropela.
 *
 *   npm run praca
 *
 * POR QUE PRECISA DE SONDA, sendo "so decoracao".
 *
 * Arte nao tem colisao. Duas pecas no mesmo lugar nao travam nada, nao lancam
 * erro, nao aparecem em nenhum teste — elas so ficam feias, e so para quem
 * andar ate ali. A primeira leva que eu escrevi tinha SEIS sobreposicoes: a
 * bancada da forja em cima do primeiro canteiro, o poste dentro da horta, a
 * barraca de hortalica em cima da leira. Descobri olhando a tela, um lugar por
 * vez, que e o jeito mais caro possivel.
 *
 * O tamanho de cada peca vem de `public/art/blockia/mapa.json`, que o cortador
 * mede da arte. Entao esta sonda tambem pega o caso em que a arte e regerada
 * com outra proporcao e a praca, que estava certa, deixa de estar.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from '../src/data/config';
import {
  BLOCKIA_HORTA,
  BLOCKIA_PROPS,
  HORTA_COL0,
  HORTA_COL1,
} from '../src/data/blockiaProps';
import { BLOCKIA_NPCS } from '../src/data/blockia';
import { LARGURA_DECK } from '../src/world/Blockia';

let falhas = 0;
const ok = (cond: boolean, titulo: string, detalhe = ''): boolean => {
  if (cond) console.log(`  ok   ${titulo}`);
  else {
    falhas++;
    console.log(`  FALHA ${titulo}${detalhe ? ` — ${detalhe}` : ''}`);
  }
  return cond;
};

const mapaPath = path.resolve('public/art/blockia/mapa.json');
if (!fs.existsSync(mapaPath)) {
  console.log('\n  falta public/art/blockia/mapa.json — rode `npm run slice-blockia`.\n');
  process.exit(1);
}
const mapa = JSON.parse(fs.readFileSync(mapaPath, 'utf8')) as Record<string, { w: number; h: number }>;

console.log('\nTODA PECA TEM ARTE');
{
  const semArte = new Set<string>();
  for (const p of BLOCKIA_PROPS) if (!mapa[p.id]) semArte.add(p.id);
  for (const c of BLOCKIA_HORTA) if (!mapa[c.id]) semArte.add(c.id);
  ok(
    semArte.size === 0,
    'toda peca posicionada existe na folha cortada',
    [...semArte].join(', ')
  );
}

interface Faixa {
  id: string;
  a: number;
  b: number;
}
const larguraDe = (id: string): number => mapa[id]?.w ?? 0;

console.log('\nNINGUEM SE ATROPELA, NIVEL A NIVEL');
{
  const porNivel = new Map<number, Faixa[]>();
  for (const p of BLOCKIA_PROPS) {
    const lista = porNivel.get(p.nivel) ?? [];
    lista.push({ id: p.id, a: p.offset, b: p.offset + larguraDe(p.id) });
    porNivel.set(p.nivel, lista);
  }
  for (const [nivel, lista] of [...porNivel].sort((x, y) => x[0] - y[0])) {
    const conflitos: string[] = [];
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const A = lista[i];
        const B = lista[j];
        if (A.a < B.b && B.a < A.b) {
          conflitos.push(`${A.id}(${A.a.toFixed(1)}-${A.b.toFixed(1)}) x ${B.id}(${B.a.toFixed(1)}-${B.b.toFixed(1)})`);
        }
      }
    }
    ok(conflitos.length === 0, `nivel ${nivel}: ${lista.length} pecas sem sobreposicao`, conflitos.join(' · '));
  }
}

console.log('\nA HORTA CABE NA TERRA');
/*
 * `carveBlockia` planta terra de col0+16 a col0+31, e o canteiro precisa ficar
 * DENTRO dela: um canteiro apoiado em calcamento e um canteiro flutuando sobre
 * pedra, que e pior do que nao ter canteiro.
 */
{
  const conflitos: string[] = [];
  let ultimo = -Infinity;
  for (const c of BLOCKIA_HORTA) {
    const a = HORTA_COL0 + c.offset;
    const b = a + larguraDe(c.id);
    if (a < HORTA_COL0 || b > HORTA_COL1 + 1) {
      conflitos.push(`${c.id} vai de ${a.toFixed(1)} a ${b.toFixed(1)}, fora da terra (${HORTA_COL0}-${HORTA_COL1})`);
    }
    if (a < ultimo) conflitos.push(`${c.id} comeca em ${a} e o anterior terminou em ${ultimo.toFixed(1)}`);
    ultimo = b;
  }
  ok(conflitos.length === 0, `os ${BLOCKIA_HORTA.length} canteiros cabem na terra plantada`, conflitos.join(' · '));
}

console.log('\nAS PECAS DO PISO NAO INVADEM A HORTA');
/*
 * A horta e a unica parte do piso que tem conteudo proprio. Peca de praca
 * pousada em cima dela some debaixo de um canteiro, ou pior, esconde um.
 */
{
  const invasores: string[] = [];
  for (const p of BLOCKIA_PROPS) {
    if (p.nivel !== 0) continue;
    const a = p.offset;
    const b = a + larguraDe(p.id);
    if (a < HORTA_COL1 + 1 && HORTA_COL0 < b) {
      invasores.push(`${p.id} (${a.toFixed(1)}-${b.toFixed(1)})`);
    }
  }
  ok(invasores.length === 0, 'nenhuma peca de praca pousa na horta', invasores.join(' · '));
}

console.log('\nO TERRACO CABE NO TERRACO');
/*
 * Cada passarela tem 14 colunas (LARGURA_DECK, em /world/Blockia.ts). Peca que
 * passa da ponta fica pendurada no ar — e como o desenho nao colide com nada,
 * ela fica pendurada em silencio.
 */
{
  const fora: string[] = [];
  for (const p of BLOCKIA_PROPS) {
    if (p.nivel === 0) continue;
    const b = p.offset + larguraDe(p.id);
    if (b > LARGURA_DECK) fora.push(`${p.id} termina em ${b.toFixed(1)} no nivel ${p.nivel}`);
  }
  ok(fora.length === 0, `tudo cabe nas ${LARGURA_DECK} colunas de cada terraco`, fora.join(' · '));
}

console.log('\nA PRACA CABE NA CAVERNA');
{
  const largura = CONFIG.blockia.col1 - CONFIG.blockia.col0;
  const fora: string[] = [];
  for (const p of BLOCKIA_PROPS) {
    if (p.nivel !== 0) continue;
    const b = p.offset + larguraDe(p.id);
    if (b > largura) fora.push(`${p.id} termina em ${b.toFixed(1)}, e a praca tem ${largura}`);
  }
  ok(fora.length === 0, `tudo cabe nas ${largura} colunas da praca`, fora.join(' · '));
}

console.log('\nCADA MORADOR TEM MOBILIA NO ANDAR DELE');
/*
 * Nao e regra de engenharia, e de sentido: um terraco com morador e sem nada
 * em volta le como sala vazia com uma pessoa dentro. Aviso, e nao erro — pode
 * haver andar de passagem de proposito.
 */
{
  const comMobilia = new Set(BLOCKIA_PROPS.map((p) => p.nivel));
  for (const n of BLOCKIA_NPCS) {
    if (comMobilia.has(n.nivel)) continue;
    console.log(`  aviso ${n.name} mora no nivel ${n.nivel}, que nao tem nenhuma peca.`);
  }
  if ([...new Set(BLOCKIA_NPCS.map((n) => n.nivel))].every((n) => comMobilia.has(n))) {
    ok(true, 'todo andar habitado tem mobilia');
  }
}

console.log('\nA PRACA, COLUNA A COLUNA');
{
  const col0 = CONFIG.blockia.col0;
  const linhas = BLOCKIA_PROPS.filter((p) => p.nivel === 0)
    .slice()
    .sort((a, b) => a.offset - b.offset);
  for (const p of linhas) {
    const a = col0 + p.offset;
    const b = a + larguraDe(p.id);
    console.log(
      `  ${String(Math.round(a)).padStart(3)}-${String(Math.round(b - 1)).padEnd(3)}  ${p.id}${p.fundo ? '' : '  (na frente)'}`
    );
  }
}

console.log(falhas === 0 ? '\na praca de Blockia esta arrumada.\n' : `\n${falhas} falha(s).\n`);
process.exit(falhas > 0 ? 1 : 0);
