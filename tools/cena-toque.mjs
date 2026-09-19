#!/usr/bin/env node
/**
 * Sonda de TOQUE da cutscene: da para avancar a cena com o dedo?
 *
 *   npm run dev            (noutro terminal)
 *   npm run cena-toque
 *
 * POR QUE PRECISA DE NAVEGADOR DE VERDADE.
 *
 * Este e o unico bug do projeto que nao da para pegar em Node: ele nao esta
 * no dado nem na geometria, esta na diferenca entre um clique de mouse e um
 * toque de dedo. O relato foi "aparecia clique para continuar mas nao
 * continuava" — no computador funcionava, e essa diferenca E o bug.
 *
 * `click` em tela de toque nao e evento de primeira classe: e um evento de
 * COMPATIBILIDADE que o navegador sintetiza depois de decidir que aquele
 * toque nao era rolagem, pinca nem duplo toque para dar zoom. Quando decide
 * que era, o clique nunca nasce — e a cena fica parada com o aviso na tela.
 *
 * Pior: o PULAR tambem ouvia `click`. Quem travava nao tinha saida a nao ser
 * recarregar a pagina. Cutscene sem saida e a primeira coisa que um testador
 * ve do jogo.
 *
 * Aqui o Chromium sobe com `hasTouch`, e cada passo e feito com `tap()` —
 * toque de verdade, nao clique disfarcado.
 */
import fs from 'node:fs';
import { chromium, devices } from 'playwright';

const URL = process.env.URL ?? 'http://localhost:5173';
let falhas = 0;
const ok = (cond, titulo, detalhe = '') => {
  if (cond) console.log(`  ok   ${titulo}`);
  else {
    falhas++;
    console.log(`  FALHA ${titulo}${detalhe ? ` — ${detalhe}` : ''}`);
  }
  return cond;
};

const navegador = await chromium.launch();
/* Celular deitado com toque: e o alvo do jogo (852x393) e o aparelho em que o
 * bug apareceu. Emular so o tamanho nao bastaria — o que importa aqui e
 * `hasTouch`. */
const ctx = await navegador.newContext({
  ...devices['Pixel 7 landscape'],
  viewport: { width: 852, height: 393 },
  hasTouch: true,
  isMobile: true,
});
/*
 * O PORTAO PRECISA JA ESTAR ABERTO.
 *
 * A primeira versao desta sonda deu "timeout esperando a cutscene" e o
 * servidor estava de pe o tempo todo — o que ela via era a tela de senha. Um
 * navegador novo nao tem o `localStorage` deste aparelho, e o jogo nao comeca
 * antes de alguem digitar.
 *
 * A marca de acesso e lida do proprio Portao.ts para nao virar mais um numero
 * digitado aqui. A senha nao passa por este arquivo.
 */
const portao = fs.readFileSync('src/ui/Portao.ts', 'utf8');
const chave = portao.match(/const CHAVE = '([^']+)'/)?.[1];
const senha = portao.match(/const SENHA = (\d+)/)?.[1];
if (!chave || !senha) {
  console.log('  FALHA nao consegui ler a marca de acesso de src/ui/Portao.ts');
  process.exit(1);
}
await ctx.addInitScript(
  ([k, v]) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* navegador sem storage: a sonda falha adiante, com mensagem melhor */
    }
  },
  [chave, senha]
);

const pg = await ctx.newPage();

console.log('\nA CENA AVANCA COM O DEDO?');
try {
  await pg.goto(`${URL}/?cena=prologo`, { waitUntil: 'networkidle', timeout: 30000 });
  await pg.waitForSelector('.cutscene:not([hidden])', { timeout: 20000 });

  const fala = () => pg.$eval('.cs-texto', (e) => e.textContent ?? '');
  const primeira = await fala();
  ok(primeira.length > 0, 'a cena abriu com uma fala na tela', `texto: "${primeira}"`);

  /*
   * DOIS TOQUES POR FALA, e isso e o desenho e nao um defeito: o primeiro
   * completa a digitacao, o segundo avanca. Quem toca com pressa quer LER
   * logo, nao perder a linha.
   *
   * A primeira versao desta sonda cobrava "um toque muda o texto" e reprovava
   * o comportamento correto. Sonda que exige o contrario do desenho e pior que
   * sonda nenhuma: ela empurra o conserto na direcao errada.
   */
  const falas = [];
  let anterior = primeira;
  for (let i = 0; i < 10; i++) {
    await pg.tap('.cutscene');
    await pg.waitForTimeout(220);
    const agora = await fala();
    if (agora !== anterior && !agora.startsWith(anterior) && !anterior.startsWith(agora)) {
      falas.push(agora);
    }
    anterior = agora;
  }
  ok(
    falas.length >= 3,
    'a cena caminha pelas falas, toque apos toque',
    `${falas.length} falas novas em 10 toques (esperado ~5)`
  );

  console.log('\nO PULAR TEM SAIDA PELO DEDO?');
  await pg.tap('.cs-pular');
  await pg.waitForTimeout(800);
  const escondida = await pg.$eval('.cutscene', (e) => e.hidden);
  ok(escondida, 'o PULAR fecha a cena no toque', 'sem isto, travar na cena nao tem saida');
} catch (e) {
  falhas++;
  console.log(`  FALHA a sonda nao conseguiu rodar — ${e.message}`);
  console.log('       (o servidor esta de pe? `npm run dev` noutro terminal)');
}

await navegador.close();
console.log(falhas === 0 ? '\na cena responde ao dedo.\n' : `\n${falhas} falha(s).\n`);
process.exit(falhas > 0 ? 1 : 0);
