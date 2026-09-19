#!/usr/bin/env node
/**
 * AUDITORIA TOTAL: mundo, historia, dialogo e cronologia.
 *
 *   npm run auditar-tudo
 *
 * POR QUE ESTA E SEPARADA DA `auditar-missoes`.
 *
 * Aquela pergunta uma coisa so: a CADEIA de missoes fecha? Esta pergunta o
 * resto — se o mundo em volta da cadeia concorda com ela. Sao perguntas
 * diferentes, e cada uma ja pegou erro que a outra deixaria passar.
 *
 * O pedido que criou este arquivo foi textual: "nao quero de forma alguma
 * chegar pra jogar e ver missoes quebradas, caminhos errados, coisas fora de
 * cronologia, dialogos que nao fazem sentido ou que sao incoerentes
 * narrativamente".
 *
 * A REGRA DESTE ARQUIVO, que a auditoria anterior quebrou duas vezes: nenhum
 * numero aqui pode ser copiado a mao do conteudo auditado. Se a checagem
 * precisa saber a que profundidade mora o Rui, ela le /data/outpost.ts. Uma
 * auditoria que repete a premissa do auditado nao audita nada — foi assim que
 * "377" e "278" atravessaram duas revisoes sem ninguem notar.
 */
import { MISSIONS } from '../src/data/missions';
import { CLUES, RESCUE_NPCS, type DialogLine } from '../src/data/story';
import { LAYERS, layerAt } from '../src/data/layers';
import { GATE_LAYERS, gateBandRows, gateLayerDef } from '../src/data/gates';
import { STORY_GATES, storyGateRows } from '../src/data/storyGates';
import { CREATURES } from '../src/data/creatures';
import { ENCOUNTERS, encounterOf } from '../src/data/encounters';
import { bossForLayer } from '../src/data/creatures';
import { CONFIG } from '../src/data/config';
import { SCROLLS } from '../src/data/scrolls';
import { BASE_CAMPS } from '../src/data/basecamp';
import { CITIES, toolFloorAt } from '../src/data/cities';
import { BLOCKIA_NPCS } from '../src/data/blockia';
import { POSTO_NOVE, OUTPOST_NPCS } from '../src/data/outpost';
import { PROLOGUE, MINE_CLOSED } from '../src/data/prologue';
import { TOOLS } from '../src/data/tools';

const SUP = CONFIG.world.surfaceRow;

let erros = 0;
let avisos = 0;
const falha = (m: string) => {
  erros++;
  console.log(`  ERRO   ${m}`);
};
const aviso = (m: string) => {
  avisos++;
  console.log(`  aviso  ${m}`);
};
const passou = (m: string) => console.log(`  ok     ${m}`);
/** Fecha uma secao dizendo o que ela provou — ou cala, se ja falou por erro. */
function secao(antes: number, frase: string): void {
  if (erros === antes) passou(frase);
}

/* ---------------------------------------------------------------------
 * DE ONDE VEM CADA FLAG — tudo lido do dado, nada escrito a mao.
 * ------------------------------------------------------------------- */
interface Origem {
  onde: string;
  depth: number;
}
const origem = new Map<string, Origem>();
for (const c of CLUES) origem.set(c.id, { onde: `pista "${c.title}"`, depth: c.row - SUP });
for (const n of RESCUE_NPCS) origem.set(n.id, { onde: `resgate de ${n.name}`, depth: n.row - SUP });
for (const s of SCROLLS) origem.set(s.id, { onde: `pergaminho "${s.title}"`, depth: s.depth });
for (const b of BASE_CAMPS) origem.set(`${b.id}:deposito`, { onde: `obra em ${b.nome}`, depth: b.depth });
for (const n of BLOCKIA_NPCS) origem.set(n.id, { onde: `conversa com ${n.name}`, depth: CITIES[0].depth });
/* O Rui mora no Posto Nove, e a profundidade dele e a do posto. Escrever o
 * numero aqui foi exatamente o erro que esta auditoria existe para nao repetir. */
