#!/usr/bin/env node
/**
 * Fatia as folhas de ARMA e de efeito de tiro.
 *
 *   npm run slice-armas
 *
 * Entrada:  arte-bruta/armas/*.png  — dez pecas numa fileira so
 * Saida:    public/art/weapons/*.png e public/art/fx/tiro/*.png
 *
 * Corte por CONTEUDO, e nao por grade: a folha volta do gerador com as pecas
 * em posicoes irregulares, e celulas iguais decepam metade delas. Aqui cada
 * peca sai recortada no proprio contorno.
 *
 * As pecas de ARMA NAO sao quadradas nem centralizadas: elas vao ser presas na
 * mao do personagem e giradas pelo angulo da mira, entao o que importa e a
 * PROPORCAO real e onde fica o punho. Quadrar a arma com folga em volta
 * mudaria o centro de rotacao e a arma giraria em torno do vazio.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

/** Alfa abaixo disto e halo do gerador, nao desenho. */
const LIMIAR = 24;

const FOLHAS = [
  {
    arq: 'armas.png',
    destino: 'weapons',
    altura: 48,
    quadrado: false,
    /*
     * Corte por GRADE, e nao por conteudo, so nesta folha.
     *
     * Ela voltou com cada peca dentro de uma celula desenhada — moldura com
     * fundo proprio — entao o alfa da fileira e continuo e o corte por
     * conteudo devolvia uma peca so, de 487 px. As celulas sao regulares, e
     * dez colunas iguais acertam todas. Dentro de cada celula o recorte volta
     * a ser por conteudo, para a moldura nao entrar no arquivo.
     */
    grade: 10,
    nomes: [
      'pistola', 'pistola_2', 'escopeta', 'escopeta_2', 'fuzil',
      'fuzil_2', 'caixa_municao', 'bancada', 'polvora', 'kit_melhoria',
    ],
  },
  {
    arq: 'tiro.png',
    destino: 'fx/tiro',
    altura: 32,
    quadrado: true,
    nomes: [
      'fogo_1', 'fogo_2', 'rastro', 'bala', 'poeira_1',
      'poeira_2', 'sangue_1', 'sangue_2', 'capsula', 'municao_icone',
    ],
  },
];

function lerFolha(arq) {
  return PNG.sync.read(fs.readFileSync(arq));
}

/**
 * Apaga o fundo quase branco das folhas que voltam com as pecas em caixas.
 *
 * O corte por conteudo le ALFA, e uma caixa branca opaca cola todas as pecas
 * numa faixa so. Limpar aqui e melhor do que ensinar o cortador a entender
 * caixas: depois disto a folha e igual a qualquer outra.
 *
 * O limiar e alto (238) porque o desenho tem realce claro em metal e nao pode
 * ser comido junto; e a borda cinza da caixa tambem sai, senao sobra um
 * retangulo fantasma em volta de cada peca.
 */
function limparFundo(png) {
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    const claro = r > 238 && g > 238 && b > 238;
    const cinzaDeBorda = Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && r > 176 && r <= 238;
    if (claro || cinzaDeBorda) png.data[i + 3] = 0;
  }
}

/** Colunas que tem algum pixel desenhado. */
function colunasCheias(png) {
  const cheia = new Uint8Array(png.width);
  for (let x = 0; x < png.width; x++) {
    for (let y = 0; y < png.height; y++) {
      if (png.data[(y * png.width + x) * 4 + 3] >= LIMIAR) {
        cheia[x] = 1;
        break;
      }
    }
  }
  return cheia;
}

/** Agrupa colunas vizinhas em faixas, uma por peca. */
function faixas(cheia) {
  const out = [];
  let ini = -1;
  for (let x = 0; x < cheia.length; x++) {
    if (cheia[x] && ini < 0) ini = x;
    if (!cheia[x] && ini >= 0) {
      out.push([ini, x - 1]);
      ini = -1;
    }
  }
  if (ini >= 0) out.push([ini, cheia.length - 1]);
  return out;
}

/**
 * Junta as faixas mais proximas ate sobrarem `alvo`.
 *
 * Uma peca pode sair do gerador em pedacos separados — o cano de uma arma e o
 * cabo dela, uma faisca solta de uma explosao. Sem juntar, cada pedaco viraria
 * um arquivo.
 */
function juntarAte(fs_, alvo) {
  const lista = fs_.map((f) => [...f]);
  while (lista.length > alvo) {
    let menor = Infinity;
    let onde = 0;
    for (let i = 0; i < lista.length - 1; i++) {
      const vao = lista[i + 1][0] - lista[i][1];
      if (vao < menor) {
        menor = vao;
        onde = i;
      }
    }
    lista[onde] = [lista[onde][0], lista[onde + 1][1]];
    lista.splice(onde + 1, 1);
  }
  return lista;
}

