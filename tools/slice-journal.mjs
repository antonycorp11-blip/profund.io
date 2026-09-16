#!/usr/bin/env node
/**
 * Prepara a arte do Guia de Campo de Santiago.
 *
 *   npm run slice-journal
 *
 * Entrada:  arte-bruta/journal/*.png  (1236px, fundo transparente)
 * Saida:    public/art/journal/*.png  (reduzidas, com alpha preservado)
 *
 * So reduz. As paginas sao desenhos inteiros, nao grades — nao ha o que
 * fatiar. Reduzir importa porque sao 2,5 MB cada e o jogo carrega tudo no
 * primeiro acesso: 1236px de papel rasgado numa tela de celular e desperdicio
 * puro.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const SRC = 'arte-bruta/journal';
const OUT = 'public/art/journal';
/** Capa vira icone de HUD; pagina e fundo de tela. */
const TAMANHOS = { capa: 160, default: 620 };

function reduzir(src, lado) {
  const escala = Math.min(1, lado / Math.max(src.width, src.height));
  const w = Math.max(1, Math.round(src.width * escala));
  const h = Math.max(1, Math.round(src.height * escala));
  const out = new PNG({ width: w, height: h });
  // Media da area de origem: vizinho mais proximo em arte pintada vira serrilha.
  const px = src.width / w;
  const py = src.height / h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      const x0 = Math.floor(x * px), x1 = Math.max(x0 + 1, Math.floor((x + 1) * px));
      const y0 = Math.floor(y * py), y1 = Math.max(y0 + 1, Math.floor((y + 1) * py));
      for (let sy = y0; sy < y1 && sy < src.height; sy++) {
        for (let sx = x0; sx < x1 && sx < src.width; sx++) {
          const i = (src.width * sy + sx) * 4;
          const al = src.data[i + 3] / 255;
          // Premultiplica: sem isso a borda do papel puxa preto do fundo vazio.
          r += src.data[i] * al; g += src.data[i + 1] * al; b += src.data[i + 2] * al;
          a += src.data[i + 3];
          n++;
        }
      }
      const o = (w * y + x) * 4;
      const alpha = a / n;
      const k = alpha > 0 ? 255 / alpha : 0;
      out.data[o] = Math.min(255, Math.round((r / n) * k));
      out.data[o + 1] = Math.min(255, Math.round((g / n) * k));
      out.data[o + 2] = Math.min(255, Math.round((b / n) * k));
      out.data[o + 3] = Math.round(alpha);
    }
  }
  return out;
}

fs.mkdirSync(OUT, { recursive: true });
for (const arq of fs.readdirSync(SRC).filter((f) => f.endsWith('.png'))) {
  const nome = path.basename(arq, '.png');
  const src = PNG.sync.read(fs.readFileSync(path.join(SRC, arq)));
  const lado = TAMANHOS[nome] ?? TAMANHOS.default;
  const out = reduzir(src, lado);
  const destino = path.join(OUT, `${nome}.png`);
  fs.writeFileSync(destino, PNG.sync.write(out));
  const kb = (fs.statSync(destino).size / 1024).toFixed(0);
  console.log(`${nome.padEnd(10)} ${src.width}px -> ${out.width}x${out.height} (${kb} KB)`);
}