for (const n of OUTPOST_NPCS) origem.set(n.id, { onde: `encontro com ${n.name}`, depth: n.depth });
for (const c of CITIES) origem.set(`passagem_${c.id}`, { onde: `confianca de ${c.name}`, depth: c.depth });
for (const layerId of GATE_LAYERS) {
  const layer = gateLayerDef(layerId);
  const boss = bossForLayer(layerId);
  if (boss) origem.set(boss.id, { onde: `chefe ${boss.name}`, depth: layer.minDepth - 2 });
  origem.set(`gate_${layerId}`, { onde: `selo de ${layer.name}`, depth: layer.minDepth });
}
origem.set('quota_paga', { onde: 'entrega da cota', depth: 0 });

/** Toda fala do jogo, com onde ela acontece — a base das checagens de texto. */
interface Fala {
  onde: string;
  depth: number;
  speaker: string;
  text: string;
}
const FALAS: Fala[] = [];
const juntar = (linhas: DialogLine[], onde: string, depth: number) => {
  for (const l of linhas) FALAS.push({ onde, depth, speaker: l.speaker, text: l.text });
};
juntar(PROLOGUE, 'prologo', 0);
juntar(MINE_CLOSED, 'fim de run', 0);
for (const c of CLUES) {
  juntar(c.lines, `pista "${c.title}"`, c.row - SUP);
  FALAS.push({ onde: `pista "${c.title}" (registro)`, depth: c.row - SUP, speaker: 'registro', text: c.logEntry });
}
for (const n of RESCUE_NPCS) {
  const d = n.row - SUP;
  juntar(n.trappedLines, `${n.name} preso`, d);
  juntar(n.freedLines, `${n.name} livre`, d);
  juntar(n.safeLines, `${n.name} a salvo`, d);
  for (const c of n.callLines) FALAS.push({ onde: `${n.name} chamando`, depth: d, speaker: n.name, text: c });
}
for (const n of [...BLOCKIA_NPCS, ...OUTPOST_NPCS]) {
  const d = 'depth' in n ? (n as { depth: number }).depth : CITIES[0].depth;
  juntar(n.lines, `${n.name} (1a conversa)`, d);
  for (const l of n.idleLines) FALAS.push({ onde: `${n.name} (repeticao)`, depth: d, speaker: n.name, text: l });
}
for (const s of SCROLLS) {
  for (const p of s.text) FALAS.push({ onde: `pergaminho "${s.title}"`, depth: s.depth, speaker: s.author, text: p });
}
for (const m of MISSIONS) {
  FALAS.push({ onde: `missao "${m.title}" (objetivo)`, depth: m.depth, speaker: 'missao', text: m.goal });
  FALAS.push({ onde: `missao "${m.title}" (fecho)`, depth: m.depth, speaker: 'missao', text: m.onDone });
  if (m.porque) FALAS.push({ onde: `missao "${m.title}" (porque)`, depth: m.depth, speaker: 'missao', text: m.porque });
}
for (const g of STORY_GATES) {
  FALAS.push({ onde: `selo "${g.id}"`, depth: g.depth, speaker: 'parede', text: g.aviso });
}

/* ===================================================================== */
console.log('\n=== A. CADA COISA ESTA NA CAMADA QUE ELA DIZ SER ===');
/*
 * `layer` aparece em pista, mineiro e pergaminho. Ele nao move nada no mundo
 * — quem move e a profundidade — mas alimenta o contador do Guia. Um
 * pergaminho a 74 m marcado como "Camada de Pedra" faz o Guia dizer ao
 * jogador que ele esta noutro bioma.
 *
 * As fronteiras de camada ja se mexeram tres vezes nesta campanha, e nenhum
 * destes campos foi junto — porque nada obrigava.
 */
{
  const antes = erros;
  const conferir = (id: string, declarada: string, depth: number, tipo: string) => {
    const real = layerAt(depth);
    if (real.id === declarada) return;
    falha(`${tipo} "${id}" (${depth} m) diz camada "${declarada}", mas ${depth} m e ${real.name} ("${real.id}").`);
  };
  for (const c of CLUES) conferir(c.id, c.layer, c.row - SUP, 'pista');
  for (const n of RESCUE_NPCS) conferir(n.id, n.layer, n.row - SUP, 'mineiro');
  for (const s of SCROLLS) conferir(s.id, s.layer, s.depth, 'pergaminho');
  secao(antes, 'pista, mineiro e pergaminho concordam com a camada onde estao.');
}

