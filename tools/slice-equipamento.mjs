#!/usr/bin/env node
/**
 * Fatia as pecas que se PRENDEM no heroi.
 *
 *   npm run slice-equipamento
 *
 * Entrada:  arte-bruta/heroi/folha-base.png  (secoes 7, 8, 9 da folha)
 * Saida:    public/art/vestir/*.png          capacetes e mochilas COMO SE VESTEM
 *           public/art/tools/*.png           picaretas
 *           src/data/toolGrips.ts            onde a mao fecha em cada picareta
 *           arte-bruta/conferencia/equipamento.png
 *
 * Estas sao as pecas que o heroi nao usa mais desenhadas no corpo. O jogo ja
 * tinha quatro slots de equipamento comprados e vestidos que nao apareciam em
 * lugar nenhum; agora ha o que mostrar neles.
 *
 * AS COORDENADAS SAO DESTA FOLHA, e isso e proposital.
 *
 * Elas foram achadas varrendo o arquivo, nao chutadas — mas valem so para ele.
 * Arte bruta nova quase sempre chega num arranjo novo, e fingir que este
 * cortador e generico so faria ele falhar em silencio na proxima folha. Se as
 * secoes mudarem de lugar, a varredura tem que ser refeita.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const FOLHA = path.resolve('arte-bruta/heroi/folha-base.png');
const OPACO = 40;

/**
 * Onde cada peca esta na folha, e como ela se chama no jogo.
 *
 * Os nomes dos capacetes e das mochilas batem com os ids que ja existem em
 * src/data/equipment.ts — o slot ja estava la, faltava a figura.
 */
const SECOES = [
  {
    /*
     * VAI EM `vestir/`, e NAO em `equip/`.
     *
     * `art/equip/<id>.png` ja existe e ja tem dono: e o ICONE da peca na tela
     * de Equipamento (ver TechScreen). Sao duas figuras diferentes da mesma
     * coisa — o icone e de tres quartos, olhando para quem ve, porque ele
     * mora numa lista; o de vestir e de perfil, porque ele vai grudar num
     * corpo de perfil.
     *
     * Eu escrevi por cima dos icones na primeira versao deste cortador e o
     * capacete e a lanterna sumiram da lista sem que nada quebrasse.
     */
    saida: 'public/art/vestir', altura: 64, tipo: 'peca',
    pecas: [
      { id: 'eq_lanterna', y: [740, 864], x: [9, 133] },
      { id: 'eq_capacete', y: [740, 864], x: [150, 279] },
      { id: 'eq_visor', y: [740, 864], x: [301, 430] },
      { id: 'mochila_couro', y: [728, 894], x: [449, 560] },
      { id: 'mochila_lona', y: [728, 894], x: [577, 713] },
      { id: 'mochila_aco', y: [728, 894], x: [737, 868] },
    ],
  },
  {
    saida: 'public/art/tools', altura: 32, tipo: 'picareta',
    pecas: [
      { id: 'pick_old', y: [728, 838], x: [899, 1001] },
      { id: 'pick_reinforced', y: [728, 838], x: [1006, 1103] },
      { id: 'pick_copper', y: [728, 838], x: [1108, 1209] },
      { id: 'pick_gold', y: [728, 838], x: [1213, 1309] },
      { id: 'pick_crystal', y: [728, 838], x: [1313, 1410] },
      { id: 'pick_ruby', y: [728, 838], x: [1414, 1510] },
    ],
  },
];

const png = PNG.sync.read(fs.readFileSync(FOLHA));
const alfa = (x, y) => (x < 0 || y < 0 || x >= png.width || y >= png.height ? 0 : png.data[(png.width * y + x) * 4 + 3]);
const opaco = (x, y) => alfa(x, y) > OPACO;

function caixa(x0, x1, y0, y1) {
  let a = 1e9, b = -1, t = 1e9, u = -1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!opaco(x, y)) continue;
    if (x < a) a = x; if (x > b) b = x;
    if (y < t) t = y; if (y > u) u = y;
  }
  return b < 0 ? null : { x0: a, x1: b, y0: t, y1: u };
}

/**
 * Onde a mao fecha numa PICARETA.
 *
 * Nao da para reusar a medida das armas. Ela procura o que pendura ABAIXO da
 * linha do cano, que numa pistola e a coronha; uma picareta e uma haste reta e
 * nao pendura nada, entao aquela busca nao acha nada e cai no valor padrao.
 *
 * Aqui o ponto e outro e mais simples: a mao fecha SOBRE a haste. A linha da
 * haste e a fileira com mais pixels — e a barra atravessando a imagem inteira
 * — e o punho fica a pouco mais de um quinto do comprimento, contado da ponta
 * do cabo, que e onde se segura para ter alavanca sem perder controle.
 */
function caboDaPicareta(cx) {
  let linha = cx.y0, maior = -1;
  for (let y = cx.y0; y <= cx.y1; y++) {
    let n = 0;
    for (let x = cx.x0; x <= cx.x1; x++) if (opaco(x, y)) n++;
    if (n > maior) { maior = n; linha = y; }
  }
  const alt = cx.y1 - cx.y0 + 1;
  return { x: 0.22, y: +(((linha - cx.y0) / alt)).toFixed(3) };
}

