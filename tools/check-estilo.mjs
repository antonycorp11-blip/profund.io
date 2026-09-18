#!/usr/bin/env node
/**
 * Trava os erros de estilo que ja voltaram mais de uma vez.
 *
 *   npm run check-estilo   (roda dentro do `npm run verify`)
 *
 * Nao e lint de gosto: cada regra aqui existe porque o erro correspondente JA
 * FOI CORRIGIDO E VOLTOU. Promessa de tomar cuidado nao impediu nenhuma das
 * reincidencias; uma regra que quebra o build impede.
 *
 * Regra para acrescentar aqui: o defeito escapou para o jogador, foi
 * corrigido, e voltou depois. Defeito novo nao entra — entra quando reincide.
 */
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve('src/style.css'), 'utf8');
const linhas = css.split('\n');

const problemas = [];

/** Onde cada linha esta, para a mensagem apontar o lugar. */
function acha(regex) {
  const achados = [];
  linhas.forEach((l, i) => {
    if (regex.test(l)) achados.push({ n: i + 1, txt: l.trim() });
  });
  return achados;
}

/*
 * 1. `painel.png` com `fill`.
 *
 * O miolo dessa arte e couro com rebite. Com `fill`, o `border-image` repete o
 * miolo pelo interior inteiro e a tela vira uma parede de tachas — inquieta,
 * escura, e o jogador descreveu como "da ate medo". Corrigido uma vez no
 * painel principal e reintroduzido logo depois em tres blocos novos, porque eu
 * escrevi a linha de novo sem lembrar.
 *
 * Moldura pintada vai no CONTORNO. O miolo e fundo liso.
 */
for (const { n, txt } of acha(/border-image:[^;]*painel[^;]*\bfill\b/)) {
  problemas.push(
    `linha ${n}: \`painel.png\` com \`fill\` — o miolo dessa arte e couro com ` +
      `rebite e vira parede de tachas.\n    ${txt}\n    Tire o \`fill\` e ponha um ` +
      `fundo liso no elemento.`
  );
}

/*
 * 2. `.btn` base com largura cheia.
 *
 * Dentro de uma LINHA, um botao `width: 100%` exige a largura inteira do pai e
 * esmaga o vizinho. Deu tres sintomas diferentes em telas diferentes — barras
 * no lugar de botoes, abas comidas, paragrafo espremido numa palavra por linha
 * — e eu remendei os dois primeiros no lugar em vez de olhar a base.
 *
 * Quem quer largura cheia pede no proprio seletor.
 */
{
  const i = linhas.findIndex((l) => /^\.btn\s*\{/.test(l.trim()));
  if (i >= 0) {
    const bloco = linhas.slice(i, i + 16).join('\n');
    if (/width:\s*100%/.test(bloco)) {
      problemas.push(
        `linha ${i + 1}: \`.btn\` base com \`width: 100%\` — dentro de uma linha ` +
          `ele esmaga o vizinho.\n    Use \`width: auto\` aqui e peca largura cheia ` +
          `no seletor de quem precisa.`
      );
    }
  }
}

/*
 * 3. Botao de capsula com fundo esticado.
 *
 * Tentei trocar `border-image` por fundo esticado achando que a capsula sofria
 * com a borda pequena. Sofria o oposto: esticado, um botao largo vira uma
 * bolha achatada atravessando a tela. `border-image` desenha as pontas no
 * tamanho da BORDA, que e o que mantem botao de 50 px e de 890 px iguais.
 */
// A ordem dentro do `background` e livre (`center / 100% 100% url(...)` ou
// `url(...) center / 100% 100%`), entao a regra testa os dois pedacos sem
// exigir sequencia — a primeira versao dela deixou o erro plantado passar.
for (const { n, txt } of acha(
  /background:[^;]*(chassi\/(botao|aba)[^;]*100% 100%|100% 100%[^;]*chassi\/(botao|aba))/
)) {
  problemas.push(
    `linha ${n}: botao/aba com fundo esticado — largura grande vira bolha ` +
      `achatada.\n    ${txt}\n    Use \`border-image\`, que desenha as pontas no ` +
      `tamanho da borda.`
  );
}

if (problemas.length > 0) {
  console.error('\n  ESTILO: erros que ja voltaram antes\n');
  for (const p of problemas) console.error(`  ✗ ${p}\n`);
  console.error(`  ${problemas.length} problema(s). Ver tools/check-estilo.mjs.\n`);
  process.exit(1);
}

console.log('  estilo: nenhuma reincidencia.');
