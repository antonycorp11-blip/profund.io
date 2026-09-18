#!/usr/bin/env node
/**
 * Compara uma tela do jogo com a referencia, em numero.
 *
 *   node tools/comparar-tela.mjs <nome>
 *
 * Le arte-bruta/conferencia/tela-<nome>.png e arte-bruta/referencia/<nome>.png
 * e imprime as tres medidas que separam as duas. Elas nao medem beleza — medem
 * o que eu errava sistematicamente enquanto julgava no olho:
 *
 *   DENSIDADE  quanto da tela tem desenho. A minha vivia com metade da
 *              referencia, e "parece vazia" era so isso dito sem numero.
 *   DOURADO    quanto da tela e ouro vivo. Eu usava o acento como ESTRUTURA,
 *              contornando cada caixa, e a tela lia como formulario.
 *   SATURACAO  o quanto o fundo puxa para uma cor. Eu tinha pintado tudo de
 *              azul-noite por impressao; a referencia e quase-preto neutro.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const nome = process.argv[2];
if (!nome) { console.error('uso: node tools/comparar-tela.mjs <nome>'); process.exit(1); }

const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const v = mx / 255, s = mx ? (mx - mn) / mx : 0;
  let h = 0;
  if (mx !== mn) {
    if (mx === r) h = 60 * (((g - b) / (mx - mn)) % 6);
    else if (mx === g) h = 60 * ((b - r) / (mx - mn) + 2);
    else h = 60 * ((r - g) / (mx - mn) + 4);
  }
  return [h < 0 ? h + 360 : h, s, v];
};

function medir(arquivo) {
  const png = PNG.sync.read(fs.readFileSync(arquivo));
  const COLS = 48, LINS = 22;
  const cw = png.width / COLS, ch = png.height / LINS;
  let densas = 0;
  for (let cy = 0; cy < LINS; cy++) for (let cx = 0; cx < COLS; cx++) {
    let n = 0, soma = 0, soma2 = 0;
    for (let y = Math.floor(cy * ch); y < Math.floor((cy + 1) * ch); y += 2) {
      for (let x = Math.floor(cx * cw); x < Math.floor((cx + 1) * cw); x += 2) {
        const i = (png.width * y + x) * 4;
        const l = 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
        soma += l; soma2 += l * l; n++;
      }
    }
    const m = soma / n;
    if (Math.sqrt(Math.max(0, soma2 / n - m * m)) > 26) densas++;
  }
  let ouro = 0, tot = 0, satSoma = 0;
  for (let i = 0; i < png.data.length; i += 12) {
    if (png.data[i + 3] < 200) continue;
    const [h, s, v] = hsv(png.data[i], png.data[i + 1], png.data[i + 2]);
    tot++; satSoma += s;
    if (h >= 30 && h <= 55 && s >= 0.45 && v >= 0.55) ouro++;
  }
  return {
    densidade: Math.round((100 * densas) / (COLS * LINS)),
    ouro: +((100 * ouro) / tot).toFixed(1),
    saturacao: Math.round((100 * satSoma) / tot),
  };
}

const minha = medir(path.resolve(`arte-bruta/conferencia/tela-${nome}.png`));
const ref = medir(path.resolve(`arte-bruta/referencia/${nome}.png`));

const linha = (rot, a, b, alvo) => {
  const ok = alvo(a, b) ? 'ok  ' : 'FORA';
  console.log(`  ${ok} ${rot.padEnd(12)} minha ${String(a).padStart(5)}   referencia ${String(b).padStart(5)}`);
};
console.log(`\n  ${nome}\n`);
linha('densidade %', minha.densidade, ref.densidade, (a, b) => a >= b * 0.85);
linha('dourado %', minha.ouro, ref.ouro, (a, b) => a <= b * 1.3);
linha('saturacao %', minha.saturacao, ref.saturacao, (a, b) => Math.abs(a - b) <= 6);
console.log('');