/* ===================================================================== */
console.log('\n=== B. SELO DE HISTORIA: A CHAVE ESTA ACIMA DA PORTA? ===');
/*
 * O selo de historia abre por ter ACHADO uma coisa. Se essa coisa estiver
 * ABAIXO da faixa, o jogador bate numa parede que so abre com o que esta do
 * outro lado dela. Nao e dificuldade: e um jogo que trava e nao volta.
 *
 * Esta checagem nao existia — e deveria ter nascido no dia em que os dois
 * selos de chefe viraram selos de historia.
 */
{
  const antes = erros;
  for (const g of STORY_GATES) {
    const o = origem.get(g.requires);
    if (!o) {
      falha(`selo "${g.id}" (${g.depth} m) abre com a flag "${g.requires}", que nada no jogo produz.`);
      continue;
    }
    if (o.depth >= g.depth) {
      falha(
        `selo "${g.id}" a ${g.depth} m so abre com ${o.onde}, que esta a ${o.depth} m — ` +
          `${o.depth - g.depth} m ABAIXO da propria parede. O jogo trava aqui e nao volta.`
      );
    }
  }
  secao(antes, 'toda parede de historia abre com coisa que fica acima dela.');
}

/* ===================================================================== */
console.log('\n=== C. NADA NASCE DENTRO DE UMA PAREDE SELADA ===');
/*
 * Selo de bioma e selo de historia viram rocha indestrutivel. Qualquer coisa
 * cuja SALA cruze essas linhas nasce emparedada: o chefe ja nasceu assim uma
 * vez, e so apareceu jogando.
 */
{
  const antes = erros;
  const faixas: { nome: string; row0: number; row1: number }[] = [];
  for (const layerId of GATE_LAYERS) {
    const l = gateLayerDef(layerId);
    const { row0, row1 } = gateBandRows(SUP, l);
    faixas.push({ nome: `selo de ${l.name}`, row0, row1 });
  }
  for (const g of STORY_GATES) {
    const { row0, row1 } = storyGateRows(SUP, g);
    faixas.push({ nome: `selo "${g.id}"`, row0, row1 });
  }
  const cruza = (r0: number, r1: number) => faixas.find((f) => r0 <= f.row1 && r1 >= f.row0);
  for (const c of CLUES) {
    const f = cruza(c.row - c.roomH, c.row);
    if (f) falha(`a sala da pista "${c.title}" cruza a faixa do ${f.nome}.`);
  }
  for (const n of RESCUE_NPCS) {
    const f = cruza(n.row - n.roomH, n.row + 1);
    if (f) falha(`a sala de ${n.name} cruza a faixa do ${f.nome}.`);
  }
  for (const s of SCROLLS) {
    const f = cruza(SUP + s.depth - 1, SUP + s.depth + 1);
    if (f) falha(`o pergaminho "${s.title}" (${s.depth} m) cai na faixa do ${f.nome}.`);
  }
  {
    const f = cruza(SUP + POSTO_NOVE.depth - POSTO_NOVE.altura, SUP + POSTO_NOVE.depth);
    if (f) falha(`o Posto Nove (${POSTO_NOVE.depth} m) cruza a faixa do ${f.nome}.`);
  }
  for (const b of BASE_CAMPS) {
    const f = cruza(SUP + b.depth - 8, SUP + b.depth + 2);
    if (f) falha(`${b.nome} (${b.depth} m) cruza a faixa do ${f.nome}.`);
  }
  secao(antes, 'nenhuma sala, posto ou base nasce dentro de rocha selada.');
}

