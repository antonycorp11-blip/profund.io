#!/usr/bin/env node
/**
 * Monta as seis tiras do heroi NU a partir da arte bruta.
 *
 *   npm run slice-heroi
 *
 * Entrada:  arte-bruta/heroi/*.png     (o que a IA entregou, cada um num formato)
 * Saida:    public/art/character/*.png (128 px por quadro, pes na linha 119)
 *           arte-bruta/conferencia/heroi.png  (as seis tiras lado a lado)
 *
 * POR QUE ESTE CORTADOR E DIFERENTE DOS OUTROS.
 *
 * A arte nao chegou em seis arquivos limpos. Chegou em quatro, cada um num
 * tamanho e num arranjo diferente, porque gerar seis tiras longas e coerentes
 * era justamente o que a IA nao conseguia fazer. Pedir pouco de cada vez
 * funcionou — e o preco e que a montagem sobrou para ca.
 *
 * O que ele resolve:
 *
 *   1. ACHA os quadros sozinho, por vale na coluna. Nada de grade fixa: os
 *      quadros vem com espacamento irregular e as vezes encostados.
 *   2. NORMALIZA a escala. Cada fonte desenhou o heroi num tamanho — 146 px na
 *      folha, 688 nas poses de mira. Sem normalizar, ele mudaria de tamanho ao
 *      trocar de animacao.
 *   3. ALINHA pelos PES. Todas as tiras do jogo tem o pe na linha 119; e o
 *      referencial de que os encaixes dependem (ver tools/medir-encaixes.mjs).
 *   4. REDUZ com media de area. De 688 px para 90 e uma reducao de 7,6x —
 *      vizinho mais proximo jogaria fora nove de cada dez pixels e o desenho
 *      sairia serrilhado.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const QUADRO = 128;
const LINHA_DOS_PES = 119;
/**
 * Altura do heroi EM PE dentro do quadro.
 *
 * 90 e a altura que as tiras antigas ja usavam, e mante-la faz a arte nova
 * entrar sem mexer em `stripDrawHeight`, em `feetAnchor` nem na camera.
 */
const ALTURA_EM_PE = 90;
const OPACO = 40;

const bruta = (f) => path.resolve('arte-bruta/heroi', f);

/**
 * De onde sai cada tira.
 *
 * Uma imagem, nove animacoes, oito quadros cada. Uma imagem por animacao
 * multiplicava por nove o numero de geracoes — e foi esse o custo real da
 * troca de personagem, nao a arte em si.
 */
const GRADE = 'grade9.png';
const LINHAS = 9;
const COLUNAS = 8;
const ORDEM_DAS_LINHAS = ['idle', 'walk', 'run', 'jump', 'mine', 'climb', 'tiro', 'arma_baixa', 'arma_anda'];

/** O quadro EM PE: so um corpo em pe mede o corpo. `idle` quadro 0. */
const REFERENCIA = ['idle', 0];

/**
 * A tira de MIRA e MONTADA, e nao recortada.
 *
 * E a unica em que o indice tem significado: o jogo pede o 0 para o tiro reto,
 * o 2 para cima, o 4 para baixo, 6-7 para o recuo e 8-9 para andar atirando
 * (ver PlayerSprite.stripFrame). A linha `tiro` traz as oito poses na sua
 * ordem; os dois ultimos saem da linha de andar com o braco esticado, que e
 * exatamente o que "andar atirando" quer dizer.
 */
const MIRA = [
  ['tiro', 0], ['tiro', 1], ['tiro', 2], ['tiro', 3], ['tiro', 4], ['tiro', 5],
  ['tiro', 6], ['tiro', 7],
  ['arma_anda', 0], ['arma_anda', 4],
];

const cache = new Map();
function ler(arq) {
  if (!cache.has(arq)) cache.set(arq, PNG.sync.read(fs.readFileSync(bruta(arq))));
  return cache.get(arq);
}

function alfa(png, x, y) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return 0;
  return png.data[(png.width * y + x) * 4 + 3];
}

/**
 * Acha os quadros de uma regiao pelos VALES de coluna vazia.
 *
 * Quadros encostados viram um bloco so, entao um bloco largo demais em relacao
 * aos vizinhos e partido no ponto de menor conteudo. Foi o que aconteceu na
 * folha base: dois quadros de caminhada sairam grudados num blob de 169 px.
 */
/**
 * Recorta a celula (linha, coluna) de uma grade regular.
 *
 * DIVIDE POR ARITMETICA, e nao procurando vao vazio. A grade de nove linhas
 * chegou com as figuras SE TOCANDO — so cinco vaos em toda a imagem, quando
 * seriam precisos oito. Detectar linha por vao nao funcionaria, e nao precisa:
 * a grade e regular por construcao, entao a celula e largura/colunas por
 * altura/linhas.
 */
