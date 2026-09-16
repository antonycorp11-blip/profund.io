/**
 * Conteudo narrativo do prototipo: salas feitas a mao, pistas e NPCs resgataveis.
 * Coordenadas em TILES (col, row). row = CONFIG.world.surfaceRow + profundidade_em_metros.
 *
 * O fio da historia (por baixo do mistério, sem resolve-lo):
 * o pai nao "foi para o fundo" a toa — ele fazia parte de uma equipe avancada,
 * chamada internamente de "Setor 3", enviada pela mesma empresa que administra
 * esta mina. As pistas e os mineiros resgatados vao revelando, aos poucos,
 * que ALGUEM sabia que havia algo la embaixo antes de qualquer picareta bater
 * na primeira pedra — e mandou gente mesmo assim. As ruinas nao sao apenas
 * antigas: tem maquinario, tem registros, tem chefes que reagem a intrusos
 * como se estivessem cumprindo ordem. Nada disto resolve o misterio no
 * final desta leva — deve deixar o jogador com MAIS perguntas, nao menos.
 *
 * Cada mineiro resgatavel pertence a uma CAMADA (`layer`). O BiomeGate exige
 * TODOS os mineiros daquela camada resgatados, mais o chefe morto, para abrir
 * o selo e liberar a proxima camada.
 */

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
  trappedLines: DialogLine[];
  freedLines: DialogLine[];
  /** Para onde ele caminha depois de livre (offset em tiles a partir da posicao). */
  walkToOffsetCols: number;
  safeLines: DialogLine[];
  /** Camada onde ele foi preso — o BiomeGate exige TODOS os desta camada resgatados. */
  layer: string;
}

export const CLUES: ClueDef[] = [
  {
    id: 'clue_marca_do_pai',
    title: 'A marca do pai',
    col: 46,
    row: 18 + 62,
    roomW: 9,
    roomH: 5,
    prompt: 'Examinar marca',
    lines: [
      { speaker: 'Voce', text: 'Esta marca... era do meu pai.' },
      { speaker: 'Voce', text: 'Entao ele realmente chegou ate aqui.' },
      { speaker: 'Voce', text: 'Mas por que continuou descendo?' },
    ],
    logEntry: 'Pista registrada: A marca do pai (62 m)',
    layer: 'stone',
  },
  {
    id: 'clue_diario_setor3',
    title: 'Diario rasgado',
    col: 50,
    row: 18 + 230,
    roomW: 8,
    roomH: 5,
    prompt: 'Ler pagina',
    lines: [
      { speaker: 'Voce', text: 'Um diario. Molhado, quase ilegivel.' },
      { speaker: 'Voce', text: '"Setor 3 autorizado a prosseguir. Manter sigilo com a superficie."' },
      { speaker: 'Voce', text: 'Setor 3? Isso nunca apareceu em nenhum relatorio que eu vi.' },
      { speaker: 'Voce', text: 'Meu pai nao estava so explorando. Alguem organizou isso.' },
    ],
    logEntry: 'Pista registrada: Diario rasgado — "Setor 3" (230 m)',
    layer: 'crystal',
  },
  {
    id: 'clue_peca_metalica',
    title: 'Peca sem origem',
    col: 45,
    row: 18 + 560,
    roomW: 8,
    roomH: 5,
    prompt: 'Examinar peca',
    lines: [
      { speaker: 'Voce', text: 'Uma engrenagem. Pesada, sem ferrugem apesar do tempo.' },
      { speaker: 'Voce', text: 'Nao e de nenhuma maquina que a empresa usa la em cima.' },
      { speaker: 'Voce', text: 'Isso foi feito por alguem. Ou por alguma coisa.' },
    ],
    logEntry: 'Pista registrada: Peca sem origem (560 m)',
    layer: 'minerals',
  },
  {
    id: 'clue_registro_expedicao',
    title: 'Registro da expedicao',
    col: 48,
    row: 18 + 940,
    roomW: 9,
    roomH: 5,
    prompt: 'Ler registro',
    lines: [
      { speaker: 'Voce', text: 'Uma lista de nomes. "Equipe avancada — Setor 3."' },
      { speaker: 'Voce', text: 'O nome do meu pai esta aqui. E mais sete.' },
      { speaker: 'Voce', text: 'Uma anotacao por cima, com outra letra: "prosseguir mesmo sem contato."' },
      { speaker: 'Voce', text: 'Sabiam que o Setor 3 tinha parado de responder. E mandaram continuar.' },
    ],
    logEntry: 'Pista registrada: Registro da expedicao (940 m)',
    layer: 'magma',
  },
  {
    id: 'clue_inscricao_antiga',
    title: 'Inscricao antiga',
    col: 50,
    row: 18 + 1340,
    roomW: 9,
    roomH: 6,
    prompt: 'Examinar inscricao',
    lines: [
      { speaker: 'Voce', text: 'Simbolos na pedra. Nenhuma ferramenta humana fez isso.' },
      { speaker: 'Voce', text: 'E antigo. Mais antigo do que qualquer coisa que a empresa poderia saber.' },
      { speaker: 'Voce', text: 'Isto nunca foi so uma mina. Alguem chegou aqui muito antes de nos.' },
    ],
    logEntry: 'Pista registrada: Inscricao antiga (1340 m)',
    layer: 'ruins',
  },
  {
    id: 'clue_ultima_mensagem',
    title: 'Ultima mensagem',
    col: 46,
    row: 18 + 1740,
    roomW: 8,
    roomH: 5,
    prompt: 'Ativar gravador',
    lines: [
      { speaker: 'Gravador', text: '(estatica) "...se voce esta ouvindo isso, nao abra a porta."' },
      { speaker: 'Gravador', text: '"Ela tem que ficar fechada. Eu vou..." (a gravacao corta)' },
      { speaker: 'Voce', text: 'Essa voz... e do meu pai.' },
      { speaker: 'Voce', text: 'Que porta? Fechada onde?' },
      { speaker: 'Voce', text: 'Ele nao estava perdido. Ele estava guardando alguma coisa.' },
    ],
    logEntry: 'Pista registrada: Ultima mensagem (1740 m)',
    layer: 'abyss',
  },
];

