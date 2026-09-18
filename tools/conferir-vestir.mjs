#!/usr/bin/env node
/**
 * Veste o heroi e desenha o resultado, quadro a quadro.
 *
 *   npm run conferir-vestir
 *
 * Saida: arte-bruta/conferencia/vestido.png
 *
 * Existe pelo mesmo motivo que a folha das armas existiu: a arma so ficou na
 * mao depois de eu RENDERIZAR e olhar. Aqui sao tres pecas, seis tiras e
 * cinquenta e um quadros — achar o capacete torto olhando o jogo, um quadro
 * por captura de tela, levaria a tarde inteira e ainda assim eu so veria a
 * pose parada.
 *
 * Le os numeros DO PlayerSprite. Se eu ajustar o tamanho la e esquecer daqui,
 * a folha passa a mentir — e uma folha de conferencia que mente e pior do que
 * nenhuma, entao a leitura EXPLODE em vez de cair num valor padrao.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const QUADRO = 128;
const PES = 119;
/** feetAnchor do ART.character: onde a linha dos pes cai dentro do desenho. */
const ANCORA_DOS_PES = 0.94;

const fonte = fs.readFileSync(path.resolve('src/player/PlayerSprite.ts'), 'utf8');
function bloco(nome) {
  const m = fonte.match(new RegExp(`${nome} = \\{([^}]*(?:\\{[^}]*\\}[^}]*)*)\\};`));
  if (!m) throw new Error(`nao achei ${nome} no PlayerSprite`);
  return m[1];
}
const num = (txt, chave) => {
  const m = txt.match(new RegExp(`${chave}:\\s*([0-9.]+)`));
  if (!m) throw new Error(`nao achei ${chave}`);
  return Number(m[1]);
};
const par = (txt, chave) => {
  const m = txt.match(new RegExp(`${chave}:\\s*\\{\\s*x:\\s*([0-9.]+),\\s*y:\\s*([0-9.]+)`));
  if (!m) throw new Error(`nao achei ${chave}`);
  return { x: Number(m[1]), y: Number(m[2]) };
};
const bTam = bloco('TAMANHO');
const bToq = bloco('TOQUE');
const TAM = {
  capacete: num(bTam, 'capacete'),
  mochila: num(bTam, 'mochila'),
  picareta: num(bTam, 'picareta'),
};
const TOQ = { capacete: par(bToq, 'capacete'), mochila: par(bToq, 'mochila') };

const anchors = fs.readFileSync(path.resolve('src/data/characterAnchors.ts'), 'utf8');
const ENCAIXES = JSON.parse(
  anchors.slice(anchors.indexOf('= {') + 2).trim().replace(/;$/, '').replace(/([a-z]+):/g, '"$1":')
);
const grips = JSON.parse(
  fs.readFileSync(path.resolve('src/data/toolGrips.ts'), 'utf8').match(/=\s*({[\s\S]*?});/)[1].replace(/([a-z_]+):/g, '"$1":')
);

/** O que vestir nesta conferencia. */
const CAPACETE = 'eq_capacete';
const MOCHILA = 'eq_mochila_carga';
const PICARETA = 'pick_old';

const ler = (p) => PNG.sync.read(fs.readFileSync(path.resolve(p)));
const pecas = {
  capacete: ler(`public/art/vestir/${CAPACETE}.png`),
  mochila: ler(`public/art/vestir/${MOCHILA}.png`),
  picareta: ler(`public/art/tools/${PICARETA}.png`),
};

const TIRAS = Object.keys(ENCAIXES);
const colunas = Math.max(...TIRAS.map((t) => ENCAIXES[t].length));
const folha = new PNG({ width: colunas * QUADRO, height: TIRAS.length * QUADRO });
for (let i = 0; i < folha.data.length; i += 4) {
  folha.data[i] = 26; folha.data[i + 1] = 30; folha.data[i + 2] = 40; folha.data[i + 3] = 255;
}

