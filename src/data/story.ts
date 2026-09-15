/**
 * Conteudo narrativo do prototipo: salas feitas a mao, pistas e NPC resgatavel.
 * Coordenadas em TILES (col, row). row = CONFIG.world.surfaceRow + profundidade_em_metros.
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
  },
];
