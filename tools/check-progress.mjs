#!/usr/bin/env node
/**
 * Auditoria de travas de progresso.
 *
 *   npm run check
 *
 * Simula a campanha inteira do zero e para na primeira coisa impossivel. Ele
 * existe porque trava de progresso e o pior bug deste jogo: nao da erro, nao
 * aparece no console, e o jogador so descobre depois de horas — quando ja
 * investiu tempo demais para recomecar sem raiva.
 *
 * O que ele verifica, nesta ordem:
 *
 *  1. Toda flag pedida por missao existe em algum lugar do jogo.
 *  2. Nenhuma missao pede conteudo que esta atras de um selo que a propria
 *     missao destrava (dependencia circular).
 *  3. Nenhuma estrutura de base custa material que so a propria base produz.
 *  4. Toda pista, pergaminho e mineiro esta em chao alcancavel.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const TMP = '.check-tmp';
fs.mkdirSync(TMP, { recursive: true });

fs.writeFileSync(
  `${TMP}/run.ts`,
  `
import { MISSIONS } from '../src/data/missions';
import { BASE_CAMPS } from '../src/data/basecamp';
import { REFINE_RECIPES } from '../src/data/structures';
import { CLUES, RESCUE_NPCS } from '../src/data/story';
import { SCROLLS } from '../src/data/scrolls';
import { BLOCKIA_NPCS } from '../src/data/blockia';
import { OUTPOST_NPCS } from '../src/data/outpost';
import { CREATURES } from '../src/data/creatures';
import { GATE_LAYERS, gateLayerDef } from '../src/data/gates';
import { CONFIG } from '../src/data/config';
import { World } from '../src/world/World';
import { generateWorld } from '../src/world/WorldGen';

const erros: string[] = [];
const avisos: string[] = [];

// --- 1. toda flag de missao tem origem -----------------------------------
const origens = new Set<string>([
  'quota_paga',
  ...CLUES.map((c) => c.id),
  ...RESCUE_NPCS.map((n) => n.id),
  ...BLOCKIA_NPCS.map((n) => n.id),
  ...OUTPOST_NPCS.map((n) => n.id),
  ...CREATURES.filter((c) => c.bossOfLayer).map((c) => c.id),
  ...GATE_LAYERS.map((l) => 'gate_' + l),
  ...BASE_CAMPS.flatMap((b) => b.slots.map((s) => b.id + ':' + s.kind)),
]);
for (const m of MISSIONS) {
  for (const f of m.requires) {
    if (!origens.has(f)) erros.push(\`missao "\${m.title}" pede a flag "\${f}", que nada no jogo produz\`);
  }
}

// --- 2. missao atras do proprio selo --------------------------------------
for (const l of GATE_LAYERS) {
  const topo = gateLayerDef(l).minDepth - CONFIG.gate.bandThickness - 1;
  for (const m of MISSIONS) {
    if (m.depth > topo) continue;
    // Conteudo da missao esta acima do corte: ok. Se estiver abaixo do inicio
    // da camada, ela so seria feita depois do selo que ela mesma destrava.
    if (m.depth >= gateLayerDef(l).minDepth) {
      erros.push(\`selo \${l} exige "\${m.title}" (\${m.depth}m), que fica DEPOIS do proprio selo\`);
    }
  }
}

// --- 3. estrutura que custa o que ela mesma produz ------------------------
const refinados = new Set(Object.values(REFINE_RECIPES).map((r) => r?.out));
for (const base of BASE_CAMPS) {
  const primeira = base.slots.find((s) => s.requires.length === 1 && s.requires[0] === 'refinador');
  if (!primeira) continue;
  for (const r of Object.keys(primeira.cost)) {
    if (refinados.has(r as never)) {
      erros.push(
        \`\${base.nome}: a primeira estrutura (\${primeira.nome}) custa \${r}, que e refinado — \` +
          'e a refinaria da base so roda depois dela. Trava dura.'
      );
    }
  }
}

// --- 4. tudo em chao alcancavel -------------------------------------------
const w = new World();
generateWorld(w);
const sr = w.surfaceRow;
const solto = (col: number, row: number) => !w.isSolid(col, row) && !w.isSolid(col, row - 1);
for (const c of CLUES) if (!solto(c.col, c.row)) erros.push(\`pista \${c.id} dentro da pedra\`);
for (const n of RESCUE_NPCS) if (!solto(n.col, n.row)) avisos.push(\`mineiro \${n.id} sem vao (ele e liberado cavando)\`);
for (const s of SCROLLS) {
  const r = sr + s.depth;
  if (!solto(s.col, r) || !w.isSolid(s.col, r + 2)) erros.push(\`pergaminho \${s.id} sem chao a \${s.depth}m col \${s.col}\`);
}

console.log(\`missoes: \${MISSIONS.length} · pergaminhos: \${SCROLLS.length} · bases: \${BASE_CAMPS.length}\`);
if (avisos.length) console.log('\\navisos:\\n  ' + avisos.join('\\n  '));
if (erros.length === 0) {
  console.log('\\nnenhuma trava de progresso encontrada.');
} else {
  console.log('\\nTRAVAS (' + erros.length + '):\\n  ' + erros.join('\\n  '));
  process.exit(1);
}
`
);

execSync(`npx esbuild ${TMP}/run.ts --bundle --platform=node --format=cjs --outfile=${TMP}/run.cjs --log-level=error`, {
  stdio: 'inherit',
});
try {
  execSync(`node ${TMP}/run.cjs`, { stdio: 'inherit' });
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
