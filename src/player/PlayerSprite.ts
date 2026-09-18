import { ART } from '../data/art';
import { WEAPON_GRIPS } from '../data/weaponGrips';
import { Assets } from '../core/Assets';
import type { Player } from './Player';

type AnimName = keyof typeof ART.character.anims;

/**
 * Desenha o heroi a partir da folha de animacao.
 * Se a arte nao estiver carregada, `render` devolve false e o Player cai no placeholder vetorial.
 */
export class PlayerSprite {
  private anim: AnimName = 'idle';
  private animTime = 0;
  private walkDist = 0;
  private climbDist = 0;

  /** Estado externo que influencia a pose. */
  heavy = false;
  /**
   * A arma esta sacada? Quem responde e o Game, junto com a mira.
   *
   * Vem de fora porque a pose nao e decisao do desenho: o mesmo corpo anda,
   * pula e cai igual — o que muda e o braco, e o braco segue a mao atual.
   */
  aiming = false;
  aimX = 1;
  aimY = 0;
  /** Sobe para 1 a cada tiro e desce sozinho: e o que escolhe o par do recuo. */
  recoil = 0;
  /** Arquivo da arma na mao (`art/weapons/<id>.png`), ou nulo sem arma. */
  weaponArt: string | null = null;

  /**
   * Onde fica o PUNHO em CADA QUADRO, em fracao do quadro de 128 px.
   *
   * Um valor por quadro, e nao um por direcao — e essa era a falha. Andando de
   * arma em punho o corpo usa os quadros 8-9, que tem o braco na FRENTE; se a
   * mira estivesse para cima, eu escolhia a ancora de cima e a arma saltava
   * para fora da mao. A ancora tem que seguir o desenho que esta na tela, e
   * nao a intencao do jogador.
   *
   * Medidos isolando o BLOB DA MAO: um preenchimento a partir da ponta do
   * braco, limitado a nove pixels de raio. Antes eu tirava o centro das ultimas
   * nove COLUNAS, e isso puxava o antebraco junto — o ponto caia atras da mao.
   * O flood pega so o punho fechado, que e onde o cabo tem que estar.
   */
  private static readonly PUNHO: { x: number; y: number }[] = [
    { x: 0.21, y: -0.398 }, // 0-1 frente
    { x: 0.209, y: -0.401 },
    { x: 0.233, y: -0.512 }, // 2-3 cima
    { x: 0.225, y: -0.512 },
    { x: 0.192, y: -0.276 }, // 4-5 baixo
    { x: 0.19, y: -0.272 },
    { x: 0.153, y: -0.408 }, // 6-7 coice
    { x: 0.218, y: -0.403 },
    { x: 0.209, y: -0.401 }, // 8-9 andando
    { x: 0.211, y: -0.402 },
  ];

  /** Qual quadro da tira de mira foi desenhado agora. */
  private quadroDeMira = 0;

  /**
   * As TRES direcoes que o braco sabe apontar, em radianos.
   *
   * A folha tem tres poses e nada entre elas. A arma girava em angulo
   * continuo, entao mirando a 20 graus o braco ficava reto e a arma torta —
   * ela se mexia em angulo que a mao nao se mexe. Quem manda e o desenho: o
   * tiro passa a sair numa destas tres, e a arma acompanha o braco.
   */
  static readonly ANGULOS = [0, -Math.PI / 4, Math.PI / 4] as const;

  /**
   * Altura da arma, em fracao da altura desenhada do heroi.
   *
   * Escolhido comparando 0,22, 0,15 e 0,11 lado a lado com a arte de verdade.
   * Com 0,22 o revolver tinha metade do comprimento do corpo e o cabo sobrava
   * para fora do punho; com 0,11 ele some no meio da rocha. Uma constante so
   * porque o DESENHO e a BOCA DO CANO precisam sair do mesmo numero — se
   * divergirem, a bala deixa de nascer na ponta.
   */
  static readonly ARMA_ALTURA = 0.15;

