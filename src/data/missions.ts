import type { DialogLine } from './story';
/**
 * Missoes da campanha.
 *
 * ORDEM: em cada camada o selo vem ANTES do resgate. Nao e escolha de ritmo, e
 * geometria — o mineiro preso e a pagina daquela camada ficam DEPOIS do selo,
 * entao pedir o resgate antes de derrubar o guardiao seria uma missao
 * impossivel. Ao mexer nesta lista, conferir a profundidade em /data/story.ts
 * contra a faixa do selo (ultimos 6 m antes da camada).
 *
 * CANONE: BIBLIA.md. Os titulos e o fio seguem os atos de la; as condicoes
 * usam as flags de historia que o jogo ja emite, entao missao nao precisou de
 * um sistema de estado proprio — ela LE o que ja aconteceu.
 *
 * As missoes sao lineares de proposito nesta leva: uma de cada vez, sempre a
 * proxima nao concluida. Isso e o que o card "Objetivo Atual" mostra quando a
 * cota da semana ja esta paga.
 *
 * Por que a primeira exige o chefe: a barreira de bioma so abre matando o
 * guardiao E resgatando os mineiros daquela camada. Se a primeira missao do
 * jogo fosse "colete 10 carvoes", o jogador aprenderia a cota e nao aprenderia
 * a regra que governa o resto da descida.
 */

export interface MissionDef {
  id: string;
  /** Titulo curto, exibido no card. */
  title: string;
  /** O que fazer, numa frase. */
  goal: string;
  /**
   * Flags de historia que precisam existir para a missao ser dada por
   * concluida. TODAS, nao qualquer uma.
   */
  requires: string[];
  /** Linha dita ao concluir (toast). */
  onDone: string;
  /**
   * POR QUE isto importa para o Elias — nao o que fazer, mas o que esta em
   * jogo.
   *
   * O relato do dono: "o jogo nao esta puxando o jogador para baixo
   * simplesmente por puxar. Nao tem incentivo nenhum descer." E ele tinha
   * razao: todo objetivo aqui era uma TAREFA ("derrube a Mae dos Esporos"),
   * nunca um MOTIVO. Tarefa e recado de chefia; motivo e o que faz alguem
   * descer.
   *
   * O motivo e sempre o mesmo e por isso pode ser dito toda vez: Santiago
   * desceu. Cada coisa que fecha a descida e uma coisa entre o Elias e o pai.
   */
  porque?: string;
  rewardMoney: number;
  rewardPoints: number;
  /**
   * Profundidade aproximada do objetivo, em metros.
   *
   * Serve para escolher qual missao mostrar quando o jogador esta mais fundo
   * do que a fila. Sem isto, quem ja tinha derrubado a Matriarca ficava preso
   * olhando "Trilhos Novos, 216 m" para sempre, porque a lista e em ordem e a
   * primeira em aberto ganhava — mesmo estando 100 m acima dele.
   */
  depth: number;
  /**
   * TRABALHO estimado, em minutos, sem contar a descida ate aqui.
   *
   * Existe porque a conta por profundidade tem um ponto cego: as missoes
   * DENTRO de uma cidade ficam a dois metros uma da outra, e a estimativa
   * dava dois minutos para cada uma. Trabalho de cidade nao e descida —
   * consertar um elevador, tirar caixa de galeria alagada e limpar cisterna
   * sem estragar a agua nao tem metro nenhum.
   *
   * O numero e o ALVO de projeto, tirado da BIBLIA (secao 8): Blockia sozinha
   * vale 2h30. Quando o conteudo existir, ele passa a ser conferido contra o
   * jogo; ate la, ele diz para onde a missao esta sendo construida.
   */
  minutos?: number;
  /**
   * Confianca que esta missao entrega a uma cidade, e a qual.
   *
   * Existe porque a cidade-porteira estava se vendendo por uma conversa. Toda
   * a confianca de Blockia vinha de falar com os moradores pela primeira vez:
   * somavam 23, e a passagem pedia 12. Dava para dizer bom dia para tres
   * pessoas e sair com a Picareta dos Fundadores — e as tres missoes de
   * trabalho, que sao o argumento inteiro da cidade, viravam enfeite que o
   * jogador fazia DEPOIS de ja ter recebido o premio delas.
   *
   * Agora a conversa vale pouco (e so apresentacao) e o trabalho vale o resto.
   * A auditoria confere as duas pontas: a soma das conversas tem de ficar
   * ABAIXO do limiar, e o caminho obrigatorio tem de alcanca-lo exatamente.
   */
  trust?: { city: string; amount: number };
  /** Etapas exibidas sem criar estado separado do progresso de historia. */
  steps?: MissionStepDef[];
  /** Conversa que abre quando a missao fecha: quem estava la fala. */
  falasAoConcluir?: DialogLine[];
  /** Anotacao que fica no caderno (aba Pistas) quando a missao fecha. */
  anotacao?: { titulo: string; texto: string };
}

