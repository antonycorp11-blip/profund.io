#!/usr/bin/env node
/**
 * Recorta as folhas de Blockia.
 *
 *   npm run slice-blockia
 *
 * Entrada:  arte-bruta/blockia/{porta,vida,agua,elevador}.png  (folhas em grade)
 *           arte-bruta/blockia/fundo.png                       (imagem inteira)
 * Saida:    public/art/blockia/*.png  e  public/art/bg/blockia.png
 *
 * MEDE A CELULA ANTES DE CORTAR, e nao confia na grade que eu pedi.
 *
 * Esta licao ja custou uma geracao inteira neste projeto: a folha das ruinas
 * veio 2x2 de 512 mais uma tira lateral, quando eu tinha pedido 3x2 de 256. O
 * desenho estava certo; o corte e que era outro. Reclamar e pedir de novo custa
 * horas; medir onde a folha realmente se divide custa este arquivo.
 *
 * Por isso aqui a grade e so o ponto de partida. Dentro de cada celula o corte
 * final e a CAIXA APERTADA do que tem pixel — o que quer que o desenhista tenha
 * posto ali, centrado ou nao, do tamanho que for. Se uma celula sair vazia, ela
 * e anunciada em vez de virar um PNG transparente que ninguem percebe.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const BRUTA = path.resolve('arte-bruta/blockia');
const SAIDA = path.resolve('public/art/blockia');
const SAIDA_BG = path.resolve('public/art/bg');

/**
 * Quanto a arte e reduzida.
 *
 * O jogo desenha com tile de 32 px e guarda arte em 4x (ver ASSETS.md): a
 * textura de bloco vive em 128. As folhas vem com celula de ~313 px, entao
 * cada peca cabe em pouco mais de 2 tiles de largura no jogo. Reduzir para 4x
 * do tamanho final mantem a nitidez na tela retina sem carregar 300 px de
 * imagem para desenhar 70.
 */
const ALVO_TILE_PX = 128;

/** As folhas e como cada uma se divide, com o nome de cada peca na ordem. */
const FOLHAS = [
  {
    arq: 'porta.png',
    cols: 2,
    linhas: 2,
    // Largura em TILES de jogo que cada peca deve ocupar. A altura sai da
    // proporcao medida — forcar as duas deforma o desenho.
    nomes: [
      { id: 'porta_fechada', tiles: 7 },
      { id: 'porta_aberta', tiles: 7 },
      { id: 'arco', tiles: 7 },
      { id: 'guincho_porta', tiles: 6 },
    ],
  },
  {
    arq: 'vida.png',
    cols: 4,
    linhas: 4,
    nomes: [
      { id: 'banco', tiles: 2.2 },
      { id: 'mesa', tiles: 2.4 },
      { id: 'engradados', tiles: 2.6 },
      { id: 'varal', tiles: 2.6 },
      { id: 'caixa_ferramenta', tiles: 2.2 },
      { id: 'balde', tiles: 2.2 },
      { id: 'sacos', tiles: 2.4 },
      { id: 'cestos', tiles: 2.4 },
      { id: 'poste_lanterna', tiles: 2.2 },
      { id: 'barris', tiles: 2.4 },
      { id: 'vasos', tiles: 2.0 },
      { id: 'bica', tiles: 2.4 },
      { id: 'prateleira', tiles: 2.4 },
      { id: 'panelas', tiles: 2.4 },
      { id: 'escrivaninha', tiles: 2.4 },
      { id: 'cama', tiles: 2.6 },
    ],
  },
  {
    arq: 'agua.png',
    cols: 4,
    linhas: 4,
    nomes: [
      { id: 'cisterna', tiles: 2.6 },
      { id: 'barril_agua', tiles: 2.0 },
      { id: 'fonte', tiles: 2.4 },
      { id: 'calha', tiles: 2.6 },
      { id: 'queda', tiles: 2.6 },
      { id: 'bomba', tiles: 1.8 },
      { id: 'valvula', tiles: 2.0 },
      { id: 'cano', tiles: 1.6 },
      { id: 'canteiro_folha', tiles: 2.4 },
      { id: 'canteiro_erva', tiles: 2.4 },
      { id: 'canteiro_raiz', tiles: 2.4 },
      { id: 'leira', tiles: 2.6 },
      { id: 'ervas_penduradas', tiles: 2.4 },
      { id: 'registro', tiles: 2.2 },
      { id: 'tanque', tiles: 2.4 },
      { id: 'reservatorio', tiles: 2.6 },
    ],
  },
  {
    /*
     * A ferraria do Silas. Quatro postos de trabalho, nao quatro enfeites: a
     * forja acesa, a bigorna, a bancada de ferramenta e a fornalha com fole e
     * tina de tempera. O `nivel` de cada um fica no renderizador; aqui so se
     * corta.
     */
    arq: 'forja.png',
    cols: 2,
    linhas: 2,
    nomes: [
      { id: 'forja_fogo', tiles: 5 },
      { id: 'forja_bigorna', tiles: 5 },
      { id: 'forja_bancada', tiles: 5 },
      { id: 'forja_fornalha', tiles: 5 },
    ],
  },
  {
    /* O Mercado da Ponte, da Nina: quatro barracas com mercadoria diferente. */
    arq: 'mercado.png',
    cols: 2,
    linhas: 2,
    nomes: [
      { id: 'barraca_horta', tiles: 6 },
      { id: 'barraca_ferragem', tiles: 6 },
      { id: 'barraca_padaria', tiles: 6 },
      { id: 'barraca_tecidos', tiles: 6 },
    ],
  },
  {
    arq: 'elevador.png',
    cols: 2,
    linhas: 2,
    nomes: [
      { id: 'cabine', tiles: 4 },
      { id: 'sarilho', tiles: 4 },
      { id: 'porta_poco', tiles: 4 },
      { id: 'contrapeso', tiles: 4 },
    ],
  },
];