  /**
   * Para onde a arma REALMENTE aponta, dada a mira do jogador.
   *
   * Devolve o vetor ja preso a uma das tres poses. O Game usa isto tanto para
   * girar o desenho quanto para lancar a bala — as duas coisas TEM que sair do
   * mesmo numero, senao a bala nao sai do cano.
   */
  static direcaoDaPose(aimX: number, aimY: number): { x: number; y: number } {
    const lado = aimX < 0 ? -1 : 1;
    const ang = aimY < -0.45 ? -Math.PI / 4 : aimY > 0.45 ? Math.PI / 4 : 0;
    return { x: Math.cos(ang) * lado, y: Math.sin(ang) };
  }

  update(dt: number, player: Player): void {
    const next = this.pickAnim(player);
    if (next !== this.anim) {
      this.anim = next;
      this.animTime = 0;
    }
    this.animTime += dt;
    this.recoil = Math.max(0, this.recoil - dt * 6);
    this.walkDist += Math.abs(player.vx) * dt;
    if (player.climbingWall !== 0 && player.vy < 0) this.climbDist += Math.abs(player.vy) * dt;
  }

  private pickAnim(player: Player): AnimName {
    // Escalar vem antes de tudo: e o unico estado em que o corpo esta na
    // vertical contra a parede, e a pose de pulo ali fica errada.
    if (player.climbingWall !== 0) {
      if (player.mantling) return 'mantle';
      if (player.climbTired) return 'climb_slide';
      return player.vy < -8 ? 'climb' : 'climb_hold';
    }
    if (player.swing > 0.02) {
      if (player.swingDirY > 0.45) return 'mine_down';
      if (player.swingDirY < -0.45) return 'mine_up';
      return 'mine_side';
    }
    if (!player.onGround) return player.vy < -20 ? 'jump' : 'fall';
    if (player.landSquash > 0.35) return 'land';
    if (Math.abs(player.vx) > 12) return 'walk';
    return this.heavy ? 'carry' : 'idle';
  }

  private frameIndex(player: Player): number {
    const def = ART.character.anims[this.anim];
    const n = def.frames.length;
    if (n === 1) return def.frames[0];

    // Golpe: o quadro segue o ritmo real da picareta, nao um timer proprio.
    if (this.anim.startsWith('mine')) {
      return def.frames[player.swing >= 0.6 ? 1 : 0];
    }
    // Caminhada: avanca por distancia percorrida, senao o boneco "patina".
    if (this.anim === 'walk') {
      return def.frames[Math.floor(this.walkDist / 20) % n];
    }
    const i = Math.floor(this.animTime * def.fps);
    return def.frames[def.loop ? i % n : Math.min(i, n - 1)];
  }

  /**
   * Movimento da escalada, feito em codigo.
   *
   * A folha tem um unico corpo na vertical; o que transforma a pose em
   * escalada e o ritmo: alcancar (estica e sobe), puxar (encolhe e desce um
   * pouco), sempre inclinado contra a parede. O ciclo anda com a altura ganha,
   * entao subir devagar e subir rapido tem a mesma leitura.
   */
  private climbTransform(
    ctx: CanvasRenderingContext2D,
    player: Player,
    h: number,
    hasStripArt: boolean,
    flipped: boolean
  ): void {
    // +1 = lado da parede no espaco local (que esta espelhado quando flipped).
    const dir = player.climbingWall * (flipped ? -1 : 1);

    // Com a tira dedicada o ciclo ja esta desenhado: basta encostar na parede.
    if (hasStripArt) {
      ctx.translate(dir * 3, 0);
      if (player.climbTired) ctx.translate(Math.sin(this.animTime * 34) * 1.2, 0);
      return;
    }

    if (player.climbTired) {
      // Escorregando: treme um pouco, sem ciclo.
      ctx.translate(dir * 2 + Math.sin(this.animTime * 34) * 1.2, 0);
      ctx.rotate(dir * 0.05);
      return;
    }

    // Parado agarrado respira devagar; subindo, o ciclo vem da altura.
    const moving = player.vy < -8;
    const phase = moving ? this.climbDist * 0.085 : this.animTime * 2.2;
    const pull = Math.sin(phase);
    const reach = Math.max(0, pull); // so a metade de cima do ciclo estica

    // Encosta na parede (e o passo mais importante: senao ele flutua no vao).
    ctx.translate(dir * (3.5 + reach * 1.5), moving ? -pull * 2.4 : -pull * 1.2);
    // Inclina o tronco contra a rocha.
    ctx.rotate(dir * (0.06 + pull * 0.05));
    // Estica ao alcancar, encolhe ao puxar o corpo.
    const stretch = 1 + pull * (moving ? 0.05 : 0.018);
    ctx.translate(0, h * (1 - stretch));
    ctx.scale(1 - pull * 0.02, stretch);
  }

