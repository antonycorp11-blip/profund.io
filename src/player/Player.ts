import { CONFIG } from '../data/config';
import { approach, clamp } from '../core/math';
import type { InputManager } from '../input/InputManager';
import type { World } from '../world/World';
import type { PlayerStats } from './PlayerStats';

const EPS = 0.001;

/** Protagonista: fisica AABB contra o tilemap + estado de animacao. */
export class Player {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  readonly w = CONFIG.player.width;
  readonly h = CONFIG.player.height;

  facing: 1 | -1 = 1;
  onGround = false;
  readonly stats: PlayerStats;
  /** 0..1 — quanto a mochila esta cheia (afeta a velocidade). */
  loadRatio = 0;
  /** Parede agarrada agora: -1 esquerda, 1 direita, 0 nenhuma. */
  climbingWall: -1 | 0 | 1 = 0;
  /** Forca restante para continuar agarrado. */
  climbStamina = CONFIG.player.climb.stamina;
  /** True quando desliza por falta de forca. */
  climbTired = false;
  /** Escalando entre duas paredes (chamine): nao cansa. */
  chimney = false;
  /** Passando por cima de uma borda agora. */
  mantling = false;
  /** Sobrevida do agarre depois que o sensor perde a parede. */
  private grabGrace = 0;
  private lastWallDir: -1 | 1 = 1;

  /** 0..1, avanco da animacao de golpe (controlado pelo MiningSystem). */
  swing = 0;
  /** Direcao visual do golpe. */
  swingDirX = 1;
  swingDirY = 0;

  constructor(stats: PlayerStats) {
    this.stats = stats;
  }

  /** Habilidades que a arvore libera. */
  wallJumpUnlocked = false;
  private coyote = 0;
  private jumpBufferTimer = 0;
  /** Fase do ciclo de caminhada (usada tambem pelo sprite animado). */
  walkPhase = 0;
  private wasOnGround = false;
  /** Tempo de queda, usado para um leve squash ao aterrissar. */
  private airTime = 0;
  /** 0..1, compressao ao aterrissar (usada tambem pelo sprite animado). */
  landSquash = 0;

  get cx(): number {
    return this.x + this.w / 2;
  }

  get cy(): number {
    return this.y + this.h / 2;
  }

  get feetY(): number {
    return this.y + this.h;
  }

  setPosition(cx: number, cy: number): void {
    this.x = cx - this.w / 2;
    this.y = cy - this.h / 2;
    this.vx = 0;
    this.vy = 0;
  }

