#!/usr/bin/env node
/**
 * Fotografa a arena e a luta de chefe, no tamanho exato do alvo.
 *
 *   npm run foto-chefe      (o servidor de dev precisa estar de pe)
 *
 * Saida: arte-bruta/conferencia/chefe-*.png
 *
 * POR QUE PRECISAVA EXISTIR.
 *
 * A arena fica a 180 m de profundidade atras de um selo. Conferir "a barra de
 * vida cabe em 852x393?" jogando ate la e inviavel, e conferir de cabeca e
 * exatamente o habito que ja me fez errar as telas varias vezes neste
 * projeto. Aqui o jogador e teleportado para dentro da camara e o combate
 * acontece de verdade — o que sai no arquivo e o jogo, nao uma maquete.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = process.env.URL ?? 'http://localhost:5173';
const SENHA = '1425';
const [L, A] = [852, 393];
const SAIDA = path.resolve('arte-bruta/conferencia');
fs.mkdirSync(SAIDA, { recursive: true });

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: L, height: A } });
pagina.on('pageerror', (e) => console.log('  [erro de pagina]', e.message));

await pagina.goto(URL, { waitUntil: 'networkidle' });
const campo = pagina.locator('#portao-senha');
if (await campo.count()) {
  await campo.fill(SENHA);
  await pagina.locator('#portao-entrar').click();
}
await pagina.waitForTimeout(2500);

/*
 * Fecha o prologo CLICANDO, nao com a tecla.
 *
 * O dialogo diz "toque para continuar" e e isso mesmo: no alvo do jogo, um
 * celular deitado, nao existe barra de espaco. Pressionar Space nao fechava
 * nada e a foto saia com meia tela de conversa por cima da arena.
 */
for (let i = 0; i < 80; i++) {
  const aberto = await pagina.evaluate(() => {
    const d = document.querySelector('.dialog.open');
    if (!d) return false;
    // Dispara no ELEMENTO, sem passar por teste de acerto.
    //
    // Clicar por coordenada nao funcionava: os cartoes de aviso do teleporte
    // cobrem o meio da tela e comem o ponteiro. O diagnostico disso foi o
    // jogador nao CAIR — o jogo pausa enquanto ha dialogo, entao a fisica
    // parada era a prova de que o prologo continuava aberto.
    d.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return true;
  });
  if (!aberto) break;
  await pagina.waitForTimeout(90);
}
const aindaAberto = await pagina.evaluate(() => !!document.querySelector('.dialog.open'));
if (aindaAberto) {
  console.log('  AVISO: o prologo nao fechou — o jogo esta pausado e a foto nao vale.');
  process.exitCode = 1;
}

/*
 * Espera os avisos passarem antes de fotografar.
 *
 * Teleportar para 180 m dispara de uma vez os marcos de profundidade, os
 * pontos de habilidade e a marca do chefe no mapa — quatro cartoes de aviso
 * em cima justamente da faixa onde a barra do chefe vai aparecer. Cada um
 * dura 2,4 s; esperar e mais honesto que esconde-los, porque e assim que o
 * jogador vai ver a tela de verdade.
 */
const limpar = async () => {
  for (let i = 0; i < 40; i++) {
    const sujo = await pagina.evaluate(
      () => document.querySelectorAll('.toast, .layer-card, .celebra').length
    );
    if (sujo === 0) return;
    await pagina.waitForTimeout(400);
  }
};

/** Leva o jogador para dentro da camara do chefe. */
const dados = await pagina.evaluate(() => {
  const g = window.game;
  const porta = g.worldInfo.gates.find((x) => x.layerId === 'stone');
  if (!porta) return null;
  const ts = g.world.tileSize;
  // Entra por um lado, nao em cima do bicho: assim se ve a sala inteira.
  const x = (porta.col - 8) * ts + ts / 2;
  const y = (porta.row - 1) * ts;
  g.player.setPosition(x, y);
  g.camera.snapTo(x, y);
  return { col: porta.col, row: porta.row, x, y, ts };
});
console.log('  arena:', JSON.stringify(dados));