function celula(png, linha, coluna, linhas, colunas) {
  const larguraCel = png.width / colunas;
  const alturaCel = png.height / linhas;
  const x0 = Math.round(larguraCel * coluna);
  const x1 = Math.round(larguraCel * (coluna + 1)) - 1;
  const y0 = Math.round(alturaCel * linha);
  const y1 = Math.round(alturaCel * (linha + 1)) - 1;
  return corpoDaCelula(png, x0, x1, y0, y1);
}

/**
 * O CORPO dentro de uma celula: a maior mancha conexa, e so ela.
 *
 * Com as linhas encostadas, o braco erguido de uma invade a celula de cima e a
 * bota da outra invade a de baixo. Esses pedacos entram na caixa e no centro
 * de massa, e o personagem sai deslocado e cortado.
 *
 * A mancha conexa resolve sem ambiguidade: o corpo e uma peca so, e o que
 * vazou do vizinho esta separado dele. Fico com a maior e descarto o resto.
 */
function corpoDaCelula(png, x0, x1, y0, y1) {
  const larg = x1 - x0 + 1;
  const alt = y1 - y0 + 1;
  const visto = new Uint8Array(larg * alt);
  let melhor = null;
  for (let y = 0; y < alt; y++) {
    for (let x = 0; x < larg; x++) {
      const k = y * larg + x;
      if (visto[k] || alfa(png, x0 + x, y0 + y) <= OPACO) continue;
      const fila = [k];
      visto[k] = 1;
      let n = 0, a = 1e9, b = -1, t = 1e9, u = -1, soma = 0;
      while (fila.length) {
        const c = fila.pop();
        const cy = (c / larg) | 0;
        const cx = c % larg;
        n++; soma += cx;
        if (cx < a) a = cx; if (cx > b) b = cx;
        if (cy < t) t = cy; if (cy > u) u = cy;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= larg || ny >= alt) continue;
          const nk = ny * larg + nx;
          if (visto[nk]) continue;
          visto[nk] = 1;
          if (alfa(png, x0 + nx, y0 + ny) > OPACO) fila.push(nk);
        }
      }
      if (!melhor || n > melhor.n) {
        melhor = { n, x0: x0 + a, x1: x0 + b, y0: y0 + t, y1: y0 + u, massaX: x0 + soma / n };
      }
    }
  }
  return melhor;
}

/** Uma linha inteira da grade. */
function linhaDaGrade(png, linha, linhas, colunas) {
  const saida = [];
  for (let c = 0; c < colunas; c++) saida.push(celula(png, linha, c, linhas, colunas));
  return saida;
}

function acharQuadros(png, banda, faixa, esperado) {
  const [y0, y1] = banda ?? [0, png.height - 1];
  const [xi, xf] = faixa ?? [0, png.width - 1];
  const col = [];
  for (let x = 0; x < png.width; x++) {
    let n = 0;
    for (let y = y0; y <= y1; y++) if (alfa(png, x, y) > OPACO) n++;
    col.push(n);
  }
  const brutos = [];
  let ini = -1;
  for (let x = xi; x <= xf; x++) {
    if (col[x] > 1) { if (ini < 0) ini = x; }
    else { if (ini >= 0 && x - ini > 14) brutos.push([ini, x - 1]); ini = -1; }
  }
  if (ini >= 0) brutos.push([ini, xf]);

  /*
   * QUANDO A FOLHA DIZ QUANTOS QUADROS TEM, e ela quem manda.
   *
   * Partir por "bloco largo demais em relacao a mediana" funciona enquanto os
   * desenhos se separam. Na caminhada nova eles se TOCAM — o braco de um
   * encosta no do vizinho — e a folha inteira virou dois blocos. Com dois
   * blocos a mediana e enorme, nenhum parece largo demais, e sairam dois
   * quadros de dez.
   *
   * Com a contagem declarada eu ignoro a mediana e corto o intervalo todo em
   * N partes, cada corte caindo na coluna de menos conteudo por perto. E a
   * mesma busca por vale, so que sabendo quantos vales procurar.
   */
  if (esperado && brutos.length) {
    const a0 = brutos[0][0];
    const b0 = brutos[brutos.length - 1][1];
    const largura = b0 - a0 + 1;
    const passo = largura / esperado;
    const cortes = [a0 - 1];
    for (let k = 1; k < esperado; k++) {
      const alvo = a0 + Math.round(passo * k);
      let melhor = alvo;
      let menor = Infinity;
      const margem = Math.round(passo * 0.3);
      for (let x = alvo - margem; x <= alvo + margem; x++) {
        if (x <= a0 || x >= b0) continue;
        if (col[x] < menor) { menor = col[x]; melhor = x; }
      }
      cortes.push(melhor);
    }
    cortes.push(b0);
    const partes = [];
    for (let k = 0; k < cortes.length - 1; k++) {
      partes.push(caixa(png, cortes[k] + 1, cortes[k + 1], y0, y1));
    }
    return partes;
  }

  const larguras = brutos.map(([a, b]) => b - a + 1).sort((a, b) => a - b);
  const tipica = larguras[Math.floor(larguras.length / 2)] || 1;
  const saida = [];
  for (const [a, b] of brutos) {
    const w = b - a + 1;
    const partes = Math.round(w / tipica);
    if (partes < 2) { saida.push([a, b]); continue; }
    const cortes = [a - 1];
    for (let k = 1; k < partes; k++) {
      const alvo = a + Math.round((w * k) / partes);
      let melhor = alvo, menor = Infinity;
      const margem = Math.round(tipica * 0.3);
      for (let x = alvo - margem; x <= alvo + margem; x++) {
        if (x <= a || x >= b) continue;
        if (col[x] < menor) { menor = col[x]; melhor = x; }
      }
      cortes.push(melhor);
    }
    cortes.push(b);
    for (let k = 0; k < cortes.length - 1; k++) saida.push([cortes[k] + 1, cortes[k + 1]]);
  }
  return saida.map(([a, b]) => caixa(png, a, b, y0, y1));
}

