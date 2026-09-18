#!/usr/bin/env node
/**
 * Fotografa as telas do jogo em arquivo, no tamanho exato do alvo.
 *
 *   npm run capturar-telas          (o servidor de dev precisa estar de pe)
 *
 * Saida: arte-bruta/conferencia/tela-<nome>.png
 *
 * POR QUE PRECISAVA EXISTIR.
 *
 * Eu conseguia OLHAR uma captura, mas nao conseguia ABRIR uma. Tudo que eu
 * media das telas vinha do DOM — caixa de elemento, tamanho de fonte — e isso
 * e cego justamente para onde mora a diferenca que o jogador enxerga: cor,
 * contraste, peso de borda, textura.
 *
 * Com a tela em arquivo, ela passa a ser medivel do mesmo jeito que a
 * referencia ja era. E a mesma disciplina que consertou os sprites: parar de
 * julgar por impressao e comparar numero com numero.
 *
 * 852x393 nao e escolha: e o alvo do jogo, celular deitado. A referencia vem
 * em 1847x852, que e exatamente a mesma proporcao (2,17) em outra escala.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = process.env.URL ?? 'http://localhost:5173';
const SENHA = '1425';
const LARGURA = 852;
const ALTURA = 393;
const SAIDA = path.resolve('arte-bruta/conferencia');

/**
 * As telas, e como chegar em cada uma.
 *
 * `nav` e o botao da barra de cima; `aba` e a aba interna, quando existe. Sao
 * descritas por TEXTO e nao por seletor de classe porque a marcacao muda toda
 * hora enquanto as telas estao sendo refeitas — o texto e o que sobrevive.
 */
const TELAS = [
  { nome: 'equipamento', nav: 'Tecnologia', aba: 'Equipamento' },
  { nome: 'automacao', nav: 'Tecnologia', aba: 'Automacao' },
  { nome: 'pesquisa', nav: 'Tecnologia', aba: 'Pesquisa' },
  { nome: 'construcao', nav: 'Tecnologia', aba: 'Construcao' },
  { nome: 'atributos', nav: 'Atributos' },
  { nome: 'skills', nav: 'Skills' },
  { nome: 'guia', nav: 'Guia' },
];

/** Clica no primeiro elemento cujo texto bate exatamente. */
async function clicarPorTexto(page, texto) {
  const alvo = page.locator(`text="${texto}"`).first();
  if ((await alvo.count()) === 0) return false;
  await alvo.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(500);
  return true;
}

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: LARGURA, height: ALTURA } });

await pagina.goto(URL, { waitUntil: 'networkidle' });

// O portao, quando estiver ligado: sem passar por ele nao ha o que fotografar.
const campo = pagina.locator('#portao-senha');
if (await campo.count()) {
  await campo.fill(SENHA);
  await pagina.locator('#portao-entrar').click();
}
await pagina.waitForTimeout(2500);

fs.mkdirSync(SAIDA, { recursive: true });
for (const tela of TELAS) {
  // Volta ao jogo antes de cada uma: a barra de cima so existe fora dos paineis.
  await pagina.keyboard.press('Escape');
  await pagina.waitForTimeout(400);
  if (!(await clicarPorTexto(pagina, tela.nav))) {
    console.log(`  (nao achei "${tela.nav}", pulando ${tela.nome})`);
    continue;
  }
  if (tela.aba && !(await clicarPorTexto(pagina, tela.aba))) {
    console.log(`  (nao achei a aba "${tela.aba}" em ${tela.nome})`);
  }
  await pagina.waitForTimeout(700);
  const destino = path.join(SAIDA, `tela-${tela.nome}.png`);
  await pagina.screenshot({ path: destino });
  console.log(`  ${path.relative(process.cwd(), destino)}`);
}

await navegador.close();
