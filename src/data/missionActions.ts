import type { ResourceId } from './resources';

export interface MissionActionDef {
  id: string;
  col: number;
  row: number;
  radius?: number;
  prompt: string;
  requiresFlags: string[];
  completionFlag: string;
  resourceCost?: Partial<Record<ResourceId, number>>;
  moneyCost?: number;
  /** Alteracoes pequenas e permanentes no mapa, aplicadas depois do pagamento. */
  worldChange?: { clear: { col: number; row: number }[] };
}

const R = 18;
export const MISSION_ACTIONS: MissionActionDef[] = [
  { id: 'jonas_escombros', col: 42, row: R + 84, prompt: 'Remover escombros', requiresFlags: ['m2_jonas_sala'], completionFlag: 'm2_escombros' },
  { id: 'jonas_passagem', col: 44, row: R + 84, prompt: 'Abrir passagem segura', requiresFlags: ['m2_escombros'], completionFlag: 'm2_passagem_segura' },
  { id: 'trilhos_reparo', col: 86, row: R + 216, prompt: 'Reparar trilhos', requiresFlags: ['clue_trilhos'], completionFlag: 'trilhos_reparados', resourceCost: { iron: 10, copper: 6 } },
  { id: 'posto_gerador', col: 62, row: R + 278, prompt: 'Abastecer gerador', requiresFlags: [], completionFlag: 'posto_nove_gerador', resourceCost: { coal: 20 } },
  { id: 'lanterna_reparo', col: 61, row: R + 340, prompt: 'Reparar lanterna', requiresFlags: ['m3d_lanterna_3'], completionFlag: 'lanterna_reparada', resourceCost: { copper: 2, coal: 6 } },
  { id: 'rota_guincho', col: 74, row: R + 497, prompt: 'Reparar guincho', requiresFlags: ['m6_rota_limpa'], completionFlag: 'rota_comercial_reparada', resourceCost: { iron: 18, copper: 8 }, moneyCost: 500 },
  { id: 'arquivo_bomba', col: 124, row: R + 602, prompt: 'Ativar bomba da galeria', requiresFlags: [], completionFlag: 'blockia_arquivo_concluido' },
  { id: 'ponte_blockia', col: 130, row: R + 604, prompt: 'Instalar peca da ponte', requiresFlags: [], completionFlag: 'blockia_ponte_reparada', resourceCost: { iron: 30, copper: 12 }, moneyCost: 1200 },
  { id: 'cisterna_blockia', col: 136, row: R + 606, prompt: 'Operar valvula da cisterna', requiresFlags: [], completionFlag: 'blockia_cisterna_limpa' },
];
