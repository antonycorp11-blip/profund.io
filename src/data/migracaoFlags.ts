/**
 * SAVE ANTIGO NAO PODE FICAR PRESO ABAIXO DE UM SELO.
 *
 * Varias missoes ganharam etapas depois que ja havia gente jogando: o Posto
 * Nove passou a exigir a defesa, a Vilma a escora da galeria, a ponte de
 * Blockia o sarilho do elevador. Para quem ainda nao chegou la, e so conteudo
 * novo. Para quem ja PASSOU, a missao reabria — e o selo de bioma, que cobra
 * as missoes acima dele, se refazia (`biomeGate.enforce`) com o jogador do
 * lado de baixo, sem caminho de volta para fazer a etapa nova.
 *
 * Cada regra aqui diz: quem ja tem estas flags E ja desceu alem desta
 * profundidade fez a missao na versao antiga — recebe as flags novas. Quem
 * ainda esta acima joga a versao nova inteira.
 */
export interface MigracaoDef {
  /** Flags que provam que a missao foi feita na versao antiga. */
  se: string[];
  /** So vale para quem ja desceu alem disto (metros). 0 = basta ter as flags. */
  alemDe: number;
  concede: string[];
}

export const MIGRACOES: MigracaoDef[] = [
  { se: ['npc_jonas'], alemDe: 0, concede: ['m2_jonas_sala', 'm2_escombros', 'm2_passagem_segura'] },
  { se: ['clue_trilhos'], alemDe: 360, concede: ['trilhos_reparados'] },
  { se: ['rui_cabeca'], alemDe: 360, concede: ['posto_nove_gerador', 'posto_nove_defendido'] },
  { se: ['base_cristal:deposito'], alemDe: 500, concede: ['m4b_camara', 'm4b_acesso', 'base_cristal_primeira_entrega'] },
  { se: ['npc_vilma'], alemDe: 500, concede: ['m5_vilma_zona', 'm5_vilma_acesso', 'vilma_rota_segura'] },
  { se: ['boss_automato_enferrujado', 'gate_minerals'], alemDe: 0, concede: ['m6_rota_limpa', 'rota_comercial_reparada'] },
  // Blockia: quem recebeu a Picareta dos Fundadores ja fez as obras da cidade.
  {
    se: ['afonso_greda', 'passagem_blockia'],
    alemDe: 0,
    concede: ['blockia_galeria_drenada', 'blockia_caixa_1', 'blockia_caixa_2', 'blockia_caixa_3', 'blockia_arquivo_concluido'],
  },
  { se: ['breno_torga', 'passagem_blockia'], alemDe: 0, concede: ['blockia_elevador_religado', 'blockia_ponte_reparada'] },
  { se: ['irene_salles', 'passagem_blockia'], alemDe: 0, concede: ['blockia_ninho_aberto', 'blockia_ninho_limpo', 'blockia_cisterna_limpa'] },
  // A ponte consertada na Blockia antiga: o sarilho nao existia, e a missao
  // "A Ponte Quebrada" passou a pedi-lo.
  { se: ['blockia_ponte_reparada'], alemDe: 0, concede: ['blockia_elevador_religado'] },
  // A visita com a Mara (M6) e a conversa do selo vieram depois. Quem ja tem
  // a Picareta dos Fundadores fez a cidade inteira sem elas: sem estas flags,
  // a missao nova a 601 m reabriria e o selo de magma se fecharia de novo.
  {
    se: ['passagem_blockia'],
    alemDe: 0,
    concede: [
      'blockia_tour_mercado',
      'blockia_tour_horta',
      'blockia_tour_praca',
      'blockia_tour_elevador',
      'blockia_tour_concluido',
      'blockia_confianca_plena',
    ],
  },
];

/** As flags que um save deve ganhar, dado o que ele tem e ate onde desceu. */
export function flagsMigradas(tem: (f: string) => boolean, maisFundo: number): string[] {
  const out: string[] = [];
  for (const m of MIGRACOES) {
    if (maisFundo < m.alemDe) continue;
    if (!m.se.every(tem)) continue;
    for (const f of m.concede) if (!tem(f)) out.push(f);
  }
  return out;
}
