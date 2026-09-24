import { Events } from '../core/events';
import { CONFIG } from '../data/config';
import { POSTO_DEFESA, ZONE_TRIGGERS, type ZoneTriggerDef } from '../data/campaignBeats';
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
 * lugar, e segurar o Posto Nove depois de acender o gerador.
 *
 * Nao guarda estado proprio no save — tudo e flag de historia. A leva da
 * defesa vive so em memoria: recarregar no meio da luta chama uma leva nova
 * quando o jogador voltar ao posto, e ninguem sai no lucro nem no prejuizo.
 */
export class CampaignBeats {
  private leva: Creature[] = [];

  constructor(private host: Host, private zones: readonly ZoneTriggerDef[] = ZONE_TRIGGERS) {}

  update(px: number, py: number): void {
    const ts = CONFIG.tileSize;
    const col = px / ts;
    const row = py / ts;
    for (const z of this.zones) {
      if (this.host.hasFlag(z.flag)) continue;
      if (Math.hypot(col - (z.col + 0.5), row - (z.row + 0.5)) > z.raio) continue;
      this.host.setFlag(z.flag);
      this.host.visitado(z.id);
      Events.emit('ui:toast', { text: z.texto, tone: 'story' });
    }
    this.defesa(col, row);
  }

  private defesa(col: number, row: number): void {
    const d = POSTO_DEFESA;
    if (!this.host.hasFlag(d.requires) || this.host.hasFlag(d.flag)) return;
    const ts = CONFIG.tileSize;
    const meio = d.leva[Math.floor(d.leva.length / 2)].col;
    const perto = Math.hypot(col - meio, row - d.row) <= d.alcance;

    if (this.leva.length === 0) {
      if (!perto) return;
      for (const b of d.leva) {
        const c = this.host.spawn(b.id, (b.col + 0.5) * ts, (d.row + 0.5) * ts);
        if (c) this.leva.push(c);
      }
      Events.emit('ui:toast', { text: d.inicio, tone: 'warn' });
      // Nenhum bicho coube (posto soterrado por obra do jogador): a defesa nao
      // pode virar trava. Conta como segurada.
      if (this.leva.length === 0) this.vencer();
      return;
    }

    // Bicho que sumiu vivo: longe do posto e despawn — a leva recomeca quando
    // ele voltar. Perto, e porque fugiu ou ficou preso — conta como resolvido,
    // senao um bicho entalado travaria a campanha.
    const sumiuVivo = this.leva.some((c) => c.alive && !this.host.contains(c));
    if (sumiuVivo && !perto) {
      this.leva = [];
      return;
    }
    if (this.leva.every((c) => !c.alive || !this.host.contains(c))) this.vencer();
  }

  private vencer(): void {
    this.leva = [];
    this.host.setFlag(POSTO_DEFESA.flag);
    Events.emit('ui:toast', { text: POSTO_DEFESA.fim, tone: 'story' });
  }
}
