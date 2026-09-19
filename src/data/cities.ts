import type { CityId } from '../systems/Reputation';

/**
 * AS CIDADES SAO PORTEIRAS, e a picareta e a chave.
 *
 * A regra do mundo, que nenhum personagem explica ate muito tarde: abaixo de
 * cada cidade a rocha so cede a ferramenta DAQUELA cidade. Ninguem sabe por
 * que — as cidades herdaram a regra e a transformaram em politica.
 *
 * E e por isso que elas nao querem visitante. Nao e xenofobia gratuita: quem
 * desce precisa da ferramenta delas, a ferramenta so sai com a confianca
 * delas, e confiar em alguem que vai embora e gastar confiança com quem nao
 * fica. As cidades mais fundas existem porque gente que nao foi aceita
 * continuou descendo — e fundou a propria.
 *
 * Santiago passou por tudo isto. Cada cidade que barra o Elias ja barrou o pai
 * dele, e em cada uma ha quem lembre.
 *
 * MECANICAMENTE isto reaproveita o que o jogo ja tinha: blocos exigem nivel de
 * ferramenta (`minTool`). A novidade e o PISO POR PROFUNDIDADE — abaixo da
 * cota de uma cidade, toda rocha passa a exigir o nivel dela, por mais mole
 * que a rocha seja. A parede nao fica mais dura: ela fica fechada.
 */
export interface CityDef {
  id: CityId;
  name: string;
  /** Profundidade da cidade, em metros. */
  depth: number;
  /**
   * Nivel de ferramenta exigido ABAIXO dela.
   *
   * O mesmo numero da picareta que ela entrega. Quem nao a tem nao passa.
   */
  toolTier: number;
  /** A picareta que a cidade entrega quando confia em voce. */
  pickaxeId: string;
  pickaxeName: string;
  /** Quanta confianca a cidade pede antes de entregar a ferramenta. */
  trustToPass: number;
  /** O que o jogador le quando a rocha nao cede. */
  wallLine: string;
  /**
   * A cidade EXISTE no mundo hoje?
   *
   * A regra da picareta so pode valer para cidade que da para visitar. Blockia
   * existe; as outras tres estao desenhadas na biblia e ainda nao construidas.
   *
   * Sem esta marca, a porteira de Ferruria trancaria o jogo aos 980 m sem
   * saida nenhuma — o jogador precisaria de uma ferramenta que nenhuma cidade
   * pode entregar porque a cidade nao existe. O plano inteiro fica escrito
   * aqui, e cada cidade passa a valer no dia em que for construida.
   */
  implementada: boolean;
}

export const CITIES: CityDef[] = [
  {
    id: 'blockia',
    name: 'Blockia',
    depth: 600,
    toolTier: 4,
    pickaxeId: 'pick_fundadores',
    pickaxeName: 'Picareta dos Fundadores',
    /*
     * DOZE de vinte e tres.
     *
     * Blockia da 23 de confianca no total, espalhados pelos sete moradores. Um
     * limiar de 3 era uma conversa — falar com a Mara e descer. Doze obriga a
     * atravessar a cidade, achar gente, e (quando as missoes da cidade
     * existirem) fazer o que elas pedem. E o que transforma "passei por
     * Blockia" em "Blockia me aceitou".
     */
    trustToPass: 12,
    wallLine: 'Abaixo de Blockia a pedra so cede a Picareta dos Fundadores.',
    implementada: true,
  },
  {
    id: 'ferruria',
    name: 'Ferruria',
    depth: 980,
    toolTier: 5,
    pickaxeId: 'pick_ferruria',
    pickaxeName: 'Marreta de Ferruria',
    trustToPass: 3,
    implementada: false,
    wallLine: 'Abaixo de Ferruria a pedra so cede a Marreta de Ferruria.',
  },
  {
    id: 'lumora',
    name: 'Lumora',
    depth: 1380,
    toolTier: 6,
    pickaxeId: 'pick_lumora',
    pickaxeName: 'Diapasao de Lumora',
    trustToPass: 3,
    implementada: false,
    wallLine: 'Abaixo de Lumora a pedra so cede ao Diapasao de Lumora.',
  },
  {
    id: 'vespera',
    name: 'Vespera',
    depth: 1720,
    toolTier: 7,
    pickaxeId: 'pick_vespera',
    pickaxeName: 'Chave de Vespera',
    trustToPass: 3,
    implementada: false,
    wallLine: 'Abaixo de Vespera a pedra so cede a Chave de Vespera.',
  },
];

/**
 * Nivel de ferramenta que a PROFUNDIDADE exige, sozinha.
 *
 * Devolve 0 acima da primeira cidade: ali a rocha cobra so o que ela mesma
 * pede, e o jogo inteiro dos primeiros 600 m continua funcionando como antes.
 */
export function toolFloorAt(depth: number): number {
  let piso = 0;
  for (const c of CITIES) {
    // Cidade que ainda nao existe nao tranca nada: ela nao teria como
    // destrancar.
    if (!c.implementada) continue;
    if (depth > c.depth) piso = Math.max(piso, c.toolTier);
  }
  return piso;
}

/** A cidade que manda naquela profundidade, ou null acima da primeira. */
export function cityGatingAt(depth: number): CityDef | null {
  let dona: CityDef | null = null;
  for (const c of CITIES) {
    if (!c.implementada) continue;
    if (depth > c.depth) dona = c;
  }
  return dona;
}