/* ===================================================================== */
console.log('\n=== D. OS METROS DITOS EM VOZ ALTA SAO OS METROS REAIS ===');
/*
 * Toda vez que uma fala diz "a NNN metros", ela vira mapa na cabeca do
 * jogador. O registro da pista dizia "(62 m)" para uma pista que esta a 26,
 * e "(230 m)" para uma que esta a 120 — cem metros de mentira no primeiro
 * bioma, num jogo cujo unico verbo e procurar.
 */
{
  const antes = erros;
  /** Le "NNN m", "NNN metros" e os numeros por extenso que o jogo usa. */
  const EXTENSO: Record<string, number> = {
    'vinte e seis': 26,
    'duzentos': 200,
    'trezentos e quarenta': 340,
    'quatrocentos': 400,
  };
  const metrosCitados = (t: string): number[] => {
    const out: number[] = [];
    for (const m of t.matchAll(/(\d{2,4})\s*(?:m\b|metros)/gi)) out.push(Number(m[1]));
    for (const [texto, n] of Object.entries(EXTENSO)) {
      if (new RegExp(`${texto}\\s+(?:metros|m\\b)`, 'i').test(t)) out.push(n);
    }
    return out;
  };
  /* Os lugares que o jogo pode citar: se o numero dito e um deles, a fala e
   * verdadeira mesmo quando nao fala de si mesma (o Rui citando a barreira). */
  const marcos = new Set<number>();
  for (const c of CLUES) marcos.add(c.row - SUP);
  for (const n of RESCUE_NPCS) marcos.add(n.row - SUP);
  for (const s of SCROLLS) marcos.add(s.depth);
  for (const b of BASE_CAMPS) marcos.add(b.depth);
  for (const g of STORY_GATES) marcos.add(g.depth);
  for (const l of LAYERS) marcos.add(l.minDepth);
  for (const c of CITIES) marcos.add(c.depth);
  for (const m of MISSIONS) marcos.add(m.depth);
  marcos.add(POSTO_NOVE.depth);

  for (const f of FALAS) {
    for (const n of metrosCitados(f.text)) {
      // Tolerancia de 4 m: o jogo fala em numero redondo, o tile e exato.
      const perto = [...marcos].some((m) => Math.abs(m - n) <= 4);
      if (perto) continue;
      falha(`${f.onde}: cita "${n} m", e nao ha nada a essa profundidade. — "${f.text.slice(0, 70)}"`);
    }
  }
  /* O registro da pista e o caso duro: ele fala de SI MESMO, entao o numero
   * tem de ser o dela, nao um marco qualquer. */
  for (const c of CLUES) {
    const d = c.row - SUP;
    const ditos = metrosCitados(c.logEntry);
    for (const n of ditos) {
      if (Math.abs(n - d) <= 2) continue;
      falha(`o registro da pista "${c.title}" anuncia ${n} m, mas ela esta a ${d} m.`);
    }
  }
  secao(antes, 'todo numero de profundidade dito em voz alta existe no mundo.');
}

