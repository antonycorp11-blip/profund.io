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
 * A arte chegou em folhas soltas, uma por animacao, cada uma num tamanho — da
 * caminhada com 484 px de silhueta ate a mira com 688. Quarenta por cento de
 * diferenca entre elas. Por isso cada fonte declara qual e o seu quadro EM PE:
 * e dele que sai a escala, e so um corpo em pe mede o corpo.
 *
 * `banda`/`faixa` recortam uma regiao (usado so na folha-base, que e um
 * mosaico). Sem elas, o arquivo inteiro vale.
 */
const FONTES = {
  /* Ainda saem da folha-base, que veio como mosaico. */
  idle: { arq: 'folha-base.png', banda: [59, 206], faixa: [20, 697], referencia: 0 },
  mine: { arq: 'folha-base.png', banda: [273, 435], faixa: [511, 1521], referencia: null, escalaDe: 'idle' },

  /*
   * CAMINHADA: nao ha quadro em pe, e o mais alto serve.
   *
   * Num ciclo de passada o quadro mais alto e aquele com as pernas mais
   * juntas — uns tres por cento abaixo da altura em pe, porque o joelho ainda
   * esta levemente dobrado. Normalizar por ele deixa o heroi tres por cento
   * mais alto andando do que parado, e isso ninguem ve a 46 px de tela.
   */
  walk: { arq: 'n2-walk.png', referencia: 'maisAlto', esperado: 10 },

  jump: { arq: 'n2-jump.png', referencia: 0, esperado: 9 },
  gira: { arq: 'n2-gira.png', referencia: 0 },
  arranca: { arq: 'n2-arranca.png', referencia: 0 },
  freia: { arq: 'nova-freia.png', referencia: 'ultimo' },

  /*
   * ESCALADA: nao ha quadro em pe NEM quadro alto que sirva.
   *
   * Nos oito ele esta encolhido, joelho para cima e braco acima da cabeca — a
   * silhueta mede a pose, nao o corpo. O mais alto daria um heroi uns vinte
   * por cento maior, e vinte por cento se ve.
   *
   * Entao a escala dela e o unico numero deste arquivo ajustado no olho,
   * comparando na folha de conferencia com as tiras vizinhas. Esta anotado
   * como ajustado no olho de proposito: se a arte da escalada for refeita,
   * este numero tem que ser reconferido.
   */
  climb: { arq: 'n2-climb.png', escalaManual: 0.1585, esperado: 8 },

  /*
   * ANDAR COM A ARMA — duas tiras, e as duas por falta de quadro.
   *
   * A tira de mira tem dez quadros e so DOIS sao de caminhada. Dois quadros
   * nao formam um ciclo: as pernas ficavam praticamente paradas enquanto o
   * corpo deslizava. Nao havia ajuste possivel, faltavam os quadros.
   *
   * `arma_anda` e com o braco ESTICADO, para quando ele anda atirando.
   * `arma_baixa` e com o braco CAIDO, e resolve a outra metade da queixa:
   * sacar a arma travava o corpo numa pose so, de braco esticado o tempo
   * inteiro. Agora o braco so sobe quando ele realmente atira.
   *
   * Nenhuma das duas tem quadro em pe — sao ciclos inteiros — entao a escala
   * sai do quadro mais alto, igual a caminhada comum.
   */
  arma_anda: { arq: 'n3-arma-anda.png', referencia: 'maisAlto', esperado: 10 },
  arma_baixa: { arq: 'n3-arma-baixa.png', referencia: 'maisAlto', esperado: 10 },
};

/**
 * A tira de MIRA e montada, e nao recortada.
 *
 * Ela e a unica em que o indice do quadro tem significado: o jogo pede o
 * quadro 0 para o tiro reto, o 2 para cima, o 4 para baixo, 6-7 para o recuo e
 * 8-9 para andar atirando (ver PlayerSprite.stripFrame). As sete poses
 * distintas vieram em dois arquivos; aqui elas entram na ordem que o jogo
 * espera.
 *
 * Os pares repetem a mesma pose menos no recuo e no andar: nas tres direcoes o
 * jogo so le o primeiro do par, entao um segundo desenho ali seria trabalho
 * que ninguem ve.
 */
