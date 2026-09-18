#!/usr/bin/env node
/**
 * Monta as seis tiras do heroi NU a partir da arte bruta.
 *
 *   npm run slice-heroi
 *
 * Entrada:  arte-bruta/heroi/*.png     (o que a IA entregou, cada um num formato)
 * Saida:    public/art/character/*.png (128 px por quadro, pes na linha 119)
 *           arte-bruta/conferencia/heroi.png  (as seis tiras lado a lado)
 *
 * POR QUE ESTE CORTADOR E DIFERENTE DOS OUTROS.
 *
 * A arte nao chegou em seis arquivos limpos. Chegou em quatro, cada um num
 * tamanho e num arranjo diferente, porque gerar seis tiras longas e coerentes
 * era justamente o que a IA nao conseguia fazer. Pedir pouco de cada vez
 * funcionou — e o preco e que a montagem sobrou para ca.
 *
 * O que ele resolve:
 *
 *   1. ACHA os quadros sozinho, por vale na coluna. Nada de grade fixa: os
 *      quadros vem com espacamento irregular e as vezes encostados.
 *   2. NORMALIZA a escala. Cada fonte desenhou o heroi num tamanho — 146 px na
 *      folha, 688 nas poses de mira. Sem normalizar, ele mudaria de tamanho ao
 *      trocar de animacao.
 *   3. ALINHA pelos PES. Todas as tiras do jogo tem o pe na linha 119; e o
 *      referencial de que os encaixes dependem (ver tools/medir-encaixes.mjs).
 *   4. REDUZ com media de area. De 688 px para 90 e uma reducao de 7,6x —
 *      vizinho mais proximo jogaria fora nove de cada dez pixels e o desenho
 *      sairia serrilhado.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const QUADRO = 128;
const LINHA_DOS_PES = 119;
/**
 * Altura do heroi EM PE dentro do quadro.
 *
 * 90 e a altura que as tiras antigas ja usavam, e mante-la faz a arte nova
 * entrar sem mexer em `stripDrawHeight`, em `feetAnchor` nem na camera.
 */
const ALTURA_EM_PE = 90;
const OPACO = 40;

const bruta = (f) => path.resolve('arte-bruta/heroi', f);

/**
 * De onde sai cada tira.
 *
 * `banda` e `faixa` recortam a regiao da folha; fora delas o arquivo inteiro
 * vale. `referencia` diz qual quadro esta DE PE — e dele que sai a escala da
 * fonte, porque so um corpo em pe mede o corpo. Usar o quadro que calha de ser
 * o mais alto faria o heroi encolher na animacao em que ele levanta o braco.
 */
const FONTES = {
  idle:  { arq: 'folha-base.png', banda: [59, 206],  faixa: [20, 697],   referencia: 0 },
  walk:  { arq: 'folha-base.png', banda: [59, 206],  faixa: [724, 1517], referencia: 0 },
  jump:  { arq: 'folha-base.png', banda: [273, 435], faixa: [11, 499],   referencia: null, escalaDe: 'idle' },
  mine:  { arq: 'folha-base.png', banda: [273, 435], faixa: [511, 1521], referencia: null, escalaDe: 'idle' },
  /*
   * A ESCALADA NAO TEM QUADRO EM PE.
   *
   * Em todos os seis ele esta encolhido com os joelhos para cima e os bracos
   * acima da cabeca, entao a altura da silhueta nao mede o corpo — mede a
   * pose. A escala vem das poses de mira, que sao o mesmo desenho da mesma
   * leva, e o resultado se confere na folha do fim.
   */
  climb: { arq: 'escalada.png', referencia: null, escalaDe: 'aim' },
};

