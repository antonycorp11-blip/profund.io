import { Assets } from '../core/Assets';
import { CONFIG } from '../data/config';
import { CREATURE_CONFIG, type CreatureDef } from '../data/creatures';
import type { World } from '../world/World';

type AnimName = 'idle' | 'walk' | 'attack' | 'hurt' | 'death';

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
  /** Animacao corrente e o tempo dentro dela. */
  private anim: AnimName = 'idle';
  private animTime = 0;
  /** Trava a animacao ate acabar (ataque, dano, morte). */
  private animLock = 0;
  /** Segundos que o corpo ainda fica na tela depois de morrer. */
  private deathFade = 0;
  /** Altura que quem voa persegue. */
  private flyTargetY = 0;

  // --- mecanica de chefe ---
  /** Ja entrou em furia? A virada acontece uma vez so. */
  enraged = false;
  /** Contagem para a proxima investida. */
  private chargeTimer = 0;
  /**
   * > 0 = parado, preparando a investida (o telegrafo).
   *
   * Publico porque o telegrafo so existe se alguem DESENHAR. Enquanto este
   * numero era privado a investida saia do nada: 260 px/s cruzando a arena
   * sem aviso nenhum nao e dificuldade, e so dano que o jogador nao tinha
   * como evitar. O renderizador le isto para marcar o corredor no chao.
   */
  windup = 0;
  /** Quanto durou o preparo desta investida, para medir o progresso 0..1. */
  windupTotal = 0;
  /** > 0 = investindo nesta direcao. */
  charging = 0;
  chargeDir: 1 | -1 = 1;
  /** Contagem para a proxima convocacao. */
  private summonTimer = 0;
  /**
   * Sinalizador lido pelo CreatureManager: o chefe pediu lacaios.
   *
   * O chefe nao cria criatura sozinho de proposito — quem conhece o limite de
   * populacao e as regras de spawn e o manager, e duplicar isso aqui daria
   * duas verdades sobre quantos bichos podem existir.
   */
  summonRequest = 0;
  /** Chefe que convocou este bicho (null = nasceu do mundo). */
  summonedBy: Creature | null = null;

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

  /** True enquanto o corpo ainda esta desaparecendo (nao pode ser removido). */
  get fading(): boolean {
    return this.deathFade > 0;
  }

  /** Toca uma animacao travada por `dur` segundos. */
  private play(anim: AnimName, dur: number): void {
    this.anim = anim;
    this.animTime = 0;
    this.animLock = dur;
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
    this.play('hurt', 0.3);
    this.vx = Math.sign(this.x - fromX) * 120;
    if (this.health <= 0) {
      this.state = 'morto';
      this.play('death', 0.7);
      this.deathFade = 0.7;
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
    this.animTime += dt;
    this.animLock = Math.max(0, this.animLock - dt);
    if (!this.alive) {
      this.deathFade = Math.max(0, this.deathFade - dt);
      return;
    }
    this.t += dt;
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);

    const boss = this.def.boss;
    if (boss) this.bossTick(dt, world, boss);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const homeDist = Math.hypot(this.x - this.homeX, this.y - this.homeY);
    if (this.def.flying) {
      this.flyTargetY =
        this.state === 'perseguindo' || this.state === 'atacando'
          ? player.y - 6
          : this.homeY + Math.sin(this.t * 0.7) * 22;
    }

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

    // Investida em curso: ela manda no movimento. Quem esta no caminho toma
    // o golpe, e a parede interrompe — e a saida do jogador e simplesmente
    // sair do caminho, que e o ponto de existir uma investida.
    if (this.charging > 0) {
      this.charging -= dt;
      this.facing = this.chargeDir;
      this.vx = this.chargeDir * (this.def.boss?.chargeSpeed ?? 240);
      if (this.blockedAhead(world, this.chargeDir)) this.charging = 0;
      if (dist <= this.def.attackRange * 1.4 && !player.invulnerable && this.attackTimer <= 0) {
        this.attackTimer = 0.5;
        hitPlayer(Math.round(this.def.damage * this.damageMult() * 1.3), this.x);
        this.charging = 0;
      }
      this.move(dt, world);
      return;
    }
    if (this.windup > 0) {
      this.windup -= dt;
      this.vx *= 0.6;
      this.facing = dx >= 0 ? 1 : -1;
      if (this.windup <= 0) {
        this.charging = 0.85;
        this.chargeDir = this.facing;
      }
      this.move(dt, world);
      return;
    }

    switch (this.state) {
      case 'atacando':
        this.vx *= 0.7;
        this.facing = dx >= 0 ? 1 : -1;
        if (this.attackTimer <= 0 && !player.invulnerable) {
          this.attackTimer = this.def.attackCooldown * this.cooldownMult();
          this.play('attack', 0.5);
          hitPlayer(Math.round(this.def.damage * this.damageMult()), this.x);
        }
        if (dist > this.def.attackRange * 1.3) this.state = 'perseguindo';
        break;

      case 'perseguindo': {
        const dir = Math.sign(dx) || 1;
        this.facing = dir as 1 | -1;
        this.vx = dir * this.def.moveSpeed * this.speedMult();
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

    if (this.animLock <= 0) {
      const andando = Math.abs(this.vx) > 6 || (this.def.flying && Math.abs(this.vy) > 6);
      const proxima: AnimName = andando ? 'walk' : 'idle';
      if (proxima !== this.anim) {
        this.anim = proxima;
        this.animTime = 0;
      }
    }
  }

  private speedMult(): number {
    return this.enraged ? this.def.boss?.enrageSpeed ?? 1 : 1;
  }

  private damageMult(): number {
    return this.enraged ? this.def.boss?.enrageDamage ?? 1 : 1;
  }

  private cooldownMult(): number {
    return this.enraged ? this.def.boss?.enrageCooldown ?? 1 : 1;
  }

  /**
   * Relogio das mecanicas de chefe.
   *
   * Investida e convocacao so contam quando o chefe ja viu o jogador: um chefe
   * sozinho na arena investindo contra a parede por meia hora seria ridiculo e
   * ainda gastaria criatura do teto de populacao.
   */
  private bossTick(dt: number, world: World, boss: NonNullable<CreatureDef['boss']>): void {
    if (!this.enraged && this.health <= this.def.health * boss.enrageAt) {
      this.enraged = true;
      this.play('hurt', 0.45);
    }
    const engajado = this.state === 'perseguindo' || this.state === 'atacando';
    if (!engajado) return;

    this.chargeTimer -= dt;
    if (this.chargeTimer <= 0 && this.charging <= 0 && this.windup <= 0) {
      this.chargeTimer = boss.chargeEverySec * (this.enraged ? 0.65 : 1);
      this.windup = boss.chargeWindupSec;
      this.windupTotal = boss.chargeWindupSec;
      this.play('attack', boss.chargeWindupSec);
    }

    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      this.summonTimer = boss.summonEverySec * (this.enraged ? 0.7 : 1);
      this.summonRequest += boss.summonCount;
    }
    void world;
  }

  private move(dt: number, world: World): void {
    const w = this.def.w;
    const h = this.def.h;

    // Quem voa nao cai: flutua e sobe/desce para alcancar o alvo. Sem isto o
    // morcego "anda" pelo chao da caverna, o que so mostra que ele e um bloco
    // com asas.
    if (this.def.flying) {
      this.vy += (this.flyTargetY - this.y) * 2.4 * dt * 60 * 0.016;
      this.vy = Math.max(-this.def.moveSpeed, Math.min(this.def.moveSpeed, this.vy));
      const nfx = this.x + this.vx * dt;
      if (!world.rectCollides(nfx - w / 2, this.y - h / 2, w, h)) this.x = nfx;
      else this.vx = -this.vx * 0.4;
      const nfy = this.y + this.vy * dt;
      if (!world.rectCollides(this.x - w / 2, nfy - h / 2, w, h)) this.y = nfy;
      else this.vy = -this.vy * 0.4;
      this.vx *= 0.9;
      this.vy *= 0.9;
      // Balanco proprio do voo, para nao ficar deslizando reto.
      this.y += Math.sin(this.t * 5) * 0.25;
      return;
    }

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

  /**
   * Desenha a partir das tiras. Devolve false quando a arte daquele bicho
   * ainda nao existe — ai o chamador cai no desenho vetorial.
   *
   * A arte olha para a direita; o espelhamento segue o `facing`.
   */
  private renderArt(ctx: CanvasRenderingContext2D): boolean {
    const d = this.def;
    if (!d.art) return false;
    const sheet = Assets.creature(d.art, this.anim) ?? Assets.creature(d.art, 'idle');
    if (!sheet) return false;

    const n = CREATURE_CONFIG.frames;
    const fps = CREATURE_CONFIG.fps[this.anim] ?? 8;
    // Morte e dano nao repetem: param no ultimo quadro.
    const bruto = Math.floor(this.animTime * fps);
    const i =
      this.anim === 'death' || this.anim === 'hurt'
        ? Math.min(n - 1, bruto)
        : bruto % n;

    const size = CREATURE_CONFIG.frameSize;
    const scale = d.drawHeight / size;
    const w = size * scale;
    const h = d.drawHeight;
    // Os pes da tira estao em 92% do quadro; alinhar com a base da caixa.
    const feetY = this.y + d.h / 2;
    const top = feetY - h * 0.92;

    ctx.save();
    if (!this.alive) ctx.globalAlpha = Math.max(0, this.deathFade / 0.7);

    if (this.alive) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(this.x, feetY + 1, d.w * 0.45, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.translate(Math.round(this.x), Math.round(top));
    if (this.facing === -1) ctx.scale(-1, 1);
    ctx.drawImage(sheet, i * size, 0, size, size, -w / 2, 0, w, h);
    ctx.restore();

    // Piscada branca ao levar dano, por cima da arte.
    if (this.hurtTimer > 0 && this.alive) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.75, this.hurtTimer * 3);
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(Math.round(this.x), Math.round(top));
      if (this.facing === -1) ctx.scale(-1, 1);
      ctx.drawImage(sheet, i * size, 0, size, size, -w / 2, 0, w, h);
      ctx.restore();
    }

    if (this.alive && this.health < d.health) this.renderHealthBar(ctx, top);
    return true;
  }

  private renderHealthBar(ctx: CanvasRenderingContext2D, top: number): void {
    const d = this.def;
    const w = d.w + 10;
    const y = top - 6;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(this.x - w / 2, y, w, 4);
    ctx.fillStyle = this.isGuardian ? '#c08aff' : '#e05a5a';
    ctx.fillRect(this.x - w / 2, y, w * (this.health / d.health), 4);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive && this.deathFade <= 0) return;
    if (this.renderArt(ctx)) return;
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
