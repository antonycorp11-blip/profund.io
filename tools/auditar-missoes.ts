#!/usr/bin/env node
/**
 * Audita a cadeia de missoes: coerencia, ordem e tempo.
 *
 *   npm run auditar-missoes
 *
 * POR QUE PRECISAVA EXISTIR.
 *
 * A campanha tem dezenove missoes, e cada uma depende de flags que outras
 * partes do jogo emitem: pistas, resgates, chefes, selos, obras de base. Ler
 * isso de cabeca e como eu erraria — ja errei duas vezes com o selo que
 * esperava a propria missao, e nas duas o sintoma so apareceu jogando.
 *
 * Aqui cada regra e uma pergunta que o dado responde sozinho:
 *  - toda flag exigida por uma missao EXISTE em algum lugar do jogo?
 *  - ela e alcancavel ANTES da missao que a exige, ou e coisa do futuro
 *    cobrada no passado?
 *  - a fila de profundidades sobe, ou ha missao rasa depois de funda?
 *  - o alvo de cada missao esta do lado certo do selo daquela faixa?
 *  - a recompensa acompanha o esforco?
 */
import { MISSIONS } from '../src/data/missions';
import { CLUES, RESCUE_NPCS } from '../src/data/story';
import { LAYERS } from '../src/data/layers';
import { GATE_LAYERS, gateLayerDef } from '../src/data/gates';
import { bossForLayer, CREATURES } from '../src/data/creatures';
import { CONFIG } from '../src/data/config';
import { SCROLLS } from '../src/data/scrolls';
import { BASE_CAMPS } from '../src/data/basecamp';
import { CITIES } from '../src/data/cities';
import { BLOCKIA_NPCS } from '../src/data/blockia';

let erros = 0;
let avisos = 0;
const falha = (m: string) => {
  erros++;
  console.log(`  ERRO   ${m}`);
};
/** Afirmacao com veredito: passa ou vira erro, e diz o porque quando falha. */
const ok = (cond: boolean, titulo: string, detalhe = '') => {
  if (cond) console.log(`  ok     ${titulo}`);
  else falha(`${titulo}${detalhe ? ` — ${detalhe}` : ''}`);
};
const aviso = (m: string) => {
  avisos++;
  console.log(`  aviso  ${m}`);
};

/*
 * DE ONDE VEM CADA FLAG.
 *
 * Um mapa de flag -> profundidade em que ela se torna possivel. E o coracao da
 * auditoria: sem ele nao da para dizer se uma missao esta pedindo coisa do
 * futuro.
 */
const origem = new Map<string, { onde: string; depth: number }>();
const SUP = CONFIG.world.surfaceRow;

for (const c of CLUES) {
  origem.set(c.id, { onde: `pista "${c.title}"`, depth: c.row - SUP });
}
for (const n of RESCUE_NPCS) {
  origem.set(n.id, { onde: `resgate de ${n.name}`, depth: n.row - SUP });
}
for (const layerId of GATE_LAYERS) {
  const layer = gateLayerDef(layerId);
  const boss = bossForLayer(layerId);
  if (boss) origem.set(boss.id, { onde: `chefe ${boss.name}`, depth: layer.minDepth - 2 });
  origem.set(`gate_${layerId}`, { onde: `selo de ${layer.name}`, depth: layer.minDepth });
}
for (const s of SCROLLS) {
  origem.set(s.id, { onde: `pergaminho "${s.title}"`, depth: (s as { depth?: number }).depth ?? 0 });
}
/*
 * As obras de base vem do DADO, e nao de um numero meu.
 *
 * Eu tinha escrito "377" aqui a mao, copiando do texto da missao. A base fica
 * a 236 m — ou seja, a auditoria repetia a mentira que deveria pegar. Um
 * verificador que copia a premissa do verificado nao verifica nada.
 */
for (const b of BASE_CAMPS) {
  origem.set(`${b.id}:deposito`, { onde: `obra em ${b.nome}`, depth: b.depth });
}
/*
 * Os moradores de Blockia: falar com cada um deixa uma flag com o id dele
 * (ver o `city:met` no Game). Sao elas que as missoes da cidade exigem.
 */
