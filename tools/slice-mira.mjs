#!/usr/bin/env node
/**
 * Fatia a tira do heroi EM POSE DE MIRA.
 *
 *   npm run slice-mira
 *
 * Entrada:  arte-bruta/armas/heroi-mira.png  — dez quadros numa fileira
 * Saida:    public/art/character/aim.png     — 10 x 128 px, alinhado pelos pes
 *
 * O alinhamento e pelos PES, e nao pela caixa do desenho. Nestes quadros o
 * braco esta esticado para fora do corpo, e a caixa muda de largura conforme
 * ele aponta para cima, para a frente ou para baixo. Centralizar pela caixa
 * faria o corpo escorregar para o lado a cada troca de mira — o personagem
 * andaria sozinho enquanto o jogador so move o polegar.
 *
 * Os pes ficam parados em qualquer pose, entao sao eles a referencia.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const LIMIAR = 24;
/** Mesmo formato das outras tiras do heroi (ver ART.character.stripFrame). */
const QUADRO = 128;
/** Onde a linha dos pes cai dentro do quadro (ART.character.feetAnchor). */
const ANCORA_PES = 0.94;
const QUADROS = 10;

const entrada = path.resolve(process.argv[2] ?? 'arte-bruta/armas/heroi-mira.png');
const saida = path.resolve('public/art/character/aim.png');

const src = PNG.sync.read(fs.readFileSync(entrada));

function opaco(x, y) {
  if (x < 0 || y < 0 || x >= src.width || y >= src.height) return false;
  return src.data[(y * src.width + x) * 4 + 3] >= LIMIAR;
}

/** Bloco desenhado da folha inteira, para descartar a margem do gerador. */
function blocoDeConteudo() {
  let x0 = src.width;
  let x1 = -1;
  for (let x = 0; x < src.width; x++) {
    for (let y = 0; y < src.height; y++) {
      if (!opaco(x, y)) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      break;
    }
  }
  return [x0, x1];
}

/** Caixa do desenho dentro de uma coluna. */
function caixa(cx0, cx1) {
  let minX = cx1;
  let maxX = cx0;
  let minY = src.height;
  let maxY = -1;
  for (let y = 0; y < src.height; y++) {
    for (let x = cx0; x <= cx1; x++) {
      if (!opaco(x, y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, maxY };
}

/**
 * Centro horizontal dos PES: a media das colunas desenhadas nas linhas de
 * baixo do quadro. E o unico ponto do corpo que nao se mexe quando o braco
 * muda de direcao.
 */
function centroDosPes(cx0, cx1, box) {
  const deBaixo = Math.max(box.y, box.maxY - Math.round(box.h * 0.12));
  let soma = 0;
  let n = 0;
  for (let y = deBaixo; y <= box.maxY; y++) {
    for (let x = cx0; x <= cx1; x++) {
      if (!opaco(x, y)) continue;
      soma += x;
      n++;
    }
  }
  return n > 0 ? soma / n : (box.x + box.w / 2);
}

const [bx0, bx1] = blocoDeConteudo();
const largCel = (bx1 - bx0 + 1) / QUADROS;

const out = new PNG({ width: QUADRO * QUADROS, height: QUADRO });
// PNG novo nasce com lixo; zera o alfa antes de compor.
out.data.fill(0);

// Uma escala SO para todos os quadros: escalar cada um pela propria altura
// faria o personagem crescer e encolher entre poses.
let alturaMaxima = 0;
const celulas = [];
for (let i = 0; i < QUADROS; i++) {
  const cx0 = Math.round(bx0 + i * largCel);
  const cx1 = Math.round(bx0 + (i + 1) * largCel) - 1;
  const box = caixa(cx0, cx1);
  celulas.push({ cx0, cx1, box, pes: centroDosPes(cx0, cx1, box) });
  if (box.h > alturaMaxima) alturaMaxima = box.h;
}
// Deixa uma folga de 6% para o quadro nao encostar no topo.
const escala = (QUADRO * 0.9) / alturaMaxima;

for (let i = 0; i < QUADROS; i++) {
  const { box, pes } = celulas[i];
  const destX = i * QUADRO;
  const linhaPes = Math.round(QUADRO * ANCORA_PES);
  for (let y = 0; y < QUADRO; y++) {
    for (let x = 0; x < QUADRO; x++) {
      // Volta do quadro de saida para o pixel da folha: os pes do desenho
      // caem na linha dos pes do quadro, e o centro dos pes no meio dele.
      const sx = Math.round(pes + (x - QUADRO / 2) / escala);
      const sy = Math.round(box.maxY + (y - linhaPes) / escala);
      if (sx < box.x || sx > box.x + box.w || sy < box.y || sy > box.maxY) continue;
      const si = (sy * src.width + sx) * 4;
      const di = (y * out.width + destX + x) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = src.data[si + 3];
    }
  }
}

fs.mkdirSync(path.dirname(saida), { recursive: true });
fs.writeFileSync(saida, PNG.sync.write(out));
console.log(`  character/aim.png  ${out.width}x${out.height}  (${QUADROS} quadros)`);
