#!/usr/bin/env node
/**
 * Descobre o que sao as 30 folhas de traje sem nome.
 *
 *   npm run identificar-trajes
 *
 * O PROBLEMA.
 *
 * Os trajes chegaram num zip com nomes de UUID: 30 arquivos de 2172x724,
 * nenhum dizendo a que traje pertence nem que animacao contem. Abrir um por
 * um e decidir no olho, em miniatura, e exatamente o tipo de trabalho em que
 * eu ja errei neste projeto — e sao 30.
 *
 * COMO ELE RESOLVE.
 *
 * Nao por heuristica, por COMPARACAO. A pasta t02-couro ja tem as cinco
 * animacoes recortadas e nomeadas (climb, idle, jump, mine, walk), no mesmo
 * formato. Elas viram gabarito:
 *
 * - QUE ANIMACAO E: assinatura de SILHUETA. Para cada um dos 8 quadros mede a
 *   caixa do desenho e o centro de massa do alfa, normalizados pela altura. E
 *   so forma, entao independe da cor da roupa — que e justamente o que muda
 *   entre trajes e nao pode confundir a classificacao.
 *
 * - DE QUE TRAJE E: histograma de cor do TRONCO, ignorando pele e cabelo
 *   (que sao iguais em todos). Trajes proximos no histograma sao o mesmo.
 *
 * Folha que nao se parece com nenhum gabarito e reportada como DESCONHECIDA,
 * e e assim que a animacao de tiro aparece: ela nao existe no t02-couro.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ZIP = path.resolve('arte-bruta/trajes/zip');
const GABARITO = path.resolve('arte-bruta/trajes/t02-couro');
const QUADROS = 8;

function lerPng(p) {
  return PNG.sync.read(fs.readFileSync(p));
}

/**
 * Assinatura de MOVIMENTO, nao de pose.
 *
 * A primeira versao media a caixa e o centro de massa absolutos de cada
 * quadro. Nao discriminava nada: climb dava 0,0255 e idle 0,0257 para a mesma
 * folha, porque em TODAS as animacoes o boneco esta de pe no meio do quadro e
 * a pose parada domina o numero.
 *
 * O que separa uma animacao da outra nao e onde o corpo esta, e QUANTO ele se
 * mexe e por onde. Entao a assinatura passa a ser a diferenca entre quadros
 * consecutivos — subir, alargar, encolher — mais a amplitude total de cada
 * medida ao longo da tira. Climb sobe muito; idle quase nao muda; mine abre e
 * fecha a caixa por cima; walk oscila em largura com periodo curto.
 */
function assinatura(png) {
  const { width, height, data } = png;
  const passo = width / QUADROS;
  const sig = [];
  for (let f = 0; f < QUADROS; f++) {
    const x0 = Math.round(f * passo);
    const x1 = Math.round((f + 1) * passo);
    let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
    let somaX = 0, somaY = 0, n = 0;
    for (let y = 0; y < height; y++) {
      for (let x = x0; x < x1; x++) {
        const a = data[(y * width + x) * 4 + 3];
        if (a < 24) continue;
        const rx = x - x0;
        if (rx < minX) minX = rx;
        if (rx > maxX) maxX = rx;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        somaX += rx;
        somaY += y;
        n++;
      }
    }
    if (n === 0) {
      sig.push([0, 0, 0, 0, 0, 0]);
      continue;
    }
    sig.push([
      minX / height,
      maxX / height,
      minY / height,
      maxY / height,
      somaX / n / height,
      somaY / n / height,
      n / (height * height),
    ]);
  }

  // Derivadas: o que muda de um quadro para o outro.
  const deltas = [];
  for (let f = 1; f < sig.length; f++) {
    deltas.push(sig[f].map((v, j) => v - sig[f - 1][j]));
  }
  // Amplitude de cada medida ao longo da tira inteira.
  const amp = [];
  for (let j = 0; j < sig[0].length; j++) {
    const col = sig.map((q) => q[j]);
    amp.push(Math.max(...col) - Math.min(...col));
  }
  // O peso 3 no delta e para o movimento mandar mais que a amplitude: duas
  // animacoes podem varrer a mesma altura total por caminhos diferentes.
  return [...deltas.map((d) => d.map((v) => v * 3)), amp];
}

function distancia(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a[i].length; j++) {
      const d = a[i][j] - b[i][j];
      s += d * d;
    }
  }
  return Math.sqrt(s / (a.length * a[0].length));
}

/**
 * Cor do TRONCO, sem pele nem cabelo.
 *
 * A faixa vertical de 38% a 62% da altura pega peito e cintura. Descarta
 * tons de pele (matiz 15-45 com saturacao baixa) porque rosto e maos sao
 * iguais em todo traje e so diluiriam a diferenca que interessa.
 */
function corDoTronco(png) {
  const { width, height, data } = png;
  const y0 = Math.round(height * 0.38);
  const y1 = Math.round(height * 0.62);
  const balde = new Array(4 * 4 * 4).fill(0);
  let total = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 200) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      // Pele: quente, clara e pouco saturada.
      if (mx > 120 && mx - mn < 70 && r > g && g > b) continue;
      const k = (r >> 6) * 16 + (g >> 6) * 4 + (b >> 6);
      balde[k]++;
      total++;
    }
  }
  return balde.map((v) => (total ? v / total : 0));
}

function distCor(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / 2;
}