for (const n of BLOCKIA_NPCS) {
  origem.set(n.id, { onde: `conversa com ${n.name}`, depth: CITIES[0].depth });
}
/* A passagem: a cidade entrega a picareta quando a confianca chega ao limiar. */
for (const c of CITIES) {
  origem.set(`passagem_${c.id}`, { onde: `confianca de ${c.name}`, depth: c.depth });
}
// Flags que o jogo emite por acao, sem lugar no mundo.
for (const [id, onde, depth] of [
  ['quota_paga', 'entrega da cota', 0],
  ['rui_cabeca', 'encontro com Rui Cabeca', 278],
] as [string, string, number][]) {
  origem.set(id, { onde, depth });
}

console.log('\n=== 1. TODA FLAG EXIGIDA EXISTE? ===');
for (const m of MISSIONS) {
  for (const f of m.requires) {
    if (!origem.has(f)) falha(`"${m.title}" exige a flag "${f}", que nada no jogo produz.`);
  }
}
if (erros === 0) console.log('  ok  todas as flags exigidas tem origem conhecida.');

console.log('\n=== 2. COISA DO FUTURO COBRADA NO PASSADO? ===');
for (const m of MISSIONS) {
  for (const f of m.requires) {
    const o = origem.get(f);
    if (!o) continue;
    // Margem de 12 m: a missao pode ser anunciada um pouco antes do alvo, e
    // isso e bom — e o convite para descer. O que nao pode e estar LONGE.
    if (o.depth > m.depth + 12) {
      falha(
        `"${m.title}" (${m.depth} m) exige ${o.onde}, que so existe a ${o.depth} m — ` +
          `${o.depth - m.depth} m abaixo dela.`
      );
    }
  }
}
if (erros === 0) console.log('  ok  nenhuma missao cobra o que so aparece depois dela.');

console.log('\n=== 2b. A PROFUNDIDADE ANUNCIADA BATE COM O ALVO? ===');
/*
 * A REGRA QUE FALTAVA, e a que pegou os erros de verdade.
 *
 * A checagem anterior so olhava um lado: alvo abaixo da missao e "coisa do
 * futuro". Mas o contrario tambem quebra o jogo, e de um jeito pior — a
 * missao anuncia 216 m, o jogador desce ate 216 m, e o que ela pede estava a
 * 112 m, cem metros ACIMA, ja passado sem ele saber.
 *
 * Nao e erro de codigo: e o jogo MENTINDO a profundidade. E mentira de mapa e
 * o unico tipo de mentira que um jogo de exploracao nao pode contar.
 */
for (const m of MISSIONS) {
  const alvos = m.requires.map((f) => origem.get(f)).filter(Boolean) as { onde: string; depth: number }[];
  if (!alvos.length) continue;
  // O alvo que manda e o MAIS FUNDO: e ele que decide quando a missao fecha.
  const fundo = alvos.reduce((a, b) => (a.depth > b.depth ? a : b));
  const dif = m.depth - fundo.depth;
  if (dif > 40) {
    falha(
      `"${m.title}" anuncia ${m.depth} m, mas o alvo mais fundo (${fundo.onde}) ` +
        `esta a ${fundo.depth} m — ${dif} m ACIMA. O jogador desce demais e passa direto.`
    );
  }
}
if (erros === 0) console.log('  ok  toda missao anuncia a profundidade do seu alvo.');

console.log('\n=== 2c. O TEXTO CITA A PROFUNDIDADE CERTA? ===');
/*
 * O texto da missao cita metros a mao ("a 377 m", "a 374 m"). Numero escrito
 * em texto nao acompanha o dado quando o dado muda — e foi assim que a
 * campanha ficou apontando lugares que nao existem mais.
 */
