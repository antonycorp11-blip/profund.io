#!/usr/bin/env node
/**
 * Prepara a arte bruta gerada por IA para o formato que o jogo espera.
 *
 *   npm run slice-assets
 *
 * Entrada (pasta arte-bruta/):
 *   blocos/01.png .. 15.png       -> texturas de bloco, na ordem de ASSETS.md
 *   blocos-v2/, blocos-v3/        -> variacoes opcionais (mesma ordem)
 *   sheet_character.png           -> folha 4x4 com 16 quadros do personagem
 *
 * Saida:
 *   public/art/blocks/<chave>_<variacao>.png   (128x128, opaco)
 *   public/art/character/miner_sheet.png       (512x512, 4x4 quadros de 128, com alpha)
 *
 * Opcoes:
 *   --src <dir>     pasta de entrada (padrao: arte-bruta)
 *   --size <px>     lado do tile de saida (padrao: 128)
 *   --inset <px>    recorta N px de cada borda da celula antes de reduzir
 *                   (use se a grade do personagem sair torta)
 *   --tol <0-255>   tolerancia do recorte de fundo (padrao: 60)
 */

import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

// Ordem EXATA das listas dos pedidos 1 e 2 em ASSETS.md.
const BLOCK_ORDER = [
  'dirt',
  'grass',
  'stone',
  'darkstone',
  'coal',
  'copper',
  'iron',
  'gold',
  'crystal',
  'ruin_brick',
  'plank',
  'bedrock',
  'backwall_dirt',
  'backwall_stone',
  'backwall_deep',
];

const VARIANT_DIRS = ['blocos', 'blocos-v2', 'blocos-v3'];
/** Ordem dos icones de recurso (mesma do PEDIDO 5 em ASSETS.md). */
const ICON_ORDER = ['coal', 'copper', 'iron', 'gold', 'crystal', 'stone'];
const ICON_SIZE = 64;
/** Fundos de parallax, na ordem do PEDIDO 6. */
const BG_ORDER = ['sky', 'cave_dirt', 'cave_stone', 'cave_deep'];
/** Ceus do ciclo dia/noite, na ordem do PEDIDO 9. */
const SKY_ORDER = ['sky_day', 'sky_dusk', 'sky_night'];
/** Largura de saida dos fundos (sao escuros e sem foco: metade resolve). */
const BG_WIDTH = 768;
/** Objetos da base, na ordem do PEDIDO 7. */
const PROP_ORDER = ['shed', 'depot', 'workshop', 'mine_entrance', 'lamp', 'cart'];
/** Maior lado de um prop depois do corte. */
const PROP_MAX = 320;
/**
 * Os icones sao desenhados com contorno escuro (certo para UI, errado para
 * incrustar na rocha). A versao "chunk" e o mesmo icone com o alfa erodido:
 * come a casca externa e leva o contorno junto, sem precisar de arte nova.
 */
const ORE_ERODE = 0.07;

/**
 * Icones da arvore de habilidades: 3 folhas 3x3.
 * A ordem de leitura de cada folha e a lista abaixo.
 */
const SKILL_ICON_SHEETS = {
  'icones-skill-a.png': [
    'power', 'speed', 'hardstone', 'ore_target', 'crit',
    'crit_mult', 'fracture', 'charged', 'cat_mining',
  ],
  'icones-skill-b.png': [
    'pickup', 'magnet', 'radius', 'yield', 'luck',
    'jackpot', 'backpack', 'organize', 'cat_collect',
  ],
  'icones-skill-c.png': [
    'boots', 'weight', 'jump', 'aircontrol', 'lantern',
    'eye', 'reach', 'legacy_mark', 'veteran_hand',
  ],
};
const SKILL_ICON_SIZE = 96;
const CHAR_COLS = 4;
const CHAR_ROWS = 4;
/** Onde a sola da bota fica dentro do quadro (mesmo valor de ART.character.feetAnchor). */
const FEET_ANCHOR = 0.94;

