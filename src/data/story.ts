/**
 * Conteudo narrativo: paginas do caderno de Santiago e mineiros perdidos.
 * Coordenadas em TILES (col, row). row = CONFIG.world.surfaceRow + profundidade_em_metros.
 *
 * CANONE: ver BIBLIA.md. O protagonista e Elias Ramires, 22. O pai e Santiago
 * Ramires, sumiu ha 14 anos. John Calder, melhor amigo de Santiago, sumiu ONZE
 * DIAS ANTES — Santiago desceu atras dele, e esse e o segredo que o jogo vai
 * soltando aos poucos.
 *
 * Os mineiros presos NAO sao moradores das cidades subterraneas. Sao gente que
 * se perdeu voltando, ou que entrou procurando as cidades, ou que nem sabe que
 * elas existem. Por isso eles podem ser resgatados sem contrariar o pilar 2.2
 * da biblia: quem escolheu ficar mora em Blockia, nao debaixo de um desabamento.
 *
 * O LOOP: cada um deles entrega uma peca sobre Santiago, e a peca seguinte
 * esta mais fundo. Para ir mais fundo o jogador precisa evoluir. O vicio nasce
 * dai — a curiosidade puxa a economia, e nao o contrario.
 *
 * Cada mineiro pertence a uma CAMADA (`layer`). O BiomeGate exige TODOS os
 * mineiros daquela camada resgatados, mais o chefe morto, para abrir o selo.
 */

import { BLOCKIA_NPCS } from './blockia';

export interface DialogLine {
  speaker: string;
  text: string;
}

export interface ClueDef {
  id: string;
  /** Nome curto exibido no registro. */
  title: string;
  /** Posicao do objeto interativo (em tiles). */
  col: number;
  row: number;
  /** Sala escavada ao redor: largura x altura em tiles. */
  roomW: number;
  roomH: number;
  prompt: string;
  lines: DialogLine[];
  /** Texto do toast ao registrar a pista. */
  logEntry: string;
  /** Camada onde a pista vive (so para organizacao/telemetria; nao bloqueia nada). */
  layer: string;
}

export interface RescueNpcDef {
  id: string;
  name: string;
  col: number;
  row: number;
  roomW: number;
  roomH: number;
  /** Quantos tiles solidos ao redor precisam ser removidos para libertar. */
  freeRadius: number;
  /**
   * O que ele grita enquanto o jogador se aproxima, do MAIS LONGE para o mais
   * perto. E assim que se acha um mineiro preso: pelo ouvido, nao pelo mapa.
   */
  callLines: string[];
  trappedLines: DialogLine[];
  freedLines: DialogLine[];
  /** Para onde ele caminha depois de livre (offset em tiles a partir da posicao). */
  walkToOffsetCols: number;
  safeLines: DialogLine[];
  /** Camada onde ele foi preso — o BiomeGate exige TODOS os desta camada resgatados. */
  layer: string;
  /**
   * O sistema que ele ensina ao ser resgatado.
   *
   * O jogo nao explicava nada: toupeira, copia, atributo e habilidade
   * apareciam como botao numa tela e cabia ao jogador adivinhar. Quem ensina
   * agora e quem foi tirado de debaixo da pedra — alguem com motivo para
   * saber, e com motivo para retribuir. O primeiro ensina toupeira porque e o
   * que resolve o problema que o jogador tem no minuto seguinte: mochila
   * cheia e minerio no chao.
   */
  teaches?: { titulo: string; texto: string };
  /**
   * Base onde ele vai trabalhar depois de resgatado.
   *
   * Jonas e Vilma nao voltam para a superficie ficar parados num canto do
   * acampamento. Eles descem e tocam a base — que e o que eles queriam desde o
   * comeco: chegar mais fundo. E a diferenca deles para uma copia e que eles
   * tem OPINIAO sobre o trabalho, e um bonus que vem disso.
   */
  worksAt?: { base: string; bonus: 'refino' | 'elevador'; fala: string[] };
}

/**
 * As paginas do caderno de Santiago (BIBLIA.md secao 14).
 *
 * Sao 12 no canone; estas 6 sao as que ja tem lugar no mundo gerado. A regra de
 * escrita da biblia vale para todas: cada pagina entrega uma resposta E uma
 * pergunta nova. Nenhuma delas diz onde Santiago esta.
 */
