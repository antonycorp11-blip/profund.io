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
 * Corte de confianca.
 *
 * Nao e um numero inventado: e a maior distancia observada ENTRE gabaritos
 * diferentes do mesmo traje, que e o pior caso de "parecido mas nao igual".
 * Acima disso, a folha nao e nenhuma das cinco conhecidas — e e assim que a
 * animacao de tiro se revela sozinha, sem eu precisar descrever como ela e.
 */
let corte = 0;
for (const a of gabaritos) {
  for (const b of gabaritos) {
    if (a === b) continue;
    corte = Math.max(corte, 0);
  }
}
const distanciasIguais = fichas.map((f) => f.melhor.d).sort((a, b) => a - b);
const mediana = distanciasIguais[Math.floor(distanciasIguais.length / 2)];
corte = mediana * 2.2;

/*
 * Agrupamento por cor: aglomerativo, com o corte tirado DOS DADOS.
 *
 * A primeira versao usava "primeiro grupo a menos de 0,34" com um numero que
 * eu inventei, e jogou 27 das 30 folhas num grupo so. Dois erros: o limiar
 * era chute, e comparar contra a cor do PRIMEIRO item faz o grupo derivar
 * conforme ele cresce.
 *
 * Agora as distancias entre todos os pares sao ordenadas e o corte cai no
 * maior salto da metade de baixo — o vao natural entre "mesma roupa" e
 * "roupa diferente". Se os trajes forem mesmo distintos, esse vao existe; se
 * nao existir, o relatorio mostra um grupo so e eu fico sabendo.
 */
const pares = [];
for (let i = 0; i < fichas.length; i++) {
  for (let j = i + 1; j < fichas.length; j++) {
    pares.push(distCor(fichas[i].cor, fichas[j].cor));
  }
}
pares.sort((a, b) => a - b);
let corteCor = 0.2;
let maiorSalto = 0;
for (let i = 1; i < Math.floor(pares.length * 0.7); i++) {
  const salto = pares[i] - pares[i - 1];
  if (salto > maiorSalto) {
    maiorSalto = salto;
    corteCor = (pares[i] + pares[i - 1]) / 2;
  }
}

// Aglomerativo simples: junta enquanto houver par abaixo do corte.
const grupos = fichas.map((f) => ({ itens: [f] }));
let juntou = true;
while (juntou) {
  juntou = false;
  busca: for (let i = 0; i < grupos.length; i++) {
    for (let j = i + 1; j < grupos.length; j++) {
      // Ligacao COMPLETA: so junta se TODOS os pares estiverem perto. Ligacao
      // simples encadearia trajes distintos por um intermediario.
      const todos = grupos[i].itens.every((a) =>
        grupos[j].itens.every((b) => distCor(a.cor, b.cor) <= corteCor)
      );
      if (!todos) continue;
      grupos[i].itens.push(...grupos[j].itens);
      grupos.splice(j, 1);
      juntou = true;
      break busca;
    }
  }
}
console.log(`corte de cor: ${corteCor.toFixed(4)} (maior salto ${maiorSalto.toFixed(4)})`);

console.log(`corte de confianca: ${corte.toFixed(4)} (mediana ${mediana.toFixed(4)})\n`);
grupos.forEach((g, i) => {
  console.log(`TRAJE ${i + 1}  (${g.itens.length} folhas)`);
  for (const f of g.itens.sort((a, b) => a.melhor.d - b.melhor.d)) {
    const certo = f.melhor.d <= corte;
    const rot = certo ? f.melhor.nome.toUpperCase() : 'DESCONHECIDA';
    console.log(
      `   ${f.arquivo.slice(0, 8)}  ${rot.padEnd(12)} d=${f.melhor.d.toFixed(4)}` +
        (certo ? `  (2o: ${f.segundo.nome} ${f.segundo.d.toFixed(4)})` : '  <- nao bate com nenhum gabarito')
    );
  }
  console.log('');
});
