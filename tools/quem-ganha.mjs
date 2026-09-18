#!/usr/bin/env node
/**
 * Diz QUAL regra de CSS esta vencendo numa propriedade, e quais perderam.
 *
 *   node tools/quem-ganha.mjs ".tech-card" background-color border-radius
 *
 * POR QUE PRECISAVA EXISTIR.
 *
 * Esta folha tem mais de 9000 linhas e camadas de correcoes acumuladas. Mais
 * de uma vez eu escrevi uma regra nova, medi, vi que nada mudou, e sai
 * empilhando OUTRA regra por cima — que tambem perdia. A causa era sempre a
 * mesma: especificidade, nao ordem. Uma regra antiga com um seletor de tres
 * niveis vence qualquer coisa somada no fim do arquivo.
 *
 * Adivinhar isso custa uma rodada inteira de build e captura por tentativa.
 * Perguntar custa dois segundos.
 */
import { chromium } from 'playwright';

const alvo = process.argv[2];
const props = process.argv.slice(3);
if (!alvo || !props.length) {
  console.log('uso: node tools/quem-ganha.mjs "<seletor>" <prop> [prop...]');
  process.exit(1);
}
const URL = process.env.URL ?? 'http://localhost:5173';
const ABRIR = process.env.ABRIR ?? '';
const ABA = process.env.ABA ?? '';

const nav = await chromium.launch();
const p = await nav.newPage({ viewport: { width: 852, height: 393 } });
await p.goto(URL, { waitUntil: 'networkidle' });
const campo = p.locator('#portao-senha');
if (await campo.count()) {
  await campo.fill('1425');
  await p.locator('#portao-entrar').click();
}
await p.waitForTimeout(2500);
for (let i = 0; i < 80; i++) {
  const a = await p.evaluate(() => {
    const d = document.querySelector('.dialog.open');
    if (!d) return false;
    d.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return true;
  });
  if (!a) break;
  await p.waitForTimeout(90);
}
if (ABRIR) {
  await p.evaluate(([n, a]) => {
    const g = window.game;
    g.telas.abrir(n, () => g[a].open());
  }, ABRIR.split(':'));
  await p.waitForTimeout(600);
}
if (ABA) {
  await p.evaluate((r) => {
    const limpa = (s) => (s || '').normalize('NFD').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const c = [...document.querySelectorAll('button')]
      .filter((e) => e.offsetParent && limpa(e.textContent).includes(limpa(r)))
      .sort((a, b) => a.textContent.length - b.textContent.length);
    c[0]?.click();
  }, ABA);
  await p.waitForTimeout(500);
}

const res = await p.evaluate(
  ([sel, props]) => {
    const el = document.querySelector(sel);
    if (!el) return { erro: `nenhum elemento casa com ${sel}` };
    const cs = getComputedStyle(el);
    const achados = {};
    let ordem = 0;
    for (const prop of props) achados[prop] = { valor: cs.getPropertyValue(prop), regras: [] };

    /** Peso do seletor: [ids, classes/atributos/pseudo-classes, elementos]. */
    const peso = (s) => {
      const a = (s.match(/#[\w-]+/g) || []).length;
      const b = (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length;
      const c = (s.match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length;
      return a * 10000 + b * 100 + c;
    };

    for (const folha of document.styleSheets) {
      let regras;
      try {
        regras = folha.cssRules;
      } catch {
        continue;
      }
      const varre = (lista) => {
        for (const r of lista) {
          /*
           * `selectorText` PRIMEIRO, recursao depois.
           *
           * A versao anterior fazia `if (r.cssRules) { recursa; continue; }` e
           * nao encontrava regra nenhuma em 1086 — dizia sempre "e o padrao do
           * navegador", que era uma mentira confiante.
           *
           * Desde que o CSS ganhou aninhamento, uma CSSStyleRule comum TAMBEM
           * tem `cssRules`: uma lista vazia. E lista vazia e um objeto, e
           * objeto e verdadeiro. Entao toda regra normal caia na recursao,
           * entrava numa lista sem nada e era descartada pelo `continue`.
           */
          if (r.selectorText) {
            const filhas = r.cssRules;
            if (filhas && filhas.length) varre(filhas);
          } else if (r.cssRules && r.cssRules.length) {
            varre(r.cssRules);
            continue;
          }
          if (!r.selectorText) continue;
          let casa = false;
          try {
            casa = el.matches(r.selectorText);
          } catch {
            continue;
          }
          if (!casa) continue;
          for (const prop of props) {
            const v = r.style.getPropertyValue(prop);
            if (!v) continue;
            // O seletor exato que casou, para o peso sair certo.
            const parte =
              r.selectorText.split(',').map((x) => x.trim()).find((x) => {
                try {
                  return el.matches(x);
                } catch {
                  return false;
                }
              }) ?? r.selectorText;
            achados[prop].regras.push({
              seletor: parte,
              valor: v.slice(0, 64),
              peso: peso(parte),
              // Posicao na folha: com pesos iguais, vence a ULTIMA.
              ordem: ordem++,
              importante: !!r.style.getPropertyPriority(prop),
            });
          }
        }
      };
      varre(regras);
    }
    for (const prop of props) {
      /*
       * A cascata, na ordem certa: !important, depois peso, depois POSICAO.
       *
       * Sem o desempate por posicao a ferramenta apontava como vencedora a
       * regra mais ANTIGA entre duas de peso igual — o contrario do que o
       * navegador faz, e justamente o caso que eu mais precisava enxergar.
       */
      achados[prop].regras.sort(
        (a, b) =>
          (b.importante ? 1 : 0) - (a.importante ? 1 : 0) ||
          b.peso - a.peso ||
          b.ordem - a.ordem
      );
    }
    return achados;
  },
  [alvo, props]
);

if (res.erro) {
  console.log('  ' + res.erro);
} else {
  for (const [prop, info] of Object.entries(res)) {
    console.log(`\n${prop}  ->  ${info.valor.slice(0, 70)}`);
    if (!info.regras.length) console.log('   (nenhuma regra do autor; e o padrao do navegador)');
    info.regras.forEach((r, i) => {
      const marca = i === 0 ? 'GANHA ' : 'perde ';
      console.log(`   ${marca} peso ${String(r.peso).padStart(5)}  ${r.seletor}`);
      console.log(`            ${r.valor}${r.importante ? '   !important' : ''}`);
    });
  }
}
await nav.close();
