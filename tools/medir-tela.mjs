#!/usr/bin/env node
/**
 * Mede uma tela: onde esta o CONTEUDO e onde esta o VAZIO.
 *
 *   node tools/medir-tela.mjs <imagem.png> [colunas] [linhas]
 *
 * Existe porque as telas eram a unica parte deste projeto que eu continuava
 * julgando no olho. Tudo que virou numero — ancora de punho, cor de luva,
 * abertura da perna — parou de voltar; as telas, que eu avaliava por
 * impressao, continuaram erradas rodada apos rodada.
 *
 * O que ele mede nao e beleza, e ESTRUTURA: divide a tela numa grade e diz,
 * celula por celula, se ali ha desenho ou fundo. Duas telas com a mesma
 * intencao tem o mesmo mapa; uma tela com metade da altura vazia aparece como
 * metade do mapa em branco, e isso nao e questao de gosto.
 *
 * `#` conteudo denso · `+` conteudo fraco · `.` fundo
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('uso: node tools/medir-tela.mjs <imagem.png> [colunas] [linhas]');
  process.exit(1);
}
const COLS = Number(process.argv[3] ?? 48);
const LINS = Number(process.argv[4] ?? 22);

const png = PNG.sync.read(fs.readFileSync(path.resolve(arquivo)));
const cw = png.width / COLS;
const ch = png.height / LINS;

/**
 * Uma celula tem CONTEUDO quando ela varia.
 *
 * Nao serve medir brilho: um painel escuro e conteudo e um fundo claro e
 * fundo. O que separa desenho de fundo e o CONTRASTE interno — borda, texto e
 * icone fazem a celula variar, um preenchimento chapado nao.
 */
function densidade(cx, cy) {
  const x0 = Math.floor(cx * cw), x1 = Math.floor((cx + 1) * cw);
  const y0 = Math.floor(cy * ch), y1 = Math.floor((cy + 1) * ch);
  let n = 0, soma = 0, soma2 = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (png.width * y + x) * 4;
      const l = 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
      soma += l; soma2 += l * l; n++;
    }
  }
  if (!n) return 0;
  const media = soma / n;
  return Math.sqrt(Math.max(0, soma2 / n - media * media)); // desvio padrao
}

const mapa = [];
let densas = 0, fracas = 0, vazias = 0;
for (let r = 0; r < LINS; r++) {
  let linha = '';
  for (let c = 0; c < COLS; c++) {
    const d = densidade(c, r);
    if (d > 26) { linha += '#'; densas++; }
    else if (d > 10) { linha += '+'; fracas++; }
    else { linha += '.'; vazias++; }
  }
  mapa.push(linha);
}

const total = COLS * LINS;
console.log(`\n${path.basename(arquivo)}  ${png.width}x${png.height}  grade ${COLS}x${LINS}\n`);
mapa.forEach((l, i) => console.log(String(i).padStart(2) + ' ' + l));
console.log('');
console.log(`  conteudo denso ${(100 * densas / total).toFixed(0)}%   fraco ${(100 * fracas / total).toFixed(0)}%   VAZIO ${(100 * vazias / total).toFixed(0)}%`);
