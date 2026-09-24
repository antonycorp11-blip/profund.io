import type { ResourceId } from './resources';
import { CONFIG } from './config';
import { POSTO_NOVE } from './outpost';
import { gateArenaCol, gateLayerDef } from './gates';
import { LANTERNAS } from './campaignBeats';

export interface MissionActionDef {
  id: string;
  /**
   * Onde a acao fica, em tiles. Ou coordenada fixa (`col`/`row`), ou ancorada
   * num morador (`perto`) — dentro de Blockia a planta decide onde cada um
   * mora, e coordenada escrita a mao contra ela ja caiu dentro da pedra.
   */
  col?: number;
  row?: number;
  perto?: { npc: string; dx: number };
  /** Um ponto de um piso da planta de Blockia (`x` pode passar da borda do piso: e o caso da galeria). */
  naCidade?: { piso: string; x: number };
  /** Nome no mapa: a etapa que manda vir aqui aponta para `acao_<id>`. */
  marcador?: string;
  /** Peca de arte da cidade desenhada no lugar enquanto a acao nao foi feita (as caixas). */
  visual?: string;
  radius?: number;
  prompt: string;
  requiresFlags: string[];
  completionFlag: string;
  resourceCost?: Partial<Record<ResourceId, number>>;
  moneyCost?: number;
}

const R = CONFIG.world.surfaceRow;
/*
 * O chao da arena do selo dos Minerais: a linha de ar logo acima da faixa.
 * O guincho mora ali porque e por ali que todo mundo passa — ele estava a
 * 497 m, DENTRO da faixa selada, e a sonda mostrou o tile solido.
 */
const chaoArenaMinerais = R + gateLayerDef('minerals').minDepth - CONFIG.gate.bandThickness - 1;

/*
 * Toda acao aqui foi conferida no mundo gerado por `npm run acoes`: ha onde
 * ficar de pe dentro do raio de toque. Na primeira versao, seis das nove
 * estavam dentro da rocha (o gerador do Posto Nove a 34 tiles do posto, as
 * obras de Blockia fora da cidade) e duas dependiam de flags que nada liga —
 * a campanha travava no selo do Cristal. As flags de chegada (`m2_jonas_sala`,
 * `m5_vilma_zona`...) vem dos gatilhos de /data/campaignBeats.ts.
 */