export interface MissionStepDef {
  id: string;
  text: string;
  requires: string[];
  markerId?: string;
  depth?: number;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'm0_primeira_cota',
    depth: 0,
    title: 'O Acordo',
    goal: 'A mina so reabriu porque voce prometeu a cota da semana. Minere, entregue no deposito e feche o quadro.',
    requires: ['quota_paga'],
    onDone: 'Cota paga. A mina continua aberta por mais uma semana.',
    porque:
      'A mina fechou quando seu pai sumiu. Ela so reabriu porque voce assinou por ela. Perder a cota e perder o direito de descer.',
    rewardMoney: 150,
    rewardPoints: 1,
    minutos: 25,
  },
  {
    id: 'm1_marca_do_pai',
    depth: 26,
    title: 'Vinte e Seis Metros',
    goal: 'O caderno de Santiago da uma unica profundidade com marca: 26 m. Desca e veja o que tem la.',
    requires: ['clue_marca_do_pai'],
    onDone: 'A marca aponta para baixo. Ele nao estava marcando a volta.',
    porque:
      'Santiago marcou uma profundidade so no caderno inteiro. Ele nao anotava por onde tinha passado: anotava para onde ia.',
    rewardMoney: 200,
    rewardPoints: 1,
    minutos: 12,
  },
  {
    id: 'm2_a_voz_na_pedra',
    depth: 84,
    title: 'A Voz na Pedra',
    goal: 'Tem alguem gritando abaixo da marca. Siga o som e tire essa pessoa de la.',
    requires: ['npc_jonas'],
    onDone: 'Jonas subiu — e deixou as toupeiras dele com voce.',
    porque:
      'Quem esta preso la embaixo estava aqui quando a mina fechou. Quem estava aqui viu o que aconteceu com o seu pai.',
    rewardMoney: 250,
    rewardPoints: 1,
    minutos: 14,
  },
    {
    /*
     * ERA UM CHEFE AOS 168 m, e a BIBLIA nao poe nenhum antes dos 420.
     *
     * "Primeiro boss muito cedo, pouco desenvolvimento" — e o cânone concorda:
     * guardiao existe porque uma CIDADE o colocou para nao ser encontrada, e
     * acima de Blockia nao ha cidade nenhuma. Aquele guardava uma porta que
     * ninguem trancou.
     *
     * No lugar dele entra o que a BIBLIA tem aqui (M2, "Marcas na Pedra"): as
     * marcas do caderno e a primeira pagina de Santiago. A primeira metade do
     * jogo passa a ser sobre PROCURAR.
     */
    id: 'm2b_marcas_na_pedra',
    depth: 120,
    title: 'Marcas na Pedra',
    goal: 'As marcas do caderno continuam. Siga a sequencia e ache a folha que Santiago deixou.',
    requires: ['clue_pagina_01'],
    onDone: 'Tres pulsos longos, dois curtos. John ouviu isso primeiro, e seu pai anotou.',
    porque:
      'Ele nao marcava por onde tinha passado: marcava para onde ia. Cada marca e uma decisao que ele tomou, e todas apontam para baixo.',
    rewardMoney: 300,
    rewardPoints: 1,
    minutos: 14,
  },
  {
    id: 'm3b_trilhos_novos',
    depth: 216,
    title: 'Trilhos Novos',
    goal: 'Ha trilho remendado com solda nova numa mina fechada ha quatorze anos. Ache e veja com os proprios olhos.',
    requires: ['clue_trilhos', 'trilhos_reparados'],
    onDone: 'Alguem consertou aquilo este ano. A companhia jura que nao ha ninguem la embaixo.',
    porque:
      'Trilho remendado com solda nova numa mina fechada ha quatorze anos significa que alguem esteve aqui DEPOIS que fecharam. Seu pai desceu por estes trilhos.',
    rewardMoney: 400,
    rewardPoints: 1,
    minutos: 12,
  },
  {
    id: 'm3c_posto_nove',
    depth: 278,
    title: 'Posto Nove',
    goal: 'Os trilhos levam a algum lugar. Siga a linha e descubra quem mora no fim dela.',
    requires: ['posto_nove_defendido', 'rui_cabeca'],
    onDone: 'Rui Cabeca. Mora aqui com a irma e um gato. E fala de lanternas azuis mais fundo.',
    porque:
      'Quem mora no fim de um trilho que nao deveria existir sabe quem passou por ele. E alguem passou.',
    rewardMoney: 450,
    rewardPoints: 1,
    minutos: 14,
  },
    {
    /*
     * O outro chefe precoce. Mesmo motivo, mesma correcao.
     *
     * A BIBLIA fecha M3 com o Rui mandando Elias procurar "as lanternas
     * azuis", e depois ha quase duzentos metros ate a Rainha Escavadora. Este
     * e o trecho: seguir a linha que alguem mantem acesa.
     */
    id: 'm3d_caminho_das_lanternas',
    depth: 340,
    title: 'O Caminho das Lanternas',
    goal: 'Rui falou em lanternas azuis mais fundo. Siga a linha que alguem mantem acesa.',
    requires: ['clue_lampiao'],
    onDone: 'Oleo fresco a trezentos e quarenta metros. Nao ha ninguem aqui embaixo, dizem eles.',
    porque:
      'Alguem abastece estes lampioes toda semana. Quem mantem luz acesa num lugar tem um lugar — e seu pai encontrou esse lugar antes de voce.',
    rewardMoney: 600,
    rewardPoints: 1,
    minutos: 12,
  },
  {
    id: 'm4b_a_base_do_cristal',
    depth: 396,
    title: 'A Base do Cristal',
    goal: 'Ha uma camara abandonada a 396 m, na coluna oeste, com um refinador velho ainda de pe. Va ate la e erga o Deposito Bruto: as toupeiras param de subir 396 metros e passam a entregar ali.',
    requires: ['base_cristal:deposito', 'base_cristal_primeira_entrega'],
    onDone: 'A base respira. Daqui para baixo, o minerio nao sobe mais nas costas de ninguem.',
    porque:
      'Daqui para baixo o minerio nao sobe mais nas costas de ninguem. Sem uma base aqui, cada metro conquistado custa a viagem de volta inteira.',
    rewardMoney: 950,
    rewardPoints: 2,
    minutos: 14,
  },
  {
    id: 'm5_luzes_abaixo',
    depth: 460,
    title: 'Luzes Abaixo',
    goal: 'Tem outra voz nas Cavernas de Cristal. Siga o som e tire essa pessoa de la.',
    requires: ['npc_vilma', 'vilma_rota_segura'],
    onDone: 'Tres pulsos longos, dois curtos. John ouviu isso primeiro.',
    porque:
      'Tres pulsos longos, dois curtos. E o sinal do caderno do seu pai, e ele esta sendo repetido por alguem que ainda esta vivo la embaixo.',
    rewardMoney: 1000,
    rewardPoints: 1,
    minutos: 12,
  },
  {
    id: 'm6_a_rota_comercial',
    depth: 497,
    title: 'A Rota Comercial',
    goal: 'A Rainha Escavadora bloqueia a passagem aos 497 m. Abra o caminho.',
    requires: ['rota_comercial_reparada', 'boss_automato_enferrujado', 'gate_minerals'],
    onDone: 'Uma rota comercial, fechada por dentro. Por quem vive do outro lado.',
    porque:
      'Uma rota comercial fechada POR DENTRO. Quem fecha uma porta por dentro esta do outro lado — e seu pai foi para o outro lado.',
    rewardMoney: 1800,
    rewardPoints: 2,
    minutos: 18,
  },
  /*
   * ATO 2 — BLOCKIA (BIBLIA 9, M5 a M10).
   *
   * A cidade era um lugar para visitar e virou a metade do arco. A BIBLIA da
   * 2h30 so aqui, e o jogo tinha ZERO missoes dentro dela — o jogador chegava,
   * falava com sete pessoas e descia.
   *
   * O fio: Blockia nao recebe visitante. Nao por xenofobia — quem desce
   * precisa da ferramenta dela, e confiar em quem vai embora e gastar
   * confianca com quem nao fica. Cada missao aqui e trabalho de verdade feito
   * pela cidade, e a confianca que elas dao e o que abre a Picareta dos
   * Fundadores (12 de 23, ver /data/cities.ts).
   *
   * E tudo isso o Santiago ja fez. Em cada uma ha quem lembre dele.
   */
  {
    id: 'm5_lanternas_azuis',
    depth: 600,
    title: 'As Lanternas Azuis',
    goal: 'A rota termina numa porta de madeira reforcada, e ha voz do outro lado. Diga seu nome.',
    requires: ['mara_avelar'],
    onDone: '"Ramires?" A porta abriu antes de voce responder de novo.',
    porque:
      'Catorze anos de "nao ha ninguem la embaixo", e ha uma porta com guarda. Seu pai bateu nesta mesma porta.',
    rewardMoney: 1900,
    rewardPoints: 2,
    minutos: 20,
  },
  {
    id: 'm6_cidade_que_escolheu_ficar',
    depth: 601,
    title: 'A Cidade que Escolheu Ficar',
    goal: 'Mara quer que voce veja a cidade antes de pedir qualquer coisa a ela: o mercado, a horta, a praca e o elevador.',
    requires: ['blockia_tour_concluido'],
    onDone: '"Santiago. Passou. Quatorze anos atras — e nao veio procurar minerio."',
    porque:
      'Quem mora aqui viu seu pai passar. Antes de perguntar por ele, e preciso entender por que esta gente ficou.',
    rewardMoney: 2000,
    rewardPoints: 1,
    minutos: 12,
  },
  {
    id: 'm7_arquivo_das_lanternas',
    trust: { city: 'blockia', amount: 2 },
    depth: 602,
    title: 'O Arquivo das Lanternas',
    goal: 'Afonso guarda uma pagina do caderno do seu pai. Ele so entrega depois que voce tirar as caixas da galeria alagada.',
    requires: ['blockia_arquivo_concluido', 'afonso_greda'],
    onDone: 'Pagina 03. Santiago escrevia nas margens dos mapas publicos — em casa tambem fazia isso.',
    falasAoConcluir: [
      { speaker: 'Afonso', text: 'Secas. Quase. Voce tem mao para documento.' },
      { speaker: 'Afonso', text: 'Aqui. A pagina dele. Estava na terceira caixa, dobrada no mapa da rota comercial.' },
      { speaker: 'Santiago', text: '"Blockia prova que a mina nao engole todo mundo. As vezes ela guarda."' },
    ],
    anotacao: {
      titulo: 'Pagina 03 — Blockia',
      texto: '"Blockia prova que a mina nao engole todo mundo. As vezes ela guarda. John passou por aqui tres dias antes de mim. Comprou filtros, corda e polvora. Nao disse para onde ia."',
    },
    porque:
      'O arquivista de Blockia tem uma pagina que sua mae nunca viu. Ela esta a tres salas de voce, e o preco e trabalho.',
    rewardMoney: 2100,
    rewardPoints: 2,
    minutos: 30,
  },
  {
    id: 'm8_ponte_quebrada',
    trust: { city: 'blockia', amount: 3 },
    depth: 604,
    title: 'A Ponte Quebrada',
    goal: 'O elevador leste esta parado e a ponte caiu. Breno precisa de maos, nao de opiniao.',
    requires: ['blockia_elevador_religado', 'blockia_ponte_reparada', 'breno_torga'],
    onDone: 'A cidade voltou a ter norte e sul. Breno nao agradeceu; ele elogiou seu jeito de segurar viga.',
    falasAoConcluir: [
      { speaker: 'Breno', text: 'Funciona.' },
      { speaker: 'Elias', text: 'So isso?' },
      { speaker: 'Breno', text: 'Elevador que funciona nao precisa de discurso. Mas voce segura viga direito, isso eu digo.' },
    ],
    porque:
      'Uma cidade vertical parada e uma cidade partida em duas. Consertar o que os moradores usam todo dia e como se deixa de ser visita.',
    rewardMoney: 2300,
    rewardPoints: 2,
    minutos: 25,
  },
  {
    id: 'm9_conselho_das_lanternas',
    trust: { city: 'blockia', amount: 4 },
    depth: 606,
    title: 'Conselho das Lanternas',
    goal: 'Ha bicho nas cisternas. O Conselho deixa voce resolver — sem estragar a reserva de agua.',
    requires: ['blockia_cisterna_limpa', 'irene_salles'],
    onDone: '"Seu pai chegou aqui querendo permissao. Quando dissemos nao, ele foi mesmo assim."',
    falasAoConcluir: [
      { speaker: 'Mara', text: 'Seu pai chegou aqui querendo permissao. Quando dissemos nao, ele foi mesmo assim.' },
      { speaker: 'Elias', text: 'Isso parece com ele.' },
      { speaker: 'Mara', text: 'Voce diz isso como elogio.' },
      { speaker: 'Elias', text: 'Ainda nao decidi.' },
      { speaker: 'Mara', text: 'Bom. Talvez seja a primeira diferenca entre voces.' },
    ],
    porque:
      'O Conselho nao duvida da sua forca: duvida do seu juizo. Eles ja viram um Ramires decidir sozinho, e a cidade pagou por isso.',
    rewardMoney: 2600,
    rewardPoints: 3,
    minutos: 35,
  },
  {
    id: 'm10_saida_inferior',
    depth: 608,
    title: 'A Saida Inferior',
    goal: 'Blockia decide se voce desce. Ganhe a confianca da cidade e receba da Mara o selo de passagem e a Picareta dos Fundadores.',
    requires: ['passagem_blockia'],
    onDone: '"Santiago seguiu para Ferruria. Procure Dalia Correia — se alguem tem registro da carga dele, e ela."',
    porque:
      'Abaixo de Blockia a pedra so cede a ferramenta de Blockia. Sem ela voce nao desce mais um metro, e foi exatamente assim com o seu pai.',
    rewardMoney: 3000,
    rewardPoints: 3,
    minutos: 20,
  },
  {
    id: 'm7_onze_dias',
    depth: 700,
    title: 'Onze Dias',
    goal: 'Nas Profundezas Minerais tem mais um preso e a Pagina 02, a 560 m.',
    requires: ['npc_teo', 'clue_pagina_02'],
    onDone: 'Teo vendeu corda e polvora para o OUTRO. Santiago passou depois.',
    porque:
      'Teo vendeu corda e polvora para alguem, onze dias antes. Santiago passou DEPOIS. Voce esta seguindo duas pessoas, nao uma.',
    rewardMoney: 3100,
    rewardPoints: 2,
  },
  {
    id: 'm8_pedra_que_nao_e_pedra',
    depth: 894,
    title: 'Pedra Que Nao E Pedra',
    goal: 'O Escaravelho Colossal guarda os 894 m. Passe por ele.',
    requires: ['boss_fundidor_incandescente', 'gate_magma'],
    onDone: 'Daqui para baixo, a parede deixa de ser escavada.',
    porque:
      'Daqui para baixo a parede deixa de ser escavada e passa a ser construida. Seu pai viu isso e continuou descendo.',
    rewardMoney: 3600,
    rewardPoints: 3,
  },
  {
    id: 'm9_o_som_no_metal',
    depth: 980,
    title: 'O Som no Metal',
    goal: 'Na Zona de Magma tem alguem chamando, e a Pagina 04 a 940 m.',
    requires: ['npc_ozias', 'clue_pagina_04'],
    onDone: 'Ele nao desceu COM o John. Desceu ATRAS dele.',
    porque:
      'A Pagina 04 fala de John. Seu pai nao desceu atras de minerio: ele desceu atras de alguem.',
    rewardMoney: 3900,
    rewardPoints: 2,
  },
  {
    id: 'm10_a_ultima_rota',
    depth: 1294,
    title: 'A Ultima Rota Humana',
    goal: 'O Colosso Prismatico fecha os 1294 m. Derrube e desca.',
    requires: ['boss_escriba_selado', 'gate_ruins'],
    onDone: 'Abaixo daqui nao ha mais cidade nenhuma para colocar guardiao.',
    porque:
      'Ultima. Depois deste selo nao ha mais nada feito por gente — e Santiago passou por ele.',
    rewardMoney: 5200,
    rewardPoints: 3,
  },
  {
    id: 'm11_a_trilha_baixa',
    depth: 1400,
    title: 'A Trilha Baixa',
    goal: 'Nas Ruinas Antigas tem um batedor preso, e a Pagina 07 a 1340 m.',
    requires: ['npc_braga', 'clue_pagina_07'],
    onDone: 'Marcas na altura do joelho. Quem as fez estava arrastando uma perna.',
    porque:
      'Um batedor preso nas Ruinas Antigas. Ele desceu com alguem, e nao foi sozinho que ele ficou para tras.',
    rewardMoney: 5500,
    rewardPoints: 3,
  },
  {
    id: 'm12_a_porta',
    depth: 1694,
    title: 'A Porta',
    goal: 'O Eco do Portal guarda os 1694 m. O que houver depois dele, Santiago ja viu.',
    requires: ['boss_eco_portal', 'gate_abyss'],
    onDone: 'A mina acabou. A historia nao.',
    porque:
      'O que houver depois dele, Santiago ja viu. Esta e a ultima porta entre voce e a resposta.',
    rewardMoney: 9000,
    rewardPoints: 5,
  },
  {
    id: 'm13_quem_ainda_fala',
    depth: 1780,
    title: 'Quem Ainda Fala',
    goal: 'No Abismo alguem ainda responde. E a Pagina 10 esta a 1740 m.',
    requires: ['npc_ultima_luz', 'clue_pagina_10'],
    onDone: 'Um carregou o outro para cima. Depois voltou sozinho.',
    porque:
      'Alguem ainda responde no Abismo. Depois de quatorze anos, alguem ainda responde.',
    rewardMoney: 9500,
    rewardPoints: 4,
  },
];

