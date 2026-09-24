import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'arte-bruta/novos-visuais');
const output = path.join(root, 'public/art');

function read(name) {
  return PNG.sync.read(fs.readFileSync(path.join(source, name)));
}

function bands(png, axis, threshold) {
  const outer = axis === 'x' ? png.width : png.height;
  const inner = axis === 'x' ? png.height : png.width;
  const result = [];
  let first = -1;
  for (let a = 0; a <= outer; a++) {
    let count = 0;
    if (a < outer) {
      for (let b = 0; b < inner; b++) {
        const x = axis === 'x' ? a : b;
        const y = axis === 'x' ? b : a;
        if (png.data[(y * png.width + x) * 4 + 3] > 100) count++;
      }
    }
    const occupied = count > inner * threshold;
    if (occupied && first < 0) first = a;
    if (!occupied && first >= 0) {
      result.push([first, a]);
      first = -1;
    }
  }
  return result;
}

function bounds(png, x0 = 0, y0 = 0, x1 = png.width, y1 = png.height) {
  let minX = x1, minY = y1, maxX = x0, maxY = y0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (png.data[(y * png.width + x) * 4 + 3] < 24) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX) throw new Error('Recorte vazio');
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function cropResize(png, rect, width, height) {
  const dst = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = Math.min(png.width - 1, Math.floor(rect.x + (x + 0.5) * rect.w / width));
      const sy = Math.min(png.height - 1, Math.floor(rect.y + (y + 0.5) * rect.h / height));
      const si = (sy * png.width + sx) * 4;
      const di = (y * width + x) * 4;
      dst.data.set(png.data.subarray(si, si + 4), di);
    }
  }
  return dst;
}

function save(png, relative) {
  const file = path.join(output, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png, { deflateLevel: 9 }));
  console.log(`${relative}: ${png.width}x${png.height}`);
}

const sheet = read('blocos.png');
const columns = bands(sheet, 'x', 0.15);
const rows = bands(sheet, 'y', 0.15);
if (columns.length !== 5 || rows.length !== 2) {
  throw new Error(`Grade medida: ${columns.length} colunas, ${rows.length} linhas; esperadas 5x2`);
}
console.log('Grade medida:', columns, rows);
const names = [
  'dirt', 'stone', 'darkstone', 'ruin_brick', 'crystal',
  'copper', 'iron', 'gold', 'amber', 'azurite',
];
for (let i = 0; i < names.length; i++) {
  const [x0, x1] = columns[i % 5];
  const [y0, y1] = rows[Math.floor(i / 5)];
  const rect = { x: x0 + 2, y: y0 + 2, w: x1 - x0 - 4, h: y1 - y0 - 4 };
  save(cropResize(sheet, rect, 128, 128), `blocks/${names[i]}_0.png`);
}

for (const name of ['raizerrante', 'cascalideo', 'veu_lumen', 'sentinela_escoria']) {
  const original = read(`${name}.png`);
  const rect = bounds(original);
  const h = 128;
  const w = Math.max(1, Math.round(rect.w * h / rect.h));
  save(cropResize(original, rect, w, h), `creatures/${name}_single.png`);
}

for (const file of [
  'raizerrante-walk', 'raizerrante-attack',
  'cascalideo-walk', 'cascalideo-attack',
  'veu_lumen-walk', 'veu_lumen-attack',
  'sentinela_escoria-walk', 'sentinela_escoria-attack',
]) {
  const original = read(`${file}.png`);
  const cells = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const x0 = Math.floor(col * original.width / 2);
      const x1 = Math.floor((col + 1) * original.width / 2);
      const y0 = Math.floor(row * original.height / 2);
      const y1 = Math.floor((row + 1) * original.height / 2);
      cells.push(bounds(original, x0, y0, x1, y1));
    }
  }
  const maxW = Math.max(...cells.map((c) => c.w));
  const maxH = Math.max(...cells.map((c) => c.h));
  const scale = 120 / maxH;
  const frameW = Math.ceil(maxW * scale) + 8;
  const strip = new PNG({ width: frameW * 4, height: 128 });
  strip.data.fill(0);
  for (let i = 0; i < 4; i++) {
    const rect = cells[i];
    const w = Math.max(1, Math.round(rect.w * scale));
    const h = Math.max(1, Math.round(rect.h * scale));
    const frame = cropResize(original, rect, w, h);
    const ox = i * frameW + Math.floor((frameW - w) / 2);
    const oy = 124 - h;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = (y * w + x) * 4;
        const di = ((oy + y) * strip.width + ox + x) * 4;
        strip.data.set(frame.data.subarray(si, si + 4), di);
      }
    }
  }
  console.log(`${file}: quadros medidos`, cells);
  save(strip, `creatures/${file.replace('-', '_')}.png`);
}

