#!/usr/bin/env node
/**
 * Recorta o t02-couro, que e o corpo inicial canonico sem ferramenta pintada.
 *
 * As folhas nao usam uma grade regular: os oito personagens foram distribuidos
 * com espacos diferentes. Dividir a largura por oito corta botas e mistura o
 * quadro vizinho. Por isso cada silhueta e encontrada pela propria transparencia.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ORIGEM = path.resolve('arte-bruta/trajes/t02-couro');
const DESTINO = path.resolve('public/art/trajes/inicial');
const QUADRO = 128;
const PES = 119;
const ALFA = 10;
const ALTURA_PARADO = 91;

function gruposDaFolha(png, esperados = 8) {
  const grupos = [];
  let inicio = -1;
  for (let x = 0; x <= png.width; x++) {
    let ativo = false;
    if (x < png.width) {
      for (let y = 0; y < png.height; y++) {
        if (png.data[(y * png.width + x) * 4 + 3] >= ALFA) { ativo = true; break; }
      }
    }
    if (ativo && inicio < 0) inicio = x;
    if (!ativo && inicio >= 0) { grupos.push([inicio, x - 1]); inicio = -1; }
  }

  // Pontos soltos da geracao podem formar uma ilha a um ou dois pixels do
  // corpo. Eles pertencem ao mesmo quadro, nao a um nono personagem.
  for (let i = grupos.length - 1; i > 0; i--) {
    const anteriorPequeno = grupos[i - 1][1] - grupos[i - 1][0] < 6;
    const atualPequeno = grupos[i][1] - grupos[i][0] < 6;
    if ((anteriorPequeno || atualPequeno) && grupos[i][0] - grupos[i - 1][1] <= 20) {
      grupos[i - 1][1] = grupos[i][1];
      grupos.splice(i, 1);
    }
  }
  if (grupos.length !== esperados) {
    throw new Error(`esperava ${esperados} silhuetas, achei ${grupos.length}`);
  }
  return grupos;
}

function caixa(png, [x0, x1]) {
  let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
  for (let y = 0; y < png.height; y++) for (let x = x0; x <= x1; x++) {
    if (png.data[(y * png.width + x) * 4 + 3] < ALFA) continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, h: maxY - minY + 1 };
}

function amostrar(origem, destino, dx, centroX, baseY, escala, limites) {
  const passo = Math.ceil(1 / escala);
  for (let y = 0; y < QUADRO; y++) for (let x = 0; x < QUADRO; x++) {
    const sx0 = centroX + (x - QUADRO / 2) / escala;
    const sy0 = baseY + (y - PES) / escala;
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let oy = 0; oy < passo; oy++) for (let ox = 0; ox < passo; ox++) {
      const sx = Math.round(sx0 + ox - passo / 2);
      const sy = Math.round(sy0 + oy - passo / 2);
      if (sx < limites[0] || sx > limites[1] || sy < 0 || sy >= origem.height) continue;
      const i = (sy * origem.width + sx) * 4;
      const av = origem.data[i + 3];
      r += origem.data[i] * av; g += origem.data[i + 1] * av;
      b += origem.data[i + 2] * av; a += av; n++;
    }
    if (!n || !a) continue;
    const j = (y * destino.width + dx + x) * 4;
    destino.data[j] = Math.round(r / a);
    destino.data[j + 1] = Math.round(g / a);
    destino.data[j + 2] = Math.round(b / a);
    destino.data[j + 3] = Math.round(a / n);
  }
}

if (!fs.existsSync(ORIGEM)) throw new Error('falta arte-bruta/trajes/t02-couro');
fs.mkdirSync(DESTINO, { recursive: true });

const idle = PNG.sync.read(fs.readFileSync(path.join(ORIGEM, 'idle.png')));
const caixasIdle = gruposDaFolha(idle).map((g) => caixa(idle, g));
const alturaIdle = caixasIdle.map((c) => c.h).sort((a, b) => a - b)[4];
const escalaBase = ALTURA_PARADO / alturaIdle;

for (const arquivo of fs.readdirSync(ORIGEM).filter((f) => f.endsWith('.png') && f !== 'tiro.png').sort()) {
  const origem = PNG.sync.read(fs.readFileSync(path.join(ORIGEM, arquivo)));
  const quadros = 8;
  const grupos = gruposDaFolha(origem, quadros);
  const caixas = grupos.map((g) => caixa(origem, g));
  // Andar veio 8% menor que parado na fonte. O corpo e o mesmo; so a folha
  // mudou de escala. Igualar as medianas impede o heroi de encolher ao mover.
  const alturas = caixas.map((c) => c.h).sort((a, b) => a - b);
  const ajustaAlturaParada = arquivo === 'walk.png';
  const escala = ajustaAlturaParada ? ALTURA_PARADO / alturas[Math.floor(alturas.length / 2)] : escalaBase;
  const base = Math.max(...caixas.map((c) => c.maxY));
  const saida = new PNG({ width: QUADRO * quadros, height: QUADRO });
  saida.data.fill(0);
  caixas.forEach((c, i) => amostrar(origem, saida, i * QUADRO, c.cx, base, escala, grupos[i]));
  fs.writeFileSync(path.join(DESTINO, arquivo), PNG.sync.write(saida));
  console.log(`  inicial/${arquivo.padEnd(10)} escala ${escala.toFixed(4)}`);
}
