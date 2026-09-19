#!/usr/bin/env node
/**
 * Recorta a folha das ruinas em tiles de 128 px.
 *
 *   npm run slice-ruinas
 *
 * Entrada: arte-bruta/ruinas/folha.png
 * Saida:   public/art/blocks/{ruin_brick_0, ruin_brick_1, ruin_slab_0,
 *          ruin_door_0, ruin_column_0, ladder_0}.png
 *
 * A FOLHA NAO VEIO NA GRADE QUE EU PEDI, e nao tem problema.
 *
 * Eu havia pedido 3x2 celulas de 256. Veio um bloco de 1024x1024 a esquerda
 * (que e um 2x2 de 512: parede A, parede B, piso, porta entaipada) e uma tira
 * de 247 px a direita com a coluna em cima e a escada embaixo.
 *
 * O desenho estava certo; so o corte era outro. Reclamar do corte e pedir de
 * novo custa uma geracao inteira; MEDIR a folha e cortar onde ela realmente se
 * divide custa este arquivo. As medidas abaixo sao as que eu tirei dela, e
 * estao escritas para que quem leia saiba de onde vieram.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ENTRADA = path.resolve('arte-bruta/ruinas/folha.png');
const SAIDA = path.resolve('public/art/blocks');
const LADO = 128;

if (!fs.existsSync(ENTRADA)) {
  console.log('  falta arte-bruta/ruinas/folha.png');
  process.exit(1);
}
const folha = PNG.sync.read(fs.readFileSync(ENTRADA));
fs.mkdirSync(SAIDA, { recursive: true });

/**
 * Recorte com reducao por media de area.
 *
 * Media, e nao amostra do pixel do meio: reduzir 512 para 128 jogando fora
 * tres de cada quatro pixels serrilha a argamassa e come o musgo fino, que e
 * justamente o que da idade a pedra.
 */
function recortar(sx, sy, sw, sh, nome) {
  const out = new PNG({ width: LADO, height: LADO });
  out.data.fill(0);
  const escX = sw / LADO;
  const escY = sh / LADO;
  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      const x0 = Math.floor(sx + x * escX);
      const y0 = Math.floor(sy + y * escY);
      const x1 = Math.max(x0 + 1, Math.floor(sx + (x + 1) * escX));
      const y1 = Math.max(y0 + 1, Math.floor(sy + (y + 1) * escY));
      for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
          if (px < 0 || py < 0 || px >= folha.width || py >= folha.height) continue;
          const i = (py * folha.width + px) * 4;
          const av = folha.data[i + 3];
          r += folha.data[i] * av;
          g += folha.data[i + 1] * av;
          b += folha.data[i + 2] * av;
          a += av;
          n++;
        }
      }
      if (!n || a === 0) continue;
      const j = (y * LADO + x) * 4;
      out.data[j] = Math.round(r / a);
      out.data[j + 1] = Math.round(g / a);
      out.data[j + 2] = Math.round(b / a);
      out.data[j + 3] = Math.round(a / n);
    }
  }
  fs.writeFileSync(path.join(SAIDA, `${nome}.png`), PNG.sync.write(out));
  return nome;
}

const feitos = [];

// --- bloco da esquerda: 2x2 de 512 ---
feitos.push(recortar(0, 0, 512, 512, 'ruin_brick_0'));
feitos.push(recortar(512, 0, 512, 512, 'ruin_brick_1'));
feitos.push(recortar(0, 512, 512, 512, 'ruin_slab_0'));
feitos.push(recortar(512, 512, 512, 512, 'ruin_door_0'));

/*
 * A COLUNA: uma fatia do FUSTE, sem o capitel.
 *
 * O fuste mede 234 px de largura e e uniforme de y=0 ate y≈490; dali para
 * baixo ele alarga para 247, que e o capitel. Incluir o capitel quebraria a
 * repeticao vertical — cada segmento empilhado teria um anel no meio.
 *
 * A fatia sai quadrada (234x234) para nao esticar as estrias ao virar 128.
 */
feitos.push(recortar(1152, 120, 247, 247, 'ruin_column_0'));

/*
 * A ESCADA: exatamente UM periodo de degrau.
 *
 * Medidos na folha, os degraus comecam em y = 549, 646, 744, 841 e 941 —
 * periodo de 97 px. Cortar 97 px a partir de um degrau faz o tile emendar
 * consigo mesmo: o degrau cai sempre na mesma altura, e uma escada de vinte
 * tiles nao mostra costura.
 *
 * Cortar "de olho" aqui seria fatal: um pixel de erro por tile vira vinte
 * pixels de deriva no fim do poco, e a escada aparece torta.
 */
feitos.push(recortar(1152, 549, 247, 97, 'ladder_0'));

console.log('\n  ' + feitos.join('\n  ') + '\n');