/**
 * A tira de MIRA e montada, e nao recortada.
 *
 * Ela e a unica em que o indice do quadro tem significado: o jogo pede o
 * quadro 0 para o tiro reto, o 2 para cima, o 4 para baixo, 6-7 para o recuo e
 * 8-9 para andar atirando (ver PlayerSprite.stripFrame). A IA entregou as sete
 * poses distintas em dois arquivos; aqui elas entram na ordem que o jogo espera.
 *
 * Os pares repetem a mesma pose de proposito, menos no recuo e no andar: nas
 * tres direcoes o jogo so le o primeiro do par, entao um segundo desenho ali
 * seria trabalho que ninguem ve.
 */
const MIRA = [
  ['mira-direcoes.png', 0], ['mira-direcoes.png', 0],            // 0-1 reto
  ['mira-direcoes.png', 1], ['mira-direcoes.png', 1],            // 2-3 cima
  ['mira-direcoes.png', 2], ['mira-direcoes.png', 2],            // 4-5 baixo
  ['mira-recuo-e-andando.png', 0], ['mira-recuo-e-andando.png', 1], // 6-7 recuo
  ['mira-recuo-e-andando.png', 2], ['mira-recuo-e-andando.png', 3], // 8-9 andando
];
/** O quadro DE PE de cada arquivo de mira, para tirar a escala. */
const REFERENCIA_DA_MIRA = { 'mira-direcoes.png': 0, 'mira-recuo-e-andando.png': 1 };

const cache = new Map();
function ler(arq) {
  if (!cache.has(arq)) cache.set(arq, PNG.sync.read(fs.readFileSync(bruta(arq))));
  return cache.get(arq);
}

function alfa(png, x, y) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return 0;
  return png.data[(png.width * y + x) * 4 + 3];
}

/**
 * Acha os quadros de uma regiao pelos VALES de coluna vazia.
 *
 * Quadros encostados viram um bloco so, entao um bloco largo demais em relacao
 * aos vizinhos e partido no ponto de menor conteudo. Foi o que aconteceu na
 * folha base: dois quadros de caminhada sairam grudados num blob de 169 px.
 */
function acharQuadros(png, banda, faixa) {
  const [y0, y1] = banda ?? [0, png.height - 1];
  const [xi, xf] = faixa ?? [0, png.width - 1];
  const col = [];
  for (let x = 0; x < png.width; x++) {
    let n = 0;
    for (let y = y0; y <= y1; y++) if (alfa(png, x, y) > OPACO) n++;
    col.push(n);
  }
  const brutos = [];
  let ini = -1;
  for (let x = xi; x <= xf; x++) {
    if (col[x] > 1) { if (ini < 0) ini = x; }
    else { if (ini >= 0 && x - ini > 14) brutos.push([ini, x - 1]); ini = -1; }
  }
  if (ini >= 0) brutos.push([ini, xf]);

  const larguras = brutos.map(([a, b]) => b - a + 1).sort((a, b) => a - b);
  const tipica = larguras[Math.floor(larguras.length / 2)] || 1;
  const saida = [];
  for (const [a, b] of brutos) {
    const w = b - a + 1;
    const partes = Math.round(w / tipica);
    if (partes < 2) { saida.push([a, b]); continue; }
    const cortes = [a - 1];
    for (let k = 1; k < partes; k++) {
      const alvo = a + Math.round((w * k) / partes);
      let melhor = alvo, menor = Infinity;
      const margem = Math.round(tipica * 0.3);
      for (let x = alvo - margem; x <= alvo + margem; x++) {
        if (x <= a || x >= b) continue;
        if (col[x] < menor) { menor = col[x]; melhor = x; }
      }
      cortes.push(melhor);
    }
    cortes.push(b);
    for (let k = 0; k < cortes.length - 1; k++) saida.push([cortes[k] + 1, cortes[k + 1]]);
  }
  return saida.map(([a, b]) => caixa(png, a, b, y0, y1));
}

/** A caixa apertada de um quadro dentro da sua fatia. */
function caixa(png, x0, x1, y0, y1) {
  let a = 1e9, b = -1, t = 1e9, u = -1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (alfa(png, x, y) <= OPACO) continue;
    if (x < a) a = x; if (x > b) b = x;
    if (y < t) t = y; if (y > u) u = y;
  }
  return b < 0 ? null : { x0: a, x1: b, y0: t, y1: u };
}

