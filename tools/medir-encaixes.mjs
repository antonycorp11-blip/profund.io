#!/usr/bin/env node
/**
 * Mede os PONTOS DE ENCAIXE do heroi, quadro a quadro.
 *
 *   npm run medir-encaixes            mede, grava e desenha a folha de conferencia
 *
 * Saidas:
 *   src/data/characterAnchors.ts      gerado — lido pelo PlayerSprite
 *   arte-bruta/conferencia/encaixes.png   uma folha com os pontos marcados
 *
 * POR QUE MEDIR, E NAO DESENHAR JUNTO.
 *
 * Hoje o capacete, a mochila e a picareta estao PINTADOS DENTRO da animacao.
 * Trocar qualquer um deles significaria redesenhar as seis tiras inteiras, e
 * duas mochilas dariam doze tiras. E por isso que o jogo tem quatro slots de
 * equipamento que nao aparecem no personagem: nao havia como faze-los
 * aparecer.
 *
 * Com o ponto de encaixe medido, cada peca vira UM desenho preso a um ponto.
 * Dez capacetes sao dez arquivos pequenos, nao sessenta tiras.
 *
 * POR QUE PELA PELE, E NAO PELO CONTORNO.
 *
 * A primeira versao pegava o pixel mais alto da silhueta como topo da cabeca.
 * Em `mine` o pixel mais alto e a PICARETA ERGUIDA (quadro 2 comeca na linha
 * 23, treze acima da cabeca) e em `climb` sao os bracos esticados — o capacete
 * ficaria pendurado na ponta da ferramenta.
 *
 * A pele nao mente: o rosto e as maos sao as unicas regioes claras e quentes
 * do desenho (V >= 0,72), enquanto o traje inteiro fica abaixo de V=0,42.
 * Achando os borroes de pele eu acho a cabeca e os punhos onde eles REALMENTE
 * estao naquele quadro, com o braco onde o animador colocou.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const QUADRO = 128;
/** Mesma altura em que o jogo desenha o heroi (ART.character.stripDrawHeight). */
const ALTURA_DESENHADA = 66;
/** Linha dos pes dentro do quadro — o cortador alinha todas as tiras nela. */
const LINHA_DOS_PES = 119;
const OPACO = 160;

/**
 * As tiras, com a quantidade de quadros LIDA DO PROPRIO ARQUIVO.
 *
 * Estava fixa aqui — 8, 8, 8, 8, 8, 10 — e dessincronizou na primeira vez que
 * a arte mudou: `mine` passou a ter 12 quadros e a medicao continuou olhando
 * os 8 primeiros, calada. Os quatro ultimos ficariam sem encaixe nenhum e o
 * motivo nao apareceria em lugar nenhum.
 *
 * A largura do PNG nao mente: sao quadros de 128 px lado a lado, entao a
 * contagem e uma divisao. Um numero que se deduz nao pode discordar da arte.
 */
/*
 * QUAIS tiras existem vem do art.ts, e nao de uma lista aqui.
 *
 * Estava fixa em seis nomes. Entraram `arranca`, `freia` e `gira` no jogo e a
 * medicao continuou olhando as seis de sempre, calada — as tres novas ficariam
 * sem encaixe nenhum, e o capacete simplesmente sumiria da cabeca durante a
 * arrancada sem que nada acusasse.
 *
 * E a segunda vez que uma lista escrita a mao aqui dessincronizou da arte. A
 * primeira foi a contagem de quadros, que agora sai da largura do PNG.
 */
