#!/usr/bin/env node
/**
 * Extrai a PALETA de uma referencia, agrupando cores proximas.
 *
 *   node tools/paleta-referencia.mjs <imagem> [quantas]
 *
 * Escolher cor no olho foi o que me fez passar rodadas ajustando tom de
 * dourado sem chegar perto. A referencia ja tem as cores: basta conta-las.
 *
 * Agrupa por cubo de 24 niveis para nao devolver mil variacoes de sombreado, e
 * ordena por area ocupada — a primeira e o fundo, as seguintes sao o chassi, e
 * as de area pequena e saturacao alta sao os acentos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const arq = process.argv[2];
const QUANTAS = Number(process.argv[3] ?? 12);
const png = PNG.sync.read(fs.readFileSync(path.resolve(arq)));

const balde = new Map();
for (let i = 0; i < png.data.length; i += 4 * 3) {
  if (png.data[i + 3] < 200) continue;
  const k = `${Math.round(png.data[i] / 24)},${Math.round(png.data[i + 1] / 24)},${Math.round(png.data[i + 2] / 24)}`;
  const b = balde.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
  b.n++; b.r += png.data[i]; b.g += png.data[i + 1]; b.b += png.data[i + 2];
  balde.set(k, b);
}
const total = [...balde.values()].reduce((s, b) => s + b.n, 0);
const cores = [...balde.values()]
  .sort((a, b) => b.n - a.n)
  .slice(0, QUANTAS)
  .map((b) => {
    const r = Math.round(b.r / b.n), g = Math.round(b.g / b.n), bl = Math.round(b.b / b.n);
    const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
    return {
      hex: '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join(''),
      pct: (100 * b.n / total).toFixed(1),
      lum: Math.round(0.299 * r + 0.587 * g + 0.114 * bl),
      sat: mx ? Math.round((100 * (mx - mn)) / mx) : 0,
    };
  });

console.log(`\n${path.basename(arq)}\n`);
for (const c of cores) {
  console.log(`  ${c.hex}  ${String(c.pct).padStart(5)}%  luz ${String(c.lum).padStart(3)}  sat ${String(c.sat).padStart(3)}%`);
}