export const CLUES: ClueDef[] = [
  {
    id: 'clue_marca_do_pai',
    title: 'A marca do pai',
    col: 46,
    row: 18 + 26,
    roomW: 9,
    roomH: 5,
    prompt: 'Examinar marca',
    lines: [
      { speaker: 'Elias', text: 'Duas linhas e um corte no meio... igual ao caderno.' },
      { speaker: 'Elias', text: 'Ele marcava a volta. Sempre dizia para marcar a volta.' },
      { speaker: 'Elias', text: 'Entao por que a proxima marca aponta para baixo?' },
    ],
    logEntry: 'Pista registrada: A marca do pai (62 m)',
    layer: 'stone',
  },
  {
    id: 'clue_trilhos',
    title: 'Trilhos reparados',
    col: 88,
    row: 18 + 112,
    roomW: 9,
    roomH: 5,
    prompt: 'Examinar trilho',
    lines: [
      { speaker: 'Elias', text: 'Um trilho de minerio. Torto, velho... e remendado.' },
      { speaker: 'Elias', text: 'Solda nova em ferro velho. Isso tem semanas, nao decadas.' },
      { speaker: 'Elias', text: 'A companhia fechou tudo isto ha quatorze anos.' },
      { speaker: 'Elias', text: 'Entao quem consertou?' },
    ],
    logEntry: 'Pista registrada: Trilhos reparados (112 m)',
    layer: 'stone',
  },
  {
    id: 'clue_pagina_01',
    title: 'Pagina 01 — O padrao',
    col: 50,
    row: 18 + 230,
    roomW: 8,
    roomH: 5,
    prompt: 'Ler pagina',
    lines: [
      { speaker: 'Caderno', text: '"John ouviu de novo. Tres pulsos longos, dois curtos."' },
      { speaker: 'Caderno', text: '"Eu disse que era pressao nas galerias. Ele perguntou por que a pressao repetiria o mesmo padrao por quatro noites."' },
      { speaker: 'Elias', text: 'John? O caderno ja falou dele tres vezes.' },
      { speaker: 'Elias', text: 'Minha mae disse que os dois sumiram juntos.' },
    ],
    logEntry: 'Pagina 01 do caderno recuperada (230 m)',
    layer: 'crystal',
  },
  {
    id: 'clue_pagina_02',
    title: 'Pagina 02 — Mapas mentirosos',
    col: 45,
    row: 18 + 560,
    roomW: 8,
    roomH: 5,
    prompt: 'Ler pagina',
    lines: [
      { speaker: 'Caderno', text: '"Ha pegadas humanas abaixo do nivel onde a companhia jura que nao existe mais nada."' },
      { speaker: 'Caderno', text: '"Os mapas acabam. Os tuneis nao."' },
      { speaker: 'Elias', text: 'Pegadas. Ele escreveu isso ha quatorze anos.' },
      { speaker: 'Elias', text: 'E tem pegadas frescas no chao onde eu estou parado agora.' },
    ],
    logEntry: 'Pagina 02 do caderno recuperada (560 m)',
    layer: 'minerals',
  },
  {
    id: 'clue_pagina_04',
    title: 'Pagina 04 — John',
    col: 48,
    row: 18 + 940,
    roomW: 9,
    roomH: 5,
    prompt: 'Ler pagina',
    lines: [
      { speaker: 'Caderno', text: '"John nao esta fugindo. Esta seguindo alguma coisa."' },
      { speaker: 'Caderno', text: '"Encontrei os mesmos tres pulsos no metal das ruinas. Nao consigo ouvir, mas o medidor se move antes do som."' },
      { speaker: 'Elias', text: 'Ele nao desceu com o John.' },
      { speaker: 'Elias', text: 'Ele desceu ATRAS do John. Isso muda tudo.' },
    ],
    logEntry: 'Pagina 04 do caderno recuperada (940 m)',
    layer: 'magma',
  },
  {
    id: 'clue_pagina_07',
    title: 'Pagina 07 — A estrutura',
    col: 50,
    row: 18 + 1340,
    roomW: 9,
    roomH: 6,
    prompt: 'Ler pagina',
    lines: [
      { speaker: 'Elias', text: 'Simbolos na parede. Nenhuma ferramenta humana fez isso.' },
      { speaker: 'Caderno', text: '"A estrutura nao esta enterrada na mina. A mina cresceu ao redor dela."' },
      { speaker: 'Elias', text: 'Ele escreveu isso como quem anota o clima.' },
      { speaker: 'Elias', text: 'Pai, o que voce achou aqui embaixo?' },
    ],
    logEntry: 'Pagina 07 do caderno recuperada (1340 m)',
    layer: 'ruins',
  },
  {
    id: 'clue_pagina_10',
    title: 'Pagina 10 — O medo',
    col: 46,
    row: 18 + 1740,
    roomW: 8,
    roomH: 5,
    prompt: 'Ler pagina',
    lines: [
      { speaker: 'Caderno', text: '"Pela primeira vez quero voltar."' },
      { speaker: 'Caderno', text: '"Pela primeira vez tambem sei que nao vou."' },
      { speaker: 'Elias', text: '...' },
      { speaker: 'Elias', text: 'Ele sabia. Ele sabia e continuou assim mesmo.' },
      { speaker: 'Elias', text: 'Eu preciso saber o que estava do outro lado.' },
    ],
    logEntry: 'Pagina 10 do caderno recuperada (1740 m)',
    layer: 'abyss',
  },
];