const tirar = async (nome, esperar = 900, limpo = true) => {
  await pagina.waitForTimeout(esperar);
  if (limpo) await limpar();
  const f = path.join(SAIDA, `chefe-${nome}.png`);
  await pagina.screenshot({ path: f });
  console.log(`  ${path.basename(f)}`);
};

await tirar('arena', 1400);

/*
 * Tres fotos atravessando a camara.
 *
 * A camera mostra 21,7 x 10 tiles e a arena tem 35 x 13: nenhum quadro cabe
 * a sala inteira, entao julgar a arquitetura por uma foto do meio e julgar
 * um terco dela. Os pilares ficam a 10 colunas do centro, as sacadas nas
 * pontas — coisas que so aparecem andando.
 */
for (const [nome, off] of [
  ['panorama-esq', -13],
  ['panorama-meio', 0],
  ['panorama-dir', 13],
]) {
  await pagina.evaluate((o) => {
    const g = window.game;
    const porta = g.worldInfo.gates.find((x) => x.layerId === 'stone');
    const ts = g.world.tileSize;
    const x = (porta.col + o) * ts;
    const y = (porta.row - 4) * ts;
    g.player.setPosition(x, y);
    g.camera.snapTo(x, y);
  }, off);
  await tirar(nome, 700);
}

// Aproxima ate o chefe engajar: a barra so entra quando a luta comeca.
await pagina.evaluate(() => {
  const g = window.game;
  const b = g.creatures.creatures.find((c) => c.def.boss);
  if (b) {
    g.player.setPosition(b.x - 150, b.y - 20);
    g.camera.snapTo(b.x - 150, b.y - 20);
  }
});
await tirar('engajado', 1600);

// Leva a vida ate logo acima do limiar de furia e depois cruza ele.
await pagina.evaluate(() => {
  const g = window.game;
  const b = g.creatures.creatures.find((c) => c.def.boss);
  if (b) b.hurt(Math.round(b.def.health * 0.5), b.x - 200);
});
await tirar('meia-vida', 1200);

await pagina.evaluate(() => {
  const g = window.game;
  const b = g.creatures.creatures.find((c) => c.def.boss);
  if (b) b.hurt(Math.round(b.def.health * 0.25), b.x - 200);
});
await tirar('furia', 1400);

/*
 * O telegrafo dura 0,7 s: nao da para limpar a tela antes de fotografa-lo.
 *
 * Na primeira tentativa a foto saiu sem corredor nenhum e eu quase fui
 * procurar o bug no renderizador. O bug era do arnes: `limpar()` espera 400 ms
 * por aviso na tela, a convocacao de lacaios dispara aviso, e quando o
 * obturador abria o preparo ja tinha virado investida.
 *
 * Aqui espera-se o COMECO do preparo e fotografa-se na hora, sem limpeza.
 */
/*
 * Antes do telegrafo, os dois no meio da pista limpa.
 *
 * Na primeira conferencia havia um pilar entre os dois e o corredor parou
 * nele — que e o comportamento certo, mas nao mostra o telegrafo inteiro.
 * Para julgar se ele se LE e preciso ve-lo em pista aberta.
 */
await pagina.evaluate(() => {
  const g = window.game;
  const porta = g.worldInfo.gates.find((x) => x.layerId === 'stone');
  const b = g.creatures.creatures.find((c) => c.def.boss);
  if (!porta || !b) return;
  const ts = g.world.tileSize;
  b.x = (porta.col + 6) * ts;
  const px = (porta.col - 2) * ts;
  g.player.setPosition(px, (porta.row - 1) * ts);
  g.camera.snapTo((px + b.x) / 2, b.y);
});
await pagina.waitForTimeout(400);

const pegouTelegrafo = await pagina.evaluate(async () => {
  const g = window.game;
  for (let i = 0; i < 900; i++) {
    const b = g.creatures.creatures.find((c) => c.def.boss);
    // Cedo no preparo: com o corredor ainda enchendo, que e o que se quer ver.
    if (b && b.windup > b.windupTotal * 0.45) return true;
    await new Promise((r) => setTimeout(r, 8));
  }
  return false;
});
console.log('  telegrafo visivel:', pegouTelegrafo);
if (pegouTelegrafo) await tirar('telegrafo', 0, false);

await navegador.close();
