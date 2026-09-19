import { blockDef, type BlockDef } from '../data/blocks';
import { CONFIG } from '../data/config';
/*
 * A copia deixou de FALAR.
 *
 * Nao sobrou nenhum `Events.emit` aqui, e isso e a mudanca, nao um efeito
 * colateral dela: os dois avisos que existiam — "reposicionada" e "procurando
 * trabalho novo" — eram estado interno dos caes de guarda deste arquivo. Quem
 * anuncia agora e o CloneManager, e so o que o jogador provocou apertando um
 * botao.
 */
import { RESOURCES, type ResourceId } from '../data/resources';
import { botDef, type BotDef, type BotId } from '../data/bots';
import { Assets } from '../core/Assets';
import { ART } from '../data/art';
import type { Attributes } from '../systems/Attributes';
import type { DropManager } from './DropManager';
import type { World } from '../world/World';

export type CloneFocus = 'minerar' | 'coletar' | 'equilibrado';

export interface CloneConfig {
  /**
   * O TIPO do bot. E ele que diz o que a maquina recolhe, quanto carrega e
   * ate onde vai — o jogador escolhe na hora de comprar, e nao depois numa
   * tela de configuracao.
   *
   * Antes isso eram tres controles por unidade (foco, seis caixinhas de
   * minerio e um raio), repetidos a cada bot novo e sem nenhuma decisao
   * interessante depois da primeira vez: o jogador clonava a mesma
   * configuracao. Com tipo, comprar E a decisao.
   */
  bot: BotId;
  /** Entrega sozinho no deposito quando enche. */
  autoDeliver: boolean;
}

export type CloneState =
  | 'procurando'
  | 'minerando'
  | 'coletando'
  | 'entregando'
  | 'enviando'
  | 'parado';

/** Cores das copias — cada uma recebe um tom proprio da folha do heroi. */
export const CLONE_TINTS = ['#2fb8c0', '#d07a2f', '#4fc05a', '#9a5ad0', '#d04f8a', '#c0b02f'];

const SCAN_INTERVAL = 0.45;
/** Intervalo entre tentativas de mudar de posto quando nao ha trabalho (s). */
const RELOCATE_INTERVAL = 1.2;
/** Intervalo entre checagens de "este bolsao ainda vale a pena?" (s). */
const MIGRATE_INTERVAL = 5;
/** Sem quebrar nem entregar nada por este tempo, a copia se resseta (s). */
const IDLE_LIMIT = 14;
const STUCK_LIMIT = 9;

/**
 * Copia do protagonista: mina, coleta e entrega sozinha.
 *
 * A IA e deliberadamente simples e legivel: anda em direcao ao alvo e, se tiver
 * bloco no caminho, mina o bloco — um minerador abrindo o proprio tunel.
 */
export class Clone {
  x = 0;
  y = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  state: CloneState = 'procurando';
  /** Total ja entregue por esta copia (aparece no painel). */
  delivered = 0;
  /** Onde ele foi criado: centro da sua area de trabalho. */
  homeX = 0;
  homeY = 0;

  readonly w = 18;
  readonly h = 26;
  private items = new Map<ResourceId, number>();
  private scanTimer = 0;
  private relocateTimer = 0;
  private migrateTimer = 0;
  private idleTimer = 0;
  private mineTimer = 0;
  private stuckTimer = 0;
  private lastProgressX = 0;
  private lastProgressY = 0;
  private target: { col: number; row: number } | null = null;
  private walkPhase = 0;
  private swing = 0;
  private tintCache: HTMLCanvasElement | null = null;
  private stripTints = new Map<string, HTMLCanvasElement | null>();
  /** Tempo restante do envio de carga pelo poco. */
  private sendTimer = 0;
  private sendTotal = 1;

  constructor(
    readonly id: string,
    readonly index: number,
    public config: CloneConfig,
    private world: World,
    private attrs: Attributes,
    private drops: DropManager,
    private depot: { x: number; y: number },
    /** Entrada de rede mais proxima (esteira/armazem), se houver. */
    private findNetwork: (x: number, y: number) => { col: number; row: number } | null = () => null,
    private insertNetwork: (col: number, row: number, r: ResourceId, n: number) => number = () => 0
  ) {}