/**
 * A caixa apertada de um quadro, e o CENTRO DE MASSA dele.
 *
 * O centro de massa e o que alinha os quadros na horizontal, e nao o meio da
 * caixa. Foi por isso que o heroi parecia andar de re: no meio da passada a
 * perna e o braco se estendem, a caixa alarga para um lado so, e centralizar
 * por ela empurra o TRONCO para tras dentro da celula. O corpo escorregava
 * para tras enquanto as pernas iam para frente — moonwalk.
 *
 * O centro de massa nao sofre disso: num ciclo de caminhada a perna da frente
 * e a de tras se compensam, e o mesmo vale para os bracos. Ele fica preso no
 * quadril, que e exatamente o ponto que nao deveria se mexer.
 */
function caixa(png, x0, x1, y0, y1) {
  let a = 1e9, b = -1, t = 1e9, u = -1;
  let soma = 0, n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (alfa(png, x, y) <= OPACO) continue;
    if (x < a) a = x; if (x > b) b = x;
    if (y < t) t = y; if (y > u) u = y;
    soma += x; n++;
  }
  return b < 0 ? null : { x0: a, x1: b, y0: t, y1: u, massaX: soma / n };
}

/**
 * Copia um quadro para a celula de 128, na escala pedida e com o pe na linha.
 *
 * A reducao usa MEDIA DE AREA: cada pixel de destino e a media do retangulo de
 * origem que cai nele. De 688 px para 90 sao 7,6 px de origem por px de
 * destino — pegar so o do meio jogaria fora nove de cada dez e o contorno
 * sairia picotado. A media pondera pelo alfa para a borda nao puxar a cor do
 * vazio e ficar com halo escuro.
 */
function desenhar(destino, cx, png, cx0, escala) {
  const { x0, x1, y0, y1 } = cx;
  const larg = Math.max(1, Math.round((x1 - x0 + 1) * escala));
  const alt = Math.max(1, Math.round((y1 - y0 + 1) * escala));
  /* A celula e posicionada para que o CENTRO DE MASSA caia no meio dela. */
  const massaLocal = (cx.massaX - x0) * escala;
  const esq = cx0 + Math.round(QUADRO / 2 - massaLocal);
  const topo = LINHA_DOS_PES - alt + 1;
  const passo = 1 / escala;
  for (let y = 0; y < alt; y++) for (let x = 0; x < larg; x++) {
    const sx0 = x0 + x * passo, sy0 = y0 + y * passo;
    const sx1 = Math.min(x1 + 1, sx0 + passo), sy1 = Math.min(y1 + 1, sy0 + passo);
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let sy = Math.floor(sy0); sy < Math.max(Math.ceil(sy1), Math.floor(sy0) + 1); sy++) {
      for (let sx = Math.floor(sx0); sx < Math.max(Math.ceil(sx1), Math.floor(sx0) + 1); sx++) {
        if (sx < 0 || sy < 0 || sx >= png.width || sy >= png.height) continue;
        const i = (png.width * sy + sx) * 4;
        const pa = png.data[i + 3] / 255;
        r += png.data[i] * pa; g += png.data[i + 1] * pa; b += png.data[i + 2] * pa;
        a += png.data[i + 3]; n++;
      }
    }
    if (!n || a === 0) continue;
    const peso = a / 255;
    const dx = esq + x, dy = topo + y;
    if (dx < 0 || dy < 0 || dx >= destino.width || dy >= destino.height) continue;
    const d = (destino.width * dy + dx) * 4;
    destino.data[d] = Math.round(r / peso);
    destino.data[d + 1] = Math.round(g / peso);
    destino.data[d + 2] = Math.round(b / peso);
    destino.data[d + 3] = Math.round(a / n);
  }
}

