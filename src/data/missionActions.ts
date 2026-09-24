import type { ResourceId } from './resources';
import { CONFIG } from './config';
import { POSTO_NOVE } from './outpost';
import { gateArenaCol, gateLayerDef } from './gates';

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
 * a campanha travava no selo do Cristal.
 */
export const MISSION_ACTIONS: MissionActionDef[] = [
  { id: 'trilhos_reparo', col: 86, row: R + 216, prompt: 'Reparar trilhos', requiresFlags: ['clue_trilhos'], completionFlag: 'trilhos_reparados', resourceCost: { iron: 10, copper: 6 } },
  { id: 'posto_gerador', col: POSTO_NOVE.col + 13, row: R + POSTO_NOVE.depth, prompt: 'Abastecer gerador', requiresFlags: [], completionFlag: 'posto_nove_gerador', resourceCost: { coal: 20 } },
  { id: 'lanterna_reparo', col: 61, row: R + 340, prompt: 'Reparar lanterna', requiresFlags: [], completionFlag: 'lanterna_reparada', resourceCost: { copper: 2, coal: 6 } },
  { id: 'rota_guincho', col: gateArenaCol() + 10, row: chaoArenaMinerais, prompt: 'Reparar guincho', requiresFlags: [], completionFlag: 'rota_comercial_reparada', resourceCost: { iron: 18, copper: 8 }, moneyCost: 500 },
  { id: 'arquivo_bomba', perto: { npc: 'afonso_greda', dx: 3 }, prompt: 'Ativar bomba da galeria', requiresFlags: [], completionFlag: 'blockia_arquivo_concluido' },
  { id: 'ponte_blockia', perto: { npc: 'breno_torga', dx: -3 }, prompt: 'Instalar peca da ponte', requiresFlags: [], completionFlag: 'blockia_ponte_reparada', resourceCost: { iron: 30, copper: 12 }, moneyCost: 1200 },
  { id: 'cisterna_blockia', perto: { npc: 'irene_salles', dx: 3 }, prompt: 'Operar valvula da cisterna', requiresFlags: [], completionFlag: 'blockia_cisterna_limpa' },
];