/** Cola uma imagem girada, com o ponto `toque` dela sobre (px, py). */
function colar(img, px, py, alt, toque, giro) {
  const larg = img.width * (alt / img.height);
  const cos = Math.cos(giro), sin = Math.sin(giro);
  for (let y = 0; y < Math.ceil(alt); y++) for (let x = 0; x < Math.ceil(larg); x++) {
    const sx = Math.floor((x / larg) * img.width);
    const sy = Math.floor((y / alt) * img.height);
    if (sx >= img.width || sy >= img.height) continue;
    const s = (img.width * sy + sx) * 4;
    const a = img.data[s + 3] / 255;
    if (a < 0.05) continue;
    const ox = x - larg * toque.x, oy = y - alt * toque.y;
    const dx = Math.round(px + ox * cos - oy * sin);
    const dy = Math.round(py + ox * sin + oy * cos);
    if (dx < 0 || dy < 0 || dx >= folha.width || dy >= folha.height) continue;
    const d = (folha.width * dy + dx) * 4;
    folha.data[d] = Math.round(img.data[s] * a + folha.data[d] * (1 - a));
    folha.data[d + 1] = Math.round(img.data[s + 1] * a + folha.data[d + 1] * (1 - a));
    folha.data[d + 2] = Math.round(img.data[s + 2] * a + folha.data[d + 2] * (1 - a));
  }
}

TIRAS.forEach((tira, linha) => {
  const corpo = ler(`public/art/character/${tira}.png`);
  ENCAIXES[tira].forEach((enc, col) => {
    const ox = col * QUADRO, oy = linha * QUADRO;
    const pes = oy + PES;
    const emX = (p) => ox + QUADRO / 2 + p.x * QUADRO;
    const emY = (p) => pes + p.y * QUADRO;

    // atras: mochila e ferramenta
    if (enc?.costas) colar(pecas.mochila, emX(enc.costas), emY(enc.costas), QUADRO * TAM.mochila, TOQ.mochila, 0);
    // o corpo
    for (let y = 0; y < QUADRO; y++) for (let x = 0; x < QUADRO; x++) {
      const s = (corpo.width * y + (col * QUADRO + x)) * 4;
      if (s + 3 >= corpo.data.length) continue;
      const a = corpo.data[s + 3] / 255;
      if (a < 0.02) continue;
      const d = (folha.width * (oy + y) + (ox + x)) * 4;
      folha.data[d] = Math.round(corpo.data[s] * a + folha.data[d] * (1 - a));
      folha.data[d + 1] = Math.round(corpo.data[s + 1] * a + folha.data[d + 1] * (1 - a));
      folha.data[d + 2] = Math.round(corpo.data[s + 2] * a + folha.data[d + 2] * (1 - a));
    }
    // Igual ao PlayerSprite: sempre na mao, menos escalando (as duas maos na
    // parede). No golpe segue o braco; nas outras, o angulo de carregar.
    if (enc?.punho && tira !== 'climb') {
      colar(pecas.picareta, emX(enc.punho), emY(enc.punho), QUADRO * TAM.picareta,
        grips[PICARETA] ?? { x: 0.22, y: 0.5 },
        tira === 'mine' ? (enc.punho.angulo ?? 0) : -Math.PI * 0.22);
    }
    // na frente: capacete
    if (enc?.cabeca) colar(pecas.capacete, emX(enc.cabeca), emY(enc.cabeca), QUADRO * TAM.capacete, TOQ.capacete, 0);
  });
});

const destino = path.resolve('arte-bruta/conferencia/vestido.png');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, PNG.sync.write(folha));
console.log(`  ${path.relative(process.cwd(), destino)}`);
console.log(`  capacete ${TAM.capacete} @ ${JSON.stringify(TOQ.capacete)}`);
console.log(`  mochila  ${TAM.mochila} @ ${JSON.stringify(TOQ.mochila)}`);
console.log(`  picareta ${TAM.picareta} @ cabo medido`);
