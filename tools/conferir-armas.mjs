#!/usr/bin/env node
/**
 * Folha de conferencia: TODAS as armas na mao do heroi, lado a lado.
 *
 *   npm run conferir-armas        # abre /tmp/armas-na-mao.png
 *
 * Existe por causa de uma pergunta justa: "se demorou tanto para a pistola,
 * vai demorar o mesmo para cada arma nova?".
 *
 * Nao vai, e este arquivo e a prova. A composicao usa EXATAMENTE os mesmos
 * numeros do jogo — punho do quadro, cabo medido da arma, altura e o retoque
 * de subida — entao o que aparece aqui e o que vai aparecer na tela. Arma nova
 * entra na lista, roda isto, e o erro aparece em tres segundos em vez de
 * aparecer no seu celular depois de um deploy.
 *
 * Os numeros sao lidos do proprio codigo e dos proprios dados. Se eu mudar a
 * altura da arma no PlayerSprite e esquecer daqui, a folha sai mentindo — por
 * isso ela LE, e nao repete.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const LIMIAR = 24;
const QUADRO = 128;
const AMPLIA = 3;
/** Qual quadro da tira de mira serve de palco (0 = mirando reto a frente). */
const POSE = 0;

const fonte = fs.readFileSync(path.resolve('src/player/PlayerSprite.ts'), 'utf8');
const num = (nome) => {
  const m = fonte.match(new RegExp(`${nome}\\s*=\\s*([0-9.]+)`));
  if (!m) throw new Error(`nao achei ${nome} no PlayerSprite`);
  return Number(m[1]);
};
const ARMA_ALTURA = num('ARMA_ALTURA');
const ARMA_SOBE = num('ARMA_SOBE');

/*
 * O punho vem de `characterAnchors.ts`, que e MEDIDO da arte de verdade por
 * `npm run medir-encaixes`.
 *
 * Ja morou no PlayerSprite e depois no arquivo de correcoes a mao. Saiu dos
 * dois quando o heroi passou a ser desenhado de maos e cabeca descobertas: com
 * pele para achar, a medicao acerta o punho sozinha, e numero medido acompanha
 * a arte quando ela muda. Numero a mao nao acompanha.
 *
 * Se a leitura falhar isto tem que EXPLODIR e nao cair num valor padrao: uma
 * folha de conferencia que mente e pior do que nenhuma.
 */
const gerado = fs.readFileSync(path.resolve('src/data/characterAnchors.ts'), 'utf8');
const bloco = gerado.match(/aim:\s*\[([\s\S]*?)\n  \]/);
if (!bloco) throw new Error('nao achei a tira `aim` em src/data/characterAnchors.ts');
const tabela = bloco[1];
// So o `punho` de cada quadro: o bloco tambem traz `cabeca` e `costas`, e uma
// regex de `x:`/`y:` solta misturaria os tres na mesma lista.
const punhos = [...tabela.matchAll(/punho:\s*\{\s*x:\s*(-?[0-9.]+),\s*y:\s*(-?[0-9.]+)/g)].map((m) => ({
  x: Number(m[1]),
  y: Number(m[2]),
}));
const punho = punhos[POSE];

const grips = JSON.parse(
  fs.readFileSync(path.resolve('src/data/weaponGrips.ts'), 'utf8').match(/=\s*({[\s\S]*?});/)[1]
);
const ARMAS = Object.keys(grips);

const heroi = PNG.sync.read(fs.readFileSync(path.resolve('public/art/character/aim.png')));
/** A linha dos pes na tira, medida e nao suposta. */
let PES = 0;
for (let y = 0; y < QUADRO; y++) {
  for (let x = 0; x < QUADRO; x++) {
    if (heroi.data[(y * heroi.width + x) * 4 + 3] >= LIMIAR) PES = Math.max(PES, y);
  }
}

const out = new PNG({ width: QUADRO * AMPLIA * ARMAS.length, height: QUADRO * AMPLIA });
for (let i = 0; i < out.data.length; i += 4) {
  out.data[i] = 38;
  out.data[i + 1] = 42;
  out.data[i + 2] = 50;
  out.data[i + 3] = 255;
}

const por = (img, sx, sy, dx, dy, off) => {
  const i = (sy * img.width + sx) * 4;
  if (img.data[i + 3] < LIMIAR) return;
  for (let a = 0; a < AMPLIA; a++) {
    for (let b = 0; b < AMPLIA; b++) {
      const X = off + dx * AMPLIA + b;
      const Y = dy * AMPLIA + a;
      if (X < off || Y < 0 || X >= off + QUADRO * AMPLIA || Y >= out.height) continue;
      const o = (Y * out.width + X) * 4;
      out.data[o] = img.data[i];
      out.data[o + 1] = img.data[i + 1];
      out.data[o + 2] = img.data[i + 2];
    }
  }
};

ARMAS.forEach((nome, n) => {
  const arquivo = path.resolve('public/art/weapons', `${nome}.png`);
  if (!fs.existsSync(arquivo)) return;
  const arma = PNG.sync.read(fs.readFileSync(arquivo));
  const cabo = grips[nome];
  const off = n * QUADRO * AMPLIA;

  const alt = QUADRO * ARMA_ALTURA;
  const esc = alt / arma.height;
  const larg = arma.width * esc;
  const px = QUADRO / 2 + punho.x * QUADRO;
  const py = PES + (punho.y - ARMA_SOBE) * QUADRO;

  // A arma primeiro: no jogo ela vai POR TRAS do corpo, e e o punho fechado
  // que cobre o cabo. Aqui a ordem e a mesma, senao a folha mentiria.
  for (let y = 0; y < arma.height; y++) {
    for (let x = 0; x < arma.width; x++) {
      por(arma, x, y, Math.round(px - larg * cabo.x + x * esc), Math.round(py - alt * cabo.y + y * esc), off);
    }
  }
  for (let y = 0; y < QUADRO; y++) {
    for (let x = 0; x < QUADRO; x++) por(heroi, POSE * QUADRO + x, y, x, y, off);
  }
  console.log(`  ${nome}  ${arma.width}x${arma.height}  cabo ${JSON.stringify(cabo)}`);
});

const saida = '/tmp/armas-na-mao.png';
fs.writeFileSync(saida, PNG.sync.write(out));
console.log(`\n  ${saida}  (altura ${ARMA_ALTURA}, sobe ${ARMA_SOBE}, pes em y=${PES})`);
