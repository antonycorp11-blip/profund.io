import { ART } from '../data/art';
import { WEAPON_GRIPS } from '../data/weaponGrips';
import { encaixe } from '../data/characterRig';
import { TOOL_GRIPS } from '../data/toolGrips';
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
  /**
   * O gatilho esta sendo puxado AGORA?
   *
   * Separado de `aiming` porque sao coisas diferentes: `aiming` quer dizer que
   * a arma esta na mao, e isso vale o tempo todo enquanto ele nao troca para a
   * picareta. Atirar e o instante. Era a confusao entre os dois que deixava o
   * braco esticado para sempre.
   */
  atirando = false;
  /** Arquivo da arma na mao (`art/weapons/<id>.png`), ou nulo sem arma. */
  weaponArt: string | null = null;

  /*
   * O QUE ELE ESTA VESTINDO.
   *
   * Vem de fora, do Equipment, porque o desenho nao decide isso. Nulo = nao
   * desenha, e nao "desenha o padrao": o heroi sem capacete e um estado
   * legitimo, e era o unico estado possivel antes de a arte vir sem capacete
   * pintado no corpo.
   */
  capaceteArt: string | null = null;
  mochilaArt: string | null = null;
  /** Picareta na mao — so aparece quando a arma NAO esta sacada. */
  picaretaArt: string | null = null;

  /**
   * Tamanho de cada peca, em fracao da altura desenhada do heroi.
   *
   * Um numero por tipo, e nao por peca: todo capacete cobre a mesma cabeca,
   * toda mochila cobre as mesmas costas. Se uma peca precisar de tamanho
   * proprio um dia, isso vira campo do item — mas comecar assim seria inventar
   * seis numeros para um problema que ainda nao existe.
   */
  private static readonly TAMANHO = { capacete: 0.2, mochila: 0.28, picareta: 0.3 };

  /**
   * Onde, DENTRO do sprite da peca, fica o ponto que encosta no corpo.
   *
   * O capacete assenta pelo alto: a ancora da cabeca e o topo do cabelo, entao
   * o ponto do capacete que cai ali e um pouco abaixo do topo dele — ele
   * afunda um dedo no craneo em vez de flutuar sobre ele.
   *
   * A mochila encosta pela lateral: a ancora das costas e a borda de tras do
   * tronco, e o que toca ali e a face direita da mochila, no meio da altura.
   */
  private static readonly TOQUE = {
    capacete: { x: 0.5, y: 0.15 },
    /*
     * A mochila ENTRA no tronco, nao encosta nele.
     *
     * Encostar pela borda (x: 1) deixava uma folga visivel em todo quadro, e a
     * folga nao e erro de ancora: a arte da mochila esta de FRENTE, mostrando
     * alcas e bolsos, e nao de perfil. Uma caixa frontal presa pela lateral
     * nunca vai encostar direito.
     *
     * Enfiar um quarto dela atras do corpo esconde a junta ate a arte de
     * perfil existir. E remendo, e esta anotado como remendo.
     */
    mochila: { x: 0.72, y: 0.4 },
  };

  /**
   * Qual tira e qual quadro de ARMA foram desenhados agora.
   *
   * Guardava so o quadro, porque a arma so existia numa tira. Com `arma_anda`
   * e `arma_baixa` passaram a ser tres, e o punho de cada uma foi medido na
   * sua propria — perguntar pelo punho da tira errada poe a arma no lugar
   * errado sem erro nenhum aparecer.
   */
  private tiraDaArma = 'aim';
  private quadroDeMira = 0;

  /** As tiras em que ele esta de arma na mao. */
  private static readonly TIRAS_DE_ARMA = ['aim', 'arma_anda', 'arma_baixa'];

  /*
   * TRANSICOES.
   *
   * O corpo trocava de pose num quadro so: parado virava andando sem nada no
   * meio, e inverter a direcao era um espelhamento instantaneo — o personagem
   * aparecia virado do outro lado sem ter virado. E o que mais denuncia
   * desenho plano, e a correcao nao e mais arte de caminhada: e o PEDACO ENTRE
   * duas poses, que nao existia.
   *
   * Elas so mudam o DESENHO. A fisica continua respondendo ao controle no
   * mesmo quadro — travar o movimento para tocar uma animacao seria trocar
   * fluidez por atraso, que e o negocio errado.
   */
  private transicao: 'arranca' | 'freia' | 'gira' | null = null;
  private transicaoT = 0;
  /** Para onde ele esta virando. So vale durante o giro. */
  private giroPara = 1;
  private andavaAntes = false;
  private ladoAntes = 1;

  /** Acima disto ele conta como andando. Abaixo, como parado. */
  private static readonly LIMIAR_ANDAR = 12;

  /**
   * Quantos pixels ele percorre num ciclo completo de passada.
   *
   * O quadro sai da DISTANCIA andada, e nao de um cronometro: parou o pe,
   * parou o desenho, e a perna bate com o chao em qualquer velocidade.
   *
   * O passo por quadro se deduz disto dividido pela contagem de quadros da
   * tira — e nao pode ser um numero fixo. Era 13 px por quadro, calibrado para
   * oito quadros; a caminhada detalhada chegou com VINTE E QUATRO e o mesmo 13
   * faria o ciclo durar 312 px em vez de 104, ou seja, perna em camera lenta a
   * um terco da velocidade. Amarrando a distancia ao CICLO, qualquer contagem
   * de quadros anda na mesma cadencia.
   */
  private static readonly PASSADA = 104;

  /**
   * Limiar de passo COM A ARMA NA MAO — mais alto, e de proposito.
   *
   * O tiro empurra o heroi para tras a 40 px/s (ver `recoil` em weapons.ts).
   * Com o limiar normal de 12 esse empurrao contava como passo, e o corpo
   * piscava para a pose de caminhada por um quadro a cada tiro, parado no
   * lugar. Andar de verdade e 150, entao 60 separa os dois sem ambiguidade.
   *
   * Nao da para usar a intencao do jogador aqui: o desenho nao ve o controle,
   * so a velocidade. Entao o numero tem que ficar entre o coice e o passo.
   */
  private static readonly LIMIAR_PASSO_ARMADO = 60;

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
   * Quanto a arma sobe dentro da mao, em fracao da altura do heroi.
   *
   * O punho medido e o CENTRO do blob da mao, e o cabo de uma arma fica um
   * pouco acima disso — os dedos fecham por baixo dela, nao em volta do meio.
   * Um retoque pequeno e o unico numero desta tela ajustado no olho, e ele
   * vale para todas as armas de uma vez.
   */
  static readonly ARMA_SOBE = 0.035;

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
    this.atualizarTransicao(dt, player);
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

  /**
   * Decide se comeca, continua ou larga uma transicao.
   *
   * Chamada antes de tudo em `update`, porque a escolha do quadro depende
   * dela. A ordem das checagens e a ordem da importancia: GIRAR ganha de
   * parar, e parar ganha de arrancar, porque quem inverte a direcao no meio de
   * uma corrida esta fazendo as tres coisas ao mesmo tempo e so o giro se ve.
   */
  private atualizarTransicao(dt: number, player: Player): void {
    const anda = Math.abs(player.vx) > PlayerSprite.LIMIAR_ANDAR;
    const lado = player.facing < 0 ? -1 : 1;

    if (this.transicao) {
      this.transicaoT += dt;
      const def = ART.character.strips[this.transicao];
      const acabou = !def || this.transicaoT >= def.frames / def.fps;
      /*
       * Sair do chao CORTA a transicao na hora.
       *
       * Uma arrancada pela metade enquanto ele ja esta no ar seria o corpo
       * fazendo uma coisa e a fisica outra. No chao a transicao acompanha; no
       * ar ela mente.
       */
      if (acabou || !player.onGround || player.climbingWall !== 0) this.transicao = null;
    }

    /*
     * O GIRO EM CURSO NAO E INTERROMPIDO.
     *
     * Invertendo a direcao o `vx` cruza o zero, e no quadro em que ele passa
     * por perto o heroi conta como PARADO — entao o `freia` disparava por cima
     * do giro que ja tinha comecado, e a volta sumia no meio. Quem inverte
     * correndo esta girando, parando e arrancando ao mesmo tempo; so o giro se
     * ve, e e ele que tem que terminar.
     */
    const girando = this.transicao === 'gira';

    if (player.onGround && player.climbingWall === 0 && !girando) {
      if (lado !== this.ladoAntes && anda) {
        this.transicao = 'gira';
        this.transicaoT = 0;
        this.giroPara = lado;
      } else if (!anda && this.andavaAntes) {
        this.transicao = 'freia';
        this.transicaoT = 0;
      } else if (anda && !this.andavaAntes && this.transicao !== 'gira') {
        this.transicao = 'arranca';
        this.transicaoT = 0;
      }
    }

    this.andavaAntes = anda;
    this.ladoAntes = lado;
  }

  /** Em que ponto do ciclo de passada ele esta, para uma tira de `n` quadros. */
  private quadroDoPasso(n: number): number {
    return Math.floor(this.walkDist / (PlayerSprite.PASSADA / n)) % n;
  }

  /** O quadro da transicao em curso, ou null quando nao ha nenhuma. */
  private quadroDaTransicao(): { name: string; index: number } | null {
    if (!this.transicao) return null;
    const def = ART.character.strips[this.transicao];
    if (!def || !Assets.characterStrips.has(this.transicao)) return null;
    const i = Math.min(def.frames - 1, Math.floor(this.transicaoT * def.fps));
    return { name: this.transicao, index: i };
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

    /*
     * A TRANSICAO TEM PRIORIDADE sobre tudo que acontece no chao.
     *
     * Fica depois de nada e antes de tudo porque ela ja foi filtrada em
     * `atualizarTransicao`: se ele saiu do chao ou grudou na parede, ela foi
     * cancelada la, e aqui nem existe mais.
     */
    /*
     * Com a arma na mao as transicoes nao entram.
     *
     * Elas foram desenhadas de maos vazias. Tocar uma arrancada no meio de um
     * tiroteio faria a arma PISCAR para fora da mao por um quarto de segundo,
     * que e pior do que nao ter transicao.
     */
    const t = this.aiming ? null : this.quadroDaTransicao();
    if (t) return t;

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
    if (this.aiming && player.onGround) {
      const andando = Math.abs(player.vx) > PlayerSprite.LIMIAR_PASSO_ARMADO;
      /* O passo vem da distancia andada, e nao de um cronometro: parou o pe,
       * parou o quadro. E o que faz a perna bater com o chao. */
      const ciclo = (n: string): number => this.quadroDoPasso(strips[n].frames);

      /*
       * ANDANDO, O CICLO DA PERNA GANHA DO RECUO.
       *
       * O recuo vinha antes de tudo, e andando atirando o resultado era o
       * mesmo defeito de sempre: a pistola dispara 4,5 vezes por segundo e o
       * recuo leva mais que isso para cair, entao o corpo ficava preso no par
       * de quadros do coice e as pernas paravam outra vez.
       *
       * Parado, o coice e o que se ve — nao ha perna competindo. Andando, e a
       * perna. Cada um ganha onde e visto.
       */
      const paraOndeMira = (): { name: string; index: number } | null => {
        if (this.aimY < -0.45 && has('aim')) return pick('aim', 2);
        if (this.aimY > 0.45 && has('aim')) return pick('aim', 4);
        return null;
      };

      if (andando && has('arma_anda') && (this.atirando || this.recoil > 0.02)) {
        return paraOndeMira() ?? pick('arma_anda', ciclo('arma_anda'));
      }

      // Parado: o coice tem os dois quadros so para ele.
      if (this.recoil > 0.02 && has('aim')) {
        return pick('aim', 6 + (this.recoil > 0.5 ? 0 : 1));
      }

      if (this.atirando) {
        return paraOndeMira() ?? (has('aim') ? pick('aim', 0) : pick('arma_baixa', 0));
      }

      /* Sem gatilho, a arma fica BAIXADA — andando ou parado. */
      if (has('arma_baixa')) return pick('arma_baixa', andando ? ciclo('arma_baixa') : 0);
      if (has('aim')) return pick('aim', 0);
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

    if (Math.abs(player.vx) > 12) {
      /*
       * ANDAR e o padrao. Correr e a excecao.
       *
       * Estava invertido, e o efeito foi que a caminhada detalhada de 24
       * quadros nunca aparecia: com a mochila vazia o jogo tocava `run`, de
       * oito quadros, e a arte boa ficava guardada esperando o heroi encher a
       * mochila.
       *
       * A regra certa e a que o jogador consegue ler: ele anda. `run` fica
       * reservado para quando existir uma velocidade de corrida de verdade —
       * hoje o jogo tem uma so, e escolher pela velocidade nao distinguiria
       * nada.
       */
      const tira = has('walk') ? 'walk' : 'run';
      if (has(tira)) return pick(tira, this.quadroDoPasso(strips[tira].frames));
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
    /*
     * O GIRO ESPELHA AO CONTRARIO DE TODO O RESTO.
     *
     * Nas outras tiras o espelho so escolhe o lado para onde ele olha. No giro
     * o SENTIDO da volta esta desenhado: a arte sai do perfil direito, passa
     * de frente e chega no perfil esquerdo.
     *
     * Entao virando para a esquerda ela vai como esta, e virando para a
     * direita e que precisa espelhar — o oposto da regra geral. Espelhar pela
     * regra normal faria ele girar para o lado errado e chegar olhando para
     * onde veio.
     */
    const flipped = strip?.name === 'gira' ? this.giroPara === 1 : player.facing !== artFacing;

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
    /*
     * A ORDEM DAS CAMADAS E O QUE FAZ AS PECAS PARECEREM VESTIDAS.
     *
     * Atras do corpo vai o que o corpo tem que TAPAR: a mochila, que so
     * aparece pela borda das costas, e o que esta na mao, cujo cabo fica
     * escondido pelo punho fechado — e esse encaixe que faz a mao parecer
     * segurar de verdade, em vez de ter um objeto colado na frente dela.
     *
     * Na frente vai so o capacete, porque ele cobre a cabeca e nao o
     * contrario.
     */
    if (strip) this.desenharCostas(ctx, h, strip.name, strip.index);
    /*
     * A ARMA SO APARECE NO TIRO — mesma regra da picareta, mesmo motivo.
     *
     * `aiming` diz que a arma esta na cinta; `atirando` e o instante do
     * gatilho. So o segundo poe a arma na mao. O recuo entra junto porque ele e
     * a continuacao visivel do tiro: sumir com a arma no meio do coice seria
     * pior do que nao mostra-la.
     *
     * Com isso `arma_baixa` passa a ser o que o nome diz — ele anda de mao
     * livre, pronto, e a arma so sai quando ele puxa.
     */
    const sacada = this.atirando || this.recoil > 0.02;
    if (this.aiming && sacada && strip && PlayerSprite.TIRAS_DE_ARMA.includes(strip.name)) {
      this.tiraDaArma = strip.name;
      this.quadroDeMira = strip.index;
      this.desenharArma(ctx, h, flipped);
    }
    ctx.drawImage(sheet, sx, sy, frameW, frameH, -w / 2, 0, w, h);
    /*
     * A FERRAMENTA VAI NA FRENTE — ao contrario da arma.
     *
     * Por tras, o topo do cabo sumia atras do quadril e voce nunca via ele
     * entrar na mao: lia como uma picareta boiando ao lado da perna, nao como
     * uma picareta segurada.
     *
     * Com a arma o calculo e outro e por isso ela continua atras: o cano sai
     * para FORA da silhueta em toda pose de mira, entao o que some atras do
     * corpo e so o cabo, e o punho fechado cobrindo o cabo e justamente o que
     * vende o aperto. Uma ferramenta carregada junto ao corpo nao tem essa
     * sobra — se ela for para tras, some.
     */
    if (strip) this.desenharFerramenta(ctx, h, strip.name, strip.index);
    if (strip) this.desenharCabeca(ctx, h, strip.name, strip.index);
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
    const punho = encaixe(this.tiraDaArma, this.quadroDeMira, 'punho');
    if (!punho) return null;
    const cabo = WEAPON_GRIPS[id] ?? { x: 0.2, y: 0.5 };
    const lado = player.facing < 0 ? -1 : 1;

    // O punho no mundo: em X espelha com o lado, em Y sai da linha dos pes.
    const punhoX = player.cx + lado * punho.x * h;
    const punhoY = player.feetY + (punho.y - PlayerSprite.ARMA_SOBE) * h;

    const alturaArma = h * PlayerSprite.ARMA_ALTURA;
    const larguraArma = arte.width * (alturaArma / arte.height);
    const ateAPonta = larguraArma * (1 - cabo.x);

    const d = PlayerSprite.direcaoDaPose(lado, this.aimY);
    return { x: punhoX + d.x * ateAPonta, y: punhoY + d.y * ateAPonta };
  }

  /**
   * Uma peca presa a um ponto do corpo.
   *
   * O ponto vem medido da propria arte (ver tools/medir-encaixes.mjs) e esta
   * em fracao da altura desenhada, com o zero na linha dos pes — entao basta
   * multiplicar. Tudo acontece DENTRO da transformacao do corpo, e por isso a
   * peca herda de graca o espelhamento, o squash do pouso e o balanco da
   * escalada: ela nunca descola.
   */
  private prender(
    ctx: CanvasRenderingContext2D,
    arte: CanvasImageSource & { width: number; height: number },
    ponto: { x: number; y: number },
    alturaDoCorpo: number,
    fracaoDaAltura: number,
    toque: { x: number; y: number },
    giro = 0
  ): void {
    const alt = alturaDoCorpo * fracaoDaAltura;
    const larg = arte.width * (alt / arte.height);
    const linhaDosPes = alturaDoCorpo * ART.character.feetAnchor;
    ctx.save();
    ctx.translate(ponto.x * alturaDoCorpo, linhaDosPes + ponto.y * alturaDoCorpo);
    if (giro) ctx.rotate(giro);
    ctx.drawImage(arte, -larg * toque.x, -alt * toque.y, larg, alt);
    ctx.restore();
  }

  /** A mochila, encostada na borda de tras do tronco. */
  private desenharCostas(ctx: CanvasRenderingContext2D, h: number, tira: string, quadro: number): void {
    const arte = this.mochilaArt ? Assets.vestir(this.mochilaArt) : null;
    const ponto = encaixe(tira, quadro, 'costas');
    if (!arte || !arte.width || !ponto) return;
    this.prender(ctx, arte, ponto, h, PlayerSprite.TAMANHO.mochila, PlayerSprite.TOQUE.mochila);
  }

  /** O capacete, assentado no alto da cabeca. */
  private desenharCabeca(ctx: CanvasRenderingContext2D, h: number, tira: string, quadro: number): void {
    const arte = this.capaceteArt ? Assets.vestir(this.capaceteArt) : null;
    const ponto = encaixe(tira, quadro, 'cabeca');
    if (!arte || !arte.width || !ponto) return;
    this.prender(ctx, arte, ponto, h, PlayerSprite.TAMANHO.capacete, PlayerSprite.TOQUE.capacete);
  }

  /**
   * A picareta, no punho e girada pelo BRACO.
   *
   * O giro nao e escolha do jogador como na arma — a picareta segue o gesto
   * que a animacao ja desenhou. Sem ele a ferramenta ficaria deitada no meio
   * de um golpe com o braco esticado acima da cabeca.
   */
  private desenharFerramenta(ctx: CanvasRenderingContext2D, h: number, tira: string, quadro: number): void {
    /*
     * A PICARETA SO APARECE NO GOLPE.
     *
     * O argumento que decide isto nao e de gosto, e da propria arte: as nove
     * tiras foram desenhadas com as MAOS VAZIAS. Se a ferramenta fosse para
     * ficar na mao o tempo todo, ela teria sido desenhada junto ao corpo, e nao
     * separada — e aI o punho fechado em volta do nada nao faria sentido em
     * lugar nenhum.
     *
     * Maos vazias e a postura padrao. A ferramenta aparece quando e usada.
     */
    if (tira !== 'mine') return;
    const id = this.picaretaArt;
    const arte = id ? Assets.tool(id) : null;
    const ponto = encaixe(tira, quadro, 'punho');
    if (!id || !arte || !arte.width || !ponto) return;
    const cabo = TOOL_GRIPS[id] ?? { x: 0.22, y: 0.5 };
    this.prender(ctx, arte, ponto, h, PlayerSprite.TAMANHO.picareta, cabo, this.giroDaFerramenta(tira, ponto));
  }

  /**
   * Para onde a picareta aponta, nesta tira.
   *
   * SO O GOLPE usa o angulo medido do braco. La o gesto e o conteudo da
   * animacao — o braco sobe e desce, e a ferramenta tem que subir e descer com
   * ele —, entao a medida e a resposta certa mesmo sendo grosseira.
   *
   * Nas outras tiras a medida e ruido. O braco esta parado ao lado do corpo e
   * o angulo ombro-punho varia alguns graus por quadro por causa da respiracao
   * e do passo; usar isso fazia a picareta tremer na mao de um homem parado.
   * Parado, andando ou pulando, ele CARREGA a ferramenta — e carregar tem um
   * angulo so.
   */
  private giroDaFerramenta(tira: string, ponto: { angulo?: number }): number {
    if (tira === 'mine') return ponto.angulo ?? 0;
    /*
     * Carregada com a LAMINA PARA CIMA, e nao para baixo.
     *
     * Com a lamina para baixo o punho fica na altura do quadril e a ponta
     * acaba na altura do tornozelo — le como ferramenta sendo arrastada pelo
     * chao, nao carregada. Virada, a cabeca da picareta sobe para a altura do
     * peito e a silhueta ganha a linha diagonal que diz "isto e uma picareta"
     * mesmo a 46 px de tela.
     */
    return -Math.PI * 0.22;
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

    const p = encaixe(this.tiraDaArma, this.quadroDeMira, 'punho');
    if (!p) return;

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
    ctx.translate(
      p.x * alturaDoCorpo,
      linhaDosPes + (p.y - PlayerSprite.ARMA_SOBE) * alturaDoCorpo
    );
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