const args = parseArgs(process.argv.slice(2));
const SRC = args.src ?? 'arte-bruta';
const SIZE = Number(args.size ?? 128);
const INSET = Number(args.inset ?? 0);
const TOL = Number(args.tol ?? 60);

const OUT_BLOCKS = path.join('public', 'art', 'blocks');
const OUT_CHAR = path.join('public', 'art', 'character');

main();

function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`\n  Pasta "${SRC}/" nao encontrada.`);
    console.error('  Crie ela e coloque a arte gerada dentro. Ver ASSETS.md.\n');
    process.exit(1);
  }
  fs.mkdirSync(OUT_BLOCKS, { recursive: true });
  fs.mkdirSync(OUT_CHAR, { recursive: true });

  let wrote = 0;
  wrote += sliceBlocks();
  wrote += sliceCharacter();
  wrote += sliceCracks();
  wrote += sliceIcons();
  wrote += sliceIconSheet();
  wrote += sliceBackgrounds();
  wrote += sliceProps();
  wrote += sliceSkillIcons();
  wrote += sliceSkies();

  if (wrote === 0) {
    console.log('\n  Nada para processar. Confira os nomes em ASSETS.md.\n');
  } else {
    console.log(`\n  ${wrote} arquivo(s) gravado(s). Rode "npm run dev" para ver no jogo.\n`);
  }
}

// ----------------------------------------------------------------- blocos ---

function sliceBlocks() {
  let count = 0;
  for (let v = 0; v < VARIANT_DIRS.length; v++) {
    const dir = path.join(SRC, VARIANT_DIRS[v]);
    if (!fs.existsSync(dir)) continue;

    const files = fs
      .readdirSync(dir)
      .filter((f) => /\.png$/i.test(f))
      .sort(naturalSort);

    if (files.length === 0) continue;
    console.log(`\n  ${dir}/  (variacao _${v})`);

    if (files.length !== BLOCK_ORDER.length) {
      console.log(
        `  ! ${files.length} imagem(ns) para ${BLOCK_ORDER.length} blocos — mapeando o que der, na ordem.`
      );
    }

    files.forEach((file, i) => {
      // Se o arquivo ja tem o nome da chave, respeita; senao usa a ordem.
      const base = file.replace(/\.png$/i, '').toLowerCase();
      const byName = BLOCK_ORDER.find((k) => base === k || base.endsWith('_' + k));
      const key = byName ?? BLOCK_ORDER[i];
      if (!key) return;

      const src = readPng(path.join(dir, file));
      if (!src) return;
      const square = cropSquare(src);
      const out = resize(square, SIZE, SIZE);
      stripAlpha(out);
      writePng(path.join(OUT_BLOCKS, `${key}_${v}.png`), out);
      console.log(`    ${file.padEnd(22)} -> ${key}_${v}.png`);
      count++;
    });
  }
  if (count === 0) console.log(`\n  (nenhuma pasta de blocos encontrada em ${SRC}/)`);
  return count;
}

// ------------------------------------------------------------- personagem ---