/* ===================================================================== */
console.log('\n=== E. NINGUEM CITA QUEM NAO EXISTE ===');
/*
 * Nome proprio numa fala e uma promessa: existe alguem assim. Uma troca de
 * nome num rascunho vira um personagem fantasma que o jogador procura para
 * sempre.
 */
{
  const antes = erros;
  const elenco = new Set<string>([
    'Elias', 'Santiago', 'John', 'Helena', 'Ramires', 'Capataz', 'Caderno', 'Blockia',
    'Ferruria', 'Lumora', 'Vespera', 'Dalia', 'Correia', 'Posto', 'Nove', 'Mina', 'Vale',
  ]);
  for (const n of RESCUE_NPCS) for (const p of n.name.split(' ')) elenco.add(p);
  for (const n of [...BLOCKIA_NPCS, ...OUTPOST_NPCS]) for (const p of n.name.split(' ')) elenco.add(p);
  for (const c of CREATURES) for (const p of c.name.split(' ')) elenco.add(p);
  for (const l of LAYERS) for (const p of l.name.split(' ')) elenco.add(p);
  for (const b of BASE_CAMPS) for (const p of b.nome.split(' ')) elenco.add(p);
  for (const t of TOOLS) for (const p of t.name.split(' ')) elenco.add(p);
  /* Coisa nomeada tambem e nome proprio: a Pagina 01, o Deposito Bruto, o
   * Conselho das Lanternas. Elas vem do dado, entao a lista nunca envelhece. */
  for (const c of CLUES) for (const p of c.title.split(/[\s—-]+/)) elenco.add(p);
  for (const m of MISSIONS) for (const p of m.title.split(' ')) elenco.add(p);
  for (const s of SCROLLS) for (const p of s.title.split(' ')) elenco.add(p);
  for (const b of BASE_CAMPS) for (const e of b.slots) for (const p of e.nome.split(' ')) elenco.add(p);
  for (const n of [...BLOCKIA_NPCS, ...OUTPOST_NPCS]) for (const p of n.role.split(' ')) elenco.add(p);

  /* Palavra com inicial maiuscula NO MEIO da frase e candidata a nome
   * proprio. No comeco da frase nao da para distinguir de qualquer palavra. */
  const vistos = new Map<string, string>();
  for (const f of FALAS) {
    const frases = f.text.split(/(?<=[.!?])\s+/);
    for (const frase of frases) {
      const palavras = frase.trim().split(/\s+/);
      for (let i = 1; i < palavras.length; i++) {
        const p = palavras[i].replace(/[^A-Za-zÀ-ÿ]/g, '');
        if (p.length < 3) continue;
        if (!/^[A-ZÀ-Þ]/.test(p)) continue;
        // ENFASE nao e nome proprio: o jogo grita a palavra que importa.
        if (p === p.toUpperCase()) continue;
        // "(ri) Voce vai..." — depois de uma rubrica comeca frase, nao nome.
        if (palavras[i - 1].endsWith(')')) continue;
        if (elenco.has(p)) continue;
        if (!vistos.has(p)) vistos.set(p, `${f.onde}: "${frase.trim().slice(0, 64)}"`);
      }
    }
  }
  for (const [nome, onde] of vistos) {
    aviso(`nome proprio desconhecido "${nome}" — ${onde}`);
  }
  secao(antes, 'nenhuma fala inventa personagem.');
  if (vistos.size === 0) passou('nenhum nome proprio sem dono nas falas.');
}

/* ===================================================================== */
console.log('\n=== F. CRONOLOGIA DOS PERGAMINHOS ===');
/*
 * `cron` e a ordem da HISTORIA, e a ordem em que o Guia mostra. A regra fisica
 * que ela precisa respeitar: os dois desceram, e quem desce nao sobe para
 * escrever a proxima pagina. Entao, DENTRO DE UM AUTOR, cron maior tem de
 * estar mais fundo.
 *
 * A excecao e declarada no dado (`foraDaDescida`), nao tolerada aqui: a carta
 * que Santiago nao mandou foi escrita em casa, antes de tudo, e largada onde
 * ele parou. Excecao que o dado nao declara e bug.
 */
{
  const antes = erros;
  const crons = new Map<number, string>();
  for (const s of SCROLLS) {
    const dono = crons.get(s.cron);
    if (dono) falha(`os pergaminhos "${dono}" e "${s.title}" tem o mesmo cron ${s.cron}.`);
    crons.set(s.cron, s.title);
  }
  for (const autor of ['Santiago', 'John'] as const) {
    const meus = SCROLLS.filter(
      (s) => s.author === autor && !(s as { foraDaDescida?: boolean }).foraDaDescida
    ).sort((a, b) => a.cron - b.cron);
    for (let i = 1; i < meus.length; i++) {
      const ant = meus[i - 1];
      const at = meus[i];
      if (at.depth >= ant.depth) continue;
      falha(
        `${autor}: "${at.title}" (cron ${at.cron}) esta a ${at.depth} m, acima de ` +
          `"${ant.title}" (cron ${ant.cron}, ${ant.depth} m). Ele teria subido para escrever.`
      );
    }
  }
  secao(antes, 'as anotacoes descem na mesma ordem em que foram escritas.');
}

