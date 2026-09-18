import { bossForLayer } from '../data/creatures';
import { GATE_LAYERS, gateBandRows, gateLayerDef } from '../data/gates';
import { Events } from '../core/events';
import type { CreatureManager } from './CreatureManager';
import type { Exploration } from './Exploration';
import type { GeneratedWorldInfo } from '../world/WorldGen';
import type { World } from '../world/World';

interface GateState {
  bossDefeated: boolean;
  opened: boolean;
}

export type BiomeGateSave = Record<string, { bossDefeated: boolean; opened: boolean }>;

/**
 * Torna cada chefe de bioma um limitador de verdade.
 *
 * Regra unica: uma camada se abre quando o chefe FIXO daquela camada morre.
 * Antes disso o selo (`BLOCK_IDS.SEAL`, indestrutivel) bloqueia a passagem
 * inteira — nao existe desvio por atalho, escalada ou construcao.
 *
 * A geometria do selo (linhas, coluna da arena) vem de /data/gates.ts, que o
 * WorldGen tambem usa para esculpir a barreira — as duas pontas calculam a
 * MESMA coisa a partir do mesmo lugar, entao nunca desalinham.
 */
export class BiomeGate {
  private states = new Map<string, GateState>();

  constructor(
    private world: World,
    private exploration: Exploration,
    private gates: GeneratedWorldInfo['gates']
  ) {
    for (const g of gates) {
      this.states.set(g.layerId, { bossDefeated: false, opened: false });
      const boss = bossForLayer(g.layerId);
      this.exploration.addMarker({
        id: this.markerId(g.layerId),
        kind: 'boss',
        col: g.col,
        row: g.row,
        label: boss?.name ?? 'Guardiao do bioma',
        alwaysVisible: false,
      });
    }
  }

  private markerId(layerId: string): string {
    return `boss_${layerId}`;
  }

  /** Camada sem selo cadastrado (superficie, Portal) conta como sempre aberta. */
  isOpen(layerId: string): boolean {
    return this.states.get(layerId)?.opened ?? true;
  }

  bossDefeated(layerId: string): boolean {
    return this.states.get(layerId)?.bossDefeated ?? true;
  }

  /**
   * Cria o corpo de cada chefe cujo selo ainda esta fechado E que ainda nao
   * morreu nesta partida. Chamar sempre DEPOIS de `fromJSON` (se houver save)
   * — senao um chefe ja derrotado voltaria vivo por um instante ate o load
   * terminar.
   */
  spawnBosses(creatures: CreatureManager): void {
    const ts = this.world.tileSize;
    for (const g of this.gates) {
      const st = this.states.get(g.layerId);
      const def = bossForLayer(g.layerId);
      if (!st || !def || st.bossDefeated) continue;
      /*
       * A posicao vem do WorldGen, nao de uma segunda conta aqui.
       *
       * Esta funcao calculava sozinha `row1 - 1` — a ultima linha da faixa do
       * selo. Isso so funcionava enquanto a arena era um buraco DENTRO da
       * faixa. Quando a camara subiu para a camada de cima, essa linha virou
       * rocha selada macica e o chefe nasceria emparedado: invisivel,
       * inalcancavel, e o selo nunca mais abriria.
       *
       * O WorldGen e quem escava a arena, entao e ele quem sabe onde esta o
       * chao dela. Ele grava isso em `gates[].row`; aqui so se obedece.
       */
      const chao = (g.row + 1) * ts; // topo do tile solido logo abaixo
      creatures.spawnBoss(def, g.col * ts + ts / 2, chao - def.h / 2);
    }
  }

  /**
   * Worldgen sempre carrega TODOS os selos fechados (e deterministico e nao
   * sabe de save). Depois do load, qualquer selo que ja tinha sido aberto em
   * sessao anterior precisa ser reaberto — mais barato que gravar centenas
   * de tiles de diferenca por camada.
   */
  reopenSavedGates(): void {
    for (const layerId of GATE_LAYERS) {
      const st = this.states.get(layerId);
      if (!st?.opened) continue;
      const layer = gateLayerDef(layerId);
      const { row0, row1 } = gateBandRows(this.world.surfaceRow, layer);
      this.world.openGateBand(row0, row1);
    }
  }

  /** Chamado pelo Game quando `creature:killed` traz um id de chefe. */
  onBossKilled(creatureId: string): void {
    for (const layerId of GATE_LAYERS) {
      if (bossForLayer(layerId)?.id !== creatureId) continue;
      const st = this.states.get(layerId);
      if (!st) return;
      st.bossDefeated = true;
      this.open(layerId);
      return;
    }
  }

  /**
   * Missoes que faltam para este selo poder abrir. Definido pelo Game.
   *
   * O selo deixou de ser so "mate o chefe". Derrubar o guardiao e a ULTIMA
   * coisa, nao a unica: quem pulou a pista dos trilhos ou nao falou com o Rui
   * encontra a parede aberta pela metade e sabe exatamente o que falta.
   */
  missingMissions: (layerId: string) => { title: string; goal: string }[] = () => [];

  private open(layerId: string): void {
    const st = this.states.get(layerId);
    if (!st || st.opened) return;
    if (!st.bossDefeated) return;

    const faltam = this.missingMissions(layerId);
    if (faltam.length > 0) {
      Events.emit('gate:blocked', { layerId, faltam: faltam.map((m) => m.title) });
      return;
    }

    st.opened = true;
    const layer = gateLayerDef(layerId);
    const { row0, row1 } = gateBandRows(this.world.surfaceRow, layer);
    this.world.openGateBand(row0, row1);
    this.exploration.setMarkerDone(this.markerId(layerId));
    Events.emit('gate:opened', { layerId, layerName: layer.name });
  }

  /**
   * Refecha selos abertos que nao deviam estar abertos.
   *
   * Roda ao carregar. Um save feito quando o selo so pedia o chefe pode ter a
   * parede aberta com missoes pendentes atras dela; sem isto, esse save
   * continuaria burlando a ordem para sempre.
   *
   * O chefe morto CONTINUA morto — nao se perde essa luta. Assim que a missao
   * que falta fechar, o selo abre sozinho.
   */
  enforce(): string[] {
    const refechados: string[] = [];
    for (const layerId of GATE_LAYERS) {
      const st = this.states.get(layerId);
      if (!st || !st.opened) continue;
      if (this.missingMissions(layerId).length === 0) continue;
      st.opened = false;
      const layer = gateLayerDef(layerId);
      const { row0, row1 } = gateBandRows(this.world.surfaceRow, layer);
      this.world.closeGateBand(row0, row1);
      refechados.push(layer.name);
    }
    return refechados;
  }

  /** Tenta abrir tudo que ja cumpriu as condicoes (missao recem-concluida). */
  recheck(): void {
    for (const layerId of GATE_LAYERS) {
      const st = this.states.get(layerId);
      if (st?.bossDefeated && !st.opened) this.open(layerId);
    }
  }

  toJSON(): BiomeGateSave {
    const out: BiomeGateSave = {};
    for (const [id, st] of this.states) {
      out[id] = { bossDefeated: st.bossDefeated, opened: st.opened };
    }
    return out;
  }

  fromJSON(data: BiomeGateSave | undefined): void {
    if (!data) return;
    for (const [id, saved] of Object.entries(data)) {
      const st = this.states.get(id);
      if (!st) continue;
      st.bossDefeated = !!saved.bossDefeated;
      // Migracao da regra antiga, que ainda esperava resgate de NPC:
      // chefe ja morto nunca pode deixar um save preso diante do selo.
      st.opened = !!saved.opened || st.bossDefeated;
    }
  }
}