function sliceCharacter() {
  const candidates = ['sheet_character.png', 'personagem.png', 'character.png'];
  const found = candidates.map((c) => path.join(SRC, c)).find((p) => fs.existsSync(p));
  if (!found) {
    console.log(`\n  (folha do personagem nao encontrada: ${SRC}/sheet_character.png)`);
    return 0;
  }

  const src = readPng(found);
  if (!src) return 0;
  console.log(`\n  ${found}  ->  ${CHAR_COLS}x${CHAR_ROWS} quadros`);

  const edgeX = (i) => Math.round((i * src.width) / CHAR_COLS);
  const edgeY = (i) => Math.round((i * src.height) / CHAR_ROWS);
  const bg = detectBackground(src);
  if (bg) {
    console.log(
      `    fundo chapado detectado rgb(${bg.r},${bg.g},${bg.b}) — recortando com tolerancia ${TOL}`
    );
  } else {
    console.log('    folha ja tem transparencia — mantendo o alpha original');
  }

  const sheet = new PNG({ width: SIZE * CHAR_COLS, height: SIZE * CHAR_ROWS });
  sheet.data.fill(0);

  // Linha dos pes: todos os quadros sao alinhados nela, senao o heroi "pula" na animacao.
  const feetY = Math.round(SIZE * FEET_ANCHOR);
  const ajustes = [];

  for (let row = 0; row < CHAR_ROWS; row++) {
    for (let col = 0; col < CHAR_COLS; col++) {
      const x0 = edgeX(col) + INSET;
      const y0 = edgeY(row) + INSET;
      const cell = crop(src, x0, y0, edgeX(col + 1) - x0 - INSET, edgeY(row + 1) - y0 - INSET);
      if (bg) keyOut(cell, bg, TOL);
      const small = resize(cell, SIZE, SIZE);

      const box = contentBox(small);
      if (!box) continue; // quadro vazio (o 16o, por especificacao)
      const dy = clampInt(feetY - box.bottom, -box.top, SIZE - 1 - box.bottom);
      blitOffset(small, sheet, col * SIZE, row * SIZE, 0, dy);
      if (dy !== 0) ajustes.push(`${row * CHAR_COLS + col}:${dy > 0 ? '+' : ''}${dy}`);
    }
  }

  writePng(path.join(OUT_CHAR, 'miner_sheet.png'), sheet);
  console.log(`    -> miner_sheet.png (${sheet.width}x${sheet.height})`);
  console.log(`    pes alinhados em y=${feetY}px de ${SIZE}px` +
    (ajustes.length ? ` (correcoes: ${ajustes.join(', ')})` : ''));
  return 1;
}

// ---------------------------------------------------------- rachaduras ---

/** Folha 2x2 com os 4 estagios de rachadura -> public/art/fx/cracks.png */
function sliceCracks() {
  const file = path.join(SRC, 'sheet_cracks.png');
  if (!fs.existsSync(file)) return 0;
  const src = readPng(file);
  if (!src) return 0;

  const cellW = Math.floor(src.width / 2);
  const cellH = Math.floor(src.height / 2);
  const bg = detectBackground(src);
  const out = new PNG({ width: SIZE * 2, height: SIZE * 2 });
  out.data.fill(0);

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const cell = crop(src, col * cellW + INSET, row * cellH + INSET, cellW - INSET * 2, cellH - INSET * 2);
      if (bg) keyOut(cell, bg, TOL);
      blit(resize(cell, SIZE, SIZE), out, col * SIZE, row * SIZE);
    }
  }
  fs.mkdirSync(path.join('public', 'art', 'fx'), { recursive: true });
  writePng(path.join('public', 'art', 'fx', 'cracks.png'), out);
  console.log(`\n  ${file}  ->  fx/cracks.png (4 estagios de ${SIZE}px)`);
  return 1;
}

// --------------------------------------------------------------- icones ---

/** arte-bruta/icones/01..06.png -> public/art/ui/<recurso>.png */
function sliceIcons() {
  const dir = path.join(SRC, 'icones');
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort(naturalSort);
  if (files.length === 0) return 0;

  fs.mkdirSync(path.join('public', 'art', 'ui'), { recursive: true });
  console.log(`\n  ${dir}/`);
  let n = 0;
  files.forEach((file, i) => {
    const base = file.replace(/\.png$/i, '').toLowerCase();
    const key = ICON_ORDER.find((k) => base === k || base.endsWith('_' + k)) ?? ICON_ORDER[i];
    if (!key) return;
    const src = readPng(path.join(dir, file));
    if (!src) return;
    const square = cropSquare(src);
    const bg = detectBackground(square);
    if (bg) keyOut(square, bg, TOL);
    writePng(path.join('public', 'art', 'ui', `${key}.png`), resize(square, ICON_SIZE, ICON_SIZE));
    console.log(`    ${file.padEnd(22)} -> ui/${key}.png`);
    n++;
  });
  return n;
}

