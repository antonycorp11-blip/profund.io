import { CONFIG } from '../data/config';
import type { InventoryData } from './Inventory';
import type { ExplorationSave } from './Exploration';
import type { AutomationSave } from './Automation';
import type { CloneSave } from './CloneManager';
import type { CreatureSave } from './CreatureManager';
import type { VitalsSave } from './Vitals';
import type { QuotaSave } from './QuotaSystem';
import type { SkillTreeSave } from './SkillTree';
import type { TechSave } from './TechTree';

export interface SaveData {
  version: number;
  seed: number;
  player: { x: number; y: number };
  /**
   * Largura do mundo na hora em que este save foi gravado.
   *
   * Os overrides sao indices planos (`row * width + col`). Sem guardar a
   * largura, alargar o mundo faria cada tile alterado reaparecer no lugar
   * errado — um buraco no meio da rocha a 40 colunas de distancia. Save sem
   * este campo e de antes das 240 colunas e vale 120.
   */
  worldWidth?: number;
  /** Overrides do tilemap achatados: [index, blockId, index, blockId, ...]. */
  tiles: number[];
  /** Minerios esperando para voltar: [index, bloco, segundos, ...]. */
  regrow?: number[];
  inventory: InventoryData;
  stock: { items?: InventoryData; delivered?: InventoryData; money?: number };
  toolIndex: number;
  cluesFound: string[];
  npcs: Record<string, string>;
  quota: QuotaSave;
  skills: SkillTreeSave;
  exploration: ExplorationSave;
  clock: { elapsed: number };
  tech: TechSave;
  clones: CloneSave;
  automation: AutomationSave;
  /** Opcionais: saves anteriores ao sistema de criaturas continuam validos. */
  creatures?: CreatureSave;
  vitals?: VitalsSave;
  activeSkills?: Record<string, { charges: number; cooldown: number }>;
  progression?: { level: number; xp: number };
  collectors?: import('./CollectorManager').CollectorSave;
  equipment?: import('./Equipment').EquipmentSave;
  /** Selos entre biomas: chefe morto / selo aberto, por camada. */
  journal?: import('./Journal').JournalSave;
  reputation?: import('./Reputation').ReputationSave;
  /** Moradores de cidade com quem o jogador ja conversou. */
  cityMet?: string[];
  gates?: import('./BiomeGate').BiomeGateSave;
  stats: { blocksMined: number; deepestMeters: number; playTime: number };
  savedAt: number;
}

const VERSION = 1;

/** Persistencia em localStorage. O mundo e reconstruido da seed + overrides. */
class SaveSystemImpl {
  private get key(): string {
    return CONFIG.save.key;
  }

  exists(): boolean {
    try {
      return localStorage.getItem(this.key) !== null;
    } catch {
      return false;
    }
  }

  save(data: Omit<SaveData, 'version' | 'savedAt' | 'seed'>): boolean {
    try {
      const payload: SaveData = {
        ...data,
        version: VERSION,
        seed: CONFIG.world.seed,
        savedAt: Date.now(),
      };
      localStorage.setItem(this.key, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.warn('[save] falha ao gravar', err);
      return false;
    }
  }

  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== VERSION) {
        console.warn('[save] versao incompativel, ignorando save antigo');
        return null;
      }
      if (data.seed !== CONFIG.world.seed) {
        console.warn('[save] seed diferente, ignorando save antigo');
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[save] falha ao ler', err);
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* ignorado */
    }
  }
}

export const SaveSystem = new SaveSystemImpl();
