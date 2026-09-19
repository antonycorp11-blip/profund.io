#!/usr/bin/env node
/**
 * Mede o tamanho REAL de tudo que se toca, tela por tela.
 *
 *   npm run medir-toque
 *
 * POR QUE PRECISAVA EXISTIR.
 *
 * "Algumas coisas no HUD estao pequenas, como os botoes de fechar e os de
 * categoria" — relatado mais de uma vez, e eu nunca tinha MEDIDO. Dois
 * enganos tornam isso invisivel para quem escreve o CSS:
 *
 * 1. as telas vivem num espaco virtual reduzido por `zoom`, entao um botao
 *    declarado com 26 px chega na tela com 15;
 * 2. no monitor, o ponteiro acerta um alvo de 15 px sem esforco. O polegar
 *    nao acerta.
 *
 * O corte usado aqui e 30 px de lado menor. Nao e o numero das diretrizes
 * (44), e nao finjo que e: 44 px reais num painel de 338 px de altura
 * caberiam seis botoes e mais nada. 30 e o maior alvo que esta tela comporta
 * sem virar outra tela — e ja e o dobro do que havia.
 */
import { chromium } from 'playwright';

const URL = process.env.URL ?? 'http://localhost:5173';
const MINIMO = 30;

const nav = await chromium.launch();
const p = await nav.newPage({ viewport: { width: 852, height: 393 } });
await p.goto(URL, { waitUntil: 'networkidle' });
const campo = p.locator('#portao-senha');
if (await campo.count()) {
  await campo.fill('1425');
  await p.locator('#portao-entrar').click();
}
await p.waitForTimeout(2600);
for (let i = 0; i < 90; i++) {
  const a = await p.evaluate(() => {
    const d = document.querySelector('.dialog.open');
    if (!d) return false;
    d.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return true;
  });
  if (!a) break;
  await p.waitForTimeout(80);
}
await p.evaluate(() => {
  const g = window.game;
  g.tutorial?.fechar();
  g.stock.money = 99999;
});

const telas = [
  ['hud', null, null],
  ['tecnologia', 'tecnologia:techScreen', 'Automacao'],
  ['equipamento', 'tecnologia:techScreen', 'Equipamento'],
  ['pesquisa', 'tecnologia:techScreen', 'Pesquisa'],
  ['atributos', 'atributos:skillUI', null],
  ['skills', 'skills:activeUI', null],
  ['guia', 'guia:journalUI', null],
  ['mapa', 'mapa:mapScreen', null],
  ['ajustes', 'ajustes:panels', null],
];

let total = 0;
let pequenos = 0;
for (const [nome, abrir, aba] of telas) {
  await p.evaluate(() => window.game.telas.fecharTudo());
  await p.waitForTimeout(220);
  if (abrir) {
    await p.evaluate(([n, a]) => {
      const g = window.game;
      if (n === 'ajustes') g.telas.abrir(n, () => g.panels.open('settings'));
      else g.telas.abrir(n, () => g[a].open());
    }, abrir.split(':'));
    await p.waitForTimeout(420);
  }
  if (aba) {
    await p.evaluate((r) => {
      const limpa = (s) => (s || '').normalize('NFD').replace(/[^a-z0-9]/gi, '').toLowerCase();
      const c = [...document.querySelectorAll('button')]
        .filter((e) => e.offsetParent && limpa(e.textContent).includes(limpa(r)))
        .sort((a, b) => a.textContent.length - b.textContent.length);
      c[0]?.click();
    }, aba);
    await p.waitForTimeout(500);
  }
  const achados = await p.evaluate((min) => {
    const out = [];
    for (const e of document.querySelectorAll('button, [role=button], [data-slot], [data-tab]')) {
      if (!e.offsetParent) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const lado = Math.min(r.width, r.height);
      out.push({
        cls: (e.className || '').toString().split(' ')[0] || e.tagName,
        txt: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18),
        w: Math.round(r.width),
        h: Math.round(r.height),
        lado: Math.round(lado),
        pequeno: lado < min,
      });
    }
    return out;
  }, MINIMO);
  const ruins = achados.filter((a) => a.pequeno);
  total += achados.length;
  pequenos += ruins.length;
  console.log(`\n${nome.toUpperCase()}  ${achados.length} alvos, ${ruins.length} abaixo de ${MINIMO}px`);
  const vistos = new Set();
  for (const a of ruins.sort((x, y) => x.lado - y.lado)) {
    const k = a.cls + a.lado;
    if (vistos.has(k)) continue;
    vistos.add(k);
    console.log(`   ${String(a.lado).padStart(3)}px  .${a.cls.padEnd(18)} ${a.w}x${a.h}  "${a.txt}"`);
  }
}
console.log(`\n${pequenos} de ${total} alvos abaixo de ${MINIMO}px.\n`);
await nav.close();