/**
 * Mineiros perdidos.
 *
 * Nenhum deles e morador de cidade. Cada um entrega UMA peca sobre Santiago e
 * aponta, sem querer, para a peca seguinte — que esta sempre mais fundo.
 */
export const RESCUE_NPCS: RescueNpcDef[] = [
  {
    id: 'npc_jonas',
    name: 'Jonas',
    col: 74,
    row: 18 + 38,
    roomW: 5,
    roomH: 4,
    freeRadius: 1,
    callLines: [
      '(alguma coisa bate na pedra, longe)',
      '...tem... alguem ai?...',
      'EI! Aqui embaixo!',
      'AQUI! Segue a minha voz!',
    ],
    trappedLines: [
      { speaker: 'Jonas', text: 'Ei! Tem alguem ai? Estou preso!' },
      { speaker: 'Jonas', text: 'A galeria desabou. Quebra essas pedras, por favor!' },
    ],
    freedLines: [
      { speaker: 'Jonas', text: 'Consegui... obrigado. Achei que ficaria aqui pra sempre.' },
      { speaker: 'Jonas', text: 'Deixa eu sair desse buraco primeiro.' },
    ],
    safeLines: [
      { speaker: 'Jonas', text: 'Ramires. Voce e filho do Santiago, ne? Tem a cara dele.' },
      { speaker: 'Elias', text: 'Voce conheceu meu pai?' },
      { speaker: 'Jonas', text: 'Vi ele uma vez, quatorze anos atras, descendo com pressa.' },
      { speaker: 'Jonas', text: 'Perguntei se ele tinha visto o desabamento la em cima. Nem olhou pra mim.' },
      { speaker: 'Jonas', text: 'Quem desce com pressa nao esta procurando pedra.' },
      { speaker: 'Jonas', text: 'Olha, eu te devo uma. Fica com as minhas toupeiras.' },
      { speaker: 'Elias', text: 'Toupeiras?' },
      { speaker: 'Jonas', text: 'Elas recolhem o que voce larga no chao quando a mochila enche.' },
      { speaker: 'Jonas', text: 'Atravessam a rocha. Nao pergunta como. Olha no botao COPIAS.' },
      { speaker: 'Elias', text: 'Entao eu sigo por onde ele foi.' },
      { speaker: 'Jonas', text: 'Segue nada. Mais uns metros e tem uma parede que picareta nao arranha.' },
      { speaker: 'Elias', text: 'Uma parede?' },
      { speaker: 'Jonas', text: 'E tem coisa viva guardando ela. Foi o que me deixou preso aqui.' },
      { speaker: 'Jonas', text: 'Derruba o bicho e a parede cede. Nao me pergunta por que. Vou esperar na base.' },
    ],
    walkToOffsetCols: -2,
    worksAt: {
      base: 'base_cristal',
      bonus: 'refino',
      fala: [
        'Eu cuido do fogo. Carvao na boca, fogo alto, refinador rodando.',
        'Passei quatro dias debaixo de pedra pensando em ter um trabalho assim.',
        'Nao me manda de volta pra cima. Aqui eu sirvo pra alguma coisa.',
      ],
    },
    teaches: { titulo: 'TOUPEIRAS', texto: 'Jonas deixou as toupeiras dele com voce. Elas recolhem sozinhas o minerio que voce largou no chao. Abra COPIAS para contratar e melhorar.' },
    layer: 'stone',
  },
  {
    id: 'npc_vilma',
    name: 'Vilma',
    col: 80,
    row: 18 + 260,
    roomW: 5,
    roomH: 4,
    freeRadius: 1,
    callLines: [
      '(um tilintar de cristal, ritmado)',
      '...alguem escuta?...',
      'Aqui! Cuidado com as lascas!',
      'AQUI! Nao pisa forte, isso tudo cede!',
    ],
    trappedLines: [
      { speaker: 'Vilma', text: 'Cuidado! Os cristais aqui cortam fundo.' },
      { speaker: 'Vilma', text: 'Um bloco caiu na minha perna. Nao consigo me mexer.' },
    ],
    freedLines: [
      { speaker: 'Vilma', text: 'Obrigada. Achei que ninguem mais descia ate aqui.' },
      { speaker: 'Vilma', text: 'Espera eu recuperar o folego.' },
    ],
    safeLines: [
      { speaker: 'Vilma', text: 'Eu nao me perdi. Eu estava procurando.' },
      { speaker: 'Elias', text: 'Procurando o que?' },
      { speaker: 'Vilma', text: 'As lanternas azuis. Meu tio jurava que existiam, bem mais fundo.' },
      { speaker: 'Vilma', text: 'Todo mundo ria. Ai eu vi uma luz la embaixo que nao era minha.' },
      { speaker: 'Vilma', text: 'Se voce descer o bastante, olha pra baixo antes de acender a sua.' },
    ],
    walkToOffsetCols: -2,
    worksAt: {
      base: 'base_cristal',
      bonus: 'elevador',
      fala: [
        'O elevador nao e forca, e ritmo. Carrega demais e ele emperra no meio.',
        'Eu conto o peso de cada subida. Ninguem mais aqui conta.',
        'E olha: continuo procurando as lanternas azuis. So estou mais perto agora.',
      ],
    },
    teaches: { titulo: 'COPIAS', texto: 'Vilma mostrou como usar a copiadora. Uma copia sua minera sozinha enquanto voce esta noutro lugar. Abra COPIAS.' },
    layer: 'crystal',
  },
  {
    id: 'npc_teo',
    name: 'Teo',
    col: 82,
    row: 18 + 600,
    roomW: 5,
    roomH: 4,
    freeRadius: 1,
    callLines: [
      '(tres batidas secas, pausa, tres batidas)',
      '...aqui embaixo!...',
      'Segue a batida! Tres e para!',
      'AQUI! Eu bato, voce cava!',
    ],
    trappedLines: [
      { speaker: 'Teo', text: 'Aqui embaixo! O teto cedeu bem em cima de mim.' },
      { speaker: 'Teo', text: 'Minhas ferramentas ficaram do outro lado. Preciso de uma mao.' },
    ],
    freedLines: [
      { speaker: 'Teo', text: 'Ainda inteiro. Foi por pouco.' },
      { speaker: 'Teo', text: 'Deixa eu recolher o que sobrou daqui.' },
    ],
    safeLines: [
      { speaker: 'Teo', text: 'Eu vendia ferramenta na superficie. Boa ferramenta.' },
      { speaker: 'Teo', text: 'Um sujeito desceu por aqui e comprou tudo que eu tinha de corda e polvora.' },
      { speaker: 'Elias', text: 'Quando?' },
      { speaker: 'Teo', text: 'Quatorze anos. Nao era o Santiago, antes que pergunte. Era o outro.' },
      { speaker: 'Teo', text: 'O Santiago passou depois. Bem depois. Procurando pelo primeiro.' },
    ],
    walkToOffsetCols: -2,
    teaches: { titulo: 'ATRIBUTOS', texto: 'Teo explicou a ficha. Cada nivel da pontos; gaste em ATRIBUTOS para bater mais forte, carregar mais e aguentar mais.' },
    layer: 'minerals',
  },
  {
    id: 'npc_ozias',
    name: 'Ozias',
    col: 85,
    row: 18 + 980,
    roomW: 5,
    roomH: 4,
    freeRadius: 1,
    callLines: [
      '(um assobio rouco, quase sem ar)',
      '...calor... demais...',
      'Aqui! Vem pelo lado frio!',
      'AQUI! Anda, rapaz, eu to assando!',
    ],
    trappedLines: [
      { speaker: 'Ozias', text: '(tossindo) Aqui... o calor deste lugar nao e normal.' },
      { speaker: 'Ozias', text: 'A rocha em cima de mim ainda esta quente. Rapido, por favor.' },
    ],
    freedLines: [
      { speaker: 'Ozias', text: 'Achei que ia assar aqui dentro.' },
      { speaker: 'Ozias', text: 'Da um instante. Preciso me refazer.' },
    ],
    safeLines: [
      { speaker: 'Ozias', text: 'Eu levava carga. Rota longa, gente que paga bem e nao faz pergunta.' },
      { speaker: 'Ozias', text: 'Numa das viagens levei um homem que so falava de um som.' },
      { speaker: 'Ozias', text: 'Tres longos, dois curtos. Batia na parede do vagao pra me mostrar.' },
      { speaker: 'Elias', text: 'Esse homem tinha nome?' },
      { speaker: 'Ozias', text: 'John. Perna boa, cabeca ruim. Desceu e nunca pediu carona de volta.' },
    ],
    walkToOffsetCols: -2,
    teaches: { titulo: 'HABILIDADES', texto: 'Ozias ensinou as manobras. Broca, Choque e Volta Rapida ficam nos botoes do canto; compre e melhore em SKILLS.' },
    layer: 'magma',
  },
  {
    id: 'npc_braga',
    name: 'Braga',
    col: 80,
    row: 18 + 1400,
    roomW: 5,
    roomH: 4,
    freeRadius: 1,
    callLines: [
      '(um raspar leve de metal na pedra)',
      '...devagar...',
      '(quase um sussurro) Aqui. Sem barulho.',
      'Aqui. Fala baixo. Elas ouvem.',
    ],
    trappedLines: [
      { speaker: 'Braga', text: '(quase sussurrando) Nao faz barulho. Elas ouvem.' },
      { speaker: 'Braga', text: 'Estou preso ha dias. Tira essas pedras, mas devagar.' },
    ],
    freedLines: [
      { speaker: 'Braga', text: 'Livre. Nao pensei que veria luz de novo.' },
      { speaker: 'Braga', text: 'Vamos sair daqui antes que ela note.' },
    ],
    safeLines: [
      { speaker: 'Braga', text: 'Eu era batedor. Ia na frente, marcava o caminho pros outros.' },
      { speaker: 'Braga', text: 'Tem marca aqui que nao e minha. Cortes pequenos, na altura do joelho.' },
      { speaker: 'Elias', text: 'Na altura do joelho?' },
      { speaker: 'Braga', text: 'Quem marca ali esta marcando sentado. Ou arrastando uma perna.' },
      { speaker: 'Braga', text: 'E tem outra marca por cima da primeira. Essa ai e de gente em pe.' },
    ],
    walkToOffsetCols: -2,
    teaches: { titulo: 'EQUIPAMENTO', texto: 'Braga mostrou o que vestir. Capacete, traje, mochila e botas mudam luz, defesa e carga. Abra TECNOLOGIA.' },
    layer: 'ruins',
  },
  {
    id: 'npc_ultima_luz',
    name: 'A Voz',
    col: 84,
    row: 18 + 1780,
    roomW: 5,
    roomH: 4,
    freeRadius: 1,
    callLines: [
      '(silencio, e entao um suspiro)',
      '...passos?...',
      '...faz tempo que nao ouco passos...',
      'Estou aqui. Nao precisa correr.',
    ],
    trappedLines: [
      { speaker: '???', text: '(uma voz fraca, quase sem forca) ...alguem?' },
      { speaker: '???', text: 'Faz tempo que nao ouco passos que nao sejam meus.' },
    ],
    freedLines: [
      { speaker: '???', text: 'Obrigada. Ou obrigado. Perdi o costume de diferenciar vozes.' },
      { speaker: '???', text: 'Deixa eu me acostumar com a luz de novo.' },
    ],
    safeLines: [
      { speaker: '???', text: 'Aqui embaixo o nome e a primeira coisa que a gente esquece.' },
      { speaker: '???', text: 'Tinha dois homens. Um ficou ferido, o outro carregou ele pra cima.' },
      { speaker: 'Elias', text: 'E depois?' },
      { speaker: '???', text: 'Depois o que carregou voltou. Sozinho. Para baixo.' },
      { speaker: '???', text: 'Nao pergunta se era seu pai. Eu tambem queria saber a resposta.' },
    ],
    walkToOffsetCols: -2,
    layer: 'abyss',
  },
];

/** Nome exibido de um mineiro resgatavel, pelo id. */
export function rescueName(id: string): string {
  return RESCUE_NPCS.find((n) => n.id === id)?.name ?? id;
}


/**
 * Id da folha de arte de quem fala, a partir do nome exibido no dialogo.
 *
 * O dialogo guarda o NOME (`Jonas`, `Mara`), nao o id (`npc_jonas`). Esta
 * ponte existe para o retrato aparecer sem obrigar quem escreve dialogo a
 * lembrar de ids.
 */
export function npcIdForSpeaker(speaker: string): string | null {
  const nome = speaker.toLowerCase().split(' ')[0];
  const preso = RESCUE_NPCS.find((n) => n.name.toLowerCase().startsWith(nome));
  if (preso) return preso.id;
  const morador = BLOCKIA_NPCS.find((n) => n.name.toLowerCase().includes(nome));
  return morador?.id ?? null;
}
