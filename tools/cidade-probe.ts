/*
 * Sonda da cidade: da para andar ate tudo em Blockia?
 *
 *   npm run cidade
 *
 * POR QUE ELA MANDA NA PLANTA.
 *
 * Blockia passou a ter duas torres subindo uma contra a outra, uma praca em
 * tres patamares e uma ponte no alto. Isso e muito mais interessante de
 * percorrer e MUITO mais facil de quebrar: basta um lance de escada nascer um
 * tile fora do lugar e um andar inteiro vira ilha — com morador dentro,
 * esperando para sempre uma conversa que ninguem pode ter.
 *
 * Nao e hipotese: ja aconteceu duas vezes neste arquivo. "0 de 4 passarelas
 * alcancaveis a pe" e "27 celulas andaveis na cidade inteira" sao medicoes de
 * versoes anteriores desta mesma cidade.
 *
 * Entao aqui a cidade e gerada de verdade e percorrida A PE, com as regras de
 * movimento do jogador: anda de lado, sobe UM tile sozinho, cai de qualquer
 * altura, e precisa de dois tiles livres para o corpo. O que o alagamento nao
 * alcanca, o jogador tambem nao.
 */
import { CONFIG } from '../src/data/config';
import { World } from '../src/world/World';
import { generateWorld } from '../src/world/WorldGen';
import { blockiaLayout, portaBounds, abrirPortaBlockia } from '../src/world/Blockia';
import { BLOCKIA_NPCS } from '../src/data/blockia';
import { BLOCKIA_PROPS } from '../src/data/blockiaProps';
import { BLOCK_IDS } from '../src/data/blocks';

let falhas = 0;
const ok = (cond: boolean, titulo: string, detalhe = ''): boolean => {
  if (cond) console.log(`  ok   ${titulo}`);
  else {
    falhas++;
    console.log(`  FALHA ${titulo}${detalhe ? ` — ${detalhe}` : ''}`);
  }
  return cond;
};

const world = new World();
generateWorld(world);
const SUP = world.surfaceRow;
const planta = blockiaLayout(SUP);
const cfg = CONFIG.blockia;

console.log('\nA PLANTA');
console.log(`  ·    ${planta.patamares.length} patamares de praca, ${planta.decks.length} terracos, ponte: ${planta.ponte ? 'sim' : 'NAO'}`);
for (const p of planta.patamares) {
  console.log(`  ·    patamar  linha ${p.row} (${planta.piso - p.row} acima do centro), cols ${p.col0}-${p.col1}`);
}
for (const d of planta.decks) {
  console.log(`  ·    terraco ${d.lado.padEnd(5)} linha ${d.row}, cols ${d.col0}-${d.col1} (${d.col1 - d.col0} de largura)`);
}
if (planta.ponte) console.log(`  ·    ponte   linha ${planta.ponte.row}, cols ${planta.ponte.col0}-${planta.ponte.col1}`);

console.log('\nA CIDADE TEM ALTURA DE VERDADE');
{
  /*
   * A MEDIDA CERTA E SUPERFICIE, e nao altura — e eu comecei pela errada.
   *
   * Contei alturas distintas e a sonda reprovou uma cidade com quatorze pisos,
   * porque as duas torres compartilham as linhas: oeste e leste sobem na mesma
   * grade. Isso nao e defeito, e o que TORNA a ponte possivel — ponte em
   * diagonal nao existe, entao os dois lados precisam se encontrar na mesma
   * linha.
   *
   * O que o pedido ("varios sobe e desce") realmente cobra e quantos lugares
   * diferentes ha para estar de pe, e quantas alturas o jogador atravessa indo
   * de um canto ao outro.
   */
  const superficies =
    planta.patamares.length + planta.decks.length + (planta.ponte ? 1 : 0);
  ok(superficies >= 12, `${superficies} superficies andaveis diferentes`, 'uma cidade rasa tem poucas');
  const alturas = new Set<number>([
    ...planta.patamares.map((p) => p.row),
    ...planta.decks.map((d) => d.row),
    ...(planta.ponte ? [planta.ponte.row] : []),
  ]);
  ok(alturas.size >= 7, `${alturas.size} alturas distintas`, 'a cidade nao tem a altura que devia');
  const larguras = new Set(planta.decks.map((d) => d.col1 - d.col0));
  ok(larguras.size >= 3, `terracos de ${larguras.size} larguras diferentes`, 'larguras iguais leem como prateleira');
  const lados = new Set(planta.decks.map((d) => d.lado));
  ok(lados.size >= 2, 'a cidade sobe pelos dois lados', 'so uma torre e uma escada, nao uma cidade');
}

