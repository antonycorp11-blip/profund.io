import { CONFIG } from '../data/config';
import { blockDef } from '../data/blocks';
import { CREATURE_CONFIG, creatureDef, creaturesOfLayer, type CreatureDef } from '../data/creatures';
import { Creature } from '../entities/Creature';
import { Events } from '../core/events';
import { layerAt } from '../data/layers';
import { baseCampAt } from '../data/basecamp';
import type { Camera } from '../core/camera';
import { insideBlockia } from '../data/gates';
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
  /**
   * O chefe com quem o jogador esta lutando AGORA, ou null.
   *
   * Existe para que a luta tenha comeco e fim declarados. Antes um chefe era
   * so um bicho com 190 de vida numa sala grande: nao havia barra, nao havia
   * nome na tela, e a furia — a virada inteira do combate — acontecia sem que
   * ninguem soubesse. Daqui saem os eventos que a interface escuta.
   */
  private emLuta: Creature | null = null;
  private ultimaVidaAvisada = -1;

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

  /**
   * Atende o pedido de lacaios de um chefe.
   *
   * Nascem colados nele, dentro da arena selada, e como criatura comum: se
   * afastarem demais somem sozinhos pelo despawn, entao uma luta longa nao
   * entulha o mapa.
   */
  private resolveSummon(boss: Creature): void {
    const cfg = boss.def.boss;
    const pedido = boss.summonRequest;
    boss.summonRequest = 0;
    if (!cfg) return;
    const def = creatureDef(cfg.summonId);
    if (!def) return;
    const vivos = this.creatures.filter((c) => c.alive && c.summonedBy === boss).length;
    const cabem = Math.min(pedido, cfg.summonMax - vivos);
    if (cabem <= 0) return;
    for (let n = 0; n < cabem; n++) {
      const lado = n % 2 === 0 ? -1 : 1;
      const c = new Creature(def, boss.x + lado * (26 + n * 8), boss.y - 10);
      c.summonedBy = boss;
      this.creatures.push(c);
    }
    Events.emit('boss:summon', { id: boss.def.id, name: boss.def.name, count: cabem });
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
      // Blockia e as BASES sao zona segura. Cidade tem gente para conversar;
      // base tem obra para tocar, painel para abrir e esteira para olhar — as
      // duas coisas pedem que o jogador possa largar o controle. A margem
      // passa da parede, entao nem perseguicao entra atras dele.
      if (this.zonaSegura(c.x, c.y)) {
        this.creatures.splice(i, 1);
        continue;
      }
      if (c.distanceTo(player.x, player.y) > CREATURE_CONFIG.despawn && !c.isGuardian) {
        this.creatures.splice(i, 1);
        continue;
      }
      // Lacaios do chefe. Quem resolve isto e o manager porque e ele que
      // conhece o teto de populacao — o chefe so levanta a mao.
      if (c.summonRequest > 0) {
        this.resolveSummon(c);
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

    this.telegrafoT += dt;
    this.acompanharLuta();
  }

  /**
   * Abre, alimenta e fecha o encontro de chefe.
   *
   * O gatilho e o chefe ENGAJAR, nao o jogador entrar na camara: quem desce
   * so para ver a arena, medir a sala ou cavar uma saida nao leva uma barra
   * de vida na cara. A luta comeca quando o guardiao decide que comecou.
   */
  private acompanharLuta(): void {
    const atual = this.emLuta;
    if (atual) {
      // Fim por morte, ou por o jogador ter ido embora e o bicho ter voltado
      // ao posto. Perder o chefe de vista encerra o encontro, mas nao cura
      // nada: a vida dele fica onde parou.
      const acabou = !atual.alive || atual.state === 'patrulha' || atual.state === 'parado';
      if (acabou) {
        this.emLuta = null;
        this.ultimaVidaAvisada = -1;
        Events.emit('boss:ended', { id: atual.def.id, defeated: !atual.alive });
        return;
      }
      if (atual.health !== this.ultimaVidaAvisada) {
        this.ultimaVidaAvisada = atual.health;
        Events.emit('boss:health', {
          id: atual.def.id,
          health: Math.max(0, atual.health),
          maxHealth: atual.def.health,
        });
      }
      if (atual.enraged && !this.furiaAvisada) {
        this.furiaAvisada = true;
        Events.emit('boss:enraged', { id: atual.def.id, name: atual.def.name });
      }
      return;
    }

    for (const c of this.creatures) {
      if (!c.alive || !c.def.boss) continue;
      if (c.state !== 'perseguindo' && c.state !== 'atacando') continue;
      this.emLuta = c;
      this.furiaAvisada = c.enraged;
      this.ultimaVidaAvisada = c.health;
      Events.emit('boss:engaged', {
        id: c.def.id,
        name: c.def.name,
        tagline: c.def.tagline ?? '',
        health: c.health,
        maxHealth: c.def.health,
        enrageAt: c.def.boss.enrageAt,
      });
      return;
    }
  }

  private furiaAvisada = false;

  /** Praca de cidade e chao de base: bicho nenhum fica, e nenhum nasce. */
  private zonaSegura(x: number, y: number): boolean {
    const ts = this.world.tileSize;
    const col = Math.floor(x / ts);
    const row = Math.floor(y / ts);
    if (insideBlockia(col, row, this.world.surfaceRow, CONFIG.blockia.safeMargin)) return true;
    return baseCampAt(col, row, this.world.surfaceRow, CREATURE_CONFIG.baseSafeMargin) !== null;
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
      // Nem nascer dentro da zona segura. O laco de despawn pegaria no quadro
      // seguinte, mas o bicho ja teria PISCADO na tela do jogador, e um vulto
      // que aparece e some dentro da base e pior do que um bicho de verdade.
      if (this.zonaSegura(x, y)) continue;

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

  /**
   * Posiciona um chefe de bioma EXATAMENTE nas coordenadas da arena.
   * Sem busca de ar (a arena ja e escavada pelo WorldGen) e sem chance de
   * cair fora do lugar — o chefe precisa estar sempre no mesmo ponto para o
   * marcador do mapa e a bussola baterem com o corpo dele.
   */
  spawnBoss(def: CreatureDef, x: number, y: number): Creature {
    const c = new Creature(def, x, y);
    this.creatures.push(c);
    return c;
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

  /**
   * Dano em area, sem direcao: e o que as habilidades usam.
   *
   * A Broca e o Choque so mexiam em pedra. Uma habilidade que atravessa uma
   * galeria inteira e ignora o bicho parado no meio dela nao faz sentido para
   * ninguem — o jogador aprende a usa-las minerando e depois descobre, na pior
   * hora, que elas nao servem numa luta.
   */
  damageArea(x: number, y: number, raio: number, damage: number, critical = false): number {
    let acertos = 0;
    for (const c of this.creatures) {
      if (!c.alive) continue;
      const dist = Math.hypot(c.x - x, c.y - y);
      if (dist > raio + c.def.w / 2) continue;
      const dealt = Math.max(1, Math.round(damage));
      Events.emit('creature:hurt', {
        worldX: c.x,
        worldY: c.y - c.def.h / 2,
        damage: dealt,
        critical,
        name: c.def.name,
      });
      if (c.hurt(dealt, x)) this.onKilled(c);
      acertos++;
    }
    return acertos;
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

  /**
   * O corredor da investida, pintado no chao antes do bicho.
   *
   * A investida sai a 260 px/s — atravessa a arena inteira em pouco mais de
   * um segundo. Sem aviso ela nao e dificuldade, e so dano que o jogador nao
   * tinha como evitar; com aviso ela vira a pergunta "da tempo de chegar
   * atras do pilar?", que e o que a arena foi construida para perguntar.
   *
   * O corredor PARA na primeira parede. Prometer um alcance que o pilar vai
   * interromper ensinaria a coisa errada: o jogador precisa ver que o pilar
   * corta a investida, porque e assim que ele descobre para que servem.
   */
  private renderTelegrafo(ctx: CanvasRenderingContext2D, c: Creature): void {
    const cfg = c.def.boss;
    if (!cfg || c.windup <= 0 || c.windupTotal <= 0) return;
    const ts = this.world.tileSize;
    const alcance = cfg.chargeSpeed * 0.85;
    const pes = c.y + c.def.h / 2;
    // Ate onde a investida realmente chega: para no primeiro tile solido.
    let dist = alcance;
    const passo = ts / 2;
    for (let d = passo; d <= alcance; d += passo) {
      if (this.world.isSolidAtPixel(c.x + c.facing * d, c.y)) {
        dist = d - passo;
        break;
      }
    }
    if (dist < 8) return;

    const prog = 1 - c.windup / c.windupTotal;
    const x0 = c.x + c.facing * (c.def.w / 2);
    const alturaFaixa = 7;
    ctx.save();
    // O trilho inteiro, fraco: onde a investida VAI passar.
    ctx.fillStyle = 'rgba(255, 110, 70, 0.16)';
    ctx.fillRect(
      Math.min(x0, x0 + c.facing * dist),
      pes - alturaFaixa,
      dist,
      alturaFaixa
    );
    // A parte carregada, forte: quanto tempo ainda resta para sair dali.
    const cheio = dist * prog;
    ctx.fillStyle = `rgba(255, 170, 90, ${0.34 + prog * 0.46})`;
    ctx.fillRect(
      Math.min(x0, x0 + c.facing * cheio),
      pes - alturaFaixa,
      cheio,
      alturaFaixa
    );
    // A ponta, piscando mais rapido quanto mais perto do disparo.
    ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(this.telegrafoT * (6 + prog * 14)));
    ctx.fillStyle = '#ffd7a0';
    ctx.fillRect(x0 + c.facing * cheio - 1.5, pes - alturaFaixa - 3, 3, alturaFaixa + 3);
    ctx.restore();
  }

  /** Relogio proprio do pisca-pisca: nao depende do estado de nenhum bicho. */
  private telegrafoT = 0;

  render(ctx: CanvasRenderingContext2D, camera?: Camera): void {
    for (const c of this.creatures) {
      if (camera && !camera.sees(c.x, c.y, 320)) continue;
      if (c.alive) this.renderTelegrafo(ctx, c);
    }
    for (const c of this.creatures) {
      // Guardiao com folga maior: ele e enorme e o corpo entra na tela muito
      // antes do centro dele.
      if (camera && !camera.sees(c.x, c.y, c.isGuardian ? 180 : 48)) continue;
      c.render(ctx);
    }
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