const NOMES = [
  ...fs
    .readFileSync(path.resolve('src/data/art.ts'), 'utf8')
    .matchAll(/^\s{6}(\w+): \{ file: '/gm),
].map((m) => m[1]);
if (NOMES.length < 6) throw new Error('nao consegui ler as tiras de src/data/art.ts');

const TIRAS = NOMES.map((nome) => {
  const arq = path.resolve(`public/art/character/${nome}.png`);
  if (!fs.existsSync(arq)) return [nome, 0];
  return [nome, Math.round(PNG.sync.read(fs.readFileSync(arq)).width / QUADRO)];
});

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const v = mx / 255, s = mx ? (mx - mn) / mx : 0;
  let h = 0;
  if (mx !== mn) {
    if (mx === r) h = 60 * (((g - b) / (mx - mn)) % 6);
    else if (mx === g) h = 60 * ((b - r) / (mx - mn) + 2);
    else h = 60 * ((r - g) / (mx - mn) + 4);
  }
  return [h < 0 ? h + 360 : h, s, v];
}

/**
 * Pele: quente, clara e pouco saturada.
 *
 * Os limites sairam de um histograma da arte real — o rosto vive em
 * rgb(252,200,141), que da H=32 S=0,44 V=0,99. O couro do traje divide o
 * mesmo H mas fica em V<=0,42, entao e o BRILHO que separa os dois.
 */
const ehPele = (h, s, v) => h >= 18 && h <= 48 && s >= 0.2 && s <= 0.62 && v >= 0.72;

class Quadro {
  constructor(png, indice) {
    this.png = png;
    this.off = indice * QUADRO;
  }
  alfa(x, y) {
    if (x < 0 || y < 0 || x >= QUADRO || y >= this.png.height) return 0;
    return this.png.data[(this.png.width * y + (this.off + x)) * 4 + 3];
  }
  opaco(x, y) { return this.alfa(x, y) > OPACO; }
  pele(x, y) {
    if (!this.opaco(x, y)) return false;
    const i = (this.png.width * y + (this.off + x)) * 4;
    return ehPele(...hsv(this.png.data[i], this.png.data[i + 1], this.png.data[i + 2]));
  }
  /** Caixa da silhueta inteira. */
  caixa() {
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    for (let y = 0; y < QUADRO; y++) for (let x = 0; x < QUADRO; x++) {
      if (!this.opaco(x, y)) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return x1 < 0 ? null : { x0, x1, y0, y1 };
  }
  /** Borroes de pele, do maior para o menor. */
  borroes() {
    const visto = new Uint8Array(QUADRO * QUADRO);
    const achados = [];
    for (let y = 0; y < QUADRO; y++) for (let x = 0; x < QUADRO; x++) {
      const k = y * QUADRO + x;
      if (visto[k] || !this.pele(x, y)) continue;
      const fila = [[x, y]]; visto[k] = 1;
      const px = [];
      while (fila.length) {
        const [cx, cy] = fila.pop();
        px.push([cx, cy]);
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= QUADRO || ny >= QUADRO) continue;
          const nk = ny * QUADRO + nx;
          if (!visto[nk] && this.pele(nx, ny)) { visto[nk] = 1; fila.push([nx, ny]); }
        }
      }
      if (px.length < 5) continue;
      achados.push({
        n: px.length,
        cx: px.reduce((a, p) => a + p[0], 0) / px.length,
        cy: px.reduce((a, p) => a + p[1], 0) / px.length,
        topo: Math.min(...px.map((p) => p[1])),
        base: Math.max(...px.map((p) => p[1])),
      });
    }
    return achados.sort((a, b) => b.n - a.n);
  }
}

/**
 * Onde a cabeca esta neste quadro: no borrao de pele que TEM OLHOS.
 *
 * Duas tentativas anteriores falharam por motivos opostos, e as duas por
 * tentar deduzir a cabeca do tamanho ou da altura do borrao:
 *
 *   "o maior borrao" trocava rosto por mao quando o punho aparecia de frente.
 *   "o mais alto entre os grandes" quebrou de vez na arte em grade: ali o
 *   antebraco nu esticado e um borrao de pele MAIOR que o rosto, entao o
 *   rosto nem entrava na lista de candidatos. A medicao passou no teste de
 *   plausibilidade e devolveu a cabeca no punho e o punho no rosto — a arma
 *   nascia na altura da orelha.
 *
 * O olho resolve porque nao e heuristica: e uma coisa que a cabeca TEM e a
 * mao nao. Dentro da caixa do rosto ha pixels quase brancos, a esclera, com
 * preto colado do lado. Mao nenhuma tem isso em nenhuma pose.
 */
function temOlho(q, b) {
  const x0 = Math.floor(b.cx - 9), x1 = Math.ceil(b.cx + 9);
  const y0 = Math.floor(b.topo), y1 = Math.ceil(b.base);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!q.opaco(x, y)) continue;
      const i = (q.png.width * y + (q.off + x)) * 4;
      const [, s, v] = hsv(q.png.data[i], q.png.data[i + 1], q.png.data[i + 2]);
      if (v > 0.88 && s < 0.18) return true;
    }
  }
  return false;
}

