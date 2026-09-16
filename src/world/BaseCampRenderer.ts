import { Assets } from '../core/Assets';
import { BASE_CAMPS, type BaseCampDef, type StructureSlot } from '../data/basecamp';
import { CONFIG } from '../data/config';
import type { BaseCamps } from '../systems/BaseCamps';
import type { World } from './World';

/** Quantos quadros cada folha tem. */
const QUADROS: Record<string, number> = {
  refinador: 6,
  deposito: 3,
  esteira: 4,
};

/**
 * Desenha as estruturas da base.
 *
 * Tres estados visuais, e cada um conta uma coisa diferente:
 *
 *  - encaixe vazio: contorno tracejado com o nome. E o convite.
 *  - em obra: a arte aparece recortada de baixo para cima, conforme sobe.
 *    Ver a maquina CRESCER e o que faz a obra parecer obra.
 *  - pronta: a arte inteira, animada quando ha o que processar.
 */
export class BaseCampRenderer {
  private t = 0;

  constructor(private world: World, private camps: BaseCamps) {}

  update(dt: number): void {
    this.t += dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const ts = this.world.tileSize;
    for (const base of BASE_CAMPS) {
      const chao = (this.world.surfaceRow + base.depth + 1) * ts;
      for (const slot of base.slots) {
        const x = (base.col + slot.col) * ts;
        const largura = slot.tiles * ts;
        const st = this.camps.stateOf(base.id, slot.kind);
        if (st.state === 'bloqueado') continue;
        if (st.state === 'disponivel' && st.hits === 0) {
          this.fantasma(ctx, x, chao, largura, slot);
          continue;
        }
        this.peca(ctx, base, slot, x, chao, largura);
      }
    }
  }

  /** Encaixe ainda vazio: tracejado + nome. */
  private fantasma(
    ctx: CanvasRenderingContext2D,
    x: number,
    chao: number,
    largura: number,
    slot: StructureSlot
  ): void {
    const altura = CONFIG.tileSize * 3;
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(255, 196, 83, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, chao - altura, largura, altura);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 220, 131, 0.85)';
    ctx.font = '600 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(slot.nome.toUpperCase(), x + largura / 2, chao - altura - 6);
    ctx.fillStyle = 'rgba(255, 220, 131, 0.5)';
    ctx.fillText('minerar para construir', x + largura / 2, chao - altura + 12);
    ctx.restore();
  }

  private peca(
    ctx: CanvasRenderingContext2D,
    base: BaseCampDef,
    slot: StructureSlot,
    x: number,
    chao: number,
    largura: number
  ): void {
    const arte = slot.kind.startsWith('esteira') ? 'esteira' : slot.kind;
    const img = Assets.baseArt(arte);
    const prog = this.camps.progress(base, slot);
    if (!img || !img.width) {
      // Sem arte: barra de progresso, que ja e informacao suficiente.
      ctx.fillStyle = 'rgba(20, 14, 10, 0.8)';
      ctx.fillRect(x, chao - 20, largura, 8);
      ctx.fillStyle = '#ffc453';
      ctx.fillRect(x, chao - 20, largura * prog, 8);
      return;
    }

    const quadros = QUADROS[arte] ?? 1;
    const fw = Math.floor(img.width / quadros);
    const fh = img.height;
    const escala = largura / fw;
    const altura = fh * escala;

    // Qual quadro: so anima quando ha trabalho acontecendo.
    let q = 0;
    if (quadros > 1 && this.camps.built(base.id, slot.kind)) {
      const ativo =
        arte === 'deposito'
          ? 0
          : this.camps.fuelOf(base.id) > 0
            ? Math.floor(this.t * 9) % quadros
            : 0;
      q = arte === 'deposito' ? this.nivelDeposito(base) : ativo;
    }

    ctx.save();
    // Em obra a peca aparece recortada de baixo para cima: ela sobe do chao.
    const visivel = Math.max(0.06, prog) * altura;
    ctx.beginPath();
    ctx.rect(x, chao - visivel, largura, visivel);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = prog >= 1 ? 1 : 0.85;
    ctx.drawImage(img, q * fw, 0, fw, fh, x, chao - altura, largura, altura);
    ctx.restore();

    if (prog < 1) {
      ctx.fillStyle = 'rgba(20, 14, 10, 0.75)';
      ctx.fillRect(x, chao + 2, largura, 5);
      ctx.fillStyle = '#ffc453';
      ctx.fillRect(x, chao + 2, largura * prog, 5);
    }
  }

  /** Qual dos tres estados do deposito mostrar, pela pilha guardada. */
  private nivelDeposito(base: BaseCampDef): number {
    let total = 0;
    for (const qtd of this.camps.brutoOf(base.id).values()) total += qtd;
    if (total <= 0) return 0;
    return total < 120 ? 1 : 2;
  }
}
