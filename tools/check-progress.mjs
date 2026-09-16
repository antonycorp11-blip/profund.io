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
import { EQUIPMENT } from '../src/data/equipment';
import { SKILLS } from '../src/data/skills';
import { ATTRIBUTES, FLAG_IDS } from '../src/data/attributes';
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

// --- 3. a base consegue produzir o que ela mesma cobra? -------------------
//
// A regra, escrita em /data/basecamp.ts: OBRA se paga em bruto, MELHORIA se
// paga em refinado. Duas travas duras nasceram de quebrar isso — a estrutura
// que exigia o produto da propria fabrica para montar a fabrica. Aqui as duas
// metades da regra viram teste.
const refinaveis = new Map(Object.entries(REFINE_RECIPES).map(([ent, r]) => [r.out, ent]));
const BRUTOS_DA_MINA = new Set(['stone', 'coal', 'copper', 'iron', 'gold', 'crystal', 'ruby', 'relic', 'voidstone']);
for (const base of BASE_CAMPS) {
  for (const slot of base.slots) {
    // 3a. nenhuma obra cobra refinado.
    for (const r of Object.keys(slot.cost)) {
      if (BRUTOS_DA_MINA.has(r)) continue;
      if (refinaveis.has(r)) {
        erros.push(
          \`\${base.nome}/\${slot.nome}: a OBRA custa \${r}, que e refinado. \` +
            'Refinado so pode aparecer em melhoria — senao a fabrica exige a si mesma.'
        );
        continue;
      }
      erros.push(\`\${base.nome}/\${slot.nome}: custa \${r}, que nao e minerio nem sai de receita.\`);
    }
    // 3b. toda melhoria cobra refinado, e refinado que a base sabe produzir.
    const mel = slot.melhoria;
    if (!mel) continue;
    for (const r of Object.keys(mel.cost)) {
      const origem = refinaveis.get(r);
      if (!origem) {
        erros.push(
          \`\${base.nome}/\${slot.nome}: a melhoria custa \${r}, que nao sai de refinaria nenhuma.\`
        );
        continue;
      }
      if (!BRUTOS_DA_MINA.has(origem)) {
        erros.push(\`\${base.nome}/\${slot.nome}: melhoria pede \${r}, que vem de \${origem}, que nao e minerio bruto.\`);
      }
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

// --- 5. a missao nunca aponta para algo mais fundo do que ela diz ----------
//
// O card do objetivo mostra a profundidade. Se a flag que fecha a missao so
// existe 200 m abaixo disso, o numero mente e o jogador procura no lugar
// errado — o tipo de bug que ninguem reporta, so abandona o jogo por causa.
const ondeNasce = new Map<string, number>();
ondeNasce.set('quota_paga', 0);
for (const c of CLUES) ondeNasce.set(c.id, c.row - sr);
for (const n of RESCUE_NPCS) ondeNasce.set(n.id, n.row - sr);
for (const n of OUTPOST_NPCS) ondeNasce.set(n.id, (n as { row: number }).row - sr);
for (const n of BLOCKIA_NPCS) ondeNasce.set(n.id, CONFIG.blockia.depth0);
for (const b of BASE_CAMPS) for (const sl of b.slots) ondeNasce.set(b.id + ':' + sl.kind, b.depth);
for (const l of GATE_LAYERS) {
  const def = gateLayerDef(l);
  if (def) ondeNasce.set('gate_' + l, def.minDepth);
}
for (const c of CREATURES) {
  if (!c.bossOfLayer) continue;
  const def = gateLayerDef(c.bossOfLayer);
  if (def) ondeNasce.set(c.id, def.minDepth);
}
for (const m of MISSIONS) {
  for (const f of m.requires) {
    const d = ondeNasce.get(f);
    if (d === undefined) continue; // a regra 1 ja reclamou disso
    if (d > m.depth + 12) {
      erros.push(
        \`missao "\${m.title}" diz \${m.depth}m mas depende de "\${f}", que so existe a \${Math.round(d)}m\`
      );
    }
  }
}

// --- 6. nenhum id repetido ------------------------------------------------
//
// Id repetido nao quebra o build: quebra o SAVE, silenciosamente, porque duas
// coisas passam a dividir a mesma flag.
const vistos = new Map<string, string>();
const registrar = (id: string, onde: string) => {
  const antes = vistos.get(id);
  if (antes) erros.push(\`id repetido "\${id}": \${antes} e \${onde}\`);
  else vistos.set(id, onde);
};
for (const m of MISSIONS) registrar(m.id, 'missao');
for (const c of CLUES) registrar(c.id, 'pista');
for (const n of RESCUE_NPCS) registrar(n.id, 'mineiro');
for (const n of BLOCKIA_NPCS) registrar(n.id, 'morador');
for (const n of OUTPOST_NPCS) registrar(n.id, 'posto');
for (const c of CREATURES) registrar(c.id, 'criatura');
for (const s of SCROLLS) registrar(s.id, 'pergaminho');
for (const e of EQUIPMENT) registrar(e.id, 'equipamento');
for (const k of SKILLS) registrar(k.id, 'habilidade');

// --- 7. modificador aponta para atributo que existe -----------------------
const alvos = new Set<string>([...Object.keys(ATTRIBUTES), ...FLAG_IDS]);
const conferirMods = (nome: string, mods: { target: string; op: string }[]) => {
  for (const m of mods) {
    if (m.op === 'proc') continue; // proc tem namespace proprio
    if (!alvos.has(m.target)) {
      erros.push(\`\${nome}: modifica "\${m.target}", que nao e atributo nem flag\`);
    }
  }
};
for (const e of EQUIPMENT) conferirMods('equipamento ' + e.id, e.modifiers);
for (const k of SKILLS) for (const nivel of k.modifiers) conferirMods('habilidade ' + k.id, nivel);

// --- 8b. ninguem cobra moeda por atributo que nao existe -------------------
//
// /data/attributes.ts declara 31 atributos com live:false — sao o roteiro
// do que ainda vai existir, e ter esse roteiro escrito e bom. O que nao pode e
// VENDER um deles. O Traje Termico custava 5.200 moedas para dar resistencia a
// fogo num jogo sem dano de fogo; a ficha prometia e o codigo nao tinha o que
// cumprir. E o mesmo bug da mochila a jato, que prometia empuxo e dava planeio.
const mortos = new Set(
  Object.values(ATTRIBUTES)
    .filter((a) => (a as { live?: boolean }).live === false)
    .map((a) => (a as { id: string }).id)
);
for (const e of EQUIPMENT) {
  for (const m of e.modifiers) {
    if (mortos.has(m.target)) {
      erros.push(
        \`equipamento \${e.id} custa \${e.cost} moedas e mexe em "\${m.target}", que e \` +
          'um atributo sem sistema por tras (live:false). Vender promessa nao vale.'
      );
    }
  }
}
for (const k of SKILLS) {
  for (const nivel of k.modifiers) {
    for (const m of nivel) {
      if (mortos.has(m.target)) {
        erros.push(\`habilidade \${k.id} gasta ponto em "\${m.target}", que e atributo morto.\`);
      }
    }
  }
}

// --- 8. pergaminho e pista tem texto --------------------------------------
for (const s of SCROLLS) {
  const corpo = (s.text ?? []).join(' ');
  if (!s.title || corpo.length < 60) {
    erros.push(\`pergaminho \${s.id} sem texto de verdade (\${corpo.length} caracteres)\`);
  }
}
for (const c of CLUES) {
  if (!c.lines || c.lines.length === 0) erros.push(\`pista \${c.id} sem dialogo\`);
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
let falhou = false;
try {
  execSync(`node ${TMP}/run.cjs`, { stdio: 'inherit' });
} catch {
  // O relatorio ja saiu no stdout do processo filho. Repetir o rastro de pilha
  // do execSync so empurra a lista de problemas para fora da tela.
  falhou = true;
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
if (falhou) process.exit(1);
