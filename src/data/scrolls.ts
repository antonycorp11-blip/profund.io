/**
 * Pergaminhos: as anotacoes longas de Santiago e John.
 *
 * Nao sao as pistas da campanha (essas sao poucas e obrigatorias). Sao o
 * conteudo OPCIONAL que enche a mina — o motivo para cavar de lado em vez de
 * so descer reto. Cada um e um relato inteiro, nao uma frase.
 *
 * Regra de escrita (BIBLIA.md 24): Santiago escreve como quem anota o clima,
 * mesmo quando o assunto e assustador. John escreve como quem ja decidiu nao
 * voltar e nao quer companhia. Nenhum dos dois explica o que esta acontecendo,
 * porque nenhum dos dois sabe.
 *
 * A arte de cada um sai de `public/art/journal/pagina_N.png`, sorteada pelo
 * indice: sao cinco papeis diferentes, entao a mina nao fica com trinta folhas
 * identicas.
 */
export interface ScrollDef {
  id: string;
  /** Camada onde ele vive (para o contador do Guia). */
  layer: string;
  /** Profundidade em metros. */
  depth: number;
  /** Coluna no mundo. */
  col: number;
  title: string;
  author: 'Santiago' | 'John';
  /** O texto, em paragrafos. */
  text: string[];
  /**
   * Posicao na CRONOLOGIA da historia, nao na ordem em que se acha.
   *
   * O Guia ordena por isto. Ler as anotacoes na ordem em que o jogador tropeca
   * nelas nao conta historia nenhuma: ele acha a de John no abismo antes da de
   * Santiago na pedra, e os dois textos se referem a momentos opostos.
   *
   * A linha do tempo real: John desce PRIMEIRO e some; onze dias depois
   * Santiago vai atras. Por isso as anotacoes de John no fundo sao ANTERIORES
   * as de Santiago no raso — e ler nessa ordem e o que faz a revelacao dos
   * onze dias acontecer sozinha, sem ninguem explicar.
   */
  cron: number;
  /**
   * Escrito FORA da descida — antes de entrar, ou em casa.
   *
   * Sem isto, a unica regra fisica que a cronologia tem ("quem desce nao sobe
   * para escrever a proxima pagina") acusaria a carta do Santiago, que e cron
   * 1 e mora aos 92 m. Ela nao foi escrita aos 92: foi escrita na cozinha e
   * largada onde ele parou para amarrar a bota.
   *
   * A excecao fica DECLARADA no dado, e nao tolerada na auditoria. Excecao que
   * o dado nao declara e bug, e tolerancia em auditoria e como se deixa de
   * pegar o proximo.
   */
  foraDaDescida?: boolean;
}

