import { BLOCK_IDS, blockDef, type BlockDef } from '../data/blocks';
import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import { layerAt } from '../data/layers';

export interface DamageResult {
  applied: boolean;
  broken: boolean;
  def: BlockDef;
  /** 0..1 */
  progress: number;
  /** Motivo de falha quando applied = false. */
  blockedBy?: 'tool' | 'indestructible';
  /**
   * O bloco tinha aura de veio prospero no instante da quebra.
   *
   * Vai no resultado pelo mesmo motivo que `def`: quem calcula o loot roda
   * DEPOIS do tile virar ar, e ai a aura ja nao existe mais.
   */
  wasRich?: boolean;
}

/**
 * Tilemap destrutivel.
 * Armazenamento: arrays tipados planos (sem GameObject por bloco).
 * As alteracoes em relacao a geracao ficam em `overrides` para o save.
 */
export class World {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
  readonly surfaceRow: number;

  readonly tiles: Uint8Array;
  /**
   * Dano por tile, esparso.
   *
   * Eram dois Float32Array do tamanho do mundo — 2 MB parados para guardar
   * zero em 249.999 tiles enquanto o jogador bate em um. Na pratica nunca ha
   * mais de algumas dezenas com dano ao mesmo tempo, e o `Set` abaixo ja
   * sabia quais eram. Um Map faz o mesmo trabalho e liberta a largura do
   * mundo: dobrar o mapa deixou de custar memoria.
   */
  private hits = new Map<number, { dmg: number; at: number }>();
  /** Indices com dano > 0 (para atualizacao/render baratos). */
  private damaged = new Set<number>();
  /** Tiles alterados em relacao a geracao: index -> blockId. */
  readonly overrides = new Map<number, number>();

  /** Chunks que precisam ser redesenhados. */
  readonly dirtyChunks = new Set<number>();
  readonly chunkSize: number;
  readonly chunkCols: number;
  readonly chunkRows: number;

  /**
   * Veios prosperos: index -> quando a aura expira (Infinity = nasceu assim).
   *
   * Map esparso em vez de mais um array do tamanho do mundo: sao dezenas de
   * tiles num mapa de centenas de milhares. Nao entra no save — os permanentes
   * saem da geracao deterministica e os temporarios deviam mesmo acabar.
   */
  private rich = new Map<number, number>();

  private time = 0;
  /** Minerios quebrados esperando a hora de voltar: index -> bloco e quando. */
  private regrowQueue = new Map<number, { id: number; at: number }>();
  /** Onde o jogador esta, para nao fazer bloco nascer em cima dele. */
  private watchX = 0;
  private watchY = 0;
  private regrowTick = 0;

  constructor() {
    this.width = CONFIG.world.width;
    this.height = CONFIG.world.height;
    this.tileSize = CONFIG.tileSize;
    this.surfaceRow = CONFIG.world.surfaceRow;
    this.tiles = new Uint8Array(this.width * this.height);
    this.chunkSize = CONFIG.world.chunkSize;
    this.chunkCols = Math.ceil(this.width / this.chunkSize);
    this.chunkRows = Math.ceil(this.height / this.chunkSize);
  }

  get pixelWidth(): number {
    return this.width * this.tileSize;
  }

  get pixelHeight(): number {
    return this.height * this.tileSize;
  }

  idx(col: number, row: number): number {
    return row * this.width + col;
  }

  inBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.width && row >= 0 && row < this.height;
  }

  /** Fora do mundo: ar acima, rocha-mae nas laterais e no fundo. */
  getTile(col: number, row: number): number {
    if (row < 0) return BLOCK_IDS.AIR;
    if (col < 0 || col >= this.width || row >= this.height) return BLOCK_IDS.BEDROCK;
    return this.tiles[this.idx(col, row)];
  }

  getDef(col: number, row: number): BlockDef {
    return blockDef(this.getTile(col, row));
  }

  isSolid(col: number, row: number): boolean {
    return blockDef(this.getTile(col, row)).solid;
  }

  isSolidAtPixel(x: number, y: number): boolean {
    return this.isSolid(Math.floor(x / this.tileSize), Math.floor(y / this.tileSize));
  }

  /** Colisao de um AABB em pixels de mundo contra tiles solidos. */
  rectCollides(x: number, y: number, w: number, h: number): boolean {
    const c0 = Math.floor(x / this.tileSize);
    const c1 = Math.floor((x + w - 0.001) / this.tileSize);
    const r0 = Math.floor(y / this.tileSize);
    const r1 = Math.floor((y + h - 0.001) / this.tileSize);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (this.isSolid(c, r)) return true;
      }
    }
    return false;
  }

  /** Grava um tile (usado pela geracao: nao cria override). */
  setTileRaw(col: number, row: number, id: number): void {
    if (!this.inBounds(col, row)) return;
    this.tiles[this.idx(col, row)] = id;
  }

  /** Grava um tile em runtime: marca chunk sujo e registra override para o save. */
  setTile(col: number, row: number, id: number): void {
    if (!this.inBounds(col, row)) return;
    const i = this.idx(col, row);
    if (this.tiles[i] === id) return;
    this.tiles[i] = id;
    this.overrides.set(i, id);
    this.hits.delete(i);
    this.damaged.delete(i);
    this.markDirtyAround(col, row);
  }

  /**
   * Marca o chunk do tile como sujo (e os vizinhos apenas quando o tile esta
   * na borda, porque o desenho de um tile olha os vizinhos para as bordas).
   */
  markDirtyAround(col: number, row: number): void {
    const cs = this.chunkSize;
    const cc = Math.floor(col / cs);
    const cr = Math.floor(row / cs);
    this.addDirty(cc, cr);
    if (col % cs === 0) this.addDirty(cc - 1, cr);
    if (col % cs === cs - 1) this.addDirty(cc + 1, cr);
    if (row % cs === 0) this.addDirty(cc, cr - 1);
    if (row % cs === cs - 1) this.addDirty(cc, cr + 1);
  }

  private addDirty(cc: number, cr: number): void {
    if (cc < 0 || cr < 0 || cc >= this.chunkCols || cr >= this.chunkRows) return;
    this.dirtyChunks.add(cr * this.chunkCols + cc);
  }

  markAllDirty(): void {
    for (let i = 0; i < this.chunkCols * this.chunkRows; i++) this.dirtyChunks.add(i);
  }

  /** Este bloco tem aura de veio prospero agora? */
  isRich(col: number, row: number): boolean {
    if (!this.inBounds(col, row)) return false;
    const until = this.rich.get(this.idx(col, row));
    return until !== undefined && until > this.time;
  }

  /** Acende a aura num bloco. `durationSec = Infinity` para permanente. */
  markRich(col: number, row: number, durationSec: number): void {
    if (!this.inBounds(col, row)) return;
    const i = this.idx(col, row);
    if (this.tiles[i] === BLOCK_IDS.AIR) return;
    this.rich.set(i, durationSec === Infinity ? Infinity : this.time + durationSec);
  }

  /** Apaga a aura (o bloco foi quebrado ou o tempo acabou). */
  private clearRich(i: number): void {
    this.rich.delete(i);
  }

  /**
   * Percorre os veios prosperos vivos. A aura e desenhada POR CIMA dos chunks,
   * viva e pulsando — assar no cache faria cada expiracao repintar um chunk.
   */
  forEachRich(fn: (col: number, row: number) => void): void {
    for (const [i, until] of this.rich) {
      if (until <= this.time) {
        this.rich.delete(i);
        continue;
      }
      fn(i % this.width, Math.floor(i / this.width));
    }
  }

  /**
   * Acende uma chuva de veios prosperos numa faixa de linhas.
   *
   * So minerio recebe aura: dar aura a pedra comum faria o jogador quebrar
   * pedra por engano atras de um brilho que nao paga nada.
   */
  richBurst(row0: number, row1: number, count: number, durationSec: number): number {
    const candidates: number[] = [];
    for (let row = Math.max(0, row0); row <= Math.min(this.height - 1, row1); row++) {
      for (let col = 1; col < this.width - 1; col++) {
        const i = this.idx(col, row);
        const id = this.tiles[i];
        if (id === BLOCK_IDS.AIR) continue;
        if (!blockDef(id).tags.includes('ore')) continue;
        candidates.push(i);
      }
    }
    // Embaralha so o necessario: queremos `count` sorteados, nao a lista toda.
    let lit = 0;
    for (let n = 0; n < count && candidates.length > 0; n++) {
      const pick = Math.floor(Math.random() * candidates.length);
      const i = candidates[pick];
      candidates[pick] = candidates[candidates.length - 1];
      candidates.pop();
      this.markRich(i % this.width, Math.floor(i / this.width), durationSec);
      lit++;
    }
    return lit;
  }

  /** Profundidade em metros de uma linha de tiles. */
  depthOfRow(row: number): number {
    return Math.max(0, (row - this.surfaceRow) * CONFIG.metersPerTile);
  }

  depthOfPixel(y: number): number {
    return this.depthOfRow(Math.floor(y / this.tileSize));
  }

  getDamage(col: number, row: number): number {
    if (!this.inBounds(col, row)) return 0;
    return this.hits.get(this.idx(col, row))?.dmg ?? 0;
  }

  /** Estagio de rachadura 0..crackStages. */
  crackStage(col: number, row: number): number {
    const def = this.getDef(col, row);
    if (def.hp <= 0) return 0;
    const d = this.getDamage(col, row);
    if (d <= 0) return 0;
    const t = d / this.effectiveHp(col, row);
    return Math.min(CONFIG.mining.crackStages, Math.max(1, Math.ceil(t * CONFIG.mining.crackStages)));
  }

  /**
   * HP efetivo do bloco nesta linha: a mesma pedra fica mais dura ao descer.
   * Publico porque quem mostra progresso de dano (mira, toupeira cavando)
   * precisa da MESMA conta usada por `applyDamage`, senao a barra de rachadura
   * mente sobre quanto falta.
   */
  effectiveHp(col: number, row: number): number {
    return this.getDef(col, row).hp * layerAt(this.depthOfRow(row)).hpMultiplier;
  }

  /** Aplica dano. Retorna se quebrou e o progresso atual. */
  applyDamage(col: number, row: number, amount: number, toolTier: number): DamageResult {
    const def = this.getDef(col, row);
    if (def.indestructible || def.type === 'ar') {
      return { applied: false, broken: false, def, progress: 0, blockedBy: 'indestructible' };
    }
    if (toolTier < def.minTool) {
      return { applied: false, broken: false, def, progress: 0, blockedBy: 'tool' };
    }
    const hp = this.effectiveHp(col, row);
    const i = this.idx(col, row);
    const rich = this.isRich(col, row);
    const next = (this.hits.get(i)?.dmg ?? 0) + amount;
    if (next >= hp) {
      this.hits.delete(i);
      this.damaged.delete(i);
      this.setTile(col, row, BLOCK_IDS.AIR);
      this.clearRich(i);
      this.scheduleRegrow(i, def);
      return { applied: true, broken: true, def, progress: 1, wasRich: rich };
    }
    this.hits.set(i, { dmg: next, at: this.time });
    this.damaged.add(i);
    this.markDirtyAround(col, row);
    return { applied: true, broken: false, def, progress: next / hp, wasRich: rich };
  }

  /** Regenera dano de blocos que nao sao atingidos ha algum tempo. */
  /**
   * Agenda a volta de um minerio quebrado.
   *
   * Guarda o bloco que ESTAVA ali: a geracao e deterministica, mas reconstruir
   * um tile dela isoladamente custaria mais que lembrar um numero.
   */
  private scheduleRegrow(index: number, def: BlockDef): void {
    const cfg = CONFIG.regrow;
    if (!cfg.enabled) return;
    // So minerio volta. Pedra e terra ficam onde o jogador as deixou.
    if (!def.tags.includes('ore')) return;
    if (this.depthOfRow(Math.floor(index / this.width)) < cfg.minDepth) return;
    this.regrowQueue.set(index, {
      id: def.id,
      at: this.time + cfg.delaySec + Math.random() * cfg.jitterSec,
    });
  }

  /** Processa os minerios que ja podem voltar. */
  private processRegrow(playerX: number, playerY: number): void {
    const cfg = CONFIG.regrow;
    if (!cfg.enabled || this.regrowQueue.size === 0) return;

    let orcamento = Math.max(1, Math.round(cfg.perSecond * 0.25));
    for (const [index, entry] of this.regrowQueue) {
      if (orcamento <= 0) break;
      if (this.time < entry.at) continue;

      const col = index % this.width;
      const row = Math.floor(index / this.width);
      // Nunca na cara do jogador: bloco nascendo em cima dele seria injusto.
      const dx = (col + 0.5) * this.tileSize - playerX;
      const dy = (row + 0.5) * this.tileSize - playerY;
      if (dx * dx + dy * dy < cfg.safeRadius * cfg.safeRadius) continue;
      // O lugar precisa continuar vazio: se ha estrutura ou outro bloco ali,
      // o jogador fez algo com aquele espaco e isso vale mais.
      if (this.tiles[index] !== BLOCK_IDS.AIR) {
        this.regrowQueue.delete(index);
        continue;
      }

      this.setTile(col, row, entry.id);
      this.regrowQueue.delete(index);
      orcamento--;
      Events.emit('block:regrow', {
        col,
        row,
        blockId: entry.id,
        worldX: (col + 0.5) * this.tileSize,
        worldY: (row + 0.5) * this.tileSize,
      });
    }
  }

  /** Estado do renascimento, para o save. */
  serializeRegrow(): number[] {
    const out: number[] = [];
    for (const [index, e] of this.regrowQueue) {
      out.push(index, e.id, Math.max(0, Math.round(e.at - this.time)));
    }
    return out;
  }

  applyRegrow(flat: number[] | undefined): void {
    this.regrowQueue.clear();
    if (!flat) return;
    for (let i = 0; i + 2 < flat.length; i += 3) {
      this.regrowQueue.set(flat[i], { id: flat[i + 1], at: this.time + flat[i + 2] });
    }
  }

  /**
   * Abre um selo entre biomas: troca todo tile SEAL da faixa [row0,row1] por
   * ar, na largura inteira do mundo.
   *
   * So troca tile que ainda for SEAL — nao mexe em nada que o jogador tenha
   * construido ali (nada pode ter sido construido ali, na verdade, ja que o
   * selo e indestrutivel; a checagem existe para o metodo ser seguro de
   * chamar de novo sem duplicar trabalho). Usa `setTileRaw` + `markDirtyAround`
   * direto, sem passar por `overrides`: o estado "aberto" fica guardado no
   * save do BiomeGate (um booleano por camada), e ao carregar o jogo essa
   * mesma funcao e chamada de novo — bem mais barato que gravar centenas de
   * tiles de diferenca por selo.
   */
  openGateBand(row0: number, row1: number): void {
    for (let row = row0; row <= row1; row++) {
      for (let col = 1; col < this.width - 1; col++) {
        const i = this.idx(col, row);
        if (this.tiles[i] !== BLOCK_IDS.SEAL) continue;
        this.tiles[i] = BLOCK_IDS.AIR;
        this.markDirtyAround(col, row);
      }
    }
  }

  /** Onde o jogador esta agora (o renascimento evita a vizinhanca dele). */
  setWatchPoint(x: number, y: number): void {
    this.watchX = x;
    this.watchY = y;
  }

  update(dt: number): void {
    this.time += dt;

    this.regrowTick -= dt;
    if (this.regrowTick <= 0) {
      this.regrowTick = 0.25;
      this.processRegrow(this.watchX, this.watchY);
    }

    if (this.damaged.size === 0) return;
    const delay = CONFIG.mining.damageResetDelay;
    const rate = CONFIG.mining.damageResetRate;
    for (const i of this.damaged) {
      const hit = this.hits.get(i);
      if (!hit || this.time - hit.at < delay) continue;
      const next = hit.dmg - rate * dt;
      if (next <= 0) {
        this.hits.delete(i);
        this.damaged.delete(i);
        this.markDirtyAround(i % this.width, Math.floor(i / this.width));
      } else {
        hit.dmg = next;
      }
    }
  }

  /** Itera os indices com dano dentro de um retangulo de tiles. */
  forEachDamaged(c0: number, r0: number, c1: number, r1: number, fn: (col: number, row: number) => void): void {
    if (this.damaged.size === 0) return;
    for (const i of this.damaged) {
      const col = i % this.width;
      const row = (i - col) / this.width;
      if (col < c0 || col > c1 || row < r0 || row > r1) continue;
      fn(col, row);
    }
  }

  /** Aplica os overrides salvos por cima do mundo gerado. */
  applyOverrides(entries: [number, number][]): void {
    for (const [i, id] of entries) {
      if (i < 0 || i >= this.tiles.length) continue;
      this.tiles[i] = id;
      this.overrides.set(i, id);
    }
    this.markAllDirty();
  }

  serializeOverrides(): [number, number][] {
    return Array.from(this.overrides.entries());
  }

  clearRuntimeState(): void {
    this.overrides.clear();
    this.damaged.clear();
    this.hits.clear();
  }
}
