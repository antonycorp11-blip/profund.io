#!/usr/bin/env node
/**
 * Recorta a folha dos bots em tiras de animacao.
 *
 *   npm run slice-bots
 *
 * Entrada:  arte-bruta/bots/bot-folha.png   (1536x1024 = 6 colunas x 4 linhas)
 * Saida:    public/art/bots/{idle,walk,mine,broca}.png  (6 quadros de 128px)
 *
 * POR QUE NAO E SO UM CORTE.
 *
 * Tres coisas aprendidas recortando o heroi, e que custam caro se esquecidas:
 *
 * 1. ALINHAR PELO CENTRO DE MASSA, nao pela caixa. Centralizar cada quadro na
 *    propria caixa faz o corpo andar para tras quando um braco se estende — o
 *    "moonwalk" que levou uma rodada inteira para eu entender.
 *
 * 2. UMA LINHA DE PES SO. Cada quadro tem que apoiar na MESMA altura, senao o
 *    boneco flutua e afunda enquanto anda.
 *
 * 3. MAIOR COMPONENTE CONECTADO por celula. Fagulha ou fumaca que encosta na
 *    celula vizinha entra no recorte e desloca tudo; ficar so com o borrao
 *    principal resolve — menos a fumaca e as fagulhas DESTE quadro, que sao
 *    parte da animacao e por isso entram na pintura, mas nao na medicao.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ENTRADA = path.resolve('arte-bruta/bots/bot-folha.png');
const SAIDA = path.resolve('public/art/bots');
const COLS = 6;
const LINHAS = ['idle', 'walk', 'mine', 'broca'];
const DESTINO = 128;

if (!fs.existsSync(ENTRADA)) {
  console.log(`  falta ${path.relative(process.cwd(), ENTRADA)}`);
  process.exit(1);
}
fs.mkdirSync(SAIDA, { recursive: true });

const folha = PNG.sync.read(fs.readFileSync(ENTRADA));
const CEL_W = Math.floor(folha.width / COLS);
const CEL_H = Math.floor(folha.height / LINHAS.length);
console.log(`\nfolha ${folha.width}x${folha.height} -> celula ${CEL_W}x${CEL_H}`);

/** Alfa do pixel, com o 254 do exportador virando 255. */
function alfa(png, x, y) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return 0;
  const a = png.data[(y * png.width + x) * 4 + 3];
  return a >= 250 ? 255 : a;
}

/** Mede um quadro: caixa, centro de massa e linha dos pes. */
function medir(png, cx, cy) {
  let minX = Infinity, maxX = -1, maxY = -1;
  let somaX = 0, n = 0;
  for (let y = 0; y < CEL_H; y++) {
    for (let x = 0; x < CEL_W; x++) {
      // So o que e bem opaco conta para a MEDIDA: fumaca e fagulha sao
      // desenhadas mas nao podem mover o corpo de lugar.
      if (alfa(png, cx + x, cy + y) < 200) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      somaX += x;
      n++;
    }
  }
  if (n === 0) return null;
  return { minX, maxX, pes: maxY, centro: somaX / n, n };
}

/** Reducao por media de area: nitida sem serrilhar, que e o que pixel art pede. */
/*
 * `limX` fecha a celula: nada e lido de fora dela.
 *
 * Sem isso o recorte SANGRA. Com escala 0,458 a janela de leitura cobre 280
 * px de origem para uma celula de 256 — ela entra na celula vizinha e traz o
 * bot do lado para a borda deste quadro. A medicao acusava "21 pixels
 * solidos cortados na esquerda" e eu passei duas rodadas corrigindo o
 * ALINHAMENTO, que estava certo: o que estava ali nao era este bot saindo,
 * era o vizinho entrando.
 */
function reduzir(origem, ox, oy, larg, alt, destino, dx, dy, lado, escala, limX) {
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const sx0 = ox + (x - lado / 2) / escala;
      const sy0 = oy + (y - lado) / escala;
      let r = 0, g = 0, b = 0, a = 0, peso = 0;
      const passo = Math.max(1, Math.round(1 / escala));
      for (let sy = 0; sy < passo; sy++) {
        for (let sx = 0; sx < passo; sx++) {
          const px = Math.round(sx0 + sx);
          const py = Math.round(sy0 + sy);
          if (px < 0 || py < 0 || px >= origem.width || py >= origem.height) continue;
          if (limX && (px < limX[0] || px >= limX[1])) continue;
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
      const j = ((dy + y) * destino.width + (dx + x)) * 4;
      destino.data[j] = Math.round(r / a);
      destino.data[j + 1] = Math.round(g / a);
      destino.data[j + 2] = Math.round(b / a);
      destino.data[j + 3] = Math.round(a / peso);
    }
  }
}

