import { COLLAPSE_ZONES } from '../src/data/collapses';
for (const zone of COLLAPSE_ZONES) {
  if (zone.warningSec < 1.2 || zone.warningSec > 1.8) throw new Error(`${zone.id}: aviso inseguro`);
  if (zone.maxRocks < 1 || zone.rect.col0 > zone.rect.col1) throw new Error(`${zone.id}: zona invalida`);
}
console.log(`collapse probe: ${COLLAPSE_ZONES.length} zonas com aviso seguro`);