/**
 * Folha unica com os 6 icones (3 colunas x 2 linhas), na ordem de ICON_ORDER.
 * O ChatGPT costuma devolver os 6 juntos em 1536x1024 em vez de 6 imagens.
 */
function sliceIconSheet() {
  const file = path.join(SRC, 'sheet_icones.png');
  if (!fs.existsSync(file)) return 0;
  const src = readPng(file);
  if (!src) return 0;

  const cols = 3;
  const rows = 2;
  const edgeX = (i) => Math.round((i * src.width) / cols);
  const edgeY = (i) => Math.round((i * src.height) / rows);
  const bg = detectBackground(src);

  fs.mkdirSync(path.join('public', 'art', 'ui'), { recursive: true });
  console.log(`\n  ${file}  ->  ${cols}x${rows} icones`);
  if (bg) console.log(`    fundo chapado rgb(${bg.r},${bg.g},${bg.b}) — recortando`);

  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = ICON_ORDER[r * cols + c];
      if (!key) continue;
      const x0 = edgeX(c) + INSET;
      const y0 = edgeY(r) + INSET;
      const cell = crop(src, x0, y0, edgeX(c + 1) - x0 - INSET, edgeY(r + 1) - y0 - INSET);
      if (bg) keyOut(cell, bg, TOL);
      const small = resize(cell, ICON_SIZE, ICON_SIZE);
      writePng(path.join('public', 'art', 'ui', `${key}.png`), small);
      writeOreChunk(key, small);
      console.log(`    celula ${r},${c} -> ui/${key}.png + ore/${key}.png`);
      n++;
    }
  }
  return n;
}

// --------------------------------------------------------------- fundos ---

/** arte-bruta/fundos/01..04.png -> public/art/bg/<chave>.png */
function sliceBackgrounds() {
  const dir = path.join(SRC, 'fundos');
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort(naturalSort);
  if (files.length === 0) return 0;

  fs.mkdirSync(path.join('public', 'art', 'bg'), { recursive: true });
  console.log(`\n  ${dir}/`);
  let n = 0;
  files.forEach((file, i) => {
    const base = file.replace(/\.png$/i, '').toLowerCase();
    const key = BG_ORDER.find((k) => base === k || base.endsWith('_' + k)) ?? BG_ORDER[i];
    if (!key) return;
    const src = readPng(path.join(dir, file));
    if (!src) return;
    const h = Math.round((src.height / src.width) * BG_WIDTH);
    const out = resize(src, BG_WIDTH, h);
    stripAlpha(out);
    writePng(path.join('public', 'art', 'bg', `${key}.png`), out);
    console.log(`    ${file.padEnd(22)} -> bg/${key}.png (${BG_WIDTH}x${h})`);
    n++;
  });
  return n;
}

// ---------------------------------------------------------------- props ---

