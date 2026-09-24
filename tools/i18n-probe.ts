/*
 * Sonda da traducao.
 *
 *   npm run i18n
 *
 * O jogo traduz na SAIDA (ver /src/i18n/i18n.ts): um dicionario de frase
 * inteira e moldes com `{0}`. Duas coisas quebram isso sem erro nenhum:
 *  - traducao com placeholder diferente da chave ("Faltam {0} m" -> "m left")
 *    some com o numero na tela;
 *  - molde que o motor nao reconhece cai de volta no portugues.
 * Aqui cada molde e montado com valores de teste e passa pelo `t()` de
 * verdade. Frase nova sem traducao nao reprova — e aviso, com a lista em
 * node_modules/.cache/i18n-pendentes.json (`npm run i18n-extrair`).
 */
import EN from '../src/i18n/en.json';
import { t, idioma } from '../src/i18n/i18n';
import { execSync } from 'node:child_process';

let falhas = 0;
const ok = (cond: boolean, titulo: string, detalhe = ''): boolean => {
  if (!cond) {
    falhas++;
    console.log(`  FALHA ${titulo}${detalhe ? ` — ${detalhe}` : ''}`);
  }
  return cond;
};

const dic = EN as Record<string, string>;
const marcas = (s: string) => (s.match(/\{\d+\}/g) ?? []).sort().join(',');

ok(idioma === 'en', 'a sonda roda em ingles', `idioma = ${idioma}`);

let conferidos = 0;
for (const [pt, en] of Object.entries(dic)) {
  ok(marcas(pt) === marcas(en), `"${pt}": mesmos placeholders na traducao`, `"${en}"`);
  // Frase inteira: t() devolve a traducao.
  if (!/\{\d+\}/.test(pt)) {
    ok(t(pt) === en, `"${pt}" traduz`, `saiu "${t(pt)}"`);
    conferidos++;
    continue;
  }
  // Molde: preenche com valores que o dicionario nao conhece, e confere que
  // eles aparecem no lugar certo da frase em ingles.
  const letras = pt.replace(/\{\d+\}/g, '').replace(/[^A-Za-zÀ-ú]/g, '').length;
  if (letras < 3) continue; // generico demais: o motor nao usa (ver i18n.ts)
  const valor = (n: string) => `Q${n}Z`;
  const entrada = pt.replace(/\{(\d+)\}/g, (_, n) => valor(n));
  const esperado = en.replace(/\{(\d+)\}/g, (_, n) => valor(n));
  // Dois moldes podem casar a mesma entrada; vale o que o motor escolhe, desde
  // que ele traduza e mantenha os valores.
  const saiu = t(entrada);
  ok(saiu !== entrada || entrada === esperado, `molde "${pt}" traduz`, `saiu "${saiu}"`);
  for (const n of pt.match(/\{(\d+)\}/g) ?? []) {
    const v = valor(n.slice(1, -1));
    ok(saiu.includes(v), `molde "${pt}" mantem ${n}`, `saiu "${saiu}", esperado "${esperado}"`);
  }
  conferidos++;
}

// Caixa alta e texto composto: os dois jeitos que a UI mais monta frase.
ok(t('BOT SIMPLES') === 'SIMPLE BOT', 'caixa alta acha a chave em caixa normal', t('BOT SIMPLES'));
ok(t('O Acordo: Conclua a cota semanal.') === 'The Deal: Complete the weekly quota.', 'titulo: etapa traduz os dois lados', t('O Acordo: Conclua a cota semanal.'));
ok(t('Falar com Jonas') === 'Talk to Jonas', 'molde com nome proprio', t('Falar com Jonas'));

const saida = execSync('node tools/i18n-extrair.mjs', { encoding: 'utf8' }).trim();
const pend = Number(/(\d+) pendentes/.exec(saida)?.[1] ?? 0);
if (pend > 0) console.log(`  aviso  ${saida}`);

console.log(falhas === 0 ? `i18n: ${conferidos} frases e moldes conferidos${pend ? `, ${pend} pendente(s)` : ''}.` : `\n${falhas} falha(s).`);
process.exit(falhas > 0 ? 1 : 0);