export const SCROLLS: ScrollDef[] = [
  // -------------------------------------------------- solo superficial (0+) --
  // O primeiro bioma nao tinha pergaminho NENHUM: os noventa metros de
  // abertura — os que aparecem em qualquer video do jogo — eram carvao e mais
  // carvao. Estas sao as duas primeiras paginas do Santiago, os dias um e dois,
  // e as duas empurram para onde o jogador precisa ir em seguida.
  {
    id: 'scr_solo_1', cron: 10, layer: 'surface', depth: 18, col: 52,
    title: 'Dia um', author: 'Santiago',
    text: [
      'O capataz me deu duas horas e um lampiao que pisca. Disse que depois disso a responsabilidade e minha.',
      'John sumiu ha onze dias. Onze. Contei de novo agora, com o dedo na parede, porque parei de confiar na minha cabeca nesse assunto.',
      'Vou marcar a volta a cada vinte metros. Duas linhas e um corte no meio. Se alguem ler isto, e assim que se acha o caminho de casa aqui embaixo.',
      'A primeira marca de verdade vai ficar nos vinte e seis. E ali que a pedra muda de som.',
    ],
  },
  {
    id: 'scr_solo_2', cron: 11, layer: 'surface', depth: 40, col: 88,
    title: 'Dia dois', author: 'Santiago',
    text: [
      'Passei a marca dos vinte e seis e continuei. A pedra fica mais quieta daqui para baixo, e isso nao e alivio nenhum.',
      'Ouvi alguem. Nao foi vento, nao foi assentamento: foi alguem, e estava abaixo de mim.',
      'Gritei de volta quatro vezes. Na quinta desisti e comecei a cavar na direcao do som, que e a unica coisa que presta quando se ouve gente na pedra.',
      'Anoto aqui porque amanha eu vou querer ter certeza de que nao inventei: ha mais alguem nesta mina, e ele esta preso.',
    ],
  },
  // --------------------------------------------------------- pedra (180+) --
  {
    // 'pedra' no id e heranca: a Camada de Pedra comecava aos 50 m. Hoje
    // comeca aos 180, entao os cinco primeiros caem no Solo Superficial. O id
    // fica — renomear quebraria a flag de quem ja achou.
    id: 'scr_pedra_1', cron: 12, layer: 'surface', depth: 58, col: 38,
    title: 'Sobre descer com pressa', author: 'Santiago',
    text: [
      'Dia tres. Desci rapido demais e paguei com dois dedos roxos.',
      'A companhia diz que a mina foi mapeada ate os quatrocentos. Mapeada por quem, com que pe, em que ano? Ninguem responde essa parte.',
      'Marquei a volta a cada vinte metros, como sempre. Se alguem ler isto e estiver perdido: procure duas linhas e um corte no meio. Sao minhas.',
    ],
  },
  {
    id: 'scr_pedra_2', cron: 2, layer: 'surface', depth: 74, col: 96,
    title: 'O primeiro registro do som', author: 'John',
    text: [
      'Santiago acha que e pressao nas galerias. Eu tambem achava, ate cronometrar.',
      'Tres longos, dois curtos. As duas e dezessete. Quatro noites seguidas, com menos de um segundo de diferenca entre elas.',
      'Pressao nao tem relogio.',
    ],
  },
  {
    id: 'scr_pedra_3', cron: 1, foraDaDescida: true, layer: 'surface', depth: 92, col: 52,
    title: 'Carta que nao mandei', author: 'Santiago',
    text: [
      'Helena, se isto chegar antes de mim, o que e improvavel, e porque eu fiz besteira.',
      'O Elias perguntou ontem se eu sei consertar tudo. Eu disse que sim. Foi a mentira mais facil da minha vida e a que mais vai doer.',
      'Espero que demore muito para ele descobrir a verdade sobre isso.',
    ],
  },
  {
    id: 'scr_pedra_4', cron: 13, layer: 'stone', depth: 196, col: 100,
    title: 'Oleo fresco', author: 'Santiago',
    text: [
      'Achei um lampiao pendurado numa viga. Reservatorio pela metade, pavio queimado ate a metade.',
      'Oleo evapora. Este nao evaporou.',
      'Alguem acendeu esse lampiao esta semana, e nao fui eu.',
    ],
  },
  {
    id: 'scr_pedra_5', cron: 3, layer: 'stone', depth: 290, col: 46,
    title: 'Sobre pedir licenca', author: 'John',
    text: [
      'O sujeito do posto me mandou embora tres vezes antes de me deixar encher o cantil.',
      'Nao por mal. Ele disse que quem desce fazendo pergunta demais atrai atencao para eles.',
      'Perguntei atencao de quem. Ele fingiu que nao ouviu e me deu pao.',
    ],
  },

  // -------------------------------------------------------- cristal (360+) --
  {
    id: 'scr_cristal_1', cron: 4, layer: 'crystal', depth: 386, col: 44,
    title: 'O cristal responde', author: 'John',
    text: [
      'Bati na parede tres vezes. Contei ate dez. A parede bateu de volta duas.',
      'Repeti quatro vezes para ter certeza de que nao era eco. Eco nao inverte o numero.',
      'Nao contei isso pro Santiago ainda. Ele ia querer descer hoje mesmo.',
    ],
  },
  {
    id: 'scr_cristal_2', cron: 14, layer: 'crystal', depth: 430, col: 104,
    title: 'Lanternas azuis', author: 'Santiago',
    text: [
      'Vi luz la embaixo que nao era minha. Azul, parada, bem abaixo do ponto onde os mapas da companhia acabam.',
      'Apaguei a minha e esperei uma hora. Ela nao se mexeu e nao apagou.',
      'Ou tem gente morando aqui, ou tem uma coisa que aprendeu a imitar gente. Nao sei qual das duas me da mais vontade de continuar.',
    ],
  },
  {
    id: 'scr_cristal_3', cron: 5, layer: 'crystal', depth: 470, col: 66,
    title: 'Inventario, dia dezenove', author: 'John',
    text: [
      'Corda: metade. Polvora: tres cargas. Filtros: dois, e um ja esta puxando.',
      'Comida para seis dias se eu comer como gente, doze se eu comer como rato. Vou comer como rato.',
      'Nao estou perdido. Isso e importante que fique escrito, porque quando me acharem vao dizer que eu estava.',
    ],
  },
  // ------------------------------------------------------ minerais (500+) --
  {
    id: 'scr_min_1', cron: 15, layer: 'minerals', depth: 524, col: 40,
    title: 'Onze dias', author: 'Santiago',
    text: [
      'Contei de novo no registro de carga. John entrou onze dias antes de mim.',
      'Onze dias em que eu estava em casa achando que ele tinha ido para o norte. Onze dias que eu nao vou recuperar.',
      'Quando eu contar isso pra alguem la em cima, vao dizer que eu fui atras de um amigo. E verdade. Mas a verdade inteira e que eu demorei onze dias para perceber.',
    ],
  },
  {
    id: 'scr_min_2', cron: 16, layer: 'minerals', depth: 566, col: 112,
    title: 'Sobre os mapas', author: 'Santiago',
    text: [
      'Os mapas oficiais acabam nos quatrocentos e vinte. Os tuneis nao.',
      'Encontrei um trilho reparado com material que nao existia quando a companhia fechou este setor. Solda nova em ferro velho.',
      'Alguem trabalha aqui. Alguem que nao consta em folha de pagamento nenhuma.',
    ],
  },
  {
    id: 'scr_min_3', cron: 6, layer: 'minerals', depth: 618, col: 92,
    title: 'Pegadas', author: 'John',
    text: [
      'Tem pegadas humanas abaixo do nivel onde a companhia jura que nao existe mais nada.',
      'Tamanho variado. Criancas entre elas. Isso muda tudo: ninguem traz crianca para uma expedicao.',
      'Nao e expedicao. E mudanca.',
    ],
  },
  // --------------------------------------------------------- magma (900+) --
  {
    id: 'scr_magma_1', cron: 17, layer: 'magma', depth: 928, col: 48,
    title: 'O calor nao e daqui', author: 'Santiago',
    text: [
      'Medi o gradiente por tres dias. Ele nao sobe como deveria: sobe em degraus, e os degraus tem intervalo regular.',
      'Calor geotermico nao liga e desliga. Isso aqui liga e desliga.',
      'Estou escrevendo isso sentado numa pedra que estava fria de manha.',
    ],
  },
  {
    id: 'scr_magma_2', cron: 7, layer: 'magma', depth: 972, col: 118,
    title: 'Para quem vier depois', author: 'John',
    text: [
      'Se voce chegou ate aqui, provavelmente veio atras de alguem. E como todo mundo chega.',
      'Um conselho que eu nao segui: decida agora ate onde voce vai. Escreva num papel. Porque la embaixo voce vai renegociar consigo mesmo a cada vinte metros, e voce sempre ganha a negociacao.',
      'Eu ganhei todas. Por isso estou aqui.',
    ],
  },
  {
    id: 'scr_magma_3', cron: 18, layer: 'magma', depth: 1012, col: 62,
    title: 'O medidor', author: 'Santiago',
    text: [
      'Montei o receptor com as notas do John. Funcionou na primeira tentativa, o que me assustou mais do que se tivesse falhado.',
      'A agulha se move ANTES do som. Sempre o mesmo intervalo: meio segundo.',
      'Uma coisa que avisa antes de chegar nao e um fenomeno. E uma cortesia.',
    ],
  },
  // -------------------------------------------------------- ruinas (1300+) --
  {
    id: 'scr_ruinas_1', cron: 19, layer: 'ruins', depth: 1326, col: 42,
    title: 'Pedra que nao e pedra', author: 'Santiago',
    text: [
      'Passei a mao na parede esperando rocha e encontrei junta. Junta reta, de dois metros, sem argamassa.',
      'Isto nao foi escavado. Isto foi construido, e a mina cresceu em volta.',
      'Estou anotando isso com a mesma letra com que anoto o clima porque se eu deixar a mao tremer eu paro de escrever.',
    ],
  },
  {
    id: 'scr_ruinas_2', cron: 20, layer: 'ruins', depth: 1368, col: 108,
    title: 'Marcas na altura do joelho', author: 'Santiago',
    text: [
      'A trilha do John continua, mas mudou. Os cortes que ele fazia na altura do ombro agora estao na altura do joelho.',
      'Ele nao faria isso por economia de esforco. John nunca economizou esforco na vida.',
      'Ele esta marcando sentado. Ou arrastando uma perna.',
    ],
  },
  {
    id: 'scr_ruinas_3', cron: 8, layer: 'ruins', depth: 1412, col: 70,
    title: 'As ruinas contam', author: 'John',
    text: [
      'Tem uma parede aqui que muda. Nao muito: um simbolo a mais por dia.',
      'No comeco achei que eu e que estava contando errado. Entao marquei com giz.',
      'Hoje tem quatorze marcas de giz e quinze simbolos. Alguem esta contando quem entra, e nao sou eu.',
    ],
  },
  // --------------------------------------------------------- abismo (1700+) --
  {
    id: 'scr_abismo_1', cron: 9, layer: 'abyss', depth: 1724, col: 50,
    title: 'A porta respira', author: 'John',
    text: [
      'Nao tenho palavra melhor. A estrutura tem um ciclo: aproxima, afasta. Como caixa toracica.',
      'Encostei a testa nela por um minuto inteiro. Nao e vibracao de maquina. Maquina vibra igual.',
      'Se isto for transporte, entao transporte foi a palavra errada desde o comeco.',
    ],
  },
  {
    id: 'scr_abismo_2', cron: 21, layer: 'abyss', depth: 1766, col: 116,
    title: 'Ultima entrada antes da camara', author: 'Santiago',
    text: [
      'Deixei comida e o caderno com o John numa area estavel. Ele pediu para eu ficar.',
      'Eu disse que se aquilo chamou a gente por anos, tem alguem do outro lado esperando resposta. Ele disse que essa era a frase mais minha que eu ja tinha dito.',
      'Pela primeira vez eu quero voltar. Pela primeira vez eu tambem sei que nao vou.',
    ],
  },
  {
    id: 'scr_abismo_3', cron: 22, layer: 'abyss', depth: 1808, col: 74,
    title: 'Tres dias', author: 'John',
    text: [
      'A porta acendeu uma vez. Contei tres dias com a perna assim e a lanterna racionada.',
      'Depois nunca mais.',
      'Se alguem achar isto: nao foi desabamento. Ninguem nos enterrou. Nos entramos.',
    ],
  },
];

/** Pergaminhos de uma camada. */
export function scrollsOfLayer(layerId: string): ScrollDef[] {
  return SCROLLS.filter((s) => s.layer === layerId);
}
