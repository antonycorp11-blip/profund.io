import type { Camera } from '../core/camera';
import { Assets } from '../core/Assets';
import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import { Haptics } from '../fx/Haptics';
import { weaponDef, type WeaponDef, type WeaponId } from '../data/weapons';
import type { Attributes } from './Attributes';
import type { Player } from '../player/Player';
import type { World } from '../world/World';

export type WeaponShotStyle = 'normal' | 'burst' | 'pierce' | 'ricochet' | 'combo';

interface Bala {
  ativo: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Quanto ainda falta andar, em pixels. */
  alcance: number;
  dano: number;
  /** Quantas criaturas ainda pode atravessar. */
  furos: number;
  gravidade: number;
  /** Quantas vezes ainda quica na pedra antes de morrer nela. */
  quiques: number;
  raio: number;
  cor: string;
  /** Assinatura visual da skill consumida neste disparo. */
  estilo: WeaponShotStyle;
  /** Rastro: onde ela estava no quadro anterior, para desenhar a risca. */
  px: number;
  py: number;
}

const MAX_BALAS = 96;

/**
 * Um efeito de UM quadro so, que vive por alguns decimos de segundo.
 *
 * O fogo de boca e o impacto nao sao animacoes longas: sao dois quadros que
 * aparecem e somem. Guardar cada um como objeto de animacao completo seria
 * maquinario demais para algo que dura 0,12 s.
 */
interface Estampido {
  ativo: boolean;
  x: number;
  y: number;
  ang: number;
  /** Segundos restantes. */
  vida: number;
  total: number;
  /** Prefixo da arte: `fogo`, `poeira` ou `sangue` (o sufixo e 1 ou 2). */
  tipo: 'fogo' | 'poeira' | 'sangue';
  tamanho: number;
}

const MAX_FX = 40;

/**
 * O TIRO.
 *
 * A bala e um objeto que VIAJA, e nao um teste de alcance como era o golpe da
 * picareta. Isso custa mais do que parece — pool, colisao por passo, rastro —
 * mas e a diferenca inteira: com alcance instantaneo a rocha nao significa
 * nada, e com bala viajando a rocha vira COBERTURA. O projetil morre na
 * pedra, entao cavar um nicho e se enfiar nele passa a ser uma jogada, e o
 * bicho que vem pelo tunel tem que entrar na sua linha.
 *
 * A bala NAO quebra bloco. Ja existe uma ferramenta para isso, e uma arma que
 * tambem escava faria a picareta virar enfeite.
 */
export class WeaponSystem {
  private pool: Bala[] = [];
  private fx: Estampido[] = [];
  /** Tempo ate poder atirar de novo. */
  private recarga = 0;
  /** Arma na mao. Uma so por enquanto; o slot vem depois. */
  equipada: WeaponId = 'pistola';
  /** Quanto o cano ja cuspiu neste segundo, para o brilho do cano. */
  flash = 0;

  constructor(
    private world: World,
    private player: Player,
    private attrs: Attributes,
    /** Quem leva o dano: devolve quantas criaturas a bala acertou aqui. */
    private acertar: (x: number, y: number, raio: number, dano: number) => number,
    /** Quanta municao ha, e como gastar. */
    private municao: { tem(): number; gastar(n: number): boolean },
    /**
     * As habilidades de ARMA.
     *
     * O sistema de tiro nao conhece habilidade nenhuma: ele PERGUNTA, antes de
     * cada disparo, quantas balas saem, quantos bichos elas atravessam e
     * quantas vezes quicam. Quem responde e o cinto. Assim uma habilidade nova
     * nao mexe numa linha daqui.
     */
    private efeitos: () => {
      balas: number;
      furos: number;
      quiques: number;
      estilo?: WeaponShotStyle;
    }
  ) {
    for (let i = 0; i < MAX_FX; i++) {
      this.fx.push({ ativo: false, x: 0, y: 0, ang: 0, vida: 0, total: 1, tipo: 'fogo', tamanho: 16 });
    }
    for (let i = 0; i < MAX_BALAS; i++) {
      this.pool.push({
        ativo: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        alcance: 0,
        dano: 0,
        furos: 0,
        gravidade: 0,
        quiques: 0,
        raio: 3,
        cor: '#fff',
        estilo: 'normal',
        px: 0,
        py: 0,
      });
    }
  }

