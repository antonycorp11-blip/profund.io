import { blockDef } from '../data/blocks';
import { CREATURE_CONFIG, creatureDef, creaturesOfLayer } from '../data/creatures';
import { Creature } from '../entities/Creature';
import { Events } from '../core/events';
import { layerAt } from '../data/layers';
import { randInt } from '../core/math';
import type { DropManager } from '../entities/DropManager';
import type { Exploration } from './Exploration';
import type { World } from '../world/World';

export interface CreatureSave {
  guardians: { id: string; col: number; row: number; dead: boolean }[];
}

interface GuardPost {
  id: string;
  col: number;
  row: number;
  creatureId: string;
  dead: boolean;
}

/**
 * Povoa a mina.
 *
 * Duas populacoes diferentes:
 * - ambiente: nasce e some ao redor do jogador, dando vida a caverna;
 * - guardioes: fixos, marcados na geracao, protegendo os pontos generosos.
 *   Sao eles que dao sentido ao combate — a recompensa fica atras deles.
 */
export class CreatureManager {
  readonly creatures: Creature[] = [];
  private posts: GuardPost[] = [];
  private spawnTimer = 0;

  constructor(
    private world: World,
    private drops: DropManager,
    private exploration: Exploration
  ) {}

  /** Varre o mundo procurando aglomerados ricos para colocar um guardiao. */
  buildGuardPosts(): void {
    this.posts = [];
    // Passo grosso de proposito: um guardiao a cada ~15 m de profundidade no
    // maximo, senao a mina vira um corredor de chefes.
    const rowStep = 22;
    const colStep = 13;
    for (let row = this.world.surfaceRow + 120; row < this.world.height - 40; row += rowStep) {
      for (let col = 6; col < this.world.width - 6; col += colStep) {
        let score = 0;
        for (let r = row - 5; r <= row + 5; r++) {
          for (let c = col - 7; c <= col + 7; c++) {
            const def = blockDef(this.world.getTile(c, r));
            if (!def.tags.includes('rareOre')) continue;
            score += def.value >= 200 ? 3 : 1;
          }
        }
        if (score < 14) continue;

        // Precisa de um vao onde a criatura caiba.
        const spot = this.findAir(col, row);
        if (!spot) continue;

        const layer = layerAt(this.world.depthOfRow(spot.row));
        const guard = creatureDef('guardiao_cristal');
        if (!guard || !guard.layers.includes(layer.id)) continue;

        // Dois guardioes colados protegeriam o mesmo deposito.
        const tooClose = this.posts.some(
          (p) => Math.abs(p.col - spot.col) < 30 && Math.abs(p.row - spot.row) < 30
        );
        if (tooClose) continue;

        this.posts.push({
          id: `post_${spot.col}_${spot.row}`,
          col: spot.col,
          row: spot.row,
          creatureId: guard.id,
          dead: false,
        });
      }
    }
  }

  /** Quantos postos a geracao criou (debug / HUD de desenvolvimento). */
  get guardPostCount(): number {
    return this.posts.length;
  }

  private findAir(col: number, row: number): { col: number; row: number } | null {
    for (let r = row - 4; r <= row + 4; r++) {
      for (let c = col - 5; c <= col + 5; c++) {
        if (this.world.isSolid(c, r)) continue;
        if (this.world.isSolid(c, r + 1) && !this.world.isSolid(c, r - 1)) {
          return { col: c, row: r };
        }
      }
    }
    return null;
  }