// --------------------------------------------------------------- montar ---

const escalas = new Map();
const tiras = {};
{
  const png = ler(GRADE);
  ORDEM_DAS_LINHAS.forEach((nome, li) => {
    tiras[nome] = { png, quadros: linhaDaGrade(png, li, LINHAS, COLUNAS).filter(Boolean) };
  });
  const [tRef, qRef] = REFERENCIA;
  const c = tiras[tRef].quadros[qRef];
  const escala = ALTURA_EM_PE / (c.y1 - c.y0 + 1);
  for (const nome of ORDEM_DAS_LINHAS) escalas.set(nome, escala);

  tiras.aim = {
    montada: MIRA.map(([tira, i]) => ({ png, cx: tiras[tira].quadros[i], escala })),
  };
  escalas.set('aim', escala);
  delete tiras.tiro;
}

// 4. Escrever.
const ORDEM = ['idle', 'walk', 'run', 'jump', 'mine', 'climb', 'aim', 'arma_baixa', 'arma_anda'];
const resumo = [];
for (const nome of ORDEM) {
  const t = tiras[nome];
  const n = t.montada ? t.montada.length : t.quadros.length;
  const folha = new PNG({ width: n * QUADRO, height: QUADRO });
  folha.data.fill(0);
  for (let i = 0; i < n; i++) {
    if (t.montada) {
      const { png, cx, escala } = t.montada[i];
      desenhar(folha, cx, png, i * QUADRO, escala);
    } else {
      desenhar(folha, t.quadros[i], t.png, i * QUADRO, escalas.get(nome));
    }
  }
  const destino = path.resolve('public/art/character', `${nome}.png`);
  fs.writeFileSync(destino, PNG.sync.write(folha));
  resumo.push({ nome, n, escala: escalas.get(nome) });
  console.log(`  ${nome.padEnd(6)} ${String(n).padStart(2)} quadros  escala ${escalas.get(nome).toFixed(4)}  -> ${path.relative(process.cwd(), destino)}`);
}

// 5. A folha de conferencia: as seis tiras empilhadas, com a linha dos pes.
/*
 * Sem isto eu estaria confiando em tres numeros que ninguem viu: se o heroi da
 * escalada sair maior que o da caminhada, so aparece aqui — no jogo apareceria
 * como o personagem "pulsando" ao trocar de animacao, que e um bug dificil de
 * atribuir depois.
 */
{
  const maior = Math.max(...resumo.map((r) => r.n));
  const conf = new PNG({ width: maior * QUADRO, height: ORDEM.length * QUADRO });
  for (let i = 0; i < conf.data.length; i += 4) {
    conf.data[i] = 26; conf.data[i + 1] = 30; conf.data[i + 2] = 40; conf.data[i + 3] = 255;
  }
  ORDEM.forEach((nome, linha) => {
    const png = PNG.sync.read(fs.readFileSync(path.resolve('public/art/character', `${nome}.png`)));
    for (let y = 0; y < QUADRO; y++) for (let x = 0; x < png.width; x++) {
      const s = (png.width * y + x) * 4;
      const a = png.data[s + 3] / 255;
      if (a < 0.02) continue;
      const d = (conf.width * (linha * QUADRO + y) + x) * 4;
      conf.data[d] = Math.round(png.data[s] * a + conf.data[d] * (1 - a));
      conf.data[d + 1] = Math.round(png.data[s + 1] * a + conf.data[d + 1] * (1 - a));
      conf.data[d + 2] = Math.round(png.data[s + 2] * a + conf.data[d + 2] * (1 - a));
    }
    for (let x = 0; x < conf.width; x++) {
      const d = (conf.width * (linha * QUADRO + LINHA_DOS_PES) + x) * 4;
      conf.data[d] = 60; conf.data[d + 1] = 220; conf.data[d + 2] = 120;
    }
  });
  const destino = path.resolve('arte-bruta/conferencia/heroi.png');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, PNG.sync.write(conf));
  console.log(`\n  conferencia  ${path.relative(process.cwd(), destino)}`);
  console.log('  ordem das linhas: ' + ORDEM.join(', ') + '  (verde = linha dos pes)');
}

console.log('\n  agora: atualize `frames` em src/data/art.ts e rode `npm run medir-encaixes`.\n');
