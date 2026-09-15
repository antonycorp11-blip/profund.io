import { Assets } from '../core/Assets';
import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import { randInt } from '../core/math';
import { blockDef } from '../data/blocks';
import type { Camera } from '../core/camera';
import type { DropManager } from '../entities/DropManager';
import type { FloatingText } from '../fx/FloatingText';
import type { InputManager } from '../input/InputManager';
import type { Particles } from '../fx/Particles';
import type { Attributes } from '../systems/Attributes';
import type { Player } from '../player/Player';
import type { Procs } from '../systems/Procs';
import type { World } from '../world/World';
import { Haptics } from '../fx/Haptics';
import { RESOURCES } from '../data/resources';

interface HitFx {
  col: number;
  row: number;
  t: number;
  dirX: number;
  dirY: number;
}

/**
 * Nucleo do jogo: mira, aplica dano, gera feedback.
 * Regra: todo impacto produz som + particula + rachadura + shake + haptic.
 */
export class MiningSystem {
  targetCol = -1;
  targetRow = -1;
  hasTarget = false;
  /** 0..1 do bloco atualmente mirado. */
  targetProgress = 0;
  blockedReason: 'tool' | null = null;

  private timer = 0;
  private aimX = 1;
  private aimY = 0;
  private hitFx: HitFx[] = [];
  private toolWarnCooldown = 0;
  /** Contador de blocos quebrados (estatistica / save). */
  blocksMined = 0;
  /**
   * Gancho de combate: o mesmo golpe que quebra bloco fere criatura.
   * Devolve true quando algo foi atingido — nesse golpe o bloco e poupado,
   * para que mirar na criatura seja uma escolha clara e nao um acidente.
   */
  strike: ((dirX: number, dirY: number) => boolean) | null = null;

  constructor(
    private world: World,
    private player: Player,
    private particles: Particles,
    private floating: FloatingText,
    private drops: DropManager,
    private camera: Camera,
    private attrs: Attributes,
    private procs: Procs
  ) {}

  update(dt: number, input: InputManager, usingTouch: boolean): void {
    this.toolWarnCooldown = Math.max(0, this.toolWarnCooldown - dt);
    for (let i = this.hitFx.length - 1; i >= 0; i--) {
      this.hitFx[i].t -= dt;
      if (this.hitFx[i].t <= 0) this.hitFx.splice(i, 1);
    }

    this.updateAim(input, usingTouch);
    this.pickTarget();

    if (!input.isHeld('mine')) {
      this.timer = 0;
      this.blockedReason = null;
      return;
    }

    const stats = this.player.stats;
    const interval = 1 / (CONFIG.mining.hitsPerSecondBase * stats.miningSpeed);
    if (input.wasPressed('mine')) this.timer = interval; // primeiro golpe imediato
    this.timer += dt;

    let guard = 0;
    while (this.timer >= interval && guard++ < 4) {
      this.timer -= interval;
      if (!this.swingAt()) break;
    }
  }

  /** Um golpe: criatura primeiro, bloco depois. @returns false quando nao ha o que golpear. */
  private swingAt(): boolean {
    if (this.strike?.(this.aimX, this.aimY)) {
      this.player.swing = 1;
      this.player.swingDirX = this.aimX;
      this.player.swingDirY = this.aimY;
      this.camera.addShake(CONFIG.mining.shakeOnHit * 1.6);
      Haptics.hit();
      return true;
    }
    if (!this.hasTarget) return false;
    this.hit();
    return this.hasTarget;
  }

  private updateAim(input: InputManager, usingTouch: boolean): void {
    // Desktop: a mira segue o ponteiro (mas o teclado tem prioridade se foi usado por ultimo).
    if (!usingTouch && input.pointerActive && input.aimSource === 'pointer') {
      const w = this.camera.screenToWorld(input.pointerX, input.pointerY);
      const dx = w.x - this.player.cx;
      const dy = w.y - this.player.cy;
      const len = Math.hypot(dx, dy) || 1;
      this.aimX = dx / len;
      this.aimY = dy / len;
      return;
    }
    // Mobile/teclado: direcao do analogico; sem analogico, olha para frente.
    const ax = input.axisX;
    const ay = input.axisY;
    if (Math.abs(ax) > 0.05 || Math.abs(ay) > 0.05) {
      const len = Math.hypot(ax, ay) || 1;
      this.aimX = ax / len;
      this.aimY = ay / len;
    } else {
      this.aimX = this.player.facing;
      this.aimY = 0;
    }
  }

