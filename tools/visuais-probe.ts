import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { ART } from '../src/data/art';
import { BLOCKS, BLOCK_IDS, blockByKey } from '../src/data/blocks';
import { CREATURES } from '../src/data/creatures';
import { LAYERS } from '../src/data/layers';
import { RESOURCES } from '../src/data/resources';
import { World } from '../src/world/World';
import { generateWorld } from '../src/world/WorldGen';

const art = path.resolve('public/art');
let errors = 0;

function check(ok: boolean, message: string): void {
  console.log(`${ok ? '  ok' : '  FALHA'}  ${message}`);
  if (!ok) errors++;
}

function readPng(relative: string): PNG | null {
  const file = path.join(art, relative);
  if (!fs.existsSync(file)) {
    check(false, `${relative} existe`);
    return null;
  }
  return PNG.sync.read(fs.readFileSync(file));
}

console.log('\nARTE QUE O MOTOR PEDE');
// Criatura ambiente com behavior guardiao nao despawna e ocupa a frota para sempre.
check(CREATURES.every((creature) => creature.behavior !== 'guardiao' || creature.spawnWeight === 0),
  'guardioes fixos nunca entram no sorteio de fauna ambiente');
const caveHashes = new Set<string>();
for (const bg of ART.backgrounds.filter((item) => item.key.startsWith('cave_'))) {
  const relative = `bg/${bg.key}.png`;
  const png = readPng(relative);
  if (!png) continue;
  check(png.width > png.height, `${bg.key}: fundo horizontal`);
  caveHashes.add(createHash('sha256').update(png.data).digest('hex'));
}
check(caveHashes.size === ART.backgrounds.filter((item) => item.key.startsWith('cave_')).length,
  'cada faixa da caverna tem pintura propria');
// Uma textura espelhada quatro vezes produzia uma grade repetida no mapa longo.
// A sonda cobra variacoes reais para os materiais que ocupam quase todo o mundo.
check(ART.blockVariants >= 4, 'motor procura quatro variacoes de terreno');
for (const key of ['dirt', 'stone', 'darkstone', 'grass']) {
  const hashes = new Set<string>();
  for (let i = 0; i < 4; i++) {
    const png = readPng(`blocks/${key}_${i}.png`);
    if (!png) continue;
    check(png.width === png.height, `${key}_${i}: tile quadrado`);
    hashes.add(createHash('sha256').update(png.data).digest('hex'));
  }
  check(hashes.size === 4, `${key}: quatro desenhos diferentes`);
}
for (const key of ART.environmentKeys) {
  const png = readPng(`${ART.environmentDir}${key}.png`);
  if (!png) continue;
  let visible = 0;
  let empty = 0;
  for (let i = 3; i < png.data.length; i += 4) {
    if (png.data[i] > 128) visible++;
    if (png.data[i] < 16) empty++;
  }
  check(visible > 0 && empty > 0, `${key}: adorno recortado com transparencia`);
}
for (const key of ['copper', 'iron', 'gold', 'azurite']) {
  const block = blockByKey(key);
  const png = readPng(`ore/${key}.png`);
  check(!!block && block.type === 'minerio' && !!block.drop && !!RESOURCES[block.drop],
    `${key}: veio tem recurso no mundo`);
  if (!png) continue;
  let visible = 0;
  let empty = 0;
  for (let i = 3; i < png.data.length; i += 4) {
    if (png.data[i] > 128) visible++;
    if (png.data[i] < 16) empty++;
  }
  check(visible > 0 && empty > 0, `${key}: inclusao recortada para rocha da camada`);
}
for (const key of ART.directOreKeys) {
  const block = blockByKey(key);
  const png = readPng(`blocks/${key}_0.png`);
  check(!!block && block.type === 'minerio' && !!block.drop && !!RESOURCES[block.drop],
    `${key}: bloco e recurso concordam`);
  if (png) check(png.width === png.height, `${key}: textura quadrada`);
}

for (const def of CREATURES.filter((c) => c.artMode === 'fourFrame')) {
  if (!def.art) {
    check(false, `${def.id}: chave de arte`);
    continue;
  }
  const single = readPng(`creatures/${def.art}_single.png`);
  const actions = def.artAttackSheet ? ['walk', 'attack'] : ['walk'];
  for (const action of actions) {
    const strip = readPng(`creatures/${def.art}_${action}.png`);
    if (!strip || !single) continue;
    check(strip.width % 4 === 0 && strip.height === single.height,
      `${def.id}: ${action} tem quatro quadros com a altura do sprite`);
    if (strip.width % 4 !== 0) continue;
    const frameW = strip.width / 4;
    const hashes = new Set<string>();
    for (let frame = 0; frame < 4; frame++) {
      const bytes = Buffer.alloc(frameW * strip.height * 4);
      let visible = 0;
      for (let y = 0; y < strip.height; y++) {
        const source = (y * strip.width + frame * frameW) * 4;
        const target = y * frameW * 4;
        strip.data.copy(bytes, target, source, source + frameW * 4);
        for (let x = 0; x < frameW; x++) {
          if (strip.data[source + x * 4 + 3] > 32) visible++;
        }
      }
      check(visible > 0, `${def.id}: ${action} quadro ${frame + 1} tem desenho`);
      hashes.add(createHash('sha256').update(bytes).digest('hex'));
    }
    check(hashes.size === 4, `${def.id}: ${action} muda a pose em todos os quadros`);
  }
}

console.log('\nMINERIOS NO MUNDO GERADO');
const world = new World();
generateWorld(world);
for (const key of ['amber', 'azurite']) {
  const block = blockByKey(key);
  const declared = LAYERS.some((layer) => layer.ores.some((ore) => ore.key === key));
  let count = 0;
  if (block) for (const tile of world.tiles) if (tile === block.id) count++;
  check(!!block && declared && count > 0, `${key}: veio realmente gerado (${count} tiles)`);
}
check(BLOCKS.every((block) => block.id !== BLOCK_IDS.AIR || block.key === 'air'),
  'identidade do ar preservada');

if (errors) process.exitCode = 1;
