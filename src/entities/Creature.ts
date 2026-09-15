import { CONFIG } from '../data/config';
import type { CreatureDef } from '../data/creatures';
import type { World } from '../world/World';

export type CreatureState = 'parado' | 'patrulha' | 'perseguindo' | 'atacando' | 'ferido' | 'morto';

/**
 * Criatura da mina.
 *
 * IA curta de proposito: ela guarda um lugar. Persegue enquanto o jogador esta
 * perto do posto dela e volta quando ele se afasta — nunca segue pela mina toda.
 */
export class Creature {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  health: number;
  state: CreatureState = 'parado';
  facing: 1 | -1 = 1;
  /** Posto que ela guarda. */
  homeX = 0;
  homeY = 0;
  /** Guardioes nascem ligados a um ponto generoso. */
  readonly isGuardian: boolean;

  private attackTimer = 0;
  private hurtTimer = 0;
  private patrolDir: 1 | -1 = 1;
  private patrolTimer = 0;
  private t = Math.random() * 10;
  /** Segundos preso dentro de rocha (o jogador pode fechar o vao dela). */
  private stuckTime = 0;

  constructor(readonly def: CreatureDef, x: number, y: number) {
    this.health = def.health;
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.isGuardian = def.behavior === 'guardiao';
  }

  get alive(): boolean {
    return this.state !== 'morto';
  }

  /** Emparedada: quem cuida disso e o CreatureManager (some ou volta ao posto). */
  get isStuck(): boolean {
    return this.stuckTime > 2.5;
  }

  get cx(): number {
    return this.x;
  }

  get cy(): number {
    return this.y;
  }

  /** Recebe dano. Retorna true se morreu agora. */
  hurt(amount: number, fromX: number): boolean {
    if (!this.alive) return false;
    this.health -= amount;
    this.hurtTimer = 0.22;
    this.vx = Math.sign(this.x - fromX) * 120;
    if (this.health <= 0) {
      this.state = 'morto';
      return true;
    }
    // Levar dano sempre acorda a criatura, mesmo a passiva.
    if (this.state !== 'perseguindo') this.state = 'perseguindo';
    return false;
  }

  update(
    dt: number,
    world: World,
    player: { x: number; y: number; invulnerable: boolean },
    hitPlayer: (damage: number, fromX: number) => void
  ): void {
    if (!this.alive) return;
    this.t += dt;
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const homeDist = Math.hypot(this.x - this.homeX, this.y - this.homeY);

    // Passiva so reage se for atacada; as outras percebem por proximidade.
    const notices =
      this.def.behavior !== 'passivo' && dist < this.def.aggroRange && homeDist < 420;

    if (this.state === 'perseguindo' && (dist > this.def.aggroRange * 1.8 || homeDist > 520)) {
      this.state = 'patrulha';
    } else if (notices) {
      this.state = dist <= this.def.attackRange ? 'atacando' : 'perseguindo';
    } else if (this.state !== 'perseguindo' && this.state !== 'atacando') {
      this.state = 'patrulha';
    }

    switch (this.state) {
      case 'atacando':
        this.vx *= 0.7;
        this.facing = dx >= 0 ? 1 : -1;
        if (this.attackTimer <= 0 && !player.invulnerable) {
          this.attackTimer = this.def.attackCooldown;
          hitPlayer(this.def.damage, this.x);
        }
        if (dist > this.def.attackRange * 1.3) this.state = 'perseguindo';
        break;

      case 'perseguindo': {
        const dir = Math.sign(dx) || 1;
        this.facing = dir as 1 | -1;
        this.vx = dir * this.def.moveSpeed;
        // Sobe degrau: sem isso ela trava em qualquer desnivel.
        if (this.blockedAhead(world, dir) && this.onGround(world)) this.vy = -230;
        if (dist <= this.def.attackRange) this.state = 'atacando';
        break;
      }

      default: {
        // Patrulha curta ao redor do posto.
        this.patrolTimer -= dt;
        if (this.patrolTimer <= 0) {
          this.patrolTimer = 1.6 + Math.random() * 2.4;
          this.patrolDir = Math.random() < 0.5 ? -1 : 1;
          if (Math.abs(this.x - this.homeX) > 120) {
            this.patrolDir = this.x > this.homeX ? -1 : 1;
          }
        }
        this.facing = this.patrolDir;
        this.vx = this.patrolDir * this.def.moveSpeed * 0.45;
        if (this.blockedAhead(world, this.patrolDir)) this.patrolDir = -this.patrolDir as 1 | -1;
        break;
      }
    }

    this.move(dt, world);
  }

  private move(dt: number, world: World): void {
    const w = this.def.w;
    const h = this.def.h;

    // Presa dentro da rocha: sobe devagar tentando achar ar. Se nao achar em
    // poucos segundos, o manager resolve — nada de criatura vibrando na parede.
    if (world.rectCollides(this.x - w / 2, this.y - h / 2, w, h)) {
      this.stuckTime += dt;
      this.y -= 22 * dt;
      this.vx = 0;
      this.vy = 0;
      return;
    }
    this.stuckTime = 0;

    this.vy = Math.min(this.vy + CONFIG.physics.gravity * dt, 640);

    const nx = this.x + this.vx * dt;
    if (!world.rectCollides(nx - w / 2, this.y - h / 2, w, h)) this.x = nx;
    else this.vx = 0;

    const ny = this.y + this.vy * dt;
    if (world.rectCollides(this.x - w / 2, ny - h / 2, w, h)) {
      const ts = world.tileSize;
      if (this.vy > 0) this.y = Math.floor((ny + h / 2) / ts) * ts - h / 2 - 0.01;
      this.vy = 0;
    } else {
      this.y = ny;
    }
    this.vx *= 0.86;
  }

  private blockedAhead(world: World, dir: number): boolean {
    return world.isSolidAtPixel(this.x + dir * (this.def.w / 2 + 4), this.y);
  }

  private onGround(world: World): boolean {
    return world.rectCollides(
      this.x - this.def.w / 2,
      this.y - this.def.h / 2 + 2,
      this.def.w,
      this.def.h
    );
  }

  distanceTo(x: number, y: number): number {
    return Math.hypot(this.x - x, this.y - y);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;
    const d = this.def;
    const bob = Math.sin(this.t * 4) * 1.5;
    const x = this.x;
    const y = this.y + bob;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, this.y + d.h / 2 + 1, d.w * 0.45, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo. A arte final entra aqui; a silhueta ja diferencia cada tipo.
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(this.facing, 1);
    ctx.fillStyle = this.hurtTimer > 0 ? '#ffffff' : d.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, d.w / 2, d.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.hurtTimer > 0 ? '#ffffff' : d.accent;
    if (this.isGuardian) {
      // Guardiao: cristais nas costas.
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 8, -d.h / 2);
        ctx.lineTo(i * 8 - 4, -d.h / 2 - 12 - Math.abs(i) * -4);
        ctx.lineTo(i * 8 + 4, -d.h / 2 - 8);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Olhos.
    ctx.beginPath();
    ctx.arc(d.w * 0.22, -d.h * 0.12, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Barra de vida so depois do primeiro dano.
    if (this.health < d.health) {
      const w = d.w + 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - w / 2, this.y - d.h / 2 - 9, w, 4);
      ctx.fillStyle = this.isGuardian ? '#c08aff' : '#e05a5a';
      ctx.fillRect(x - w / 2, this.y - d.h / 2 - 9, w * (this.health / d.health), 4);
    }
  }
}
