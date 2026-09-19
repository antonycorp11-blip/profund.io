/**
 * TIPOS DE BOT.
 *
 * Antes cada copia era uma maquina generica que o jogador CONFIGURAVA: escolhe
 * o foco, marca seis caixinhas de minerio, arrasta o raio. Tres decisoes por
 * unidade, repetidas a cada nova unidade, e nenhuma delas interessante depois
 * da primeira vez — o jogador acabava clonando a mesma configuracao.
 *
 * Agora o TIPO carrega o comportamento. Comprar um bot passa a ser a decisao,
 * e ela e uma so: qual deles eu preciso agora? O bot simples pega pedra e
 * carvao; os seguintes alcancam minerio mais fundo. Isso tambem da a escada
 * que faltava — ter tres bots simples deixa de ser o mesmo que ter um bom.
 *
 * E e o que permite o cartao encolher: sem configuracao, ele so precisa dizer
 * QUEM e o bot e o que ele esta fazendo, e ai cabem cinco numa grade.
 */

import type { ResourceId } from './resources';

export type BotId = 'bot_simples' | 'bot_reforcado' | 'bot_profundo' | 'bot_prisma';

export interface BotDef {
  id: BotId;
  name: string;
  /** Uma linha sobre para que ele serve. */
  description: string;
  /** O que ele recolhe. O resto do chao ele ignora. */
  coleta: ResourceId[];
  /** Quanto cabe na mochila dele. */
  capacity: number;
  /** Raio de trabalho em tiles a partir de onde foi solto. */
  radius: number;
  /** Multiplicador de velocidade de mineracao. */
  power: number;
  /** Preco em moedas. */
  cost: number;
  /** Profundidade ja alcancada para ele aparecer na oficina. */
  requiredDepth: number;
  /** Chassi da arte (`art/auto/<arte>.png`). */
  arte: string;
  /** Cor da tarja do cartao — e o que separa um bot do outro de relance. */
  tint: string;
}

/**
 * CAMARAS DA COPIADORA: quantos bots cabem de pe ao mesmo tempo.
 *
 * ISTO ESTEVE QUEBRADO E O ERRO FOI MEU, no mesmo commit em que eu construi o
 * sistema de vagas das toupeiras (e21f589). O limite de copia era `base: 1,
 * max: 6` — exatamente os numeros das toupeiras — e eu troquei por `99/99`
 * com o comentario "a camara nao limita mais, o freio e o preco".
 *
 * Duas coisas deram errado nessa troca:
 *
 *  1. O freio que eu prometi afrouxou depois. O preco crescia 1,6 sobre a
 *     FROTA inteira; virou 1,25 sobre cada TIPO. O unico limite que restava
 *     ficou tres vezes mais fraco, e ninguem voltou para reconferir o 99.
 *  2. Ficou de cabeca para baixo. A toupeira custa 250 e cabiam 6; o bot custa
 *     800 e cabiam 99. O ajudante BARATO era o raro, e o caro era o
 *     ilimitado — o oposto do que qualquer economia faz.
 *
 * E mais: `create()` ainda dizia "Sem camara livre na copiadora" para um
 * limite que nao podia disparar. Mensagem de erro para um caso impossivel.
 *
 * A regra agora e irma da das toupeiras, e pela mesma razao concreta: ajudante
 * precisa de lugar. A toupeira precisa de onde ENTREGAR (deposito); o bot
 * precisa de onde ser IMPRESSO (camara). As duas vagas se conquistam
 * construindo, e nao esperando dinheiro acumular.
 *
 * A conta no fim do jogo: 23 bots contra 61 toupeiras. O barato e o comum.
 */
export const COPIADORA = {
  /** Camaras da copiadora recem-pesquisada, sem base nenhuma montada. */
  camarasBase: 3,
  /** Cada deposito de base construido abre estas camaras. */
  camarasPorDeposito: 2,
  /** E cada deposito MELHORADO abre mais estas. */
  camarasPorDepositoMelhorado: 2,
} as const;

export const BOTS: BotDef[] = [
  {
    id: 'bot_simples',
    name: 'Bot Simples',
    description: 'Pedra e carvao, sem frescura. O primeiro par de bracos extra.',
    coleta: ['stone', 'coal'],
    capacity: 24,
    radius: 14,
    power: 1,
    cost: 800,
    requiredDepth: 0,
    arte: 'copia_aco',
    tint: '#8d8d95',
  },
  {
    id: 'bot_reforcado',
    name: 'Bot Reforcado',
    description: 'Braco de cobre: alcanca cobre e ferro alem do basico.',
    coleta: ['stone', 'coal', 'copper', 'iron'],
    capacity: 36,
    radius: 20,
    power: 1.4,
    cost: 2600,
    requiredDepth: 120,
    arte: 'copia_cobre',
    tint: '#c0713a',
  },
  {
    id: 'bot_profundo',
    name: 'Bot Profundo',
    description: 'Aguenta o calor do fundo e traz ouro junto.',
    coleta: ['coal', 'copper', 'iron', 'gold'],
    capacity: 48,
    radius: 26,
    power: 1.9,
    cost: 7200,
    requiredDepth: 360,
    arte: 'copia_roxa',
    tint: '#d9a828',
  },
  {
    id: 'bot_prisma',
    name: 'Bot Prisma',
    description: 'So o que vale a pena: cristal, rubi e o que brilhar mais fundo.',
    coleta: ['gold', 'crystal', 'ruby'],
    capacity: 60,
    radius: 32,
    power: 2.6,
    cost: 18000,
    requiredDepth: 463,
    arte: 'copia_roxa',
    tint: '#8c5ce0',
  },
];

export function botDef(id: BotId): BotDef {
  return BOTS.find((b) => b.id === id) ?? BOTS[0];
}

/** O tipo mais caro que o jogador ja pode comprar nesta profundidade. */
export function melhorBotAte(profundidade: number): BotDef {
  const liberados = BOTS.filter((b) => b.requiredDepth <= profundidade);
  return liberados[liberados.length - 1] ?? BOTS[0];
}
