#!/usr/bin/env node
/**
 * Fatia as estruturas da base de extracao.
 *
 *   npm run slice-base
 *
 * Entrada:  arte-bruta/base/*.png
 * Saida:    public/art/base/*.png
 *
 * Ao contrario das folhas de NPC, aqui o corte e por CELULA EXATA, sem caixa
 * de conteudo. E proposital: a maquina fica parada e so uma parte dela anima.
 * Recortar pelo conteudo realinharia o corpo a cada quadro e a maquina
 * inteira tremeria.
 *
 * O que o script faz alem de cortar: recorta a margem transparente COMUM a
 * todos os quadros (a mesma de cada lado), para a arte encostar na borda sem
 * desalinhar a animacao, e reduz para o tamanho de uso.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const SRC = 'arte-bruta/base';
const OUT = 'public/art/base';

/** quadros e altura final de cada peca, em px de mundo. */
const PECAS = {
  refinador: { frames: 6, altura: 160 },
  deposito: { frames: 3, altura: 112 },
  esteira: { frames: 4, altura: 64 },
  casa_capataz: { frames: 1, altura: 144 },
  elevador_torre: { frames: 1, altura: 240 },
  elevador_plataforma: { frames: 1, altura: 56 },
  poste_cristal: { frames: 1, altura: 152 },
};

const alpha = (p, x, y) => p.data[(p.width * y + x) * 4 + 3];

/** Margem transparente comum a TODOS os quadros. */
function margemComum(src, frames) {
  const fw = Math.floor(src.width / frames);
  let esq = fw, dir = fw, topo = src.height, base = src.height;
  for (let f = 0; f < frames; f++) {
    const x0 = f * fw;
    let e = fw, d = fw, t = src.height, b = src.height;
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < fw; x++) {
        if (alpha(src, x0 + x, y) < 16) continue;
        if (x < e) e = x;
        if (fw - 1 - x < d) d = fw - 1 - x;
        if (y < t) t = y;
        if (src.height - 1 - y < b) b = src.height - 1 - y;
      }
    }
    esq = Math.min(esq, e); dir = Math.min(dir, d);
    topo = Math.min(topo, t); base = Math.min(base, b);
  }
  return { esq, dir, topo, base, fw };
}

function reduzir(src, sx, sy, sw, sh, dw, dh, dst, dx) {
  const px = sw / dw, py = sh / dh;
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      const x0 = sx + Math.floor(x * px), x1 = Math.max(x0 + 1, sx + Math.floor((x + 1) * px));
      const y0 = sy + Math.floor(y * py), y1 = Math.max(y0 + 1, sy + Math.floor((y + 1) * py));
      for (let yy = y0; yy < y1 && yy < src.height; yy++) {
        for (let xx = x0; xx < x1 && xx < src.width; xx++) {
          const i = (src.width * yy + xx) * 4;
          const al = src.data[i + 3] / 255;
          r += src.data[i] * al; g += src.data[i + 1] * al; b += src.data[i + 2] * al;
          a += src.data[i + 3]; n++;
        }
      }
      const o = (dst.width * y + dx + x) * 4;
      const al = a / n;
      const k = al > 0 ? 255 / al : 0;
      dst.data[o] = Math.min(255, Math.round((r / n) * k));
      dst.data[o + 1] = Math.min(255, Math.round((g / n) * k));
      dst.data[o + 2] = Math.min(255, Math.round((b / n) * k));
      dst.data[o + 3] = Math.round(al);
    }
  }
}

fs.mkdirSync(OUT, { recursive: true });
for (const arq of fs.readdirSync(SRC).filter((f) => f.endsWith('.png'))) {
  const nome = path.basename(arq, '.png');
  const cfg = PECAS[nome];
  if (!cfg) { console.warn(`${nome}: sem configuracao, pulando`); continue; }
  const src = PNG.sync.read(fs.readFileSync(path.join(SRC, arq)));
  const m = margemComum(src, cfg.frames);
  const sw = m.fw - m.esq - m.dir;
  const sh = src.height - m.topo - m.base;
  const dh = cfg.altura;
  const dw = Math.max(1, Math.round((sw / sh) * dh));
  const out = new PNG({ width: dw * cfg.frames, height: dh });
  out.data.fill(0);
  for (let f = 0; f < cfg.frames; f++) {
    reduzir(src, f * m.fw + m.esq, m.topo, sw, sh, dw, dh, out, f * dw);
  }
  const destino = path.join(OUT, `${nome}.png`);
  fs.writeFileSync(destino, PNG.sync.write(out));
  console.log(
    `${nome.padEnd(20)} ${cfg.frames} quadro(s) de ${dw}x${dh}  (${(fs.statSync(destino).size / 1024).toFixed(0)} KB)`
  );
}
