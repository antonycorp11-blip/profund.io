#!/usr/bin/env node
/**
 * Recorta os trajes em tiras de animacao, um diretorio por traje.
 *
 *   npm run slice-trajes
 *
 * Entrada:  arte-bruta/trajes/zip/*.PNG  +  arte-bruta/trajes/mapa.json
 * Saida:    public/art/trajes/<traje>/{idle,walk,mine,jump,climb,tiro}.png
 *
 * O MAPA E EDITAVEL DE PROPOSITO.
 *
 * As folhas chegaram com nomes de UUID: nada dizia a que traje pertenciam nem
 * que animacao continham. O mapa foi deduzido por medicao (ver
 * tools/identificar-trajes.mjs) e cada rotulo tem uma evidencia fisica —
 * minerar levanta a ferramenta acima da cabeca, andar mexe as pernas e nao o
 * tronco, parado nao mexe nada.
 *
 * Medicao nao e certeza. Se uma animacao entrar trocada no jogo, o conserto e
 * editar uma linha do mapa e rodar isto de novo, nao refazer a deducao.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ZIP = path.resolve('arte-bruta/trajes/zip');
const MAPA = path.resolve('arte-bruta/trajes/mapa.json');
const SAIDA = path.resolve('public/art/trajes');
const QUADROS = 8;
const DESTINO = 128;

if (!fs.existsSync(MAPA)) {
  console.log('  falta arte-bruta/trajes/mapa.json — rode npm run identificar-trajes');
  process.exit(1);
}
const mapa = JSON.parse(fs.readFileSync(MAPA, 'utf8'));

function alfa(png, x, y) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return 0;
  const a = png.data[(y * png.width + x) * 4 + 3];
  return a >= 250 ? 255 : a;
}

function medir(png, x0, larg) {
  let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
  let somaX = 0, n = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < larg; x++) {
      if (alfa(png, x0 + x, y) < 200) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      somaX += x;
      n++;
    }
  }
  return n ? { minX, maxX, topo: minY, pes: maxY, centro: somaX / n } : null;
}

function reduzir(origem, ox, oy, destino, dx, escala, limX) {
  for (let y = 0; y < DESTINO; y++) {
    for (let x = 0; x < DESTINO; x++) {
      const sx0 = ox + (x - DESTINO / 2) / escala;
      const sy0 = oy + (y - DESTINO) / escala;
      let r = 0, g = 0, b = 0, a = 0, peso = 0;
      const passo = Math.max(1, Math.round(1 / escala));
      for (let sy = 0; sy < passo; sy++) {
        for (let sx = 0; sx < passo; sx++) {
          const px = Math.round(sx0 + sx);
          const py = Math.round(sy0 + sy);
          if (px < 0 || py < 0 || px >= origem.width || py >= origem.height) continue;
          // Fecha o quadro: sem isto a janela entra no quadro vizinho e traz o
          // boneco do lado para a borda deste. Foi o que aconteceu com os bots.
          if (px < limX[0] || px >= limX[1]) continue;
          const i = (py * origem.width + px) * 4;
          const av = origem.data[i + 3] >= 250 ? 255 : origem.data[i + 3];
          r += origem.data[i] * av;
          g += origem.data[i + 1] * av;
          b += origem.data[i + 2] * av;
          a += av;
          peso++;
        }
      }
      if (!peso || a === 0) continue;
      const j = ((y) * destino.width + (dx + x)) * 4;
      destino.data[j] = Math.round(r / a);
      destino.data[j + 1] = Math.round(g / a);
      destino.data[j + 2] = Math.round(b / a);
      destino.data[j + 3] = Math.round(a / peso);
    }
  }
}

let total = 0;
for (const [traje, def] of Object.entries(mapa)) {
  const dir = path.join(SAIDA, traje);
  fs.mkdirSync(dir, { recursive: true });

  /*
   * UMA escala para o TRAJE inteiro, tirada da pose mais alta.
   *
   * Por animacao, o boneco encolheria ao minerar (ele se inclina, fica mais
   * baixo, e escalar cada tira para a mesma altura util corrigiria justamente
   * a inclinacao que deve aparecer). Foi o primeiro erro no recorte dos bots.
   */
  let alturaMax = 0;
  const pngs = {};
  for (const [anim, arquivo] of Object.entries(def.folhas)) {
    const png = PNG.sync.read(fs.readFileSync(path.join(ZIP, arquivo)));
    pngs[anim] = png;
    const larg = Math.floor(png.width / QUADROS);
    for (let q = 0; q < QUADROS; q++) {
      const m = medir(png, q * larg, larg);
      if (m) alturaMax = Math.max(alturaMax, m.pes - m.topo + 1);
    }
  }
  const escala = (DESTINO * 0.78) / alturaMax;

  const linhas = [];
  for (const [anim, png] of Object.entries(pngs)) {
    const larg = Math.floor(png.width / QUADROS);
    const medidas = [];
    for (let q = 0; q < QUADROS; q++) medidas.push(medir(png, q * larg, larg));
    if (medidas.some((m) => !m)) {
      console.log(`  ${traje}/${anim}: quadro vazio — folha fora do formato`);
      continue;
    }
    const pes = Math.max(...medidas.map((m) => m.pes));

    const tira = new PNG({ width: DESTINO * QUADROS, height: DESTINO });
    tira.data.fill(0);
    for (let q = 0; q < QUADROS; q++) {
      const m = medidas[q];
      // Centro de massa, preso dentro do quadro: mantem o tronco no lugar
      // quando um membro estica, sem deixar nada sair pela borda.
      const meio = DESTINO / 2;
      const margem = 3;
      const limEsq = m.maxX - (meio - margem) / escala;
      const limDir = m.minX + (meio - margem) / escala;
      const desloc = Math.min(Math.max(m.centro, limEsq), limDir);
      reduzir(
        png,
        q * larg + desloc,
        pes + 2 + Math.round((DESTINO * 0.05) / escala),
        tira,
        q * DESTINO,
        escala,
        [q * larg, (q + 1) * larg]
      );
    }
    fs.writeFileSync(path.join(dir, `${anim}.png`), PNG.sync.write(tira));
    linhas.push(anim);
    total++;
  }
  console.log(`  ${traje.padEnd(8)} escala ${escala.toFixed(3)}  ${linhas.join(', ')}`);
}
console.log(`\n${total} tiras em ${path.relative(process.cwd(), SAIDA)}\n`);