function acharCabeca(q, borroes) {
  if (!borroes.length) return null;
  const comOlho = borroes.filter((b) => temOlho(q, b));
  /* Com olho, o maior deles — o rosto e maior que um reflexo solto.
   * Sem nenhum, cai no antigo: o mais alto entre os grandes. */
  if (comOlho.length) return comOlho[0];
  const maior = borroes[0].n;
  return borroes.filter((b) => b.n >= maior * 0.55).reduce((a, b) => (b.cy < a.cy ? b : a));
}

/**
 * Qual das duas maos SEGURA a coisa, tira por tira.
 *
 * Nao ha um criterio so, e tentar achar um custou tres rodadas:
 *
 *   "a mao mais BAIXA" errava na mira — o braco que aponta fica na altura do
 *   peito e a outra mao pende no quadril, mais baixa. A arma nascia atras.
 *
 *   "a mao mais A FRENTE" errava no golpe — com a picareta acima da cabeca o
 *   punho de trabalho fica quase sobre o eixo do corpo e a mao parada, la
 *   embaixo, aparece mais a frente. O braco saia apontando para BAIXO em onze
 *   dos doze quadros de um golpe para CIMA.
 *
 *   "a mao mais LONGE DO OMBRO" errava nos dois — o braco esticado esta longe
 *   na horizontal, a mao caida esta longe na vertical, e a distancia nao
 *   distingue as duas.
 *
 * O que decide nao e uma propriedade geometrica da mao: e o que o corpo esta
 * FAZENDO, e isso a tira ja diz. Mirando, quem trabalha e a mao da frente;
 * golpeando, e a de cima. Nas outras nao ha nada na mao e tanto faz.
 */
const CRITERIO = {
  // O golpe SOBE: a mao que trabalha e a de cima.
  mine: (a, b) => a.cy - b.cy,

  /*
   * ANDANDO E PARADO o braco PENDE: a mao que segura e a de baixo.
   *
   * Com "a mais a frente" o `walk` q0 e q9 devolveram punho na altura do
   * QUEIXO — nesses dois o braco esta para tras, entao a pele mais a frente
   * deixa de ser a mao e vira o pescoco. A picareta subia e cruzava o rosto.
   *
   * Nestas tiras nao ha ambiguidade nenhuma: a mao pende junto ao quadril, e o
   * unico jeito de errar e procurar outra coisa.
   */
  idle: (a, b) => b.cy - a.cy,
  walk: (a, b) => b.cy - a.cy,
  arranca: (a, b) => b.cy - a.cy,
  freia: (a, b) => b.cy - a.cy,
  gira: (a, b) => b.cy - a.cy,

  // MIRANDO e ESCALANDO o braco se estende: a mao que trabalha e a da frente.
  default: (a, b) => b.cx - a.cx,
};

function acharPunhos(borroes, cabeca, tira) {
  const ordem = CRITERIO[tira] ?? CRITERIO.default;
  return borroes.filter((b) => b !== cabeca).sort(ordem);
}

/**
 * O ombro, deduzido: logo abaixo da cabeca, no eixo do tronco.
 *
 * Ele nao esta marcado em lugar nenhum do desenho. A aproximacao basta porque
 * ninguem le a posicao do ombro na tela — ela so serve para comparar os dois
 * punhos entre si e para dar a direcao do braco.
 */
function pontoDoOmbro(caixa, cabeca) {
  return {
    x: (caixa.x0 + caixa.x1) / 2,
    y: cabeca.base + (caixa.y1 - cabeca.base) * 0.12,
  };
}

/**
 * O angulo do braco: do OMBRO ao punho.
 *
 * O ombro nao esta marcado em lugar nenhum do desenho, entao ele e deduzido:
 * fica logo abaixo da cabeca, no meio do tronco. E uma aproximacao grosseira,
 * e ela basta — o que importa nao e o angulo anatomico exato, e a ferramenta
 * acompanhar o braco em vez de ficar deitada enquanto ele sobe.
 */
function anguloDoBraco(caixa, cabeca, punho) {
  if (!cabeca || !punho) return undefined;
  const ombro = pontoDoOmbro(caixa, cabeca);
  return +Math.atan2(punho.cy - ombro.y, punho.cx - ombro.x).toFixed(4);
}

/** O pixel opaco mais alto dentro da largura do rosto: o topo do cabelo. */
function altoDaCabeca(q, cabeca) {
  const meia = 7;
  const x0 = Math.round(cabeca.cx - meia), x1 = Math.round(cabeca.cx + meia);
  let topo = Math.round(cabeca.topo);
  for (let y = Math.round(cabeca.topo); y >= 0; y--) {
    let achou = false;
    for (let x = x0; x <= x1; x++) if (q.opaco(x, y)) { achou = true; break; }
    if (!achou) break;
    topo = y;
  }
  return { x: cabeca.cx, y: topo };
}