/* ===================================================================== */
console.log('\n=== G. A CIDADE COBRA TRABALHO, NAO CONVERSA ===');
/*
 * O pilar da cidade-porteira (BIBLIA 2.2): Blockia nao deixa passar quem
 * chegou, deixa passar quem SERVIU. Se a soma das primeiras conversas ja
 * alcanca o limiar, a picareta sai de graca por dizer bom dia — e as tres
 * missoes de trabalho viram enfeite, porque a porta ja abriu antes delas.
 */
{
  const antes = erros;
  for (const c of CITIES) {
    if (!c.implementada) {
      console.log(`  ·      ${c.name} (${c.depth} m): planejada, ainda nao tranca nada.`);
      continue;
    }
    const moradores = BLOCKIA_NPCS; // uma cidade implementada ate agora
    /*
     * A PORTA PRECISA DE DUAS PROVAS, e uma so nao serve.
     *
     * TETO: falar com TODO MUNDO nao pode alcancar o limiar, senao a picareta
     * sai por conversa.
     * PISO: o caminho obrigatorio — so os moradores que alguma missao exige,
     * mais as missoes — TEM de alcancar, senao o jogador faz tudo o que o jogo
     * pede e a porta nao abre. Esse e o erro pior dos dois: nao ha o que fazer
     * depois dele.
     */
    const teto = moradores.reduce((s, n) => s + n.trust, 0);
    const exigidos = new Set(MISSIONS.flatMap((m) => m.requires));
    const obrigatorios = moradores.filter((n) => exigidos.has(n.id));
    const porConversa = obrigatorios.reduce((s, n) => s + n.trust, 0);
    const porObra = MISSIONS.filter((m) => m.trust?.city === c.id).reduce((s, m) => s + (m.trust?.amount ?? 0), 0);
    const piso = porConversa + porObra;

    if (teto >= c.trustToPass) {
      falha(
        `${c.name}: so de conversar com os ${moradores.length} moradores sao ${teto} de confianca, ` +
          `e a passagem pede ${c.trustToPass}. A cidade entrega ${c.pickaxeName} sem o jogador fazer nada por ela.`
      );
    }
    if (piso < c.trustToPass) {
      falha(
        `${c.name}: quem faz TUDO o que a cidade pede junta ${piso} (${porConversa} de conversa obrigatoria + ` +
          `${porObra} de obra) e a passagem pede ${c.trustToPass}. O jogador cumpre a cidade inteira e a porta nao abre.`
      );
    }
    if (teto < c.trustToPass && piso >= c.trustToPass) {
      passou(
        `${c.name}: conversa sozinha da ${teto}, o caminho obrigatorio da ${piso}, ` +
          `a passagem pede ${c.trustToPass} — so o trabalho abre a porta.`
      );
    }
  }
  secao(antes, 'nenhuma cidade se vende por uma conversa.');
}

/* ===================================================================== */
console.log('\n=== H. A PASSAGEM E A ULTIMA COISA DA CIDADE ===');
/*
 * A missao que recebe a picareta tem de ser a ULTIMA daquela cidade. Se ela
 * vier antes, o jogador desce com a ferramenta e deixa a cidade pela metade —
 * e as missoes que sobraram passam a pedir que ele volte para cima.
 */
{
  const antes = erros;
  for (const c of CITIES) {
    if (!c.implementada) continue;
    const idx = MISSIONS.findIndex((m) => m.requires.includes(`passagem_${c.id}`));
    if (idx < 0) {
      aviso(`${c.name} entrega a picareta, e nenhuma missao marca esse momento.`);
      continue;
    }
    const daCidade = MISSIONS.filter((m) => Math.abs(m.depth - c.depth) <= 20);
    const ultima = daCidade[daCidade.length - 1];
    if (ultima.id !== MISSIONS[idx].id) {
      falha(`${c.name}: "${MISSIONS[idx].title}" entrega a picareta, mas "${ultima.title}" ainda vem depois.`);
    }
  }
  secao(antes, 'a picareta da cidade e a ultima coisa que ela da.');
}