  /**
   * Traduz o estado em (tira, quadro).
   *
   * As tiras novas tem a animacao inteira desenhada, entao o quadro vem do
   * estado fisico — velocidade, progresso do golpe, altura ganha — e nao de um
   * timer solto. E o que faz a arte "obedecer" ao controle.
   */
  private stripFrame(player: Player): { name: string; index: number } | null {
    const strips = ART.character.strips;
    const has = (n: string): boolean => Assets.characterStrips.has(n);
    const last = (n: string): number => strips[n].frames - 1;
    const pick = (n: string, i: number): { name: string; index: number } => ({
      name: n,
      index: Math.max(0, Math.min(last(n), Math.round(i))),
    });

    if (player.climbingWall !== 0 && has('climb')) {
      const n = strips.climb.frames;
      if (player.mantling) return pick('climb', last('climb'));
      if (player.climbTired) return pick('climb', 0);
      if (player.vy < -8) {
        return pick('climb', Math.floor(this.climbDist / 11) % n);
      }
      return pick('climb', 0);
    }

    /*
     * MIRA: o quadro vem da DIRECAO, nao de um cronometro.
     *
     * A pose e uma leitura do que o jogador esta fazendo agora — apontando
     * para cima, para a frente ou para baixo — e um timer a faria trocar
     * sozinha, contando uma coisa que nao aconteceu. Fica depois da escalada e
     * do pulo de proposito: no ar, o corpo precisa dizer que esta no ar.
     */
    if (this.aiming && player.onGround && has('aim')) {
      if (this.recoil > 0.02) return pick('aim', 6 + (this.recoil > 0.5 ? 0 : 1));
      if (Math.abs(player.vx) > 12) return pick('aim', 8 + (Math.floor(this.walkDist / 13) % 2));
      if (this.aimY < -0.45) return pick('aim', 2);
      if (this.aimY > 0.45) return pick('aim', 4);
      return pick('aim', 0);
    }

    if (player.swing > 0.02 && has('mine')) {
      // swing vai de 1 (impacto comecando) a 0: o quadro segue esse arco.
      return pick('mine', (1 - player.swing) * last('mine'));
    }

    if (!player.onGround && has('jump')) {
      const n = strips.jump.frames; // 0 agachar, ~n/2 apice, fim queda/pouso
      const apex = Math.floor(n * 0.55);
      if (player.vy < -240) return pick('jump', 1);
      if (player.vy < -90) return pick('jump', 2);
      if (player.vy < -20) return pick('jump', 3);
      if (player.vy < 90) return pick('jump', apex);
      return pick('jump', apex + 1);
    }

    if (player.landSquash > 0.3 && has('jump')) {
      return pick('jump', last('jump') - 1);
    }

    if (Math.abs(player.vx) > 12 && has('walk')) {
      const n = strips.walk.frames;
      return pick('walk', Math.floor(this.walkDist / 13) % n);
    }

    if (has('idle')) {
      const n = strips.idle.frames;
      return pick('idle', Math.floor(this.animTime * strips.idle.fps) % n);
    }
    return null;
  }

