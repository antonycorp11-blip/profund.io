import type { Camera } from '../core/camera';
import { CONFIG } from '../data/config';
import { Events } from '../core/events';
import { Haptics } from '../fx/Haptics';
import { weaponDef, type WeaponDef, type WeaponId } from '../data/weapons';
import type { Attributes } from './Attributes';
import type { Particles } from '../fx/Particles';
import type { Player } from '../player/Player';
import type { World } from '../world/World';

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
  /** Rastro: onde ela estava no quadro anterior, para desenhar a risca. */
  px: number;
  py: number;
}

const MAX_BALAS = 96;

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
  /** Tempo ate poder atirar de novo. */
  private recarga = 0;
  /** Arma na mao. Uma so por enquanto; o slot vem depois. */
  equipada: WeaponId = 'pistola';
  /** Quanto o cano ja cuspiu neste segundo, para o brilho do cano. */
  flash = 0;

  constructor(
    private world: World,
    private player: Player,
    private particles: Particles,
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
    private efeitos: () => { balas: number; furos: number; quiques: number }
  ) {
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
        px: 0,
        py: 0,
      });
    }
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
  update(dt: number, segurandoGatilho: boolean, mirarX: number, mirarY: number): void {
    this.recarga = Math.max(0, this.recarga - dt);
    this.flash = Math.max(0, this.flash - dt * 6);
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

    // A boca do cano fica na altura do peito, adiantada na direcao da mira.
    const bocaX = this.player.cx + mirarX * 12;
    const bocaY = this.player.cy - 2 + mirarY * 12;

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
    }

    // Recuo: empurra o jogador para TRAS da mira. E o que da peso ao tiro, e
    // no ar vira mobilidade — atirar para baixo te levanta um pouco.
    this.player.vx -= mirarX * d.recoil;
    this.player.vy -= mirarY * d.recoil * 0.5;

    this.particles.burst(bocaX, bocaY, 5, [d.color, '#fff2c0'], {
      speed: 130,
      spread: 0.7,
      dirX: mirarX,
      dirY: mirarY,
      life: 0.18,
    });
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
          this.particles.burst(b.x, b.y, 4, ['#d8c9a8', '#9c8a6a'], { speed: 70, life: 0.22 });
          if (b.quiques > 0 && this.quicar(b)) {
            b.quiques--;
            break;
          }
          b.ativo = false;
          break;
        }
        if (this.acertar(b.x, b.y, b.raio + 6, b.dano) > 0) {
          this.particles.burst(b.x, b.y, 6, [b.cor, '#ff9a6a'], { speed: 110, life: 0.2 });
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

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    ctx.save();
    ctx.lineCap = 'round';
    for (const b of this.pool) {
      if (!b.ativo) continue;
      if (!camera.sees(b.x, b.y)) continue;
      const a = camera.worldToScreen(b.x, b.y);
      const p = camera.worldToScreen(b.px, b.py);
      // A risca do rastro conta a DIRECAO. Um ponto sozinho a essa velocidade
      // vira um piscar sem sentido de leitura.
      ctx.strokeStyle = b.cor;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = b.raio * 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(a.x, a.y);
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.fillStyle = b.cor;
      ctx.beginPath();
      ctx.arc(a.x, a.y, b.raio, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    void CONFIG;
  }

  /** Quantas balas estao no ar — o teste headless le isto. */
  get vivas(): number {
    return this.pool.reduce((n, b) => n + (b.ativo ? 1 : 0), 0);
  }

  limpar(): void {
    for (const b of this.pool) b.ativo = false;
  }
}
