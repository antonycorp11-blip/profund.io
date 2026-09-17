#!/usr/bin/env node
/**
 * Fatia as armas em VISTA LATERAL e mede o cabo de cada uma.
 *
 *   npm run slice-armas-lateral
 *
 * Entrada:  arte-bruta/armas/armas-lateral.png  — seis armas numa fileira
 * Saida:    public/art/weapons/*.png  +  src/data/weaponGrips.ts
 *
 * A folha anterior era de ICONE DE INVENTARIO: as armas vinham em tres
 * quartos, inclinadas. Girar aquilo pelo angulo da mira somava a inclinacao
 * propria do desenho e a arma nunca assentava na mao. Esta vem deitada, com o
 * cano na horizontal — e e por isso que ela pode ser girada.
 *
 * O CABO e medido, nao chutado. Cada arma tem a empunhadura num lugar
 * diferente (o revolver e curto, o fuzil tem coronha atras), e prender todas
 * pelo mesmo ponto deixaria umas adiantadas e outras atrasadas na mao.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const LIMIAR = 24;
const ARMAS = ['pistola', 'pistola_2', 'escopeta', 'escopeta_2', 'fuzil', 'fuzil_2'];
/** Altura final de cada sprite; a largura sai da proporcao real. */
const ALTURA = 32;

const entrada = path.resolve(process.argv[2] ?? 'arte-bruta/armas/armas-lateral.png');
const src = PNG.sync.read(fs.readFileSync(entrada));

const opaco = (x, y) =>
  x >= 0 && y >= 0 && x < src.width && y < src.height && src.data[(y * src.width + x) * 4 + 3] >= LIMIAR;

function colunasCheias() {
  const cheia = new Uint8Array(src.width);
  for (let x = 0; x < src.width; x++) {
    for (let y = 0; y < src.height; y++) {
      if (opaco(x, y)) {
        cheia[x] = 1;
        break;
      }
    }
  }
  return cheia;
}

/** Faixas de colunas desenhadas, uma por arma. */
function faixas(cheia) {
  const out = [];
  let ini = -1;
  for (let x = 0; x < cheia.length; x++) {
    if (cheia[x] && ini < 0) ini = x;
    if (!cheia[x] && ini >= 0) {
      out.push([ini, x - 1]);
      ini = -1;
    }
  }
  if (ini >= 0) out.push([ini, cheia.length - 1]);
  return out;
}

function juntarAte(lista, alvo) {
  const l = lista.map((f) => [...f]);
  while (l.length > alvo) {
    let menor = Infinity;
    let onde = 0;
    for (let i = 0; i < l.length - 1; i++) {
      const vao = l[i + 1][0] - l[i][1];
      if (vao < menor) {
        menor = vao;
        onde = i;
      }
    }
    l[onde] = [l[onde][0], l[onde + 1][1]];
    l.splice(onde + 1, 1);
  }
  return l;
}

function caixa(x0, x1) {
  let minX = x1;
  let maxX = x0;
  let minY = src.height;
  let maxY = -1;
  for (let y = 0; y < src.height; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!opaco(x, y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Onde a MAO fecha na arma.
 *
 * O cabo e a parte que DESCE abaixo da linha do cano, na metade de tras. Entao:
 * acha a altura do cano (a linha com desenho mais comprido), pega tudo que
 * esta abaixo dela no terco traseiro, e tira o centro dessa massa. A mao fecha
 * um pouco acima do meio do cabo, perto de onde ele encontra a arma — por isso
 * o resultado sobe 30% da altura do cabo.
 */
function medirCabo(box) {
  let linhaDoCano = box.y;
  let maisLargo = -1;
  for (let y = box.y; y < box.y + box.h; y++) {
    let n = 0;
    for (let x = box.x; x < box.x + box.w; x++) if (opaco(x, y)) n++;
    if (n > maisLargo) {
      maisLargo = n;
      linhaDoCano = y;
    }
  }
  const limiteTraseiro = box.x + box.w * 0.42;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = linhaDoCano; y < box.y + box.h; y++) {
    for (let x = box.x; x <= limiteTraseiro; x++) {
      if (!opaco(x, y)) continue;
      sx += x;
      sy += y;
      n++;
    }
  }
  if (n === 0) return { x: 0.2, y: 0.5 };
  const cx = sx / n;
  const cy = sy / n;
  // Sobe em direcao ao cano: a mao fecha no alto do cabo, nao no fundo dele.
  const alto = linhaDoCano + (cy - linhaDoCano) * 0.35;
  return {
    x: +((cx - box.x) / box.w).toFixed(3),
    y: +((alto - box.y) / box.h).toFixed(3),
  };
}

/** Reducao com media ponderada pelo alfa (evita halo escuro nas bordas). */
function reduzir(box, larg, alt) {
  const out = new PNG({ width: larg, height: alt });
  out.data.fill(0);
  for (let y = 0; y < alt; y++) {
    for (let x = 0; x < larg; x++) {
      const sx0 = box.x + (x * box.w) / larg;
      const sx1 = box.x + ((x + 1) * box.w) / larg;
      const sy0 = box.y + (y * box.h) / alt;
      const sy1 = box.y + ((y + 1) * box.h) / alt;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let sy = Math.floor(sy0); sy < Math.max(Math.floor(sy0) + 1, sy1); sy++) {
        for (let sx = Math.floor(sx0); sx < Math.max(Math.floor(sx0) + 1, sx1); sx++) {
          if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
          const i = (sy * src.width + sx) * 4;
          const al = src.data[i + 3] / 255;
          r += src.data[i] * al;
          g += src.data[i + 1] * al;
          b += src.data[i + 2] * al;
          a += al;
          n++;
        }
      }
      const o = (y * larg + x) * 4;
      if (n === 0 || a === 0) continue;
      out.data[o] = Math.round(r / a);
      out.data[o + 1] = Math.round(g / a);
      out.data[o + 2] = Math.round(b / a);
      out.data[o + 3] = Math.round((a / n) * 255);
    }
  }
  return out;
}

const pecas = juntarAte(faixas(colunasCheias()), ARMAS.length);
const destino = path.resolve('public/art/weapons');
fs.mkdirSync(destino, { recursive: true });

const cabos = {};
pecas.forEach((faixa, i) => {
  const nome = ARMAS[i];
  if (!nome) return;
  const box = caixa(faixa[0], faixa[1]);
  const larg = Math.max(1, Math.round((box.w / box.h) * ALTURA));
  const png = reduzir(box, larg, ALTURA);
  fs.writeFileSync(path.join(destino, `${nome}.png`), PNG.sync.write(png));
  cabos[nome] = medirCabo(box);
  console.log(`  weapons/${nome}.png  ${larg}x${ALTURA}  cabo em ${JSON.stringify(cabos[nome])}`);
});

const saidaTs = path.resolve('src/data/weaponGrips.ts');
fs.writeFileSync(
  saidaTs,
  `/**
 * Onde a MAO fecha em cada arma, em fracao do sprite.
 *
 * GERADO por tools/slice-armas-lateral.mjs — nao editar a mao.
 *
 * E o ponto em torno do qual a arma gira quando o jogador muda a mira. Cada
 * arma tem a empunhadura num lugar diferente (o revolver e curto, o fuzil tem
 * coronha atras), e prender todas pelo mesmo ponto deixaria umas adiantadas e
 * outras atrasadas na mao.
 */
export const WEAPON_GRIPS: Record<string, { x: number; y: number }> = ${JSON.stringify(
    cabos,
    null,
    2
  )};
`
);
console.log(`\n  src/data/weaponGrips.ts escrito com ${Object.keys(cabos).length} medidas.`);
