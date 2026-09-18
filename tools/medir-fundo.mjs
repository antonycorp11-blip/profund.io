#!/usr/bin/env node
/**
 * Confere se um fundo de tela serve para ter PAINEL EM CIMA.
 *
 *   node tools/medir-fundo.mjs <imagem>
 *
 * Um fundo bonito pode ser inutil: se ele tiver luz e detalhe no meio, o texto
 * do painel briga com o desenho e a tela fica ilegivel. O detalhe tem que
 * morar nas bordas.
 *
 * Mede as tres coisas que decidem isso — e nao a beleza, que eu nao meco:
 *   MIOLO      quao claro e o centro, onde o painel senta. Quanto mais escuro,
 *              melhor le o texto por cima.
 *   CONTRASTE  quanto o centro VARIA. Detalhe no miolo compete com a letra
 *              mesmo sendo escuro.
 *   BORDA      quanto detalhe ha nas bordas. E o que da atmosfera sem atrapalhar.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const arq = process.argv[2];
const png = PNG.sync.read(fs.readFileSync(path.resolve(arq)));
const luz = (i) => 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];

function faixa(x0, x1, y0, y1) {
  let n = 0, soma = 0, soma2 = 0;
  for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
    const l = luz((png.width * y + x) * 4);
    soma += l; soma2 += l * l; n++;
  }
  const m = soma / n;
  return { media: Math.round(m), desvio: Math.round(Math.sqrt(Math.max(0, soma2 / n - m * m))) };
}

const W = png.width, H = png.height;
const miolo = faixa(Math.round(W * 0.15), Math.round(W * 0.85), Math.round(H * 0.10), Math.round(H * 0.90));
const tudo = faixa(0, W, 0, H);
// a borda e o que sobra: aproximo pela diferenca de energia
const bordaDesvio = Math.round((tudo.desvio * (W * H) - miolo.desvio * (W * 0.7) * (H * 0.8)) / (W * H - W * 0.7 * H * 0.8));

const ok = (b) => (b ? 'ok  ' : 'FORA');
console.log(`\n  ${path.basename(arq)}  ${W}x${H}\n`);
console.log(`  ${ok(miolo.media <= 42)} miolo claridade   ${String(miolo.media).padStart(3)}   (alvo <= 42, painel senta aqui)`);
console.log(`  ${ok(miolo.desvio <= 20)} miolo contraste   ${String(miolo.desvio).padStart(3)}   (alvo <= 20, senao briga com o texto)`);
console.log(`  ${ok(bordaDesvio >= 22)} borda detalhe     ${String(bordaDesvio).padStart(3)}   (alvo >= 22, e a atmosfera)`);
