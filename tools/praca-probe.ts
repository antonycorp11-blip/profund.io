/*
 * Sonda da praca: predios e mobilia de Blockia nao se atropelam, nao saem do
 * piso e nao escondem o caminho.
 *
 *   npm run praca
 *
 * POR QUE PRECISA DE SONDA, sendo "so decoracao".
 *
 * Arte nao tem colisao. Duas pecas no mesmo lugar nao travam nada, nao lancam
 * erro, nao aparecem em nenhum teste — elas so ficam feias, e so para quem
 * andar ate ali. A primeira leva de mobilia tinha SEIS sobreposicoes,
 * descobertas olhando a tela, um lugar por vez.
 *
 * E ha um caso pior que feio: predio e mobilia sao desenhados DEPOIS dos
 * tiles. Uma casa em cima de uma escada de mao esconde a escada — ela continua
 * la, funcionando, e ninguem sabe que existe.
 *
 * O tamanho de cada peca vem de `public/art/blockia/mapa.json`, que o cortador
 * mede da arte; o dos predios, da propria planta.
 */
import fs from 'node:fs';
import { BLOCKIA_PLANTA as planta } from '../src/data/cidades/blockia';
import { piso } from '../src/world/cidade/geometria';

let falhas = 0;
const ok = (cond: boolean, titulo: string, detalhe = ''): boolean => {
  if (cond) console.log(`  ok   ${titulo}`);
  else {
    falhas++;
    console.log(`  FALHA ${titulo}${detalhe ? ` — ${detalhe}` : ''}`);
  }
  return cond;
};

const mapa = JSON.parse(fs.readFileSync(`public/art/${planta.pastaArte}/mapa.json`, 'utf8')) as Record<string, { w: number; h: number }>;

interface Caixa {
  nome: string;
  piso: string;
  x0: number;
  x1: number;
  /** Altura em tiles acima do chao. */
  h: number;
  fundo: boolean;
}

const caixas: Caixa[] = [];
for (const pr of planta.predios) {
  caixas.push({ nome: `predio ${pr.id}`, piso: pr.piso, x0: pr.x, x1: pr.x + pr.w, h: pr.h, fundo: true });
}
for (const p of planta.props) {
  const m = mapa[p.id];
  if (!ok(!!m, `peca ${p.id} existe no mapa.json`)) continue;
  caixas.push({ nome: `peca ${p.id}@${p.x}`, piso: p.piso, x0: p.x, x1: p.x + m.w, h: m.h, fundo: !!p.fundo });
}

console.log('\nTUDO DENTRO DO PROPRIO PISO');
for (const c of caixas) {
  const p = piso(planta, c.piso);
  ok(c.x0 >= p.x0 && c.x1 <= p.x1 + 1, `${c.nome} dentro de ${p.id}`, `${c.x0}-${c.x1} fora de ${p.x0}-${p.x1 + 1}`);
}

console.log('\nNADA EM CIMA DE NADA');
{
  let sobre = 0;
  for (let i = 0; i < caixas.length; i++) {
    for (let j = i + 1; j < caixas.length; j++) {
      const a = caixas[i];
      const b = caixas[j];
      if (a.piso !== b.piso) continue;
      // Mobilia na frente de um predio e o que da vida a fachada (a forja e
      // um alpendre com as pecas da forja dentro). O que nao pode e predio
      // dentro de predio, ou peca dentro de peca.
      if (a.nome.startsWith('predio') !== b.nome.startsWith('predio')) continue;
      const cruza = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      if (cruza > 0.15) {
        sobre++;
        ok(false, `${a.nome} x ${b.nome}`, `${cruza.toFixed(2)} tile(s) de sobreposicao`);
      }
    }
  }
  ok(sobre === 0, 'nenhuma sobreposicao');
}

console.log('\nNADA ESCONDE ESCADA, ELEVADOR OU ALCAPAO');
{
  const passagens: { nome: string; x: number; pisos: string[] }[] = [
    ...planta.escadas.map((e) => ({ nome: `escada ${e.de}->${e.para}`, x: e.x, pisos: [e.de] })),
  ];
  if (planta.elevador) passagens.push({ nome: 'elevador', x: planta.elevador.x, pisos: planta.elevador.paradas });
  if (planta.saida) {
    for (let k = 0; k < planta.saida.largura; k++) {
      passagens.push({ nome: 'alcapao', x: planta.saida.x + k, pisos: [planta.saida.piso] });
    }
  }
  for (const pass of passagens) {
    for (const c of caixas) {
      if (!c.fundo || !pass.pisos.includes(c.piso)) continue;
      const cobre = pass.x + 1 > c.x0 + 0.2 && pass.x < c.x1 - 0.2;
      ok(!cobre, `${pass.nome} (x ${pass.x}) visivel ao lado de ${c.nome}`, `${c.nome} vai de ${c.x0} a ${c.x1}`);
    }
  }
}

console.log('\nTODO PISO ALTO TEM ALGUMA COISA');
{
  // Passarela vazia e prateleira. Nao precisa de muito — um predio ou uma
  // peca ja diz "alguem usa isto".
  for (const p of planta.pisos) {
    if (p.chao || p.tipo === 'ponte') continue;
    const tem = caixas.some((c) => c.piso === p.id);
    ok(tem, `${p.nome} tem predio ou mobilia`);
  }
}

console.log(falhas === 0 ? '\nA praca esta arrumada.\n' : `\n${falhas} falha(s).\n`);
process.exit(falhas > 0 ? 1 : 0);
