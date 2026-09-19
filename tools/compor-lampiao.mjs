#!/usr/bin/env node
/**
 * Compoe a textura do bloco `lamp` a partir de arte que o projeto JA tem.
 *
 *   npm run lampiao
 *
 * Entrada: public/art/props/lamp.png        (o lampiao alto da entrada da mina)
 *          public/art/blocks/ruin_brick_0.png (a pedra de parede)
 * Saida:   public/art/blocks/lamp_0.png
 *
 * POR QUE COMPOR EM VEZ DE PEDIR.
 *
 * O bloco `lamp` nunca teve textura. Blockia usa ele a cada cinco colunas no
 * teto, a cada sete nos terracos e a cada seis no piso — sao dezenas — e sem
 * arte o renderizador cai na cor chapada da ficha, `#ffdc83`. O resultado e um
 * quadrado amarelo berrante espalhado pela cidade mais bonita do jogo. Da para
 * ver em qualquer print.
 *
 * Pedir uma imagem nova custa uma geracao e uma ida e volta. A cabeca do
 * lampiao que ja existe em `props/lamp.png` e do mesmo jogo, da mesma paleta e
 * do mesmo desenhista — recortar ela e assentar na pedra resolve hoje. Se um
 * dia vier uma textura desenhada de proposito, ela sobrescreve este arquivo e
 * nada mais precisa mudar.
 *
 * O RECORTE E MEDIDO, nao chutado: a cabeca do lampiao e a faixa mais larga e
 * mais clara da tira (pico de brilho 120 contra 60 do poste). O programa acha
 * essa faixa sozinho, entao trocar a arte do prop nao quebra o corte.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const PROP = path.resolve('public/art/props/lamp.png');
const PEDRA = path.resolve('public/art/blocks/ruin_brick_0.png');
const SAIDA = path.resolve('public/art/blocks/lamp_0.png');

for (const p of [PROP, PEDRA]) {
  if (!fs.existsSync(p)) {
    console.log(`  falta ${path.relative(process.cwd(), p)}`);
    process.exit(1);
  }
}

const prop = PNG.sync.read(fs.readFileSync(PROP));
const pedra = PNG.sync.read(fs.readFileSync(PEDRA));

/** Para cada linha: quantos pixels visiveis e qual o brilho medio deles. */
function perfil(png) {
  const linhas = [];
  for (let y = 0; y < png.height; y++) {
    let larg = 0;
    let soma = 0;
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      if (png.data[i + 3] <= 30) continue;
      larg++;
      soma += (png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3;
    }
    linhas.push({ larg, brilho: larg ? soma / larg : 0 });
  }
  return linhas;
}

/*
 * A cabeca e a janela de 80 linhas com a melhor nota de "largo E claro".
 *
 * So brilho acharia a chama do pe do poste; so largura acharia a base. O
 * produto dos dois acha o corpo do lampiao, que e a unica parte larga E acesa.
 */
const linhas = perfil(prop);
const JANELA = 80;
let melhor = 0;
let melhorNota = -1;
for (let y = 0; y + JANELA <= prop.height; y++) {
  let nota = 0;
  for (let k = 0; k < JANELA; k++) nota += linhas[y + k].larg * linhas[y + k].brilho;
  if (nota > melhorNota) {
    melhorNota = nota;
    melhor = y;
  }
}

// Caixa apertada em X dentro dessa faixa: o poste e fino, a cabeca e larga.
let minX = prop.width;
let maxX = -1;
for (let y = melhor; y < melhor + JANELA; y++) {
  for (let x = 0; x < prop.width; x++) {
    if (prop.data[(y * prop.width + x) * 4 + 3] <= 30) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
}
const recorte = { x: minX, y: melhor, w: maxX - minX + 1, h: JANELA };
console.log(`cabeca do lampiao: x ${recorte.x}-${maxX}, y ${recorte.y}-${melhor + JANELA - 1}`);

const LADO = pedra.width;
const out = new PNG({ width: LADO, height: LADO });
// A pedra vai inteira embaixo: o bloco continua sendo parede.
pedra.data.copy(out.data);

/*
 * O lampiao ocupa 72% do bloco e fica um pouco acima do centro.
 *
 * Centrado exato ele parece um adesivo; um pouco acima ele parece PENDURADO,
 * que e como lampiao fica numa parede. Sao seis pixels e mudam a leitura.
 */
const alvoH = Math.round(LADO * 0.72);
const escala = alvoH / recorte.h;
const alvoW = Math.round(recorte.w * escala);
const offX = Math.round((LADO - alvoW) / 2);
const offY = Math.round((LADO - alvoH) / 2) - 6;

for (let y = 0; y < alvoH; y++) {
  for (let x = 0; x < alvoW; x++) {
    const sx = recorte.x + Math.min(recorte.w - 1, Math.floor(x / escala));
    const sy = recorte.y + Math.min(recorte.h - 1, Math.floor(y / escala));
    const si = (sy * prop.width + sx) * 4;
    const a = prop.data[si + 3] / 255;
    if (a <= 0.1) continue;
    const dx = offX + x;
    const dy = offY + y;
    if (dx < 0 || dy < 0 || dx >= LADO || dy >= LADO) continue;
    const di = (dy * LADO + dx) * 4;
    // Mistura sobre a pedra: a borda do lampiao encosta na parede em vez de
    // recortar um buraco nela.
    for (let c = 0; c < 3; c++) {
      out.data[di + c] = Math.round(prop.data[si + c] * a + out.data[di + c] * (1 - a));
    }
    out.data[di + 3] = 255;
  }
}

/*
 * O halo: a luz do lampiao lambendo a pedra em volta.
 *
 * Sem ele a cabeca fica colada num fundo cinza e nao parece acesa. E um
 * gradiente radial quente somado por cima — some com a distancia, entao a
 * quina do tile continua igual a da pedra ao lado e a emenda nao aparece.
 */
const cx = offX + alvoW / 2;
const cy = offY + alvoH / 2;
const raio = LADO * 0.62;
for (let y = 0; y < LADO; y++) {
  for (let x = 0; x < LADO; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d > raio) continue;
    const t = (1 - d / raio) ** 2 * 0.42;
    const i = (y * LADO + x) * 4;
    out.data[i] = Math.min(255, Math.round(out.data[i] + 255 * t));
    out.data[i + 1] = Math.min(255, Math.round(out.data[i + 1] + 196 * t));
    out.data[i + 2] = Math.min(255, Math.round(out.data[i + 2] + 110 * t));
  }
}

fs.writeFileSync(SAIDA, PNG.sync.write(out));
console.log(`escrito ${path.relative(process.cwd(), SAIDA)}  ${LADO}x${LADO}`);
