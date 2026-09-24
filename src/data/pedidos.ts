import type { DialogLine } from './story';
import type { MissionStepDef } from './missions';

/**
 * PEDIDOS: o que os moradores pedem por conta propria (BIBLIA 10).
 *
 * Nao sao a campanha. A campanha e uma fila so (`MISSIONS`), e um pedido
 * nela travaria o selo seguinte para quem nao quis fazer. Pedido e opcional:
 * o morador oferece na segunda conversa, o jogador aceita ouvindo, e a
 * cidade paga em confianca — o mesmo eixo que abre a Picareta dos
 * Fundadores, entao servir a cidade por fora tambem conta.
 *
 * Estado so em flags, como as missoes: `pedido_<id>_aceito` quando o morador
 * oferece, as flags dos passos (obras em /data/missionActions.ts), e
 * `pedido_<id>` quando fecha. O save nao precisou de campo novo.
 */
export interface PedidoDef {
  id: string;
  cidade: 'blockia';
  /** Quem pede. */
  npc: string;
  titulo: string;
  /** Uma linha: o que o morador quer, para o caderno. */
  resumo: string;
  /** O morador so oferece depois destas flags. */
  disponivelCom: string[];
  oferta: DialogLine[];
  passos: MissionStepDef[];
  conclusao: DialogLine[];
  /**
   * O que a BIBLIA 10 da a cada um. So o Lio paga confianca, o Afonso paga
   * influencia: pedido e opcional, e confianca e o eixo que abre a picareta.
   */
  recompensa: { moedas: number; confianca?: number; influencia?: number; pontos?: number };
  /** Anotacao que fica no caderno ao fechar (a carta do fundador, por exemplo). */
  anotacao?: { titulo: string; texto: string };
}

