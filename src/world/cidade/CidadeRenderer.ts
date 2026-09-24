import { Assets } from '../../core/Assets';
import type { Camera } from '../../core/camera';
import type { LightSource } from '../../fx/Lighting';
import type { CidadePlanta, PisoDef, PredioDef } from '../../data/cidade';
import type { World } from '../World';
import { colunaDe, linhaDe, piso, salaRect, tetoEm } from './geometria';

/**
 * O DESENHO DE UMA CIDADE, a partir da planta.
 *
 * A Blockia antiga era desenhada pelo renderizador de TILES: tabua generica,
 * o mesmo tijolo de ruina em toda parede e lampiao como bloco amarelo de
 * 32 px. Jogava, e nao parecia cidade — a pintura do fundo era a unica coisa
 * que dizia "aqui mora gente".
 *
 * Agora os tiles da cidade so dizem ONDE se pisa (colisao), e este arquivo
 * desenha O QUE e: passarela de tabua com guarda-corpo e mao-francesa, balcao
 * de pedra em misula, ponte de arcos, casa de enxaimel com telhado e janela
 * acesa, lanterna que ilumina de verdade (e fonte de luz, nao tile).
 *
 * Tudo que e parado vira imagem uma vez (`sprite`) e depois so e carimbado:
 * sao centenas de retangulos por predio, e redesenhar isso a cada quadro num
 * celular seria o orcamento de quadro inteiro. O que mexe — agua, cascata,
 * fumaca, elevador, luz — e desenhado ao vivo e e pouco.
 *
 * ARTE DE VERDADE PODE ENTRAR PECA POR PECA: se existir
 * `art/<pasta>/predio_<tipo>.png`, ela substitui o desenho do predio daquele
 * tipo (ver `desenharPredio`). O desenho em codigo e o piso, nao o teto.
 */

type Estado = (flag: string) => boolean;
type MapaPecas = Record<string, { w: number; h: number }>;

/** Um "pixel" da arte desenhada em codigo, em px de mundo. */
const P = 2;

const COR = {
  madeiraEscura: '#2b1b10',
  madeira: '#5a3920',
  madeiraMeia: '#734a28',
  madeiraClara: '#93613a',
  madeiraBrilho: '#b98450',
  madeiraNova: '#c89a5e',
  pedraEscura: '#26262c',
  pedra: '#44434a',
  pedraMeia: '#58565c',
  pedraClara: '#716e70',
  pedraBrilho: '#8f8a84',
  reboco: '#8a7458',
  rebocoClaro: '#a58c69',
  rebocoEscuro: '#6b573f',
  viga: '#352216',
  telhaEscura: '#18302f',
  telha: '#274c49',
  telhaClara: '#3d6f68',
  janela: '#ffcf73',
  janelaMeia: '#f0a64a',
  janelaFundo: '#b86a2a',
  moldura: '#22150d',
  ferro: '#3b3d44',
  ferroClaro: '#5e616b',
  bandeira: '#2c4a78',
  bandeiraClara: '#3e64a0',
  ouro: '#d9a441',
  aguaFunda: '#0d2a3d',
  agua: '#17506e',
  aguaClara: '#4f97bd',
  espuma: '#cfe8f2',
  sombra: 'rgba(0,0,0,0.35)',
};