/** arte-bruta/props/01..06.png -> public/art/props/<chave>.png, ja aparado */
function sliceProps() {
  const dir = path.join(SRC, 'props');
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort(naturalSort);
  if (files.length === 0) return 0;

  fs.mkdirSync(path.join('public', 'art', 'props'), { recursive: true });
  console.log(`\n  ${dir}/`);
  let n = 0;
  files.forEach((file, i) => {
    const base = file.replace(/\.png$/i, '').toLowerCase();
    const key = PROP_ORDER.find((k) => base === k || base.endsWith('_' + k)) ?? PROP_ORDER[i];
    if (!key) return;
    const src = readPng(path.join(dir, file));
    if (!src) return;

    const bg = detectBackground(src);
    if (bg) keyOut(src, bg, TOL);

    // Apara a margem transparente: a ancora do sprite precisa ser exata.
    const box = contentBox(src);
    if (!box) return;
    const trimmed = crop(src, box.left, box.top, box.right - box.left + 1, box.bottom - box.top + 1);
    const scale = PROP_MAX / Math.max(trimmed.width, trimmed.height);
    const w = Math.max(1, Math.round(trimmed.width * Math.min(1, scale)));
    const h = Math.max(1, Math.round(trimmed.height * Math.min(1, scale)));

    writePng(path.join('public', 'art', 'props', `${key}.png`), resize(trimmed, w, h));
    console.log(`    ${file.padEnd(22)} -> props/${key}.png (${w}x${h})`);
    n++;
  });
  return n;
}

/**
 * Versao do icone sem contorno, para ser carimbada na rocha.
 * Erode o alfa em N pixels e deixa a borda nova com transparencia parcial,
 * para a pepita fundir com a pedra em vez de parecer colada por cima.
 */
function writeOreChunk(key, icon) {
  const radius = Math.max(2, Math.round(icon.width * ORE_ERODE));
  const out = new PNG({ width: icon.width, height: icon.height });
  icon.data.copy(out.data);

  // Distancia (aproximada) de cada pixel opaco ate a borda transparente.
  const w = icon.width;
  const h = icon.height;
  const dist = new Float32Array(w * h);
  const BIG = 1e6;
  for (let i = 0; i < w * h; i++) dist[i] = icon.data[i * 4 + 3] > 128 ? BIG : 0;
  // Duas passadas (chamfer) resolvem bem para este tamanho.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (dist[i] === 0) continue;
      let best = dist[i];
      if (x > 0) best = Math.min(best, dist[i - 1] + 1);
      if (y > 0) best = Math.min(best, dist[i - w] + 1);
      if (x > 0 && y > 0) best = Math.min(best, dist[i - w - 1] + 1.41);
      dist[i] = best;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (dist[i] === 0) continue;
      let best = dist[i];
      if (x < w - 1) best = Math.min(best, dist[i + 1] + 1);
      if (y < h - 1) best = Math.min(best, dist[i + w] + 1);
      if (x < w - 1 && y < h - 1) best = Math.min(best, dist[i + w + 1] + 1.41);
      dist[i] = best;
    }
  }

  const feather = radius * 0.5;
  for (let i = 0; i < w * h; i++) {
    const d = dist[i];
    const a = out.data[i * 4 + 3];
    if (a === 0) continue;
    if (d <= radius) {
      out.data[i * 4 + 3] = 0;
    } else if (d < radius + feather) {
      const t = (d - radius) / feather;
      out.data[i * 4 + 3] = Math.round(a * t);
    }
  }

  fs.mkdirSync(path.join('public', 'art', 'ore'), { recursive: true });
  writePng(path.join('public', 'art', 'ore', `${key}.png`), out);
}

/** arte-bruta/ceus/01..03.png -> public/art/bg/sky_<fase>.png */
function sliceSkies() {
  const dir = path.join(SRC, 'ceus');
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort(naturalSort);
  if (files.length === 0) return 0;

  fs.mkdirSync(path.join('public', 'art', 'bg'), { recursive: true });
  console.log(`\n  ${dir}/`);
  let n = 0;
  files.forEach((file, i) => {
    const key = SKY_ORDER[i];
    if (!key) return;
    const src = readPng(path.join(dir, file));
    if (!src) return;
    const h = Math.round((src.height / src.width) * BG_WIDTH);
    const out = resize(src, BG_WIDTH, h);
    stripAlpha(out);
    writePng(path.join('public', 'art', 'bg', `${key}.png`), out);
    console.log(`    ${file.padEnd(22)} -> bg/${key}.png`);
    n++;
  });
  return n;
}

// ------------------------------------------------- icones de habilidade ---

