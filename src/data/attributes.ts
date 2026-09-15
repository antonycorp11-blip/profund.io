/**
 * Atributos centrais do personagem.
 *
 * Regra: nenhum sistema le CONFIG direto para stats de gameplay; tudo passa por
 * Attributes.get(), que soma os modificadores das habilidades por cima da base.
 * Atributos ainda sem sistema no jogo (automacao, combate) ja existem aqui para
 * que as skills possam ser escritas sem mexer em codigo depois.
 */

export type AttrId =
  // --- movimento ---
  | 'moveSpeed'
  | 'jumpForce'
  | 'airControl'
  | 'climbSpeed'
  | 'dashSpeed'
  | 'dashDistance'
  | 'dashCooldown'
  | 'fallDamageReduction'
  | 'carryMovePenalty'
  // --- mineracao ---
  | 'miningPower'
  | 'miningSpeed'
  | 'chargedMiningPower'
  | 'chargedMiningSpeed'
  | 'blockCriticalChance'
  | 'blockCriticalMultiplier'
  | 'hardBlockDamage'
  | 'oreDamageBonus'
  | 'adjacentBlockDamage'
  | 'miningArea'
  | 'instantBreakChance'
  | 'miningComboBonus'
  | 'depthMiningBonus'
  | 'miningRange'
  // --- coleta ---
  | 'pickupRadius'
  | 'pickupSpeed'
  | 'resourceYield'
  | 'oreYield'
  | 'rareResourceYield'
  | 'extraDropChance'
  | 'doubleDropChance'
  | 'tripleDropChance'
  | 'jackpotChance'
  | 'inventoryCapacity'
  | 'resourceWeightReduction'
  // --- exploracao ---
  | 'lightRadius'
  | 'rareOreDetectionRadius'
  | 'secretDetectionRadius'
  | 'artifactDetectionRadius'
  | 'mapRevealRadius'
  | 'interactionRange'
  // --- sobrevivencia ---
  | 'maxHealth'
  | 'defense'
  | 'fireResistance'
  | 'poisonResistance'
  | 'gasResistance'
  | 'environmentalResistance'
  | 'knockbackResistance'
  | 'healthRegeneration'
  | 'consumableEfficiency'
  // --- combate ---
  | 'combatDamage'
  | 'combatAttackSpeed'
  | 'combatCriticalChance'
  | 'combatCriticalMultiplier'
  | 'bossDamage'
  | 'shockCharges'
  | 'shockJumps'
  | 'shockPower'
  | 'shockCooldown'
  | 'shockRange'
  | 'drillCharges'
  | 'drillDepth'
  | 'drillHeight'
  | 'drillPower'
  | 'drillCooldown'
  | 'recallCastTime'
  | 'recallCooldown'
  | 'gadgetDamage'
  | 'explosiveDamage'
  | 'explosiveRadius'
  | 'gadgetCooldownReduction'
  // --- automacao ---
  | 'workerProductivity'
  | 'workerMoveSpeed'
  | 'workerMiningSpeed'
  | 'workerCarryCapacity'
  | 'conveyorSpeed'
  | 'elevatorSpeed'
  | 'elevatorCapacity'
  | 'storageCapacity'
  | 'refinerySpeed'
  | 'refineryYield'
  | 'constructionCostReduction'
  | 'repairSpeed'
  | 'machineEfficiency'
  | 'energyConsumptionReduction'
  // --- copias ---
  | 'cloneSlots'
  | 'collectorSpeed'
  | 'collectorDigSpeed'
  | 'collectorCapacity'
  | 'collectorRange'
  | 'collectorBreak'
  | 'cloneMiningPower'
  | 'cloneMiningSpeed'
  | 'cloneMoveSpeed'
  | 'cloneCapacity'
  | 'deliveryValue';

/** Flags ligadas/desligadas por habilidades (op 'unlock'). */
export type FlagId =
  | 'wallJump'
  | 'autoPickup'
  | 'dashUnlocked'
  | 'airDash'
  | 'rareOreGlow'
  | 'secretSense'
  | 'shockUnlocked'
  | 'drillUnlocked'
  | 'recallUnlocked'
  | 'recallDive'
  | 'legacyTreeVisible';

export interface AttrMeta {
  id: AttrId;
  name: string;
  base: number;
  /** Como o numero e exibido na UI. */
  format: 'flat' | 'percent' | 'multiplier' | 'seconds' | 'pixels';
  /** Teto absoluto (protege contra acumulo absurdo). Ver spec, item 46. */
  max?: number;
  min?: number;
  /** Ja tem efeito no jogo? Skills de atributos inertes ficam bloqueadas na UI. */
  live: boolean;
}

