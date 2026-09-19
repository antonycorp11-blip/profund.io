import type { DialogLine } from './story';

/**
 * CUTSCENES — cenas contadas com a arte do jogo, e nao com video.
 *
 * O dono perguntou como o jogador veria isso "de verdade", e a resposta que
 * decidiu o formato: nao e video. Video seria pixel pre-cozido — vinte megas
 * por cena num PWA que hoje abre na hora, impossivel de traduzir sem
 * reexportar, impossivel de pular direito, e com um Elias que nao e o Elias
 * do jogo. Aqui as camadas sao os PNGs que o jogo ja carregou, movidos por
 * codigo. E um quadrinho que se mexe.
 *
 * O QUE UMA CENA E: uma fila de BEATS. Cada beat poe camadas na tela, move
 * elas devagar durante a sua duracao, e vai soltando as falas no ritmo do
 * jogador — um toque por fala. Quando as falas do beat acabam, entra o
 * proximo.
 *
 * A REGRA DE ESCRITA, herdada da BIBLIA: esta historia e sobre um homem
 * AUSENTE, contada pelas coisas que ele deixou. Por isso as cenas sao de
 * objetos e lugares, e nao de cabecas falando. Nao existe retrato de Helena
 * nem de Santiago no jogo, e isso e uma escolha, nao uma falta: a Helena e
 * uma voz na sala, e e mais forte assim.
 */

/** Enquadramento de uma camada: onde ela esta e de que tamanho. */
export interface Enquadre {
  /**
   * Altura da camada como fracao da altura da tela.
   *
   * Fracao e nao pixel porque a cena roda em 852x393 no celular e em qualquer
   * coisa no navegador. Pixel fixo faria a mesma cena enquadrar diferente nos
   * dois, e cena e enquadramento.
   */
  escala: number;
  /** Centro da camada, em fracao da tela (0.5, 0.5 = meio). */
  x: number;
  y: number;
  /** Opacidade, 0 a 1. */
  alfa?: number;
}

export interface CutsceneCamada {
  /** Caminho dentro de `public/art/`. */
  arte: string;
  de: Enquadre;
  /** Para onde ela caminha durante o beat. Ausente = fica parada. */
  para?: Enquadre;
  /**
   * A arte e uma TIRA de animacao: mostra so um quadro dela.
   *
   * `character/idle.png` sao oito quadros de 128 lado a lado. Sem isto, a
   * silhueta do Elias entraria na cena como uma fileira de oito Elias.
   */
  quadro?: { lado: number; indice: number };
  /**
   * Fica NA FRENTE do veu.
   *
   * O veu escurece e tinge a cena — e o que faz a noite parecer noite. Mas ele
   * cobria tudo, inclusive o que a cena existe para mostrar: no beat da caixa,
   * a picareta e o revolver ficaram dois vultos marrons sobre um fundo marrom,
   * e a fala "...e um revolver" acontecia sobre uma tela onde nao se via
   * revolver nenhum.
   *
   * Objeto que a fala NOMEIA tem de estar aceso. O veu escurece o lugar; o que
   * esta em primeiro plano passa por cima dele.
   */
  frente?: boolean;
}

export interface CutsceneBeat {
  /** Segundos que as camadas levam para ir de `de` ate `para`. */
  duracao: number;
  /** Cor do veu por cima das camadas (escurece, tinge). */
  veu?: string;
  camadas: CutsceneCamada[];
  falas: DialogLine[];
}

export interface CutsceneDef {
  id: string;
  beats: CutsceneBeat[];
}

/* Atalhos de leitura: a maioria dos enquadramentos e "cobre a tela". */
const COBRE = (x = 0.5, y = 0.5, escala = 1.15): Enquadre => ({ escala, x, y });

/**
 * O PROLOGO (BIBLIA.md, ATO 0 — "O Homem Que Desceu Demais").
 *
 * As falas sao as mesmas de `/data/prologue.ts`, palavra por palavra: elas ja
 * estavam escritas e boas. O que muda e que agora elas tem ONDE acontecer.
 *
 * Cinco beats, e cada corte acontece onde o assunto vira:
 *   1. a mina fechada, de noite      — o que aconteceu
 *   2. o caderno                     — o que ele deixou
 *   3. a caixa                       — o que ninguem esperava
 *   4. o acordo                      — o preco de entrar
 *   5. a promessa                    — o que a mae pede
 */
