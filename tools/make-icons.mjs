/**
 * Gera os icones PNG do PWA a partir da arte que o jogo ja tem.
 *
 * Android e iOS ignoram icone SVG na tela inicial, entao o manifest precisa de
 * PNG de verdade. Em vez de pedir arte nova, recortamos a entrada da mina —
 * e a imagem que melhor representa o jogo em um quadrado pequeno.
 *
 * Uso: npm run icons
 */
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// O protagonista e o que melhor se le num quadrado de 48 px na tela inicial.
const SOURCE = resolve(ROOT, 'public/art/character/miner_sheet.png');
/** Recorte do primeiro quadro da folha 4x4 (pose parado). */
const FRAME = { x: 0, y: 0, w: 128, h: 128 };
const OUT_DIR = resolve(ROOT, 'public/icons');

/** Fundo: o mesmo marrom quase preto do tema. */
const BG = [26, 20, 16, 255];

function load(path) {
  return PNG.sync.read(readFileSync(path));
}

/** Amostra bilinear simples — o icone e reduzido, entao suavizar ajuda. */
function sample(src, x, y) {
  const px = Math.min(src.width - 1, Math.max(0, Math.round(x)));
  const py = Math.min(src.height - 1, Math.max(0, Math.round(y)));
  const i = (py * src.width + px) << 2;
  return [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]];
}

/**
 * @param {number} size lado do icone
 * @param {number} pad margem interna (maskable precisa de zona segura)
 * @param {boolean} rounded canto arredondado (icone "any")
 */
function render(src, size, pad, rounded) {
  const out = new PNG({ width: size, height: size });
  const inner = size - pad * 2;
  const crop = Math.min(FRAME.w, FRAME.h);
  const ox = FRAME.x + (FRAME.w - crop) / 2;
  const oy = FRAME.y + (FRAME.h - crop) / 2;
  const radius = rounded ? size * 0.22 : 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) << 2;
      let [r, g, b, a] = BG;

      if (x >= pad && x < size - pad && y >= pad && y < size - pad) {
        const sx = ox + ((x - pad) / inner) * crop;
        const sy = oy + ((y - pad) / inner) * crop;
        const [sr, sg, sb, sa] = sample(src, sx, sy);
        const alpha = sa / 255;
        r = Math.round(sr * alpha + r * (1 - alpha));
        g = Math.round(sg * alpha + g * (1 - alpha));
        b = Math.round(sb * alpha + b * (1 - alpha));
      }

      if (radius > 0) {
        // Recorta os cantos: distancia ao centro do arco mais proximo.
        const cx = x < radius ? radius : x > size - radius ? size - radius : x;
        const cy = y < radius ? radius : y > size - radius ? size - radius : y;
        const d = Math.hypot(x - cx, y - cy);
        if (d > radius) a = 0;
        else if (d > radius - 1) a = Math.round(255 * (radius - d));
      }

      out.data[i] = r;
      out.data[i + 1] = g;
      out.data[i + 2] = b;
      out.data[i + 3] = a;
    }
  }
  return out;
}

const src = load(SOURCE);
mkdirSync(OUT_DIR, { recursive: true });

const jobs = [
  ['icon-192.png', 192, 0, true],
  ['icon-512.png', 512, 0, true],
  // Maskable: o sistema corta em circulo/squircle, entao a arte fica menor.
  ['icon-maskable-512.png', 512, 64, false],
  ['apple-touch-icon.png', 180, 0, false],
];

for (const [name, size, pad, rounded] of jobs) {
  const png = render(src, size, pad, rounded);
  writeFileSync(resolve(OUT_DIR, name), PNG.sync.write(png));
  console.log(`[icons] ${name} (${size}px)`);
}