  /** Acende um efeito de quadro unico no mundo. */
  private acender(tipo: Estampido['tipo'], x: number, y: number, ang: number, tamanho: number, vida: number): void {
    const e = this.fx.find((f) => !f.ativo);
    if (!e) return;
    e.ativo = true;
    e.x = x;
    e.y = y;
    e.ang = ang;
    e.vida = vida;
    e.total = vida;
    e.tipo = tipo;
    e.tamanho = tamanho;
  }

  get def(): WeaponDef {
    return weaponDef(this.equipada);
  }

  /**
   * Puxa o gatilho.
   *
   * Segurar dispara em cadencia; o primeiro tiro sai na hora, porque esperar
   * um intervalo depois de apertar faz a arma parecer quebrada.
   */
  /**
   * De onde a bala sai, quando ha arma desenhada na mao.
   *
   * Ligado pelo Game ao `PlayerSprite`: quem sabe onde esta a boca do cano e
   * quem desenha o cano. Sem isso o tiro saia de um ponto fixo no meio do
   * corpo — da barriga — enquanto a arma estava na mao, mais alta e a frente.
   */
  boca: (() => { x: number; y: number } | null) | null = null;

  update(dt: number, segurandoGatilho: boolean, mirarX: number, mirarY: number): void {
    this.recarga = Math.max(0, this.recarga - dt);
    this.flash = Math.max(0, this.flash - dt * 6);
    for (const e of this.fx) {
      if (!e.ativo) continue;
      e.vida -= dt;
      if (e.vida <= 0) e.ativo = false;
    }
    if (segurandoGatilho && this.recarga <= 0) this.atirar(mirarX, mirarY);
    this.moverBalas(dt);
  }

  private atirar(mirarX: number, mirarY: number): void {
    const d = this.def;
    if (!this.municao.gastar(d.ammoPerShot)) {
      Events.emit('ui:toast', { text: 'Sem municao. Fabrique na base.', tone: 'warn' });
      // Trava curta para o aviso nao repetir sessenta vezes por segundo.
      this.recarga = 0.8;
      return;
    }
    this.recarga = 1 / d.fireRate;
    this.flash = 1;
    const ef = this.efeitos();

    // A boca de verdade quando ha arma desenhada; o ponto do peito so como
    // reserva, para o caso de a arte ainda nao ter carregado.
    const naMao = this.boca?.() ?? null;
    const bocaX = naMao ? naMao.x : this.player.cx + mirarX * 12;
    const bocaY = naMao ? naMao.y : this.player.cy - 2 + mirarY * 12;

    for (let i = 0; i < d.pellets * ef.balas; i++) {
      const b = this.pool.find((x) => !x.ativo);
      if (!b) break;
      // O espalhamento e sorteado por PROJETIL: numa escopeta os chumbos
      // abrem, e numa pistola ele e o tremor da mao.
      const ang = Math.atan2(mirarY, mirarX) + (Math.random() - 0.5) * (d.spreadDeg * Math.PI) / 180;
      b.ativo = true;
      b.x = bocaX;
      b.y = bocaY;
      b.px = bocaX;
      b.py = bocaY;
      b.vx = Math.cos(ang) * d.speed;
      b.vy = Math.sin(ang) * d.speed;
      b.alcance = d.range;
      b.dano = d.damage * this.attrs.get('weaponDamage');
      b.furos = d.pierce + ef.furos;
      b.gravidade = d.gravity;
      b.quiques = ef.quiques;
      b.raio = d.bulletSize;
      b.cor = d.color;
      b.estilo = ef.estilo ?? 'normal';
    }

    // Recuo: empurra o jogador para TRAS da mira. E o que da peso ao tiro, e
    // no ar vira mobilidade — atirar para baixo te levanta um pouco.
    this.player.vx -= mirarX * d.recoil;
    this.player.vy -= mirarY * d.recoil * 0.5;

    this.acender('fogo', bocaX, bocaY, Math.atan2(mirarY, mirarX), 22, 0.1);
    Haptics.hit();
    Events.emit('weapon:fired', { id: d.id, x: bocaX, y: bocaY });
  }