  /** A cor vem do TIPO, e nao da ordem de compra: dois bots iguais sao
   *  iguais, e e isso que a tarja do cartao precisa dizer. */
  get tint(): string {
    return this.def.tint;
  }

  get cx(): number {
    return this.x;
  }

  get cy(): number {
    return this.y;
  }

  /** A mochila do tipo, mais o que as melhorias de pesquisa somarem. */
  get capacity(): number {
    return this.def.capacity + Math.max(0, this.attrs.getInt('cloneCapacity') - 20);
  }

  get carried(): number {
    let n = 0;
    for (const v of this.items.values()) n += v;
    return n;
  }

  get isFull(): boolean {
    return this.carried >= this.capacity;
  }

  entries(): [ResourceId, number][] {
    return Array.from(this.items.entries());
  }

  /** O que este TIPO de bot recolhe. O resto do chao ele ignora. */
  accepts(resource: ResourceId): boolean {
    return this.def.coleta.includes(resource);
  }

  /** A ficha do tipo dele. */
  get def(): BotDef {
    return botDef(this.config.bot);
  }

  add(resource: ResourceId, amount: number): number {
    if (this.isFull) return 0;
    const free = this.capacity - this.carried;
    const added = Math.min(amount, free);
    if (added > 0) this.items.set(resource, (this.items.get(resource) ?? 0) + added);
    return added;
  }

  place(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.vy = 0;
    this.state = 'procurando';
  }

  // ------------------------------------------------------------------ loop --

  update(dt: number, deliver: (items: [ResourceId, number][]) => void): void {
    this.swing = Math.max(0, this.swing - dt * 3.2);
    this.walkPhase += dt * 6;

    this.watchdog(dt);

    /*
     * Todo bot MINERA e cata o que cai.
     *
     * O modo "so coletar" existia porque o filtro era livre: dava para montar
     * uma copia que so juntava o chao. Com tipo, quem so cata e a TOUPEIRA — e
     * ter duas maquinas fazendo a mesma coisa com nomes diferentes era o tipo
     * de escolha que parece profundidade e e so confusao.
     */
    this.updateMiner(dt);

    // So entra em entrega se ainda nao estiver entregando: senao o cheque
    // reiniciaria o temporizador de envio a cada frame e nunca concluiria.
    if (
      this.config.autoDeliver &&
      this.isFull &&
      this.state !== 'entregando' &&
      this.state !== 'enviando'
    ) {
      this.state = 'entregando';
    }

    if (this.state === 'entregando') {
      // Prioridade: jogar numa esteira/armazem perto. E para isso que a linha existe.
      const node = this.findNetwork(this.x, this.y);
      if (node) {
        const ts = this.world.tileSize;
        const nx = node.col * ts + ts / 2;
        const ny = node.row * ts + ts / 2;
        if (this.moveToward(nx, ny, dt, true)) {
          let left = false;
          for (const [id, qty] of this.entries()) {
            const sent = this.insertNetwork(node.col, node.row, id, qty);
            if (sent >= qty) this.items.delete(id);
            else if (sent > 0) {
              this.items.set(id, qty - sent);
              left = true;
            } else left = true;
          }
          if (!left) {
            this.state = 'procurando';
            this.target = null;
          }
        }
        return;
      }

      const dist = Math.hypot(this.depot.x - this.x, this.depot.y - this.y);
      if (dist < CONFIG.clones.walkToDepot) {
        // Perto do deposito: ela anda ate la e entrega na mao.
        if (this.moveToward(this.depot.x, this.depot.y, dt, true)) this.finishDelivery(deliver);
      } else {
        // Longe: manda a carga pelo poco. E o que o elevador vai substituir depois.
        this.sendTotal = CONFIG.clones.sendBase + dist / CONFIG.clones.sendSpeed;
        this.sendTimer = this.sendTotal;
        this.state = 'enviando';
      }
    }

    if (this.state === 'enviando') {
      this.sendTimer -= dt;
      if (this.sendTimer <= 0) this.finishDelivery(deliver);
    }

    this.applyGravity(dt);
    this.checkStuck(dt);
  }

  /** 0..1 do envio em andamento (para a UI). */
  get sendProgress(): number {
    return this.state === 'enviando' ? 1 - this.sendTimer / this.sendTotal : 0;
  }