  /** Raycast por tiles a partir do centro do player. */
  private pickTarget(): void {
    const ts = this.world.tileSize;
    const range = this.player.stats.miningRange;
    const sx = this.player.cx;
    const sy = this.player.cy;

    this.hasTarget = false;
    this.targetCol = -1;
    this.targetRow = -1;
    this.targetProgress = 0;

    let lastCol = -1;
    let lastRow = -1;
    for (let d = 4; d <= range; d += 3) {
      const wx = sx + this.aimX * d;
      const wy = sy + this.aimY * d;
      const col = Math.floor(wx / ts);
      const row = Math.floor(wy / ts);
      if (col === lastCol && row === lastRow) continue;
      lastCol = col;
      lastRow = row;
      if (!this.world.inBounds(col, row)) break;
      if (!this.world.isSolid(col, row)) continue;
      const def = blockDef(this.world.getTile(col, row));
      if (def.indestructible) {
        // Bedrock/estrutura bloqueia o raio, mas nao vira alvo.
        break;
      }
      this.targetCol = col;
      this.targetRow = row;
      this.hasTarget = true;
      const dmg = this.world.getDamage(col, row);
      this.targetProgress = def.hp > 0 ? dmg / def.hp : 0;
      return;
    }
  }

  /**
   * Cores dos estilhacos: saem da textura real quando ela existe.
   * Minerio sempre entra na mistura, senao o carvao solta poeira cinza de pedra.
   */
  private debrisColors(def: ReturnType<typeof blockDef>): string[] {
    const fromArt = Assets.blockPalette(def.key);
    const base = fromArt && fromArt.length > 0 ? fromArt : [def.color, def.shade, def.speckle];
    if (def.oreColor) return [...base, def.oreColor, def.oreColor];
    return base;
  }

  private hit(): void {
    const col = this.targetCol;
    const row = this.targetRow;
    const ts = this.world.tileSize;
    const stats = this.player.stats;
    const target = this.world.getDef(col, row);

    // Dano do golpe: base + bonus por tipo de bloco + critico.
    let damage = stats.miningPower;
    if (target.tags.includes('hardStone')) damage *= 1 + this.attrs.get('hardBlockDamage');
    if (target.tags.includes('ore')) damage *= 1 + this.attrs.get('oreDamageBonus');

    const crit = this.procs.roll('blockCritical', { block: target });
    if (crit) damage *= this.attrs.get('blockCriticalMultiplier');

    const res = this.world.applyDamage(col, row, damage, stats.toolTier);
    const def = res.def;
    const cx = col * ts + ts / 2;
    const cy = row * ts + ts / 2;

    this.player.swing = 1;
    this.player.swingDirX = this.aimX;
    this.player.swingDirY = this.aimY;

    if (!res.applied) {
      if (res.blockedBy === 'tool') {
        this.blockedReason = 'tool';
        if (this.toolWarnCooldown <= 0) {
          this.toolWarnCooldown = 1.4;
          Events.emit('block:blocked', { reason: 'tool', requiredTool: def.minTool });
          Events.emit('ui:toast', {
            text: `${def.name}: precisa de uma picareta melhor`,
            tone: 'warn',
          });
          this.floating.push(cx, cy - 10, 'Ferramenta fraca', '#ff9a5c', 10);
        }
      }
      this.hasTarget = false;
      return;
    }

    this.blockedReason = null;
    this.hitFx.push({ col, row, t: 0.14, dirX: this.aimX, dirY: this.aimY });

    if (crit) {
      this.floating.push(cx, cy - 14, 'CRITICO!', '#ffd35c', 12);
      this.particles.sparks(cx, cy, 8, '#fff0b8');
      this.camera.addShake(CONFIG.mining.shakeOnHit * 2.2);
      Events.emit('proc:critical', { worldX: cx, worldY: cy, damage });
    }

    if (res.broken) {
      this.onBreak(col, row, cx, cy, def, crit);
      return;
    }

    this.targetProgress = res.progress;
    // Particulas saindo da face atingida, na direcao do jogador.
    this.particles.burst(
      cx - this.aimX * (ts * 0.35),
      cy - this.aimY * (ts * 0.35),
      CONFIG.particles.hitCount,
      this.debrisColors(def),
      { dirX: -this.aimX, dirY: -this.aimY, spread: 1.6, speed: 110, size: 3 }
    );
    if (def.oreGlow) {
      this.particles.sparks(cx, cy, 2, def.oreGlow);
    }
    this.camera.addShake(CONFIG.mining.shakeOnHit);
    Haptics.hit();
    Events.emit('block:hit', {
      col,
      row,
      blockId: def.id,
      material: def.sfxMaterial,
      progress: res.progress,
      worldX: cx,
      worldY: cy,
    });
  }

