#!/usr/bin/env node
/**
 * Resolve o arco das habilidades em volta do MINERAR, para cada quantidade.
 *
 *   npm run arco
 *
 * POR QUE ISTO E UM PROGRAMA E NAO OITO NUMEROS NO CSS.
 *
 * O jogador tem UMA, DUAS, TRES ou QUATRO habilidades no cinto, e os slots
 * vazios ficam `hidden`. Um arco de quatro fatias fixas, com tres botoes
 * visiveis, nao e um arco de tres — e tres quartos de um arco, com a quarta
 * fatia faltando na ponta. Foi exatamente o que apareceu na tela: os botoes
 * subindo em escada e o arco morrendo no meio.
 *
 * Entao o arco se resolve UMA VEZ POR QUANTIDADE, e a geometria de entrada
 * (MINERAR, PULAR, recolher, tamanho da skill) e LIDA do proprio CSS — nunca
 * digitada aqui. Se o MINERAR mudar de tamanho ou de canto, este programa
 * responde outra coisa, que e o que se quer.
 */
import fs from 'node:fs';

const CSS = 'src/ui/expedition.css';
const css = fs.readFileSync(CSS, 'utf8');
const bloco = (sel) => {
  const i = css.indexOf(`${sel} {`);
  if (i < 0) throw new Error(`seletor ausente: ${sel}`);
  return css.slice(i, css.indexOf('}', i));
};
const px = (t, p) => {
  const m = t.match(new RegExp(`(?:[;{]\\s*)${p}:\\s*(\\d+)px`));
  if (!m) throw new Error(`medida ausente: ${p}`);
  return Number(m[1]);
};
const circulo = (sel) => {
  const b = bloco(sel);
  const d = px(b, 'width');
  return { x: px(b, 'right') + d / 2, y: px(b, 'bottom') + d / 2, r: d / 2 };
};

const acao = circulo('body .touch-btn.big');
const pular = circulo('body .touch-btn.medium');
const rs = px(bloco('body .touch-skills .touch-btn.skill'), 'width') / 2;
const fb = bloco('body .touch-fold');
const fd = px(fb, 'width');
const fold = {
  x: Number(fb.match(/right: calc\(var\(--safe-r\) \+ (\d+)px\)/)[1]) + fd / 2,
  y: Number(fb.match(/bottom: calc\(var\(--safe-b\) \+ (\d+)px\)/)[1]) + fd / 2,
  r: fd / 2,
};

/** Folga entre dois controles vizinhos. Abaixo disso eles se encostam. */
const FOLGA = 4;
/** O arco tem de LER como arco: nem colado, nem satelite. */
const RAIO_MIN = acao.r + rs + 6;
const RAIO_MAX = acao.r + rs + 30;

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function resolver(n) {
  let melhor = null;
  for (let R = RAIO_MIN; R <= RAIO_MAX; R += 0.5) {
    for (let a0 = 0; a0 <= 80; a0 += 1) {
      // Com um botao so nao ha varredura: ele fica no meio do espaco livre.
      for (let a1 = n === 1 ? a0 : a0 + 20; a1 <= 125; a1 += 1) {
        /*
         * ARREDONDA ANTES DE CONFERIR.
         *
         * O CSS so aceita pixel inteiro, entao o que vai para a tela e o
         * valor arredondado — nao o ideal. A primeira versao validava o ideal
         * e emitia o arredondado: com um botao so, o solver escolhia o raio
         * minimo exato (68) e o arredondamento o empurrava para 67,8, meio
         * pixel abaixo do permitido. A sonda reprovou a saida do proprio
         * solver, e ela estava certa.
         *
         * Conferir o que sai, e nao o que se pretendia, e a mesma regra das
         * outras sondas deste projeto.
         */
        const ps = Array.from({ length: n }, (_, i) => {
          const t = n === 1 ? 0.5 : i / (n - 1);
          const a = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
          const right = Math.round(acao.x + R * Math.cos(a) - rs);
          const bottom = Math.round(acao.y + R * Math.sin(a) - rs);
          return { x: right + rs, y: bottom + rs, right, bottom };
        });
        // O raio efetivo, DEPOIS do arredondamento, precisa caber na faixa.
        const raios = ps.map((p) => Math.hypot(p.x - acao.x, p.y - acao.y));
        if (raios.some((r) => r < RAIO_MIN || r > RAIO_MAX)) continue;
        const medio = raios.reduce((t, r) => t + r, 0) / raios.length;
        if (raios.some((r) => Math.abs(r - medio) > 2)) continue;
        let ok = true;
        for (const p of ps) {
          if (p.x < rs + 2 || p.y < rs + 2) ok = false;
          if (dist(p, pular) < pular.r + rs + FOLGA) ok = false;
          if (dist(p, fold) < fold.r + rs + FOLGA) ok = false;
        }
        for (let i = 0; i < n && ok; i++) {
          for (let j = i + 1; j < n; j++) {
            if (dist(ps[i], ps[j]) < rs * 2 + FOLGA) ok = false;
          }
        }
        if (!ok) continue;
        /*
         * Entre os arcos que cabem, prefere o mais COLADO e o mais FECHADO.
         * Colado porque o botao precisa parecer parte do MINERAR; fechado
         * porque varredura larga volta a parecer fileira.
         */
        const nota = R * 2 + (a1 - a0);
        if (!melhor || nota < melhor.nota) melhor = { R, a0, a1, ps, nota };
        if (n === 1) break;
      }
    }
  }
  return melhor;
}

console.log(`MINERAR ${JSON.stringify(acao)}  PULAR ${JSON.stringify(pular)}`);
console.log(`recolher ${JSON.stringify(fold)}  raio da skill ${rs}\n`);

const linhas = [];
for (let n = 1; n <= 4; n++) {
  const s = resolver(n);
  if (!s) {
    console.log(`n=${n}: SEM SOLUCAO — o canto nao comporta ${n} habilidades`);
    process.exitCode = 1;
    continue;
  }
  console.log(`n=${n}: raio ${s.R}, de ${s.a0}° a ${s.a1}°`);
  linhas.push(`/* ${n} habilidade${n > 1 ? 's' : ''}: raio ${s.R}px, ${s.a0}° a ${s.a1}° */`);
  s.ps.forEach((p, i) => {
    const { right, bottom } = p;
    console.log(`     skill${i + 1}  right ${right}  bottom ${bottom}`);
    linhas.push(
      `body .touch-skills[data-n="${n}"] #btn-skill${i + 1} { right: ${right}px !important; bottom: ${bottom}px !important; }`
    );
  });
}

console.log('\n--- CSS ---\n');
console.log(linhas.join('\n'));
