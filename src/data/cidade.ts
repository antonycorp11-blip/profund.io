/**
 * O ESQUELETO DE UMA CIDADE SUBTERRANEA.
 *
 * Blockia foi a primeira, e foi escrita como codigo: um escavador proprio,
 * um renderizador proprio, coordenadas espalhadas em tres arquivos. Cada
 * ajuste mexia nos tres, e a cidade seguinte teria de copiar tudo. Aqui a
 * cidade e DADO: pisos, escadas, predios, agua, mobilia e moradores, numa
 * planta so. Quem escava (`world/cidade/escavar.ts`), quem desenha
 * (`world/cidade/CidadeRenderer.ts`) e as sondas leem a mesma planta.
 * Ferruria, Lumora e Vespera sao uma planta nova cada uma.
 *
 * COORDENADAS: `x` e a coluna a partir de `col0` da cidade (a borda oeste da
 * caverna); `pe` e a profundidade, em metros, da linha onde o jogador PISA —
 * o chao solido fica logo abaixo. Metro em vez de linha porque e assim que a
 * historia fala ("a ponte aos 628 m"), e porque o mundo pode mudar de
 * superficie sem a planta mudar.
 */

export type TipoPiso =
  /** Chao da caverna, lajeado. O que fica embaixo dele e rocha. */
  | 'pedra'
  /** Passarela de tabua sobre mao-francesa e pilar. Embaixo e vao. */
  | 'tabua'
  /** Laje de pedra lavrada presa na parede. */
  | 'balcao'
  /** Ponte de arcos de pedra, atravessando um vao. */
  | 'ponte';

export interface PisoDef {
  id: string;
  /** Nome do lugar, para mapa e sondas. */
  nome: string;
  x0: number;
  x1: number;
  pe: number;
  tipo: TipoPiso;
  /**
   * Chao da caverna (e nao passarela no alto). Embaixo do chao e rocha; e o
   * perfil dos pisos de chao que o escavador segue para abrir a caverna.
   */
  chao?: boolean;
  /**
   * De que lado a passarela se apoia na parede. Decide onde o desenho poe a
   * mao-francesa, e de que lado o guarda-corpo fica aberto para o vao.
   */
  encosto?: 'oeste' | 'leste';
}

/** Escada de mao vertical: de um piso para o de cima. */
export interface EscadaDef {
  x: number;
  /** Piso de baixo (onde ela se apoia) e piso de cima (ao lado de quem ela para). */
  de: string;
  para: string;
}

export type TipoPredio = 'casa' | 'guarita' | 'arquivo' | 'conselho' | 'clinica' | 'oficina' | 'forja';

export interface PredioDef {
  id: string;
  tipo: TipoPredio;
  piso: string;
  x: number;
  /** Largura e altura da fachada, em tiles. */
  w: number;
  h: number;
  /** Semente visual: muda janela, telhado e reboco sem mudar o tipo. */
  variante?: number;
  /** Letreiro pendurado (traduzido na tela). */
  placa?: string;
}

export interface PropDef {
  /** Peca de `public/art/<pasta>/<id>.png`, medida em `mapa.json`. */
  id: string;
  piso: string;
  x: number;
  /** Desenhar atras do jogador (fachada, barraca) ou na frente (caixote)? */
  fundo?: boolean;
  espelhado?: boolean;
}

export interface MoradorLugar {
  piso: string;
  x: number;
}

export interface AguaDef {
  x0: number;
  x1: number;
  /** Profundidade da superficie da agua e do fundo, em metros. */
  topo: number;
  fundo: number;
}

export interface CascataDef {
  x: number;
  de: number;
  ate: number;
}

/**
 * Sala escavada na parede, fora da caverna, com entrada por um piso.
 * Serve para a galeria alagada do arquivo e para o que vier depois.
 */
export interface SalaDef {
  id: string;
  /** Piso de onde se entra, e de que lado da caverna a sala fica. */
  piso: string;
  lado: 'oeste' | 'leste';
  largura: number;
  altura: number;
  /** Agua que enche a sala e tranca a entrada ate esta flag existir. */
  alagadaAte?: string;
}

export interface PonteQuebradaDef {
  piso: string;
  x0: number;
  x1: number;
  /** Flag que conserta o vao. */
  flag: string;
}

export interface ElevadorDef {
  x: number;
  /** Pisos onde ele para, de baixo para cima. */
  paradas: string[];
  /** Flag que o poe para funcionar. Sem ela, ele fica parado no fundo. */
  flag: string;
}

/** Alcapao no chao que leva para baixo da cidade. */
export interface SaidaDef {
  piso: string;
  x: number;
  largura: number;
  /** Profundidade ate onde o poco desce, em metros. */
  ate: number;
  flag: string;
}

export interface CidadePlanta {
  id: string;
  /** Borda oeste e leste da caverna, em colunas do mundo. */
  col0: number;
  col1: number;
  /** Profundidade do topo da abobada (no meio) e do fundo da caverna. */
  teto: number;
  fundo: number;
  /** A porta de entrada: coluna do mundo e piso onde ela abre. */
  porta: { col: number; piso: string };
  pisos: PisoDef[];
  escadas: EscadaDef[];
  predios: PredioDef[];
  props: PropDef[];
  moradores: Record<string, MoradorLugar>;
  agua: AguaDef[];
  cascatas: CascataDef[];
  salas: SalaDef[];
  ponteQuebrada?: PonteQuebradaDef;
  elevador?: ElevadorDef;
  saida?: SaidaDef;
  /** Pasta da arte e do `mapa.json` com o tamanho das pecas. */
  pastaArte: string;
}
