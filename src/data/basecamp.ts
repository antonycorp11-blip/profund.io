import type { ResourceId } from './resources';

/**
 * BASES DE EXTRACAO.
 *
 * A ideia: a partir do Cristal (200 m), o jogador para de carregar minerio nas
 * costas por 200 metros. Ele monta uma base NO LUGAR — as toupeiras entregam
 * ali mesmo, o refinador processa ali, e a esteira sobe o refinado ate o
 * elevador. Forma-se uma pool enorme embaixo que paga a cota sozinha enquanto
 * ele desce mais.
 *
 * Tres regras de design que valem escrever:
 *
 * 1. O JOGO ESCOLHE ONDE. O jogador nao posiciona nada. Cada base tem os
 *    encaixes prontos, na ordem certa, e construir e so bater com a picareta
 *    no lugar marcado. Deixar o jogador posicionar esteira num jogo de tela
 *    pequena e convite para uma base torta que nao liga em nada.
 *
 * 2. CONSTRUIR CUSTA PICARETADA E TEMPO. Nada nasce pronto ao pagar. O
 *    material some na hora, e a estrutura leva golpes e segundos para ficar de
 *    pe. E o que faz a base parecer construida, e nao comprada.
 *
 * 3. CONSTRUIR E COM BRUTO. MELHORAR E COM REFINADO.
 *
 *    Erguer qualquer coisa aqui custa o que sai da picareta: ferro, pedra,
 *    carvao, ouro, cristal. Material REFINADO nunca aparece num custo de obra,
 *    e isso e regra, nao balanceamento — cobrar refinado para construir era
 *    pedir ao jogador que usasse a saida da fabrica para montar a fabrica.
 *    Deu trava dura duas vezes seguidas, por dois caminhos diferentes.
 *
 *    O refinado tem o outro lugar, e e o lugar certo dele: MELHORAR o que ja
 *    esta de pe. Ai ele faz sentido — a maquina que produz o refinado e a que
 *    fica melhor com ele.
 *
 * 4. O PRIMEIRO REFINADOR JA ESTA LA, VELHO. Ele rende um terco do que
 *    deveria, e so a melhoria dele tira esse freio. E o gargalo que da vontade
 *    de melhorar a base — e agora a melhoria e literalmente paga com o que
 *    esse refinador cospe.
 *
 * ENERGIA e carvao queimado. Nao ha rede eletrica, nao ha bateria: o refinador
 * queima carvao, o fogo move tudo. Carvao era o recurso mais chato do jogo
 * (comum, barato, enche mochila) e vira o combustivel de que tudo depende.
 */

export type StructureKind =
  | 'refinador'
  | 'deposito'
  | 'esteira_entrada'
  | 'esteira_saida'
  | 'elevador'
  | 'casa_capataz'
  | 'poste';

export interface StructureSlot {
  kind: StructureKind;
  /** Colunas a partir da borda esquerda da camara. */
  col: number;
  /** Quantos tiles de largura ele ocupa (para desenhar e para a colisao). */
  tiles: number;
  /** Custo para erguer. SO BRUTO — ver a regra 3 no topo do arquivo. */
  cost: Partial<Record<ResourceId, number>>;
  /**
   * Melhoria: o segundo nivel da estrutura, pago em REFINADO.
   *
   * Quem nao tem melhoria nao precisa de uma: deposito e caixa, poste e luz.
   */
  melhoria?: {
    cost: Partial<Record<ResourceId, number>>;
    hits: number;
    buildSec: number;
    /** O que muda, em uma linha, para o jogador saber se vale. */
    ganho: string;
  };
  /** Marteladas necessarias. */
  hits: number;
  /** Segundos de obra depois da ultima martelada. */
  buildSec: number;
  /** Precisa destes outros de pe antes de liberar. */
  requires: StructureKind[];
  nome: string;
  /** O que ele faz, em uma linha, para a tela de construcao. */
  descricao: string;
}

export interface BaseCampDef {
  id: string;
  nome: string;
  layer: string;
  /** Profundidade da camara, em metros. */
  depth: number;
  /** Coluna da borda esquerda. */
  col: number;
  largura: number;
  altura: number;
  slots: StructureSlot[];
}