/** Folhas 3x3 -> public/art/skills/<nome>.png */
function sliceSkillIcons() {
  let total = 0;
  for (const [file, names] of Object.entries(SKILL_ICON_SHEETS)) {
    const full = path.join(SRC, file);
    if (!fs.existsSync(full)) continue;
    const src = readPng(full);
    if (!src) continue;

    const cols = 3;
    const rows = 3;
    const edgeX = (i) => Math.round((i * src.width) / cols);
    const edgeY = (i) => Math.round((i * src.height) / rows);
    const bg = detectBackground(src);

    fs.mkdirSync(path.join('public', 'art', 'skills'), { recursive: true });
    console.log(`\n  ${full}  ->  ${cols}x${rows} icones`);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const name = names[r * cols + c];
        if (!name) continue;
        const x0 = edgeX(c) + INSET;
        const y0 = edgeY(r) + INSET;
        const cell = crop(src, x0, y0, edgeX(c + 1) - x0 - INSET, edgeY(r + 1) - y0 - INSET);
        if (bg) keyOut(cell, bg, TOL);
        const box = contentBox(cell);
        const tight = box
          ? crop(cell, box.left, box.top, box.right - box.left + 1, box.bottom - box.top + 1)
          : cell;
        writePng(
          path.join('public', 'art', 'skills', `${name}.png`),
          resize(tight, SKILL_ICON_SIZE, SKILL_ICON_SIZE)
        );
        console.log(`    ${r},${c} -> skills/${name}.png`);
        total++;
      }
    }
  }
  return total;
}

// ------------------------------------------------------------ utilitarios ---

function readPng(file) {
  try {
    return PNG.sync.read(fs.readFileSync(file));
  } catch (err) {
    console.error(`    ! nao consegui ler ${file}`);
    console.error('      (o arquivo precisa ser PNG de verdade — WebP e JPG nao servem)');
    return null;
  }
}

function writePng(file, png) {
  fs.writeFileSync(file, PNG.sync.write(png));
}

/** Recorta o maior quadrado centralizado (imagens vem quadradas, mas nao custa garantir). */
function cropSquare(src) {
  if (src.width === src.height) return src;
  const s = Math.min(src.width, src.height);
  return crop(src, Math.floor((src.width - s) / 2), Math.floor((src.height - s) / 2), s, s);
}

function crop(src, x, y, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let j = 0; j < h; j++) {
    const sy = Math.min(src.height - 1, Math.max(0, y + j));
    for (let i = 0; i < w; i++) {
      const sx = Math.min(src.width - 1, Math.max(0, x + i));
      const si = (sy * src.width + sx) * 4;
      const di = (j * w + i) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = src.data[si + 3];
    }
  }
  return out;
}

/** Redimensiona por media de area — nitido e sem serrilhado ao reduzir muito. */
function resize(src, w, h) {
  const out = new PNG({ width: w, height: h });
  const fx = src.width / w;
  const fy = src.height / h;
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * fy);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * fy));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * fx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * fx));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let sy = y0; sy < y1 && sy < src.height; sy++) {
        for (let sx = x0; sx < x1 && sx < src.width; sx++) {
          const i = (sy * src.width + sx) * 4;
          const alpha = src.data[i + 3] / 255;
          // Pre-multiplica: evita halo escuro nas bordas recortadas.
          r += src.data[i] * alpha;
          g += src.data[i + 1] * alpha;
          b += src.data[i + 2] * alpha;
          a += src.data[i + 3];
          n++;
        }
      }
      const di = (y * w + x) * 4;
      const aAvg = a / n;
      const aNorm = aAvg / 255;
      out.data[di] = aNorm > 0.001 ? clamp8(r / n / aNorm) : 0;
      out.data[di + 1] = aNorm > 0.001 ? clamp8(g / n / aNorm) : 0;
      out.data[di + 2] = aNorm > 0.001 ? clamp8(b / n / aNorm) : 0;
      out.data[di + 3] = clamp8(aAvg);
    }
  }
  return out;
}