/**
 * Bases. Os valores que ja existiam em CONFIG viraram a base daqui —
 * CONFIG continua sendo a fonte para o que nao e stat de personagem.
 */
export const ATTRIBUTES: Record<AttrId, AttrMeta> = {
  moveSpeed: { id: 'moveSpeed', name: 'Velocidade', base: 165, format: 'flat', live: true },
  jumpForce: { id: 'jumpForce', name: 'Forca do salto', base: 470, format: 'flat', live: true },
  airControl: { id: 'airControl', name: 'Controle aereo', base: 1, format: 'multiplier', live: true },
  climbSpeed: { id: 'climbSpeed', name: 'Escalada', base: 145, format: 'flat', live: true },
  dashSpeed: { id: 'dashSpeed', name: 'Velocidade do dash', base: 520, format: 'flat', live: false },
  dashDistance: { id: 'dashDistance', name: 'Distancia do dash', base: 120, format: 'pixels', live: false },
  dashCooldown: { id: 'dashCooldown', name: 'Recarga do dash', base: 1.6, format: 'seconds', min: 0.25, live: false },
  fallDamageReduction: { id: 'fallDamageReduction', name: 'Reducao de dano de queda', base: 0, format: 'percent', max: 0.9, live: false },
  carryMovePenalty: { id: 'carryMovePenalty', name: 'Penalidade de carga', base: 0.25, format: 'percent', min: 0.02, live: true },

  miningPower: { id: 'miningPower', name: 'Poder de mineracao', base: 0, format: 'flat', live: true },
  miningSpeed: { id: 'miningSpeed', name: 'Velocidade de mineracao', base: 1, format: 'multiplier', live: true },
  chargedMiningPower: { id: 'chargedMiningPower', name: 'Dano do golpe carregado', base: 1, format: 'multiplier', live: false },
  chargedMiningSpeed: { id: 'chargedMiningSpeed', name: 'Tempo de carga', base: 1, format: 'multiplier', live: false },
  blockCriticalChance: { id: 'blockCriticalChance', name: 'Chance de critico', base: 0, format: 'percent', max: 0.6, live: true },
  blockCriticalMultiplier: { id: 'blockCriticalMultiplier', name: 'Multiplicador critico', base: 1.8, format: 'multiplier', max: 5, live: true },
  hardBlockDamage: { id: 'hardBlockDamage', name: 'Dano em rocha dura', base: 0, format: 'percent', live: true },
  oreDamageBonus: { id: 'oreDamageBonus', name: 'Dano em minerio', base: 0, format: 'percent', live: true },
  adjacentBlockDamage: { id: 'adjacentBlockDamage', name: 'Dano em blocos vizinhos', base: 0, format: 'percent', live: true },
  miningArea: { id: 'miningArea', name: 'Area de mineracao', base: 0, format: 'flat', live: false },
  instantBreakChance: { id: 'instantBreakChance', name: 'Quebra instantanea', base: 0, format: 'percent', max: 0.5, live: false },
  miningComboBonus: { id: 'miningComboBonus', name: 'Bonus de combo', base: 0, format: 'percent', live: false },
  depthMiningBonus: { id: 'depthMiningBonus', name: 'Bonus por profundidade', base: 0, format: 'percent', live: false },
  miningRange: { id: 'miningRange', name: 'Alcance', base: 96, format: 'pixels', live: true },

  pickupRadius: { id: 'pickupRadius', name: 'Raio de coleta', base: 72, format: 'pixels', live: true },
  pickupSpeed: { id: 'pickupSpeed', name: 'Velocidade de coleta', base: 620, format: 'flat', live: true },
  resourceYield: { id: 'resourceYield', name: 'Recursos obtidos', base: 1, format: 'multiplier', live: true },
  oreYield: { id: 'oreYield', name: 'Minerio obtido', base: 1, format: 'multiplier', live: true },
  rareResourceYield: { id: 'rareResourceYield', name: 'Recursos raros', base: 1, format: 'multiplier', live: true },
  extraDropChance: { id: 'extraDropChance', name: 'Drop extra', base: 0, format: 'percent', max: 0.85, live: true },
  doubleDropChance: { id: 'doubleDropChance', name: 'Drop dobrado', base: 0, format: 'percent', max: 0.7, live: true },
  tripleDropChance: { id: 'tripleDropChance', name: 'Drop triplicado', base: 0, format: 'percent', max: 0.4, live: true },
  jackpotChance: { id: 'jackpotChance', name: 'Jackpot', base: 0, format: 'percent', max: 0.08, live: true },
  inventoryCapacity: { id: 'inventoryCapacity', name: 'Capacidade da mochila', base: 40, format: 'flat', live: true },
  resourceWeightReduction: { id: 'resourceWeightReduction', name: 'Peso dos recursos', base: 0, format: 'percent', max: 0.6, live: true },

  lightRadius: { id: 'lightRadius', name: 'Raio da lanterna', base: 150, format: 'pixels', live: true },
  rareOreDetectionRadius: { id: 'rareOreDetectionRadius', name: 'Detectar minerio raro', base: 0, format: 'pixels', live: true },
  secretDetectionRadius: { id: 'secretDetectionRadius', name: 'Detectar segredos', base: 0, format: 'pixels', live: false },
  artifactDetectionRadius: { id: 'artifactDetectionRadius', name: 'Detectar artefatos', base: 0, format: 'pixels', live: false },
  mapRevealRadius: { id: 'mapRevealRadius', name: 'Revelacao do mapa', base: 0, format: 'pixels', live: true },
  interactionRange: { id: 'interactionRange', name: 'Alcance de interacao', base: 52, format: 'pixels', live: true },

  maxHealth: { id: 'maxHealth', name: 'Vida maxima', base: 100, format: 'flat', live: true },
  defense: { id: 'defense', name: 'Defesa', base: 0, format: 'percent', max: 0.8, live: true },
  fireResistance: { id: 'fireResistance', name: 'Resistencia a fogo', base: 0, format: 'percent', max: 0.9, live: false },
  poisonResistance: { id: 'poisonResistance', name: 'Resistencia a veneno', base: 0, format: 'percent', max: 0.9, live: false },
  gasResistance: { id: 'gasResistance', name: 'Resistencia a gas', base: 0, format: 'percent', max: 0.9, live: false },
  environmentalResistance: { id: 'environmentalResistance', name: 'Resistencia ambiental', base: 0, format: 'percent', max: 0.9, live: false },
  knockbackResistance: { id: 'knockbackResistance', name: 'Resistencia a empurrao', base: 0, format: 'percent', max: 0.9, live: true },
  healthRegeneration: { id: 'healthRegeneration', name: 'Regeneracao', base: 0, format: 'flat', live: true },
  consumableEfficiency: { id: 'consumableEfficiency', name: 'Eficiencia de consumiveis', base: 1, format: 'multiplier', live: false },

  combatDamage: { id: 'combatDamage', name: 'Dano em criaturas', base: 10, format: 'flat', live: true },
  combatAttackSpeed: { id: 'combatAttackSpeed', name: 'Velocidade de ataque', base: 1, format: 'multiplier', live: true },
  combatCriticalChance: { id: 'combatCriticalChance', name: 'Critico em criaturas', base: 0.05, format: 'percent', max: 0.6, live: true },
  combatCriticalMultiplier: { id: 'combatCriticalMultiplier', name: 'Multiplicador critico', base: 1.5, format: 'multiplier', live: true },
  bossDamage: { id: 'bossDamage', name: 'Dano em chefes', base: 0, format: 'percent', live: true },

  // --- Choque: corrente eletrica que salta entre blocos ---
  shockCharges: { id: 'shockCharges', name: 'Marteladas com choque', base: 3, format: 'flat', live: true },
  shockJumps: { id: 'shockJumps', name: 'Saltos da corrente', base: 4, format: 'flat', live: true },
  shockPower: { id: 'shockPower', name: 'Forca do choque', base: 0.55, format: 'percent', live: true },
  shockCooldown: { id: 'shockCooldown', name: 'Recarga do choque', base: 16, format: 'flat', min: 3, live: true },
  shockRange: { id: 'shockRange', name: 'Alcance do salto', base: 2.6, format: 'flat', live: true },

  // --- Broca: abre tunel a frente ---
  drillCharges: { id: 'drillCharges', name: 'Marteladas com broca', base: 4, format: 'flat', live: true },
  drillDepth: { id: 'drillDepth', name: 'Avanco da broca', base: 2, format: 'flat', live: true },
  drillHeight: { id: 'drillHeight', name: 'Altura do tunel', base: 3, format: 'flat', live: true },
  drillPower: { id: 'drillPower', name: 'Forca da broca', base: 1, format: 'multiplier', live: true },
  drillCooldown: { id: 'drillCooldown', name: 'Recarga da broca', base: 22, format: 'flat', min: 3, live: true },

  // --- Volta Rapida: sobe para a base ---
  recallCastTime: { id: 'recallCastTime', name: 'Tempo parado', base: 3, format: 'flat', min: 0.4, live: true },
  recallCooldown: { id: 'recallCooldown', name: 'Recarga da volta', base: 120, format: 'flat', min: 10, live: true },
  gadgetDamage: { id: 'gadgetDamage', name: 'Dano de gadgets', base: 0, format: 'percent', live: false },
  explosiveDamage: { id: 'explosiveDamage', name: 'Dano explosivo', base: 0, format: 'percent', live: false },
  explosiveRadius: { id: 'explosiveRadius', name: 'Raio explosivo', base: 0, format: 'percent', live: false },
  gadgetCooldownReduction: { id: 'gadgetCooldownReduction', name: 'Recarga de gadgets', base: 0, format: 'percent', max: 0.7, live: false },

  workerProductivity: { id: 'workerProductivity', name: 'Produtividade', base: 1, format: 'multiplier', live: false },
  workerMoveSpeed: { id: 'workerMoveSpeed', name: 'Velocidade dos trabalhadores', base: 1, format: 'multiplier', live: false },
  workerMiningSpeed: { id: 'workerMiningSpeed', name: 'Mineracao dos trabalhadores', base: 1, format: 'multiplier', live: false },
  workerCarryCapacity: { id: 'workerCarryCapacity', name: 'Carga dos trabalhadores', base: 1, format: 'multiplier', live: false },
  conveyorSpeed: { id: 'conveyorSpeed', name: 'Velocidade das esteiras', base: 1, format: 'multiplier', live: true },
  elevatorSpeed: { id: 'elevatorSpeed', name: 'Velocidade do elevador', base: 1, format: 'multiplier', live: false },
  elevatorCapacity: { id: 'elevatorCapacity', name: 'Capacidade do elevador', base: 1, format: 'multiplier', live: false },
  storageCapacity: { id: 'storageCapacity', name: 'Capacidade do deposito', base: 1, format: 'multiplier', live: true },
  refinerySpeed: { id: 'refinerySpeed', name: 'Velocidade da refinaria', base: 1, format: 'multiplier', live: false },
  refineryYield: { id: 'refineryYield', name: 'Producao da refinaria', base: 1.35, format: 'multiplier', live: true },
  constructionCostReduction: { id: 'constructionCostReduction', name: 'Custo de construcao', base: 0, format: 'percent', max: 0.6, live: false },
  repairSpeed: { id: 'repairSpeed', name: 'Velocidade de reparo', base: 1, format: 'multiplier', live: false },
  machineEfficiency: { id: 'machineEfficiency', name: 'Eficiencia das maquinas', base: 1, format: 'multiplier', live: false },
  energyConsumptionReduction: { id: 'energyConsumptionReduction', name: 'Consumo de energia', base: 0, format: 'percent', max: 0.6, live: true },

  // A camara nao limita mais: a mesma maquina imprime quantas copias voce
  // conseguir pagar. O freio e o preco, que sobe a cada copia.
  collectorSpeed: { id: 'collectorSpeed', name: 'Velocidade das toupeiras', base: 1, format: 'multiplier', live: true },
  collectorDigSpeed: { id: 'collectorDigSpeed', name: 'Escavacao das toupeiras', base: 1, format: 'multiplier', live: true },
  collectorCapacity: { id: 'collectorCapacity', name: 'Bolsa das toupeiras', base: 1, format: 'multiplier', live: true },
  collectorBreak: { id: 'collectorBreak', name: 'Dentes das toupeiras', base: 0, format: 'percent', live: true },
  collectorRange: { id: 'collectorRange', name: 'Faro das toupeiras', base: 1, format: 'multiplier', live: true },

  cloneSlots: { id: 'cloneSlots', name: 'Copias simultaneas', base: 99, format: 'flat', max: 99, live: true },
  cloneMiningPower: { id: 'cloneMiningPower', name: 'Poder das copias', base: 9, format: 'flat', live: true },
  cloneMiningSpeed: { id: 'cloneMiningSpeed', name: 'Velocidade das copias', base: 1, format: 'multiplier', live: true },
  cloneMoveSpeed: { id: 'cloneMoveSpeed', name: 'Movimento das copias', base: 95, format: 'flat', live: true },
  cloneCapacity: { id: 'cloneCapacity', name: 'Carga das copias', base: 30, format: 'flat', live: true },
  deliveryValue: { id: 'deliveryValue', name: 'Valor da entrega', base: 1, format: 'multiplier', live: true },
};

export const ATTR_IDS = Object.keys(ATTRIBUTES) as AttrId[];
