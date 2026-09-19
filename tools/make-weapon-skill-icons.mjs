import fs from 'node:fs';
import { PNG } from 'pngjs';

const out = new URL('../public/art/skills/', import.meta.url);
fs.mkdirSync(out, { recursive: true });

const navy = [10, 22, 35, 255];
const gold = [255, 202, 82, 255];
const amber = [255, 131, 43, 255];
const cyan = [93, 231, 255, 255];
const violet = [187, 119, 255, 255];
const slate = [68, 95, 117, 255];

function icon(name, draw) {
  const p = new PNG({ width: 96, height: 96 });
  draw(p);
  fs.writeFileSync(new URL(name + '.png', out), PNG.sync.write(p));
}
function px(p, x, y, c) {
  if (x < 0 || y < 0 || x >= 96 || y >= 96) return;
  const i = (y * 96 + x) * 4;
  p.data[i] = c[0]; p.data[i + 1] = c[1]; p.data[i + 2] = c[2]; p.data[i + 3] = c[3];
}
function rect(p, x, y, w, h, c) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px(p, xx, yy, c);
}
function circle(p, cx, cy, r, c) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) px(p, cx + x, cy + y, c);
}
function line(p, x0, y0, x1, y1, c, w = 2) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + (x1 - x0) * i / Math.max(1, n));
    const y = Math.round(y0 + (y1 - y0) * i / Math.max(1, n));
    rect(p, x - Math.floor(w / 2), y - Math.floor(w / 2), w, w, c);
  }
}

icon('weapon_burst', (p) => {
  circle(p, 21, 49, 18, [255, 100, 28, 48]);
  circle(p, 21, 49, 11, navy);
  rect(p, 12, 45, 16, 9, amber);
  rect(p, 8, 47, 8, 5, gold);
  for (const [x, y, dx, dy] of [[35, 42, 18, -16], [37, 49, 22, 0], [35, 56, 18, 16]]) {
    line(p, x, y, x + dx, y + dy, navy, 9);
    line(p, x, y, x + dx, y + dy, gold, 5);
    rect(p, x + dx - 2, y + dy - 2, 5, 5, amber);
  }
  line(p, 48, 22, 60, 34, [255, 224, 137, 255], 2);
  line(p, 64, 60, 78, 74, [255, 224, 137, 255], 2);
});

icon('weapon_pierce', (p) => {
  // Dois blocos atravessados pelo mesmo nucleo, leitura imediata de perfuracao.
  rect(p, 16, 30, 21, 36, navy);
  rect(p, 20, 34, 15, 28, slate);
  rect(p, 59, 26, 21, 44, navy);
  rect(p, 63, 30, 13, 36, slate);
  line(p, 8, 48, 88, 48, navy, 11);
  line(p, 8, 48, 88, 48, cyan, 5);
  rect(p, 79, 43, 11, 11, [184, 251, 255, 255]);
  line(p, 9, 38, 25, 38, [184, 251, 255, 255], 2);
  line(p, 9, 58, 25, 58, [184, 251, 255, 255], 2);
});

icon('weapon_ricochet', (p) => {
  // Parede angular, bala em V e fagulhas douradas.
  for (let y = 16; y < 82; y += 8) {
    const x = 67 + ((y / 8) % 2) * 4;
    rect(p, x, y, 22, 7, navy);
    rect(p, x + 3, y + 2, 16, 3, slate);
  }
  line(p, 15, 70, 50, 46, navy, 13);
  line(p, 15, 70, 50, 46, violet, 7);
  line(p, 50, 46, 72, 28, navy, 12);
  line(p, 50, 46, 72, 28, gold, 5);
  circle(p, 52, 46, 7, cyan);
  for (const [x, y] of [[54, 33], [64, 42], [45, 32], [58, 59]]) line(p, 52, 46, x, y, gold, 2);
});

