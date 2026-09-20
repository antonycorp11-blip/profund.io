export interface CollapseZone {
  id: string; rect: { col0: number; col1: number; row0: number; row1: number };
  riskPerBreak: number; minBreaks: number; warningSec: number; cooldownSec: number; maxRocks: number;
  oneShot?: boolean; completionFlag?: string;
}
const R = 18;
export const COLLAPSE_ZONES: CollapseZone[] = [
  { id: 'collapse_26m', rect: { col0: 40, col1: 48, row0: R + 23, row1: R + 29 }, riskPerBreak: 1, minBreaks: 1, warningSec: 1.4, cooldownSec: 99, maxRocks: 1, oneShot: true, completionFlag: 'collapse_26m' },
  { id: 'collapse_460m', rect: { col0: 48, col1: 64, row0: R + 455, row1: R + 465 }, riskPerBreak: 1, minBreaks: 2, warningSec: 1.6, cooldownSec: 99, maxRocks: 3, oneShot: true, completionFlag: 'collapse_460m' },
  { id: 'collapse_190m', rect: { col0: 26, col1: 34, row0: R + 187, row1: R + 193 }, riskPerBreak: .25, minBreaks: 3, warningSec: 1.3, cooldownSec: 30, maxRocks: 1 },
  { id: 'collapse_330m', rect: { col0: 70, col1: 78, row0: R + 327, row1: R + 333 }, riskPerBreak: .2, minBreaks: 3, warningSec: 1.5, cooldownSec: 30, maxRocks: 1 },
];
