import { CREATURES } from './creatures';

/**
 * COVIS: o que sobrou dos guardioes precoces, agora como acontecimento solto.
 *
 * A Mae dos Esporos e a Matriarca de Cristal foram, por muitas levas, os dois
 * primeiros chefes de selo do jogo — aos 168 e aos 350 m. Sairam de la porque
 * a BIBLIA nao poe guardiao nenhum antes dos 420: guardiao existe porque uma
 * CIDADE o colocou para nao ser encontrada (2.2), e acima de Blockia nao ha
 * cidade nenhuma. Eles guardavam portas que ninguem trancou.
 *
 * Mas o bicho continua bom, a arte existe e a mecanica de chefe — furia,
 * investida, convocacao — ja esta escrita. Jogar isso fora seria jogar fora a
 * melhor luta dos primeiros quatrocentos metros por um problema de LUGAR.
 *
 * Entao eles mudam de categoria, e a diferenca nao e de tamanho, e de contrato:
 *
 *   CHEFE DE SELO   esta no seu caminho, e voce PRECISA matar para descer.
 *   COVIL           esta do lado do seu caminho, e ninguem te obriga a entrar.
 *
 * Por isso o covil nasce longe do poco principal: quem so desce nunca esbarra
 * nele. Quem cava de lado acha um lugar cheio de bicho com uma coisa grande no
 * meio — que e, de quebra, a "area super populosa de mobs" que faltava. O
 * primeiro chefe de verdade continua sendo a Rainha Escavadora aos 497.
 */
export interface EncounterDef {
  id: string;
  /** Criatura grande que mora no fundo do covil. */
  creatureId: string;
  /** Nome do LUGAR, nao do bicho — e ele que aparece no mapa. */
  lugar: string;
  /** Faixa de profundidade onde ele pode nascer. */
  minDepth: number;
  maxDepth: number;
  /**
   * Distancia minima do poco principal, em colunas.
   *
   * E a regra que separa covil de chefe. Sem ela, cavar reto para baixo — a
   * primeira coisa que qualquer jogador faz — cairia dentro do ninho, e um
   * encontro opcional que voce nao pode evitar e so um chefe mal sinalizado.
   */
  longeDoPocoCols: number;
  /** A ninhada que mora junto: o que faz o lugar parecer habitado. */
  ninhada: { creatureId: string; quantos: number };
  /** Uma linha ao entrar — o aviso de que da para dar meia volta. */
  aviso: string;
}

export const ENCOUNTERS: EncounterDef[] = [
  {
    id: 'covil_esporos',
    creatureId: 'boss_golem_escombros',
    lugar: 'Ninho de Esporos',
    /*
     * Fica na Camada de Pedra, entre o trilho remendado (216) e o Posto Nove
     * (278). E o trecho em que o jogador ja sabe cavar de lado e ainda nao tem
     * nada grande para provar a si mesmo.
     */
    minDepth: 190,
    maxDepth: 330,
    longeDoPocoCols: 26,
    ninhada: { creatureId: 'larva', quantos: 6 },
    aviso: 'O chao aqui e macio e respira. Da para voltar por onde veio.',
  },
  {
    id: 'covil_teias',
    creatureId: 'boss_arauto_quartzo',
    lugar: 'Teia da Matriarca',
    /*
     * Nas Cavernas de Cristal, acima da Rainha Escavadora. Quem entrar aqui
     * chega na rota comercial com equipamento melhor — que e exatamente o que
     * um desvio opcional deve pagar.
     */
    minDepth: 380,
    maxDepth: 480,
    longeDoPocoCols: 30,
    ninhada: { creatureId: 'aranha', quantos: 5 },
    aviso: 'Teia velha, grossa demais para uma aranha so. Da para voltar por onde veio.',
  },
];

/** O covil daquela criatura, se ela for dona de um. */
export function encounterOf(creatureId: string): EncounterDef | undefined {
  return ENCOUNTERS.find((e) => e.creatureId === creatureId);
}

/* Erro de digitacao em id de criatura viraria um covil vazio e silencioso. */
for (const e of ENCOUNTERS) {
  for (const id of [e.creatureId, e.ninhada.creatureId]) {
    if (!CREATURES.some((c) => c.id === id)) {
      throw new Error(`covil "${e.id}" aponta para a criatura "${id}", que nao existe.`);
    }
  }
}
