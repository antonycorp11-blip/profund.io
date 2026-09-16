import { Events } from '../core/events';

export type CityId = 'blockia' | 'ferruria' | 'lumora' | 'vespera';

export interface CityRep {
  /** Quanto os moradores acreditam nas intencoes de Elias. */
  trust: number;
  /** Quanto os lideres aceitam suas propostas. */
  influence: number;
  /** Mudancas permanentes que o jogador provocou ali. */
  legacy: number;
}

export type ReputationSave = Partial<Record<CityId, CityRep>>;

/**
 * Reputacao por cidade (BIBLIA.md 7).
 *
 * Tres eixos separados de proposito: da para ser querido e nao ter poder
 * nenhum (confianca alta, influencia baixa), que e exatamente a situacao do
 * Elias quando chega em Blockia.
 *
 * Regra narrativa da biblia que o codigo precisa respeitar: **nenhuma escolha
 * bloqueia permanentemente a historia principal.** Reputacao muda tom, preco,
 * ajuda e rota secundaria — nunca fecha a campanha. Por isso nao ha nada aqui
 * que zere ou puna; so soma.
 */
export class Reputation {
  private cities = new Map<CityId, CityRep>();

  constructor() {
    Events.on('city:met', (p) => {
      this.add(p.city as CityId, 'trust', p.trust);
      Events.emit('ui:toast', { text: `${p.name} agora te conhece.`, tone: 'good' });
    });
  }

  get(city: CityId): CityRep {
    let r = this.cities.get(city);
    if (!r) {
      r = { trust: 0, influence: 0, legacy: 0 };
      this.cities.set(city, r);
    }
    return r;
  }

  add(city: CityId, axis: keyof CityRep, amount: number): void {
    if (amount === 0) return;
    const r = this.get(city);
    r[axis] += amount;
    Events.emit('rep:changed', { city, axis, value: r[axis] });
  }

  toJSON(): ReputationSave {
    const out: ReputationSave = {};
    for (const [id, r] of this.cities) out[id] = { ...r };
    return out;
  }

  fromJSON(data: ReputationSave | undefined): void {
    if (!data) return;
    for (const [id, r] of Object.entries(data)) {
      this.cities.set(id as CityId, { trust: r.trust ?? 0, influence: r.influence ?? 0, legacy: r.legacy ?? 0 });
    }
  }
}