for (const m of MISSIONS) {
  const citados = [...m.goal.matchAll(/(\d{2,4})\s*m\b/g)].map((x) => Number(x[1]));
  if (!citados.length) continue;
  const alvos = m.requires.map((f) => origem.get(f)).filter(Boolean) as { onde: string; depth: number }[];
  for (const c of citados) {
    const perto = alvos.some((a) => Math.abs(a.depth - c) <= 25) || Math.abs(c - m.depth) <= 25;
    if (!perto) {
      falha(
        `"${m.title}" cita "${c} m" no texto, e nenhum alvo dela esta perto disso ` +
          `(alvos: ${alvos.map((a) => a.depth + ' m').join(', ')}).`
      );
    }
  }
}
if (erros === 0) console.log('  ok  os metros citados no texto batem com os alvos.');

console.log('\n=== 3. A FILA SOBE? ===');
let anterior = -1;
for (const m of MISSIONS) {
  if (m.depth < anterior) {
    falha(`"${m.title}" esta a ${m.depth} m, acima da missao anterior (${anterior} m).`);
  }
  anterior = Math.max(anterior, m.depth);
}
if (erros === 0) console.log('  ok  as profundidades so descem.');

console.log('\n=== 4. O ALVO ESTA DO LADO CERTO DO SELO? ===');
for (const m of MISSIONS) {
  for (const f of m.requires) {
    const o = origem.get(f);
    if (!o) continue;
    for (const layerId of GATE_LAYERS) {
      const layer = gateLayerDef(layerId);
      const flagDoSelo = `gate_${layerId}`;
      const guardiao = bossForLayer(layerId)?.id;
      // Missoes DO selo nao contam: elas sao o selo.
      if (m.requires.includes(flagDoSelo) || (guardiao && m.requires.includes(guardiao))) continue;
      if (m.depth < layer.minDepth && o.depth > layer.minDepth) {
        falha(
          `"${m.title}" (${m.depth} m, antes do selo de ${layer.name}) exige ${o.onde}, ` +
            `que esta a ${o.depth} m — do OUTRO lado do selo.`
        );
      }
    }
  }
}
if (erros === 0) console.log('  ok  nenhum alvo esta atras de um selo que ainda nao abriu.');

console.log('\n=== 4b. CADA COISA ESTA NA CAMADA QUE ELA DIZ SER? ===');
/*
 * A regra que teria pegado o erro mais feio.
 *
 * A Base do Cristal declarava `layer: 'crystal'` e morava a 236 m, que e
 * Camada de Pedra — batizada com o nome de uma camada e fisicamente na
 * anterior, atras do selo errado. Ninguem le uma tabela de profundidades
 * procurando isso; um verificador le.
 */
const camadaDe = (d: number) =>
  [...LAYERS].filter((l) => l.generated && l.minDepth <= d).sort((a, b) => b.minDepth - a.minDepth)[0];
for (const b of BASE_CAMPS) {
  const real = camadaDe(b.depth);
  if (real && real.id !== b.layer) {
    falha(
      `"${b.nome}" diz ser da camada "${b.layer}" mas esta a ${b.depth} m, ` +
        `que e ${real.name} ("${real.id}").`
    );
  }
}
if (erros === 0) console.log('  ok  toda base esta na camada que ela declara.');

console.log('\n=== 4c. TODA PORTEIRA TEM CHAVE? ===');
/*
 * A regra que me impediu de trancar o jogo hoje.
 *
 * Abaixo de cada cidade a rocha so cede a picareta DELA. Isso e a espinha do
 * jogo — e tambem a forma mais facil de deixar a campanha impossivel: basta
 * uma cidade trancar uma profundidade sem existir para entregar a ferramenta.
 *
 * Aqui cada porteira tem que provar que ha como abri-la: a cidade existe no
 * mundo, e ha confianca suficiente disponivel nela para atingir o limiar.
 */
