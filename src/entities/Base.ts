import { ART } from '../data/art';
import { Assets } from '../core/Assets';
import { Events } from '../core/events';
import { CONFIG } from '../data/config';
import { RESOURCES } from '../data/resources';
import { Haptics } from '../fx/Haptics';
import type { FloatingText } from '../fx/FloatingText';
import type { BaseStock } from '../systems/BaseStock';
import type { Inventory } from '../systems/Inventory';
import type { QuotaSystem } from '../systems/QuotaSystem';
import type { Interactable } from './Interactable';

/**
 * Desenha um sprite de cenario ancorado pelo meio da base.
 * A altura vem de ART.props; a largura sai da proporcao real da imagem,
 * entao a arte nao precisa ter formato exato.
 */
export function drawProp(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number,
  groundY: number
): boolean {
  const img = Assets.prop(key);
  const meta = ART.props[key];
  if (!img || !meta) return false;
  const h = meta.h;
  const w = h * (img.width / img.height);
  ctx.drawImage(img, Math.round(x - w / 2), Math.round(groundY - h), w, h);
  return true;
}

/** Deposito da base: converte a mochila em estoque. */
export class Depot implements Interactable {
  readonly id = 'depot';
  radius = CONFIG.player.interactRadius + 12;

  constructor(
    public x: number,
    public y: number,
    private inventory: Inventory,
    private stock: BaseStock,
    private quota: QuotaSystem,
    private floating: FloatingText,
    private valueMultiplier: () => number = () => 1
  ) {}

  prompt(): string | null {
    if (this.inventory.isEmpty) return 'Deposito (vazio)';
    return `Entregar ${this.inventory.totalUnits()} itens`;
  }

  interact(): void {
    if (this.inventory.isEmpty) {
      Events.emit('ui:toast', { text: 'A mochila esta vazia.', tone: 'warn' });
      return;
    }
    let units = 0;
    let value = 0;
    let offset = 0;
    for (const [id, qty] of this.inventory.entries()) {
      this.stock.add(id, qty);
      this.quota.registerDelivery(id, qty);
      units += qty;
      value += RESOURCES[id].value * qty;
      this.floating.push(this.x, this.y - 18 - offset, `+${qty} ${RESOURCES[id].name}`, RESOURCES[id].accent, 11);
      offset += 13;
    }
    value = Math.round(value * this.valueMultiplier());
    this.stock.money += value;
    this.inventory.clear();
    Haptics.ui();
    Events.emit('delivery:done', { total: units, value });
    Events.emit('ui:toast', { text: `Entregue: ${units} itens (+${value} moedas)`, tone: 'good' });
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (drawProp(ctx, 'depot', this.x, this.y)) return;
    const ts = CONFIG.tileSize;
    const x = this.x;
    const y = this.y;
    // Caixa de entrega (placeholder).
    ctx.fillStyle = '#5d3f25';
    ctx.fillRect(x - ts * 0.75, y - ts * 0.6, ts * 1.5, ts * 0.6);
    ctx.fillStyle = '#7a5533';
    ctx.fillRect(x - ts * 0.75, y - ts * 0.72, ts * 1.5, ts * 0.16);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x - ts * 0.75, y - ts * 0.3, ts * 1.5, 3);
    // Minerios aparecendo por cima.
    ctx.fillStyle = '#8d8d95';
    ctx.beginPath();
    ctx.arc(x - 6, y - ts * 0.78, 5, 0, Math.PI * 2);
    ctx.arc(x + 5, y - ts * 0.8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2e2e34';
    ctx.beginPath();
    ctx.arc(x + 12, y - ts * 0.76, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Oficina: melhora a picareta (abre a UI). */
export class Workshop implements Interactable {
  readonly id = 'workshop';
  radius = CONFIG.player.interactRadius + 6;

  constructor(public x: number, public y: number, private onOpen: () => void) {}

  prompt(): string | null {
    return 'Oficina';
  }

  interact(): void {
    Haptics.ui();
    this.onOpen();
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (drawProp(ctx, 'workshop', this.x, this.y)) return;
    const ts = CONFIG.tileSize;
    const x = this.x;
    const y = this.y;
    // Bancada (placeholder).
    ctx.fillStyle = '#4a3420';
    ctx.fillRect(x - ts * 0.8, y - ts * 0.5, ts * 1.6, ts * 0.5);
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(x - ts * 0.9, y - ts * 0.62, ts * 1.8, ts * 0.16);
    // Bigorna.
    ctx.fillStyle = '#3a3a42';
    ctx.fillRect(x - 10, y - ts * 0.92, 20, 10);
    ctx.fillRect(x - 5, y - ts * 0.72, 10, 6);
    // Faisca.
    ctx.fillStyle = 'rgba(255,190,80,0.8)';
    const t = performance.now() * 0.004;
    ctx.fillRect(x + 6 + Math.sin(t) * 2, y - ts * 1.0 - Math.abs(Math.cos(t)) * 4, 2, 2);
  }
}

/** Cenario da superficie (decoracao, sem colisao propria). */
export class SurfaceDecor {
  constructor(private floorRow: number) {}

  render(ctx: CanvasRenderingContext2D): void {
    const ts = CONFIG.tileSize;
    const groundY = this.floorRow * ts;
    const center = CONFIG.base.centerCol;
    const at = (offset: number) => (center + offset) * ts + ts / 2;
    const L = CONFIG.base.layout;

    if (Assets.prop('shed')) {
      drawProp(ctx, 'shed', at(L.shed), groundY);
      drawProp(ctx, 'cart', at(L.cart), groundY);
      drawProp(ctx, 'lamp', at(L.lamp), groundY);
      drawProp(ctx, 'mine_entrance', at(L.shaft), groundY);
      return;
    }

    // Placeholder vetorial (enquanto a arte nao existe).
    const sx = at(L.shed) - ts * 2.5;
    const sy = groundY - ts * 3.2;
    ctx.fillStyle = '#4a3320';
    ctx.fillRect(sx, sy, ts * 5, ts * 3.2);
    ctx.fillStyle = '#2a1d12';
    ctx.beginPath();
    ctx.moveTo(sx - ts * 0.4, sy);
    ctx.lineTo(sx + ts * 2.5, sy - ts * 1.1);
    ctx.lineTo(sx + ts * 5.4, sy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,196,102,0.85)';
    ctx.fillRect(sx + ts * 0.6, sy + ts * 1.1, ts * 0.7, ts * 0.7);

    const mx = at(L.shaft);
    ctx.fillStyle = '#3d2a18';
    ctx.fillRect(mx - ts * 2.2, groundY - ts * 1.5, ts * 0.45, ts * 1.5);
    ctx.fillRect(mx + ts * 1.75, groundY - ts * 1.5, ts * 0.45, ts * 1.5);
    ctx.fillRect(mx - ts * 2.4, groundY - ts * 1.75, ts * 4.8, ts * 0.35);
  }
}