  update(
    dt: number,
    player: { x: number; y: number; invulnerable: boolean },
    hitPlayer: (damage: number, fromX: number) => void
  ): void {
    // Guardioes acordam quando o jogador chega perto do posto.
    const ts = this.world.tileSize;
    for (const post of this.posts) {
      if (post.dead) continue;
      const px = post.col * ts + ts / 2;
      const py = post.row * ts + ts / 2;
      const dist = Math.hypot(px - player.x, py - player.y);
      const live = this.creatures.some((c) => c.alive && c.distanceTo(px, py) < 200);
      if (dist < 420 && !live) {
        const def = creatureDef(post.creatureId);
        if (def) {
          const c = new Creature(def, px, py);
          this.creatures.push(c);
          this.exploration.addMarker({
            id: post.id,
            kind: 'boss',
            col: post.col,
            row: post.row,
            label: def.name,
            alwaysVisible: false,
          });
          this.exploration.discoverMarker(post.id);
          Events.emit('ui:toast', { text: `${def.name}: ${def.tagline}`, tone: 'warn' });
        }
      }
    }

    // Populacao de ambiente.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = CREATURE_CONFIG.spawnInterval;
      this.trySpawnAmbient(player);
    }

    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      if (!c.alive) {
        // O corpo fica na tela ate a animacao de morte acabar.
        c.update(dt, this.world, player, hitPlayer);
        if (!c.fading) this.creatures.splice(i, 1);
        continue;
      }
      if (c.distanceTo(player.x, player.y) > CREATURE_CONFIG.despawn && !c.isGuardian) {
        this.creatures.splice(i, 1);
        continue;
      }
      if (c.isStuck) {
        // Guardiao volta ao posto; criatura de ambiente simplesmente some.
        if (!c.isGuardian) {
          this.creatures.splice(i, 1);
          continue;
        }
        c.x = c.homeX;
        c.y = c.homeY;
      }
      c.update(dt, this.world, player, hitPlayer);
    }
  }

  private trySpawnAmbient(player: { x: number; y: number }): void {
    if (this.creatures.length >= CREATURE_CONFIG.maxActive) return;
    const ts = this.world.tileSize;
    const depth = this.world.depthOfPixel(player.y);
    if (depth < 8) return; // a superficie e segura

    const layer = layerAt(depth);
    const pool = creaturesOfLayer(layer.id);
    if (pool.length === 0) return;

    for (let tries = 0; tries < 12; tries++) {
      const angle = Math.random() * Math.PI * 2;
      const dist =
        CREATURE_CONFIG.spawnMin +
        Math.random() * (CREATURE_CONFIG.spawnMax - CREATURE_CONFIG.spawnMin);
      const x = player.x + Math.cos(angle) * dist;
      const y = player.y + Math.sin(angle) * dist;
      const col = Math.floor(x / ts);
      const row = Math.floor(y / ts);
      if (!this.world.inBounds(col, row)) continue;
      if (this.world.isSolid(col, row) || this.world.isSolid(col, row - 1)) continue;

      let total = pool.reduce((n, c) => n + c.spawnWeight, 0);
      let roll = Math.random() * total;
      let def = pool[0];
      for (const c of pool) {
        roll -= c.spawnWeight;
        if (roll <= 0) {
          def = c;
          break;
        }
      }
      // Quem anda precisa de chao embaixo; quem voa nasce no vao mesmo.
      if (!def.flying && !this.world.isSolid(col, row + 1)) continue;
      this.creatures.push(new Creature(def, col * ts + ts / 2, row * ts + ts / 2));
      return;
    }
  }

  /** Coloca uma criatura no ar mais proximo do ponto pedido (ferramenta de teste). */
  spawnAt(id: string, x: number, y: number): boolean {
    const def = creatureDef(id);
    if (!def) return false;
    const ts = this.world.tileSize;
    const col = Math.floor(x / ts);
    const row = Math.floor(y / ts);
    const spot = this.world.isSolid(col, row) ? this.findAir(col, row) : { col, row };
    if (!spot) return false;
    this.creatures.push(new Creature(def, spot.col * ts + ts / 2, spot.row * ts + ts / 2));
    return true;
  }

  /** Ataque do jogador: acerta o que estiver no alcance na direcao da mira. */
  attack(
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    range: number,
    damage: number,
    opts: { critical?: boolean; guardianBonus?: number } = {}
  ): boolean {
    let hit = false;
    for (const c of this.creatures) {
      if (!c.alive) continue;
      const dx = c.x - x;
      const dy = c.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist > range + c.def.w / 2) continue;
      // Precisa estar do lado para onde o golpe foi.
      const dot = (dx / (dist || 1)) * dirX + (dy / (dist || 1)) * dirY;
      if (dot < 0.25) continue;
      hit = true;
      const dealt = Math.max(
        1,
        Math.round(damage * (c.isGuardian ? 1 + (opts.guardianBonus ?? 0) : 1))
      );
      Events.emit('creature:hurt', {
        worldX: c.x,
        worldY: c.y - c.def.h / 2,
        damage: dealt,
        critical: opts.critical ?? false,
        name: c.def.name,
      });
      if (c.hurt(dealt, x)) this.onKilled(c);
    }
    return hit;
  }

  private onKilled(c: Creature): void {
    for (const d of c.def.drops) {
      if (Math.random() > d.chance) continue;
      this.drops.spawn(c.x, c.y, d.resource, randInt(d.min, d.max));
    }
    if (c.isGuardian) {
      const ts = this.world.tileSize;
      const post = this.posts.find(
        (p) => Math.hypot(p.col * ts + ts / 2 - c.x, p.row * ts + ts / 2 - c.y) < 220
      );
      if (post) {
        post.dead = true;
        this.exploration.setMarkerDone(post.id);
      }
    }
    Events.emit('creature:killed', {
      id: c.def.id,
      name: c.def.name,
      guardian: c.isGuardian,
      skillPoints: c.def.skillPoints ?? 0,
      worldX: c.x,
      worldY: c.y,
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const c of this.creatures) c.render(ctx);
  }

  /** Luzes das criaturas emissivas (guardiao brilha no escuro). */
  lights(): { x: number; y: number; radius: number; intensity: number }[] {
    const out: { x: number; y: number; radius: number; intensity: number }[] = [];
    for (const c of this.creatures) {
      if (!c.isGuardian || !c.alive) continue;
      out.push({ x: c.x, y: c.y, radius: 110, intensity: 0.5 });
    }
    return out;
  }

  toJSON(): CreatureSave {
    return {
      guardians: this.posts.map((p) => ({
        id: p.creatureId,
        col: p.col,
        row: p.row,
        dead: p.dead,
      })),
    };
  }

  fromJSON(data: CreatureSave | undefined): void {
    if (!data?.guardians) return;
    // Os postos sao recalculados da geracao; aqui so restauramos quem ja morreu.
    for (const saved of data.guardians) {
      const post = this.posts.find((p) => p.col === saved.col && p.row === saved.row);
      if (post) post.dead = saved.dead;
    }
  }
}