/* ===================================================================== */
console.log('\n=== I. A FERRAMENTA EXIGIDA E ALCANCAVEL ===');
/*
 * Abaixo de uma cidade a rocha so cede a ferramenta dela. Se uma missao mora
 * abaixo de um piso que o jogador ainda nao pode ter, ela e impossivel — e o
 * jogo nao diz por que.
 */
{
  const antes = erros;
  const compravel = Math.max(...TOOLS.filter((t) => !t.daCidade).map((t) => t.tier));
  for (const m of MISSIONS) {
    const piso = toolFloorAt(m.depth);
    if (piso <= compravel) continue;
    const cidade = CITIES.find((c) => c.toolTier === piso);
    const daPassagem = cidade ? `passagem_${cidade.id}` : '';
    const antesDela = MISSIONS.findIndex((x) => x.requires.includes(daPassagem));
    const minhaPos = MISSIONS.findIndex((x) => x.id === m.id);
    if (antesDela >= 0 && antesDela < minhaPos) continue;
    falha(
      `"${m.title}" (${m.depth} m) exige ferramenta de nivel ${piso} (${cidade?.pickaxeName ?? '?'}), ` +
        `e nada antes dela entrega essa ferramenta. A oficina so chega ao nivel ${compravel}.`
    );
  }
  secao(antes, 'toda missao e escavavel com a ferramenta que o jogador ja pode ter.');
}

/* ===================================================================== */
console.log('\n=== J. CHEFE SEM LUGAR NO MUNDO ===');
/*
 * Um bicho com bloco `boss` e feito para ser um acontecimento: barra na tela,
 * furia, investida. Se ele nao e chefe de selo (`bossOfLayer`) nem nasce por
 * evento, ele e arte e codigo que ninguem nunca ve.
 */
{
  const antes = erros;
  for (const c of CREATURES) {
    if (!c.boss) continue;
    const deSelo = c.bossOfLayer && GATE_LAYERS.includes(c.bossOfLayer);
    const deEvento = encounterOf(c.id) !== undefined;
    if (deSelo || deEvento) continue;
    falha(
      `"${c.name}" tem mecanica de chefe e nenhum lugar no mundo: ` +
        `${c.bossOfLayer ? `tranca a camada "${c.bossOfLayer}", que nao tem selo` : 'nao tranca camada nenhuma'}, ` +
        `e nao e evento. Ninguem nunca vai encontrar este bicho.`
    );
  }
  secao(antes, 'todo chefe existente tem onde acontecer.');
}

/* ===================================================================== */
console.log('\n=== K. A ORDEM DO MUNDO, LINHA A LINHA ===');
/*
 * Nao e checagem: e a leitura. Tudo que o jogador pode encontrar, na ordem em
 * que a mina entrega. Ler isto de cima a baixo e a unica forma honesta de
 * responder "a historia faz sentido?".
 */
{
  type Ponto = { depth: number; tipo: string; texto: string };
  const pontos: Ponto[] = [];
  for (const c of CLUES) pontos.push({ depth: c.row - SUP, tipo: 'pista', texto: c.title });
  for (const n of RESCUE_NPCS) pontos.push({ depth: n.row - SUP, tipo: 'mineiro', texto: n.name });
  for (const s of SCROLLS) pontos.push({ depth: s.depth, tipo: 'papel', texto: `${s.title} (${s.author}, cron ${s.cron})` });
  for (const g of STORY_GATES) pontos.push({ depth: g.depth, tipo: 'PAREDE', texto: `abre com ${origem.get(g.requires)?.onde ?? g.requires}` });
  for (const layerId of GATE_LAYERS) {
    const l = gateLayerDef(layerId);
    const b = bossForLayer(layerId);
    pontos.push({ depth: l.minDepth - 1, tipo: 'CHEFE', texto: `${b?.name ?? '?'} — selo de ${l.name}` });
  }
  for (const b of BASE_CAMPS) pontos.push({ depth: b.depth, tipo: 'base', texto: b.nome });
  for (const c of CITIES) if (c.implementada) pontos.push({ depth: c.depth, tipo: 'CIDADE', texto: c.name });
  pontos.push({ depth: POSTO_NOVE.depth, tipo: 'posto', texto: 'Posto Nove — Rui Cabeca' });
  for (const m of MISSIONS) pontos.push({ depth: m.depth, tipo: 'missao', texto: m.title });
  pontos.sort((a, b) => a.depth - b.depth || a.tipo.localeCompare(b.tipo));
  for (const p of pontos) {
    console.log(`  ${String(p.depth).padStart(5)} m  ${p.tipo.padEnd(7)} ${p.texto}`);
  }
}

console.log(`\n${erros} erro(s), ${avisos} aviso(s).\n`);
process.exit(erros > 0 ? 1 : 0);