  update(dt: number, input: InputManager, world: World): void {
    const p = CONFIG.physics;
    const moveX = clamp(input.axisX, -1, 1);

    // --- horizontal ---
    // Carregar muito pesa: a penalidade maxima vale com a mochila cheia.
    const carry = 1 - this.stats.carryMovePenalty * this.loadRatio;
    const target = moveX * this.stats.moveSpeed * carry;
    if (Math.abs(moveX) > 0.05) {
      const accel = (this.onGround ? p.groundAccel : p.airAccel * this.stats.airControl);
      this.vx = approach(this.vx, target, accel * dt);
      this.facing = moveX > 0 ? 1 : -1;
    } else {
      const fric = this.onGround ? p.groundFriction : p.airFriction;
      this.vx = approach(this.vx, 0, fric * dt);
    }

    // --- pulo ---
    if (input.wasPressed('jump')) this.jumpBufferTimer = p.jumpBuffer;
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    this.coyote = this.onGround ? p.coyoteTime : Math.max(0, this.coyote - dt);

    if (this.jumpBufferTimer > 0 && this.coyote > 0) {
      this.vy = -this.stats.jumpForce;
      this.jumpBufferTimer = 0;
      this.coyote = 0;
      this.onGround = false;
    }
    if (input.wasReleased('jump') && this.vy < 0) {
      this.vy *= p.jumpCutMultiplier;
    }

    // --- escalada ---
    // Sem isso, cavar um poco reto para baixo vira armadilha. Por isso escalar
    // e gratuito desde o inicio: a arvore melhora a velocidade e a resistencia.
    const climbCfg = CONFIG.player.climb;
    const climbSpeed = this.stats.climbSpeed;
    const sensed = this.wallAt(world);
    // Poco de 1 tile tem parede dos dois lados: da para escorar e subir sem
    // cansar. E o que garante que cavar reto para baixo nunca vire armadilha.
    this.chimney = this.bothWalls(world);

    // O sensor falha por um frame em quina, borda e tile recem-quebrado. Sem
    // esta sobrevida curta o jogador despenca do nada — o pior tipo de queda.
    if (sensed !== 0) {
      this.lastWallDir = sensed;
      this.grabGrace = climbCfg.grace;
    } else {
      this.grabGrace = Math.max(0, this.grabGrace - dt);
    }
    const wallDir: -1 | 0 | 1 = sensed !== 0 ? sensed : this.grabGrace > 0 ? this.lastWallDir : 0;

    const wasClimbing = this.climbingWall !== 0;
    const holdingUp = clamp(input.axisY, -1, 1) < -0.3;
    const pushingIn = wallDir !== 0 && Math.sign(moveX) === wallDir && Math.abs(moveX) > 0.35;

    /*
     * Regra de agarre: escalar e uma DECISAO, nunca um acidente.
     *
     * Exige empurrar contra a parede E pedir para subir. Segurar so para cima
     * perto de uma parede nao agarra mais — era isso que grudava o jogador o
     * tempo todo e atrapalhava andar, pular e minerar perto de qualquer
     * paredao. Poco de 1 tile (chamine) continua sendo o caso facil: ali so
     * para cima basta, porque ali nao ha mais nada que o jogador possa querer.
     */
    const canGrab = this.chimney ? holdingUp : pushingIn && holdingUp;

    this.climbingWall = 0;
    this.mantling = false;
    if (canGrab && this.climbStamina > 0) {
      this.climbingWall = wallDir !== 0 ? wallDir : 1;
      this.climbTired = false;

      // Segurar para cima sobe; parado, fica agarrado; para baixo, desce rapido.
      const up = -clamp(input.axisY, -1, 1);
      const descending = up < -0.2;
      // Descer nao cansa: quem desce esta indo embora, nao insistindo.
      if (!this.chimney && !descending) {
        this.climbStamina = Math.max(0, this.climbStamina - dt);
      }

      this.vy = up > 0.2 ? -climbSpeed : descending ? climbSpeed * 1.4 : -6;
      this.onGround = false;
      // Cola na parede em vez de zerar a velocidade: sem isso qualquer empurrao
      // afasta o corpo do sensor e o agarre cai sozinho.
      this.vx = this.chimney ? 0 : this.climbingWall * climbCfg.stick;
      this.facing = wallDir > 0 ? 1 : -1;

      // Passar por cima da borda. Sem isto, escalar termina sempre no mesmo
      // lugar: colado no topo da parede, sem conseguir subir nela.
      if (up > 0.2 && !this.chimney && this.ledgeAt(world, this.climbingWall)) {
        this.mantling = true;
        this.vy = -climbCfg.mantleSpeed;
        this.vx = this.climbingWall * climbCfg.mantlePush;
      }
    } else if (canGrab && this.climbStamina <= 0 && !this.onGround) {
      // Sem forca: desliza em vez de despencar.
      this.climbingWall = wallDir !== 0 ? wallDir : 1;
      this.climbTired = true;
      this.vy = climbCfg.slideSpeed;
      this.vx = this.climbingWall * climbCfg.stick;
    }

    // Empurrar para o lado oposto solta na hora: sair da parede tem que ser
    // tao imediato quanto agarrar nela.
    if (this.climbingWall !== 0 && Math.sign(moveX) === -this.climbingWall && Math.abs(moveX) > 0.5) {
      this.climbingWall = 0;
      this.grabGrace = 0;
      this.vx = moveX * this.stats.moveSpeed * 0.5;
    }

    if (this.onGround) {
      this.climbStamina = Math.min(
        climbCfg.stamina,
        this.climbStamina + climbCfg.recovery * dt
      );
      this.climbTired = false;
    }

    // Salto de parede (liberado pela arvore).
    if (this.wallJumpUnlocked && wasClimbing && input.wasPressed('jump') && wallDir !== 0) {
      this.vx = -wallDir * climbCfg.wallJumpX;
      this.vy = -climbCfg.wallJumpY;
      this.climbingWall = 0;
      this.climbStamina = Math.max(0, this.climbStamina - 0.5);
    }

    // --- gravidade ---
    if (this.climbingWall === 0) {
      this.vy = Math.min(this.vy + p.gravity * dt, p.maxFallSpeed);
    }

    // --- movimento com colisao (substeps para nao atravessar tiles) ---
    this.moveAndCollide(this.vx * dt, this.vy * dt, world);

    // --- animacao ---
    if (this.onGround) {
      this.walkPhase += Math.abs(this.vx) * dt * 0.09;
      if (!this.wasOnGround) this.landSquash = Math.min(1, this.airTime * 1.6);
      this.airTime = 0;
    } else {
      this.airTime += dt;
    }
    this.landSquash = Math.max(0, this.landSquash - dt * 4);
    this.wasOnGround = this.onGround;
    this.swing = Math.max(0, this.swing - dt * 3.2);
  }

