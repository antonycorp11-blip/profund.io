import { Events } from '../core/events';
import { CITIES } from '../data/cities';

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
    if (axis === 'trust') this.conferirPassagem(city);
  }

  /**
   * A CIDADE ENTREGA A PICARETA quando passa a confiar.
   *
   * E o momento em que a porta abre, e ele precisa ser um ACONTECIMENTO: nao
   * uma ferramenta que aparece no inventario, mas uma cidade decidindo que
   * voce pode descer. Por isso o evento e proprio, e nao um `ui:toast`.
   *
   * Uma vez so por cidade: confianca continua subindo depois, e a picareta nao
   * pode ser entregue de novo a cada ponto.
   */
  private entregues = new Set<CityId>();
  private conferirPassagem(city: CityId): void {
    if (this.entregues.has(city)) return;
    const def = CITIES.find((c) => c.id === city);
    if (!def) return;
    if (this.get(city).trust < def.trustToPass) return;
    this.entregues.add(city);
    Events.emit('city:passage', {
      city,
      name: def.name,
      pickaxeKey: def.pickaxeId,
      pickaxeName: def.pickaxeName,
    });
  }

  /** Ja recebeu a ferramenta daquela cidade? Usado pelo save e pela ficha. */
  temPassagem(city: CityId): boolean {
    return this.entregues.has(city);
  }

  toJSON(): ReputationSave {
    const out: ReputationSave = {};
    for (const [id, r] of this.cities) out[id] = { ...r };
    return out;
  }

  /*
   * A entrega e reconstituida do proprio dado ao carregar: quem ja tem
   * confianca suficiente ja recebeu. Assim o save nao precisa de campo novo, e
   * um save antigo com confianca alta nao recebe a picareta duas vezes.
   */
  restaurarEntregas(): void {
    for (const c of CITIES) {
      if (this.get(c.id).trust >= c.trustToPass) this.entregues.add(c.id);
    }
  }

  fromJSON(data: ReputationSave | undefined): void {
    if (!data) return;
    for (const [id, r] of Object.entries(data)) {
      this.cities.set(id as CityId, { trust: r.trust ?? 0, influence: r.influence ?? 0, legacy: r.legacy ?? 0 });
    }
  }
}