  /**
   * Anda com as balas.
   *
   * O passo e SUBDIVIDIDO: a 620 px/s uma bala anda dez pixels por quadro, e
   * testando so a posicao final ela atravessaria uma parede de um tile sem
   * encostar nela. Divido o passo em pedacos menores que meio tile.
   */
  private moverBalas(dt: number): void {
    const ts = this.world.tileSize;
    for (const b of this.pool) {
      if (!b.ativo) continue;
      b.px = b.x;
      b.py = b.y;
      b.vy += b.gravidade * dt;

      const dist = Math.hypot(b.vx, b.vy) * dt;
      const passos = Math.max(1, Math.ceil(dist / (ts * 0.4)));
      for (let s = 0; s < passos; s++) {
        b.x += (b.vx * dt) / passos;
        b.y += (b.vy * dt) / passos;
        b.alcance -= dist / passos;

        if (this.world.isSolidAtPixel(b.x, b.y)) {
          // Bate na pedra. NAO escava: a picareta e que escava.
          this.acender('poeira', b.x, b.y, Math.random() * Math.PI * 2, 18, 0.16);
          if (b.quiques > 0 && this.quicar(b)) {
            b.quiques--;
            break;
          }
          b.ativo = false;
          break;
        }
        if (this.acertar(b.x, b.y, b.raio + 6, b.dano) > 0) {
          this.acender('sangue', b.x, b.y, Math.atan2(b.vy, b.vx), 18, 0.16);
          if (b.furos <= 0) {
            b.ativo = false;
            break;
          }
          b.furos--;
        }
        if (b.alcance <= 0) {
          b.ativo = false;
          break;
        }
      }
    }
  }

  /**
   * Quica a bala na parede que ela acabou de encostar.
   *
   * Descobre de que LADO foi a batida testando o tile um passo atras em cada
   * eixo: se o caminho horizontal estava livre e o vertical nao, a parede era
   * o chao ou o teto, e quem inverte e o `vy`. Sem essa distincao a bala
   * voltaria pelo caminho de onde veio em toda batida, o que parece defeito e
   * nao ricochete.
   */
  private quicar(b: Bala): boolean {
    const bateuNaHorizontal = this.world.isSolidAtPixel(b.x, b.y - b.vy * 0.016);
    const bateuNaVertical = this.world.isSolidAtPixel(b.x - b.vx * 0.016, b.y);
    if (bateuNaHorizontal) b.vx = -b.vx;
    if (bateuNaVertical) b.vy = -b.vy;
    if (!bateuNaHorizontal && !bateuNaVertical) {
      // Quina exata: inverte os dois e deixa a bala voltar por onde veio.
      b.vx = -b.vx;
      b.vy = -b.vy;
    }
    // Afasta um passo da parede, senao ela quica preso dentro do mesmo tile.
    b.x += Math.sign(b.vx) * 2;
    b.y += Math.sign(b.vy) * 2;
    return !this.world.isSolidAtPixel(b.x, b.y);
  }

  /**
   * Desenha em coordenadas de MUNDO.
   *
   * Nesta altura do quadro a tela ja esta transformada pela camera — e assim
   * que a criatura e o jogador desenham, com `ctx.translate(this.x, ...)`.
   * Eu tinha convertido para coordenadas de tela antes de desenhar, e a
   * conversao era aplicada DUAS vezes: a bala saia pintada a centenas de
   * pixels do mapa, acertava o alvo e nunca aparecia. E o mesmo erro que ja me
   * pegou no eco de voz.
   */
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    ctx.save();
    ctx.lineCap = 'round';

    const rastro = Assets.shotFx('rastro');
    const bala = Assets.shotFx('bala');