// ---- gabaritos ----
const gabaritos = [];
for (const f of fs.readdirSync(GABARITO).filter((x) => x.endsWith('.png'))) {
  const nome = path.basename(f, '.png');
  gabaritos.push({ nome, sig: assinatura(lerPng(path.join(GABARITO, f))) });
}
console.log(`\ngabaritos: ${gabaritos.map((g) => g.nome).join(', ')}\n`);

// ---- as 30 folhas ----
const arquivos = fs.readdirSync(ZIP).filter((f) => /\.png$/i.test(f)).sort();
const fichas = arquivos.map((f) => {
  const png = lerPng(path.join(ZIP, f));
  const sig = assinatura(png);
  const ranking = gabaritos
    .map((g) => ({ nome: g.nome, d: distancia(sig, g.sig) }))
    .sort((a, b) => a.d - b.d);
  return { arquivo: f, sig, cor: corDoTronco(png), melhor: ranking[0], segundo: ranking[1] };
});

/*
 * AGRUPAR POR SILHUETA, e so depois nomear.
 *
 * As duas tentativas anteriores erraram a ordem. Eu classificava cada folha
 * contra os gabaritos uma por uma e depois tentava agrupar por cor — e a
 * classificacao individual e justamente a parte fraca, porque climb e idle
 * dao distancias quase iguais.
 *
 * Mas havia um sinal na propria saida que eu ignorei: varias folhas tinham
 * distancia IDENTICA ate a quarta casa. Isso nao e coincidencia, e a mesma
 * animacao desenhada em trajes diferentes — a roupa muda a cor, nao a pose.
 *
 * Entao: agrupa por silhueta primeiro. Cada grupo E uma animacao, e o tamanho
 * dele diz quantos trajes existem. Nomear o grupo inteiro contra os gabaritos
 * e muito mais robusto que nomear folha por folha, porque a decisao usa a
 * mediana do grupo em vez de um exemplar solitario.
 *
 * E o teste sai de graca: se os grupos vierem todos do MESMO tamanho, o
 * conjunto e regular e a leitura esta certa. Se vierem tortos, eu fico
 * sabendo em vez de fatiar 30 arquivos em cima de um palpite.
 */

// --- 1. agrupa as folhas por silhueta ---
const LIMIAR_SILHUETA = 0.012;
const animGrupos = [];
for (const f of fichas) {
  let alvo = null;
  for (const g of animGrupos) {
    if (distancia(f.sig, g.itens[0].sig) < LIMIAR_SILHUETA) { alvo = g; break; }
  }
  if (!alvo) { alvo = { itens: [] }; animGrupos.push(alvo); }
  alvo.itens.push(f);
}

// --- 2. nomeia cada grupo pela MEDIANA da distancia aos gabaritos ---
for (const g of animGrupos) {
  const notas = gabaritos.map((gab) => {
    const ds = g.itens.map((f) => distancia(f.sig, gab.sig)).sort((a, b) => a - b);
    return { nome: gab.nome, d: ds[Math.floor(ds.length / 2)] };
  });
  notas.sort((a, b) => a.d - b.d);
  g.melhor = notas[0];
  g.segundo = notas[1];
}

/*
 * O corte vem dos DADOS, nao de um numero escolhido.
 *
 * Os grupos que sao mesmo uma das cinco animacoes conhecidas ficam todos
 * proximos; o que for outra coisa fica isolado la em cima. O corte cai no
 * maior salto da lista ordenada — e e assim que a animacao de TIRO se revela
 * sozinha, sem eu precisar descrever como ela e.
 */
const notasOrdenadas = animGrupos.map((g) => g.melhor.d).sort((a, b) => a - b);
let corte = Infinity;
let maiorSalto = 0;
for (let i = 1; i < notasOrdenadas.length; i++) {
  const salto = notasOrdenadas[i] - notasOrdenadas[i - 1];
  if (salto > maiorSalto) {
    maiorSalto = salto;
    corte = (notasOrdenadas[i] + notasOrdenadas[i - 1]) / 2;
  }
}

// Nomes repetidos nao podem existir: cada gabarito serve a UM grupo, o mais
// proximo dele. Sem isso duas animacoes parecidas roubam o mesmo rotulo.
const usados = new Map();
for (const g of [...animGrupos].sort((a, b) => a.melhor.d - b.melhor.d)) {
  if (g.melhor.d > corte) { g.rotulo = null; continue; }
  if (usados.has(g.melhor.nome)) { g.rotulo = null; continue; }
  usados.set(g.melhor.nome, g);
  g.rotulo = g.melhor.nome;
}

console.log(`corte automatico: ${corte.toFixed(4)} (maior salto ${maiorSalto.toFixed(4)})`);
console.log(`${animGrupos.length} grupos de silhueta, tamanhos: ${animGrupos.map((g) => g.itens.length).join(', ')}\n`);

const tamanhos = new Set(animGrupos.map((g) => g.itens.length));
if (tamanhos.size === 1) {
  console.log(`CONJUNTO REGULAR: ${animGrupos.length} animacoes x ${[...tamanhos][0]} trajes.\n`);
} else {
  console.log('AVISO: grupos de tamanhos diferentes — o conjunto nao e regular.\n');
}

for (const g of animGrupos) {
  const nome = g.rotulo ? g.rotulo.toUpperCase() : 'NOVA (provavel TIRO)';
  console.log(`${nome}   d=${g.melhor.d.toFixed(4)} para ${g.melhor.nome}  (2o: ${g.segundo.nome} ${g.segundo.d.toFixed(4)})`);
  for (const f of g.itens) console.log(`     ${f.arquivo}`);
  console.log('');
}
