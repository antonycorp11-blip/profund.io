#!/usr/bin/env node
/**
 * Acusa regra de CSS que NUNCA vale, por perder em especificidade.
 *
 *   npm run check-css-morto   (roda dentro do `npm run verify`)
 *
 * Existe por um estrago concreto: eu passei duas rodadas escrevendo
 * `.eq-icon img { width: 58px }` no fim da folha e vendo a tela nao mudar.
 * A regra CARREGAVA — estava entre as 993 da folha — mas quem ganha e
 * `.eq-card > .eq-icon img { width: 46px }`, com especificidade maior, em
 * qualquer posicao do arquivo. Cascata nao vence especificidade.
 *
 * O pior nao foi a regra morta: foi eu nao ter como distinguir "nao apliquei"
 * de "apliquei e nao adiantou". As duas parecem iguais numa captura de tela, e
 * eu tratei as duas como a segunda — concluindo que a mudanca nao resolvia
 * quando ela nem tinha acontecido.
 *
 * A regra que ele testa e restrita de proposito, para nao dar alarme falso:
 * so acusa quando um seletor e SUFIXO de outro (`.eq-icon img` dentro de
 * `.eq-card > .eq-icon img`). Nesse caso o segundo casa um subconjunto do
 * primeiro e sempre ganha nele.
 */
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve('src/style.css'), 'utf8');

/** Especificidade aproximada: (ids, classes/atributos/pseudo, elementos). */
function peso(sel) {
  const ids = (sel.match(/#[\w-]+/g) ?? []).length;
  const cls = (sel.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g) ?? []).length;
  const els = (sel.match(/(^|[\s>+~])[a-z][\w-]*/gi) ?? []).length;
  return ids * 10000 + cls * 100 + els;
}

/* Sem `@media`: la dentro a regra pode valer so numa largura, e comparar com
   uma regra de fora daria alarme falso. */
const semMedia = css.replace(/@media[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');

const regras = [];
for (const m of semMedia.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
  const sel = m[1].trim();
  if (!sel || sel.startsWith('@') || sel.startsWith('/*')) continue;
  const props = new Map();
  for (const d of m[2].split(';')) {
    const [p, v] = d.split(':');
    if (!p || !v) continue;
    props.set(p.trim(), v.trim());
  }
  for (const parte of sel.split(',')) {
    const s = parte.trim();
    if (s) regras.push({ sel: s, peso: peso(s), props, linha: semMedia.slice(0, m.index).split('\n').length });
  }
}

/*
 * LIMITE CONHECIDO: este verificador e ESTATICO, e por isso exagera.
 *
 * Ele acusa qualquer regra `b` mais especifica que termine no mesmo seletor
 * de `a`. Isso pega o caso real que ele veio pegar — uma regra somada no fim
 * do arquivo que perde para outra de dois niveis — mas tambem pega o par
 * legitimo BASE + ESTADO:
 *
 *   .hub-conta            { color: fraca }   <- vale para os normais
 *   .hub-caminho.pode .hub-conta { color: luz }  <- so para os acesos
 *
 * Aqui a base NAO e morta: ela pinta todos os que nao estao no estado. Um
 * aviso desses e falso, e consertar CSS correto por causa dele piora o
 * arquivo.
 *
 * A regra para quem ler um aviso daqui: se o seletor mais forte adiciona um
 * ESTADO (uma classe que entra e sai: .ativa, .pode, .dormindo, .on,
 * :disabled), o aviso e falso. Se ele so adiciona CONTEXTO fixo (um ancestral
 * que sempre existe), o aviso e verdadeiro.
 *
 * Para saber ao certo num caso especifico, pergunte ao vivo:
 *   npm run quem-ganha "<seletor>" <propriedade>
 */
const mortas = [];
for (const a of regras) {
  for (const b of regras) {
    if (a === b || b.peso <= a.peso) continue;
    /*
     * b so ganha SEMPRE de a quando b termina com a E a emenda cai numa
     * fronteira de verdade.
     *
     * Sem a fronteira, `.journal-body` "termina com" `body` como TEXTO e o
     * verificador acusava `body { padding: 0 }` como morta por causa de uma
     * classe que nao tem nada a ver. O caractere logo antes da emenda tem que
     * ser um combinador ou espaco — ai `b` e mesmo um caso particular de `a`.
     */
    if (!b.sel.endsWith(a.sel)) continue;
    const antes = b.sel[b.sel.length - a.sel.length - 1];
    if (!antes || !' >+~'.includes(antes)) continue;
    for (const [prop, valor] of a.props) {
      if (!b.props.has(prop) || b.props.get(prop) === valor) continue;
      mortas.push(
        `linha ${a.linha}: \`${a.sel} { ${prop}: ${valor} }\` nunca vale.\n` +
          `    \`${b.sel}\` (linha ${b.linha}) tem especificidade maior e define ` +
          `${prop}: ${b.props.get(prop)}.\n` +
          `    Edite a regra de cima, no lugar dela — acrescentar no fim do arquivo nao ganha.`
      );
    }
  }
}

/*
 * AINDA NAO QUEBRA O BUILD.
 *
 * A primeira passagem achou 63 regras mortas — todas anteriores a este
 * verificador. Fazer o build falhar com 63 pendencias travaria qualquer
 * trabalho, e um travao que se ignora nao e travao.
 *
 * Ele vira quebra-build quando a lista chegar a zero, como o `check-estilo`
 * fez: aquele nasceu com zero violacoes e por isso pode ser duro desde o
 * primeiro dia.
 */
if (mortas.length) {
  console.error('\n  CSS MORTO: regra escrita que nunca chega na tela\n');
  for (const m of [...new Set(mortas)]) console.error(`  ✗ ${m}\n`);
  console.error(`  ${new Set(mortas).size} regra(s). Ver tools/check-css-morto.mjs.\n`);
}
console.log('  css: nenhuma regra morta por especificidade.');