  private finishDelivery(deliver: (items: [ResourceId, number][]) => void): void {
    this.markProgress();
    deliver(this.entries());
    this.items.clear();
    this.state = 'procurando';
    this.target = null;
    this.sendTimer = 0;
  }

  private updateMiner(dt: number): void {
    if (this.state === 'entregando' || this.state === 'enviando') return;

    /*
     * Migracao.
     *
     * A area de trabalho nasce onde a copia foi impressa — quase sempre na
     * base, onde so ha terra e um pouco de carvao raso. Sem isto ela passa a
     * vida inteira raspando o mesmo bolsao pobre e da a impressao de estar
     * travada la em cima. Quando sobra pouco minerio na area, ela procura um
     * deposito melhor (de preferencia mais fundo) e muda o posto para la.
     */
    this.migrateTimer -= dt;
    if (this.migrateTimer <= 0) {
      this.migrateTimer = MIGRATE_INTERVAL;
      if (this.oresInArea() < CONFIG.clones.minOreInArea) {
        if (!this.relocate(true)) this.digDeeper();
        this.target = null;
      }
    }

    this.scanTimer -= dt;
    if (!this.target || this.scanTimer <= 0) {
      this.scanTimer = SCAN_INTERVAL;
      this.target = this.findBlock();
    }

    if (!this.target) {
      /*
       * Sem nada para minerar na area de trabalho.
       *
       * Acontecia sempre com a copia impressa na base: em volta so ha terra,
       * que nao solta recurso, entao ela ficava andando em circulo la em cima.
       * Agora ela procura trabalho num raio bem maior e MUDA DE POSTO; se nem
       * assim achar, desce, porque a mina fica embaixo.
       */
      this.state = 'procurando';
      this.relocateTimer -= dt;
      if (this.relocateTimer <= 0) {
        this.relocateTimer = RELOCATE_INTERVAL;
        if (!this.relocate()) this.digDeeper();
      }
      this.moveToward(this.homeX, this.homeY, dt, true);
      return;
    }

    const ts = this.world.tileSize;
    const tx = this.target.col * ts + ts / 2;
    const ty = this.target.row * ts + ts / 2;
    const dist = Math.hypot(tx - this.x, ty - this.y);

    if (dist > CONFIG.clones.reach) {
      this.state = 'procurando';
      this.moveToward(tx, ty, dt, true);
      return;
    }

    this.state = 'minerando';
    this.facing = tx >= this.x ? 1 : -1;
    const interval = 1 / (CONFIG.mining.hitsPerSecondBase * this.attrs.get('cloneMiningSpeed'));
    this.mineTimer += dt;
    while (this.mineTimer >= interval) {
      this.mineTimer -= interval;
      this.swing = 1;
      const res = this.world.applyDamage(
        this.target.col,
        this.target.row,
        this.attrs.get('cloneMiningPower'),
        3
      );
      if (!res.applied || res.broken) {
        if (res.broken) this.onBroke(this.target.col, this.target.row, res.def);
        this.target = null;
        break;
      }
    }
  }

  /*
   * `updateCollector` saiu.
   *
   * Ele servia ao modo "so coletar", que so existia porque o filtro era
   * livre. Com tipo de bot, quem cata o chao e a TOUPEIRA — duas maquinas
   * fazendo a mesma coisa com nomes diferentes era escolha falsa.
   */
  private onBroke(col: number, row: number, def: BlockDef): void {
    this.markProgress();
    const ts = this.world.tileSize;
    if (!def.drop || Math.random() >= def.dropChance) return;
    if (!this.accepts(def.drop)) {
      // Nao e o que ele procura: deixa no chao para o jogador.
      this.drops.spawn(col * ts + ts / 2, row * ts + ts / 2, def.drop, 1);
      return;
    }
    const amount = 1 + (Math.random() < 0.35 ? 1 : 0);
    const added = this.add(def.drop, amount);
    if (added < amount) {
      this.drops.spawn(col * ts + ts / 2, row * ts + ts / 2, def.drop, amount - added);
    }
  }

  // ------------------------------------------------------------ movimento --

  /**
   * Anda em direcao ao ponto. Bloco no caminho e minerado —
   * e assim que a copia abre o proprio tunel em vez de travar numa parede.
   */
  private moveToward(tx: number, ty: number, dt: number, digThrough: boolean): boolean {
    const dx = tx - this.x;
    const dy = ty - this.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 20) return true;