/** Retangulo ocupado pelo conteudo opaco do quadro. */
function contentBox(png) {
  let top = -1;
  let bottom = -1;
  let left = png.width;
  let right = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3] < 24) continue;
      if (top < 0) top = y;
      bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  return bottom < 0 ? null : { top, bottom, left, right };
}

function clampInt(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/** Como blit, mas deslocando o conteudo dentro do quadro de destino. */
function blitOffset(src, dst, x, y, ox, oy) {
  for (let j = 0; j < src.height; j++) {
    const dj = j + oy;
    if (dj < 0 || dj >= src.height) continue;
    for (let i = 0; i < src.width; i++) {
      const di = i + ox;
      if (di < 0 || di >= src.width) continue;
      const si = (j * src.width + i) * 4;
      const d = ((y + dj) * dst.width + (x + di)) * 4;
      dst.data[d] = src.data[si];
      dst.data[d + 1] = src.data[si + 1];
      dst.data[d + 2] = src.data[si + 2];
      dst.data[d + 3] = src.data[si + 3];
    }
  }
}

function blit(src, dst, x, y) {
  for (let j = 0; j < src.height; j++) {
    for (let i = 0; i < src.width; i++) {
      const si = (j * src.width + i) * 4;
      const di = ((y + j) * dst.width + (x + i)) * 4;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
}

function stripAlpha(png) {
  for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
}

/**
 * Descobre se a folha veio com fundo chapado (magenta/branco/qualquer cor uniforme).
 * Retorna null quando ja existe transparencia util.
 */
function detectBackground(src) {
  let transparent = 0;
  for (let i = 3; i < src.data.length; i += 4) {
    if (src.data[i] < 16) transparent++;
  }
  const ratio = transparent / (src.data.length / 4);
  if (ratio > 0.15) return null; // ja tem alpha de verdade

  // Amostra os 4 cantos e pega a cor que mais se repete.
  const samples = [];
  const pts = [
    [2, 2],
    [src.width - 3, 2],
    [2, src.height - 3],
    [src.width - 3, src.height - 3],
    [Math.floor(src.width / 2), 2],
  ];
  for (const [x, y] of pts) {
    const i = (y * src.width + x) * 4;
    samples.push({ r: src.data[i], g: src.data[i + 1], b: src.data[i + 2] });
  }
  const first = samples[0];
  const agree = samples.filter(
    (s) => Math.abs(s.r - first.r) < 24 && Math.abs(s.g - first.g) < 24 && Math.abs(s.b - first.b) < 24
  );
  if (agree.length < 3) return null; // fundo nao e chapado: nao arrisca recortar
  return first;
}

/** Remove o fundo chapado com borda suavizada e sem halo de cor. */
function keyOut(png, bg, tol) {
  const soft = tol * 1.8;
  for (let i = 0; i < png.data.length; i += 4) {
    const d = Math.max(
      Math.abs(png.data[i] - bg.r),
      Math.abs(png.data[i + 1] - bg.g),
      Math.abs(png.data[i + 2] - bg.b)
    );
    if (d <= tol) {
      png.data[i + 3] = 0;
    } else if (d < soft) {
      const t = (d - tol) / (soft - tol);
      png.data[i + 3] = clamp8(png.data[i + 3] * t);
      // Tira o "vazamento" da cor do fundo nos pixels de borda.
      png.data[i] = clamp8(png.data[i] - bg.r * (1 - t) * 0.5);
      png.data[i + 1] = clamp8(png.data[i + 1] - bg.g * (1 - t) * 0.5);
      png.data[i + 2] = clamp8(png.data[i + 2] - bg.b * (1 - t) * 0.5);
    }
  }
}

function clamp8(v) {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function naturalSort(a, b) {
  return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}