/**
 * As costas: a borda de TRAS do tronco, na altura das omoplatas.
 *
 * A faixa vai do queixo ate a cintura. A arte olha para a direita, entao
 * "atras" e o menor x — e a mochila encosta ali.
 */
function acharCostas(q, caixa, cabeca) {
  const topo = cabeca ? Math.round(cabeca.base) : caixa.y0 + Math.round((caixa.y1 - caixa.y0) * 0.3);
  const base = Math.round(topo + (LINHA_DOS_PES - topo) * 0.45);
  let atras = 1e9, linhas = 0;
  for (let y = topo; y <= base; y++) {
    for (let x = caixa.x0; x <= caixa.x1; x++) {
      if (q.opaco(x, y)) { if (x < atras) atras = x; linhas++; break; }
    }
  }
  if (!linhas) return null;
  return { x: atras, y: (topo + base) / 2 };
}

// ---------------------------------------------------------------- medir ---

/** Quadros em que a medicao nao mereceu confianca (ver `conferir`). */
const queixas = [];
const medidas = {};
const cru = {};
for (const [nome, quadros] of TIRAS) {
  const arquivo = path.resolve(`public/art/character/${nome}.png`);
  if (!fs.existsSync(arquivo)) { console.warn(`  (sem ${nome}.png, pulando)`); continue; }
  const png = PNG.sync.read(fs.readFileSync(arquivo));
  medidas[nome] = [];
  cru[nome] = [];
  for (let i = 0; i < quadros; i++) {
    const q = new Quadro(png, i);
    const caixa = q.caixa();
    if (!caixa) { medidas[nome].push(null); cru[nome].push(null); continue; }
    const bs = q.borroes();
    const cabeca = acharCabeca(q, bs);
    const punhos = acharPunhos(bs, cabeca, nome);
    const costas = acharCostas(q, caixa, cabeca);

    /*
     * O ALTO DA CABECA, e nao o alto do ROSTO.
     *
     * Subir uma fracao do borrao de pele a partir da testa punha o ponto na
     * altura do olho — e capacete nao assenta no olho. O cabelo fica ACIMA da
     * pele e nao e pele, entao ele nao entra no borrao: o alto de verdade e o
     * pixel opaco mais alto NA LARGURA DO ROSTO, que e o topo da cabeleira.
     *
     * Limitar a busca a largura do rosto e o que impede o braco erguido de
     * roubar o ponto quando ele passa acima da cabeca — que e o caso em metade
     * dos quadros de golpe e em todos os de escalada.
     */
    const cranio = cabeca ? altoDaCabeca(q, cabeca) : null;

    cru[nome].push({ caixa, cabeca, punhos, costas, cranio });

    /*
     * O que nao passou no teste sai como `null`, e nao como o numero que o
     * detector achou.
     *
     * Rodando na arte de hoje, o punho da mira saiu CONSTANTE nos dez quadros
     * (y = -0,337 em todos) enquanto o punho de verdade vai de -0,272 a
     * -0,512: o detector estava achando a mesma manchinha de pele perto do
     * quadril em todo quadro. Um numero desses nao e uma medida ruim, e uma
     * medida INEXISTENTE com cara de boa — e o unico jeito de ela nao virar
     * bug la na frente e ela nao existir aqui.
     */
    const reprovados = conferir(nome, i, caixa, cranio, costas, punhos[0]);
    const ou = (campo, v) => (v && !reprovados.has(campo) ? v : null);
    medidas[nome].push({
      cabeca: ou('cabeca', cranio && emFracao(cranio.x, cranio.y)),
      costas: ou('costas', costas && emFracao(costas.x, costas.y)),
      punho: ou(
        'punho',
        punhos[0] && {
          ...emFracao(punhos[0].cx, punhos[0].cy),
          angulo: anguloDoBraco(caixa, cabeca, punhos[0]),
        }
      ),
    });
  }
}