/*
 * A PORTA FICA ABERTA PARA ESTA SONDA.
 *
 * Ela nasce selada de proposito (ver PortaBlockia), e com a porta fechada a
 * resposta de "da para andar ate tudo?" seria "nao", sempre — e a sonda estaria
 * medindo a porta em vez da cidade. Quem confere a porta e a secao seguinte.
 */
console.log('\nA PORTA FECHA, E ABRE');
/*
 * A checagem mais importante deste arquivo, porque o erro que ela pega e o
 * unico irreversivel: a porta nasce SELADA, e se ela nao abrir o jogador chega
 * em Blockia aos 600 m e nao entra nunca mais. Progressao travada e o pior tipo
 * de bug que existe — nao da para contornar jogando melhor.
 */
{
  const { col0: pc0, col1: pc1, row0: pr0, row1: pr1 } = portaBounds(SUP);
  let solidos = 0;
  for (let r = pr0; r <= pr1; r++) {
    for (let c = pc0; c <= pc1; c++) if (world.isSolid(c, r)) solidos++;
  }
  const total = (pr1 - pr0 + 1) * (pc1 - pc0 + 1);
  ok(solidos === total, 'a porta nasce fechada de verdade', `${solidos} de ${total} tiles solidos`);

  abrirPortaBlockia(world, SUP);
  let abertos = 0;
  for (let r = pr0; r <= pr1; r++) {
    for (let c = pc0; c <= pc1; c++) if (!world.isSolid(c, r)) abertos++;
  }
  ok(abertos === total, 'e abre por inteiro quando alguem atende', `${abertos} de ${total} tiles livres`);
}

/** Da para o corpo do jogador (2 tiles) ficar de pe nesta celula? */
function cabe(col: number, row: number): boolean {
  if (world.isSolid(col, row)) return false;
  if (world.isSolid(col, row - 1)) return false;
  return true;
}
/** Ha chao nesta celula (a celula de baixo e solida)? */
const temChao = (col: number, row: number): boolean => world.isSolid(col, row + 1);

console.log('\nDA PARA ANDAR ATE TUDO (alagamento a pe)');
const alcancado = new Set<string>();
{
  /*
   * Comeca na porta, que e por onde o jogador entra. Comecar do meio da praca
   * responderia a pergunta errada: "a praca se liga a si mesma?".
   */
  const { col1: portaCol, row1: portaRow } = portaBounds(SUP);
  const fila: [number, number][] = [[portaCol + 1, portaRow]];
  const chave = (c: number, r: number) => `${c},${r}`;
  alcancado.add(chave(portaCol + 1, portaRow));

  const limite0 = cfg.col0 - 4;
  const limite1 = cfg.col1 + 4;
  const topo = SUP + cfg.depth0 - 14;
  const fundo = SUP + cfg.depth1 + 2;

  while (fila.length) {
    const [c, r] = fila.pop() as [number, number];
    const vizinhos: [number, number][] = [
      [c - 1, r],
      [c + 1, r],
      // Sobe um tile sozinho — o passo do jogador vence isso andando.
      [c - 1, r - 1],
      [c + 1, r - 1],
    ];
    /*
     * A ESCADA E O MEIO DE SUBIR NESTA CIDADE, e a primeira versao desta sonda
     * nao sabia disso: ela so andava e subia um tile, entao reprovou os dez
     * terracos de uma vez com "ILHA". A cidade estava certa; a sonda e que
     * estava percorrendo um jogador que nao existe.
     *
     * O `Player` de verdade sobe e desce enquanto houver LADDER na celula.
     */
    if (world.getTile(c, r) === BLOCK_IDS.LADDER) {
      if (world.getTile(c, r - 1) === BLOCK_IDS.LADDER || cabe(c, r - 1)) vizinhos.push([c, r - 1]);
      if (world.getTile(c, r + 1) === BLOCK_IDS.LADDER) vizinhos.push([c, r + 1]);
    }
    // Entrar na escada estando ao lado dela.
    for (const d of [-1, 1]) {
      if (world.getTile(c + d, r) === BLOCK_IDS.LADDER) vizinhos.push([c + d, r]);
    }

    // Cai: de qualquer altura, ate achar chao.
    let q = r;
    while (q < fundo && !world.isSolid(c, q + 1)) q++;
    if (q !== r) vizinhos.push([c, q]);

    for (const [nc, nr] of vizinhos) {
      if (nc < limite0 || nc > limite1 || nr < topo || nr > fundo) continue;
      if (alcancado.has(chave(nc, nr))) continue;
      if (!cabe(nc, nr)) continue;
      /* So conta como lugar de ficar de pe se houver chao, se for degrau de
       * escada, ou se for o fim de uma queda. */
      const naEscada = world.getTile(nc, nr) === BLOCK_IDS.LADDER;
      if (!temChao(nc, nr) && !naEscada && nr !== q) continue;
      alcancado.add(chave(nc, nr));
      fila.push([nc, nr]);
    }
  }
  console.log(`  ·    ${alcancado.size} celulas alcancaveis a pe a partir da porta`);
}

