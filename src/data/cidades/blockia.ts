import { CONFIG } from '../config';
import type { CidadePlanta } from '../cidade';

/**
 * BLOCKIA — a planta (BIBLIA 6.1): "um formigueiro humano".
 *
 * A versao anterior eram duas pilhas de terraco de tabua iguais, ligadas por
 * escada de mao, com a mesma parede de tijolo em tudo e lampiao como bloco
 * amarelo. Jogava — a sonda provava que dava para andar em tudo — mas nao
 * lia como cidade: nao havia BAIRRO, nenhum lugar tinha funcao, e o que
 * dizia "aqui mora gente" era a pintura de fundo, nao o chao onde se pisa.
 *
 * Agora a caverna e dividida pelo que acontece em cada parte:
 *
 *   - EMBAIXO, de oeste para leste: a Guarita (onde a Mara atende a porta), o
 *     Mercado da Ponte, o Reservatorio com a cascata e a cisterna, a Casa de
 *     Saude da Irene, e a Forja do Silas com o alcapao da Saida Inferior e o
 *     pe do elevador leste.
 *   - A OESTE, o Bairro das Tabuas: passarelas presas na parede, casas, a
 *     bomba da galeria alagada e, no alto, o Arquivo do Afonso.
 *   - A LESTE, o Bairro da Rocha: balcoes de pedra e passarelas, a oficina do
 *     Breno e, no topo, a Casa do Conselho.
 *   - NO ALTO, a Ponte dos Arcos liga os dois bairros por cima do
 *     reservatorio — quebrada no meio ate o Breno ter maos para consertar.
 *
 * Cada missao da cidade acontece num lugar que ela mesma construiu: a galeria
 * alagada fica atras da parede oeste, a ponte e a ponte, o elevador e o
 * elevador, a cisterna e o reservatorio. A planta e dado: quem escava, quem
 * desenha e as sondas leem daqui.
 *
 * Toda subida e por escada de mao vertical, encostada na PONTA do piso de
 * cima — nunca atravessando o piso (escada no meio do piso vira buraco onde
 * o jogador cai andando). `npm run cidade` anda pela cidade inteira a pe e
 * confere que todo piso, morador e acao e alcancavel.
 */
const cfg = CONFIG.blockia;