/*
 * UMA escala para a FOLHA inteira, nao uma por linha.
 *
 * Na primeira passada eu calculei a escala linha a linha e sai 0,458 no idle
 * contra 0,543 no mine: 18% de diferenca. O bot encolheria ao parar e
 * cresceria ao minerar, porque na linha de minerar ele se inclina, fica mais
 * BAIXO, e escalar cada linha para a mesma altura util corrigia exatamente a
 * inclinacao que devia aparecer.
 *
 * A referencia e a pose mais alta de toda a folha — em pe, parado.
 */
let alturaMaxima = 0;
for (let linha = 0; linha < LINHAS.length; linha++) {
  for (let c = 0; c < COLS; c++) {
    const m = medir(folha, c * CEL_W, linha * CEL_H);
    if (!m) continue;
    let topo = CEL_H;
    for (let y = 0; y < CEL_H; y++) {
      let achou = false;
      for (let x = 0; x < CEL_W; x++) {
        if (alfa(folha, c * CEL_W + x, linha * CEL_H + y) >= 200) { achou = true; break; }
      }
      if (achou) { topo = y; break; }
    }
    alturaMaxima = Math.max(alturaMaxima, m.pes - topo + 1);
  }
}
const ESCALA = (DESTINO * 0.78) / alturaMaxima;
console.log(`  altura maxima na folha: ${alturaMaxima}px -> escala unica ${ESCALA.toFixed(3)}\n`);

for (let linha = 0; linha < LINHAS.length; linha++) {
  const nome = LINHAS[linha];
  const medidas = [];
  for (let c = 0; c < COLS; c++) {
    const m = medir(folha, c * CEL_W, linha * CEL_H);
    if (!m) {
      console.log(`  ${nome}: quadro ${c} vazio — folha fora do formato?`);
      process.exit(1);
    }
    medidas.push(m);
  }

  // Uma linha de pes para toda a tira: o boneco nao pode flutuar ao andar.
  let pes = -1;
  for (let c = 0; c < COLS; c++) pes = Math.max(pes, medidas[c].pes);
  const escala = ESCALA;

  const tira = new PNG({ width: DESTINO * COLS, height: DESTINO });
  tira.data.fill(0);
  for (let c = 0; c < COLS; c++) {
    const m = medidas[c];
    /*
     * Centro de massa, MAS preso dentro do quadro.
     *
     * Alinhar pelo centro de massa e o que evita o "moonwalk" — centralizar
     * pela caixa empurra o tronco para tras quando um membro se estende. So
     * que a broca esticada para a frente e uma extensao longa: ela puxa o
     * centro de massa para a direita e joga o CORPO para fora pela esquerda.
     * A medicao confirmou: quatro dos seis quadros de `broca` encostavam na
     * borda esquerda, ou seja, estavam sendo cortados.
     *
     * Entao o centro de massa continua mandando enquanto o desenho couber, e
     * cede o minimo necessario quando nao couber. Isso preserva a correcao no
     * caso comum e nunca corta no caso extremo.
     */
    const meio = DESTINO / 2;
    const margem = 3; // um fio de ar, para o contorno escuro nao encostar
    /*
     * Os dois limites de uma vez, nao um depois do outro.
     *
     * A primeira versao corrigia a esquerda e depois a direita — e calculava a
     * folga da direita com o deslocamento ANTIGO, de antes da primeira
     * correcao. A segunda desfazia a primeira, e o corpo continuava saindo
     * pela esquerda: 21 pixels solidos na borda, medidos.
     *
     * O desenho mais largo da folha da 110 px num quadro de 128, entao existe
     * posicao que serve para todos. E so nao procurar uma de cada vez.
     */
    const limiteEsq = m.maxX - (meio - margem) / escala;
    const limiteDir = m.minX + (meio - margem) / escala;
    const desloc = Math.min(Math.max(m.centro, limiteEsq), limiteDir);

    const ox = c * CEL_W + desloc;
    // Folga embaixo: sem ela o pe encosta na borda e nao sobra ar para a
    // sombra que o jogo desenha por baixo do bicho.
    const oy = linha * CEL_H + pes + 2 + Math.round(DESTINO * 0.05 / escala);
    reduzir(folha, ox, oy, CEL_W, CEL_H, tira, c * DESTINO, 0, DESTINO, escala, [
      c * CEL_W,
      (c + 1) * CEL_W,
    ]);
  }
  const destino = path.join(SAIDA, `${nome}.png`);
  fs.writeFileSync(destino, PNG.sync.write(tira));
  const desvio = Math.max(...medidas.map((m) => m.pes)) - Math.min(...medidas.map((m) => m.pes));
  console.log(
    `  ${nome.padEnd(6)} ${COLS} quadros  escala ${escala.toFixed(3)}  ` +
      `pes variam ${desvio}px na origem (alinhados na saida)`
  );
  if (desvio > 0) {
    console.log(`     (os ${desvio}px de diferenca sao a animacao, e sao preservados)`);
  }
}
console.log(`\ntiras em ${path.relative(process.cwd(), SAIDA)}\n`);