function lerPNG(arq) {
  const p = path.join(BRUTA, arq);
  if (!fs.existsSync(p)) return null;
  return PNG.sync.read(fs.readFileSync(p));
}

/** Caixa apertada do que tem pixel visivel dentro do retangulo dado. */
function caixaApertada(png, x0, y0, w, h) {
  let minX = x0 + w;
  let minY = y0 + h;
  let maxX = x0 - 1;
  let maxY = y0 - 1;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const a = png.data[(y * png.width + x) * 4 + 3];
      // 24 e nao 0: as folhas vem com halo de compressao em volta da peca, e
      // um unico pixel de alpha 3 esticaria a caixa por dez tiles de nada.
      if (a < 24) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Reduz por MEDIA DE AREA, e nao por amostra do pixel do meio.
 *
 * Reduzir 300 para 90 pegando um pixel a cada tres joga fora dois tercos da
 * informacao e transforma contorno fino em pontilhado. A media guarda o
 * contorno e e o que faz a peca continuar legivel a 70 px de altura.
 */
function reduzir(png, box, larguraFinal) {
  const escala = box.w / larguraFinal;
  const alturaFinal = Math.max(1, Math.round(box.h / escala));
  const out = new PNG({ width: larguraFinal, height: alturaFinal });
  for (let y = 0; y < alturaFinal; y++) {
    for (let x = 0; x < larguraFinal; x++) {
      const sx0 = box.x + Math.floor(x * escala);
      const sy0 = box.y + Math.floor(y * escala);
      const sx1 = Math.min(box.x + box.w, box.x + Math.ceil((x + 1) * escala));
      const sy1 = Math.min(box.y + box.h, box.y + Math.ceil((y + 1) * escala));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * png.width + sx) * 4;
          const al = png.data[i + 3] / 255;
          // Media PONDERADA pelo alpha: sem isso a borda puxa a cor do vazio
          // (preto) e a peca ganha contorno sujo ao encolher.
          r += png.data[i] * al;
          g += png.data[i + 1] * al;
          b += png.data[i + 2] * al;
          a += png.data[i + 3];
          n++;
        }
      }
      if (n === 0) continue;
      const somaAlpha = a / 255;
      const o = (y * larguraFinal + x) * 4;
      out.data[o] = somaAlpha > 0 ? Math.round(r / somaAlpha) : 0;
      out.data[o + 1] = somaAlpha > 0 ? Math.round(g / somaAlpha) : 0;
      out.data[o + 2] = somaAlpha > 0 ? Math.round(b / somaAlpha) : 0;
      out.data[o + 3] = Math.round(a / n);
    }
  }
  return out;
}

fs.mkdirSync(SAIDA, { recursive: true });
fs.mkdirSync(SAIDA_BG, { recursive: true });

const mapa = {};
let vazias = 0;

for (const folha of FOLHAS) {
  const png = lerPNG(folha.arq);
  if (!png) {
    console.log(`  falta arte-bruta/blockia/${folha.arq}`);
    continue;
  }
  const cw = Math.floor(png.width / folha.cols);
  const ch = Math.floor(png.height / folha.linhas);
  console.log(`\n${folha.arq}  ${png.width}x${png.height}  celula ${cw}x${ch}`);
  folha.nomes.forEach((peca, i) => {
    const cx = (i % folha.cols) * cw;
    const cy = Math.floor(i / folha.cols) * ch;
    const box = caixaApertada(png, cx, cy, cw, ch);
    if (!box) {
      vazias++;
      console.log(`    ${peca.id.padEnd(18)} CELULA VAZIA (${cx},${cy})`);
      return;
    }
    const largura = Math.round(peca.tiles * ALVO_TILE_PX / 4);
    const out = reduzir(png, box, largura);
    fs.writeFileSync(path.join(SAIDA, `${peca.id}.png`), PNG.sync.write(out));
    // Em TILES: e o que o renderizador precisa para nao deformar nada.
    const alturaTiles = +(peca.tiles * (box.h / box.w)).toFixed(2);
    mapa[peca.id] = { w: peca.tiles, h: alturaTiles };
    console.log(
      `    ${peca.id.padEnd(18)} bruto ${String(box.w).padStart(4)}x${String(box.h).padStart(4)}` +
        ` -> ${out.width}x${out.height}px  =  ${peca.tiles} x ${alturaTiles} tiles`
    );
  });
}

// O fundo vai inteiro: e parallax, nao peca.
const fundo = lerPNG('fundo.png');
if (fundo) {
  const box = { x: 0, y: 0, w: fundo.width, h: fundo.height };
  const out = reduzir(fundo, box, 1024);
  fs.writeFileSync(path.join(SAIDA_BG, 'blockia.png'), PNG.sync.write(out));
  console.log(`\nfundo.png  ${fundo.width}x${fundo.height} -> ${out.width}x${out.height}px`);
}

fs.writeFileSync(path.join(SAIDA, 'mapa.json'), JSON.stringify(mapa, null, 2) + '\n');
console.log(`\n${Object.keys(mapa).length} pecas cortadas${vazias ? `, ${vazias} celula(s) vazia(s)` : ''}.`);
console.log(`medidas em public/art/blockia/mapa.json`);
