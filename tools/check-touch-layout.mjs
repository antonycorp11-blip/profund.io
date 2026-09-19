import fs from 'node:fs';
import assert from 'node:assert/strict';

// Geometria declarada, sem abrir navegador ou produzir capturas.
const css = fs.readFileSync('src/ui/expedition.css', 'utf8');
const block = (selector) => {
  const start = css.indexOf(`${selector} {`);
  assert(start >= 0, `Seletor ausente: ${selector}`);
  return css.slice(start, css.indexOf('}', start));
};
const px = (text, prop) => {
  const match = text.match(new RegExp(`(?:[;{]\\s*)${prop}:\\s*(\\d+)px`));
  assert(match, `Medida ausente: ${prop}`);
  return Number(match[1]);
};
const skill = block('body .touch-skills .touch-btn.skill');
const selectors = [...css.matchAll(/body #btn-skill\d+(?= \{)/g)].map((m) => m[0]);
const controls = selectors.map((selector) => ({ selector, shape: skill, pos: block(selector) }));
for (const selector of ['body .touch-btn.big', 'body .touch-btn.medium']) {
  controls.push({ selector, shape: block(selector), pos: block(selector) });
}
const circles = controls.map(({ selector, shape, pos }) => {
  const diameter = px(shape, 'width');
  assert.equal(diameter, px(shape, 'height'), `${selector}: controle circular`);
  const right = px(pos, 'right');
  const bottom = px(pos, 'bottom');
  assert(right >= 0 && bottom >= 0, `${selector}: fora da tela`);
  return { selector, x: right + diameter / 2, y: bottom + diameter / 2, r: diameter / 2 };
});
for (let i = 0; i < circles.length; i++) {
  for (let j = i + 1; j < circles.length; j++) {
    const a = circles[i], b = circles[j];
    assert(Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r,
      `Controles sobrepostos: ${a.selector} / ${b.selector}`);
  }
}
console.log(`HUD: ${circles.length} controles sem sobreposicao na geometria declarada.`);

// A legenda cresce conforme o nome da camada. Altura fixa cortava o rodape.
for (const selector of ['.game-hud .minimap', '.game-hud .hud-top-right .hud-map-slot']) {
  assert(/height:\s*auto\s*;/.test(block(selector)), `${selector}: precisa acompanhar a legenda`);
}
const swap = block('.game-hud .hud-mao');
const offset = (prop) => {
  const match = swap.match(new RegExp(`${prop}: calc\\(var\\(--safe-[rb]\\) \\+ (\\d+)px\\)`));
  assert(match, `Ancora da troca ausente: ${prop}`);
  return Number(match[1]);
};
const left = offset('right'), bottom = offset('bottom');
const width = px(swap, 'width'), height = px(swap, 'height');
for (const c of circles) {
  const x = Math.max(left, Math.min(left + width, c.x));
  const y = Math.max(bottom, Math.min(bottom + height, c.y));
  assert(Math.hypot(c.x - x, c.y - y) > c.r, `Troca invade ${c.selector}`);
}
console.log('HUD: troca separada das acoes; minimapa acompanha o conteudo.');