/**
 * Copia um quadro para a celula de 128, na escala pedida e com o pe na linha.
 *
 * A reducao usa MEDIA DE AREA: cada pixel de destino e a media do retangulo de
 * origem que cai nele. De 688 px para 90 sao 7,6 px de origem por px de
 * destino — pegar so o do meio jogaria fora nove de cada dez e o contorno
 * sairia picotado. A media pondera pelo alfa para a borda nao puxar a cor do
 * vazio e ficar com halo escuro.
 */
function desenhar(destino, cx, png, cx0, escala) {
  const { x0, x1, y0, y1 } = cx;
  const larg = Math.max(1, Math.round((x1 - x0 + 1) * escala));
  const alt = Math.max(1, Math.round((y1 - y0 + 1) * escala));
  const esq = cx0 + Math.round(QUADRO / 2 - larg / 2);
  const topo = LINHA_DOS_PES - alt + 1;
  const passo = 1 / escala;
  for (let y = 0; y < alt; y++) for (let x = 0; x < larg; x++) {
    const sx0 = x0 + x * passo, sy0 = y0 + y * passo;
    const sx1 = Math.min(x1 + 1, sx0 + passo), sy1 = Math.min(y1 + 1, sy0 + passo);
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let sy = Math.floor(sy0); sy < Math.max(Math.ceil(sy1), Math.floor(sy0) + 1); sy++) {
      for (let sx = Math.floor(sx0); sx < Math.max(Math.ceil(sx1), Math.floor(sx0) + 1); sx++) {
        if (sx < 0 || sy < 0 || sx >= png.width || sy >= png.height) continue;
        const i = (png.width * sy + sx) * 4;
        const pa = png.data[i + 3] / 255;
        r += png.data[i] * pa; g += png.data[i + 1] * pa; b += png.data[i + 2] * pa;
        a += png.data[i + 3]; n++;
      }
    }
    if (!n || a === 0) continue;
    const peso = a / 255;
    const dx = esq + x, dy = topo + y;
    if (dx < 0 || dy < 0 || dx >= destino.width || dy >= destino.height) continue;
    const d = (destino.width * dy + dx) * 4;
    destino.data[d] = Math.round(r / peso);
    destino.data[d + 1] = Math.round(g / peso);
    destino.data[d + 2] = Math.round(b / peso);
    destino.data[d + 3] = Math.round(a / n);
  }
}

// --------------------------------------------------------------- montar ---

const escalas = new Map();
const tiras = {};

/** A escala de uma fonte: o quadro EM PE dela levado a 90 px. */
function escalaDe(png, quadros, referencia) {
  const c = quadros[referencia];
  return ALTURA_EM_PE / (c.y1 - c.y0 + 1);
}

// 1. As quatro tiras que vieram da folha base.
for (const nome of ['idle', 'walk', 'jump', 'mine']) {
  const f = FONTES[nome];
  const png = ler(f.arq);
  const quadros = acharQuadros(png, f.banda, f.faixa).filter(Boolean);
  if (f.referencia !== null) escalas.set(nome, escalaDe(png, quadros, f.referencia));
  tiras[nome] = { png, quadros, fonte: nome };
}

// 2. A tira de mira, montada pose a pose na ordem que o jogo espera.
{
  const porArquivo = new Map();
  for (const arq of Object.keys(REFERENCIA_DA_MIRA)) {
    const png = ler(arq);
    const quadros = acharQuadros(png, null, null).filter(Boolean);
    porArquivo.set(arq, {
      png,
      quadros,
      escala: escalaDe(png, quadros, REFERENCIA_DA_MIRA[arq]),
    });
  }
  escalas.set('aim', porArquivo.get('mira-direcoes.png').escala);
  tiras.aim = {
    montada: MIRA.map(([arq, i]) => {
      const f = porArquivo.get(arq);
      return { png: f.png, cx: f.quadros[i], escala: f.escala };
    }),
  };
}

