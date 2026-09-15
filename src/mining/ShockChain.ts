import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import type { Attributes } from '../systems/Attributes';
import type { BlockDef } from '../data/blocks';
import type { World } from '../world/World';

export interface ShockArc {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  strong: boolean;
}

interface Target {
  col: number;
  row: number;
}

/**
 * Corrente eletrica que salta de bloco em bloco.
 *
 * O ponto da habilidade e recompensar quem acha um veio: a corrente PREFERE
 * blocos do mesmo material do que foi atingido. Bater numa pedra solta faz
 * pouco; bater no meio de um aglomerado de ferro derruba o aglomerado.
 *
 * Nao e uma explosao em area: ela caminha por vizinhanca, entao respeita a
 * forma do veio e nao atravessa parede vazia.
 */
export class ShockChain {
  readonly arcs: ShockArc[] = [];

  constructor(
    private world: World,
    private attrs: Attributes
  ) {}

  update(dt: number): void {
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      this.arcs[i].t -= dt;
      if (this.arcs[i].t <= 0) this.arcs.splice(i, 1);
    }
  }

  /**
   * Dispara a corrente a partir do bloco atingido.
   * @param damage dano base da martelada (a corrente aplica uma fracao)
   * @param onBreak recebe o bloco COMO ERA antes de quebrar — depois do dano o
   *   tile ja virou ar e nao daria para saber o que ele soltava
   */
  fire(
    col: number,
    row: number,
    damage: number,
    toolTier: number,
    onBreak: (col: number, row: number, def: BlockDef) => void
  ): number {
    const originId = this.world.getTile(col, row);
    const jumps = Math.max(1, Math.round(this.attrs.get('shockJumps')));
    const range = Math.max(1, this.attrs.get('shockRange'));
    const power = Math.max(0.05, this.attrs.get('shockPower'));

    const visited = new Set<number>([this.world.idx(col, row)]);
    const chain: Target[] = [];
    let current: Target = { col, row };

    for (let i = 0; i < jumps && chain.length < CONFIG.skills.shockMaxTargets; i++) {
      const next = this.pickNext(current, originId, range, visited);
      if (!next) break;
      visited.add(this.world.idx(next.col, next.row));
      chain.push(next);
      current = next;
    }
    if (chain.length === 0) return 0;

    const ts = this.world.tileSize;
    const half = ts / 2;
    let from = { x: col * ts + half, y: row * ts + half };
    let hits = 0;

    for (const t of chain) {
      const def = this.world.getDef(t.col, t.row);
      // Os arcos aparecem mesmo quando o bloco aguenta: o jogador precisa ver
      // por onde a corrente passou para entender o alcance dela.
      const to = { x: t.col * ts + half, y: t.row * ts + half };
      this.arcs.push({
        x0: from.x,
        y0: from.y,
        x1: to.x,
        y1: to.y,
        t: CONFIG.skills.shockArcSec,
        strong: def.id === originId,
      });
      from = to;

      const res = this.world.applyDamage(t.col, t.row, damage * power, toolTier);
      hits++;
      if (res.broken) onBreak(t.col, t.row, def);
    }

    Events.emit('skill:shock', {
      worldX: col * ts + half,
      worldY: row * ts + half,
      hits,
    });
    return hits;
  }

  /**
   * Proximo elo: o vizinho minerAvel mais "atraente" dentro do alcance.
   * Mesmo material pesa mais; distancia pesa contra. Sem isso a corrente
   * andaria em linha reta e ignoraria o formato do veio.
   */
  private pickNext(
    from: Target,
    originId: number,
    range: number,
    visited: Set<number>
  ): Target | null {
    const r = Math.ceil(range);
    let best: Target | null = null;
    let bestScore = -Infinity;

    for (let dr = -r; dr <= r; dr++) {
      for (let dc = -r; dc <= r; dc++) {
        if (dc === 0 && dr === 0) continue;
        const col = from.col + dc;
        const row = from.row + dr;
        if (!this.world.inBounds(col, row)) continue;
        const dist = Math.hypot(dc, dr);
        if (dist > range) continue;
        const i = this.world.idx(col, row);
        if (visited.has(i)) continue;

        const def = this.world.getDef(col, row);
        if (!def.solid || def.hp <= 0) continue;
        // Bloco de historia nunca e alvo de efeito de sorte ou de area.
        if (
          def.tags.includes('indestructible') ||
          def.tags.includes('quest') ||
          def.tags.includes('boss')
        ) {
          continue;
        }

        let score = -dist;
        if (def.id === originId) score += CONFIG.skills.shockSameBlockBias;
        else if (def.tags.includes('ore')) score += 1;
        if (score > bestScore) {
          bestScore = score;
          best = { col, row };
        }
      }
    }
    return best;
  }

  /** Arcos desenhados depois da iluminacao: eletricidade tem que brilhar. */
  render(ctx: CanvasRenderingContext2D): void {
    if (this.arcs.length === 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (const arc of this.arcs) {
      const fade = Math.max(0, arc.t / CONFIG.skills.shockArcSec);
      ctx.globalAlpha = fade;
      ctx.strokeStyle = arc.strong ? '#bfe9ff' : '#7fb6ff';
      ctx.lineWidth = arc.strong ? 2.4 : 1.4;
      this.strokeBolt(ctx, arc);
      // Nucleo branco por dentro: e o que le como "eletricidade" e nao "linha".
      ctx.globalAlpha = fade * 0.9;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = arc.strong ? 1 : 0.6;
      this.strokeBolt(ctx, arc);
    }
    ctx.restore();
  }

  /** Raio quebrado em segmentos com desvio: reto demais nao parece corrente. */
  private strokeBolt(ctx: CanvasRenderingContext2D, arc: ShockArc): void {
    const dx = arc.x1 - arc.x0;
    const dy = arc.y1 - arc.y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const steps = 4;
    // Semente fixa por arco: o raio treme, mas nao "ferve" entre um frame e outro.
    const seed = Math.abs(arc.x0 * 31 + arc.y0 * 17 + arc.x1 * 7);

    ctx.beginPath();
    ctx.moveTo(arc.x0, arc.y0);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const wobble = (((seed * (i + 3)) % 17) / 17 - 0.5) * (len * 0.22);
      ctx.lineTo(arc.x0 + dx * t + nx * wobble, arc.y0 + dy * t + ny * wobble);
    }
    ctx.lineTo(arc.x1, arc.y1);
    ctx.stroke();
  }
}