/** Numero pseudo-aleatorio fixo por semente: o desenho nao muda entre quadros. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export class CidadeRenderer {
  private t = 0;
  private mapa: MapaPecas = {};
  private carregado = false;
  private sprites = new Map<string, HTMLCanvasElement>();
  /** Posicao do elevador em tiles de linha (anima entre paradas). */
  private elevadorRow: number | null = null;
  private elevadorAlvo: number | null = null;
  private luzes: LightSource[] = [];

  constructor(
    private world: World,
    private planta: CidadePlanta,
    private flag: Estado
  ) {
    void fetch(`art/${planta.pastaArte}/mapa.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j) this.mapa = j as MapaPecas;
        this.carregado = true;
      })
      .catch(() => {
        this.carregado = true;
      });
    this.luzes = this.calcularLuzes();
  }

  private get ts(): number {
    return this.world.tileSize;
  }

  private linha(pe: number): number {
    return linhaDe(this.world.surfaceRow, pe);
  }

  /** Borda de cima do chao de um piso, em px de mundo. */
  private yChao(p: PisoDef): number {
    return (this.linha(p.pe) + 1) * this.ts;
  }

  private xDe(x: number): number {
    return colunaDe(this.planta, x) * this.ts;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.elevadorRow !== null && this.elevadorAlvo !== null) {
      const d = this.elevadorAlvo - this.elevadorRow;
      const passo = Math.sign(d) * Math.min(Math.abs(d), dt * 7);
      this.elevadorRow += passo;
    }
  }

  /** O elevador foi chamado: a cabine anda ate a linha pedida. */
  moverElevador(row: number): void {
    if (this.elevadorRow === null) this.elevadorRow = row;
    this.elevadorAlvo = row;
  }

  // ----------------------------------------------------------- sprites ----

  /** Desenha uma vez numa tela propria, e devolve a mesma tela depois. */
  private sprite(chave: string, w: number, h: number, desenho: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement {
    let s = this.sprites.get(chave);
    if (s) return s;
    s = document.createElement('canvas');
    s.width = Math.max(1, Math.ceil(w));
    s.height = Math.max(1, Math.ceil(h));
    const c = s.getContext('2d');
    if (c) {
      c.imageSmoothingEnabled = false;
      desenho(c);
    }
    this.sprites.set(chave, s);
    return s;
  }

  private carimbo(ctx: CanvasRenderingContext2D, camera: Camera | undefined, img: CanvasImageSource & { width: number; height: number }, x: number, y: number): void {
    if (camera && !this.visivel(camera, x, y, img.width, img.height)) return;
    ctx.drawImage(img, Math.round(x), Math.round(y));
  }

  private visivel(camera: Camera, x: number, y: number, w: number, h: number): boolean {
    return (
      x + w >= camera.left - 32 &&
      x <= camera.left + camera.viewW + 32 &&
      y + h >= camera.top - 32 &&
      y <= camera.top + camera.viewH + 32
    );
  }

  // ------------------------------------------------------------ render ----

  renderFundo(ctx: CanvasRenderingContext2D, camera?: Camera): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    this.desenharParedoes(ctx, camera);
    this.desenharCeuEstrelado(ctx, camera);
    this.desenharEstalactites(ctx, camera);
    this.desenharCascatas(ctx, camera);
    this.desenharAgua(ctx, camera);
    // Estrutura embaixo dos pisos (pilar, arco, misula) vem antes dos predios:
    // e o que segura, e fica atras de tudo.
    for (const p of this.planta.pisos) this.desenharEstrutura(ctx, camera, p);
    this.desenharElevador(ctx, camera);
    for (const pr of this.planta.predios) this.desenharPredio(ctx, camera, pr);
    this.desenharSalas(ctx, camera);
    if (this.carregado) {
      this.desenharPorta(ctx, camera);
      for (const pr of this.planta.props) {
        if (pr.fundo && (!pr.seFlag || this.flag(pr.seFlag))) this.desenharPeca(ctx, camera, pr.id, pr.piso, pr.x, pr.espelhado);
      }
    }
    for (const p of this.planta.pisos) this.desenharFundacao(ctx, camera, p);
    this.desenharSaida(ctx, camera);
    for (const p of this.planta.pisos) this.desenharPiso(ctx, camera, p);
    this.desenharPonteQuebrada(ctx, camera);
    this.desenharAlcapao(ctx, camera);
    this.desenharLanternas(ctx, camera);
    this.desenharProjetor(ctx, camera);
    ctx.restore();
  }

  renderFrente(ctx: CanvasRenderingContext2D, camera?: Camera): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    this.desenharAguaDasSalas(ctx, camera);
    if (!this.carregado) {
      ctx.restore();
      return;
    }
    for (const pr of this.planta.props) {
      if (!pr.fundo && (!pr.seFlag || this.flag(pr.seFlag))) this.desenharPeca(ctx, camera, pr.id, pr.piso, pr.x, pr.espelhado);
    }
    ctx.restore();
  }

  /** Fontes de luz da cidade: lanternas, janelas, forja. */
  lights(): LightSource[] {
    return this.luzes;
  }

  // -------------------------------------------------------- pecas de arte ----

  private desenharPeca(
    ctx: CanvasRenderingContext2D,
    camera: Camera | undefined,
    id: string,
    pisoId: string,
    x: number,
    espelhado = false
  ): void {
    const img = Assets.blockia(id);
    const medida = this.mapa[id];
    if (!img || !medida) return;
    const ts = this.ts;
    const w = medida.w * ts;
    const h = medida.h * ts;
    const px = this.xDe(x);
    const py = this.yChao(piso(this.planta, pisoId)) - h;
    if (camera && !this.visivel(camera, px, py, w, h)) return;
    if (espelhado) {
      ctx.save();
      ctx.translate(px + w, py);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, px, py, w, h);
    }
  }

  /** Uma peca de arte da cidade de pe num tile (o chao e a linha de baixo). */
  desenharPecaNoTile(ctx: CanvasRenderingContext2D, id: string, col: number, row: number): void {
    const img = Assets.blockia(id);
    const medida = this.mapa[id];
    if (!img || !medida) return;
    const ts = this.ts;
    const w = medida.w * ts;
    const h = medida.h * ts;
    ctx.drawImage(img, col * ts + ts / 2 - w / 2, (row + 1) * ts - h, w, h);
  }

  private desenharPorta(ctx: CanvasRenderingContext2D, camera: Camera | undefined): void {
    const aberta = this.flag(`porta_${this.planta.id}`);
    const x = this.planta.porta.col - 3 - this.planta.col0;
    this.desenharPeca(ctx, camera, 'arco', this.planta.porta.piso, x);
    this.desenharPeca(ctx, camera, aberta ? 'porta_aberta' : 'porta_fechada', this.planta.porta.piso, x);
  }

  // ------------------------------------------------------------- caverna ----

  /**
   * OS PAREDOES: rocha nas duas paredes da caverna, atras dos bairros.
   *
   * Sem eles, passarela e casa ficavam soltas na frente da pintura de fundo —
   * que tem as PROPRIAS passarelas e casas, na mesma escala — e o jogador nao
   * sabia qual era de pisar. Com o paredao, o bairro se apoia em alguma coisa
   * e a pintura fica so no meio, onde ela e o que deve ser: a cidade la longe,
   * do outro lado do abismo.
   */
  private desenharParedoes(ctx: CanvasRenderingContext2D, camera: Camera | undefined): void {
    const ts = this.ts;
    const largura = this.planta.col1 - this.planta.col0;
    const topo = (tetoEm(this.planta, this.world.surfaceRow, 0) - 2) * ts;
    const fundo = (this.linha(this.planta.fundo) + 2) * ts;
    const h = fundo - topo;
    for (const lado of ['oeste', 'leste'] as const) {
      const faixa = lado === 'oeste' ? 18 : 20;
      const w = faixa * ts;
      const x0 = lado === 'oeste' ? this.xDe(-1) : this.xDe(largura + 2) - w;
      if (camera && !this.visivel(camera, x0, topo, w, h)) continue;
      const img = this.sprite(`paredao:${lado}`, w, h, (c) => this.pintarParedao(c, w, h, lado));
      ctx.drawImage(img, Math.round(x0), Math.round(topo));
    }
  }

  private pintarParedao(c: CanvasRenderingContext2D, w: number, h: number, lado: 'oeste' | 'leste'): void {
    const ts = this.ts;
    // A borda de dentro ondula: saliencia e reentrancia a cada poucos tiles.
    const borda = (y: number): number => {
      const t = y / ts;
      const onda = Math.sin(t * 0.21 + (lado === 'oeste' ? 0 : 2)) * 2.2 + Math.sin(t * 0.07 + 1) * 3 + hash(Math.floor(t / 3)) * 1.5;
      const larg = (w / ts) * 0.62 + onda;
      return Math.max(3, Math.min(w / ts - 0.5, larg)) * ts;
    };
    const xDe = (d: number) => (lado === 'oeste' ? d : w - d);
    c.beginPath();
    c.moveTo(xDe(0), 0);
    for (let y = 0; y <= h; y += 16) c.lineTo(xDe(borda(y)), y);
    c.lineTo(xDe(0), h);
    c.closePath();
    c.save();
    c.clip();
    const g = c.createLinearGradient(lado === 'oeste' ? 0 : w, 0, lado === 'oeste' ? w : 0, 0);
    g.addColorStop(0, '#111116');
    g.addColorStop(1, '#2a2a31');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    // Rocha em blocos irregulares: face clara em cima, sombra embaixo. Faixa
    // horizontal regular aqui lia como linha de TV, e ja leu.
    for (let i = 0; i < (w * h) / 900; i++) {
      const bx = hash(i * 1.37) * w;
      const by = hash(i * 2.71) * h;
      const bw = 10 + hash(i * 3.3) * 34;
      const bh = 8 + hash(i * 5.9) * 22;
      c.fillStyle = hash(i) > 0.55 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.22)';
      c.fillRect(bx, by, bw, bh);
      c.fillStyle = 'rgba(170,165,180,0.07)';
      c.fillRect(bx, by, bw, P);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(bx, by + bh - P, bw, P);
    }
    // Veios de cristal azul, os mesmos da pintura.
    for (let i = 0; i < h / 260; i++) {
      let x = hash(i * 9.1) * w * 0.6 + (lado === 'oeste' ? 0 : w * 0.3);
      let y = hash(i * 4.4) * h;
      c.fillStyle = 'rgba(70,150,230,0.55)';
      for (let k = 0; k < 14; k++) {
        c.fillRect(x, y, P * 2, P);
        x += (hash(i * 31 + k) - 0.5) * 10;
        y += 4 + hash(k + i) * 5;
      }
    }
    c.restore();
    // Borda iluminada pela cidade: e o que separa o paredao da pintura.
    c.fillStyle = 'rgba(190,160,120,0.22)';
    for (let y = 0; y <= h; y += 4) c.fillRect(xDe(borda(y)) - (lado === 'oeste' ? 3 : 0), y, 3, 4);
  }

  /**
   * O projetor do Lio: estrelas na abobada, piscando, e o feixe que sai da
   * praca. E a recompensa que se ve — a cidade inteira ganha um ceu.
   */
  /*
   * O CEU DO LIO: estrelas projetadas no paredao do fundo, atras das casas.
   *
   * A primeira versao espalhava as estrelas do teto da abobada (552 m) ate
   * quatro tiles acima do chao do mercado. Medido no navegador: a camera do
   * celular deitado mostra dez tiles de altura, e do chao do mercado so quatro
   * e meio ficam acima da cabeca — a faixa de estrelas terminava exatamente
   * onde a tela comecava. Nenhuma estrela na foto.
   *
   * Agora a faixa vai de doze tiles acima do piso mais alto ate um tile acima
   * do chao: e a parede que alguem na cidade de fato ve. As casas ficam na
   * frente, e e assim que tem de ser — o ceu e o fundo.
   */
  private desenharCeuEstrelado(ctx: CanvasRenderingContext2D, camera: Camera | undefined): void {
    const c = this.planta.ceuEstrelado;
    if (!c || !this.flag(c.flag)) return;
    const ts = this.ts;
    const largura = this.planta.col1 - this.planta.col0;
    const maisAlto = Math.min(...this.planta.pisos.map((p) => this.yChao(p)));
    const topo = maisAlto - ts * 12;
    const chao = this.yChao(piso(this.planta, c.piso)) - ts;
    for (let i = 0; i < 900; i++) {
      const x = this.xDe(1 + hash(i * 3.7) * (largura - 2));
      const y = topo + hash(i * 5.3) * (chao - topo);
      if (camera && !camera.sees(x, y, 8)) continue;
      const brilho = 0.45 + 0.55 * Math.abs(Math.sin(this.t * (0.6 + hash(i) * 1.8) + i));
      ctx.fillStyle = `rgba(215,230,255,${brilho})`;
      // Ponto de 2 px some na tela do celular: o minimo e 3, e as mais fortes
      // ganham a cruz de brilho.
      if (hash(i * 9.1) > 0.8) {
        ctx.fillRect(x - 4, y + 1, 11, P);
        ctx.fillRect(x + 1, y - 4, P, 11);
        ctx.fillRect(x - 1, y - 1, 6, 6);
      } else {
        ctx.fillRect(x, y, 3, 3);
      }
    }
  }

  /**
   * O projetor e o feixe. Vem depois das barracas: na primeira foto o feixe
   * saia de tras da padaria e ninguem via de onde vinham as estrelas.
   */
  private desenharProjetor(ctx: CanvasRenderingContext2D, camera: Camera | undefined): void {
    const c = this.planta.ceuEstrelado;
    if (!c || !this.flag(c.flag)) return;
    const ts = this.ts;
    const px = this.xDe(c.x) + ts / 2;
    const chao = this.yChao(piso(this.planta, c.piso));
    const boca = chao - ts * 0.9;
    const alto = boca - ts * 11;
    if (camera && !this.visivel(camera, px - ts * 4, alto, ts * 8, chao - alto)) return;
    const g = ctx.createLinearGradient(0, boca, 0, alto);
    g.addColorStop(0, 'rgba(200,220,255,0.22)');
    g.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(px - 3, boca);
    ctx.lineTo(px + 3, boca);
    ctx.lineTo(px + ts * 3.5, alto);
    ctx.lineTo(px - ts * 3.5, alto);
    ctx.closePath();
    ctx.fill();
    // Tripe de ferro e o tubo de latao virado para cima.
    ctx.fillStyle = COR.ferro;
    ctx.fillRect(px - 9, chao - 12, P, 12);
    ctx.fillRect(px + 7, chao - 12, P, 12);
    ctx.fillRect(px - 1, chao - 14, P, 14);
    ctx.fillStyle = '#b8863b';
    ctx.fillRect(px - 5, boca, 10, chao - 12 - boca);
    ctx.fillStyle = '#e0b060';
    ctx.fillRect(px - 5, boca, 10, P);
    const pulso = 0.6 + 0.4 * Math.sin(this.t * 2);
    ctx.fillStyle = `rgba(215,235,255,${pulso})`;
    ctx.fillRect(px - 3, boca - P, 6, P);
  }

  /** Pontas de pedra penduradas na abobada: a caverna tem teto, e ele e alto. */
  private desenharEstalactites(ctx: CanvasRenderingContext2D, camera: Camera | undefined): void {
    const ts = this.ts;
    const largura = this.planta.col1 - this.planta.col0;
    for (let x = 1; x < largura; x += 2) {
      const h = hash(x * 7.3);
      if (h < 0.35) continue;
      const topo = (tetoEm(this.planta, this.world.surfaceRow, x) + 1) * ts;
      const comp = (1 + h * 3.5) * ts;
      const px = this.xDe(x) + (h - 0.5) * ts;
      if (camera && !this.visivel(camera, px - ts, topo, ts * 2, comp)) continue;
      const larg = ts * (0.5 + h * 0.6);
      ctx.fillStyle = COR.pedraEscura;
      ctx.beginPath();
      ctx.moveTo(px - larg / 2, topo);
      ctx.lineTo(px + larg / 2, topo);
      ctx.lineTo(px + larg * 0.1, topo + comp);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(120,140,170,0.18)';
      ctx.fillRect(px - larg * 0.1, topo, P, comp * 0.7);
    }
  }

  private desenharCascatas(ctx: CanvasRenderingContext2D, camera: Camera | undefined): void {
    const ts = this.ts;
    for (const c of this.planta.cascatas) {
      const x = this.xDe(c.x) + ts / 2;
      const y0 = this.linha(c.de) * ts;
      const y1 = (this.linha(c.ate) + 1) * ts;
      const w = ts * 2.2;
      if (camera && !this.visivel(camera, x - w, y0 - ts * 2, w * 2, y1 - y0 + ts * 2)) continue;
      // A nascente: uma fenda de pedra na abobada. Agua que sai do nada le
      // como um feixe de luz, e ja leu assim.
      ctx.fillStyle = COR.pedraEscura;
      ctx.beginPath();
      ctx.moveTo(x - w, y0 - ts * 1.5);
      ctx.lineTo(x + w, y0 - ts * 1.5);
      ctx.lineTo(x + w * 0.6, y0 + 6);
      ctx.lineTo(x - w * 0.6, y0 + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COR.pedra;
      ctx.fillRect(x - w * 0.6, y0, w * 1.2, 6);
      // O corpo da queda: mais opaco no meio, desfiado nas bordas, e mais
      // largo embaixo (agua abre ao cair).
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const larg = w * (0.35 + t * 0.65);
        ctx.fillStyle = `rgba(120,185,220,${0.14 + (1 - t) * 0.22})`;
        ctx.beginPath();
        ctx.moveTo(x - larg * 0.55, y0);
        ctx.lineTo(x + larg * 0.55, y0);
        ctx.lineTo(x + larg * 0.85, y1);
        ctx.lineTo(x - larg * 0.85, y1);
        ctx.closePath();
        ctx.fill();
      }
      // Fios de agua descendo: o que diz que ela CAI, e nao que e um cano.
      for (let i = 0; i < 9; i++) {
        const u = (i + 0.5) / 9 - 0.5;
        const vel = 150 + hash(i + c.x) * 90;
        const fase = (this.t * vel + hash(i * 3.1) * 400) % 80;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(235,248,255,0.7)' : 'rgba(200,232,248,0.45)';
        for (let y = y0 - 80 + fase; y < y1; y += 80) {
          const yy = Math.max(y0, y);
          const abre = 0.55 + ((yy - y0) / (y1 - y0)) * 0.3;
          ctx.fillRect(x + u * w * 2 * abre, yy, P, 26);
        }
      }
      // Espuma e nevoa no pe da queda.
      const nev = 4 + Math.sin(this.t * 3) * 2;
      const g = ctx.createRadialGradient(x, y1, 4, x, y1, w * 1.6);
      g.addColorStop(0, 'rgba(225,245,252,0.55)');
      g.addColorStop(1, 'rgba(225,245,252,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - w * 1.6, y1 - ts - nev, w * 3.2, ts + nev + 6);
    }
  }

  private desenharAgua(ctx: CanvasRenderingContext2D, camera: Camera | undefined): void {
    const ts = this.ts;
    for (const a of this.planta.agua) {
      const x0 = this.xDe(a.x0);
      const x1 = this.xDe(a.x1 + 1);
      const y0 = this.linha(a.topo) * ts;
      const y1 = (this.linha(a.fundo) + 1) * ts;
      if (camera && !this.visivel(camera, x0, y0, x1 - x0, y1 - y0)) continue;
      this.corpoDagua(ctx, x0, y0, x1, y1);
    }
  }

  private corpoDagua(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, COR.agua);
    g.addColorStop(1, COR.aguaFunda);
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // Linha da superficie e reflexos que andam.
    ctx.fillStyle = COR.aguaClara;
    ctx.fillRect(x0, y0, x1 - x0, P);
    for (let x = x0; x < x1; x += 14) {
      const o = Math.sin(this.t * 2 + x * 0.05) * 3;
      ctx.fillStyle = 'rgba(180,225,245,0.35)';
      ctx.fillRect(x + o, y0 + 5 + ((x / 14) % 3) * 5, 8, P);
    }
  }

  // --------------------------------------------------------------- pisos ----

  /** A parte de cima do piso: tabua, laje ou deck da ponte, e o guarda-corpo. */
  private desenharPiso(ctx: CanvasRenderingContext2D, camera: Camera | undefined, p: PisoDef): void {
    const ts = this.ts;
    const x0 = this.xDe(p.x0);
    const w = (p.x1 - p.x0 + 1) * ts;
    const y = this.yChao(p);
    const img = this.sprite(`piso:${p.id}`, w, ts * 2.2, (c) => this.pintarPiso(c, p, w));
    const topo = y - ts * 1.2;
    if (camera && !this.visivel(camera, x0, topo, w, img.height)) return;
    this.carimbarComVao(ctx, img, p, x0, topo);
  }

  /**
   * O chao da caverna nao flutua: embaixo da laje ha um muro de arrimo de
   * pedra que afunda no escuro. Sem isto a rocha da cidade aparecia crua logo
   * abaixo do piso, com a textura de galeria de mina.
   */
  private desenharFundacao(ctx: CanvasRenderingContext2D, camera: Camera | undefined, p: PisoDef): void {
    if (!p.chao || p.tipo !== 'pedra') return;
    const ts = this.ts;
    const x0 = this.xDe(p.x0);
    const w = (p.x1 - p.x0 + 1) * ts;
    const h = ts * 6;
    const y = this.yChao(p);
    const img = this.sprite(`fundacao:${p.id}`, w, h, (c) => {
      this.alvenaria(c, 0, 0, w, ts * 2.2, p.x0 * 17);
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(8,8,12,0.15)');
      g.addColorStop(0.35, 'rgba(8,8,12,0.55)');
      g.addColorStop(1, 'rgba(8,8,12,1)');
      c.fillStyle = COR.pedraEscura;
      c.fillRect(0, ts * 2.2, w, h - ts * 2.2);
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    });
    this.carimbo(ctx, camera, img, x0, y);
  }

  /** Colunas deste piso onde nao vai guarda-corpo: onde se sobe ou se emenda. */
  private aberturas(p: PisoDef): Set<number> {
    const out = new Set<number>();
    for (const e of this.planta.escadas) {
      if (e.para === p.id || e.de === p.id) {
        for (let d = -1; d <= 1; d++) out.add(e.x + d);
      }
    }
    // Emenda com piso vizinho na mesma altura: sem grade no meio do caminho.
    for (const q of this.planta.pisos) {
      if (q === p || q.pe !== p.pe) continue;
      if (q.x1 + 1 === p.x0) out.add(p.x0);
      if (q.x0 - 1 === p.x1) out.add(p.x1);
    }
    if (this.planta.elevador?.paradas.includes(p.id)) {
      for (let d = -2; d <= 2; d++) out.add(this.planta.elevador.x + d);
    }
    return out;
  }

  private pintarPiso(c: CanvasRenderingContext2D, p: PisoDef, w: number): void {
    const ts = this.ts;
    const topo = ts * 1.2; // y do chao dentro do sprite
    const abertas = this.aberturas(p);
    const semGrade = p.chao && p.tipo === 'pedra';

    if (p.tipo === 'tabua') {
      // Tabuado: tabuas de largura variada, com junta e prego.
      c.fillStyle = COR.madeiraEscura;
      c.fillRect(0, topo, w, 12);
      let x = 0;
      let i = 0;
      while (x < w) {
        const larg = 22 + Math.floor(hash(i + p.x0 * 3) * 18);
        c.fillStyle = i % 2 ? COR.madeira : COR.madeiraMeia;
        c.fillRect(x, topo, larg - P, 8);
        c.fillStyle = COR.madeiraBrilho;
        c.fillRect(x, topo, larg - P, P);
        c.fillStyle = COR.madeiraEscura;
        c.fillRect(x + 3, topo + 3, P, P);
        c.fillRect(x + larg - 7, topo + 3, P, P);
        x += larg;
        i++;
      }
      // Viga de borda por baixo.
      c.fillStyle = COR.madeira;
      c.fillRect(0, topo + 8, w, 6);
      c.fillStyle = COR.madeiraEscura;
      c.fillRect(0, topo + 14, w, P);
    } else if (p.tipo === 'pedra') {
      // Lajeado de chao: pedra cortada, junta desencontrada.
      c.fillStyle = COR.pedraEscura;
      c.fillRect(0, topo, w, 16);
      let x = 0;
      let i = 0;
      while (x < w) {
        const larg = 26 + Math.floor(hash(i * 1.7 + p.x0) * 22);
        c.fillStyle = hash(i + 9) > 0.5 ? COR.pedraMeia : COR.pedra;
        c.fillRect(x, topo, larg - P, 10);
        c.fillStyle = COR.pedraBrilho;
        c.fillRect(x, topo, larg - P, P);
        x += larg;
        i++;
      }
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(0, topo + 10, w, 6);
    } else {
      // Balcao e ponte: laje grossa de pedra lavrada.
      c.fillStyle = COR.pedraEscura;
      c.fillRect(0, topo, w, 18);
      let x = 0;
      let i = 0;
      while (x < w) {
        const larg = p.tipo === 'ponte' ? 30 : 24 + Math.floor(hash(i + p.x1) * 16);
        c.fillStyle = i % 2 ? COR.pedraMeia : COR.pedraClara;
        c.fillRect(x, topo, larg - P, 12);
        c.fillStyle = COR.pedraBrilho;
        c.fillRect(x, topo, larg - P, P);
        x += larg;
        i++;
      }
      c.fillStyle = COR.pedra;
      c.fillRect(0, topo + 12, w, 6);
    }

    if (semGrade) return;

    // Guarda-corpo: ele diz "passarela" de longe, antes do jogador pisar.
    const largura = p.x1 - p.x0 + 1;
    const altura = ts * 1.05;
    if (p.tipo === 'tabua' || (p.chao && p.tipo !== 'pedra')) {
      c.fillStyle = COR.madeiraMeia;
      for (let k = 0; k < largura; k++) {
        if (abertas.has(p.x0 + k)) continue;
        const xk = k * ts;
        c.fillRect(xk, topo - altura + 4, ts, 4);
        c.fillStyle = COR.madeiraBrilho;
        c.fillRect(xk, topo - altura + 4, ts, P);
        c.fillStyle = COR.madeiraMeia;
        if (k % 2 === 0) {
          c.fillStyle = COR.madeira;
          c.fillRect(xk + 2, topo - altura + 4, 5, altura - 4);
          c.fillStyle = COR.madeiraMeia;
        }
        c.fillRect(xk, topo - altura * 0.45, ts, 3);
      }
    } else {
      // Balaustrada de pedra: pilarzinhos e corrimao.
      for (let k = 0; k < largura; k++) {
        if (abertas.has(p.x0 + k)) continue;
        const xk = k * ts;
        c.fillStyle = COR.pedraMeia;
        c.fillRect(xk, topo - altura + 2, ts, 6);
        c.fillStyle = COR.pedraBrilho;
        c.fillRect(xk, topo - altura + 2, ts, P);
        c.fillStyle = COR.pedra;
        for (const off of [6, 20]) c.fillRect(xk + off, topo - altura + 8, 6, altura - 8);
        c.fillStyle = COR.pedraClara;
        for (const off of [6, 20]) c.fillRect(xk + off, topo - altura + 8, P, altura - 8);
      }
    }
  }

  /** O que segura o piso: pilar, mao-francesa, misula, arco. */
  private desenharEstrutura(ctx: CanvasRenderingContext2D, camera: Camera | undefined, p: PisoDef): void {
    if (p.chao && p.tipo === 'pedra') return;
    const ts = this.ts;
    const x0 = this.xDe(p.x0);
    const w = (p.x1 - p.x0 + 1) * ts;
    const y = this.yChao(p) + 14;
    // Ate onde a estrutura desce: o primeiro solido abaixo de cada ponto.
    const alturaMax = this.alturaAteSolido(p);
    const h = Math.min(alturaMax, ts * 60);
    const img = this.sprite(`estrutura:${p.id}`, w, h, (c) => this.pintarEstrutura(c, p, w, h));
    if (camera && !this.visivel(camera, x0, y, w, img.height)) return;
    this.carimbarComVao(ctx, img, p, x0, y);
  }

  /**
   * Carimba o sprite de um piso deixando o vao da ponte quebrada vazio de
   * verdade — sem laje, sem grade, sem viga por baixo.
   */
  private carimbarComVao(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, p: PisoDef, x0: number, y: number): void {
    const ts = this.ts;
    const w = img.width;
    const q = this.planta.ponteQuebrada;
    if (q && q.piso === p.id && !this.flag(q.flag)) {
      const a = (q.x0 - p.x0) * ts;
      const b = (q.x1 + 1 - p.x0) * ts;
      if (a > 0) ctx.drawImage(img, 0, 0, a, img.height, Math.round(x0), Math.round(y), a, img.height);
      if (b < w) ctx.drawImage(img, b, 0, w - b, img.height, Math.round(x0 + b), Math.round(y), w - b, img.height);
      return;
    }
    ctx.drawImage(img, Math.round(x0), Math.round(y));
  }

  /** Distancia, em px, do chao do piso ate o solido mais alto embaixo dele. */
  private alturaAteSolido(p: PisoDef): number {
    const ts = this.ts;
    let max = 0;
    for (let x = p.x0; x <= p.x1; x++) max = Math.max(max, this.vaoAbaixo(p, x));
    return Math.max(ts, max * ts);
  }

  /** Tiles de vao entre o piso e o proximo solido abaixo, naquela coluna. */
  private vaoAbaixo(p: PisoDef, x: number): number {
    const col = colunaDe(this.planta, x);
    const row0 = this.linha(p.pe) + 2;
    for (let r = row0; r < row0 + 80; r++) {
      if (this.world.isSolid(col, r)) return r - row0;
    }
    return 80;
  }

  private pintarEstrutura(c: CanvasRenderingContext2D, p: PisoDef, w: number, _h: number): void {
    const ts = this.ts;
    const largura = p.x1 - p.x0 + 1;

    if (p.tipo === 'ponte') {
      // Arcos de pedra sobre pilares que descem ate o chao da caverna.
      const vao = 8;
      for (let k = 0; k <= largura; k += vao) {
        const xk = k * ts;
        const alt = this.vaoAbaixo(p, Math.min(p.x1, p.x0 + k)) * ts + 16;
        c.fillStyle = COR.pedra;
        c.fillRect(xk - 12, 0, 24, alt);
        c.fillStyle = COR.pedraClara;
        c.fillRect(xk - 12, 0, 4, alt);
        c.fillStyle = COR.pedraEscura;
        for (let y = 20; y < alt; y += 18) c.fillRect(xk - 12, y, 24, P);
      }
      // Arco: faixa de pedra curva entre pilares.
      c.strokeStyle = COR.pedraMeia;
      c.lineWidth = 10;
      for (let k = 0; k < largura; k += vao) {
        const cx = (k + vao / 2) * ts;
        const r = (vao / 2) * ts - 12;
        c.beginPath();
        c.arc(cx, r * 0.9 + 4, r, Math.PI, 0);
        c.stroke();
      }
      c.fillStyle = COR.pedra;
      c.fillRect(0, 0, w, 10);
      return;
    }

    if (p.tipo === 'balcao') {
      // Misula: degraus de pedra saindo da parede, a cada tres tiles.
      for (let k = 1; k < largura; k += 3) {
        const xk = k * ts;
        c.fillStyle = COR.pedra;
        for (let d = 0; d < 4; d++) c.fillRect(xk + d * 3, d * 8, 24 - d * 6, 8);
        c.fillStyle = COR.pedraClara;
        c.fillRect(xk, 0, 24, P);
      }
      return;
    }

    // Tabua: pilares ate o solido e mao-francesa na parede.
    for (let k = 0; k < largura; k += 5) {
      const x = Math.min(p.x1, p.x0 + k);
      const vao = this.vaoAbaixo(p, x);
      const xk = (x - p.x0) * ts + 12;
      if (vao <= 14) {
        const alt = vao * ts + 20;
        c.fillStyle = COR.madeira;
        c.fillRect(xk, 0, 8, alt);
        c.fillStyle = COR.madeiraBrilho;
        c.fillRect(xk, 0, P, alt);
        c.fillStyle = COR.madeiraEscura;
        c.fillRect(xk + 6, 0, P, alt);
      } else {
        // Vao alto demais para pilar: mao-francesa em diagonal.
        c.strokeStyle = COR.madeira;
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(xk, 0);
        c.lineTo(xk + (p.encosto === 'leste' ? 1 : -1) * ts * 1.6, ts * 1.8);
        c.stroke();
      }
    }
    // Encosto na parede: viga grossa e duas maos-francesas.
    const naParede = p.encosto === 'oeste' ? 0 : w - 10;
    c.fillStyle = COR.madeiraEscura;
    c.fillRect(naParede, 0, 10, ts * 2.2);
    c.strokeStyle = COR.madeiraMeia;
    c.lineWidth = 6;
    c.beginPath();
    const dir = p.encosto === 'leste' ? -1 : 1;
    c.moveTo(naParede + 5, ts * 2);
    c.lineTo(naParede + 5 + dir * ts * 2.2, 2);
    c.stroke();
  }

  // -------------------------------------------------------------- predios ----

  private desenharPredio(ctx: CanvasRenderingContext2D, camera: Camera | undefined, pr: PredioDef): void {
    const ts = this.ts;
    const w = pr.w * ts;
    const h = pr.h * ts;
    const x = this.xDe(pr.x);
    const y = this.yChao(piso(this.planta, pr.piso)) - h;
    if (camera && !this.visivel(camera, x, y - ts, w, h + ts)) return;
    // Arte de verdade, quando existir, ganha do desenho.
    const arte = Assets.blockia(`predio_${pr.tipo}`);
    if (arte) {
      ctx.drawImage(arte, x, y, w, h);
    } else {
      const img = this.sprite(`predio:${pr.id}`, w, h + ts, (c) => this.pintarPredio(c, pr, w, h));
      ctx.drawImage(img, Math.round(x), Math.round(y - ts));
    }
    // Chamine fumegando: o que mais diz "tem gente em casa".
    if (pr.tipo === 'casa' || pr.tipo === 'forja') {
      const cx = x + w * (pr.variante && pr.variante % 2 ? 0.25 : 0.72);
      const cy = y - ts * 0.9;
      for (let i = 0; i < 3; i++) {
        const f = (this.t * 0.4 + i / 3) % 1;
        ctx.fillStyle = `rgba(150,150,160,${0.28 * (1 - f)})`;
        const r = 4 + f * 10;
        ctx.fillRect(cx + Math.sin(f * 6 + i) * 6 - r / 2, cy - f * 60 - r / 2, r, r);
      }
    }
  }

  private pintarPredio(c: CanvasRenderingContext2D, pr: PredioDef, w: number, h: number): void {
    const ts = this.ts;
    c.translate(0, ts); // o sprite tem um tile de folga em cima para o telhado
    const v = pr.variante ?? 0;
    switch (pr.tipo) {
      case 'casa':
        this.pintarCasa(c, w, h, v);
        break;
      case 'clinica':
        this.pintarCasa(c, w, h, 7);
        this.placa(c, w / 2, h * 0.36, pr.placa);
        break;
      case 'guarita':
        this.pintarGuarita(c, w, h);
        this.placa(c, w / 2, h * 0.5, pr.placa);
        break;
      case 'arquivo':
        this.pintarPedraSolene(c, w, h, false);
        this.placa(c, w / 2, h * 0.2, pr.placa);
        break;
      case 'conselho':
        this.pintarPedraSolene(c, w, h, true);
        this.placa(c, w / 2, h * 0.14, pr.placa);
        break;
      case 'oficina':
        this.pintarOficina(c, w, h);
        this.placa(c, w * 0.3, h * 0.3, pr.placa);
        break;
      case 'forja':
        this.pintarForja(c, w, h);
        break;
    }
  }

  /** Alvenaria: fiadas de pedra desencontradas. */
  private alvenaria(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, semente: number): void {
    c.fillStyle = COR.pedraEscura;
    c.fillRect(x, y, w, h);
    const fiada = 10;
    for (let yy = 0, i = 0; yy < h; yy += fiada, i++) {
      let xx = i % 2 ? -8 : 0;
      let j = 0;
      while (xx < w) {
        const larg = 16 + Math.floor(hash(semente + i * 13 + j) * 12);
        const x1 = Math.max(0, xx);
        const x2 = Math.min(w, xx + larg - P);
        if (x2 > x1) {
          c.fillStyle = hash(semente + i + j * 7) > 0.5 ? COR.pedraMeia : COR.pedra;
          c.fillRect(x + x1, y + yy, x2 - x1, fiada - P);
          c.fillStyle = 'rgba(255,255,255,0.08)';
          c.fillRect(x + x1, y + yy, x2 - x1, P);
        }
        xx += larg;
        j++;
      }
    }
  }

  private janela(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, arco = false): void {
    c.fillStyle = COR.moldura;
    c.fillRect(x - 3, y - 3, w + 6, h + 6);
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, COR.janela);
    g.addColorStop(1, COR.janelaFundo);
    c.fillStyle = g;
    if (arco) {
      c.beginPath();
      c.moveTo(x, y + h);
      c.lineTo(x, y + w / 2);
      c.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
      c.lineTo(x + w, y + h);
      c.closePath();
      c.fill();
    } else {
      c.fillRect(x, y, w, h);
    }
    c.fillStyle = COR.moldura;
    c.fillRect(x + w / 2 - 1, y, P, h);
    c.fillRect(x, y + h * 0.5, w, P);
    // Parapeito.
    c.fillStyle = COR.madeiraClara;
    c.fillRect(x - 4, y + h + 2, w + 8, 4);
  }

  private portaDeMadeira(c: CanvasRenderingContext2D, x: number, yBase: number, w: number, h: number): void {
    const y = yBase - h;
    c.fillStyle = COR.moldura;
    c.fillRect(x - 3, y - 3, w + 6, h + 3);
    c.fillStyle = COR.madeira;
    c.beginPath();
    c.moveTo(x, yBase);
    c.lineTo(x, y + w / 2);
    c.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
    c.lineTo(x + w, yBase);
    c.closePath();
    c.fill();
    c.fillStyle = COR.madeiraEscura;
    for (let xx = x + 6; xx < x + w - 2; xx += 7) c.fillRect(xx, y + 6, P, h - 6);
    c.fillStyle = COR.ferroClaro;
    c.fillRect(x + w - 8, y + h * 0.55, 4, 4);
  }

  private telhado(
    c: CanvasRenderingContext2D,
    w: number,
    alt: number,
    beiral: number,
    cores: [string, string, string] = [COR.telhaEscura, COR.telha, COR.telhaClara]
  ): void {
    // Duas aguas, telha em fiadas: o verde-azulado da pintura de fundo.
    const topo = -alt;
    c.fillStyle = cores[0];
    c.beginPath();
    c.moveTo(-beiral, 0);
    c.lineTo(w / 2, topo);
    c.lineTo(w + beiral, 0);
    c.closePath();
    c.fill();
    for (let y = topo + 6, i = 0; y < 0; y += 6, i++) {
      const t = (y - topo) / alt;
      const meia = (w / 2 + beiral) * t;
      c.fillStyle = i % 2 ? cores[1] : cores[2];
      c.fillRect(w / 2 - meia, y, meia * 2, 3);
    }
    c.fillStyle = COR.viga;
    c.fillRect(-beiral, -2, w + beiral * 2, 4);
  }

  /**
   * Casa de enxaimel. A variante escolhe reboco, telhado, janelas e enfeite:
   * sete casas iguais leem como conjunto habitacional, e Blockia foi
   * construida aos poucos por quatrocentas pessoas.
   */
  private pintarCasa(c: CanvasRenderingContext2D, w: number, h: number, v: number): void {
    const ts = this.ts;
    const REBOCOS = ['#8a7458', '#a58c69', '#7b8a8f', '#b39a72', '#6f6a5a', '#9c7a5a', '#8f9a86', '#a89478'];
    const TELHAS: [string, string, string][] = [
      [COR.telhaEscura, COR.telha, COR.telhaClara],
      ['#2a2f45', '#3a4264', '#525c86'],
      ['#4a2418', '#6d3526', '#8c4a34'],
      ['#26351f', '#37502c', '#4d6c3d'],
    ];
    const reboco = REBOCOS[v % REBOCOS.length];
    const telha = TELHAS[(v * 3 + 1) % TELHAS.length];
    const alturaTelhado = ts * (1.4 + (v % 3) * 0.2);
    const corpo = h - alturaTelhado;
    const y0 = alturaTelhado;
    // Terreo de pedra, andar de cima de enxaimel.
    const terreo = corpo * 0.45;
    const cima = corpo - terreo;
    this.alvenaria(c, 0, y0 + cima, w, terreo, v * 31);
    c.fillStyle = reboco;
    c.fillRect(0, y0, w, cima);
    // Manchas do reboco: parede de verdade nao e lisa.
    for (let i = 0; i < 6; i++) {
      c.fillStyle = 'rgba(0,0,0,0.08)';
      c.fillRect(hash(v * 9 + i) * (w - 14), y0 + hash(v * 5 + i * 2) * (cima - 10), 10 + hash(i) * 12, 6);
    }
    // Vigas do enxaimel: o desenho muda com a casa.
    c.fillStyle = COR.viga;
    c.fillRect(0, y0, w, 4);
    c.fillRect(0, y0 + cima - 4, w, 4);
    c.fillRect(0, y0, 5, cima);
    c.fillRect(w - 5, y0, 5, cima);
    c.fillRect(w / 2 - 2, y0, 4, cima);
    c.strokeStyle = COR.viga;
    c.lineWidth = 3;
    c.beginPath();
    if (v % 2) {
      c.moveTo(5, y0 + cima - 4);
      c.lineTo(w / 2 - 2, y0 + 4);
      c.moveTo(w - 5, y0 + cima - 4);
      c.lineTo(w / 2 + 2, y0 + 4);
    } else {
      c.moveTo(5, y0 + 4);
      c.lineTo(w / 2 - 2, y0 + cima - 4);
      c.moveTo(w - 5, y0 + 4);
      c.lineTo(w / 2 + 2, y0 + cima - 4);
    }
    c.stroke();
    // Janelas do andar, com veneziana em algumas.
    const jw = ts * 0.7;
    const jh = ts * 0.8;
    const jy = y0 + (cima - jh) / 2;
    for (const cx of [w * 0.25, w * 0.75]) {
      this.janela(c, cx - jw / 2, jy, jw, jh);
      if (v % 3 === 1) {
        c.fillStyle = telha[1];
        c.fillRect(cx - jw / 2 - 9, jy - 2, 6, jh + 4);
        c.fillRect(cx + jw / 2 + 3, jy - 2, 6, jh + 4);
      }
      if (v % 3 === 2) {
        // Floreira: o que diz que alguem cuida.
        c.fillStyle = COR.madeira;
        c.fillRect(cx - jw / 2 - 3, jy + jh + 5, jw + 6, 6);
        for (let k = 0; k < 4; k++) {
          c.fillStyle = k % 2 ? '#c05050' : '#e0c050';
          c.fillRect(cx - jw / 2 + k * (jw / 4), jy + jh + 1, 4, 4);
          c.fillStyle = '#4d7a3a';
          c.fillRect(cx - jw / 2 + k * (jw / 4) + 3, jy + jh + 2, 3, 4);
        }
      }
    }
    // Porta no terreo, de um lado ou do outro.
    const pw = ts * 1.1;
    const px = v % 2 ? w * 0.18 : w * 0.82 - pw;
    this.portaDeMadeira(c, px, y0 + corpo, pw, Math.min(ts * 1.9, terreo - 2));
    // Janelinha do terreo, do outro lado.
    const jx = v % 2 ? w * 0.7 : w * 0.18;
    this.janela(c, jx, y0 + cima + 10, ts * 0.55, ts * 0.55);
    // Telhado e chamine.
    c.save();
    c.translate(0, y0);
    const chX = v % 2 ? w * 0.25 : w * 0.72;
    c.fillStyle = COR.pedra;
    c.fillRect(chX - 6, -alturaTelhado - 6, 12, alturaTelhado);
    c.fillStyle = COR.pedraEscura;
    c.fillRect(chX - 8, -alturaTelhado - 8, 16, 4);
    this.telhado(c, w, alturaTelhado, 6, telha);
    // Agua-furtada em casa larga: telhado com janela e casa com sotao.
    if (w >= ts * 8 && v % 2 === 0) {
      const ax = w * 0.4;
      c.fillStyle = reboco;
      c.fillRect(ax, -alturaTelhado * 0.55, ts * 0.8, alturaTelhado * 0.55);
      this.janela(c, ax + 5, -alturaTelhado * 0.45, ts * 0.8 - 10, ts * 0.45);
      c.fillStyle = telha[0];
      c.fillRect(ax - 3, -alturaTelhado * 0.62, ts * 0.8 + 6, 5);
    }
    c.restore();
  }

  private pintarGuarita(c: CanvasRenderingContext2D, w: number, h: number): void {
    this.alvenaria(c, 0, 10, w, h - 10, 5);
    // Ameias.
    c.fillStyle = COR.pedraMeia;
    for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 10, 12);
    const ts = this.ts;
    this.janela(c, w / 2 - ts * 0.3, h * 0.22, ts * 0.6, ts * 0.8, true);
    this.portaDeMadeira(c, w / 2 - ts * 0.6, h, ts * 1.2, ts * 2);
    // Estandarte da cidade.
    c.fillStyle = COR.bandeira;
    c.fillRect(6, 16, 14, 40);
    c.fillStyle = COR.ouro;
    c.fillRect(11, 26, 4, 10);
  }

  /** Arquivo e Conselho: pedra lavrada, colunas, janela em arco. */
  private pintarPedraSolene(c: CanvasRenderingContext2D, w: number, h: number, conselho: boolean): void {
    const ts = this.ts;
    const frontao = conselho ? ts * 1.8 : ts * 1.2;
    this.alvenaria(c, 0, frontao, w, h - frontao, conselho ? 77 : 41);
    // Frontao triangular.
    c.fillStyle = COR.pedraClara;
    c.beginPath();
    c.moveTo(-6, frontao);
    c.lineTo(w / 2, 0);
    c.lineTo(w + 6, frontao);
    c.closePath();
    c.fill();
    c.fillStyle = COR.pedraMeia;
    c.beginPath();
    c.moveTo(10, frontao - 4);
    c.lineTo(w / 2, 10);
    c.lineTo(w - 10, frontao - 4);
    c.closePath();
    c.fill();
    c.fillStyle = COR.pedraBrilho;
    c.fillRect(-6, frontao - 4, w + 12, 6);
    // Colunas.
    const n = conselho ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const x = (w / (n - 1)) * i - (i === n - 1 ? 14 : 0);
      c.fillStyle = COR.pedraClara;
      c.fillRect(x, frontao + 4, 14, h - frontao - 4);
      c.fillStyle = COR.pedraBrilho;
      c.fillRect(x, frontao + 4, 4, h - frontao - 4);
      c.fillStyle = COR.pedraMeia;
      c.fillRect(x - 3, frontao + 4, 20, 6);
      c.fillRect(x - 3, h - 8, 20, 8);
    }
    // Janelas em arco entre colunas, e porta grande no meio.
    const jw = ts * 0.8;
    for (let i = 0; i < n - 1; i++) {
      const cx = (w / (n - 1)) * (i + 0.5);
      if (Math.abs(cx - w / 2) < ts) continue;
      this.janela(c, cx - jw / 2, frontao + ts * 0.9, jw, ts * 1.6, true);
    }
    this.portaDeMadeira(c, w / 2 - ts * 0.8, h, ts * 1.6, ts * 2.4);
    if (conselho) {
      // Estandartes do Conselho: azul com a lanterna dourada.
      for (const x of [w * 0.2, w * 0.8 - 18]) {
        c.fillStyle = COR.bandeira;
        c.fillRect(x, frontao + 10, 18, ts * 2);
        c.fillStyle = COR.bandeiraClara;
        c.fillRect(x, frontao + 10, 4, ts * 2);
        c.fillStyle = COR.ouro;
        c.fillRect(x + 6, frontao + 26, 6, 12);
        c.beginPath();
        c.moveTo(x, frontao + 10 + ts * 2);
        c.lineTo(x + 9, frontao + 10 + ts * 2 + 8);
        c.lineTo(x + 18, frontao + 10 + ts * 2);
        c.closePath();
        c.fillStyle = COR.bandeira;
        c.fill();
      }
      // Rosacea acesa no frontao.
      c.fillStyle = COR.moldura;
      c.beginPath();
      c.arc(w / 2, frontao * 0.62, 12, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = COR.janela;
      c.beginPath();
      c.arc(w / 2, frontao * 0.62, 9, 0, Math.PI * 2);
      c.fill();
    } else {
      // Um livro aberto em relevo sobre a porta: e o arquivo.
      c.fillStyle = COR.pedraBrilho;
      c.fillRect(w / 2 - 12, frontao + 8, 11, 8);
      c.fillRect(w / 2 + 1, frontao + 8, 11, 8);
      c.fillStyle = COR.pedraEscura;
      c.fillRect(w / 2 - 1, frontao + 8, P, 8);
    }
  }

  private pintarOficina(c: CanvasRenderingContext2D, w: number, h: number): void {
    const ts = this.ts;
    const alt = ts * 1.1;
    // Galpao de tabua na vertical.
    for (let x = 0, i = 0; x < w; x += 12, i++) {
      c.fillStyle = i % 2 ? COR.madeira : COR.madeiraMeia;
      c.fillRect(x, alt, 12 - P, h - alt);
    }
    c.fillStyle = COR.viga;
    c.fillRect(0, alt, w, 5);
    // Portao largo e engrenagem de ferro na fachada.
    c.fillStyle = COR.madeiraEscura;
    c.fillRect(w * 0.45, h - ts * 2.2, ts * 2.2, ts * 2.2);
    c.fillStyle = COR.madeiraClara;
    for (let y = h - ts * 2.2 + 6; y < h; y += 10) c.fillRect(w * 0.45 + 4, y, ts * 2.2 - 8, P);
    const gx = w * 0.72;
    const gy = alt + ts * 1.1;
    c.fillStyle = COR.ferro;
    c.beginPath();
    c.arc(gx, gy, 16, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = COR.ferroClaro;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.fillRect(gx + Math.cos(a) * 16 - 3, gy + Math.sin(a) * 16 - 3, 6, 6);
    }
    c.fillStyle = COR.madeiraEscura;
    c.beginPath();
    c.arc(gx, gy, 5, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.translate(0, alt);
    c.fillStyle = COR.telhaEscura;
    c.fillRect(-6, -alt, w + 12, alt);
    for (let y = -alt + 4, i = 0; y < 0; y += 6, i++) {
      c.fillStyle = i % 2 ? COR.telha : COR.telhaClara;
      c.fillRect(-6, y, w + 12, 3);
    }
    c.restore();
  }

  private pintarForja(c: CanvasRenderingContext2D, w: number, h: number): void {
    const ts = this.ts;
    // Um alpendre de pedra sobre as pecas da forja: parede do fundo, colunas
    // e o capelo da chamine. As pecas de arte ficam na frente, como bancada.
    const topo = ts * 1.4;
    this.alvenaria(c, 0, topo, w, h - topo, 99);
    c.fillStyle = 'rgba(20,10,5,0.45)';
    c.fillRect(0, topo, w, h - topo);
    // Brilho do fogo no fundo.
    const g = c.createRadialGradient(w * 0.35, h * 0.8, 4, w * 0.35, h * 0.8, w * 0.45);
    g.addColorStop(0, 'rgba(255,140,50,0.45)');
    g.addColorStop(1, 'rgba(255,140,50,0)');
    c.fillStyle = g;
    c.fillRect(0, topo, w, h - topo);
    // Telhado de telha e capelo.
    c.fillStyle = COR.telhaEscura;
    c.fillRect(-8, topo - 10, w + 16, 12);
    for (let x = -8, i = 0; x < w + 8; x += 10, i++) {
      c.fillStyle = i % 2 ? COR.telha : COR.telhaClara;
      c.fillRect(x, topo - 10, 8, 10);
    }
    c.fillStyle = COR.pedra;
    c.fillRect(w * 0.3, 0, ts * 1.2, topo);
    c.fillStyle = COR.pedraClara;
    c.fillRect(w * 0.3, 0, 4, topo);
    for (const x of [0, w - 12]) {
      c.fillStyle = COR.madeira;
      c.fillRect(x, topo, 12, h - topo);
      c.fillStyle = COR.madeiraBrilho;
      c.fillRect(x, topo, P, h - topo);
    }
  }

  private placa(c: CanvasRenderingContext2D, cx: number, cy: number, texto?: string): void {
    if (!texto) return;
    c.font = '600 11px Georgia, serif';
    const larg = Math.min(170, c.measureText(texto).width + 14);
    c.fillStyle = COR.madeiraEscura;
    c.fillRect(cx - larg / 2 - 2, cy - 11, larg + 4, 20);
    c.fillStyle = COR.madeira;
    c.fillRect(cx - larg / 2, cy - 9, larg, 16);
    c.fillStyle = COR.madeiraBrilho;
    c.fillRect(cx - larg / 2, cy - 9, larg, P);
    c.fillStyle = '#f3d9a6';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(texto, cx, cy, larg - 6);
  }

  // --------------------------------------------------------- lanternas ----

  /** Onde pendem as lanternas: embaixo das passarelas e ao lado das portas. */
  private pontosDeLanterna(): { x: number; y: number }[] {
    const ts = this.ts;
    const out: { x: number; y: number }[] = [];
    for (const p of this.planta.pisos) {
      if (p.chao) continue;
      for (let x = p.x0 + 3; x <= p.x1 - 2; x += 8) {
        out.push({ x: this.xDe(x) + ts / 2, y: this.yChao(p) + ts * 0.9 });
      }
    }
    for (const pr of this.planta.predios) {
      const y = this.yChao(piso(this.planta, pr.piso)) - ts * 2.3;
      out.push({ x: this.xDe(pr.x) - 4, y });
      out.push({ x: this.xDe(pr.x + pr.w) + 4, y });
    }
    // Uma lanterna em cada sala na parede: e escuro la dentro, e a luz diz
    // que ali ha alguma coisa para buscar.
    for (const sala of this.planta.salas) {
      const r = salaRect(this.planta, this.world.surfaceRow, sala);
      out.push({ x: ((r.col0 + r.col1) / 2) * ts, y: r.row0 * ts + ts * 0.5 });
    }
    // Postes no chao da praca.
    for (const p of this.planta.pisos) {
      if (!p.chao) continue;
      for (let x = p.x0 + 2; x <= p.x1; x += 12) out.push({ x: this.xDe(x), y: this.yChao(p) - ts * 2.6 });
    }
    return out;
  }

  private calcularLuzes(): LightSource[] {
    const ts = this.ts;
    const luzes: LightSource[] = this.pontosDeLanterna().map((p) => ({
      x: p.x,
      y: p.y,
      radius: ts * 3.2,
      intensity: 0.75,
    }));
    for (const pr of this.planta.predios) {
      const cx = this.xDe(pr.x) + (pr.w * ts) / 2;
      const cy = this.yChao(piso(this.planta, pr.piso)) - pr.h * ts * 0.5;
      luzes.push({ x: cx, y: cy, radius: ts * (pr.tipo === 'forja' ? 5 : 2.6), intensity: pr.tipo === 'forja' ? 0.9 : 0.5 });
    }
    return luzes;
  }

  private desenharLanternas(ctx: CanvasRenderingContext2D, camera: Camera | undefined): void {
    const ts = this.ts;
    for (const p of this.pontosDeLanterna()) {
      if (camera && !camera.sees(p.x, p.y, ts)) continue;
      const brilho = 0.85 + Math.sin(this.t * 5 + p.x * 0.3) * 0.08;
      // Halo desenhado antes da luz de verdade: o vidro precisa parecer aceso
      // tambem onde o escuro nem chega.
      const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 22);
      g.addColorStop(0, `rgba(255,200,110,${0.45 * brilho})`);
      g.addColorStop(1, 'rgba(255,200,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x - 22, p.y - 22, 44, 44);
      ctx.fillStyle = COR.ferro;
      ctx.fillRect(p.x - 1, p.y - 14, P, 6);
      ctx.fillRect(p.x - 6, p.y - 9, 12, 3);
      ctx.fillStyle = `rgba(255,214,130,${brilho})`;
      ctx.fillRect(p.x - 4, p.y - 6, 8, 10);
      ctx.fillStyle = COR.ferro;
      ctx.fillRect(p.x - 6, p.y + 4, 12, 3);
      ctx.fillRect(p.x - 1, p.y - 6, P, 10);
    }
  }

  // ------------------------------------------------------ coisas de missao ----

  private desenharSalas(ctx: CanvasRenderingContext2D, camera: Camera | undefined): void {
    const ts = this.ts;
    for (const sala of this.planta.salas) {
      const r = salaRect(this.planta, this.world.surfaceRow, sala);
      const x0 = r.col0 * ts;
      const y0 = r.row0 * ts;
      const x1 = (r.col1 + 1) * ts;
      const y1 = (r.row1 + 1) * ts;
      if (camera && !this.visivel(camera, x0, y0, x1 - x0, y1 - y0)) continue;
      // Parede de fundo da galeria: alvenaria velha, umida, no escuro.
      const fundo = this.sprite(`sala:${sala.id}`, x1 - x0, y1 - y0 + 16, (c) => {
        this.alvenaria(c, 0, 0, x1 - x0, y1 - y0, 55);
        c.fillStyle = 'rgba(6,10,14,0.62)';
        c.fillRect(0, 0, x1 - x0, y1 - y0);
        // Marca da agua que ja esteve la: a linha escura no alto da parede.
        c.fillStyle = 'rgba(40,70,80,0.5)';
        c.fillRect(0, ts * 0.6, x1 - x0, 4);
        // Escoras de madeira.
        for (let col = 2; col < r.col1 - r.col0; col += 4) {
          c.fillStyle = COR.madeira;
          c.fillRect(col * ts, 0, 8, y1 - y0);
          c.fillStyle = COR.madeiraEscura;
          c.fillRect(col * ts - 10, 0, 28, 6);
        }
        // Chao de laje.
        c.fillStyle = COR.pedraEscura;
        c.fillRect(0, y1 - y0, x1 - x0, 16);
        c.fillStyle = COR.pedraMeia;
        for (let x = 0; x < x1 - x0; x += 28) c.fillRect(x, y1 - y0, 26, 9);
      });
      ctx.drawImage(fundo, Math.round(x0), Math.round(y0));
    }
  }

  /**
   * A agua da sala alagada vem por CIMA de tudo, inclusive das caixas: elas
   * estao submersas, e da para ver pela agua que ha coisa la dentro.
   */
  private desenharAguaDasSalas(ctx: CanvasRenderingContext2D, camera: Camera | undefined): void {
    const ts = this.ts;
    for (const sala of this.planta.salas) {
      if (!sala.alagadaAte || this.flag(sala.alagadaAte)) continue;
      const r = salaRect(this.planta, this.world.surfaceRow, sala);
      const x0 = r.col0 * ts;
      const y0 = r.row0 * ts + ts * 0.6;
      const x1 = (r.col1 + 1) * ts;
      const y1 = (r.row1 + 1) * ts;
      if (camera && !this.visivel(camera, x0, y0, x1 - x0, y1 - y0)) continue;
      ctx.save();
      ctx.globalAlpha = 0.72;
      this.corpoDagua(ctx, x0, y0, x1, y1);
      ctx.restore();
    }
  }

  private desenharPonteQuebrada(ctx: CanvasRenderingContext2D, camera: Camera | undefined): void {
    const q = this.planta.ponteQuebrada;
    if (!q) return;
    const ts = this.ts;
    const p = piso(this.planta, q.piso);
    const x0 = this.xDe(q.x0);
    const x1 = this.xDe(q.x1 + 1);
    const y = this.yChao(p);
    if (camera && !this.visivel(camera, x0 - ts, y - ts * 2, x1 - x0 + ts * 2, ts * 4)) return;
    if (this.flag(q.flag)) {
      // Consertada: o vao ganha tabua nova, mais clara que a pedra velha — da
      // para ver de longe onde a cidade voltou a ter norte e sul.
      ctx.fillStyle = COR.madeiraEscura;
      ctx.fillRect(x0, y, x1 - x0, 14);
      for (let x = x0; x < x1; x += 16) {
        ctx.fillStyle = COR.madeiraNova;
        ctx.fillRect(x, y, 14, 9);
        ctx.fillStyle = '#e2bb82';
        ctx.fillRect(x, y, 14, P);
      }
      return;
    }
    // Quebrada: pontas lascadas penduradas e uma corda que ninguem soltou.
    ctx.fillStyle = COR.pedraMeia;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x0 - 4 + i * 3, y + 4 + i * 5, 8, 6);
      ctx.fillRect(x1 - 4 - i * 3, y + 4 + i * 5, 8, 6);
    }
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 + 2, y - ts * 0.9);
    const balanco = Math.sin(this.t * 1.5) * 6;
    ctx.quadraticCurveTo((x0 + x1) / 2 + balanco, y + ts * 1.8, x1 - 2, y - ts * 0.9);
    ctx.stroke();
  }

  /** O poco da saida inferior: escuro por dentro, com o fundo da mina embaixo. */
  private desenharSaida(ctx: CanvasRenderingContext2D, camera: Camera | undefined): void {
    const s = this.planta.saida;
    if (!s) return;
    const ts = this.ts;
    const x0 = this.xDe(s.x);
    const w = s.largura * ts;
    const y = this.yChao(piso(this.planta, s.piso));
    const fim = (this.linha(s.ate) + 1) * ts;
    if (camera && !this.visivel(camera, x0 - ts * 3, y, w + ts * 6, fim - y)) return;
    ctx.fillStyle = '#07080b';
    ctx.fillRect(x0, y, w, fim - y);
    ctx.fillRect(x0 - ts * 3, fim - ts * 4, w + ts * 6, ts * 4);
    // Escoramento do poco.
    ctx.fillStyle = COR.madeiraEscura;
    for (let yy = y + ts; yy < fim; yy += ts * 2) ctx.fillRect(x0, yy, w, 5);
  }

  /** A tampa do alcapao, fechada ou encostada de lado. */
  private desenharAlcapao(ctx: CanvasRenderingContext2D, camera: Camera | undefined): void {
    const s = this.planta.saida;
    if (!s) return;
    const ts = this.ts;
    const x0 = this.xDe(s.x);
    const w = s.largura * ts;
    const y = this.yChao(piso(this.planta, s.piso));
    if (camera && !this.visivel(camera, x0 - ts, y - ts * 2, w + ts * 2, ts * 3)) return;
    if (this.flag(s.flag)) {
      ctx.fillStyle = '#07080b';
      ctx.fillRect(x0, y, w, 16);
      ctx.fillStyle = COR.madeira;
      ctx.fillRect(x0 - 10, y - ts * 1.4, 8, ts * 1.4);
      ctx.fillStyle = COR.madeiraBrilho;
      ctx.fillRect(x0 - 10, y - ts * 1.4, P, ts * 1.4);
      return;
    }
    ctx.fillStyle = COR.madeiraEscura;
    ctx.fillRect(x0, y, w, 14);
    for (let x = x0 + 2; x < x0 + w - 2; x += 12) {
      ctx.fillStyle = COR.madeiraMeia;
      ctx.fillRect(x, y + 1, 10, 10);
    }
    ctx.fillStyle = COR.ferroClaro;
    ctx.fillRect(x0 + 4, y + 4, w - 8, 3);
    ctx.fillRect(x0 + w / 2 - 4, y - 3, 8, 7);
  }

  private desenharElevador(ctx: CanvasRenderingContext2D, camera: Camera | undefined): void {
    const e = this.planta.elevador;
    if (!e) return;
    const ts = this.ts;
    const paradas = e.paradas.map((id) => piso(this.planta, id));
    const topo = this.yChao(paradas[paradas.length - 1]) - ts * 4;
    const base = this.yChao(paradas[0]);
    const cx = this.xDe(e.x) + ts / 2;
    const larg = ts * 3.4;
    if (camera && !this.visivel(camera, cx - larg, topo - ts, larg * 2, base - topo + ts)) return;
    // Torre de vigas: dois montantes e travessas em X.
    ctx.fillStyle = COR.madeiraEscura;
    ctx.fillRect(cx - larg / 2, topo, 8, base - topo);
    ctx.fillRect(cx + larg / 2 - 8, topo, 8, base - topo);
    ctx.strokeStyle = 'rgba(58,36,20,0.9)';
    ctx.lineWidth = 3;
    for (let y = topo; y < base; y += ts * 2.5) {
      ctx.beginPath();
      ctx.moveTo(cx - larg / 2 + 4, y);
      ctx.lineTo(cx + larg / 2 - 4, y + ts * 2.5);
      ctx.moveTo(cx + larg / 2 - 4, y);
      ctx.lineTo(cx - larg / 2 + 4, y + ts * 2.5);
      ctx.stroke();
    }
    // Polia no alto.
    ctx.fillStyle = COR.ferro;
    ctx.beginPath();
    ctx.arc(cx, topo, 12, 0, Math.PI * 2);
    ctx.fill();
    // A cabine: parada no fundo enquanto o sarilho nao for religado.
    const funciona = this.flag(e.flag);
    const baseRow = this.linha(paradas[0].pe);
    const travado = !!e.travadoSe && this.flag(e.travadoSe.flag) && !this.flag(e.travadoSe.ate);
    if (!funciona || this.elevadorRow === null) this.elevadorRow = this.elevadorAlvo = baseRow;
    if (travado) {
      // Presa no meio do poco, entre dois andares: e o pedido do Breno.
      const meio = Math.round((this.linha(paradas[1].pe) + this.linha(paradas[2].pe)) / 2);
      this.elevadorRow = this.elevadorAlvo = meio;
    }
    const yCab = (this.elevadorRow + 1) * ts;
    ctx.fillStyle = '#b8b0a0';
    ctx.fillRect(cx - 1, topo, P, yCab - topo - ts * 4.9);
    const cab = Assets.blockia('cabine');
    const medida = this.mapa.cabine;
    if (cab && medida) {
      ctx.drawImage(cab, cx - (medida.w * ts) / 2, yCab - medida.h * ts, medida.w * ts, medida.h * ts);
    } else {
      ctx.fillStyle = COR.madeira;
      ctx.fillRect(cx - ts * 1.4, yCab - ts * 2.6, ts * 2.8, ts * 2.6);
    }
    if (!funciona || travado) {
      // Parado: a luz vermelha que o Breno ja cansou de ver. Pisca se tem
      // gente presa la dentro.
      const pisca = travado ? Math.sin(this.t * 6) > 0 : true;
      if (pisca) {
        ctx.fillStyle = 'rgba(220,60,40,0.9)';
        ctx.fillRect(cx - 10, yCab - ts * 3.4, 20, 8);
      }
    }
    if (travado) {
      // Duas cabecas na janela da cabine.
      ctx.fillStyle = '#e8c39a';
      for (const d of [-10, 8]) ctx.fillRect(cx + d, yCab - ts * 2.2, 8, 8);
    }
  }
}