  private onBreak(
    col: number,
    row: number,
    cx: number,
    cy: number,
    def: ReturnType<typeof blockDef>,
    wasCritical = false
  ): void {
    this.blocksMined++;
    const colors = this.debrisColors(def);
    this.particles.burst(cx, cy, CONFIG.particles.breakCount, colors, {
      speed: 150,
      size: 4,
    });
    this.particles.dust(cx, cy, 4, colors[0] ?? def.shade);
    if (def.oreGlow) {
      this.particles.sparks(cx, cy, 10, def.oreGlow);
    }
    this.camera.addShake(CONFIG.mining.shakeOnBreak);
    Haptics.break_();

    // Drops fisicos, ja com rendimento e sorte das habilidades.
    if (def.drop && Math.random() < def.dropChance) {
      this.spawnLoot(cx, cy, def, wasCritical);
    }

    // Fratura: racha os quatro vizinhos ortogonais.
    if (this.procs.roll('fracture', { block: def })) {
      this.applyFracture(col, row);
    }

    Events.emit('block:break', {
      col,
      row,
      blockId: def.id,
      material: def.sfxMaterial,
      worldX: cx,
      worldY: cy,
    });
    this.hasTarget = false;
  }

  /**
   * Quantidade final de recurso e efeitos de sorte.
   * A quantidade LOGICA e separada da quantidade VISUAL: um jackpot solta
   * dezenas de fragmentos na tela sem criar dezenas de entidades fisicas.
   */
  private spawnLoot(
    cx: number,
    cy: number,
    def: ReturnType<typeof blockDef>,
    wasCritical: boolean
  ): void {
    const resource = def.drop!;
    const rdef = RESOURCES[resource];
    const isRare = rdef.rarity === 'raro' || rdef.rarity === 'epico';

    let total = randInt(def.dropMin, def.dropMax);
    total *= this.attrs.get('resourceYield');
    if (def.tags.includes('ore')) total *= this.attrs.get('oreYield');
    if (isRare) total *= this.attrs.get('rareResourceYield');

    const ctx = { block: def };
    // Criticos favorecem sorte (spec: "Trinca Premiada").
    if (wasCritical && this.procs.roll('extraDrop', ctx)) total += 1;
    if (this.procs.roll('extraDrop', ctx)) total += 1;
    if (this.procs.roll('doubleDrop', ctx)) total *= 2;
    if (this.procs.roll('tripleDrop', ctx)) total *= 3;
    if (this.procs.roll('veinRich', ctx)) total *= 1.5;

    const jackpot = this.procs.roll('jackpot', ctx);
    if (jackpot) total *= CONFIG.mining.jackpotMultiplier;

    total = Math.max(1, Math.round(total));

    // Entidades fisicas limitadas; o resto vira particula.
    const piles = Math.min(total, jackpot ? 12 : 4);
    for (let i = 0; i < piles; i++) {
      const amount = Math.floor(total / piles) + (i < total % piles ? 1 : 0);
      if (amount > 0) this.drops.spawn(cx, cy, resource, amount);
    }

    if (jackpot) {
      this.particles.sparks(cx, cy, 40, rdef.accent);
      this.particles.burst(cx, cy, 24, [rdef.color, rdef.accent], { speed: 240, size: 5 });
      this.floating.push(cx, cy - 20, `JACKPOT! +${total}`, rdef.accent, 16);
      this.camera.addShake(7);
      Haptics.break_();
      Events.emit('proc:jackpot', { worldX: cx, worldY: cy, resource, amount: total });
    } else if (isRare) {
      this.floating.push(cx, cy - 12, rdef.name.toUpperCase() + '!', rdef.accent, 13);
      this.particles.sparks(cx, cy, 12, rdef.accent);
      this.camera.addShake(2);
    }
  }

