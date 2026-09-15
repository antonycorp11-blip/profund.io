import { toolAt, type ToolDef } from '../data/tools';
import type { Attributes } from '../systems/Attributes';

/**
 * Visao dos atributos do personagem.
 *
 * Nao guarda numero nenhum: le de Attributes, onde a base, a ferramenta e as
 * habilidades ja foram somadas. A ferramenta entra como mais uma fonte de
 * modificadores ('tool'), exatamente como uma skill.
 */
export class PlayerStats {
  toolIndex = 0;

  constructor(private attrs: Attributes) {
    this.applyTool();
  }

  get tool(): ToolDef {
    return toolAt(this.toolIndex);
  }

  setTool(index: number): void {
    this.toolIndex = index;
    this.applyTool();
  }

  private applyTool(): void {
    const tool = this.tool;
    this.attrs.setSource('tool', [
      { target: 'miningPower', op: 'flat', value: tool.miningPower },
      { target: 'miningSpeed', op: 'percentMultiply', value: tool.miningSpeed - 1 },
      { target: 'miningRange', op: 'flat', value: tool.rangeBonus },
    ]);
  }

  get miningPower(): number {
    return this.attrs.get('miningPower');
  }
  get miningSpeed(): number {
    return this.attrs.get('miningSpeed');
  }
  get miningRange(): number {
    return this.attrs.get('miningRange');
  }
  get moveSpeed(): number {
    return this.attrs.get('moveSpeed');
  }
  get jumpForce(): number {
    return this.attrs.get('jumpForce');
  }
  get airControl(): number {
    return this.attrs.get('airControl');
  }
  get inventoryCapacity(): number {
    return this.attrs.getInt('inventoryCapacity');
  }
  get lightRadius(): number {
    return this.attrs.get('lightRadius');
  }
  get interactionRange(): number {
    return this.attrs.get('interactionRange');
  }
  get climbStamina(): number {
    return this.attrs.get('climbStamina');
  }

  get climbSpeed(): number {
    return this.attrs.get('climbSpeed');
  }
  get carryMovePenalty(): number {
    return this.attrs.get('carryMovePenalty');
  }
  /** Tier vem da ferramenta, nao de atributo: define o que pode ser quebrado. */
  get toolTier(): number {
    return this.tool.tier;
  }
}