const icons = read('minerios-icones.png');
for (const [name, x0, x1] of [
  ['amber', 0, Math.floor(icons.width / 2)],
  ['azurite', Math.floor(icons.width / 2), icons.width],
]) {
  const rect = bounds(icons, x0, 0, x1, icons.height);
  const side = Math.max(rect.w, rect.h);
  const square = {
    x: Math.max(x0, Math.round(rect.x + (rect.w - side) / 2)),
    y: Math.max(0, Math.round(rect.y + (rect.h - side) / 2)),
    w: side, h: side,
  };
  const icon = cropResize(icons, square, 128, 128);
  save(icon, `ui/${name}.png`);
  save(icon, `ore/${name}.png`);
}

for (const [sourceName, destination] of [
  ['caverna-terra.png', 'cave_dirt.png'],
  ['caverna.png', 'cave_stone.png'],
  ['caverna-profunda.png', 'cave_deep.png'],
]) {
  const cave = read(sourceName);
  save(cropResize(cave, { x: 0, y: 0, w: cave.width, h: cave.height }, 1024, 512),
    `bg/${destination}`);
}

// A referencia aprovada para o cenario usa formas maiores. As quatro celulas
// medidas por material evitam que um mundo de 240x2080 tiles repita um carimbo.
const v2Base = read('cenario-v2-terra-pedra.png');
const v2Deep = read('cenario-v2-profundo-superficie.png');
for (const [sheet, cols, rows, keys] of [
  [v2Base, [[32, 442], [470, 874], [902, 1308], [1337, 1743]], [[32, 422], [450, 850]], ['dirt', 'stone']],
  [v2Deep, [[18, 432], [457, 875], [901, 1319], [1344, 1756]], [[18, 431], [451, 868]], ['darkstone', 'grass']],
]) {
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const [x0, x1] = cols[col];
      const [y0, y1] = rows[row];
      const side = Math.min(x1 - x0, y1 - y0) - 8;
      const rect = {
        x: Math.round((x0 + x1 - side) / 2),
        y: row === 1 && keys[row] === 'grass' ? y0 + 2 : Math.round((y0 + y1 - side) / 2),
        w: side,
        h: side,
      };
      save(cropResize(sheet, rect, 128, 128), `blocks/${keys[row]}_${col}.png`);
    }
  }
}

// A prancha de detalhe tem celulas quase quadradas, mas nao exatamente.
// Recortar um quadrado real antes de reduzir evita esmagar os veios.
const v2Ores = PNG.sync.read(fs.readFileSync(path.join(root, 'arte-bruta/conferencia/conceito-blocos-v2-prancha.png')));
const oreCols = [[4, 390], [400, 790], [800, 1188], [1198, 1584], [1593, 1977]];
const oreRows = [[9, 313], [328, 618]];
for (const [name, col, row] of [
  ['ruin_brick', 3, 0],
  ['copper', 0, 1], ['iron', 1, 1], ['gold', 2, 1],
  ['amber', 3, 1], ['azurite', 4, 1],
]) {
  const [x0, x1] = oreCols[col];
  const [y0, y1] = oreRows[row];
  const side = Math.min(x1 - x0, y1 - y0) - 4;
  const rect = { x: Math.round((x0 + x1 - side) / 2), y: Math.round((y0 + y1 - side) / 2), w: side, h: side };
  save(cropResize(v2Ores, rect, 128, 128), `blocks/${name}_0.png`);
}

const decorations = read('cenario-v2-decoracoes.png');
for (const [name, x0, x1, width, height] of [
  ['roots', 77, 323, 96, 224],
  ['stalactite', 440, 806, 128, 128],
  ['support', 862, 1702, 384, 312],
  ['lantern', 1861, 2014, 64, 136],
]) {
  const rect = bounds(decorations, x0, 0, x1, decorations.height);
  save(cropResize(decorations, rect, width, height), `environment/${name}.png`);
}

const veins = read('cenario-v2-veios.png');
for (const [name, x0, x1] of [
  ['copper', 36, 530], ['iron', 572, 1063],
  ['gold', 1100, 1596], ['azurite', 1641, 2145],
]) {
  const box = bounds(veins, x0, 0, x1, veins.height);
  const side = Math.max(box.w, box.h) + 16;
  const rect = { x: Math.round(box.x + (box.w - side) / 2), y: Math.round(box.y + (box.h - side) / 2), w: side, h: side };
  save(cropResize(veins, rect, 128, 128), `ore/${name}.png`);
}
