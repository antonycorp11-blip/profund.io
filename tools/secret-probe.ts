// Contrato reservado para salas seladas: recompensa e descoberta sao unicas.
const found = new Set<string>(); const find = (id: string) => !found.has(id) && (found.add(id), true);
if (!find('teste') || find('teste')) throw new Error('segredo duplicou recompensa');
console.log('secret probe: descoberta unica confirmada');