export const CUTSCENE_PROLOGO: CutsceneDef = {
  id: 'prologo',
  beats: [
    {
      /*
       * A mina, de longe e de noite. A camera AFASTA devagar: comecar colado
       * na entrada e ir abrindo faz o lugar crescer em volta do jogador, que e
       * o oposto de um zoom para dentro (que diria "olhe aqui"). Aqui a cena
       * diz "isto e maior do que voce".
       */
      duracao: 14,
      veu: 'rgba(6,10,20,0.45)',
      camadas: [
        { arte: 'bg/sky_night.png', de: COBRE(0.5, 0.45, 1.6), para: COBRE(0.5, 0.5, 1.3) },
        {
          arte: 'props/mine_entrance.png',
          frente: true,
          de: { escala: 0.95, x: 0.5, y: 0.72 },
          para: { escala: 0.7, x: 0.5, y: 0.68 },
        },
        {
          arte: 'props/lamp.png',
          frente: true,
          de: { escala: 0.42, x: 0.33, y: 0.66 },
          para: { escala: 0.32, x: 0.36, y: 0.64 },
        },
      ],
      falas: [
        { speaker: 'Santiago (gravacao)', text: '"Se esta ouvindo isso, provavelmente eu fiz exatamente o que todo mundo disse para eu nao fazer."' },
        { speaker: 'Elias', text: 'Meu pai dizia que uma mina conta a verdade para quem tem paciencia de escutar.' },
        { speaker: 'Elias', text: 'Eu tinha oito anos quando ele entrou na Mina do Vale e nao voltou.' },
        { speaker: 'Elias', text: 'Disseram que houve um desabamento. Disseram que procuraram.' },
        { speaker: 'Elias', text: 'Depois disseram que continuar procurando so faria mais gente desaparecer.' },
      ],
    },
    {
      /*
       * O caderno. A capa entra grande e a pagina sobe por cima dela: e o
       * gesto de abrir, feito com duas camadas em vez de uma animacao.
       */
      duracao: 12,
      veu: 'rgba(12,8,4,0.3)',
      camadas: [
        { arte: 'bg/cave_dirt.png', de: COBRE(0.5, 0.5, 1.4) },
        {
          arte: 'journal/capa.png',
          frente: true,
          de: { escala: 0.9, x: 0.5, y: 0.55 },
          para: { escala: 0.95, x: 0.36, y: 0.56, alfa: 0.85 },
        },
        {
          arte: 'journal/pagina_1.png',
          frente: true,
          de: { escala: 0.7, x: 0.72, y: 0.62, alfa: 0 },
          para: { escala: 1.0, x: 0.6, y: 0.5, alfa: 1 },
        },
      ],
      falas: [
        { speaker: 'Helena', text: 'Eu achei que tivesse jogado isso fora.' },
        { speaker: 'Elias', text: 'O caderno era dele?' },
        { speaker: 'Helena', text: 'Era. E eu devia ter queimado.' },
        { speaker: 'Elias', text: 'Tem mapas aqui. Profundidades. Uma marca a vinte e seis metros.' },
        { speaker: 'Helena', text: 'Tem obsessoes.' },
      ],
    },
    {
      /*
       * A CAIXA, e o beat mais importante da cena.
       *
       * A picareta entra primeiro, de um lado — ela e esperada. O revolver
       * entra depois, do outro, e QUASE NAO SE MEXE: enquanto tudo na cena
       * anda, a coisa que nao devia estar ali fica parada. E o jeito de fazer
       * um objeto de 51 por 32 pixels pesar mais que o resto da tela.
       */
      /* 18s, e nao 13: este beat tem oito falas, o dobro dos outros. A sonda
       * mediu — com 13 a imagem parava no meio da conversa e a cena congelava
       * justo no momento do revolver, que e o que ela existe para entregar. */
      duracao: 18,
      veu: 'rgba(8,6,10,0.34)',
      camadas: [
        /*
         * A MESA, e nao a textura de caverna.
         *
         * `cave_dirt` e parede de mina: como fundo da cozinha da Helena ela
         * fazia a caixa do Santiago parecer enterrada num barranco. `bg/tela/
         * mesa.png` e a bancada que o jogo ja usa nas telas — e uma superficie
         * de madeira com coisas em cima, que e exatamente onde uma caixa velha
         * e aberta.
         */
        { arte: 'bg/tela/mesa.png', de: COBRE(0.5, 0.5, 1.25), para: COBRE(0.53, 0.5, 1.3) },
        {
          arte: 'tools/pick_old.png',
          frente: true,
          de: { escala: 0.5, x: 0.28, y: 0.52, alfa: 0 },
          para: { escala: 0.46, x: 0.31, y: 0.5, alfa: 1 },
        },
        {
          /*
           * O revolver QUASE NAO SE MEXE, e e o unico assim na cena inteira.
           * Enquanto o fundo caminha e a picareta se ajeita, a coisa que nao
           * devia estar naquela caixa fica parada. E o jeito de fazer um PNG
           * de 51 por 32 pesar mais que o resto da tela.
           */
          arte: 'weapons/pistola.png',
          frente: true,
          /*
           * 0,34 e nao 0,44: `pistola.png` tem 51 por 32 pixels, porque foi
           * desenhada para a mao do personagem e para o HUD. A 0,44 ela chega
           * a sete vezes o tamanho original e cada pixel vira um quadrado do
           * tamanho de uma letra. A 0,34 ainda domina a cena e o desenho ainda
           * se le como revolver.
           *
           * Este e o unico ponto do prologo onde arte nova pagaria de verdade:
           * uma ilustracao da caixa aberta, com a picareta e o revolver em
           * resolucao de cena. E o quadro mais importante da abertura.
           */
          de: { escala: 0.3, x: 0.68, y: 0.48, alfa: 0 },
          para: { escala: 0.34, x: 0.68, y: 0.48, alfa: 1 },
        },
      ],
      falas: [
        { speaker: 'Helena', text: 'Tem mais coisa na caixa. Eu nunca mexi.' },
        { speaker: 'Elias', text: 'A picareta reserva dele.' },
        { speaker: 'Helena', text: 'Essa eu esperava.' },
        { speaker: 'Elias', text: '...e um revolver.' },
        { speaker: 'Helena', text: 'Esse nao.' },
        { speaker: 'Elias', text: 'Para que um mineiro leva arma para dentro de uma mina?' },
        { speaker: 'Helena', text: 'Foi o que eu perguntei. Ele mudou de assunto.' },
        { speaker: 'Helena', text: 'Duas vezes.' },
      ],
    },
    {
      /* O acordo: de volta a mina, agora no fim da tarde. O galpao aparece —
       * ha alguem do outro lado dessa conversa, e ele tem um escritorio. */
      duracao: 11,
      veu: 'rgba(10,8,14,0.34)',
      camadas: [
        { arte: 'bg/sky_dusk.png', de: COBRE(0.45, 0.5, 1.35), para: COBRE(0.55, 0.5, 1.3) },
        {
          arte: 'props/shed.png',
          de: { escala: 0.42, x: 0.26, y: 0.7 },
          para: { escala: 0.44, x: 0.24, y: 0.7 },
        },
        {
          arte: 'props/mine_entrance.png',
          de: { escala: 0.66, x: 0.72, y: 0.68 },
          para: { escala: 0.7, x: 0.7, y: 0.68 },
        },
      ],
      falas: [
        { speaker: 'Elias', text: 'A mina esta fechada ha quatorze anos. Eu falei com o dono.' },
        { speaker: 'Helena', text: 'E ele abriu assim, de graca?' },
        { speaker: 'Elias', text: 'Cota toda semana. Enquanto eu entregar, a mina fica aberta.' },
        { speaker: 'Helena', text: 'E quando voce nao entregar?' },
        { speaker: 'Elias', text: 'Ai ele fecha. E eu nao volto mais la dentro.' },
      ],
    },
    {
      /*
       * A promessa. O Elias entra pequeno e ANDA em direcao a entrada enquanto
       * a mae fala — as ultimas falas dela acontecem nas costas dele, que e
       * como despedida funciona. Quando a cena acaba, ele ja esta la.
       */
      duracao: 12,
      veu: 'rgba(10,8,14,0.3)',
      camadas: [
        { arte: 'bg/sky_dusk.png', de: COBRE(0.55, 0.5, 1.3), para: COBRE(0.62, 0.52, 1.25) },
        {
          arte: 'props/mine_entrance.png',
          de: { escala: 0.7, x: 0.68, y: 0.68 },
          para: { escala: 0.86, x: 0.62, y: 0.66 },
        },
        {
          arte: 'character/idle.png',
          frente: true,
          quadro: { lado: 128, indice: 0 },
          de: { escala: 0.16, x: 0.3, y: 0.76 },
          para: { escala: 0.2, x: 0.52, y: 0.74 },
        },
      ],
      falas: [
        { speaker: 'Helena', text: 'Se voce for, me promete uma coisa.' },
        { speaker: 'Elias', text: 'Eu volto.' },
        { speaker: 'Helena', text: 'Nao. Nao promete o que seu pai prometeu.' },
        { speaker: 'Helena', text: 'So nao desapareca em silencio.' },
      ],
    },
  ],
};

export const CUTSCENES: CutsceneDef[] = [CUTSCENE_PROLOGO];

export function cutsceneDef(id: string): CutsceneDef | undefined {
  return CUTSCENES.find((c) => c.id === id);
}
