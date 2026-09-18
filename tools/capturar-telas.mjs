#!/usr/bin/env node
/**
 * Fotografa TODAS as telas do jogo em arquivo, no tamanho exato do alvo.
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
 * 852x393 nao e escolha: e o alvo do jogo, celular deitado.
 *
 * POR QUE FOI REESCRITA.
 *
 * A versao anterior procurava os botoes por texto solto (`text="Tecnologia"`)
 * e as abas por nome. Quando a marcacao mudou, ela parou de navegar e passou
 * a fotografar a tela que ja estava aberta — cinco arquivos com nomes
 * diferentes e bytes IDENTICOS, todos da mesma aba. Pior que nao medir e
 * medir errado achando que mediu.
 *
 * Agora ela: navega pelos botoes reais (`.icon-btn.labeled`), CONFERE que o
 * painel esperado ficou visivel, e grita quando duas fotos saem iguais.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const URL = process.env.URL ?? 'http://localhost:5173';
const SENHA = '1425';
const LARGURA = 852;
const ALTURA = 393;
const SAIDA = path.resolve('arte-bruta/conferencia');
fs.mkdirSync(SAIDA, { recursive: true });

/**
 * As telas, e como chegar em cada uma.
 *
 * `nav` e o rotulo do botao da barra de cima; `painel` e a classe que tem que
 * ficar visivel depois do clique — e essa conferencia que impede a ferramenta
 * de mentir. `aba` e a aba interna, quando existe.
 */
const TELAS = [
  { nome: 'hud', nav: null, painel: null },
  { nome: 'skills', nav: 'Skills', painel: '.panel-wrap.skillscreen, .panel-wrap.skilltree' },
  { nome: 'atributos', nav: 'Atributos', painel: '.panel-wrap' },
  { nome: 'guia', nav: 'Guia', painel: '.panel-wrap.journal' },
  { nome: 'tec-automacao', nav: 'Tecnologia', painel: '.panel-wrap.techscreen', aba: 'Automacao' },
  { nome: 'tec-pesquisa', nav: 'Tecnologia', painel: '.panel-wrap.techscreen', aba: 'Pesquisa' },
  { nome: 'tec-ferramentas', nav: 'Tecnologia', painel: '.panel-wrap.techscreen', aba: 'Ferramentas' },
  { nome: 'tec-construcao', nav: 'Tecnologia', painel: '.panel-wrap.techscreen', aba: 'Construcao' },
  { nome: 'tec-equipamento', nav: 'Tecnologia', painel: '.panel-wrap.techscreen', aba: 'Equipamento' },
  { nome: 'ajustes', nav: 'Ajustes', painel: '.panel-wrap' },
  { nome: 'mapa', abrir: 'mapa', painel: '.panel-wrap.mapscreen' },
];

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: LARGURA, height: ALTURA } });
pagina.on('pageerror', (e) => console.log('  [erro de pagina]', e.message));

await pagina.goto(URL, { waitUntil: 'networkidle' });
const campo = pagina.locator('#portao-senha');
if (await campo.count()) {
  await campo.fill(SENHA);
  await pagina.locator('#portao-entrar').click();
}
await pagina.waitForTimeout(2500);

// O prologo pausa o jogo. Dispara no elemento: clicar por coordenada erra,
// porque os cartoes de aviso cobrem o meio da tela e comem o ponteiro.
for (let i = 0; i < 80; i++) {
  const aberto = await pagina.evaluate(() => {
    const d = document.querySelector('.dialog.open');
    if (!d) return false;
    d.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return true;
  });
  if (!aberto) break;
  await pagina.waitForTimeout(90);
}

/** Fecha o que estiver aberto, para cada tela comecar do mesmo lugar. */
async function fecharTudo() {
  await pagina.keyboard.press('Escape');
  await pagina.waitForTimeout(200);
  await pagina.evaluate(() => {
    for (const b of document.querySelectorAll('.panel-close, .close, [class*=fechar]')) {
      if (b.offsetParent) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    }
  });
  await pagina.waitForTimeout(250);
}