const MIRA = [
  ['n2-mira3.png', 0], ['n2-mira3.png', 0],
  ['n2-mira3.png', 1], ['n2-mira3.png', 1],
  ['n2-mira3.png', 2], ['n2-mira3.png', 2],
  ['nova-mira-recuo.png', 0], ['nova-mira-recuo.png', 1],
  ['nova-mira-recuo.png', 2], ['nova-mira-recuo.png', 3],
];
/** O quadro DE PE de cada arquivo de mira, para tirar a escala. */
const REFERENCIA_DA_MIRA = { 'n2-mira3.png': 0, 'nova-mira-recuo.png': 1 };

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
function acharQuadros(png, banda, faixa, esperado) {
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

  /*
   * QUANDO A FOLHA DIZ QUANTOS QUADROS TEM, e ela quem manda.
   *
   * Partir por "bloco largo demais em relacao a mediana" funciona enquanto os
   * desenhos se separam. Na caminhada nova eles se TOCAM — o braco de um
   * encosta no do vizinho — e a folha inteira virou dois blocos. Com dois
   * blocos a mediana e enorme, nenhum parece largo demais, e sairam dois
   * quadros de dez.
   *
   * Com a contagem declarada eu ignoro a mediana e corto o intervalo todo em
   * N partes, cada corte caindo na coluna de menos conteudo por perto. E a
   * mesma busca por vale, so que sabendo quantos vales procurar.
   */
  if (esperado && brutos.length) {
    const a0 = brutos[0][0];
    const b0 = brutos[brutos.length - 1][1];
    const largura = b0 - a0 + 1;
    const passo = largura / esperado;
    const cortes = [a0 - 1];
    for (let k = 1; k < esperado; k++) {
      const alvo = a0 + Math.round(passo * k);
      let melhor = alvo;
      let menor = Infinity;
      const margem = Math.round(passo * 0.3);
      for (let x = alvo - margem; x <= alvo + margem; x++) {
        if (x <= a0 || x >= b0) continue;
        if (col[x] < menor) { menor = col[x]; melhor = x; }
      }
      cortes.push(melhor);
    }
    cortes.push(b0);
    const partes = [];
    for (let k = 0; k < cortes.length - 1; k++) {
      partes.push(caixa(png, cortes[k] + 1, cortes[k + 1], y0, y1));
    }
    return partes;
  }

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

/**
 * A escala de uma fonte: o quadro EM PE dela levado a 90 px.
 *
 * `referencia` aceita um indice, ou um dos dois nomes:
 *   'maisAlto' — a silhueta mais alta da folha (ciclo sem quadro parado)
 *   'ultimo'   — o ultimo quadro (animacoes que TERMINAM em pe, como frear)
 */
function escalaDe(png, quadros, referencia) {
  let c;
  if (referencia === 'maisAlto') {
    c = quadros.reduce((a, b) => (b.y1 - b.y0 > a.y1 - a.y0 ? b : a));
  } else if (referencia === 'ultimo') {
    c = quadros[quadros.length - 1];
  } else {
    c = quadros[referencia];
  }
  return ALTURA_EM_PE / (c.y1 - c.y0 + 1);
}

/** As tiras recortadas de uma folha inteira ou de uma regiao dela. */
for (const nome of Object.keys(FONTES)) {
  const f = FONTES[nome];
  const png = ler(f.arq);
  const quadros = acharQuadros(png, f.banda, f.faixa, f.esperado).filter(Boolean);
  tiras[nome] = { png, quadros };
  if (f.escalaManual !== undefined) escalas.set(nome, f.escalaManual);
  else if (f.referencia !== null && f.referencia !== undefined) {
    escalas.set(nome, escalaDe(png, quadros, f.referencia));
  }
}

// A tira de mira, montada pose a pose na ordem que o jogo espera.
{
  const porArquivo = new Map();
  for (const arq of Object.keys(REFERENCIA_DA_MIRA)) {
    const png = ler(arq);
    const quadros = acharQuadros(png, null, null).filter(Boolean);
    porArquivo.set(arq, { png, quadros, escala: escalaDe(png, quadros, REFERENCIA_DA_MIRA[arq]) });
  }
  escalas.set('aim', porArquivo.get('n2-mira3.png').escala);
  tiras.aim = {
    montada: MIRA.map(([arq, i]) => {
      const f = porArquivo.get(arq);
      return { png: f.png, cx: f.quadros[i], escala: f.escala };
    }),
  };
}

// Quem empresta a escala de outra tira resolve depois que todas ja mediram.
for (const nome of Object.keys(FONTES)) {
  const de = FONTES[nome].escalaDe;
  if (de) escalas.set(nome, escalas.get(de));
}

// 4. Escrever.
const ORDEM = ['idle', 'walk', 'jump', 'mine', 'climb', 'aim', 'arranca', 'freia', 'gira', 'arma_anda', 'arma_baixa'];
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
