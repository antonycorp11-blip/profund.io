import { CONFIG } from '../data/config';
import { blockByKey, type BlockDef } from '../data/blocks';
import { layerAt } from '../data/layers';
import { toolFloorAt } from '../data/cities';
import { botDef, type BotId } from '../data/bots';
import type { ResourceId } from '../data/resources';

/**
 * O TURNO DA NOITE.
 *
 * Bot e toupeira continuam trabalhando com o jogo fechado. O pedido veio
 * assim: "o off-line e pra o bot seguir portando e as toupeiras tambem
 * enquanto tiver o game fechado".
 *
 * A DECISAO QUE MANDA NO ARQUIVO INTEIRO: o rendimento offline nao e um numero
 * que eu escolhi. Ele sai das mesmas constantes que o loop online usa —
 * golpes por segundo, poder da copia, hp e valor do bloco daquela camada — e
 * so depois apanha de um fator de eficiencia declarado em CONFIG.
 *
 * Por que isso importa mais aqui do que em qualquer outro lugar do jogo:
 * nenhum jogador consegue conferir o turno da noite. Ele fecha o jogo, abre no
 * dia seguinte e le um numero. Se esse numero for chutado, ele vai estar
 * errado em relacao ao online para sempre e ninguem nunca vai saber — nem eu.
 * Com a conta saindo do dado, `tools/offline-probe.ts` pode rodar a simulacao
 * DE VERDADE por alguns minutos e comparar. E o que ela faz.
 *
 * O QUE ESTE ARQUIVO NAO FAZ, de proposito: simular. Reexecutar oito horas do
 * loop de copia com dt grande nao e "a simulacao real com menos precisao" — e
 * outra simulacao: com dt de meio segundo a copia atravessa parede, porque a
 * colisao e por passo. Uma conta honesta e melhor que uma simulacao mentirosa.
 */

export interface RendimentoBot {
  tipo: BotId;
  nome: string;
  /** Profundidade em que ele estava quando o jogo fechou. */
  depth: number;
  /** Valor por segundo que ele rende parado ali, ja com a eficiencia. */
  valorPorSegundo: number;
  /** Por que ele nao rende nada, quando for o caso. */
  impedido?: string;
}

export interface RelatorioOffline {
  /** Tempo realmente passado, em segundos. */
  segundosReais: number;
  /** Tempo creditado — igual ao real, ou o teto. */
  segundos: number;
  limitado: boolean;
  /** O que os bots trouxeram. */
  itens: [ResourceId, number][];
  /** Quanto isso virou de moeda (ja com o bonus de entrega). */
  moedas: number;
  bots: RendimentoBot[];
  toupeiras: number;
  fatorToupeira: number;
}

/** Os blocos que um bot desse tipo consegue transformar em recurso, e o peso de cada um. */
interface Veio {
  def: BlockDef;
  /** Fracao dos tiles daquela camada que sao deste bloco. */
  peso: number;
}

/**
 * O que ha para minerar naquela profundidade, e em que proporcao.
 *
 * A tabela de minerio da camada da a chance por tile de cada veio; o que sobra
 * e a rocha base. Somar assim e o que faz o bot fundo render mais que o raso
 * sem eu precisar escrever uma tabela de rendimento por camada — que
 * envelheceria no primeiro ajuste de geracao.
 */
function veiosEm(depth: number, coleta: ResourceId[]): Veio[] {
  const layer = layerAt(depth);
  const aceita = new Set<ResourceId>(coleta);
  const veios: Veio[] = [];
  let usado = 0;
  for (const ore of layer.ores) {
    const def = blockByKey(ore.key);
    if (!def) continue;
    /*
     * A CHANCE DA TABELA E DE SEMENTE, NAO DE TILE.
     *
     * O WorldGen sorteia `ore.chance` por tile e, quando acerta, faz crescer
     * um VEIO de `sizeMin..sizeMax` tiles (ver growVein). Eu estava usando a
     * chance como se fosse a fracao de tiles daquele minerio — o que subestima
     * todo minerio por um fator igual ao tamanho medio do veio, cinco ou seis
     * vezes.
     *
     * A sonda mostrou pelo avesso: o Bot Simples rendia 21% MAIS no jogo do
     * que a conta prometia, porque ha muito mais carvao na pedra do que a
     * chance de semente sugere.
     */
    const tamanhoMedio = (ore.sizeMin + ore.sizeMax) / 2;
    const densidade = ore.chance * tamanhoMedio;
    usado += densidade;
    if (depth < def.minDepth || depth > def.maxDepth) continue;
    if (!def.drop || !aceita.has(def.drop)) continue;
    veios.push({ def, peso: densidade });
  }
  const rocha = blockByKey(layer.rockKey);
  const sobra = Math.max(0, 1 - usado);
  if (rocha?.drop && aceita.has(rocha.drop) && sobra > 0) {
    veios.push({ def: rocha, peso: sobra });
  }
  return veios;
}