for (const c of CITIES) {
  if (!c.implementada) {
    console.log(`  ·    ${c.name} (${c.depth} m): planejada, ainda nao tranca nada.`);
    continue;
  }
  /*
   * A CONVERSA NAO CONTA SOZINHA — foi o que esta checagem errou.
   *
   * Ela somava so a confianca dos moradores e dizia "ok, da para juntar". Dava
   * mesmo: dava DEMAIS. Falar com tres pessoas ja passava do limiar, e a
   * cidade entregava a picareta antes das missoes de trabalho, que sao o
   * argumento inteiro dela. A checagem aprovava exatamente o bug.
   *
   * O que precisa ser somado e o CAMINHO OBRIGATORIO: os moradores que alguma
   * missao exige, mais a confianca que as obras pagam.
   */
  const moradores = c.id === 'blockia' ? BLOCKIA_NPCS : [];
  const exigidos = new Set(MISSIONS.flatMap((m) => m.requires));
  const porConversa = moradores
    .filter((m) => exigidos.has(m.id))
    .reduce((n, m) => n + (m.trust ?? 0), 0);
  const porObra = MISSIONS.filter((m) => m.trust?.city === c.id).reduce(
    (n, m) => n + (m.trust?.amount ?? 0),
    0
  );
  ok(
    porConversa + porObra >= c.trustToPass,
    `${c.name}: quem faz o que ela pede junta a confianca dela`,
    `pede ${c.trustToPass}, o caminho obrigatorio da ${porConversa + porObra} ` +
      `(${porConversa} de conversa + ${porObra} de obra)`
  );
}

console.log('\n=== 5. O PORQUE ESTA ESCRITO? ===');
for (const m of MISSIONS) {
  if (!m.porque) aviso(`"${m.title}" nao diz POR QUE importa (campo \`porque\`).`);
}

console.log('\n=== 6. RECOMPENSA ACOMPANHA O ESFORCO? ===');
let ultimoPremio = 0;
for (const m of MISSIONS) {
  if (m.rewardMoney < ultimoPremio) {
    aviso(
      `"${m.title}" (${m.depth} m) paga ${m.rewardMoney}, menos que a anterior (${ultimoPremio}).`
    );
  }
  ultimoPremio = Math.max(ultimoPremio, m.rewardMoney);
}

console.log('\n=== 7. VAOS SEM OBJETIVO ===');
/*
 * Um vao longo entre missoes e o jogo ficando MUDO.
 *
 * Nao e erro de dado: e ritmo. Trezentos metros com o mesmo objetivo no card
 * significa trezentos metros em que nada novo e dito, e e ali que o jogador
 * larga — nao por dificuldade, por silencio.
 *
 * O corte de 120 m nao e arbitrario: e pouco mais que a distancia entre as
 * duas primeiras missoes de historia (26 -> 128), que ja e o maior vao que a
 * abertura se permite.
 */
const VAO_MAX = 120;
for (let i = 1; i < MISSIONS.length; i++) {
  const vao = MISSIONS[i].depth - MISSIONS[i - 1].depth;
  if (vao > VAO_MAX) {
    aviso(
      `${vao} m sem objetivo novo entre "${MISSIONS[i - 1].title}" (${MISSIONS[i - 1].depth} m) ` +
        `e "${MISSIONS[i].title}" (${MISSIONS[i].depth} m).`
    );
  }
}

console.log('\n=== 8. TEMPO DE JOGO (estimativa) ===');
/*
 * ESTIMATIVA, e digo estimativa de proposito.
 *
 * Ela sai de numeros reais do jogo — vida do bloco, golpes por segundo, forca
 * da picareta — e nao de palpite. Mas ela NAO mede o que mais custa tempo de
 * verdade: morrer e voltar, se perder, parar para melhorar, ler. Entao ela e
 * um PISO: o jogo nao dura menos que isto.
 *
 * As premissas estao escritas para poderem ser discutidas em vez de
 * adivinhadas.
 */
const HPS = CONFIG.mining.hitsPerSecondBase;
const FORCA = 10; // picareta inicial; melhora com a arvore e com ferramenta
const HP_ROCHA = 34; // pedra comum
const golpesPorBloco = Math.ceil(HP_ROCHA / FORCA);
const segPorBloco = golpesPorBloco / HPS;
// Descer 1 m custa 1 bloco quebrado mais o caminho lateral que ninguem desce reto.
const BLOCOS_POR_METRO = 1.8;
const segPorMetro = BLOCOS_POR_METRO * segPorBloco;

