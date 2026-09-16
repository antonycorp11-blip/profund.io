import type { DialogLine } from './story';

/**
 * Os moradores de Blockia (BIBLIA.md 6.1).
 *
 * Regra de escrita da biblia, principio 2: eles falam como gente que tem
 * trabalho, familia e opiniao propria — nao como quiosque de servico. E
 * principio 6: quem pergunta da superficie ouve respostas diferentes de cada
 * um, porque eles discordam entre si sobre ficar.
 *
 * `col` e `depthOffset` sao relativos a caverna da cidade (CONFIG.blockia):
 * col 0 = parede esquerda, depthOffset 0 = teto.
 */
export interface CityNpcDef {
  id: string;
  name: string;
  /** Funcao, exibida embaixo do nome. */
  role: string;
  /** Coluna dentro da caverna, 0 = col0 de CONFIG.blockia. */
  col: number;
  /** Linhas abaixo do topo da caverna. */
  depthOffset: number;
  /** Cor do balao e da silhueta enquanto nao ha arte. */
  color: string;
  /** Primeira conversa. */
  lines: DialogLine[];
  /** Depois da primeira, alterna entre estas. */
  idleLines: string[];
  /** Ganho de confianca na primeira conversa. */
  trust: number;
}

export const BLOCKIA_NPCS: CityNpcDef[] = [
  {
    id: 'mara_avelar',
    name: 'Mara Avelar',
    role: 'Primeira Lanterna',
    col: 52,
    depthOffset: 96,
    color: '#ffc453',
    trust: 5,
    lines: [
      { speaker: 'Mara', text: 'Antes que pergunte: sim, sabemos onde fica a superficie. Nao, nao estamos presos.' },
      { speaker: 'Elias', text: 'Eu nao ia...' },
      { speaker: 'Mara', text: 'Ia. Todo mundo de cima pergunta.' },
      { speaker: 'Elias', text: 'Meu pai passou por aqui?' },
      { speaker: 'Mara', text: 'Santiago. Passou.' },
      { speaker: 'Elias', text: 'Quando?' },
      { speaker: 'Mara', text: 'Quatorze anos atras. E nao veio procurar minerio.' },
      { speaker: 'Mara', text: 'Fala com o Afonso. Ele guarda o que seu pai escreveu nas margens.' },
    ],
    idleLines: [
      'Nossos avos ficaram porque nao conseguiam sair. Eu fico porque esta e minha casa.',
      'Seu pai chegou aqui querendo permissao. Quando dissemos nao, ele foi mesmo assim.',
      'Nenhuma lei acima de quem vive abaixo. E so isso.',
    ],
  },
  {
    id: 'silas_arcos',
    name: 'Silas Arcos',
    role: 'Ferreiro',
    col: 16,
    depthOffset: 100,
    color: '#c0713a',
    trust: 3,
    lines: [
      { speaker: 'Silas', text: 'Deixa eu ver essa picareta.' },
      { speaker: 'Silas', text: '(vira nas maos) Boa liga. Cabo errado pro seu braco.' },
      { speaker: 'Elias', text: 'Da pra consertar?' },
      { speaker: 'Silas', text: 'Da pra consertar quase tudo. O caro e querer.' },
    ],
    idleLines: [
      'A ferramenta precisa conversar com a mao. Maquina nao conversa, obedece.',
      'Nem tudo que pesa cabe na balanca.',
    ],
  },
  {
    id: 'nina_candeia',
    name: 'Nina Candeia',
    role: 'Mercado da Ponte',
    col: 44,
    depthOffset: 72,
    color: '#9affd8',
    trust: 3,
    lines: [
      { speaker: 'Nina', text: 'Voce e o de cima. Ja sei seu nome antes de voce dizer.' },
      { speaker: 'Elias', text: 'Como?' },
      { speaker: 'Nina', text: 'O guarda falou. O guarda sempre fala. E por isso que eu sei de tudo.' },
    ],
    idleLines: [
      'Preco de corda subiu. Sempre sobe quando alguem decide descer.',
      'Se quiser saber de alguem, nao pergunta pra Lanterna. Pergunta pra mim.',
    ],
  },
  {
    id: 'breno_torga',
    name: 'Breno Torga',
    role: 'Mestre dos Elevadores',
    col: 84,
    depthOffset: 60,
    color: '#8cbef0',
    trust: 3,
    lines: [
      { speaker: 'Breno', text: 'Nao encosta nesse cabo.' },
      { speaker: 'Elias', text: 'Nao encostei.' },
      { speaker: 'Breno', text: 'Ainda. Todo mundo encosta.' },
    ],
    idleLines: [
      'Uma cidade vertical tem tres tipos de cidadao: quem usa elevador, quem conserta elevador e quem mente dizendo que prefere escada.',
      'Elevador parado e ofensa pessoal.',
    ],
  },
  {
    id: 'irene_salles',
    name: 'Dra. Irene Salles',
    role: 'Medica',
    col: 24,
    depthOffset: 52,
    color: '#ffffff',
    trust: 3,
    lines: [
      { speaker: 'Irene', text: 'Senta. Deixa eu ver essas maos.' },
      { speaker: 'Elias', text: 'Estou bem.' },
      { speaker: 'Irene', text: 'Todo mundo que desce esta bem. Depois nao esta.' },
    ],
    idleLines: [
      'Todo mundo acha que cidade subterranea vive de pedra. Vive de agua. Pedra so faz barulho.',
      'Nasci aqui. Nunca vi o ceu. Nao sinto falta do que nao conheco.',
    ],
  },
  {
    id: 'afonso_greda',
    name: 'Afonso Greda',
    role: 'Arquivista',
    col: 68,
    depthOffset: 40,
    color: '#d3b47d',
    trust: 4,
    lines: [
      { speaker: 'Afonso', text: 'Ramires. Eu esperava voce ha uns dez anos.' },
      { speaker: 'Elias', text: 'Voce guardou alguma coisa dele?' },
      { speaker: 'Afonso', text: 'Seu pai tinha o pessimo habito de escrever nas margens de mapas publicos.' },
      { speaker: 'Elias', text: 'Ele fazia isso em casa tambem.' },
      { speaker: 'Afonso', text: 'Otimo. Hereditariedade comprovada.' },
      { speaker: 'Afonso', text: '"John passou por aqui tres dias antes de mim. Comprou filtros, corda e polvora. Nao disse para onde ia."' },
      { speaker: 'Elias', text: 'Tres dias antes...' },
      { speaker: 'Afonso', text: 'Eu tambem fiz essa conta. Ela nao fecha com o que contaram la em cima, fecha?' },
    ],
    idleLines: [
      'Nao ficamos porque perdemos o caminho. Ficamos porque encontramos outro.',
      'Documento nao mente. Quem le e que decide o que entendeu.',
    ],
  },
  {
    id: 'lio',
    name: 'Lio',
    role: '11 anos',
    col: 58,
    depthOffset: 104,
    color: '#8c5ce0',
    trust: 2,
    lines: [
      { speaker: 'Lio', text: 'E verdade que o ceu nao tem teto?' },
      { speaker: 'Elias', text: 'Tecnicamente, tem. So fica muito longe.' },
      { speaker: 'Lio', text: 'Isso foi uma resposta de adulto.' },
    ],
    idleLines: [
      'Quando eu crescer, vou subir.',
      'Minha avo viu chuva uma vez. Disse que era agua caindo do teto sem teto.',
      'Voce ja viu uma estrela? Como ela e de perto?',
    ],
  },
];