// As flags continuam sendo a unica fonte de verdade. Estes passos so revelam
// o proximo problema, sem antecipar a cadeia inteira no HUD.
const CAMPAIGN_STEPS: Record<string, MissionStepDef[]> = {
  m0_primeira_cota: [
    { id: 'minerar', text: 'Minere e colete seu primeiro recurso.', requires: ['m0_recurso'] },
    { id: 'entregar', text: 'Faca a primeira entrega no deposito.', requires: ['m0_entrega'] },
    { id: 'cota', text: 'Conclua a cota semanal.', requires: ['quota_paga'] },
  ],
  m1_marca_do_pai: [
    { id: 'chegar', text: 'Desca ate 26 m.', requires: ['m1_26m'], depth: 26 },
    { id: 'parede', text: 'Procure a parede que soa oca.', requires: ['secret_marca_pai'], markerId: 'secret_marca_pai', depth: 26 },
    { id: 'queda', text: 'Sobreviva ao desabamento.', requires: ['collapse_26m'], markerId: 'clue_marca_do_pai' },
    { id: 'marca', text: 'Examine a marca de Santiago.', requires: ['clue_marca_do_pai'], markerId: 'clue_marca_do_pai' },
  ],
  m2_a_voz_na_pedra: [
    { id: 'ouvir', text: 'Siga os gritos de Jonas.', requires: ['m2_jonas_sala'], markerId: 'npc_jonas', depth: 84 },
    { id: 'rubble', text: 'Remova os escombros em volta de Jonas.', requires: ['m2_escombros'], markerId: 'npc_jonas' },
    { id: 'abrir', text: 'Escore o teto para abrir uma passagem segura.', requires: ['m2_passagem_segura'], markerId: 'npc_jonas' },
    { id: 'jonas', text: 'Liberte Jonas.', requires: ['npc_jonas'], markerId: 'npc_jonas' },
  ],
  m2b_marcas_na_pedra: [
    // A Pagina 01 ja e a sala canonica que encerra a sequencia de marcas.
    // Apontar para ela evita uma flag intermediaria sem fonte no mundo.
    { id: 'pagina', text: 'Siga as marcas ate a Pagina 01.', requires: ['clue_pagina_01'], markerId: 'clue_pagina_01', depth: 120 },
  ],
  m3b_trilhos_novos: [
    { id: 'solda', text: 'Examine a solda nova.', requires: ['clue_trilhos'], markerId: 'clue_trilhos', depth: 216 },
    { id: 'reparar', text: 'Repare a secao inutilizada (10 ferro, 6 cobre).', requires: ['trilhos_reparados'], markerId: 'clue_trilhos' },
  ],
  m3c_posto_nove: [
    { id: 'gerador', text: 'Abasteca o gerador do posto com 20 carvoes.', requires: ['posto_nove_gerador'], markerId: 'rui_cabeca', depth: 278 },
    { id: 'defesa', text: 'Segure o Posto Nove: o gerador atraiu o que vive nos trilhos.', requires: ['posto_nove_defendido'], markerId: 'rui_cabeca' },
    { id: 'rui', text: 'Fale com Rui.', requires: ['rui_cabeca'], markerId: 'rui_cabeca' },
  ],
  m3d_caminho_das_lanternas: [
    { id: 'lanterna1', text: 'Localize a primeira lanterna.', requires: ['m3d_lanterna_1'], markerId: 'lanterna_1', depth: 318 },
    { id: 'lanterna3', text: 'Siga as lanternas ate a terceira, a apagada.', requires: ['m3d_lanterna_3'], markerId: 'lanterna_3' },
    { id: 'reparar', text: 'Repare a lanterna (2 cobre, 6 carvao).', requires: ['lanterna_reparada'], markerId: 'lanterna_3' },
    { id: 'lampiao', text: 'Examine o lampiao abastecido.', requires: ['clue_lampiao'], markerId: 'clue_lampiao' },
  ],
  m4b_a_base_do_cristal: [
    { id: 'camara', text: 'Chegue a camara do cristal.', requires: ['m4b_camara'], markerId: 'base_cristal', depth: 396 },
    { id: 'limpar', text: 'Limpe os escombros da entrada.', requires: ['m4b_acesso'], markerId: 'base_cristal' },
    { id: 'deposito', text: 'Construa o Deposito Bruto.', requires: ['base_cristal:deposito'], markerId: 'base_cristal' },
    { id: 'entrega', text: 'Faca a primeira entrega na base.', requires: ['base_cristal_primeira_entrega'], markerId: 'base_cristal' },
  ],
  m5_luzes_abaixo: [
    { id: 'vilma', text: 'Siga os sons de Vilma.', requires: ['m5_vilma_zona'], markerId: 'npc_vilma', depth: 460 },
    { id: 'queda', text: 'Sobreviva ao desabamento cristalino.', requires: ['collapse_460m'], markerId: 'npc_vilma' },
    { id: 'abrir', text: 'Tire o bloco da perna de Vilma.', requires: ['m5_vilma_acesso'], markerId: 'npc_vilma' },
    { id: 'resgatar', text: 'Liberte Vilma e escore a galeria (8 ferro).', requires: ['npc_vilma', 'vilma_rota_segura'], markerId: 'npc_vilma' },
  ],
  m6_a_rota_comercial: [
    { id: 'rubble', text: 'Remova os escombros da rota comercial, na arena.', requires: ['m6_rota_limpa'], depth: 493 },
    { id: 'guincho', text: 'Repare o guincho da arena (18 ferro, 8 cobre, 500 moedas).', requires: ['rota_comercial_reparada'] },
    { id: 'boss', text: 'Derrote o automato e abra o gate.', requires: ['boss_automato_enferrujado', 'gate_minerals'] },
  ],
  m5_lanternas_azuis: [{ id: 'mara', text: 'Apresente-se a Mara na porta.', requires: ['mara_avelar'], markerId: 'mara_avelar', depth: 600 }],
  m6_cidade_que_escolheu_ficar: [
    { id: 'mercado', text: 'Veja o Mercado da Ponte.', requires: ['blockia_tour_mercado'], markerId: 'nina_candeia' },
    { id: 'horta', text: 'Suba ate a Horta Suspensa, no bairro oeste.', requires: ['blockia_tour_horta'], markerId: 'tour_horta' },
    { id: 'praca', text: 'Passe pela praca do reservatorio.', requires: ['blockia_tour_praca'], markerId: 'acao_cisterna_grade' },
    { id: 'elevador', text: 'Veja o elevador leste, na Forja.', requires: ['blockia_tour_elevador'], markerId: 'tour_elevador' },
    { id: 'mara', text: 'Volte a Mara, na Guarita.', requires: ['blockia_tour_concluido'], markerId: 'mara_avelar' },
  ],
  m7_arquivo_das_lanternas: [
    { id: 'afonso', text: 'Fale com Afonso, no Arquivo (alto do bairro oeste).', requires: ['afonso_greda'], markerId: 'afonso_greda' },
    { id: 'bomba', text: 'Ligue a bomba da galeria alagada, na passarela abaixo do Arquivo.', requires: ['blockia_galeria_drenada'], markerId: 'acao_arquivo_bomba' },
    { id: 'caixas', text: 'Recupere as tres caixas da galeria.', requires: ['blockia_caixa_1', 'blockia_caixa_2', 'blockia_caixa_3'], markerId: 'acao_caixa_1' },
    { id: 'entrega', text: 'Leve as caixas a Afonso.', requires: ['blockia_arquivo_concluido'], markerId: 'afonso_greda' },
  ],
  m8_ponte_quebrada: [
    { id: 'breno', text: 'Fale com Breno, na passarela da oficina.', requires: ['breno_torga'], markerId: 'breno_torga' },
    { id: 'sarilho', text: 'Religue o sarilho do elevador, na Forja (8 carvao).', requires: ['blockia_elevador_religado'], markerId: 'acao_elevador_sarilho' },
    { id: 'ponte', text: 'Instale a peca no vao da ponte (30 ferro, 12 cobre, 1.200 moedas).', requires: ['blockia_ponte_reparada'], markerId: 'acao_ponte_blockia' },
  ],
  m9_conselho_das_lanternas: [
    { id: 'irene', text: 'Fale com a Dra. Irene, na Casa de Saude.', requires: ['irene_salles'], markerId: 'irene_salles' },
    { id: 'grade', text: 'Abra a grade da cisterna, no Reservatorio.', requires: ['blockia_ninho_aberto'], markerId: 'acao_cisterna_grade' },
    { id: 'ninho', text: 'Limpe o ninho da cisterna sem sair do Reservatorio.', requires: ['blockia_ninho_limpo'], markerId: 'acao_cisterna_grade' },
    { id: 'valvula', text: 'Opere a valvula da cisterna.', requires: ['blockia_cisterna_limpa'], markerId: 'acao_cisterna_blockia' },
  ],
  m10_saida_inferior: [
    { id: 'confianca', text: 'Ganhe a confianca de Blockia: termine os trabalhos da cidade.', requires: ['blockia_confianca_plena'], markerId: 'mara_avelar' },
    { id: 'selo', text: 'Receba o selo de passagem com a Mara, na Guarita.', requires: ['passagem_blockia'], markerId: 'mara_avelar' },
  ],
};

for (const mission of MISSIONS) mission.steps = CAMPAIGN_STEPS[mission.id];
