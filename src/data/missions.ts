/**
 * Missoes da campanha.
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
    id: 'm1_a_voz_na_pedra',
    title: 'A Voz na Pedra',
    goal: 'Alguem esta gritando por socorro la embaixo. Siga a voz e tire essa pessoa de la.',
    requires: ['npc_jonas'],
    onDone: 'Jonas subiu. E avisou: mais fundo tem uma parede que picareta nao arranha.',
    rewardMoney: 250,
    rewardPoints: 1,
  },
  {
    id: 'm2_marcas_na_pedra',
    title: 'Marcas na Pedra',
    goal: 'Santiago deixou uma marca na galeria antiga. Encontre.',
    requires: ['clue_marca_do_pai'],
    onDone: 'A marca aponta para baixo. Ele nao estava marcando a volta.',
    rewardMoney: 200,
    rewardPoints: 1,
  },
  {
    id: 'm2b_a_primeira_barreira',
    title: 'A Primeira Barreira',
    goal: 'A parede que Jonas descreveu tem guarda. Derrube a Mae dos Esporos.',
    requires: ['boss_golem_escombros', 'gate_stone'],
    onDone: 'A parede cedeu junto com ela. Alguem colocou aquilo ali de proposito.',
    rewardMoney: 350,
    rewardPoints: 1,
  },
  {
    id: 'm3_luzes_abaixo',
    title: 'Luzes Abaixo',
    goal: 'Resgate Vilma e recupere a Pagina 01 do caderno nas Cavernas de Cristal',
    requires: ['npc_vilma', 'clue_pagina_01'],
    onDone: 'Tres pulsos longos, dois curtos. John ouviu isso primeiro.',
    rewardMoney: 600,
    rewardPoints: 1,
  },
  {
    id: 'm4_o_segundo_selo',
    title: 'O Segundo Selo',
    goal: 'Derrube a Matriarca de Cristal e abra a passagem para as Profundezas Minerais',
    requires: ['boss_arauto_quartzo', 'gate_crystal'],
    onDone: 'Duas barreiras, dois guardioes. Isto nao e coincidencia geologica.',
    rewardMoney: 900,
    rewardPoints: 2,
  },
  {
    id: 'm5_onze_dias',
    title: 'Onze Dias',
    goal: 'Resgate Teo e recupere a Pagina 02 nas Profundezas Minerais',
    requires: ['npc_teo', 'clue_pagina_02'],
    onDone: 'Teo vendeu corda e polvora para o OUTRO. Santiago passou depois.',
    rewardMoney: 1200,
    rewardPoints: 2,
  },
  {
    id: 'm6_a_rota_comercial',
    title: 'A Rota Comercial',
    goal: 'A Rainha Escavadora bloqueia a rota. Abra o caminho.',
    requires: ['boss_automato_enferrujado', 'gate_minerals'],
    onDone: 'Uma rota comercial. Fechada por dentro. Por quem vive do outro lado.',
    rewardMoney: 1800,
    rewardPoints: 2,
  },
  {
    id: 'm7_o_som_no_metal',
    title: 'O Som no Metal',
    goal: 'Resgate Ozias e recupere a Pagina 04 na Zona de Magma',
    requires: ['npc_ozias', 'clue_pagina_04'],
    onDone: 'Ele nao desceu COM o John. Desceu ATRAS dele.',
    rewardMoney: 2400,
    rewardPoints: 2,
  },
  {
    id: 'm8_pedra_que_nao_e_pedra',
    title: 'Pedra Que Nao E Pedra',
    goal: 'Vença o Escaravelho Colossal e alcance as Ruinas Antigas',
    requires: ['boss_fundidor_incandescente', 'gate_magma'],
    onDone: 'Daqui para baixo, a parede deixa de ser escavada.',
    rewardMoney: 3200,
    rewardPoints: 3,
  },
  {
    id: 'm9_a_trilha_baixa',
    title: 'A Trilha Baixa',
    goal: 'Resgate Braga e recupere a Pagina 07 nas Ruinas Antigas',
    requires: ['npc_braga', 'clue_pagina_07'],
    onDone: 'Marcas na altura do joelho. Quem as fez estava arrastando uma perna.',
    rewardMoney: 4000,
    rewardPoints: 3,
  },
  {
    id: 'm10_a_ultima_rota',
    title: 'A Ultima Rota Humana',
    goal: 'Derrote o Colosso Prismatico e desca para o Abismo',
    requires: ['boss_escriba_selado', 'gate_ruins'],
    onDone: 'Abaixo daqui nao ha mais cidade nenhuma para colocar guardiao.',
    rewardMoney: 5200,
    rewardPoints: 3,
  },
  {
    id: 'm11_a_voz',
    title: 'Quem Ainda Fala',
    goal: 'Encontre quem ainda fala no Abismo e recupere a Pagina 10',
    requires: ['npc_ultima_luz', 'clue_pagina_10'],
    onDone: 'Um carregou o outro para cima. Depois voltou sozinho.',
    rewardMoney: 6500,
    rewardPoints: 4,
  },
  {
    id: 'm12_a_porta',
    title: 'A Porta',
    goal: 'Vença o Eco do Portal. O que houver depois dele, Santiago ja viu.',
    requires: ['boss_eco_portal', 'gate_abyss'],
    onDone: 'A mina acabou. A historia nao.',
    rewardMoney: 9000,
    rewardPoints: 5,
  },
];