const pisado = (col: number, row: number): boolean => alcancado.has(`${col},${row}`);

console.log('\nTODO NIVEL E ALCANCAVEL');
{
  const niveis: { nome: string; row: number; col0: number; col1: number }[] = [
    ...planta.patamares.map((p, i) => ({ nome: `patamar ${i}`, ...p })),
    ...planta.decks.map((d, i) => ({ nome: `terraco ${i} (${d.lado})`, row: d.row, col0: d.col0, col1: d.col1 })),
    ...(planta.ponte ? [{ nome: 'ponte', row: planta.ponte.row, col0: planta.ponte.col0, col1: planta.ponte.col1 }] : []),
  ];
  for (const n of niveis) {
    let pisadas = 0;
    for (let c = n.col0; c <= n.col1; c++) if (pisado(c, n.row - 1) || pisado(c, n.row)) pisadas++;
    const total = n.col1 - n.col0 + 1;
    ok(
      pisadas > total * 0.5,
      `${n.nome}: andavel (${pisadas}/${total} colunas)`,
      pisadas === 0 ? 'ILHA — nao da para chegar aqui a pe' : `so ${pisadas} de ${total} colunas`
    );
  }
}

console.log('\nTODO MORADOR PODE SER ALCANCADO');
{
  const niveis = [...planta.decks, ...(planta.ponte ? [planta.ponte] : [])];
  for (const n of BLOCKIA_NPCS) {
    const alvo =
      n.nivel === 0
        ? planta.patamares.find((p) => cfg.col0 + n.offset >= p.col0 && cfg.col0 + n.offset <= p.col1) ?? null
        : niveis[n.nivel - 1] ?? null;
    if (!alvo) {
      ok(false, `${n.name}: mora no nivel ${n.nivel}, que nao existe na planta`);
      continue;
    }
    const col = n.nivel === 0 ? cfg.col0 + n.offset : alvo.col0 + n.offset;
    const perto = [-1, 0, 1].some((d) => pisado(col + d, alvo.row - 1) || pisado(col + d, alvo.row));
    ok(perto, `${n.name} (nivel ${n.nivel}, coluna ${col}): da para chegar nele`);
  }
}

console.log('\nTODA PECA DE MOBILIA TEM NIVEL QUE EXISTE');
{
  const niveis = [...planta.decks, ...(planta.ponte ? [planta.ponte] : [])];
  const orfas = BLOCKIA_PROPS.filter((p) => p.nivel !== 0 && !niveis[p.nivel - 1]);
  ok(
    orfas.length === 0,
    'nenhuma peca aponta para um nivel inexistente',
    orfas.map((p) => `${p.id}@${p.nivel}`).join(', ')
  );
}

console.log(falhas === 0 ? '\nBlockia esta inteira e andavel.\n' : `\n${falhas} falha(s).\n`);
process.exit(falhas > 0 ? 1 : 0);