export const MISSION_ACTIONS: MissionActionDef[] = [
  // Dentro da sala do Jonas, um de cada lado dele. Ele so sai depois das duas
  // (ver `soltaCom` na ficha dele).
  { id: 'jonas_escombros', col: 72, row: R + 84, prompt: 'Remover escombros', requiresFlags: ['m2_jonas_sala'], completionFlag: 'm2_escombros' },
  { id: 'jonas_passagem', col: 76, row: R + 84, prompt: 'Escorar o teto', requiresFlags: ['m2_escombros'], completionFlag: 'm2_passagem_segura' },
  { id: 'trilhos_reparo', col: 86, row: R + 216, prompt: 'Reparar trilhos', requiresFlags: ['clue_trilhos'], completionFlag: 'trilhos_reparados', resourceCost: { iron: 10, copper: 6 } },
  { id: 'posto_gerador', col: POSTO_NOVE.col + 13, row: R + POSTO_NOVE.depth, prompt: 'Abastecer gerador', requiresFlags: [], completionFlag: 'posto_nove_gerador', resourceCost: { coal: 20 } },
  { id: 'lanterna_reparo', col: LANTERNAS.terceira.col, row: LANTERNAS.terceira.row, prompt: 'Reparar lanterna', requiresFlags: ['m3d_lanterna_3'], completionFlag: 'lanterna_reparada', resourceCost: { copper: 2, coal: 6 } },
  { id: 'cristal_acesso', col: 33, row: R + 396, prompt: 'Limpar escombros da entrada', requiresFlags: ['m4b_camara'], completionFlag: 'm4b_acesso' },
  // Sala da Vilma: o bloco na perna dela, e depois escorar a galeria que cede.
  { id: 'vilma_bloco', col: 78, row: R + 460, prompt: 'Tirar o bloco da perna dela', requiresFlags: ['m5_vilma_zona'], completionFlag: 'm5_vilma_acesso' },
  { id: 'vilma_escora', col: 82, row: R + 460, prompt: 'Escorar a galeria', requiresFlags: ['npc_vilma'], completionFlag: 'vilma_rota_segura', resourceCost: { iron: 8 } },
  { id: 'rota_escombros', col: gateArenaCol() - 10, row: chaoArenaMinerais, prompt: 'Remover escombros da rota', requiresFlags: [], completionFlag: 'm6_rota_limpa' },
  { id: 'rota_guincho', col: gateArenaCol() + 10, row: chaoArenaMinerais, prompt: 'Reparar guincho', requiresFlags: ['m6_rota_limpa'], completionFlag: 'rota_comercial_reparada', resourceCost: { iron: 18, copper: 8 }, moneyCost: 500 },
  /*
   * BLOCKIA. Cada obra mora no lugar que a planta construiu para ela: a bomba
   * na passarela em frente a galeria alagada, as caixas la dentro, o sarilho
   * ao pe do elevador, a peca da ponte no vao, a grade e a valvula no
   * reservatorio. Antes eram tres botoes ao lado de tres moradores.
   */
  { id: 'arquivo_bomba', naCidade: { piso: 'oeste_2', x: 5 }, marcador: 'Bomba da galeria', prompt: 'Ligar a bomba da galeria', requiresFlags: ['afonso_greda'], completionFlag: 'blockia_galeria_drenada' },
  { id: 'caixa_1', naCidade: { piso: 'oeste_2', x: -3 }, marcador: 'Galeria alagada', prompt: 'Pegar caixa do arquivo', visual: 'engradados', requiresFlags: ['blockia_galeria_drenada'], completionFlag: 'blockia_caixa_1' },
  { id: 'caixa_2', naCidade: { piso: 'oeste_2', x: -6 }, prompt: 'Pegar caixa do arquivo', visual: 'engradados', requiresFlags: ['blockia_galeria_drenada'], completionFlag: 'blockia_caixa_2' },
  { id: 'caixa_3', naCidade: { piso: 'oeste_2', x: -9 }, prompt: 'Pegar caixa do arquivo', visual: 'engradados', requiresFlags: ['blockia_galeria_drenada'], completionFlag: 'blockia_caixa_3' },
  { id: 'arquivo_entrega', perto: { npc: 'afonso_greda', dx: 3 }, prompt: 'Entregar as caixas', requiresFlags: ['blockia_caixa_1', 'blockia_caixa_2', 'blockia_caixa_3'], completionFlag: 'blockia_arquivo_concluido' },
  { id: 'elevador_sarilho', naCidade: { piso: 'forja', x: 93 }, marcador: 'Sarilho do elevador', prompt: 'Religar o sarilho do elevador', requiresFlags: ['breno_torga'], completionFlag: 'blockia_elevador_religado', resourceCost: { coal: 8 } },
  { id: 'ponte_blockia', naCidade: { piso: 'ponte', x: 53 }, marcador: 'Vao da ponte', prompt: 'Instalar a peca da ponte', requiresFlags: ['blockia_elevador_religado'], completionFlag: 'blockia_ponte_reparada', resourceCost: { iron: 30, copper: 12 }, moneyCost: 1200 },
  { id: 'cisterna_grade', naCidade: { piso: 'reservatorio', x: 49 }, marcador: 'Cisterna', prompt: 'Abrir a grade da cisterna', requiresFlags: ['irene_salles'], completionFlag: 'blockia_ninho_aberto' },
  { id: 'cisterna_blockia', naCidade: { piso: 'reservatorio', x: 55 }, marcador: 'Valvula da cisterna', prompt: 'Operar a valvula da cisterna', requiresFlags: ['blockia_ninho_limpo'], completionFlag: 'blockia_cisterna_limpa' },
];
