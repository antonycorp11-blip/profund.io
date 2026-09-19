import type { Camera } from '../core/camera';
import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import { Clone, type CloneConfig } from '../entities/Clone';
import { botDef, COPIADORA, type BotId } from '../data/bots';
import type { Attributes } from './Attributes';
import type { BaseStock } from './BaseStock';
import type { DropManager } from '../entities/DropManager';
import type { ResourceId } from '../data/resources';
import type { World } from '../world/World';

export interface CloneSave {
  clones: {
    id: string;
    index: number;
    x: number;
    y: number;
    homeX: number;
    homeY: number;
    config: CloneConfig;
  }[];
  created: number;
}

/** Cria, configura e roda as copias. */
export class CloneManager {
  readonly clones: Clone[] = [];
  private created = 0;

  constructor(
    private world: World,
    private attrs: Attributes,
    private drops: DropManager,
    private stock: BaseStock,
    private depot: { x: number; y: number },
    /** Ligacao com a rede de automacao (opcional ate ela existir). */
    private network?: {
      find(x: number, y: number): { col: number; row: number } | null;
      insert(col: number, row: number, r: ResourceId, n: number): number;
    },
    /** Avisa a cota da semana sobre o que a copia entregou. */
    private onDelivered?: (r: ResourceId, n: number) => void
  ) {}

  /** Quantos depositos de base estao de pe. Cada um abre camaras. */
  depositosProntos?: () => number;
  /** Quantos desses depositos ja foram MELHORADOS. */
  depositosMelhorados?: () => number;

  /**
   * Camaras da copiadora — o teto de bots vivos.
   *
   * Irma da conta das toupeiras (`CollectorManager.max`), e de proposito: as
   * duas sao "ajudante precisa de lugar, e lugar se constroi". A toupeira
   * precisa de onde entregar, o bot de onde ser impresso.
   */
  get slots(): number {
    return (
      this.attrs.getInt('cloneSlots') +
      COPIADORA.camarasPorDeposito * (this.depositosProntos?.() ?? 0) +
      COPIADORA.camarasPorDepositoMelhorado * (this.depositosMelhorados?.() ?? 0)
    );
  }

  get canCreate(): boolean {
    return this.clones.length < this.slots;
  }

  /**
   * Custo de um bot: o preco do TIPO, subindo com quantos ja existem.
   *
   * O preco base saiu da configuracao e foi para a ficha do tipo — um Bot
   * Prisma nao pode custar o mesmo que um Bot Simples so porque e o terceiro
   * da fila. O crescimento por quantidade continua: ele e o que impede encher
   * a mina de bots baratos.
   */
  costFor(tipo: BotId = 'bot_simples', indexOverride?: number): number {
    /*
     * O crescimento conta os bots DAQUELE TIPO, e e suave.
     *
     * Antes contava a frota inteira com fator 1,6, e isso vinha de quando
     * havia um tipo so — o crescimento era a unica progressao que existia.
     * Com tipos, ele cobrava em dobro: o oitavo Bot Simples custava 34 mil,
     * mais caro que um Bot Prisma novo, o que e absurdo por onde se olhe.
     *
     * Agora o TIPO poe o patamar e a quantidade poe a pressao. Comprar o
     * quinto Simples fica caro o bastante para voce pensar em subir de tipo,
     * sem fingir que ele virou outra maquina.
     */
    const doTipo = indexOverride ?? this.clones.filter((c) => c.config.bot === tipo).length;
    return Math.round(botDef(tipo).cost * Math.pow(1.25, doTipo));
  }

  canAfford(tipo: BotId = 'bot_simples'): boolean {
    return this.stock.money >= this.costFor(tipo);
  }

