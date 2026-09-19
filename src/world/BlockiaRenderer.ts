import { Assets } from '../core/Assets';
import { CONFIG } from '../data/config';
import { BLOCKIA_HORTA, BLOCKIA_PROPS, HORTA_COL0, type BlockiaProp } from '../data/blockiaProps';
import { blockiaLayout } from './Blockia';
import type { Camera } from '../core/camera';
import type { World } from './World';

/** Medidas em TILES de cada peça, escritas pelo cortador. */
type MapaPecas = Record<string, { w: number; h: number }>;

/**
 * A mobília de Blockia desenhada por cima da geometria.
 *
 * Por que uma camada separada, e não tiles: o que dá vida a uma cidade não
 * cabe na grade. Uma barraca tem toldo que avança sobre a rua, uma forja tem
 * chaminé mais alta que o pé-direito, um varal atravessa dois tiles sem tocar
 * o chão. Transformar isso em bloco significaria ou quadricular o desenho ou
 * fechar a passagem — e fechar passagem em Blockia já custou uma leva inteira
 * (27 células andáveis medidas na cidade toda).
 *
 * Então: a cidade continua sendo escavada em tiles, que é quem manda na
 * colisão, e a arte é desenhada em cima sem tocar em nada. O jogador atravessa
 * a barraca de lado — e é isso mesmo que se quer, porque ela é FACHADA.
 *
 * As posições vêm de `blockiaLayout`, a mesma função que esculpe os terraços.
 * Nenhuma coordenada absoluta neste arquivo.
 */
export class BlockiaRenderer {
  private t = 0;
  private mapa: MapaPecas = {};
  private carregado = false;

  constructor(private world: World) {
    /*
     * As medidas vêm do JSON que o cortador escreveu, e não de constantes aqui.
     *
     * Cada peça tem proporção própria (a `cabine` é 4 x 4,94 tiles; a `panelas`
     * é 2,4 x 1,86). Escrever isso à mão seria copiar quarenta e oito pares de
     * números que mudam toda vez que a arte for regerada — e errar um deforma
     * a peça sem que nada quebre.
     */
    void fetch('art/blockia/mapa.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j) this.mapa = j as MapaPecas;
        this.carregado = true;
      })
      .catch(() => {
        this.carregado = true;
      });
  }

  update(dt: number): void {
    this.t += dt;
  }

  /** O piso (em linhas) e a coluna inicial de cada nível da cidade. */
  private nivelDe(n: number): { row: number; col: number; col1: number } | null {
    const { piso, decks } = blockiaLayout(this.world.surfaceRow);
    const cfg = CONFIG.blockia;
    if (n === 0) return { row: piso, col: cfg.col0, col1: cfg.col1 };
    const d = decks[n - 1];
    if (!d) return null;
    return { row: d.row, col: d.col0, col1: d.col1 };
  }

  /**
   * Desenha uma peça APOIADA no piso, e não centrada nele.
   *
   * Todas as peças foram cortadas com a caixa apertada, então o pixel de baixo
   * do PNG é o pé do objeto. Alinhar por baixo é o que faz barril, bigorna e
   * barraca pousarem no chão em vez de flutuarem — e funciona igual para uma
   * peça de 1,6 tile e para uma de 5,9 sem nenhum ajuste por objeto.
   */
  private desenhar(
    ctx: CanvasRenderingContext2D,
    camera: Camera | undefined,
    id: string,
    col: number,
    pisoRow: number,
    espelhado: boolean
  ): void {
    const img = Assets.blockia(id);
    const medida = this.mapa[id];
    if (!img || !medida) return;
    const ts = this.world.tileSize;
    const w = medida.w * ts;
    const h = medida.h * ts;
    const x = col * ts;
    // +1 porque `pisoRow` é a linha em que o jogador PISA: o chão sólido é a
    // de baixo, e é nela que o objeto se apoia.
    const y = (pisoRow + 1) * ts - h;
    if (camera && !camera.sees(x + w / 2, y + h / 2)) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (espelhado) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
    ctx.restore();
  }

  private desenharLista(
    ctx: CanvasRenderingContext2D,
    camera: Camera | undefined,
    lista: BlockiaProp[]
  ): void {
    for (const p of lista) {
      const nivel = this.nivelDe(p.nivel);
      if (!nivel) continue;
      this.desenhar(ctx, camera, p.id, nivel.col + p.offset, nivel.row, p.espelhado ?? false);
    }
  }

  /** O cenário: vai ANTES do jogador, dos moradores e das criaturas. */
  renderFundo(ctx: CanvasRenderingContext2D, camera?: Camera): void {
    if (!this.carregado) return;
    this.desenharLista(ctx, camera, BLOCKIA_PROPS.filter((p) => p.fundo));

    /*
     * A horta se apoia na terra que o `carveBlockia` já plantou, e por isso
     * ela não usa nível: a coluna dela é relativa ao começo da terra. Repetir
     * o `col0 + 16` daqui e de lá seria duas verdades sobre o mesmo canteiro.
     */
    const nivel = this.nivelDe(0);
    if (!nivel) return;
    for (const c of BLOCKIA_HORTA) {
      this.desenhar(ctx, camera, c.id, nivel.col + HORTA_COL0 + c.offset, nivel.row, false);
    }
  }

  /** Os móveis: vão DEPOIS, para o jogador passar atrás deles. */
  renderFrente(ctx: CanvasRenderingContext2D, camera?: Camera): void {
    if (!this.carregado) return;
    this.desenharLista(ctx, camera, BLOCKIA_PROPS.filter((p) => !p.fundo));
  }
}