/**
 * Divide a parte desenhada da folha em N colunas iguais.
 *
 * Mede o bloco de conteudo primeiro (a folha costuma ter margem), e so entao
 * divide — dividir a largura crua do arquivo jogaria a margem para dentro da
 * primeira e da ultima peca.
 */
function celulasIguais(png, n) {
  const cheia = colunasCheias(png);
  let x0 = 0;
  let x1 = png.width - 1;
  while (x0 < png.width && !cheia[x0]) x0++;
  while (x1 > x0 && !cheia[x1]) x1--;
  const larg = (x1 - x0 + 1) / n;
  return Array.from({ length: n }, (_, i) => [
    Math.round(x0 + i * larg),
    Math.round(x0 + (i + 1) * larg) - 1,
  ]);
}

/** Caixa do desenho dentro de uma faixa de colunas. */
function caixa(png, x0, x1) {
  let minX = x1;
  let maxX = x0;
  let minY = png.height;
  let maxY = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = x0; x <= x1; x++) {
      if (png.data[(y * png.width + x) * 4 + 3] < LIMIAR) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Reduz com media ponderada pelo ALFA (premultiplicado).
 *
 * Media simples puxa a cor para o preto transparente da borda e deixa um halo
 * escuro em volta de tudo.
 */
function reduzir(png, box, larguraFinal, alturaFinal) {
  const out = new PNG({ width: larguraFinal, height: alturaFinal });
  for (let y = 0; y < alturaFinal; y++) {
    for (let x = 0; x < larguraFinal; x++) {
      const sx0 = box.x + (x * box.w) / larguraFinal;
      const sx1 = box.x + ((x + 1) * box.w) / larguraFinal;
      const sy0 = box.y + (y * box.h) / alturaFinal;
      const sy1 = box.y + ((y + 1) * box.h) / alturaFinal;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let sy = Math.floor(sy0); sy < Math.max(Math.floor(sy0) + 1, sy1); sy++) {
        for (let sx = Math.floor(sx0); sx < Math.max(Math.floor(sx0) + 1, sx1); sx++) {
          if (sx < 0 || sy < 0 || sx >= png.width || sy >= png.height) continue;
          const i = (sy * png.width + sx) * 4;
          const al = png.data[i + 3] / 255;
          r += png.data[i] * al;
          g += png.data[i + 1] * al;
          b += png.data[i + 2] * al;
          a += al;
          n++;
        }
      }
      const o = (y * larguraFinal + x) * 4;
      if (n === 0 || a === 0) {
        out.data[o + 3] = 0;
        continue;
      }
      out.data[o] = Math.round(r / a);
      out.data[o + 1] = Math.round(g / a);
      out.data[o + 2] = Math.round(b / a);
      out.data[o + 3] = Math.round((a / n) * 255);
    }
  }
  return out;
}

const raiz = path.resolve(process.argv[2] ?? 'arte-bruta/armas');
let total = 0;

for (const folha of FOLHAS) {
  const caminho = path.join(raiz, folha.arq);
  if (!fs.existsSync(caminho)) {
    console.log(`  (pulei ${folha.arq}: nao esta em ${raiz})`);
    continue;
  }
  const png = lerFolha(caminho);
  const pecas = folha.grade
    ? celulasIguais(png, folha.grade)
    : juntarAte(faixas(colunasCheias(png)), folha.nomes.length);
  const destino = path.resolve('public/art', folha.destino);
  fs.mkdirSync(destino, { recursive: true });

  pecas.forEach((faixa, i) => {
    const nome = folha.nomes[i];
    if (!nome) return;
    // Encolhe a celula antes de medir: a moldura desenhada encosta na borda,
    // e sem esta folga ela vira parte da peca.
    const folga = folha.grade ? Math.round((faixa[1] - faixa[0]) * 0.06) : 0;
    const box = caixa(png, faixa[0] + folga, faixa[1] - folga);
    // Quadrado para efeito (ele e girado e espelhado em volta do centro);
    // proporcao real para arma (ela e presa pelo punho).
    const escala = folha.altura / box.h;
    const larg = folha.quadrado ? folha.altura : Math.max(1, Math.round(box.w * escala));
    const alt = folha.altura;
    const menor = reduzir(png, box, larg, alt);
    fs.writeFileSync(path.join(destino, `${nome}.png`), PNG.sync.write(menor));
    total++;
    console.log(`  ${folha.destino}/${nome}.png  ${larg}x${alt}`);
  });
}

console.log(`\n${total} arquivos gerados.`);