  /** Dano nos quatro vizinhos ortogonais, sem tocar em conteudo narrativo. */
  private applyFracture(col: number, row: number): void {
    const ts = this.world.tileSize;
    const share = this.attrs.get('adjacentBlockDamage');
    if (share <= 0) return;
    const damage = this.player.stats.miningPower * share;
    const tier = this.player.stats.toolTier;

    for (const [dc, dr] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]) {
      const c = col + dc;
      const r = row + dr;
      const neighbour = this.world.getDef(c, r);
      if (neighbour.type === 'ar' || neighbour.indestructible) continue;
      // Protecao: fratura nunca destroi estrutura antiga/narrativa.
      if (neighbour.tags.includes('ancient') || neighbour.tags.includes('special')) continue;

      const res = this.world.applyDamage(c, r, damage, tier);
      if (!res.applied) continue;
      const nx = c * ts + ts / 2;
      const ny = r * ts + ts / 2;
      this.particles.burst(nx, ny, 3, this.debrisColors(neighbour), { speed: 70, size: 2.5 });
      if (res.broken && neighbour.drop && Math.random() < neighbour.dropChance) {
        this.drops.spawn(nx, ny, neighbour.drop, 1);
      }
    }
    this.camera.addShake(1.4);
  }

  /** Desenhado depois dos tiles, antes do player. */
  render(ctx: CanvasRenderingContext2D): void {
    const ts = this.world.tileSize;

    // Flash de impacto.
    for (const fx of this.hitFx) {
      const t = fx.t / 0.14;
      const x = fx.col * ts;
      const y = fx.row * ts;
      const inset = (1 - t) * 3;
      ctx.globalAlpha = t * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + inset, y + inset, ts - inset * 2, ts - inset * 2);
      ctx.globalAlpha = 1;
    }

    if (!this.hasTarget) return;

    const x = this.targetCol * ts;
    const y = this.targetRow * ts;
    const pulse = 0.5 + Math.sin(performance.now() * 0.008) * 0.12;

    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = this.blockedReason ? '#ff7a4d' : '#ffffff';
    ctx.lineWidth = 1.5;
    // Cantos em L: mais legivel que um retangulo cheio.
    const c = ts * 0.3;
    ctx.beginPath();
    ctx.moveTo(x + 1, y + c);
    ctx.lineTo(x + 1, y + 1);
    ctx.lineTo(x + c, y + 1);
    ctx.moveTo(x + ts - c, y + 1);
    ctx.lineTo(x + ts - 1, y + 1);
    ctx.lineTo(x + ts - 1, y + c);
    ctx.moveTo(x + ts - 1, y + ts - c);
    ctx.lineTo(x + ts - 1, y + ts - 1);
    ctx.lineTo(x + ts - c, y + ts - 1);
    ctx.moveTo(x + c, y + ts - 1);
    ctx.lineTo(x + 1, y + ts - 1);
    ctx.lineTo(x + 1, y + ts - c);
    ctx.stroke();
    ctx.restore();

    // Barra de progresso do bloco.
    if (this.targetProgress > 0.02) {
      const bw = ts * 0.8;
      const bx = x + (ts - bw) / 2;
      const by = y - 6;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by, bw, 3);
      ctx.fillStyle = '#ffd35c';
      ctx.fillRect(bx, by, bw * this.targetProgress, 3);
    }
  }
}