/*
 * DESCONFIANCA AUTOMATICA.
 *
 * A medicao nunca devolve "nao sei": ela sempre acha ALGUM borrao de pele e
 * devolve um ponto. Rodando na arte atual, o punho do `idle` q0 caiu no PE e o
 * do `mine` q2 caiu na BOCHECHA — porque nesta arte a mao esta enluvada e a
 * cabeca esta de capacete, entao nao sobra pele de mao para achar, e o
 * detector se agarra ao couro claro da bota.
 *
 * Numero errado entregue em silencio e pior do que numero faltando: ele so
 * aparece la na frente, como um capacete flutuando no jogo, longe daqui. Entao
 * cada ponto passa por um teste de plausibilidade grosseiro — a cabeca fica na
 * metade de cima, o punho fica entre o ombro e o joelho, as costas ficam atras
 * do meio — e o que nao passa e DENUNCIADO por tira e quadro.
 *
 * Quem conserta e `characterAnchorFixes.ts`, escrito a mao.
 */
function conferir(tira, quadro, caixa, cranio, costas, punho) {
  const alt = caixa.y1 - caixa.y0;
  const reprovados = new Set();
  const diz = (campo, o) => {
    reprovados.add(campo);
    queixas.push(`${tira} q${quadro}: ${o}`);
  };
  if (!cranio) diz('cabeca', 'nao achei a cabeca (nenhum borrao de pele)');
  else if (cranio.y > caixa.y0 + alt * 0.5) diz('cabeca', 'cabeca na metade de BAIXO do corpo');
  if (!costas) diz('costas', 'nao achei as costas');
  if (!punho) diz('punho', 'nao achei punho nenhum');
  else {
    if (punho.cy > LINHA_DOS_PES - alt * 0.22) diz('punho', 'punho na altura do PE');
    if (cranio && Math.abs(punho.cx - cranio.x) < 5 && Math.abs(punho.cy - cranio.y) < 9) {
      diz('punho', 'punho colado na cabeca (provavelmente e o rosto)');
    }
  }
  return reprovados;
}

/**
 * Pixel do quadro -> fracao da ALTURA DESENHADA, com o zero na linha dos pes.
 *
 * E o mesmo sistema em que o punho da arma ja foi medido: x cresce para a
 * frente, y sobe negativo. Assim o encaixe nao depende do tamanho em que o
 * heroi e desenhado — muda a altura, os pontos acompanham.
 */
function emFracao(x, y) {
  const k = ALTURA_DESENHADA / QUADRO;
  return {
    x: +(((x - QUADRO / 2) * k) / ALTURA_DESENHADA).toFixed(4),
    y: +(((y - LINHA_DOS_PES) * k) / ALTURA_DESENHADA).toFixed(4),
  };
}

// -------------------------------------------------------------- gravar ---

const cabecalho = `/**
 * PONTOS DE ENCAIXE DO HEROI — arquivo GERADO. Nao edite a mao.
 *
 *   npm run medir-encaixes
 *
 * Um ponto por QUADRO, e nao um por animacao. Essa foi a licao que a arma ja
 * ensinou: andando de arma em punho o corpo usa quadros com o braco a frente,
 * e uma ancora "media" pendura a peca fora do corpo. A ancora tem que seguir o
 * desenho que esta na tela.
 *
 * Coordenadas em FRACAO DA ALTURA DESENHADA, com o zero na linha dos pes:
 * x cresce para a frente do heroi, y sobe negativo. Nao dependem do tamanho em
 * que o heroi e desenhado.
 *
 * Correcoes a mao vao em \`ENCAIXES_CORRIGIDOS\` (characterAnchorFixes.ts), que
 * e escrito por humano e sobrevive a proxima medicao.
 */

export interface Encaixe {
  x: number;
  y: number;
  /**
   * Para onde o ANTEBRACO aponta neste quadro, em radianos. So no punho.
   *
   * Sem ele a ferramenta ficaria horizontal em todo quadro, inclusive no meio
   * do golpe com o braco esticado acima da cabeca — uma picareta deitada no ar
   * ao lado de um punho erguido.
   *
   * E o angulo do ombro ate o punho, e nao o do antebraco de verdade: o
   * cotovelo nao e achavel no desenho, mas ombro-punho acompanha o movimento
   * de perto o bastante, porque e o braco inteiro que gira no golpe.
   */
  angulo?: number;
}

export interface EncaixesDoQuadro {
  /** Testa, onde um capacete assenta. */
  cabeca: Encaixe | null;
  /** Omoplatas, onde a mochila encosta. */
  costas: Encaixe | null;
  /** Punho fechado, onde entra o cabo da ferramenta ou da arma. */
  punho: Encaixe | null;
}

export const ENCAIXES: Record<string, (EncaixesDoQuadro | null)[]> = `;

