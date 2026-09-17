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
  /** Municao gasta por TIRO (nao por projetil). */
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
 * A municao e UMA so para todas as armas.
 *
 * Tres tipos de bala seria realismo comprado com atrito: o jogador passaria a
 * conferir tres numeros antes de descer, e trocar de arma viraria uma conta em
 * vez de uma escolha. Um calibre, e o que separa as armas e quanto cada tiro
 * come dele.
 */
export const AMMO: ResourceId = 'ammo_round';

export const WEAPONS: WeaponDef[] = [
  {
    id: 'pistola',
    name: 'Pistola de Ferro',
    description:
      'Feita na bancada da base, com o ferro que voce mesmo tirou. Um tiro, uma bala, ' +
      'e a mao livre para a picareta.',
    flavor: 'Nao e bonita. Mas ja me tirou de dois buracos.',
    damage: 14,
    fireRate: 4.5,
    pellets: 1,
    spreadDeg: 2,
    speed: 620,
    range: 220,
    gravity: 0,
    pierce: 0,
    recoil: 40,
    ammoPerShot: 1,
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