  /** Retorna false quando ainda nao ha arte: o chamador desenha o placeholder. */
  render(ctx: CanvasRenderingContext2D, player: Player): boolean {
    const art = ART.character;
    const strip = this.stripFrame(player);

    // Formato novo (uma tira por animacao) tem prioridade; sem ele, a folha 4x4.
    let sheet: CanvasImageSource | null = strip ? Assets.characterStrip(strip.name) : null;
    let frameW = art.stripFrame;
    let frameH = art.stripFrame;
    let sx: number;
    let sy = 0;

    let drawH = art.drawHeight;
    let usingStrip = false;
    if (sheet && strip) {
      sx = strip.index * frameW;
      drawH = art.stripDrawHeight;
      usingStrip = true;
    } else {
      sheet = Assets.character();
      if (!sheet) return false;
      const index = this.frameIndex(player);
      frameW = art.frameW;
      frameH = art.frameH;
      sx = (index % art.cols) * frameW;
      sy = Math.floor(index / art.cols) * frameH;
    }

    const scale = drawH / frameH;
    const w = frameW * scale;
    const h = drawH;
    const feetY = player.feetY;
    const top = feetY - h * art.feetAnchor;

    // Sombra no chao (o motor desenha, a arte nao traz).
    if (player.onGround) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(player.cx, feetY + 1, player.w * 0.55, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Espelha so quando o lado desejado difere do lado que a arte ja olha.
    const artFacing = usingStrip && strip ? art.strips[strip.name].facing : 1;
    const flipped = player.facing !== artFacing;

    ctx.save();
    ctx.translate(Math.round(player.cx), Math.round(top));
    if (flipped) ctx.scale(-1, 1);
    if (player.climbingWall !== 0) {
      this.climbTransform(ctx, player, h, strip?.name === 'climb', flipped);
    }
    // Squash ao aterrissar continua vindo do codigo: a arte nao precisa de quadro para isso.
    if (player.landSquash > 0) {
      const sq = 1 - player.landSquash * 0.16;
      ctx.translate(0, h * (1 - sq));
      ctx.scale(1 + player.landSquash * 0.12, sq);
    }
    /*
     * A ARMA VAI POR TRAS DO CORPO.
     *
     * Desenhada por cima, ela ficava COLADA na frente da mao — dava para ver
     * o cabo inteiro passando por cima dos dedos, e nada segurava nada. Por
     * tras, o punho fechado do desenho cobre o cabo, e e esse encaixe que faz
     * a mao parecer estar segurando de verdade.
     *
     * O cano continua a vista porque ele sai para FORA da silhueta: o braco
     * esta esticado longe do tronco em todas as poses de mira.
     */
    if (this.aiming && strip?.name === 'aim') {
      this.quadroDeMira = strip.index;
      this.desenharArma(ctx, h, flipped);
    }
    ctx.drawImage(sheet, sx, sy, frameW, frameH, -w / 2, 0, w, h);
    ctx.restore();
    return true;
  }

  /**
   * Onde esta a BOCA DO CANO, em coordenadas de mundo.
   *
   * A bala saia de um ponto fixo a 12 px do centro do corpo — quer dizer, da
   * barriga — enquanto a arma estava na mao, mais alta e mais a frente. Agora
   * o ponto e calculado do mesmo jeito que o desenho: punho do quadro atual,
   * mais o comprimento da arma daquele cabo ate a ponta, girado pelo angulo
   * da pose.
   *
   * Devolve null sem arma na mao — ai o Game usa o ponto antigo.
   */
  bocaDoCano(player: Player): { x: number; y: number } | null {
    const id = this.weaponArt;
    const arte = id ? Assets.weapon(id) : null;
    if (!this.aiming || !id || !arte || !arte.width) return null;

    const h = ART.character.stripDrawHeight;
    const punho = PlayerSprite.PUNHO[this.quadroDeMira] ?? PlayerSprite.PUNHO[0];
    const cabo = WEAPON_GRIPS[id] ?? { x: 0.2, y: 0.5 };
    const lado = player.facing < 0 ? -1 : 1;

    // O punho no mundo: em X espelha com o lado, em Y sai da linha dos pes.
    const punhoX = player.cx + lado * punho.x * h;
    const punhoY = player.feetY + punho.y * h;

    const alturaArma = h * PlayerSprite.ARMA_ALTURA;
    const larguraArma = arte.width * (alturaArma / arte.height);
    const ateAPonta = larguraArma * (1 - cabo.x);

    const d = PlayerSprite.direcaoDaPose(lado, this.aimY);
    return { x: punhoX + d.x * ateAPonta, y: punhoY + d.y * ateAPonta };
  }

  /**
   * A arma, presa no punho e girada pela mira.
   *
   * Desenhada DEPOIS do corpo e dentro da mesma transformacao dele: assim ela
   * herda o espelhamento e o squash do pouso de graca, e nunca descola da mao.
   *
   * O giro e pelo angulo REAL da mira, e nao pela direcao do quadro. Sao
   * coisas diferentes: o corpo tem tres poses, a mira tem infinitas. Girar a
   * arma junto e o que faz um tiro a 30 graus parecer um tiro a 30 graus e nao
   * um tiro na horizontal com o braco torto.
   */
  private desenharArma(ctx: CanvasRenderingContext2D, alturaDoCorpo: number, flipped: boolean): void {
    const id = this.weaponArt;
    const arte = id ? Assets.weapon(id) : null;
    if (!id || !arte || !arte.width) return;

    const p = PlayerSprite.PUNHO[this.quadroDeMira] ?? PlayerSprite.PUNHO[0];

    // As fracoes do punho foram medidas na folha com o heroi olhando para a
    // DIREITA. Espelhado, o `ctx.scale(-1,1)` ja inverte o desenho — mas o
    // angulo da mira continua em coordenadas do mundo, entao ele precisa ser
    // refletido a mao, senao a arma aponta para tras do personagem.
    // O MESMO angulo que a pose do braco tem — nao o angulo cru da mira. Era
    // isso que fazia a arma se mexer em angulos que a mao nao se mexe.
    const d = PlayerSprite.direcaoDaPose(flipped ? -this.aimX : this.aimX, this.aimY);
    const ang = Math.atan2(d.y, d.x);

    const alturaArma = alturaDoCorpo * PlayerSprite.ARMA_ALTURA;
    const escala = alturaArma / arte.height;
    const larguraArma = arte.width * escala;
    // Onde a mao fecha NESTA arma, medido no proprio sprite pelo cortador.
    const cabo = WEAPON_GRIPS[id] ?? { x: 0.2, y: 0.5 };

    /*
     * As fracoes do punho ja sao do QUADRO, e o quadro e desenhado com altura
     * `alturaDoCorpo` — entao basta multiplicar por ela. Eu tinha multiplicado
     * tambem por 128/66 (o tamanho da celula sobre o tamanho desenhado), e a
     * pistola saia flutuando acima da cabeca, ao dobro da distancia.
     *
     * O y parte da LINHA DOS PES, que e onde as medidas foram tiradas.
     */
    const linhaDosPes = alturaDoCorpo * ART.character.feetAnchor;
    ctx.save();
    ctx.translate(p.x * alturaDoCorpo, linhaDosPes + p.y * alturaDoCorpo);
    ctx.rotate(ang);
    /*
     * O CABO cai exatamente na origem — que e o punho — e o resto da arma se
     * organiza em volta dele. Por isso o giro acontece NA MAO: o revolver
     * pivota no cabo curto, o fuzil pivota atras, perto da coronha, e cada um
     * assenta como assentaria de verdade.
     *
     * Antes era um recuo fixo de 34% para todas, e com isso o fuzil ficava
     * enfiado no peito enquanto o revolver sobrava para fora da mao.
     */
    ctx.drawImage(arte, -larguraArma * cabo.x, -alturaArma * cabo.y, larguraArma, alturaArma);
    ctx.restore();
  }
}
