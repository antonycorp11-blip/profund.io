import { Events } from '../core/events';
import { PEDIDOS, aceitoDe, feitoDe, type PedidoDef } from '../data/pedidos';
import type { MissionStepDef } from '../data/missions';
import type { DialogLine } from '../data/story';

interface Host {
  hasFlag(id: string): boolean;
  setFlag(id: string): void;
  /** Paga a recompensa: moedas, confianca da cidade, pontos. */
  pagar(p: PedidoDef): void;
}

/**
 * Os pedidos dos moradores (ver /data/pedidos.ts).
 *
 * Nao guarda estado: aceito, passos e feito sao flags de historia. O que ele
 * faz e responder "o que este morador tem para pedir agora?", fechar o pedido
 * quando os passos terminam, e dizer ao caderno em que passo cada um esta.
 */
export class Pedidos {
  constructor(private host: Host, private lista: readonly PedidoDef[] = PEDIDOS) {
    Events.on('historia:flag', () => this.conferir());
  }

  private aceito(p: PedidoDef): boolean {
    return this.host.hasFlag(aceitoDe(p.id));
  }

  feito(p: PedidoDef): boolean {
    return this.host.hasFlag(feitoDe(p.id));
  }

  /** O que este morador tem para oferecer agora, ou null. */
  ofertaDe(npc: string): { lines: DialogLine[]; aceitar: () => void } | null {
    const p = this.lista.find(
      (q) => q.npc === npc && !this.aceito(q) && q.disponivelCom.every((f) => this.host.hasFlag(f))
    );
    if (!p) return null;
    return {
      lines: p.oferta,
      aceitar: () => {
        this.host.setFlag(aceitoDe(p.id));
        Events.emit('ui:toast', { text: `Novo pedido: ${p.titulo}`, tone: 'story' });
      },
    };
  }

  /** O passo em que o pedido esta: o primeiro em aberto depois do ultimo feito. */
  passoAtual(p: PedidoDef): MissionStepDef | null {
    let ultimo = -1;
    p.passos.forEach((s, i) => {
      if (s.requires.every((f) => this.host.hasFlag(f))) ultimo = i;
    });
    return p.passos.find((s, i) => i > ultimo && !s.requires.every((f) => this.host.hasFlag(f))) ?? null;
  }

  /** Aceitos e ainda abertos, na ordem da lista. */
  ativos(): PedidoDef[] {
    return this.lista.filter((p) => this.aceito(p) && !this.feito(p));
  }

  concluidos(): PedidoDef[] {
    return this.lista.filter((p) => this.feito(p));
  }

  private conferir(): void {
    for (const p of this.lista) {
      if (!this.aceito(p) || this.feito(p)) continue;
      if (!p.passos.every((s) => s.requires.every((f) => this.host.hasFlag(f)))) continue;
      // A flag primeiro: ela dispara `historia:flag` de novo, e a volta tem
      // de encontrar o pedido ja fechado, senao paga duas vezes.
      this.host.setFlag(feitoDe(p.id));
      this.host.pagar(p);
      Events.emit('ui:toast', { text: `Pedido concluido: ${p.titulo}`, tone: 'good' });
      Events.emit('dialog:open', { lines: p.conclusao });
    }
  }
}
