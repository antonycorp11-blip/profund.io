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
/* Os slots deixaram de ter posicao unica: cada `data-n` tem a sua. A
 * checagem de sobreposicao abaixo cuida so dos controles fixos. */
const selectors = [];
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
/*
 * O CENTRO DA ACAO SAI DO CSS, e nao de um par digitado aqui.
 *
 * Estava escrito `const action = { x: 56, y: 56 }`. Por acaso batia com o
 * MINERAR de hoje — e era a unica coisa segurando a checagem: no dia em que o
 * botao mudasse de tamanho ou de canto, a sonda continuaria medindo o arco a
 * partir de um ponto que nao existe mais, e aprovaria qualquer coisa. Este
 * projeto ja perdeu duas auditorias exatamente assim (o "377" e o "278").
 */
const action = circles.find((c) => c.selector === 'body .touch-btn.big');
assert(action, 'MINERAR nao encontrado: sem ele nao ha arco para medir');
const jump = circles.find((c) => c.selector === 'body .touch-btn.medium');

/*
 * UM ARCO POR QUANTIDADE DE HABILIDADE.
 *
 * A versao anterior media quatro posicoes fixas e so. Mas os lugares vazios do
 * cinto ficam `hidden`: com tres habilidades, tres quartos daquele arco
 * apareciam e o quarto faltava — na tela, uma escada subindo para a esquerda.
 * A sonda aprovava, porque ela media o arco COMPLETO, que ninguem ve.
 *
 * Agora cada `data-n` e um caso, e cada caso e cobrado inteiro.
 */
const skillDia = px(skill, 'width');
const arcos = new Map();
for (const m of css.matchAll(
  /body \.touch-skills\[data-n="(\d)"\] #btn-skill(\d) \{\s*right: (\d+)px[^;]*;\s*bottom: (\d+)px/g
)) {
  const [, n, slot, right, bottom] = m;
  if (!arcos.has(n)) arcos.set(n, []);
  arcos.get(n).push({
    slot: Number(slot),
    x: Number(right) + skillDia / 2,
    y: Number(bottom) + skillDia / 2,
    r: skillDia / 2,
  });
}
assert.equal(arcos.size, 4, 'Faltam casos de arco: e preciso um por quantidade (1 a 4)');

const rs = skillDia / 2;
const RAIO_MIN = action.r + rs + 6;
const RAIO_MAX = action.r + rs + 30;

for (const [n, pontos] of [...arcos].sort()) {
  assert.equal(pontos.length, Number(n), `data-n="${n}" descreve ${pontos.length} botoes`);
  pontos.sort((a, b) => a.slot - b.slot);

  const raios = pontos.map((p) => Math.hypot(p.x - action.x, p.y - action.y));
  const medio = raios.reduce((s, r) => s + r, 0) / raios.length;
  for (const r of raios) {
    assert(Math.abs(r - medio) <= 2, `data-n="${n}": botoes fora do mesmo raio (arco vira fileira)`);
  }

  /*
   * EQUIDISTANCIA SOZINHA NAO E ARCO — foi o que deixou passar a leva anterior.
   *
   * A 100 px de distancia de um botao de 42 px de raio, a curvatura nao se
   * enxerga: o que se ve sao pontos espalhados. Colado demais tambem quebra,
   * porque os botoes se encostam. A regra tem os dois lados, e os dois saem
   * dos raios reais lidos do CSS.
   */
  assert(
    medio >= RAIO_MIN && medio <= RAIO_MAX,
    `data-n="${n}": arco a ${medio.toFixed(1)}px do MINERAR, fora da faixa ` +
      `${RAIO_MIN}-${RAIO_MAX}px (longe demais deixa de parecer arco)`
  );

  // Os angulos sobem na ordem dos slots: o jogador decora a POSICAO da
  // habilidade, e slot embaralhado troca o botao debaixo do dedo dele.
  const ang = pontos.map((p) => Math.atan2(p.y - action.y, p.x - action.x));
  for (let i = 1; i < ang.length; i++) {
    assert(ang[i] > ang[i - 1], `data-n="${n}": slot ${pontos[i].slot} esta fora de ordem no arco`);
  }

  // Nada encostando em nada, nem no MINERAR, nem no PULAR, nem entre si.
  for (let i = 0; i < pontos.length; i++) {
    const p = pontos[i];
    assert(p.x >= p.r && p.y >= p.r, `data-n="${n}": slot ${p.slot} sai da tela`);
    assert(
      Math.hypot(p.x - action.x, p.y - action.y) >= action.r + p.r,
      `data-n="${n}": slot ${p.slot} encosta no MINERAR`
    );
    if (jump) {
      assert(
        Math.hypot(p.x - jump.x, p.y - jump.y) >= jump.r + p.r,
        `data-n="${n}": slot ${p.slot} encosta no PULAR`
      );
    }
    for (let j = i + 1; j < pontos.length; j++) {
      assert(
        Math.hypot(p.x - pontos[j].x, p.y - pontos[j].y) >= p.r + pontos[j].r,
        `data-n="${n}": slots ${p.slot} e ${pontos[j].slot} se encostam`
      );
    }
  }
}
console.log(`HUD: ${arcos.size} arcos (1 a 4 habilidades), todos colados ao MINERAR e em ordem.`);

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
  const match = swap.match(new RegExp(`${prop}: calc\\(var\\(--safe-[rt]\\) \\+ (\\d+)px\\)`));
  assert(match, `Ancora da troca ausente: ${prop}`);
  return Number(match[1]);
};
const left = offset('right'), top = offset('top');
const width = px(swap, 'width'), height = px(swap, 'height');
assert(left <= 20, 'Troca deve ficar alinhada ao canto do minimapa');
assert(top >= 180 && height <= 40, 'Troca deve ficar abaixo do minimapa');
console.log('HUD: troca separada das acoes; minimapa acompanha o conteudo.');
