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

  /**
   * O piso e as colunas de um nível — e, no nível 0, do PATAMAR em que aquele
   * deslocamento cai.
   *
   * A praça deixou de ser plana: são três patamares em alturas diferentes. Um
   * banco posto no deslocamento 70 mora no patamar leste, quatro tiles acima
   * do mercado. Devolver sempre `piso` aqui deixaria metade da mobília da
   * praça enterrada e a outra metade flutuando — e como arte não colide, em
   * silêncio.
   */
  private nivelDe(n: number, offset = 0): { row: number; col: number; col1: number } | null {
    const planta = blockiaLayout(this.world.surfaceRow);
    const cfg = CONFIG.blockia;
    if (n === 0) {
      const col = cfg.col0 + offset;
      const p = planta.patamares.find((x) => col >= x.col0 && col <= x.col1) ?? planta.patamares[1];
      return { row: p.row, col: cfg.col0, col1: cfg.col1 };
    }
    const niveis = [...planta.decks, ...(planta.ponte ? [planta.ponte] : [])];
    const d = niveis[n - 1];
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
      const nivel = this.nivelDe(p.nivel, p.offset);
      if (!nivel) continue;
      this.desenhar(ctx, camera, p.id, nivel.col + p.offset, nivel.row, p.espelhado ?? false);
    }
  }

  /**
   * A PORTA DA CIDADE, que tem dois estados.
   *
   * "A rota termina numa porta de madeira reforçada, e há voz do outro lado.
   * Diga seu nome." Era o objetivo da missão M5 e a porta era um tile de
   * tábua, igual a qualquer passarela — o momento que a cidade inteira existe
   * para produzir acontecia contra uma parede sem cara.
   *
   * Fechada até a Mara abrir; aberta depois, para sempre. A geometria NÃO
   * muda com o estado: o corredor já é escavado desde a geração, então a
   * mudança é só de desenho. Isso é de propósito — porta que vira colisão é
   * porta que pode prender o jogador do lado errado num save antigo.
   */
  private desenharPorta(ctx: CanvasRenderingContext2D, camera: Camera | undefined): void {
    const cfg = CONFIG.blockia;
    // A porta mora no patamar oeste, que e mais alto que o centro da praca.
    const piso = blockiaLayout(this.world.surfaceRow).patamares[0].row;
    const aberta = this.portaAberta();
    // O arco emoldura; a folha fica dentro dele. Os dois são da mesma folha de
    // arte e têm a mesma largura, então encaixam sem ajuste.
    const col = cfg.gateCol - 3;
    this.desenhar(ctx, camera, 'arco', col, piso, false);
    this.desenhar(ctx, camera, aberta ? 'porta_aberta' : 'porta_fechada', col, piso, false);
    // O guincho que ergue a folha: fica ao lado, do lado de dentro.
    this.desenhar(ctx, camera, 'guincho_porta', cfg.gateCol + 4, piso, false);
  }

  /**
   * Quem decide se a porta está aberta é o Game, e não este arquivo.
   *
   * O renderizador não tem — e não deve ter — acesso às flags de história.
   * Ele pergunta; o Game responde lendo `mara_avelar`, que é a mesma flag que
   * a missão "As Lanternas Azuis" exige. Uma segunda fonte de verdade sobre a
   * porta estar aberta divergiria da missão no primeiro ajuste.
   */
  portaAberta: () => boolean = () => false;

  /** O cenário: vai ANTES do jogador, dos moradores e das criaturas. */
  renderFundo(ctx: CanvasRenderingContext2D, camera?: Camera): void {
    if (!this.carregado) return;
    this.desenharPorta(ctx, camera);
    this.desenharLista(ctx, camera, BLOCKIA_PROPS.filter((p) => p.fundo));

    /*
     * A horta se apoia na terra que o `carveBlockia` já plantou, e por isso
     * ela não usa nível: a coluna dela é relativa ao começo da terra. Repetir
     * o `col0 + 16` daqui e de lá seria duas verdades sobre o mesmo canteiro.
     */
    for (const c of BLOCKIA_HORTA) {
      const off = HORTA_COL0 + c.offset;
      const nivel = this.nivelDe(0, off);
      if (!nivel) continue;
      this.desenhar(ctx, camera, c.id, nivel.col + off, nivel.row, false);
    }
  }

  /** Os móveis: vão DEPOIS, para o jogador passar atrás deles. */
  renderFrente(ctx: CanvasRenderingContext2D, camera?: Camera): void {
    if (!this.carregado) return;
    this.desenharLista(ctx, camera, BLOCKIA_PROPS.filter((p) => !p.fundo));
  }
}
