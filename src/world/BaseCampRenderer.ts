import { Assets } from '../core/Assets';
import { BASE_CAMPS, type BaseCampDef, type StructureSlot } from '../data/basecamp';
import { CONFIG } from '../data/config';
import { RESOURCES, type ResourceId } from '../data/resources';
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

  /**
   * A ARTE das estruturas — desenhada ANTES do jogador.
   *
   * Estava depois, junto com os avisos, na camada que escapa da iluminacao. O
   * efeito colateral era o jogador passar POR TRAS de tudo que construiu, como
   * se as maquinas fossem adesivos colados na frente da tela. A camara ja tem
   * lampiao no teto (ver BaseCampCarve), entao a arte nao precisa daquela
   * camada para ser vista — precisava so estar na ordem certa.
   */
  render(ctx: CanvasRenderingContext2D): void {
    this.paraCada(ctx, (ctx2, base, slot, x, chao, largura, st) => {
      if (st.state === 'disponivel' && st.hits === 0) return;
      this.peca(ctx2, base, slot, x, chao, largura);
      // A plataforma do elevador e uma peca solta que o CODIGO move. Animar
      // a subida em quadros congelaria a velocidade dela na arte; assim ela
      // acelera quando ha carga e para quando nao ha.
      if (slot.kind === 'elevador' && this.camps.built(base.id, 'elevador')) {
        this.plataforma(ctx2, base, x, chao, largura);
      }
    });
  }

  /**
   * Os AVISOS — depois da luz, para serem legiveis no escuro.
   *
   * Contorno do encaixe vazio, barra de obra e o convite para melhorar. Texto
   * que some no escuro nao e aviso nenhum.
   */
  renderOverlay(ctx: CanvasRenderingContext2D): void {
    this.paraCada(ctx, (ctx2, base, slot, x, chao, largura, st) => {
      if (st.state === 'disponivel' && st.hits === 0) {
        this.fantasma(ctx2, x, chao, largura, slot);
        return;
      }
      const prog = this.camps.progress(base, slot);
      if (prog < 1) {
        this.barra(ctx2, x, chao + 2, largura, prog);
        return;
      }
      this.melhoria(ctx2, base, slot, x, chao, largura);
    });
  }

  private paraCada(
    ctx: CanvasRenderingContext2D,
    fn: (
      ctx: CanvasRenderingContext2D,
      base: BaseCampDef,
      slot: StructureSlot,
      x: number,
      chao: number,
      largura: number,
      st: { state: string; hits: number }
    ) => void
  ): void {
    const ts = this.world.tileSize;
    for (const base of BASE_CAMPS) {
      const chao = (this.world.surfaceRow + base.depth + 1) * ts;
      for (const slot of base.slots) {
        const st = this.camps.stateOf(base.id, slot.kind);
        if (st.state === 'bloqueado') continue;
        fn(ctx, base, slot, (base.col + slot.col) * ts, chao, slot.tiles * ts, st);
      }
    }
  }

  private barra(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    largura: number,
    prog: number
  ): void {
    ctx.fillStyle = 'rgba(20, 14, 10, 0.75)';
    ctx.fillRect(x, y, largura, 5);
    ctx.fillStyle = '#ffc453';
    ctx.fillRect(x, y, largura * prog, 5);
  }

  /**
   * O convite para melhorar, em cima da maquina pronta.
   *
   * Sem isto ninguem descobre que existe segundo nivel: bater numa coisa que ja
   * esta de pe nao e um gesto que ocorra a ninguem. E o unico lugar do jogo que
   * cobra REFINADO — entao o custo fica escrito ali, como no encaixe vazio.
   */
  private melhoria(
    ctx: CanvasRenderingContext2D,
    base: BaseCampDef,
    slot: StructureSlot,
    x: number,
    chao: number,
    largura: number
  ): void {
    const mel = slot.melhoria;
    if (!mel) return;
    const prog = this.camps.melhoriaProgress(base, slot);
    if (prog === null) return;
    const meio = x + largura / 2;
    if (prog >= 1) {
      // Melhorada: so uma marca discreta. Ninguem precisa de aviso permanente.
      ctx.save();
      ctx.fillStyle = 'rgba(126, 231, 168, 0.9)';
      ctx.font = '600 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('II', meio, chao - CONFIG.tileSize * 3 - 6);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.textAlign = 'center';
    if (prog > 0) {
      this.barra(ctx, x, chao + 2, largura, prog);
      ctx.fillStyle = 'rgba(126, 231, 168, 0.9)';
      ctx.font = '600 8px system-ui, sans-serif';
      ctx.fillText('MELHORANDO', meio, chao - CONFIG.tileSize * 3 - 6);
      ctx.restore();
      return;
    }
    const pulso = 0.45 + Math.sin(this.t * 2.4) * 0.2;
    ctx.globalAlpha = pulso + 0.35;
    ctx.fillStyle = 'rgba(126, 231, 168, 0.95)';
    ctx.font = '600 9px system-ui, sans-serif';
    ctx.fillText('MELHORAR', meio, chao - CONFIG.tileSize * 3 - 16);
    const custo = Object.entries(mel.cost)
      .map(([id, n]) => `${n} ${RESOURCES[id as ResourceId].name}`)
      .join('  ·  ');
    ctx.font = '600 8px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(190, 245, 210, 0.85)';
    ctx.fillText(custo, meio, chao - CONFIG.tileSize * 3 - 5);
    ctx.restore();
  }

  /**
   * A plataforma subindo e descendo dentro da torre.
   *
   * O ciclo so anda quando ha refinado esperando: elevador vazio fica parado
   * no chao, e essa quietude e informacao — diz "nao tem nada subindo".
   */
  private plataforma(
    ctx: CanvasRenderingContext2D,
    base: BaseCampDef,
    x: number,
    chao: number,
    largura: number
  ): void {
    const img = Assets.baseArt('elevador_plataforma');
    const torre = Assets.baseArt('elevador_torre');
    if (!img || !img.width || !torre || !torre.width) return;

    let carga = 0;
    for (const n of this.camps.refinadoOf(base.id).values()) carga += n;
    const alturaTorre = (largura / torre.width) * torre.height;
    const curso = alturaTorre * 0.72;

    // Parada embaixo quando nao ha o que subir.
    const t = carga < 1 ? 0 : (Math.sin(this.t * 0.9) * 0.5 + 0.5);
    const y = chao - 6 - t * curso;

    const escala = (largura * 0.72) / img.width;
    const w = img.width * escala;
    const h = img.height * escala;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x + (largura - w) / 2, y - h, w, h);
    // Uma pilha simbolica em cima: o jogador precisa ver que ela leva algo.
    if (carga >= 1) {
      ctx.fillStyle = '#f0d060';
      const n = Math.min(4, Math.ceil(carga / 8));
      for (let i = 0; i < n; i++) {
        ctx.fillRect(x + largura / 2 - 9 + i * 5, y - h - 4, 4, 4);
      }
    }
    ctx.restore();
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
    // O custo fica no proprio encaixe. Descobrir o preco batendo nele e
    // lendo o aviso de erro e adivinhacao — a unica do jogo.
    const custo = Object.entries(slot.cost)
      .map(([id, n]) => `${n} ${RESOURCES[id as ResourceId].name}`)
      .join('  ·  ');
    ctx.font = '600 8px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 233, 163, 0.8)';
    ctx.fillText(custo, x + largura / 2, chao - altura + 26);
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
      // Sem arte: um bloco solido que cresce. A barra de progresso vem no
      // overlay, que e onde mora tudo que e aviso.
      ctx.fillStyle = 'rgba(92, 62, 36, 0.9)';
      const alt = Math.max(4, prog * CONFIG.tileSize * 2.4);
      ctx.fillRect(x, chao - alt, largura, alt);
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
  }

  /** Qual dos tres estados do deposito mostrar, pela pilha guardada. */
  private nivelDeposito(base: BaseCampDef): number {
    let total = 0;
    for (const qtd of this.camps.brutoOf(base.id).values()) total += qtd;
    if (total <= 0) return 0;
    return total < 120 ? 1 : 2;
  }
}