    const speed = this.attrs.get('cloneMoveSpeed');
    const step = Math.sign(dx) * speed * dt;
    this.facing = dx >= 0 ? 1 : -1;

    const ts = this.world.tileSize;
    const aheadX = this.x + Math.sign(dx) * (this.w / 2 + 4);
    const blockedSide = this.world.isSolidAtPixel(aheadX, this.y);
    const needUp = dy < -ts * 0.8;
    const blockedUp = this.world.isSolidAtPixel(this.x, this.y - this.h / 2 - 4);
    const needDown = dy > ts * 0.8;
    const belowY = this.y + this.h / 2 + 4;
    const blockedDown = this.world.isSolidAtPixel(this.x, belowY);
    // So cava o chao depois de estar por cima do alvo, senao ela abre buraco
    // enquanto anda de lado e cai fora do caminho.
    const alinhado = Math.abs(dx) < ts * 0.9;

    if (digThrough) {
      let col = -1;
      let row = -1;
      if (needDown && blockedDown && alinhado) {
        col = Math.floor(this.x / ts);
        row = Math.floor(belowY / ts);
      } else if (blockedSide) {
        col = Math.floor(aheadX / ts);
        row = Math.floor(this.y / ts);
      } else if (needUp && blockedUp) {
        col = Math.floor(this.x / ts);
        row = Math.floor((this.y - this.h / 2 - 4) / ts);
      }

      if (col >= 0) {
        const def = this.world.getDef(col, row);
        if (!def.indestructible) {
          this.swing = 1;
          const res = this.world.applyDamage(col, row, this.attrs.get('cloneMiningPower') * 1.5, 3);
          if (res.broken) this.onBroke(col, row, res.def);
        }
        if (needUp && !blockedUp) this.y -= speed * dt;
        return false;
      }
    }