  private moveAndCollide(dx: number, dy: number, world: World): void {
    const ts = world.tileSize;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (ts * 0.4)));
    const sx = dx / steps;
    const sy = dy / steps;

    for (let i = 0; i < steps; i++) {
      // X
      this.x += sx;
      if (world.rectCollides(this.x, this.y, this.w, this.h)) {
        if (sx > 0) {
          this.x = Math.floor((this.x + this.w) / ts) * ts - this.w - EPS;
        } else if (sx < 0) {
          this.x = (Math.floor(this.x / ts) + 1) * ts + EPS;
        }
        this.vx = 0;
      }

      // Y
      this.y += sy;
      if (world.rectCollides(this.x, this.y, this.w, this.h)) {
        if (sy > 0) {
          this.y = Math.floor((this.y + this.h) / ts) * ts - this.h - EPS;
          this.onGround = true;
        } else if (sy < 0) {
          this.y = (Math.floor(this.y / ts) + 1) * ts + EPS;
        }
        this.vy = 0;
      }
    }

    // Checagem de chao (um pixel abaixo dos pes).
    this.onGround = world.rectCollides(this.x, this.y + 1, this.w, this.h) && this.vy >= 0;
  }

  /**
   * Parede agarravel ao lado do jogador.
   * O sensor precisa alcancar o tile vizinho: o corpo tem 20 px num tile de 32,
   * entao sobra folga dos dois lados e um sensor curto nunca encostaria na parede.
   */
  /** Alcance do sensor: precisa cruzar a folga do corpo dentro do tile. */
  private get probeReach(): number {
    return CONFIG.tileSize / 2 - this.w / 2 + 7;
  }

  /**
   * Parede de um lado, testada em duas alturas.
   * Um unico ponto perde a parede em qualquer degrau; com ombro e joelho o
   * agarre continua enquanto houver rocha em frente ao corpo.
   */
  private wallSide(world: World, dir: -1 | 1): boolean {
    const x = dir < 0 ? this.x - this.probeReach : this.x + this.w + this.probeReach;
    return (
      world.isSolidAtPixel(x, this.y + this.h * 0.25) ||
      world.isSolidAtPixel(x, this.y + this.h * 0.75)
    );
  }

  private bothWalls(world: World): boolean {
    return this.wallSide(world, -1) && this.wallSide(world, 1);
  }

  private wallAt(world: World): -1 | 0 | 1 {
    if (this.wallSide(world, -1)) return -1;
    if (this.wallSide(world, 1)) return 1;
    return 0;
  }

  /**
   * Borda alcancavel: ainda ha rocha na altura do corpo, mas ja ha vao livre
   * acima da cabeca. E o momento exato de passar por cima em vez de parar ali.
   */
  private ledgeAt(world: World, dir: -1 | 1): boolean {
    const x = dir < 0 ? this.x - this.probeReach : this.x + this.w + this.probeReach;
    const headFree = !world.isSolidAtPixel(x, this.y - CONFIG.tileSize * 0.35);
    const bodySolid = world.isSolidAtPixel(x, this.y + this.h * 0.5);
    const roomAbove = !world.rectCollides(
      this.x,
      this.y - CONFIG.tileSize * 0.6,
      this.w,
      this.h
    );
    return headFree && bodySolid && roomAbove;
  }

  /** Empurra o player para fora de blocos (ex.: bloco criado em cima dele). */
  unstuck(world: World): void {
    if (!world.rectCollides(this.x, this.y, this.w, this.h)) return;
    for (let r = 1; r <= 4; r++) {
      const offsets = [
        [0, -r],
        [0, r],
        [-r, 0],
        [r, 0],
      ];
      for (const [ox, oy] of offsets) {
        const nx = this.x + ox * world.tileSize * 0.5;
        const ny = this.y + oy * world.tileSize * 0.5;
        if (!world.rectCollides(nx, ny, this.w, this.h)) {
          this.x = nx;
          this.y = ny;
          return;
        }
      }
    }
  }

  /** 0..1 da resistencia de escalada, para a HUD/sprite. */
  get climbRatio(): number {
    return this.climbStamina / CONFIG.player.climb.stamina;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const squash = 1 - this.landSquash * 0.22;
    const stretch = 1 + this.landSquash * 0.18;
    const cx = Math.round(this.cx);
    const baseY = Math.round(this.feetY);
    const h = this.h * squash;
    const w = this.w * stretch;

    ctx.save();
    ctx.translate(cx, baseY);

    // Sombra no chao.
    if (this.onGround) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 1, w * 0.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.scale(this.facing, 1);

    // Pernas.
    const walk = this.onGround ? Math.sin(this.walkPhase * Math.PI * 2) : 0;
    const legSwing = Math.abs(this.vx) > 8 ? walk * 3 : 0;
    ctx.fillStyle = '#3c5a78';
    ctx.fillRect(-w * 0.34, -h * 0.34, w * 0.28, h * 0.34 + legSwing);
    ctx.fillRect(w * 0.06, -h * 0.34, w * 0.28, h * 0.34 - legSwing);

    // Tronco.
    ctx.fillStyle = '#4a7ba8';
    ctx.fillRect(-w * 0.4, -h * 0.72, w * 0.8, h * 0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-w * 0.4, -h * 0.72, w * 0.8, h * 0.08);

    // Cabeca.
    ctx.fillStyle = '#e8c39a';
    ctx.fillRect(-w * 0.3, -h * 0.98, w * 0.6, h * 0.28);

    // Capacete + lanterna.
    ctx.fillStyle = '#e8b33a';
    ctx.fillRect(-w * 0.36, -h * 1.06, w * 0.72, h * 0.16);
    ctx.fillRect(w * 0.1, -h * 1.0, w * 0.34, h * 0.07);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(w * 0.18, -h * 0.98, w * 0.12, h * 0.08);

    // Picareta (anima durante o golpe).
    const swingAngle = -0.9 + Math.sin(this.swing * Math.PI) * 1.9;
    ctx.save();
    ctx.translate(w * 0.28, -h * 0.55);
    const dirBias = this.swingDirY * 0.6;
    ctx.rotate(swingAngle + dirBias);
    ctx.fillStyle = this.stats.tool.color;
    ctx.fillRect(-1.5, -2, 3, 16);
    ctx.fillStyle = '#d8dde3';
    ctx.fillRect(-7, -5, 14, 4);
    ctx.fillRect(4, -5, 4, 7);
    ctx.restore();

    ctx.restore();
  }
}