export const RESCUE_NPCS: RescueNpcDef[] = [
  {
    id: 'npc_jonas',
    name: 'Jonas',
    col: 74,
    row: 18 + 118,
    roomW: 5,
    roomH: 4,
    freeRadius: 1,
    trappedLines: [
      { speaker: 'Jonas', text: 'Ei! Tem alguem ai? Estou preso!' },
      { speaker: 'Jonas', text: 'A galeria desabou. Quebra essas pedras, por favor!' },
    ],
    freedLines: [
      { speaker: 'Jonas', text: 'Consegui... obrigado. Achei que ficaria aqui pra sempre.' },
      { speaker: 'Jonas', text: 'Deixa eu sair desse buraco primeiro.' },
    ],
    safeLines: [
      { speaker: 'Jonas', text: 'Eu conheci seu pai. Ele passou por aqui.' },
      { speaker: 'Jonas', text: 'Estava indo mais fundo. Sempre mais fundo.' },
      { speaker: 'Jonas', text: 'Vou subir e esperar na base. Te devo uma.' },
    ],
    walkToOffsetCols: -2,
    layer: 'stone',
  },
  {
    id: 'npc_helena',
    name: 'Helena',
    col: 80,
    row: 18 + 260,
    roomW: 5,
    roomH: 4,
    freeRadius: 1,
    trappedLines: [
      { speaker: 'Helena', text: 'Cuidado! Os cristais aqui cortam fundo.' },
      { speaker: 'Helena', text: 'Um bloco caiu na minha perna. Nao consigo me mexer.' },
    ],
    freedLines: [
      { speaker: 'Helena', text: 'Obrigada. Achei que ninguem mais descia ate aqui.' },
      { speaker: 'Helena', text: 'Espera eu recuperar o folego.' },
    ],
    safeLines: [
      { speaker: 'Helena', text: 'Eu era a geologa do Setor 3. Seu pai liderava a equipe.' },
      { speaker: 'Helena', text: 'Os cristais daqui "cantam" quando alguem se aproxima. Ele levava isso a serio.' },
      { speaker: 'Helena', text: 'Um dia ele desceu sozinho e disse que voltava ate a noite.' },
      { speaker: 'Helena', text: 'Vou subir. Se precisar de mim, estarei na base.' },
    ],
    walkToOffsetCols: -2,
    layer: 'crystal',
  },
  {
    id: 'npc_baptista',
    name: 'Baptista',
    col: 82,
    row: 18 + 600,
    roomW: 5,
    roomH: 4,
    freeRadius: 1,
    trappedLines: [
      { speaker: 'Baptista', text: 'Aqui embaixo! O teto cedeu bem em cima de mim.' },
      { speaker: 'Baptista', text: 'Minhas ferramentas ficaram do outro lado. Preciso de uma mao.' },
    ],
    freedLines: [
      { speaker: 'Baptista', text: 'Ainda inteiro. Foi por pouco.' },
      { speaker: 'Baptista', text: 'Deixa eu recolher o que sobrou daqui.' },
    ],
    safeLines: [
      { speaker: 'Baptista', text: 'Sou mecanico. Ou era — nao sei mais o que a empresa pensa que sou.' },
      { speaker: 'Baptista', text: 'Achei pecas aqui que nao vieram de fabrica nenhuma que eu conheco.' },
      { speaker: 'Baptista', text: 'Tem maquina funcionando la embaixo. Maquina de verdade, nao ruina.' },
      { speaker: 'Baptista', text: 'Seu pai fotografou tudo. Anotou tudo. Nunca vi ele com tanto medo.' },
    ],
    walkToOffsetCols: -2,
    layer: 'minerals',
  },
  {
    id: 'npc_ferreira',
    name: 'Ferreira',
    col: 85,
    row: 18 + 980,
    roomW: 5,
    roomH: 4,
    freeRadius: 1,
    trappedLines: [
      { speaker: 'Ferreira', text: '(tossindo) Aqui... o calor deste lugar nao e normal.' },
      { speaker: 'Ferreira', text: 'A rocha em cima de mim ainda esta quente. Rapido, por favor.' },
    ],
    freedLines: [
      { speaker: 'Ferreira', text: 'Achei que ia assar aqui dentro.' },
      { speaker: 'Ferreira', text: 'Da um instante. Preciso me refazer.' },
    ],
    safeLines: [
      { speaker: 'Ferreira', text: 'Estudavamos o calor daqui. De onde ele vem — nao e magma comum.' },
      { speaker: 'Ferreira', text: 'Quando o Setor 3 parou de mandar noticia, a ordem foi clara: continuar.' },
      { speaker: 'Ferreira', text: 'Ninguem perguntou o motivo. Isso ainda me assombra.' },
      { speaker: 'Ferreira', text: 'Seu pai foi o unico que insistiu em ir depois de todo mundo recuar.' },
    ],
    walkToOffsetCols: -2,
    layer: 'magma',
  },
  {
    id: 'npc_corvo',
    name: 'Corvo',
    col: 80,
    row: 18 + 1400,
    roomW: 5,
    roomH: 4,
    freeRadius: 1,
    trappedLines: [
      { speaker: 'Corvo', text: '(quase sussurrando) Nao faz barulho. Elas ouvem.' },
      { speaker: 'Corvo', text: 'Estou preso ha dias. Tira essas pedras, mas devagar.' },
    ],
    freedLines: [
      { speaker: 'Corvo', text: 'Livre. Nao pensei que veria luz de novo.' },
      { speaker: 'Corvo', text: 'Vamos sair daqui antes que ela note.' },
    ],
    safeLines: [
      { speaker: 'Corvo', text: 'Era batedor. Ia na frente, marcava o caminho para os outros.' },
      { speaker: 'Corvo', text: 'As ruinas contam quem entra. Nao sei explicar melhor que isso.' },
      { speaker: 'Corvo', text: 'Seu pai passou por aqui marcado, no meu mapa, com um circulo.' },
      { speaker: 'Corvo', text: 'Ele nao estava perdido. Ele sabia exatamente para onde ia.' },
    ],
    walkToOffsetCols: -2,
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
      { speaker: '???', text: 'Tinha um homem. Falava de uma porta que nao podia abrir.' },
      { speaker: '???', text: 'Ele escolheu ficar. Isso eu lembro com certeza.' },
      { speaker: '???', text: 'Nao pergunta se era seu pai. Eu tambem queria saber a resposta.' },
    ],
    walkToOffsetCols: -2,
    layer: 'abyss',
  },
];
