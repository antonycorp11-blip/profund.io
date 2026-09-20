import { MOTHERLODES } from '../src/data/motherlodes';
for (const vein of MOTHERLODES) {
  if (vein.reserve <= 0 || vein.faceTiles.length < 8 || vein.respawnSec <= 0) throw new Error(`${vein.id}: campo invalido`);
}
console.log(`motherlode probe: ${MOTHERLODES.length} campos persistentes configurados`);