export const BLOCKIA_PLANTA: CidadePlanta = {
  id: 'blockia',
  col0: cfg.col0,
  col1: cfg.col1,
  teto: cfg.depth0,
  fundo: cfg.depth1,
  porta: { col: cfg.gateCol, piso: 'portao' },
  pastaArte: 'blockia',

  pisos: [
    // ---------------------------------------------------------- o chao ----
    { id: 'portao', chao: true, nome: 'Guarita', x0: 0, x1: 14, pe: 664, tipo: 'pedra' },
    { id: 'mercado', chao: true, nome: 'Mercado da Ponte', x0: 15, x1: 43, pe: 664, tipo: 'pedra' },
    { id: 'reservatorio', chao: true, nome: 'Reservatorio', x0: 44, x1: 57, pe: 664, tipo: 'tabua' },
    { id: 'clinica', chao: true, nome: 'Casa de Saude', x0: 58, x1: 65, pe: 664, tipo: 'pedra' },
    // Um degrau de um tile: o passo sobe sozinho.
    { id: 'degrau', chao: true, nome: 'Degrau da Forja', x0: 66, x1: 66, pe: 663, tipo: 'pedra' },
    { id: 'forja', chao: true, nome: 'Forja', x0: 67, x1: 100, pe: 662, tipo: 'pedra' },

    // ------------------------------------------- Bairro das Tabuas (oeste) --
    { id: 'oeste_1', nome: 'Passarela Baixa', x0: 0, x1: 22, pe: 652, tipo: 'tabua', encosto: 'oeste' },
    { id: 'oeste_2', nome: 'Passarela da Bomba', x0: 0, x1: 18, pe: 640, tipo: 'tabua', encosto: 'oeste' },
    { id: 'oeste_3', nome: 'Balcao do Arquivo', x0: 3, x1: 26, pe: 628, tipo: 'balcao', encosto: 'oeste' },

    // ------------------------------------------------------------ a ponte --
    { id: 'ponte', nome: 'Ponte dos Arcos', x0: 27, x1: 65, pe: 628, tipo: 'ponte' },

    // -------------------------------------------- Bairro da Rocha (leste) --
    { id: 'leste_1', nome: 'Passarela da Forja', x0: 70, x1: 100, pe: 650, tipo: 'tabua', encosto: 'leste' },
    { id: 'leste_2', nome: 'Balcao das Casas', x0: 74, x1: 100, pe: 639, tipo: 'balcao', encosto: 'leste' },
    { id: 'leste_3', nome: 'Passarela da Oficina', x0: 66, x1: 92, pe: 628, tipo: 'tabua', encosto: 'leste' },
    { id: 'leste_4', nome: 'Balcao do Conselho', x0: 76, x1: 100, pe: 614, tipo: 'balcao', encosto: 'leste' },
  ],

  escadas: [
    { x: 23, de: 'mercado', para: 'oeste_1' },
    { x: 19, de: 'oeste_1', para: 'oeste_2' },
    { x: 2, de: 'oeste_2', para: 'oeste_3' },
    { x: 69, de: 'forja', para: 'leste_1' },
    { x: 73, de: 'leste_1', para: 'leste_2' },
    { x: 93, de: 'leste_2', para: 'leste_3' },
    { x: 75, de: 'leste_3', para: 'leste_4' },
  ],

  predios: [
    { id: 'guarita', tipo: 'guarita', piso: 'portao', x: 3, w: 7, h: 7, placa: 'Guarita' },
    { id: 'clinica', tipo: 'clinica', piso: 'clinica', x: 58, w: 7, h: 7, placa: 'Casa de Saude' },
    { id: 'forja', tipo: 'forja', piso: 'forja', x: 70, w: 18, h: 8, placa: 'Forja' },
    { id: 'casa_o1a', tipo: 'casa', piso: 'oeste_1', x: 1, w: 8, h: 7, variante: 0 },
    { id: 'casa_o1b', tipo: 'casa', piso: 'oeste_1', x: 12, w: 7, h: 6, variante: 1 },
    { id: 'casa_o2', tipo: 'casa', piso: 'oeste_2', x: 8, w: 8, h: 7, variante: 2 },
    { id: 'arquivo', tipo: 'arquivo', piso: 'oeste_3', x: 5, w: 11, h: 9, placa: 'Arquivo' },
    { id: 'casa_l1a', tipo: 'casa', piso: 'leste_1', x: 75, w: 8, h: 7, variante: 3 },
    { id: 'casa_l1b', tipo: 'casa', piso: 'leste_1', x: 84, w: 7, h: 7, variante: 4 },
    { id: 'casa_l2a', tipo: 'casa', piso: 'leste_2', x: 76, w: 8, h: 7, variante: 5 },
    { id: 'casa_l2b', tipo: 'casa', piso: 'leste_2', x: 85, w: 7, h: 6, variante: 6 },
    { id: 'oficina', tipo: 'oficina', piso: 'leste_3', x: 78, w: 10, h: 7, placa: 'Elevadores' },
    { id: 'conselho', tipo: 'conselho', piso: 'leste_4', x: 79, w: 15, h: 11, placa: 'Conselho das Lanternas' },
  ],

  props: [
    // Mercado da Ponte
    { id: 'barraca_horta', piso: 'mercado', x: 15.5, fundo: true },
    { id: 'barraca_ferragem', piso: 'mercado', x: 25, fundo: true },
    { id: 'barraca_padaria', piso: 'mercado', x: 31.5, fundo: true },
    { id: 'fonte', piso: 'mercado', x: 38 },
    { id: 'banco', piso: 'portao', x: 11.5 },
    { id: 'engradados', piso: 'portao', x: 0.5 },
    // Reservatorio: a cisterna no fundo, a valvula na passarela.
    { id: 'cisterna', piso: 'reservatorio', x: 44.5, fundo: true },
    { id: 'registro', piso: 'reservatorio', x: 47.5, fundo: true },
    { id: 'valvula', piso: 'reservatorio', x: 54.5, fundo: true },
    // Forja do Silas
    { id: 'forja_fornalha', piso: 'forja', x: 71, fundo: true },
    { id: 'forja_fogo', piso: 'forja', x: 76.2, fundo: true },
    { id: 'forja_bigorna', piso: 'forja', x: 81.4, fundo: true },
    { id: 'sarilho', piso: 'forja', x: 91.6, fundo: true },
    { id: 'barris', piso: 'clinica', x: 63.4 },
    // Bairro das Tabuas
    { id: 'varal', piso: 'oeste_1', x: 9.2, fundo: true },
    { id: 'vasos', piso: 'oeste_1', x: 19.9 },
    { id: 'bomba', piso: 'oeste_2', x: 3.4 },
    { id: 'balde', piso: 'oeste_2', x: 5.6 },
    { id: 'prateleira', piso: 'oeste_3', x: 16.2, fundo: true },
    { id: 'escrivaninha', piso: 'oeste_3', x: 22.5 },
    // Bairro da Rocha
    { id: 'mesa', piso: 'leste_1', x: 92.5 },
    { id: 'cestos', piso: 'leste_2', x: 94.5 },
    { id: 'contrapeso', piso: 'leste_3', x: 88.4, fundo: true },
    { id: 'caixa_ferramenta', piso: 'leste_3', x: 67.2 },
    { id: 'poste_lanterna', piso: 'leste_4', x: 76.2, fundo: true },
  ],

  moradores: {
    mara_avelar: { piso: 'portao', x: 12 },
    nina_candeia: { piso: 'mercado', x: 42 },
    irene_salles: { piso: 'clinica', x: 65 },
    silas_arcos: { piso: 'forja', x: 86 },
    afonso_greda: { piso: 'oeste_3', x: 19 },
    breno_torga: { piso: 'leste_3', x: 71 },
    lio: { piso: 'leste_1', x: 90 },
  },

  agua: [{ x0: 44, x1: 57, topo: 666, fundo: 669 }],
  cascatas: [{ x: 51, de: 598, ate: 666 }],

  salas: [
    {
      id: 'galeria',
      piso: 'oeste_2',
      lado: 'oeste',
      largura: 12,
      altura: 5,
      alagadaAte: 'blockia_galeria_drenada',
    },
  ],

  ponteQuebrada: { piso: 'ponte', x0: 45, x1: 51, flag: 'blockia_ponte_reparada' },
  elevador: { x: 98, paradas: ['forja', 'leste_1', 'leste_2', 'leste_4'], flag: 'blockia_elevador_religado' },
  saida: { piso: 'forja', x: 88, largura: 3, ate: 680, flag: 'passagem_blockia' },
};
