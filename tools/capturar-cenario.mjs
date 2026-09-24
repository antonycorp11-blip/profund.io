#!/usr/bin/env node
// Mostra o cenario real em 852x393 sem a interface cobrir os blocos.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const url = process.env.URL ?? 'http://127.0.0.1:5173/';
const out = path.resolve('arte-bruta/conferencia');
fs.mkdirSync(out, { recursive: true });
const gateCode = fs.readFileSync('src/ui/Portao.ts', 'utf8');
const password = gateCode.match(/const SENHA = (\d+)/)?.[1];
if (!password) throw new Error('Senha do portao nao encontrada');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 852, height: 393 } });
await page.goto(url, { waitUntil: 'networkidle' });
const gate = page.locator('#portao-senha');
if (await gate.count()) {
  await gate.fill(password);
  await page.locator('#portao-entrar').click();
}
await page.waitForTimeout(2400);
if (await page.locator('.cutscene:not([hidden])').count()) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}
for (let i = 0; i < 80; i++) {
  const open = await page.evaluate(() => {
    const dialog = document.querySelector('.dialog.open');
    if (!dialog) return false;
    dialog.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return true;
  });
  if (!open) break;
  await page.waitForTimeout(80);
}
await page.evaluate(() => window.game.tutorial?.fechar());
await page.addStyleTag({ content: '.toast, .layer-card, .hud-celebration { display: none !important; }' });

for (const [name, depth] of [['superficie', 7], ['pedra', 65], ['profundo', 600], ['magma', 980]]) {
  const pick = await page.evaluate((wanted) => {
    const g = window.game;
    const w = g.world;
    const air = 0;
    let best = null;
    for (let row = w.surfaceRow + wanted - 16; row <= w.surfaceRow + wanted + 16; row++) {
      for (let col = 12; col < w.width - 12; col++) {
        if (w.getTile(col, row) !== air || w.getTile(col, row + 1) === air) continue;
        let open = 0, ore = 0;
        for (let dy = -5; dy <= 4; dy++) for (let dx = -11; dx <= 11; dx++) {
          const id = w.getTile(col + dx, row + dy);
          if (id === air) open++;
          else if ([4, 5, 6, 7, 8, 25, 26].includes(id)) ore++;
        }
        const score = Math.min(open, 100) + Math.min(ore, 15) * 3 - Math.abs(row - w.surfaceRow - wanted) * 0.8;
        if (!best || score > best.score) best = { col, row, score, open, ore };
      }
    }
    if (!best) return null;
    const x = (best.col + 0.5) * w.tileSize;
    const y = (best.row + 0.1) * w.tileSize;
    g.player.setPosition(x, y);
    g.camera.snapTo(x, y);
    return best;
  }, depth);
  await page.waitForTimeout(900);
  const file = path.join(out, `cenario-v2-${name}.png`);
  await page.locator('#game-canvas').screenshot({ path: file });
  console.log(name, pick, file);
}

const tileMs = await page.evaluate(() => {
  const g = window.game;
  const canvas = document.createElement('canvas');
  canvas.width = 852;
  canvas.height = 393;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponivel');
  const c = g.camera;
  ctx.setTransform(c.scale, 0, 0, c.scale, -c.left * c.scale, -c.top * c.scale);
  for (let i = 0; i < 4; i++) g.tileRenderer.render(ctx, c);
  const start = performance.now();
  for (let i = 0; i < 80; i++) g.tileRenderer.render(ctx, c);
  return (performance.now() - start) / 80;
});
console.log(`tileRenderer em 852x393: ${tileMs.toFixed(2)} ms por quadro (desktop)`);

await browser.close();