/** Recorta e reescala para a altura pedida, com media de area. */
function recortar(cx, alturaAlvo) {
  const k = alturaAlvo / (cx.y1 - cx.y0 + 1);
  const larg = Math.max(1, Math.round((cx.x1 - cx.x0 + 1) * k));
  const out = new PNG({ width: larg, height: alturaAlvo });
  out.data.fill(0);
  const passo = 1 / k;
  for (let y = 0; y < alturaAlvo; y++) for (let x = 0; x < larg; x++) {
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    const sx0 = cx.x0 + x * passo, sy0 = cx.y0 + y * passo;
    for (let sy = Math.floor(sy0); sy < Math.max(Math.ceil(sy0 + passo), Math.floor(sy0) + 1); sy++) {
      for (let sx = Math.floor(sx0); sx < Math.max(Math.ceil(sx0 + passo), Math.floor(sx0) + 1); sx++) {
        if (sx > cx.x1 || sy > cx.y1) continue;
        const i = (png.width * sy + sx) * 4;
        const pa = png.data[i + 3] / 255;
        r += png.data[i] * pa; g += png.data[i + 1] * pa; b += png.data[i + 2] * pa;
        a += png.data[i + 3]; n++;
      }
    }
    if (!n || a === 0) continue;
    const peso = a / 255;
    const d = (larg * y + x) * 4;
    out.data[d] = Math.round(r / peso);
    out.data[d + 1] = Math.round(g / peso);
    out.data[d + 2] = Math.round(b / peso);
    out.data[d + 3] = Math.round(a / n);
  }
  return out;
}

const cabos = {};
const feitas = [];
for (const sec of SECOES) {
  fs.mkdirSync(path.resolve(sec.saida), { recursive: true });
  for (const p of sec.pecas) {
    const cx = caixa(p.x[0], p.x[1], p.y[0], p.y[1]);
    if (!cx) { console.warn(`  (nada em ${p.id}, pulando)`); continue; }
    if (sec.tipo === 'picareta') cabos[p.id] = caboDaPicareta(cx);
    const img = recortar(cx, sec.altura);
    const destino = path.resolve(sec.saida, `${p.id}.png`);
    fs.writeFileSync(destino, PNG.sync.write(img));
    feitas.push({ id: p.id, img, arq: path.relative(process.cwd(), destino) });
    console.log(`  ${p.id.padEnd(16)} ${String(img.width).padStart(3)}x${img.height}  -> ${path.relative(process.cwd(), destino)}`);
  }
}

fs.writeFileSync(
  path.resolve('src/data/toolGrips.ts'),
  `/**
 * Onde a MAO fecha em cada picareta, em fracao do sprite.
 *
 * GERADO por tools/slice-equipamento.mjs — nao editar a mao.
 *
 * Mesmo papel que \`weaponGrips.ts\` faz para as armas: e o ponto que cai em
 * cima do punho do heroi, e em torno do qual a ferramenta gira no golpe. A
 * medida e diferente da das armas porque a forma e diferente — a arma pendura
 * a coronha abaixo do cano, a picareta e uma haste reta e a mao fecha SOBRE
 * ela, a pouco mais de um quinto do comprimento.
 */

export const TOOL_GRIPS: Record<string, { x: number; y: number }> = ${JSON.stringify(cabos, null, 2).replace(/"([a-z_]+)":/g, '$1:')};
`,
  'utf8'
);
console.log(`\n  src/data/toolGrips.ts escrito com ${Object.keys(cabos).length} medidas.`);

// Folha de conferencia: tudo o que saiu, ampliado, com o cabo marcado.
{
  const K = 3, GAP = 10, ALT = 72;
  const larg = feitas.reduce((a, f) => a + f.img.width * K + GAP, GAP);
  const conf = new PNG({ width: larg, height: ALT * K });
  for (let i = 0; i < conf.data.length; i += 4) {
    conf.data[i] = 26; conf.data[i + 1] = 30; conf.data[i + 2] = 40; conf.data[i + 3] = 255;
  }
  let X = GAP;
  for (const f of feitas) {
    const topo = Math.round((ALT * K - f.img.height * K) / 2);
    for (let y = 0; y < f.img.height; y++) for (let x = 0; x < f.img.width; x++) {
      const s = (f.img.width * y + x) * 4;
      const a = f.img.data[s + 3] / 255;
      if (a < 0.02) continue;
      for (let ky = 0; ky < K; ky++) for (let kx = 0; kx < K; kx++) {
        const d = (conf.width * (topo + y * K + ky) + (X + x * K + kx)) * 4;
        conf.data[d] = Math.round(f.img.data[s] * a + conf.data[d] * (1 - a));
        conf.data[d + 1] = Math.round(f.img.data[s + 1] * a + conf.data[d + 1] * (1 - a));
        conf.data[d + 2] = Math.round(f.img.data[s + 2] * a + conf.data[d + 2] * (1 - a));
      }
    }
    const cabo = cabos[f.id];
    if (cabo) {
      const px = X + Math.round(f.img.width * cabo.x * K);
      const py = topo + Math.round(f.img.height * cabo.y * K);
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        if (dx * dx + dy * dy > 16) continue;
        const d = (conf.width * (py + dy) + (px + dx)) * 4;
        if (d < 0 || d >= conf.data.length) continue;
        conf.data[d] = 255; conf.data[d + 1] = 90; conf.data[d + 2] = 120;
      }
    }
    X += f.img.width * K + GAP;
  }
  const destino = path.resolve('arte-bruta/conferencia/equipamento.png');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, PNG.sync.write(conf));
  console.log(`  conferencia  ${path.relative(process.cwd(), destino)}  (rosa = onde a mao fecha)`);
}