console.log(`  premissas: ${HPS} golpes/s, forca ${FORCA}, rocha ${HP_ROCHA} hp`);
console.log(`             = ${golpesPorBloco} golpes por bloco, ${segPorBloco.toFixed(1)} s por bloco`);
console.log(`             ${BLOCOS_POR_METRO} blocos por metro descido (ninguem desce reto)`);
console.log(`             ${segPorMetro.toFixed(1)} s por metro de profundidade\n`);

let acumulado = 0;
for (let i = 0; i < MISSIONS.length; i++) {
  const m = MISSIONS[i];
  const desdeAnterior = i === 0 ? m.depth : m.depth - MISSIONS[i - 1].depth;
  /*
   * Quando a missao declara `minutos`, ela manda.
   *
   * A conta por profundidade tem um ponto cego: as missoes dentro de uma
   * cidade ficam a dois metros uma da outra e ganhavam dois minutos cada. O
   * trabalho de cidade — consertar elevador, tirar caixa de galeria alagada —
   * nao tem metro nenhum, e era justamente a metade do arco que sumia da
   * conta.
   */
  const ehChefe = m.requires.some((f) => f.startsWith('boss_'));
  const extra = ehChefe ? 240 : 90;
  const seg = m.minutos !== undefined
    ? m.minutos * 60 + desdeAnterior * segPorMetro
    : desdeAnterior * segPorMetro + extra;
  acumulado += seg;
  const mm = Math.round(seg / 60);
  // Arredondar os minutos DEPOIS de tirar as horas imprime "4h60". Arredonda-se
  // o total em minutos primeiro, e as horas saem dele.
  const totalMin = Math.round(acumulado / 60);
  const hh = Math.floor(totalMin / 60);
  const rest = totalMin % 60;
  console.log(
    `  ${String(m.depth).padStart(5)} m  ${m.title.padEnd(24)} +${String(mm).padStart(3)} min` +
      `   acumulado ${hh}h${String(rest).padStart(2, '0')}`
  );
}
/*
 * O ARCO ATE BLOCKIA e a prioridade declarada, entao ele tem conta propria.
 * A BIBLIA (secao 8) pede 0h45 + 1h15 + 1h00 + 2h30 = 5h30 ate sair da
 * cidade; o alvo combinado foi "umas boas 4 horas".
 */
let ateBlockia = 0;
for (let i = 0; i < MISSIONS.length; i++) {
  const m = MISSIONS[i];
  if (m.depth > 610) break;
  const d = i === 0 ? m.depth : m.depth - MISSIONS[i - 1].depth;
  const chefe = m.requires.some((f) => f.startsWith('boss_'));
  ateBlockia += m.minutos !== undefined
    ? m.minutos * 60 + d * segPorMetro
    : d * segPorMetro + (chefe ? 240 : 90);
}
console.log(
  `\n  ARCO SUPERFICIE -> FIM DE BLOCKIA: ${(ateBlockia / 3600).toFixed(1)} h` +
    `   (alvo combinado: 4 h; BIBLIA secao 8 pede 5,5 h)`
);

const horas = acumulado / 3600;
console.log(`\n  PISO ESTIMADO ATE O FIM DA CAMPANHA: ${horas.toFixed(1)} h de jogo puro.`);
console.log('  (sem contar morte, volta a base, melhoria, leitura e se perder)');

console.log('\n=== 9. A CADEIA, EM ORDEM ===');
for (const m of MISSIONS) {
  const alvos = m.requires.map((f) => origem.get(f)?.onde ?? `?${f}`).join(' + ');
  console.log(
    `  ${String(m.depth).padStart(5)} m  ${m.title.padEnd(24)} <- ${alvos}` +
      `   [✦${m.rewardMoney} ✧${m.rewardPoints}]`
  );
}

console.log(`\n${erros} erro(s), ${avisos} aviso(s).\n`);
process.exit(erros === 0 ? 0 : 1);