  /** @param tipo Qual bot sai da oficina. O tipo e a decisao da compra. */
  create(x: number, y: number, tipo: BotId = 'bot_simples'): Clone | null {
    if (!this.canCreate) {
      /*
       * Diz o que DESTRAVA, igual a mensagem das toupeiras.
       *
       * "Sem camara livre na copiadora" e um nao sem porta de saida: o jogador
       * fica com a moeda na mao sem saber o que fazer. Pior ainda, esta
       * mensagem passou levas inteiras sem poder aparecer, porque o teto era
       * 99 — era um aviso para um caso impossivel.
       */
      Events.emit('ui:toast', {
        text: `As ${this.slots} camaras estao ocupadas. Construa o Deposito Bruto de outra base para abrir mais.`,
        tone: 'warn',
      });
      return null;
    }
    const cost = this.costFor(tipo);
    if (this.stock.money < cost) {
      Events.emit('ui:toast', {
        text: `Faltam ${Math.ceil(cost - this.stock.money)} moedas para imprimir.`,
        tone: 'warn',
      });
      return null;
    }
    this.stock.money -= cost;
    const clone = this.spawn(`clone_${this.created}`, this.clones.length, x, y, {
      bot: tipo,
      autoDeliver: true,
    });
    this.created++;
    Events.emit('clone:created', { id: clone.id, index: clone.index });
    Events.emit('ui:toast', { text: `Copia ${clone.index + 1} impressa.`, tone: 'good' });
    return clone;
  }

  private spawn(id: string, index: number, x: number, y: number, config: CloneConfig): Clone {
    const clone = new Clone(
      id,
      index,
      config,
      this.world,
      this.attrs,
      this.drops,
      this.depot,
      (x, y) => this.network?.find(x, y) ?? null,
      (col, row, r, n) => this.network?.insert(col, row, r, n) ?? 0
    );
    clone.place(x, y);
    this.clones.push(clone);
    return clone;
  }

  remove(id: string): void {
    const i = this.clones.findIndex((c) => c.id === id);
    if (i < 0) return;
    this.clones.splice(i, 1);
  }

  /** Traz a copia para perto do jogador e redefine a area de trabalho dela. */
  recall(id: string, x: number, y: number): void {
    const clone = this.clones.find((c) => c.id === id);
    if (!clone) return;
    clone.place(x, y);
    Events.emit('ui:toast', { text: `Copia ${clone.index + 1} reposicionada aqui.`, tone: 'info' });
  }

  update(dt: number): void {
    for (const clone of this.clones) {
      clone.update(dt, (items) => {
        let value = 0;
        for (const [, qty] of items) value += qty;
        // Paga igual a entrega do jogador: o ajudante nao trabalha de graca.
        const moedas = this.stock.deliver(items, this.attrs.get('deliveryValue'));
        for (const [id, qty] of items) this.onDelivered?.(id, qty);
        void moedas;
        if (value > 0) {
          clone.delivered += value;
          Events.emit('clone:delivered', {
            index: clone.index,
            total: value,
            money: moedas,
            depth: this.world.depthOfPixel(clone.y),
          });
        }
      });
      // Copia tambem cata o que esta no chao perto dela.
      this.drops.collectFor(
        {
          cx: clone.cx,
          cy: clone.cy,
          radius: CONFIG.player.magnetRadius,
          accepts: (r) => clone.accepts(r),
          add: (r, n) => clone.add(r, n),
          isFull: clone.isFull,
        },
        dt
      );
    }
  }

  render(ctx: CanvasRenderingContext2D, camera?: Camera): void {
    for (const clone of this.clones) {
      if (camera && !camera.sees(clone.x, clone.y)) continue;
      clone.render(ctx, clone.walkFrame());
    }
  }

  toJSON(): CloneSave {
    return { clones: this.clones.map((c) => c.toJSON()), created: this.created };
  }

  fromJSON(data: CloneSave | undefined): void {
    this.clones.length = 0;
    this.created = data?.created ?? 0;
    for (const c of data?.clones ?? []) {
      const clone = this.spawn(c.id, c.index, c.x, c.y, c.config);
      clone.homeX = c.homeX;
      clone.homeY = c.homeY;
    }
  }
}