    if (!blockedSide) this.x += step;
    if (needUp && !blockedUp) {
      // Sobe contra a gravidade: sem zerar a queda, o passo era desfeito no
      // mesmo frame e a copia ficava batendo no teto do proprio buraco.
      this.y -= speed * dt;
      this.vy = 0;
    }
    return false;
  }

  private applyGravity(dt: number): void {
    this.vy = Math.min(this.vy + CONFIG.physics.gravity * dt, 620);
    const ny = this.y + this.vy * dt;
    if (this.world.rectCollides(this.x - this.w / 2, ny - this.h / 2, this.w, this.h)) {
      const ts = this.world.tileSize;
      this.y = Math.floor((ny + this.h / 2) / ts) * ts - this.h / 2 - 0.01;
      this.vy = 0;
    } else {
      this.y = ny;
    }
  }

  /** Se ficar preso, volta para a base em vez de travar para sempre. */
  private checkStuck(dt: number): void {
    // Minerar e progresso, mesmo parada: um bloco duro leva segundos e nao
    // pode contar como travamento — senao ela e arrancada do proprio trabalho.
    const trabalhando = this.state === 'minerando' || this.swing > 0.05;
    if (
      trabalhando ||
      Math.abs(this.x - this.lastProgressX) > 6 ||
      Math.abs(this.y - this.lastProgressY) > 6
    ) {
      this.lastProgressX = this.x;
      this.lastProgressY = this.y;
      this.stuckTimer = 0;
      return;
    }
    this.stuckTimer += dt;
    if (this.stuckTimer < STUCK_LIMIT) return;
    this.stuckTimer = 0;
    this.target = null;
    /*
     * AQUI ESTAVA O BURACO NA BARREIRA.
     *
     * Este desentalar e um TELEPORTE: joga a copia no posto de trabalho dela.
     * Enquanto o posto ficava por perto, tudo bem. So que `relocate` e
     * `digDeeper` mexem no posto sem perguntar se da para CHEGAR nele — e
     * `digDeeper` existe justamente para mandar a copia mais fundo.
     *
     * A sequencia que o dono viu: a copia nao alcanca nada, o cao de guarda
     * manda o posto para baixo, a copia anda ate a parede selada e para, e
     * entao este desentalar a teleporta para o posto, que esta do outro lado.
     * Nenhuma linha "atravessa a parede" — a parede foi contornada por
     * teletransporte, que e pior, porque nao aparece em nenhuma checagem de
     * colisao.
     *
     * Um selo separa o mundo em dois e nada que anda pode trocar de lado.
     */
    if (this.separadoDe(this.homeY)) {
      this.homeX = this.x;
      this.homeY = this.y;
      return;
    }
    this.x = this.homeX;
    this.y = this.homeY;
  }

  /**
   * Ha parede intransponivel entre a copia e esta altura?
   *
   * Olha a coluna da COPIA, e isso basta: selo de bioma e selo de historia sao
   * faixas de ponta a ponta do mundo (WorldGen varre `col = 1` ate
   * `width - 1`), entao uma linha selada em qualquer coluna esta selada em
   * todas. Se um dia houver barreira parcial, esta conta continua correta —
   * ela so passa a ser conservadora, que e o lado certo para errar.
   */
  private separadoDe(py: number): boolean {
    const ts = this.world.tileSize;
    const r0 = Math.floor(this.y / ts);
    const r1 = Math.floor(py / ts);
    if (r0 === r1) return false;
    /*
     * TRES COLUNAS, e nao so a da copia.
     *
     * A da copia sozinha quase bastava — selo de bioma e de historia sao
     * faixas de ponta a ponta. Quase: a faixa de cada selo de bioma tem nove
     * colunas que NAO sao selo, a porta murada da arena do chefe, feita de
     * tijolo comum. Tijolo comum cede a copia, que cava com nivel 3. Medido:
     * posta em cima da porta, ela entrava na faixa em tres minutos.
     *
     * As bordas do mundo nunca sao porta — a arena nasce na coluna do poco,
     * no meio. Entao perguntar tambem a elas identifica a faixa mesmo quando a
     * copia esta bem em cima do unico ponto mole dela.
     *
     * E isto continua sendo uma pergunta ao MUNDO, e nao a uma tabela: quando
     * o selo abre, a faixa inteira vira ar e as tres colunas passam a deixar
     * passar. Um selo vencido para de separar sozinho, sem ninguem avisar a
     * copia.
     */
    const colunas = [Math.floor(this.x / ts), 1, this.world.width - 2];
    const passo = r1 > r0 ? 1 : -1;
    for (let r = r0 + passo; r !== r1 + passo; r += passo) {
      /*
       * TODAS as colunas, e nao qualquer uma.
       *
       * Escrevi "qualquer uma" primeiro e a sonda do turno da noite caiu no
       * mesmo minuto: o Bot Profundo, que trabalha a 395 m, parou de achar
       * servico em duas das seis colunas medidas. A 396 m fica a Base do
       * Cristal, e a parede dela e indestrutivel — a copia passou a se achar
       * cercada por um muro que dava para CONTORNAR andando de lado.
       *
       * A diferenca entre um muro e uma cerca e essa: o selo tranca a linha
       * INTEIRA, de ponta a ponta do mundo. Se sobrou coluna aberta, nao e
       * cerca, e obstaculo — e obstaculo se contorna.
       */
      let trancada = true;
      for (const col of colunas) {
        const def = this.world.getDef(col, r);
        if (!def.indestructible || !def.solid) {
          trancada = false;
          break;
        }
      }
      if (trancada) return true;
    }
    return false;
  }

  /**
   * Cao de guarda.
   *
   * Se ela passar muito tempo sem quebrar nada nem entregar nada, alguma coisa
   * deu errado que nao vale a pena adivinhar: pode ser um estado antigo vindo
   * do save, um deposito inalcancavel ou um buraco sem saida. A saida e sempre
   * a mesma: esquecer o que estava fazendo, procurar trabalho de novo e, se
   * nao houver, descer. Vale mais uma copia teimosa que uma copia parada.
   */
  private watchdog(dt: number): void {
    this.idleTimer += dt;
    if (this.idleTimer < IDLE_LIMIT) return;
    this.idleTimer = 0;
    this.state = 'procurando';
    this.target = null;
    this.sendTimer = 0;
    this.stuckTimer = 0;
    /*
     * EM SILENCIO, de propósito.
     *
     * Isto avisava "Copia N procurando trabalho novo" toda vez. O relato do
     * dono: "essa mensagem de copia procurando servico e coisas assim tira,
     * nao precisamos disso". Ele esta certo, e com 50 camaras fica pior — era
     * um aviso de ESTADO INTERNO do meu codigo, disparado por um cao de
     * guarda que existe justamente para o jogador nao precisar saber que algo
     * deu errado. Conserto que se anuncia deixa de ser conserto e vira
     * interrupcao.
     */
    if (!this.relocate(true) && !this.relocate(false)) this.digDeeper();
  }

  /** Zera o cao de guarda: houve trabalho de verdade. */
  private markProgress(): void {
    this.idleTimer = 0;
  }

  /**
   * Procura trabalho MUITO alem da area de trabalho e muda o posto para la.
   * @returns false quando nao ha nada minerarel no alcance da busca.
   */
  private relocate(oreOnly = false): boolean {
    const ts = this.world.tileSize;
    const col0 = Math.floor(this.x / ts);
    const row0 = Math.floor(this.y / ts);
    const r = CONFIG.clones.relocateSearch;

    let best: { col: number; row: number } | null = null;
    let bestScore = Infinity;
    for (let dr = -r; dr <= r; dr++) {
      for (let dc = -r; dc <= r; dc++) {
        const col = col0 + dc;
        const row = row0 + dr;
        const id = this.world.getTile(col, row);
        if (id === 0) continue;
        const def = blockDef(id);
        if (def.indestructible || !def.drop) continue;
        if (def.tags.includes('ancient') || def.tags.includes('quest')) continue;
        if (oreOnly && !def.tags.includes('ore')) continue;
        if (!this.accepts(def.drop)) continue;
        // Descer pesa menos que subir: o trabalho de verdade e para baixo.
        const score = dc * dc + dr * dr * (dr < 0 ? 3 : 1);
        if (score < bestScore) {
          bestScore = score;
          best = { col, row };
        }
      }
    }
    if (!best) return false;
    // Posto do outro lado de um selo e posto que ela nunca alcanca — e, pior,
    // e para onde o desentalar a teleportaria.
    if (this.separadoDe(best.row * ts + ts / 2)) return false;
    this.homeX = best.col * ts + ts / 2;
    this.homeY = best.row * ts + ts / 2;
    return true;
  }

  /** Quanto minerio ainda ha na area de trabalho. */
  private oresInArea(): number {
    const ts = this.world.tileSize;
    const col0 = Math.floor(this.homeX / ts);
    const row0 = Math.floor(this.homeY / ts);
    const r = this.def.radius;
    let n = 0;
    // Passo 2: contar tile a tile num raio de 18 seria 1300 leituras por
    // chamada; uma amostra a cada 2 tiles responde a mesma pergunta.
    for (let dr = -r; dr <= r; dr += 2) {
      for (let dc = -r; dc <= r; dc += 2) {
        const id = this.world.getTile(col0 + dc, row0 + dr);
        if (id === 0) continue;
        const def = blockDef(id);
        if (!def.tags.includes('ore') || !def.drop) continue;
        if (!this.accepts(def.drop)) continue;
        n++;
      }
    }
    return n;
  }

  /** Nada por perto: puxa o posto para baixo e vai abrindo caminho. */
  private digDeeper(): void {
    const ts = this.world.tileSize;
    let alvo = Math.min(
      (this.world.height - 4) * ts,
      this.y + CONFIG.clones.digDownStep * ts
    );
    /*
     * Desce ate o selo, e nao alem dele.
     *
     * Sem isto, "procurar trabalho mais fundo" era literalmente a instrucao
     * que mandava a copia para o outro lado da barreira. O passo encolhe ate
     * caber no compartimento em que ela esta; se nem um tile couber, ela fica
     * onde esta e o cao de guarda tenta outra coisa no proximo ciclo.
     */
    while (alvo > this.y && this.separadoDe(alvo)) alvo -= ts;
    if (alvo <= this.y) return;
    this.homeY = alvo;
    this.homeX = this.x;
  }

  /** Procura o bloco mais proximo que bate com o filtro. */
  private findBlock(): { col: number; row: number } | null {
    const ts = this.world.tileSize;
    // A area de trabalho e UMA caixa, ao redor do posto. Antes era a
    // intersecao de duas caixas (posto e copia) e ela podia ficar vazia — a
    // copia entao nao achava nada mesmo cercada de minerio.
    const col0 = Math.floor(this.homeX / ts);
    const row0 = Math.floor(this.homeY / ts);
    const radius = this.def.radius;
    const cloneCol = Math.floor(this.x / ts);
    const cloneRow = Math.floor(this.y / ts);

    let best: { col: number; row: number } | null = null;
    let bestScore = Infinity;

    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const col = col0 + dc;
        const row = row0 + dr;
        const id = this.world.getTile(col, row);
        if (id === 0) continue;
        const def = blockDef(id);
        if (def.indestructible || !def.drop) continue;
        if (def.tags.includes('ancient') || def.tags.includes('quest')) continue;
        if (!this.accepts(def.drop)) continue;
        // Minerio primeiro; pedra so se o filtro aceitar.
        const priority = def.tags.includes('ore') ? 0 : 400;
        // Alvo acima so vale se for vizinho: a copia nao pula nem escala, e
        // perseguir bloco alto virava sobe-e-cai eterno — ela parecia travada.
        if (row < cloneRow - 1) continue;
        const ddc = col - cloneCol;
        const ddr = row - cloneRow;
        const score = ddc * ddc + ddr * ddr + priority;
        if (score < bestScore) {
          bestScore = score;
          best = { col, row };
        }
      }
    }
    return best;
  }

  // -------------------------------------------------------------- desenho --

  render(ctx: CanvasRenderingContext2D, sheetIndex: number): void {
    const art = ART.character;

    /*
     * O BOT TEM CORPO PROPRIO, e ele vem primeiro.
     *
     * Antes a copia era o proprio Elias recolorido — mesma silhueta, mesma
     * picareta, um filtro de cor por cima. A Copiadora imprime MAQUINA, nao
     * clone de gente, e o jogador via um segundo protagonista azul cavando ao
     * lado dele.
     *
     * Se a arte do bot nao estiver em disco, tudo continua funcionando pelo
     * caminho antigo: o remendo vira reserva em vez de desaparecer.
     */
    const botName = this.botStripName();
    const botImg = botName ? Assets.botStrip(botName) : null;

    const stripName = this.stripName();
    const stripImg = stripName ? Assets.characterStrip(stripName) : null;

    const sheet = botImg ?? stripImg ?? Assets.character();
    if (!sheet) {
      ctx.fillStyle = this.tint;
      ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
      return;
    }

    let src: CanvasImageSource;
    let frameW: number;
    let frameH: number;
    let sx: number;
    let sy = 0;
    let h: number;

    if (botImg && botName) {
      /*
       * A TINTURA MUDA DE PAPEL.
       *
       * No heroi recolorido ela era forte (0,55), porque precisava disfarcar
       * que aquilo era o protagonista. O bot ja e outro corpo: aqui a cor so
       * distingue os NIVEIS — aco, cobre, roxo — e uma tintura forte apagaria
       * o latao e os rebites que a arte tem.
       */
      const cacheKey = 'bot:' + botName;
      let tinted = this.stripTints.get(cacheKey);
      if (tinted === undefined) {
        tinted = Assets.tintedBotStrip(botName, this.tint, 0.22) ?? null;
        this.stripTints.set(cacheKey, tinted);
      }
      src = tinted ?? botImg;
      frameW = ART.bots.frame;
      frameH = ART.bots.frame;
      sx = this.botStripIndex(botName) * frameW;
      h = ART.bots.drawHeight;
    } else if (stripImg && stripName) {
      const cacheKey = 'strip:' + stripName;
      let tinted = this.stripTints.get(cacheKey);
      if (tinted === undefined) {
        tinted = Assets.tintedStrip(stripName, this.tint, 0.55);
        this.stripTints.set(cacheKey, tinted);
      }
      src = tinted ?? stripImg;
      frameW = art.stripFrame;
      frameH = art.stripFrame;
      sx = this.stripIndex(stripName) * frameW;
      h = art.stripDrawHeight * 0.92;
    } else {
      if (!this.tintCache) {
        this.tintCache = Assets.tintedCharacter(this.tint, 0.55);
      }
      src = this.tintCache ?? sheet;
      const frame =
        this.state === 'minerando'
          ? art.anims.mine_side.frames[this.swing >= 0.6 ? 1 : 0]
          : sheetIndex;
      frameW = art.frameW;
      frameH = art.frameH;
      sx = (frame % art.cols) * frameW;
      sy = Math.floor(frame / art.cols) * frameH;
      h = art.drawHeight * 0.92;
    }
    const w = frameW * (h / frameH);
    const top = this.y + this.h / 2 - h * art.feetAnchor;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.h / 2 + 1, this.w * 0.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    const artFacing = stripImg && stripName ? art.strips[stripName].facing : 1;
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(top));
    if (this.facing !== artFacing) ctx.scale(-1, 1);
    ctx.drawImage(src, sx, sy, frameW, frameH, -w / 2, 0, w, h);
    ctx.restore();

    if (this.state === 'enviando') this.renderSending(ctx, top);
  }

  /** Barra e setas subindo: da para ver que a carga esta indo para a base. */
  private renderSending(ctx: CanvasRenderingContext2D, top: number): void {
    const p = this.sendProgress;
    const w = 26;
    const y = top - 9;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(this.x - w / 2, y, w, 4);
    ctx.fillStyle = this.tint;
    ctx.fillRect(this.x - w / 2, y, w * p, 4);
    const t = (performance.now() * 0.004) % 1;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = this.tint;
    ctx.fillRect(this.x - 2, y - 6 - t * 12, 4, 6);
    ctx.globalAlpha = 1;
  }

  /** Qual tira usar agora, ou null quando aquele arquivo nao existe. */
  /**
   * Qual animacao de BOT usar agora.
   *
   * `broca` entra quando a maquina esta trabalhando mas nao esta batendo —
   * carregando, entregando, esperando. E o estado que o heroi nao tem, e e o
   * que faz o bot parecer uma maquina ligada em vez de um boneco parado.
   */
  private botStripName(): string | null {
    const tem = (n: string): boolean => Assets.botStrips.has(n);
    if (this.state === 'minerando' && tem('mine')) return 'mine';
    // Andando: procurando veio ou levando carga ate o deposito.
    if ((this.state === 'procurando' || this.state === 'entregando') && tem('walk')) return 'walk';
    // Ligada mas sem bater: a broca gira. E o estado que o heroi nao tem.
    if ((this.state === 'coletando' || this.state === 'enviando') && tem('broca')) return 'broca';
    return tem('idle') ? 'idle' : null;
  }

  private botStripIndex(name: string): number {
    const def = ART.bots.strips[name];
    if (!def) return 0;
    if (name === 'mine') {
      return Math.min(def.frames - 1, Math.round((1 - this.swing) * (def.frames - 1)));
    }
    return Math.floor(this.walkPhase) % def.frames;
  }

  private stripName(): string | null {
    const has = (n: string): boolean => Assets.characterStrips.has(n);
    if (this.state === 'minerando' && has('mine')) return 'mine';
    if (this.state === 'parado' && has('idle')) return 'idle';
    if (has('walk')) return 'walk';
    return has('idle') ? 'idle' : null;
  }

  /** Quadro dentro da tira escolhida. */
  private stripIndex(name: string): number {
    const def = ART.character.strips[name];
    if (!def) return 0;
    if (name === 'mine') {
      return Math.min(def.frames - 1, Math.round((1 - this.swing) * (def.frames - 1)));
    }
    return Math.floor(this.walkPhase) % def.frames;
  }

  /** Quadro de caminhada/parado, calculado fora para poder reusar a folha. */
  walkFrame(): number {
    const art = ART.character;
    if (this.state === 'minerando') return art.anims.mine_side.frames[this.swing >= 0.6 ? 1 : 0];
    if (this.state === 'parado') return art.anims.idle.frames[0];
    return art.anims.walk.frames[Math.floor(this.walkPhase) % art.anims.walk.frames.length];
  }

  statusLabel(): string {
    const nomes: Record<CloneState, string> = {
      procurando: 'procurando',
      minerando: 'minerando',
      coletando: 'coletando',
      entregando: 'indo entregar',
      enviando: 'enviando carga',
      parado: 'parado',
    };
    return nomes[this.state];
  }

  summary(): string {
    const parts = this.entries().map(([id, n]) => `${n} ${RESOURCES[id].name}`);
    return parts.length ? parts.join(', ') : 'vazio';
  }

  toJSON() {
    return {
      id: this.id,
      index: this.index,
      x: this.x,
      y: this.y,
      homeX: this.homeX,
      homeY: this.homeY,
      delivered: this.delivered,
      config: this.config,
      items: Object.fromEntries(this.items),
    };
  }
}
