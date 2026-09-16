#!/usr/bin/env node
/**
 * Fatia as folhas de NPC em tiras de animacao.
 *
 *   npm run slice-npcs
 *
 * Entrada:  arte-bruta/npcs/<id>.png   — grade de 5 colunas x 3 linhas
 * Saida:    public/art/npc/<id>_idle.png   (tira de 5 quadros)
 *           public/art/npc/<id>_walk.png   (tira de 5 quadros)
 *
 * As folhas vem com a linha 1 parada e as linhas 2 e 3 andando. Usamos 1 e 2;
 * a 3 e uma variacao da caminhada e nao acrescenta nada em tamanho de tela.
 *
 * O corte por celula exata nao serve: cada personagem ocupa uma parte
 * diferente da propria celula, e cortar no meio da grade deixa cada quadro com
 * um deslocamento proprio — a animacao treme. Entao cada quadro e recortado
 * pelo CONTEUDO (bounding box do que nao e transparente), e depois todos sao
 * alinhados pelo MESMO chao, centralizados na largura.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const SRC = 'arte-bruta/npcs';
const OUT = 'public/art/npc';
const COLS = 5;
const ROWS = 3;
const SIZE = 96; // lado do quadro de saida

function read(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

/** Caixa do conteudo nao transparente dentro de um retangulo da folha. */
function bbox(png, x0, y0, w, h) {
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const a = png.data[(png.width * y + x) * 4 + 3];
      if (a < 24) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Copia com escala por vizinho mais proximo. */
function blit(src, sx, sy, sw, sh, dst, dx, dy, dw, dh) {
  for (let y = 0; y < dh; y++) {
    const yy = sy + Math.floor((y * sh) / dh);
    for (let x = 0; x < dw; x++) {
      const xx = sx + Math.floor((x * sw) / dw);
      if (xx < 0 || yy < 0 || xx >= src.width || yy >= src.height) continue;
      const si = (src.width * yy + xx) * 4;
      const di = (dst.width * (dy + y) + (dx + x)) * 4;
      if (di < 0 || di + 3 >= dst.data.length) continue;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
}

function fatiarLinha(png, linha, cellW, cellH) {
  const quadros = [];
  for (let c = 0; c < COLS; c++) {
    const b = bbox(png, c * cellW, linha * cellH, cellW, cellH);
    if (b) quadros.push(b);
  }
  return quadros;
}

function gravarTira(png, quadros, destino) {
  // Todos os quadros compartilham a mesma escala, senao o personagem cresce e
  // encolhe enquanto anda. A referencia e o quadro mais alto da tira.
  const maiorH = Math.max(...quadros.map((q) => q.h));
  const escala = (SIZE * 0.94) / maiorH;
  const out = new PNG({ width: SIZE * quadros.length, height: SIZE });
  out.data.fill(0);
  quadros.forEach((q, i) => {
    const dw = Math.max(1, Math.round(q.w * escala));
    const dh = Math.max(1, Math.round(q.h * escala));
    const dx = i * SIZE + Math.round((SIZE - dw) / 2);
    // Alinhado pelos PES: e o unico ponto que nao pode subir e descer entre
    // quadros, senao o personagem flutua.
    const dy = SIZE - dh - 1;
    blit(png, q.x, q.y, q.w, q.h, out, dx, dy, dw, dh);
  });
  fs.writeFileSync(destino, PNG.sync.write(out));
  return quadros.length;
}

fs.mkdirSync(OUT, { recursive: true });
const arquivos = fs.readdirSync(SRC).filter((f) => f.endsWith('.png'));
if (arquivos.length === 0) {
  console.error(`nenhuma folha em ${SRC}/`);
  process.exit(1);
}

for (const arq of arquivos) {
  const id = path.basename(arq, '.png');
  const png = read(path.join(SRC, arq));
  const cellW = Math.floor(png.width / COLS);
  const cellH = Math.floor(png.height / ROWS);

  const idle = fatiarLinha(png, 0, cellW, cellH);
  const walk = fatiarLinha(png, 1, cellW, cellH);
  if (idle.length === 0 || walk.length === 0) {
    console.warn(`${id}: folha vazia, pulando`);
    continue;
  }
  const a = gravarTira(png, idle, path.join(OUT, `${id}_idle.png`));
  const b = gravarTira(png, walk, path.join(OUT, `${id}_walk.png`));
  console.log(`${id.padEnd(16)} idle ${a} quadros · walk ${b} quadros`);
}
console.log(`\nprontas em ${OUT}/`);