/**
 * A cadeia, na ordem em que ela se monta:
 *
 *   refinador velho (ja la)
 *      -> deposito bruto      : as toupeiras passam a entregar aqui
 *      -> esteira de entrada  : deposito alimenta o refinador
 *      -> esteira de saida    : refinador alimenta o elevador
 *      -> elevador            : o refinado sobe e vira moeda
 *
 * Casa do capataz e poste sao opcionais: conforto e luz, nao producao.
 */
const SLOTS_PADRAO: StructureSlot[] = [
  {
    kind: 'refinador',
    col: 12,
    tiles: 3,
    cost: { iron: 40, crystal: 10 },
    hits: 30,
    buildSec: 45,
    requires: [],
    melhoria: {
      cost: { coal_coke: 14, gold_bar: 4 },
      hits: 26,
      buildSec: 50,
      ganho: 'Tira o freio do refinador velho: quase tres vezes mais refinado.',
    },
    nome: 'Refinador',
    descricao: 'Queima carvao e transforma minerio bruto em refinado.',
  },
  {
    kind: 'deposito',
    col: 4,
    tiles: 4,
    /*
     * Este deposito ja custou Coque, e foi a primeira trava dura do jogo:
     * Coque so sai de refinaria, a refinaria da base so processa com a esteira
     * de entrada, e a esteira de entrada exige o deposito. Ele exigia a si
     * mesmo por um caminho de tres passos.
     *
     * Hoje isso nao pode acontecer com estrutura nenhuma — obra e paga em
     * bruto, sempre. Mas o comentario fica, porque foi esse bug que ensinou a
     * regra.
     */
    cost: { iron: 25, stone: 40 },
    hits: 24,
    buildSec: 30,
    requires: ['refinador'],
    nome: 'Deposito Bruto',
    descricao: 'As toupeiras passam a entregar aqui em vez de subir ate a base.',
  },
  {
    kind: 'esteira_entrada',
    col: 8,
    tiles: 4,
    cost: { iron: 30, coal: 40 },
    hits: 20,
    buildSec: 25,
    requires: ['deposito'],
    melhoria: {
      cost: { coal_coke: 10 },
      hits: 16,
      buildSec: 30,
      ganho: 'Alimenta o refinador mais rapido: +60% de bruto na boca do fogo.',
    },
    nome: 'Esteira de Entrada',
    descricao: 'Leva o bruto do deposito ate o refinador, sozinha.',
  },
  {
    kind: 'esteira_saida',
    col: 16,
    tiles: 5,
    cost: { iron: 35, gold: 12 },
    hits: 20,
    buildSec: 25,
    requires: ['esteira_entrada'],
    melhoria: {
      cost: { gold_bar: 5 },
      hits: 16,
      buildSec: 30,
      ganho: 'Entrega mais refinado ao elevador por segundo.',
    },
    nome: 'Esteira de Saida',
    descricao: 'Leva o refinado do refinador ate o elevador.',
  },
  {
    kind: 'elevador',
    col: 22,
    tiles: 3,
    cost: { iron: 60, gold: 20, crystal: 14 },
    hits: 40,
    buildSec: 70,
    requires: ['esteira_saida'],
    melhoria: {
      cost: { crystal_prism: 6, gold_bar: 6 },
      hits: 30,
      buildSec: 80,
      ganho: 'Cabine maior: sobe bem mais carga em cada viagem.',
    },
    nome: 'Elevador de Carga',
    descricao: 'Sobe o refinado ate a superficie. La em cima, vira moeda.',
  },
  {
    kind: 'casa_capataz',
    col: 27,
    tiles: 6,
    cost: { iron: 20, stone: 60 },
    hits: 18,
    buildSec: 40,
    requires: ['elevador'],
    nome: 'Casa do Capataz',
    descricao: 'Alguem precisa morar aqui para a base rodar sem voce.',
  },
  {
    kind: 'poste',
    col: 34,
    tiles: 1,
    cost: { crystal: 4 },
    hits: 8,
    buildSec: 10,
    requires: [],
    nome: 'Poste de Cristal',
    descricao: 'Luz. So isso — e faz mais diferenca do que parece.',
  },
];