/**
 * Quanto um bot desse tipo rende por segundo, nessa profundidade.
 *
 * Devolve 0 com um motivo quando ele nao consegue trabalhar — e o motivo
 * aparece no relatorio. Um bot que rendeu zero e o jogador sem saber por que e
 * pior do que um bot que rendeu pouco.
 */
function renderPorSegundo(
  tipo: BotId,
  depth: number,
  poder: number,
  velocidade: number
): { valor: number; itens: Map<ResourceId, number>; impedido?: string } {
  const def = botDef(tipo);
  const itens = new Map<ResourceId, number>();
  const vazio = { valor: 0, itens };

  const veios = veiosEm(depth, def.coleta);
  if (veios.length === 0) {
    return { ...vazio, impedido: 'nao ha nada que ele recolha nesta profundidade' };
  }

  /*
   * A COPIA CAVA COM FERRAMENTA DE NIVEL 3 — fixo, ver Clone.updateMining.
   *
   * Isso importa desde que as cidades viraram porteiras: abaixo de Blockia a
   * rocha so cede a picareta de la, e nivel 3 nao alcanca. Um bot deixado la
   * embaixo nao mina nada online, e por isso nao pode minar nada offline. Sem
   * esta linha o turno da noite pagaria por um trabalho que o jogo proibe.
   */
  const TIER_DA_COPIA = 3;
  const piso = toolFloorAt(depth);
  const podem = veios.filter((v) => Math.max(v.def.minTool, piso) <= TIER_DA_COPIA);
  if (podem.length === 0) {
    return {
      ...vazio,
      impedido:
        piso > TIER_DA_COPIA
          ? `a rocha daqui so cede a picareta da cidade — a copia cava ate o nivel ${TIER_DA_COPIA}`
          : 'a rocha daqui e dura demais para a copia',
    };
  }

  const layer = layerAt(depth);
  const total = podem.reduce((s, v) => s + v.peso, 0);
  const danoPorSegundo = CONFIG.mining.hitsPerSecondBase * velocidade * poder;

  let valor = 0;
  for (const v of podem) {
    const fatia = v.peso / total;
    const hp = v.def.hp * layer.hpMultiplier;
    // Blocos por segundo que este bot quebra SE so houvesse este bloco.
    const blocos = (danoPorSegundo / hp) * fatia;
    const porBloco = ((v.def.dropMin + v.def.dropMax) / 2) * v.def.dropChance;
    const qtd = blocos * porBloco;
    if (!v.def.drop || qtd <= 0) continue;
    itens.set(v.def.drop, (itens.get(v.def.drop) ?? 0) + qtd);
    valor += qtd * v.def.value;
  }
  return { valor, itens };
}

/**
 * Fecha a conta do turno da noite.
 *
 * `segundosReais` vem de `Date.now() - save.savedAt`. Nada aqui le o relogio:
 * funcao que le o relogio por dentro nao se testa, e esta precisa ser testada.
 */
export function calcularOffline(
  segundosReais: number,
  frota: { tipo: BotId; depth: number }[],
  toupeiras: number,
  attrs: { poder: number; velocidade: number; valorEntrega: number }
): RelatorioOffline {
  const cfg = CONFIG.offline;
  const teto = cfg.maxHoras * 3600;
  const segundos = Math.max(0, Math.min(segundosReais, teto));
  const fatorToupeira =
    1 + Math.min(cfg.tetoGanhoToupeira, toupeiras * cfg.ganhoPorToupeira);

  const soma = new Map<ResourceId, number>();
  const bots: RendimentoBot[] = [];
  for (const b of frota) {
    const r = renderPorSegundo(b.tipo, b.depth, attrs.poder, attrs.velocidade);
    const porSegundo = r.valor * cfg.eficiencia * fatorToupeira;
    bots.push({
      tipo: b.tipo,
      nome: botDef(b.tipo).name,
      depth: b.depth,
      valorPorSegundo: porSegundo,
      impedido: r.impedido,
    });
    for (const [id, qtd] of r.itens) {
      const n = qtd * segundos * cfg.eficiencia * fatorToupeira;
      soma.set(id, (soma.get(id) ?? 0) + n);
    }
  }

  /*
   * Arredonda para baixo, item a item, e SO DEPOIS soma o dinheiro.
   *
   * O jogo inteiro trabalha com quantidades inteiras de recurso. Pagar a moeda
   * pelo valor fracionario e depois entregar o inteiro faria o relatorio e o
   * estoque discordarem — e o jogador confere o estoque.
   */
  const itens: [ResourceId, number][] = [];
  for (const [id, qtd] of soma) {
    const n = Math.floor(qtd);
    if (n > 0) itens.push([id, n]);
  }

  return {
    segundosReais,
    segundos,
    limitado: segundosReais > teto,
    itens,
    // A moeda e calculada por quem paga (BaseStock.deliver), nao aqui: uma
    // segunda formula de preco e uma segunda formula para divergir.
    moedas: 0,
    bots,
    toupeiras,
    fatorToupeira,
  };
}

/** "3 h 12 min" — o relatorio fala em tempo de gente, nao em segundos. */
export function formatarDuracao(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  if (m > 0) return `${m} min`;
  return `${Math.floor(segundos)} s`;
}
