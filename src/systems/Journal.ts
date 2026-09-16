import { Events } from '../core/events';

export type JournalTab = 'missoes' | 'paginas' | 'pistas' | 'pessoas' | 'bichos' | 'lugares';

export interface JournalEntry {
  id: string;
  tab: JournalTab;
  /** Titulo da anotacao. */
  title: string;
  /** O que ficou escrito. Pode ter varias linhas — sao varias visitas. */
  notes: string[];
  /** Profundidade em metros onde foi anotado. */
  depth: number;
  /** Ordem de descoberta, para o guia ler como um diario. */
  order: number;
  /** Arte do retrato, quando houver (id da folha de NPC). */
  face?: string;
  /** Camada de origem, usada para o contador "3 de 5 nesta camada". */
  layer?: string;
}

export type JournalSave = {
  entries: JournalEntry[];
  next: number;
};

/**
 * O Guia de Campo de Santiago.
 *
 * Era do pai; vira do Elias por uso. Nada aqui e escrito a mao pelo designer:
 * o guia ESCUTA os eventos do jogo e anota sozinho. Ouviu um barulho, anota.
 * Achou uma pedra que nao tinha visto, anota, com a profundidade.
 *
 * E por isso que ele nao tem tela de "coletaveis": uma lista de itens com
 * cadeado e uma planilha. Um caderno que se preenche conforme voce anda vira
 * leitura — e a leitura e a recompensa.
 *
 * Regra unica: o guia nunca anota o que o jogador nao viu. Sem spoiler, sem
 * silhueta cinza de "???" . O que nao foi encontrado simplesmente nao existe
 * na pagina.
 */
export class Journal {
  private entries = new Map<string, JournalEntry>();
  private next = 1;
  /** Sobe quando algo novo entra: a HUD usa para piscar o botao. */
  unread = 0;

  constructor(private depthNow: () => number) {
    // As anotacoes longas de Santiago e John: a aba mais gorda do guia, e a
    // unica cujo total e conhecido de antemao — e ele mostra quantas faltam
    // por camada, que e o que faz o jogador cavar de lado.
    Events.on('scroll:found', (p) => {
      this.write('paginas', `scroll:${p.id}`, p.title, p.text.join('\n'), undefined, p.layer);
    });

    Events.on('clue:found', (p) => {
      this.write('pistas', `clue:${p.id}`, p.title, p.logEntry);
    });

    Events.on('npc:rescued', (p) => {
      this.write('pessoas', `npc:${p.id}`, p.name, 'Tirei essa pessoa de debaixo da pedra.', p.id);
    });

    Events.on('city:met', (p) => {
      this.write('pessoas', `npc:${p.id}`, p.name, 'Mora em Blockia. Conversamos.', p.id);
    });

    // "Ouviu um barulho, anota." A primeira vez que uma voz chega, vira
    // anotacao — e a anotacao e o que transforma um susto em uma pista.
    Events.on('npc:shout', (p) => {
      this.write(
        'pistas',
        `voz:${p.id}`,
        'Uma voz na pedra',
        'Ouvi alguem chamando. Vem de baixo, e repete.'
      );
    });

    Events.on('creature:killed', (p) => {
      this.write('bichos', `bicho:${p.id}`, p.name, 'Enfrentei um. Anotei o que deu para ver.');
    });

    Events.on('layer:reached', (p) => {
      this.write('lugares', `camada:${p.name}`, p.name, p.tagline);
    });

    Events.on('gate:opened', (p) => {
      this.write(
        'lugares',
        `selo:${p.layerId}`,
        `Selo de ${p.layerName}`,
        'A barreira cedeu. Alguem a colocou ali de proposito.'
      );
    });

    Events.on('map:discovered', (p) => {
      this.write('lugares', `local:${p.label}`, p.label, 'Marquei no mapa.');
    });
  }

  /**
   * Anota. Se a entrada ja existe, acrescenta a linha nova — visitar duas
   * vezes o mesmo lugar deve render duas linhas, nao substituir a primeira.
   */
  write(
    tab: JournalTab,
    id: string,
    title: string,
    note: string,
    face?: string,
    layer?: string
  ): void {
    const depth = Math.round(this.depthNow());
    const existente = this.entries.get(id);
    if (existente) {
      if (existente.notes.includes(note)) return;
      existente.notes.push(note);
      this.unread++;
      Events.emit('journal:written', { title, novo: false });
      return;
    }
    this.entries.set(id, {
      id,
      tab,
      title,
      notes: [note],
      depth,
      order: this.next++,
      face,
      layer,
    });
    this.unread++;
    Events.emit('journal:written', { title, novo: true });
  }

  /** Anotacoes de uma aba, na ordem em que foram descobertas. */
  byTab(tab: JournalTab): JournalEntry[] {
    return [...this.entries.values()].filter((e) => e.tab === tab).sort((a, b) => a.order - b.order);
  }

  /** Quantos pergaminhos daquela camada ja foram achados. */
  scrollsFound(layerId: string): number {
    return this.byTab('paginas').filter((e) => e.layer === layerId).length;
  }

  count(tab: JournalTab): number {
    return this.byTab(tab).length;
  }

  get total(): number {
    return this.entries.size;
  }

  toJSON(): JournalSave {
    return { entries: [...this.entries.values()], next: this.next };
  }

  fromJSON(data: JournalSave | undefined): void {
    if (!data) return;
    this.entries.clear();
    for (const e of data.entries ?? []) this.entries.set(e.id, e);
    this.next = data.next ?? this.entries.size + 1;
    this.unread = 0;
  }
}