    for (const b of this.pool) {
      if (!b.ativo) continue;
      if (!camera.sees(b.x, b.y)) continue;
      const ang = Math.atan2(b.vy, b.vx);

      if (bala) {
        // Arte: o rastro atras e a bala na ponta, os dois girados pela
        // direcao real do voo.
        if (rastro) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(ang);
          ctx.globalAlpha = 0.75;
          const lr = b.raio * 9;
          ctx.drawImage(rastro, -lr, -b.raio * 2, lr, b.raio * 4);
          ctx.restore();
        }
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        ctx.globalAlpha = 1;
        const lb = b.raio * 4;
        ctx.drawImage(bala, -lb / 2, -lb / 2, lb, lb);
        ctx.restore();
        this.desenharAssinatura(ctx, b, ang);
        continue;
      }

      // Sem arte carregada, o desenho vetorial de sempre. A risca conta a
      // DIRECAO: um ponto sozinho a essa velocidade e um piscar sem leitura.
      ctx.strokeStyle = b.cor;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = b.raio * 1.1;
      ctx.beginPath();
      ctx.moveTo(b.px, b.py);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.raio, 0, Math.PI * 2);
      ctx.fill();
      this.desenharAssinatura(ctx, b, ang);
    }

    // Estampidos e impactos, por cima das balas.
    for (const e of this.fx) {
      if (!e.ativo) continue;
      if (!camera.sees(e.x, e.y)) continue;
      const t = 1 - e.vida / e.total;
      // Dois quadros: a primeira metade da vida mostra o 1, a segunda o 2.
      const arte = Assets.shotFx(`${e.tipo}_${t < 0.5 ? 1 : 2}`);
      if (!arte) continue;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.ang);
      // Cresce um pouco e some: e o que faz um quadro parado parecer um estouro.
      const s2 = e.tamanho * (0.8 + t * 0.5);
      ctx.globalAlpha = 1 - t * t;
      ctx.drawImage(arte, -s2 / 2, -s2 / 2, s2, s2);
      ctx.restore();
    }

    ctx.restore();
    void CONFIG;
  }

  /**
   * Linguagem visual imediata das skills. O sprite base continua sendo usado
   * quando existe, mas cada tiro ganha uma assinatura legivel sem depender de
   * um PNG novo: rajada abre duas linhas, perfurante cria um nucleo cyan e
   * ricochete carimba um losango violeta. Isso tambem funciona offline e em
   * trajes ou armas futuras.
   */
  private desenharAssinatura(ctx: CanvasRenderingContext2D, b: Bala, ang: number): void {
    if (b.estilo === 'normal') return;
    const cores: Record<WeaponShotStyle, string> = {
      normal: '#fff',
      burst: '#ff9d45',
      pierce: '#6fe7ff',
      ricochet: '#c998ff',
      combo: '#ffe38a',
    };
    const cor = cores[b.estilo];
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(ang);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = cor;
    ctx.fillStyle = cor;
    ctx.lineWidth = Math.max(1.2, b.raio * 0.65);
    if (b.estilo === 'burst' || b.estilo === 'combo') {
      for (const y of [-b.raio * 2.1, b.raio * 2.1]) {
        ctx.beginPath();
        ctx.moveTo(-b.raio * 3.8, y);
        ctx.lineTo(-b.raio * 0.7, y * 0.55);
        ctx.stroke();
      }
    }
    if (b.estilo === 'pierce' || b.estilo === 'combo') {
      ctx.beginPath();
      ctx.arc(0, 0, b.raio * 2.1, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (b.estilo === 'ricochet' || b.estilo === 'combo') {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-b.raio * 1.45, -b.raio * 1.45, b.raio * 2.9, b.raio * 2.9);
    }
    ctx.restore();
  }

  /** Quantas balas estao no ar — o teste headless le isto. */
  get vivas(): number {
    return this.pool.reduce((n, b) => n + (b.ativo ? 1 : 0), 0);
  }

  limpar(): void {
    for (const b of this.pool) b.ativo = false;
  }
}
