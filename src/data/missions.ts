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
  rewardMoney: number;
  rewardPoints: number;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'm0_primeira_cota',
    title: 'O Acordo',
    goal: 'A mina so reabriu porque voce prometeu a cota da semana. Minere, entregue no deposito e feche o quadro.',
    requires: ['quota_paga'],
    onDone: 'Cota paga. A mina continua aberta por mais uma semana.',
    rewardMoney: 150,
    rewardPoints: 1,
  },
  {
    id: 'm1_marca_do_pai',
    title: 'Vinte e Seis Metros',
    goal: 'O caderno de Santiago da uma unica profundidade com marca: 26 m. Desca e veja o que tem la.',
    requires: ['clue_marca_do_pai'],
    onDone: 'A marca aponta para baixo. Ele nao estava marcando a volta.',
    rewardMoney: 200,
    rewardPoints: 1,
  },
  {
    id: 'm2_a_voz_na_pedra',
    title: 'A Voz na Pedra',
    goal: 'Tem alguem gritando abaixo da marca. Siga o som e tire essa pessoa de la.',
    requires: ['npc_jonas'],
    onDone: 'Jonas subiu — e deixou as toupeiras dele com voce.',
    rewardMoney: 250,
    rewardPoints: 1,
  },
  {
    id: 'm3_a_primeira_barreira',
    title: 'A Primeira Barreira',
    goal: 'A parede que Jonas descreveu tem guarda. Derrube a Mae dos Esporos.',
    requires: ['boss_golem_escombros', 'gate_stone'],
    onDone: 'A parede cedeu junto com ela. Alguem colocou aquilo ali de proposito.',
    rewardMoney: 350,
    rewardPoints: 1,
  },
  {
    id: 'm3b_trilhos_novos',
    title: 'Trilhos Novos',
    goal: 'Ha trilho remendado com solda nova numa mina fechada ha quatorze anos. Ache e veja com os proprios olhos.',
    requires: ['clue_trilhos'],
    onDone: 'Alguem consertou aquilo este ano. A companhia jura que nao ha ninguem la embaixo.',
    rewardMoney: 300,
    rewardPoints: 1,
  },
  {
    id: 'm3c_posto_nove',
    title: 'Posto Nove',
    goal: 'Os trilhos levam a algum lugar. Siga a linha e descubra quem mora no fim dela.',
    requires: ['rui_cabeca'],
    onDone: 'Rui Cabeca. Mora aqui com a irma e um gato. E fala de lanternas azuis mais fundo.',
    rewardMoney: 450,
    rewardPoints: 1,
  },
  {
    id: 'm4_o_segundo_selo',
    title: 'O Segundo Selo',
    goal: 'A coisa na parede dos 194 m e o que Rui falou. Derrube a Matriarca de Cristal.',
    requires: ['boss_arauto_quartzo', 'gate_crystal'],
    onDone: 'Duas barreiras, dois guardioes. Isto nao e coincidencia geologica.',
    rewardMoney: 900,
    rewardPoints: 2,
  },
  {
    id: 'm4b_a_base_do_cristal',
    title: 'A Base do Cristal',
    goal: 'Ha uma camara abandonada a 236 m, na coluna oeste, com um refinador velho ainda de pe. Va ate la e erga o Deposito Bruto: as toupeiras param de subir 236 metros e passam a entregar ali.',
    requires: ['base_cristal:deposito'],
    onDone: 'A base respira. Daqui para baixo, o minerio nao sobe mais nas costas de ninguem.',
    rewardMoney: 700,
    rewardPoints: 2,
  },
  {
    id: 'm5_luzes_abaixo',
    title: 'Luzes Abaixo',
    goal: 'Tem outra voz nas Cavernas de Cristal. E a Pagina 01 do caderno, a 230 m.',
    requires: ['npc_vilma', 'clue_pagina_01'],
    onDone: 'Tres pulsos longos, dois curtos. John ouviu isso primeiro.',
    rewardMoney: 600,
    rewardPoints: 1,
  },
  {
    id: 'm6_a_rota_comercial',
    title: 'A Rota Comercial',
    goal: 'A Rainha Escavadora bloqueia a passagem aos 494 m. Abra o caminho.',
    requires: ['boss_automato_enferrujado', 'gate_minerals'],
    onDone: 'Uma rota comercial, fechada por dentro. Por quem vive do outro lado.',
    rewardMoney: 1800,
    rewardPoints: 2,
  },
  {
    id: 'm7_onze_dias',
    title: 'Onze Dias',
    goal: 'Nas Profundezas Minerais tem mais um preso e a Pagina 02, a 560 m.',
    requires: ['npc_teo', 'clue_pagina_02'],
    onDone: 'Teo vendeu corda e polvora para o OUTRO. Santiago passou depois.',
    rewardMoney: 1200,
    rewardPoints: 2,
  },
  {
    id: 'm8_pedra_que_nao_e_pedra',
    title: 'Pedra Que Nao E Pedra',
    goal: 'O Escaravelho Colossal guarda os 894 m. Passe por ele.',
    requires: ['boss_fundidor_incandescente', 'gate_magma'],
    onDone: 'Daqui para baixo, a parede deixa de ser escavada.',
    rewardMoney: 3200,
    rewardPoints: 3,
  },
  {
    id: 'm9_o_som_no_metal',
    title: 'O Som no Metal',
    goal: 'Na Zona de Magma tem alguem chamando, e a Pagina 04 a 940 m.',
    requires: ['npc_ozias', 'clue_pagina_04'],
    onDone: 'Ele nao desceu COM o John. Desceu ATRAS dele.',
    rewardMoney: 2400,
    rewardPoints: 2,
  },
  {
    id: 'm10_a_ultima_rota',
    title: 'A Ultima Rota Humana',
    goal: 'O Colosso Prismatico fecha os 1294 m. Derrube e desca.',
    requires: ['boss_escriba_selado', 'gate_ruins'],
    onDone: 'Abaixo daqui nao ha mais cidade nenhuma para colocar guardiao.',
    rewardMoney: 5200,
    rewardPoints: 3,
  },
  {
    id: 'm11_a_trilha_baixa',
    title: 'A Trilha Baixa',
    goal: 'Nas Ruinas Antigas tem um batedor preso, e a Pagina 07 a 1340 m.',
    requires: ['npc_braga', 'clue_pagina_07'],
    onDone: 'Marcas na altura do joelho. Quem as fez estava arrastando uma perna.',
    rewardMoney: 4000,
    rewardPoints: 3,
  },
  {
    id: 'm12_a_porta',
    title: 'A Porta',
    goal: 'O Eco do Portal guarda os 1694 m. O que houver depois dele, Santiago ja viu.',
    requires: ['boss_eco_portal', 'gate_abyss'],
    onDone: 'A mina acabou. A historia nao.',
    rewardMoney: 9000,
    rewardPoints: 5,
  },
  {
    id: 'm13_quem_ainda_fala',
    title: 'Quem Ainda Fala',
    goal: 'No Abismo alguem ainda responde. E a Pagina 10 esta a 1740 m.',
    requires: ['npc_ultima_luz', 'clue_pagina_10'],
    onDone: 'Um carregou o outro para cima. Depois voltou sozinho.',
    rewardMoney: 6500,
    rewardPoints: 4,
  },
];