export const PEDIDOS: PedidoDef[] = [
  {
    id: 'ceu_de_lio',
    cidade: 'blockia',
    npc: 'lio',
    titulo: 'O Ceu de Lio',
    resumo: 'Lio quer um projetor de estrelas no teto da praca. Falta a lente.',
    disponivelCom: ['lio'],
    oferta: [
      { speaker: 'Lio', text: 'Voce ja viu uma estrela? Como ela e de perto?' },
      { speaker: 'Elias', text: 'Pequena. E longe. Mas sao muitas.' },
      { speaker: 'Lio', text: 'O Afonso diz que tem uma lente velha no fundo da galeria alagada. Com ela da pra fazer um projetor pro teto da caverna.' },
      { speaker: 'Lio', text: 'Traz a lente e um pouco de cristal? Eu sei montar. Mais ou menos.' },
    ],
    passos: [
      { id: 'lente', text: 'Ache a lente velha no fundo da galeria alagada.', requires: ['b1_lente'], markerId: 'acao_b1_lente' },
      { id: 'montar', text: 'Monte o projetor no Mercado (4 cristal, 6 cobre).', requires: ['b1_projetor'], markerId: 'acao_b1_projetor' },
    ],
    conclusao: [
      { speaker: 'Lio', text: 'Olha! Olha o teto!' },
      { speaker: 'Lio', text: 'Quando eu crescer, vou subir.' },
      { speaker: 'Mara', text: 'E depois vai voltar para reclamar que o sol e quente demais.' },
    ],
    recompensa: { moedas: 800, confianca: 1 },
  },
  {
    id: 'agua_nao_se_minera',
    cidade: 'blockia',
    npc: 'irene_salles',
    titulo: 'Agua Nao Se Minera',
    resumo: 'Irene quer raizes filtradoras na beira do reservatorio, para a agua nao parar.',
    disponivelCom: ['blockia_cisterna_limpa'],
    oferta: [
      { speaker: 'Irene', text: 'A cisterna esta limpa. Agora tem que ficar.' },
      { speaker: 'Irene', text: 'Limo volta onde a agua para. As raizes filtradoras da horta seguram a agua andando.' },
      { speaker: 'Irene', text: 'Colhe mudas na horta suspensa e planta na beira do reservatorio. Sem arrancar tudo — a horta tambem come.' },
    ],
    passos: [
      { id: 'mudas', text: 'Colha mudas de raiz filtradora na Horta Suspensa.', requires: ['b2_mudas'], markerId: 'acao_b2_mudas' },
      { id: 'plantar', text: 'Plante as raizes na beira do Reservatorio.', requires: ['b2_plantadas'], markerId: 'acao_b2_plantar' },
    ],
    conclusao: [
      { speaker: 'Irene', text: 'Agua que anda nao apodrece. Voce aprende rapido.' },
      { speaker: 'Irene', text: 'Todo mundo acha que cidade subterranea vive de pedra. Vive de agua. Pedra so faz barulho.' },
    ],
    recompensa: { moedas: 900, pontos: 1 },
  },
  {
    id: 'ultima_carta',
    cidade: 'blockia',
    npc: 'afonso_greda',
    titulo: 'A Ultima Carta',
    resumo: 'Afonso quer a carta do fundador que decidiu nunca mais subir.',
    disponivelCom: ['blockia_arquivo_concluido'],
    oferta: [
      { speaker: 'Afonso', text: 'Falta uma carta no arquivo. De um dos fundadores — o que decidiu nunca mais subir.' },
      { speaker: 'Afonso', text: 'Ele guardava as coisas num nicho da parede leste, no fim da passarela da forja. Ninguem tem coragem de mexer.' },
      { speaker: 'Elias', text: 'E voce quer que eu mexa.' },
      { speaker: 'Afonso', text: 'Quero que voce leia. Mexer e consequencia.' },
    ],
    passos: [
      { id: 'carta', text: 'Ache a carta do fundador no nicho da parede leste.', requires: ['b3_carta'], markerId: 'acao_b3_carta' },
      { id: 'afonso', text: 'Leve a carta ao Afonso.', requires: ['b3_entregue'], markerId: 'afonso_greda' },
    ],
    conclusao: [
      { speaker: 'Afonso', text: 'Obrigado. Agora o arquivo esta inteiro. Ou quase — arquivo nunca esta.' },
      { speaker: 'Afonso', text: 'Documento nao mente. Quem le e que decide o que entendeu.' },
    ],
    recompensa: { moedas: 700, influencia: 1 },
    anotacao: {
      titulo: 'A carta do fundador',
      texto: '"Deixo registrado para quem vier: nao ficamos porque perdemos o caminho. Ficamos porque encontramos outro."',
    },
  },
  {
    id: 'elevador_3b',
    cidade: 'blockia',
    npc: 'breno_torga',
    titulo: 'Elevador 3-B',
    resumo: 'O elevador leste travou no meio do poco, com gente dentro.',
    disponivelCom: ['blockia_elevador_religado'],
    oferta: [
      { speaker: 'Breno', text: 'O elevador parou de novo. No meio. Com gente dentro.' },
      { speaker: 'Elias', text: 'Gente?' },
      { speaker: 'Breno', text: 'A mae do Lio e dois sacos de farinha. A farinha nao reclama.' },
      { speaker: 'Breno', text: 'O freio travou. Solta o freio no sarilho e troca o pino — doze de ferro. Se alguem disser que escada e mais confiavel, eu mesmo jogo no poco.' },
    ],
    passos: [
      { id: 'freio', text: 'Solte o freio do elevador no sarilho da Forja (12 ferro).', requires: ['b4_freio'], markerId: 'acao_b4_freio' },
      { id: 'breno', text: 'Conte ao Breno.', requires: ['b4_contado'], markerId: 'breno_torga' },
    ],
    conclusao: [
      { speaker: 'Breno', text: 'Desceu inteira. A farinha tambem.' },
      { speaker: 'Breno', text: 'Toma. O desenho do freio novo. Se um dia voce montar elevador la em cima, monta direito.' },
    ],
    recompensa: { moedas: 1000, pontos: 1 },
  },
  {
    id: 'ferramenta_de_silas',
    cidade: 'blockia',
    npc: 'silas_arcos',
    titulo: 'Ferramenta de Silas',
    resumo: 'Silas quer de volta a picareta do mestre dele, perdida abaixo da Saida Inferior.',
    disponivelCom: ['passagem_blockia'],
    oferta: [
      { speaker: 'Silas', text: 'Meu mestre desceu pela saida inferior quando eu era aprendiz. Voltou sem a picareta dele.' },
      { speaker: 'Silas', text: 'Ficou na camara de baixo. Nao vale dinheiro.' },
      { speaker: 'Elias', text: 'Entao por que arriscar por ela?' },
      { speaker: 'Silas', text: 'Porque nem tudo que pesa cabe na balanca.' },
    ],
    passos: [
      { id: 'picareta', text: 'Ache a picareta do mestre na camara abaixo da Saida Inferior.', requires: ['b5_picareta'], markerId: 'acao_b5_picareta' },
      { id: 'silas', text: 'Devolva a picareta ao Silas.', requires: ['b5_devolvida'], markerId: 'silas_arcos' },
    ],
    conclusao: [
      { speaker: 'Silas', text: 'Cabo errado pro seu braco, eu disse uma vez. Esta aqui e do tamanho certo.' },
      { speaker: 'Silas', text: 'Deixa eu passar a sua na pedra de amolar dele. Quem cava com duas picaretas na memoria cava melhor.' },
    ],
    recompensa: { moedas: 1200, pontos: 2 },
  },
];

export const aceitoDe = (id: string) => `pedido_${id}_aceito`;
export const feitoDe = (id: string) => `pedido_${id}`;
