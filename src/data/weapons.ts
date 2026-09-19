/**
 * Armas de fogo.
 *
 * A picareta deixou de ferir bicho: ela e ferramenta de TERRENO. Quem mata e a
 * arma. A troca nao e so de numero — ela muda o que a rocha significa. Com o
 * golpe corpo a corpo, chegar perto era obrigatorio e a parede era so entulho.
 * Com bala, a parede vira COBERTURA: o projetil para na pedra, entao cavar um
 * nicho e se enfiar nele passa a ser uma jogada.
 *
 * Cada arma e so dado. O que muda entre elas nao e "quanto dano" — e o
 * problema que ela resolve: a pistola acerta longe e economiza, a escopeta
 * limpa o que ja encostou em voce, o fuzil segura um corredor.
 */

import type { ResourceId } from './resources';

export type WeaponId = 'pistola' | 'escopeta' | 'fuzil';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  /**
   * Como a arma se chama NA ETIQUETA DO HUD, onde cabem duas palavras.
   *
   * `name` e nome de ficha e carrega a lore ("Revolver do Pai"); ao lado de
   * "Picareta", num canto de 852x393, ele vira uma linha comprida repetindo um
   * "do Pai" que o jogador ja sabe. A etiqueta so precisa dizer O QUE esta na
   * mao.
   */
  shortName: string;
  description: string;
  /** Frase do Santiago, para a ficha. */
  flavor: string;
  /** Dano por projetil. */
  damage: number;
  /** Tiros por segundo. */
  fireRate: number;
  /** Quantos projeteis saem por tiro (escopeta > 1). */
  pellets: number;
  /** Abertura do cone, em graus, por projetil. Zero = reta. */
  spreadDeg: number;
  /** Velocidade do projetil em px/s. */
  speed: number;
  /** Quantos metros o tiro percorre antes de sumir. */
  range: number;
  /** Quanto o projetil cai por segundo (0 = reto). */
  gravity: number;
  /** Quantas criaturas o mesmo projetil atravessa antes de morrer. */
  pierce: number;
  /** Empurrao no jogador a cada tiro, em px/s. */
  recoil: number;
  /**
   * O QUE ela come, e quanto por tiro (nao por projetil).
   *
   * As armas basicas atiram PEDRA — a mesma que ja enche a mochila e que nao
   * valia quase nada. Tres coisas se resolvem de uma vez: a pedra ganha uso,
   * a arma deixa de exigir uma viagem a base para funcionar, e ficar sem
   * municao passa a significar "vai minerar", que e o proprio jogo. Municao
   * fabricada continua existindo para as armas melhores, mais adiante.
   */
  ammo: ResourceId;
  ammoPerShot: number;
  /** Profundidade ja alcancada para aparecer na loja. */
  requiredDepth: number;
  /** Preco em moedas. */
  cost: number;
  /** Raio do desenho do projetil. */
  bulletSize: number;
  color: string;
  icon: string;
}

/**
 * Municao FABRICADA, para as armas melhores que ainda vao existir.
 *
 * As basicas comem pedra direto da mochila (ver `ammo` em cada arma). A
 * fabricada fica para quando a escopeta e o fuzil entrarem: ai a escolha
 * "gasto ferro em bala ou em obra?" tem peso, porque a arma que usa ela ja e
 * boa o bastante para valer a conta.
 */
export const AMMO: ResourceId = 'ammo_round';

export const WEAPONS: WeaponDef[] = [
  {
    id: 'pistola',
    /*
     * O REVOLVER DO PAI.
     *
     * Ele nao e comprado: estava na caixa que Helena nunca mexeu, junto da
     * picareta reserva (ver /data/prologue.ts). Um mineiro que guarda uma arma
     * ao lado da ferramenta sabia de alguma coisa la embaixo — e o jogador
     * carrega essa pergunta desde o primeiro minuto, sem que ninguem a
     * explique.
     *
     * Cospe PEDRA porque foi improvisado para a mina: la nao ha municao, ha
     * cascalho. E o que um homem sozinho faria.
     */
    name: 'Revolver do Pai',
    shortName: 'Revolver',
    description:
      'Estava na caixa, ao lado da picareta reserva. Cospe pedra — a mesma que ' +
      'enche a sua mochila. Acabou a pedra, volta a picareta.',
    flavor: 'Por que ele levaria isto para dentro de uma mina?',
    damage: 14,
    fireRate: 4.5,
    pellets: 1,
    spreadDeg: 2,
    speed: 620,
    range: 220,
    gravity: 0,
    pierce: 0,
    recoil: 40,
    ammo: 'stone',
    /*
     * UM QUINTO de pedra por tiro: cinco tiros por pedra.
     *
     * Custava DUAS pedras por tiro. Dez pedras na mochila davam cinco tiros, e
     * cinco tiros nao derrubam nada — a arma virava enfeite e o jogador
     * aprendia a nao usa-la. Uma pedra vira estilhaco para varios tiros, que e
     * como um cinturao de mineiro funcionaria.
     */
    ammoPerShot: 0.2,
    requiredDepth: 0,
    cost: 0,
    bulletSize: 3,
    color: '#ffd98a',
    icon: '🔫',
  },
];

export function weaponDef(id: WeaponId): WeaponDef {
  return WEAPONS.find((w) => w.id === id) ?? WEAPONS[0];
}