// 3. A escalada, emprestando a escala da mira.
{
  const png = ler(FONTES.climb.arq);
  const quadros = acharQuadros(png, null, null).filter(Boolean);
  tiras.climb = { png, quadros, fonte: 'climb' };
}
for (const nome of ['jump', 'mine', 'climb']) {
  escalas.set(nome, escalas.get(FONTES[nome].escalaDe));
}

// 4. Escrever.
const ORDEM = ['idle', 'walk', 'jump', 'mine', 'climb', 'aim'];
const resumo = [];
for (const nome of ORDEM) {
  const t = tiras[nome];
  const n = t.montada ? t.montada.length : t.quadros.length;
  const folha = new PNG({ width: n * QUADRO, height: QUADRO });
  folha.data.fill(0);
  for (let i = 0; i < n; i++) {
    if (t.montada) {
      const { png, cx, escala } = t.montada[i];
      desenhar(folha, cx, png, i * QUADRO, escala);
    } else {
      desenhar(folha, t.quadros[i], t.png, i * QUADRO, escalas.get(nome));
    }
  }
  const destino = path.resolve('public/art/character', `${nome}.png`);
  fs.writeFileSync(destino, PNG.sync.write(folha));
  resumo.push({ nome, n, escala: escalas.get(nome) });
  console.log(`  ${nome.padEnd(6)} ${String(n).padStart(2)} quadros  escala ${escalas.get(nome).toFixed(4)}  -> ${path.relative(process.cwd(), destino)}`);
}

// 5. A folha de conferencia: as seis tiras empilhadas, com a linha dos pes.
/*
 * Sem isto eu estaria confiando em tres numeros que ninguem viu: se o heroi da
 * escalada sair maior que o da caminhada, so aparece aqui — no jogo apareceria
 * como o personagem "pulsando" ao trocar de animacao, que e um bug dificil de
 * atribuir depois.
 */
{
  const maior = Math.max(...resumo.map((r) => r.n));
  const conf = new PNG({ width: maior * QUADRO, height: ORDEM.length * QUADRO });
  for (let i = 0; i < conf.data.length; i += 4) {
    conf.data[i] = 26; conf.data[i + 1] = 30; conf.data[i + 2] = 40; conf.data[i + 3] = 255;
  }
  ORDEM.forEach((nome, linha) => {
    const png = PNG.sync.read(fs.readFileSync(path.resolve('public/art/character', `${nome}.png`)));
    for (let y = 0; y < QUADRO; y++) for (let x = 0; x < png.width; x++) {
      const s = (png.width * y + x) * 4;
      const a = png.data[s + 3] / 255;
      if (a < 0.02) continue;
      const d = (conf.width * (linha * QUADRO + y) + x) * 4;
      conf.data[d] = Math.round(png.data[s] * a + conf.data[d] * (1 - a));
      conf.data[d + 1] = Math.round(png.data[s + 1] * a + conf.data[d + 1] * (1 - a));
      conf.data[d + 2] = Math.round(png.data[s + 2] * a + conf.data[d + 2] * (1 - a));
    }
    for (let x = 0; x < conf.width; x++) {
      const d = (conf.width * (linha * QUADRO + LINHA_DOS_PES) + x) * 4;
      conf.data[d] = 60; conf.data[d + 1] = 220; conf.data[d + 2] = 120;
    }
  });
  const destino = path.resolve('arte-bruta/conferencia/heroi.png');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, PNG.sync.write(conf));
  console.log(`\n  conferencia  ${path.relative(process.cwd(), destino)}`);
  console.log('  ordem das linhas: ' + ORDEM.join(', ') + '  (verde = linha dos pes)');
}

console.log('\n  agora: atualize `frames` em src/data/art.ts e rode `npm run medir-encaixes`.\n');