/** Clica um botao da barra pelo rotulo, sem depender de seletor de classe. */
async function clicarNav(rotulo) {
  return pagina.evaluate((r) => {
    const alvos = [...document.querySelectorAll('button, [role=button], [class*=map], [class*=mapa], [class*=minimap]')];
    const b = alvos.find(
      (e) => e.offsetParent !== null && (e.textContent || '').trim().toLowerCase().startsWith(r.toLowerCase())
    );
    if (!b) return false;
    b.click();
    return true;
  }, rotulo);
}

/** Clica uma aba interna pelo texto, ignorando acento e caixa. */
async function clicarAba(rotulo) {
  return pagina.evaluate((r) => {
    // Compara so letras e numeros: as abas vem com um marcador na frente
    // ("\u25e6 AUTOMACAO"), entao igualdade exata nunca casava. E prefere o
    // alvo mais CURTO, para nao pegar o container que tambem contem a palavra.
    const limpa = (s) =>
      (s || '').normalize('NFD').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const alvo = limpa(r);
    const cand = [...document.querySelectorAll('button, [role=tab], [class*=aba], [class*=tab]')]
      .filter((e) => e.offsetParent !== null && limpa(e.textContent).includes(alvo))
      .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);
    if (!cand.length) return false;
    cand[0].click();
    return true;
  }, rotulo);
}

const hashes = new Map();
let problemas = 0;

for (const tela of TELAS) {
  await fecharTudo();
  /*
   * Algumas telas nao tem botao proprio na barra: o MAPA mora dentro do
   * minimapa e nem e um <button>. Para essas, a ferramenta pede ao jogo em
   * vez de cacar um alvo de clique — fotografar e o trabalho dela, nao
   * testar a navegacao do minimapa.
   */
  if (tela.abrir) {
    const foi = await pagina.evaluate((nome) => {
      const g = window.game;
      if (!g?.telas) return false;
      g.telas.abrir(nome, () => g.mapScreen.open());
      return true;
    }, tela.abrir);
    if (!foi) {
      console.log(`  FALHA "${tela.nome}": nao consegui abrir pelo jogo`);
      problemas++;
      continue;
    }
    await pagina.waitForTimeout(600);
  }
  if (tela.nav) {
    if (!(await clicarNav(tela.nav))) {
      console.log(`  FALHA nao achei o botao "${tela.nav}" (${tela.nome})`);
      problemas++;
      continue;
    }
    await pagina.waitForTimeout(600);
  }
  if (tela.aba) {
    if (!(await clicarAba(tela.aba))) {
      console.log(`  FALHA nao achei a aba "${tela.aba}" (${tela.nome})`);
      problemas++;
      continue;
    }
    await pagina.waitForTimeout(500);
  }
  // A conferencia que faltava: o painel esperado abriu mesmo?
  if (tela.painel) {
    const visivel = await pagina.evaluate((sel) => {
      for (const e of document.querySelectorAll(sel)) if (e.offsetParent !== null) return true;
      return false;
    }, tela.painel);
    if (!visivel) {
      console.log(`  FALHA "${tela.nome}": o painel ${tela.painel} nao ficou visivel`);
      problemas++;
      continue;
    }
  }

  const arquivo = path.join(SAIDA, `tela-${tela.nome}.png`);
  await pagina.screenshot({ path: arquivo });
  const h = crypto.createHash('md5').update(fs.readFileSync(arquivo)).digest('hex').slice(0, 8);
  if (hashes.has(h)) {
    console.log(`  FALHA "${tela.nome}" saiu IDENTICA a "${hashes.get(h)}" — a navegacao nao levou a lugar nenhum`);
    problemas++;
  } else {
    hashes.set(h, tela.nome);
    console.log(`  tela-${tela.nome}.png`);
  }
}

console.log(problemas === 0 ? '\ntodas as telas fotografadas.\n' : `\n${problemas} problema(s) de navegacao.\n`);
await navegador.close();
process.exit(problemas === 0 ? 0 : 1);
