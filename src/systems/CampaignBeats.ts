import { Events } from '../core/events';
import { CONFIG } from '../data/config';
import { ENCONTROS, ZONE_TRIGGERS, type EncontroDef, type ZoneTriggerDef } from '../data/campaignBeats';
import type { Creature } from '../entities/Creature';

interface Host {
  hasFlag(id: string): boolean;
  /** Liga a flag, atualiza o objetivo e salva. */
  setFlag(id: string): void;
  spawn(id: string, x: number, y: number): Creature | null;
  contains(c: Creature): boolean;
  /** O lugar do gatilho foi visitado: o marcador dele vira "feito". */
  visitado(id: string): void;
}

/**
 * Os momentos da campanha que nao sao pista, resgate nem obra: chegar a um
 * lugar, e os encontros de historia (segurar o Posto Nove depois de acender o
 * gerador, limpar o ninho da cisterna de Blockia).
 *
 * Nao guarda estado proprio no save — tudo e flag de historia. A leva da
 * defesa vive so em memoria: recarregar no meio da luta chama uma leva nova
 * quando o jogador voltar ao posto, e ninguem sai no lucro nem no prejuizo.
 */
export class CampaignBeats {
  /** A leva viva de cada encontro, por id. */
  private levas = new Map<string, Creature[]>();

  constructor(
    private host: Host,
    private zones: readonly ZoneTriggerDef[] = ZONE_TRIGGERS,
    private encontros: readonly EncontroDef[] = ENCONTROS
  ) {}

  update(px: number, py: number): void {
    const ts = CONFIG.tileSize;
    const col = px / ts;
    const row = py / ts;
    for (const z of this.zones) {
      if (this.host.hasFlag(z.flag)) continue;
      if (z.requires && !this.host.hasFlag(z.requires)) continue;
      if (Math.hypot(col - (z.col + 0.5), row - (z.row + 0.5)) > z.raio) continue;
      this.host.setFlag(z.flag);
      this.host.visitado(z.id);
      Events.emit('ui:toast', { text: z.texto, tone: 'story' });
    }
    for (const e of this.encontros) this.encontro(e, col, row);
  }

  private encontro(d: EncontroDef, col: number, row: number): void {
    if (!this.host.hasFlag(d.requires) || this.host.hasFlag(d.flag)) return;
    const ts = CONFIG.tileSize;
    const meio = d.leva[Math.floor(d.leva.length / 2)].col;
    const perto = Math.hypot(col - meio, row - d.row) <= d.alcance;
    const leva = this.levas.get(d.id) ?? [];

    if (leva.length === 0) {
      if (!perto) return;
      for (const b of d.leva) {
        const c = this.host.spawn(b.id, (b.col + 0.5) * ts, (d.row + 0.5) * ts);
        if (!c) continue;
        c.permitidoNaCidade = !!d.naCidade;
        leva.push(c);
      }
      this.levas.set(d.id, leva);
      Events.emit('ui:toast', { text: d.inicio, tone: 'warn' });
      // Nenhum bicho coube (lugar soterrado por obra do jogador): o encontro
      // nao pode virar trava. Conta como vencido.
      if (leva.length === 0) this.vencer(d);
      return;
    }

    // Bicho que sumiu vivo: longe e despawn — a leva recomeca quando o
    // jogador voltar. Perto, e porque fugiu ou ficou preso — conta como
    // resolvido, senao um bicho entalado travaria a campanha.
    const sumiuVivo = leva.some((c) => c.alive && !this.host.contains(c));
    if (sumiuVivo && !perto) {
      this.levas.delete(d.id);
      return;
    }
    if (leva.every((c) => !c.alive || !this.host.contains(c))) this.vencer(d);
  }

  private vencer(d: EncontroDef): void {
    this.levas.delete(d.id);
    this.host.setFlag(d.flag);
    Events.emit('ui:toast', { text: d.fim, tone: 'story' });
  }
}