const corpo = JSON.stringify(medidas, null, 2).replace(/"([a-z]+)":/g, '$1:');
fs.writeFileSync(
  path.resolve('src/data/characterAnchors.ts'),
  `${cabecalho}${corpo};\n`,
  'utf8'
);
console.log('  gerado  src/data/characterAnchors.ts');

// -------------------------------------------- folha de conferencia ---
/*
 * Numero que ninguem olhou e numero em que ninguem pode confiar.
 *
 * O punho da arma so ficou certo depois de eu RENDERIZAR as armas na mao e
 * olhar. Aqui e a mesma coisa: cada quadro sai com os tres pontos marcados por
 * cima do desenho, e um encaixe errado aparece na hora, em vez de aparecer
 * como um capacete flutuando dentro do jogo.
 */
const MARCAS = {
  cabeca: [90, 200, 255],   // azul   — testa
  costas: [255, 190, 60],   // ambar  — omoplatas
  punho: [255, 90, 120],    // rosa   — punho
};

const linhasDeTira = Object.keys(cru);
const colunas = Math.max(...linhasDeTira.map((n) => cru[n].length));
const folha = new PNG({ width: colunas * QUADRO, height: linhasDeTira.length * QUADRO });
folha.data.fill(0);

function ponto(px, py, cor, raio) {
  for (let dy = -raio; dy <= raio; dy++) for (let dx = -raio; dx <= raio; dx++) {
    if (dx * dx + dy * dy > raio * raio) continue;
    const x = Math.round(px + dx), y = Math.round(py + dy);
    if (x < 0 || y < 0 || x >= folha.width || y >= folha.height) continue;
    const i = (folha.width * y + x) * 4;
    folha.data[i] = cor[0]; folha.data[i+1] = cor[1]; folha.data[i+2] = cor[2]; folha.data[i+3] = 255;
  }
}

linhasDeTira.forEach((nome, linha) => {
  const png = PNG.sync.read(fs.readFileSync(path.resolve(`public/art/character/${nome}.png`)));
  cru[nome].forEach((m, col) => {
    const dx = col * QUADRO, dy = linha * QUADRO;
    // o desenho
    for (let y = 0; y < QUADRO; y++) for (let x = 0; x < QUADRO; x++) {
      const o = (png.width * y + (col * QUADRO + x)) * 4;
      if (o + 3 >= png.data.length) continue;
      const d = (folha.width * (dy + y) + (dx + x)) * 4;
      folha.data[d] = png.data[o]; folha.data[d+1] = png.data[o+1];
      folha.data[d+2] = png.data[o+2]; folha.data[d+3] = png.data[o+3];
    }
    // a linha dos pes, para ver de relance se a tira esta alinhada
    for (let x = 0; x < QUADRO; x++) {
      const d = (folha.width * (dy + LINHA_DOS_PES) + (dx + x)) * 4;
      folha.data[d] = 60; folha.data[d+1] = 255; folha.data[d+2] = 120; folha.data[d+3] = 90;
    }
    if (!m) return;
    if (m.cranio) ponto(dx + m.cranio.x, dy + m.cranio.y, MARCAS.cabeca, 3);
    if (m.costas) ponto(dx + m.costas.x, dy + m.costas.y, MARCAS.costas, 3);
    if (m.punhos[0]) ponto(dx + m.punhos[0].cx, dy + m.punhos[0].cy, MARCAS.punho, 3);
  });
});

const destino = path.resolve('arte-bruta/conferencia/encaixes.png');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, PNG.sync.write(folha));
console.log(`  conferencia  ${path.relative(process.cwd(), destino)}  (${folha.width}x${folha.height})`);
console.log(`  azul = cabeca, ambar = costas, rosa = punho, verde = linha dos pes`);

if (queixas.length) {
  console.log(`\n  ${queixas.length} encaixe(s) que eu NAO consegui medir com confianca:`);
  for (const q of queixas) console.log(`    ? ${q}`);
  console.log(
    `\n  Isso e esperado enquanto o heroi estiver de CAPACETE e de LUVA: sem pele\n` +
    `  na mao e no craneo, nao ha o que medir. Com a arte de cabeca e maos\n` +
    `  descobertas estes avisos devem sumir sozinhos.\n`
  );
} else {
  console.log('\n  todos os encaixes passaram no teste de plausibilidade.\n');
}