/**
 * Escala o custo de uma base pela profundidade.
 *
 * A mesma esteira custa mais fundo. Nao e taxa: e o que impede o jogador de
 * chegar no abismo com ferro de superficie e montar tudo num dia. Cada base
 * nova quer material da camada em que ela esta.
 */
function escalar(slots: StructureSlot[], mult: number, extra?: Partial<Record<ResourceId, number>>): StructureSlot[] {
  const escalarCusto = (c: Partial<Record<ResourceId, number>>, ex?: Partial<Record<ResourceId, number>>) =>
    Object.fromEntries(
      Object.entries({ ...c, ...ex }).map(([k, v]) => [k, Math.round((v ?? 0) * mult)])
    ) as Partial<Record<ResourceId, number>>;
  return slots.map((s) => ({
    ...s,
    hits: Math.round(s.hits * (1 + (mult - 1) * 0.4)),
    buildSec: Math.round(s.buildSec * (1 + (mult - 1) * 0.5)),
    // O `extra` da camada entra so na OBRA. Melhoria e refinado por definicao,
    // e rubi bruto numa melhoria quebraria a regra 3 sem que ninguem notasse.
    cost: escalarCusto(s.cost, extra),
    melhoria: s.melhoria
      ? {
          ...s.melhoria,
          cost: escalarCusto(s.melhoria.cost),
          hits: Math.round(s.melhoria.hits * (1 + (mult - 1) * 0.4)),
          buildSec: Math.round(s.melhoria.buildSec * (1 + (mult - 1) * 0.5)),
        }
      : undefined,
  }));
}

/*
 * Uma base por camada, da segunda em diante.
 *
 * Todas ficam a ~36 m DEPOIS do selo da camada: o jogador derruba o guardiao,
 * anda um pouco e encontra o lugar onde vai montar a proxima operacao. E o
 * respiro entre a luta e a descida seguinte.
 *
 * As colunas ficam na metade esquerda do mundo de proposito — Blockia ocupa
 * 132 a 232 nos Minerais, e uma base em cima dela seria uma briga por espaco.
 */
export const BASE_CAMPS: BaseCampDef[] = [
  {
    id: 'base_cristal',
    nome: 'Base do Cristal',
    layer: 'crystal',
    depth: 236,
    col: 30,
    largura: 38,
    altura: 9,
    slots: SLOTS_PADRAO,
  },
  {
    id: 'base_minerais',
    nome: 'Base dos Minerais',
    layer: 'minerals',
    depth: 536,
    col: 26,
    largura: 38,
    altura: 9,
    slots: escalar(SLOTS_PADRAO, 2),
  },
  {
    id: 'base_magma',
    nome: 'Base do Magma',
    layer: 'magma',
    depth: 936,
    // Afastada das salas de pista: a sala escavada da pista abria um buraco no
    // piso da base e deixava 11 colunas intransitaveis.
    col: 74,
    largura: 38,
    altura: 9,
    slots: escalar(SLOTS_PADRAO, 3.2, { ruby: 4 }),
  },
  {
    id: 'base_ruinas',
    nome: 'Base das Ruinas',
    layer: 'ruins',
    depth: 1336,
    col: 74,
    largura: 38,
    altura: 9,
    slots: escalar(SLOTS_PADRAO, 4.6, { relic: 3 }),
  },
  {
    id: 'base_abismo',
    nome: 'Base do Abismo',
    layer: 'abyss',
    depth: 1736,
    col: 74,
    largura: 38,
    altura: 9,
    slots: escalar(SLOTS_PADRAO, 6, { voidstone: 4 }),
  },
];

export function baseCampsOfLayer(layerId: string): BaseCampDef[] {
  return BASE_CAMPS.filter((b) => b.layer === layerId);
}

/** Quanto carvao o refinador queima por segundo enquanto processa. */
export const REFINERY_FUEL_PER_SEC = 0.35;
/** Quantos itens brutos ele converte por segundo, com fogo aceso. */
export const REFINERY_RATE = 0.8;
/** Quanto o refinador VELHO rende antes de ser melhorado. */
export const OLD_REFINERY_PENALTY = 0.35;
