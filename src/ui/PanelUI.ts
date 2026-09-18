import { CONFIG } from '../data/config';
import { RESOURCES, type ResourceId } from '../data/resources';
import { Haptics } from '../fx/Haptics';
import { AudioSystem } from '../systems/AudioSystem';
import type { BaseStock } from '../systems/BaseStock';
import type { PlayerStats } from '../player/PlayerStats';
import type { UpgradeSystem } from '../systems/UpgradeSystem';

export interface PanelHost {
  stats: PlayerStats;
  stock: BaseStock;
  upgrades: UpgradeSystem;
  /** Ferramentas de desenvolvimento para testar balanceamento. */
  dev: {
    addPoint(n: number): void;
    unlockAll(): void;
    resetSkills(): void;
    testProc(id: 'jackpot' | 'blockCritical' | 'fracture'): void;
    setDepth(meters: number): void;
    /** Chama uma criatura ao lado do jogador (teste de combate). */
    spawnCreature?(id: string): void;
    hurtPlayer?(amount: number): void;
    /** Enche a cartucheira: serve para testar o tiro sem ir a base. */
    darMunicao?(n: number): void;
  };
  /** Dados do registro/estatisticas para a aba de ajustes. */
  progressInfo(): {
    clues: string[];
    npcs: string[];
    blocksMined: number;
    deepest: number;
    playTime: number;
  };
  onResetSave(): void;
  onToggleTouch(): boolean;
  isTouchVisible(): boolean;
  /** 0 = sem tremor, 1 = normal. */
  shakeScale(): number;
  setShakeScale(v: number): void;
  /** 0 = automatico. Caso contrario, a escala fixa de resolucao. */
  renderScale(): number;
  setRenderScale(v: number, fixar: boolean): void;
  renderScaleFixa(): boolean;
}

type PanelKind = 'workshop' | 'settings';

/** Paineis de tela cheia (oficina e ajustes). Reconstroi o conteudo ao abrir. */
export class PanelUI {
  private wrap: HTMLDivElement;
  private panel: HTMLDivElement;
  private kind: PanelKind = 'workshop';

  constructor(parent: HTMLElement, private host: PanelHost) {
    this.wrap = document.createElement('div');
    this.wrap.className = 'panel-wrap';
    this.panel = document.createElement('div');
    this.panel.className = 'panel';
    this.wrap.appendChild(this.panel);
    parent.appendChild(this.wrap);

    this.wrap.addEventListener('pointerdown', (e) => {
      if (e.target === this.wrap) this.close();
    });
  }

  get isOpen(): boolean {
    return this.wrap.classList.contains('open');
  }

  open(kind: PanelKind): void {
    this.kind = kind;
    this.render();
    this.wrap.classList.add('open');
  }

  close(): void {
    this.wrap.classList.remove('open');
  }

  toggle(kind: PanelKind): void {
    if (this.isOpen && this.kind === kind) this.close();
    else this.open(kind);
  }

  /** Tres niveis de tremor: nada, metade, normal. */
  private shakeRow(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<span>Tremor da tela</span>';
    const group = document.createElement('div');
    group.className = 'seg-group';
    const opcoes: [string, number][] = [
      ['Nenhum', 0],
      ['Pouco', 0.5],
      ['Normal', 1],
    ];
    for (const [label, value] of opcoes) {
      const b = document.createElement('button');
      b.className = 'seg-btn';
      b.textContent = label;
      b.classList.toggle('on', Math.abs(this.host.shakeScale() - value) < 0.01);
      b.addEventListener('click', () => {
        this.host.setShakeScale(value);
        for (const other of group.children) other.classList.remove('on');
        b.classList.add('on');
      });
      group.appendChild(b);
    }
    row.appendChild(group);
    return row;
  }
  /**
   * Qualidade de imagem.
   *
   * Em tela Retina o jogo rasteriza quatro vezes mais pixel, e numa maquina
   * apertada isso e a diferenca entre 20 e 45 fps — nenhuma otimizacao de
   * codigo compete com pintar menos pixel. No automatico o jogo mede o proprio
   * quadro e ajusta sozinho; quem vai GRAVAR costuma querer fixar, porque uma
   * mudanca de nitidez no meio da tomada aparece no video.
   */
  private qualidadeRow(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<span>Qualidade da imagem</span>';
    const group = document.createElement('div');
    group.className = 'seg-group';
    const opcoes: [string, number][] = [
      ['Auto', 0],
      ['Alta', 1],
      ['Media', 0.8],
      ['Baixa', 0.65],
    ];
    const atual = this.host.renderScaleFixa() ? this.host.renderScale() : 0;
    for (const [label, value] of opcoes) {
      const b = document.createElement('button');
      b.className = 'seg-btn';
      b.textContent = label;
      b.classList.toggle('on', Math.abs(atual - value) < 0.01);
      b.addEventListener('click', () => {
        this.host.setRenderScale(value === 0 ? 1 : value, value !== 0);
        for (const other of group.children) other.classList.remove('on');
        b.classList.add('on');
      });
      group.appendChild(b);
    }
    row.appendChild(group);
    return row;
  }

  private render(): void {
    this.panel.innerHTML = '';
    // O mesmo cabecalho de todas as telas: titulo, linha de apoio, fechar.
    const header = document.createElement('header');
    header.className = 'casca-cab';
    const title = document.createElement('span');
    title.className = 'casca-titulo';
    const oficina = this.kind === 'workshop';
    title.innerHTML = oficina
      ? '<b>Oficina</b><span>Bancada e ferramenta</span>'
      : '<b>Ajustes</b><span>Registro, expedicao e opcoes</span>';
    const close = document.createElement('button');
    close.className = 'casca-fechar';
    close.textContent = '✕';
    close.addEventListener('click', () => this.close());
    header.appendChild(title);
    header.appendChild(close);
    this.panel.appendChild(header);

    if (this.kind === 'workshop') this.renderWorkshop();
    else this.renderSettings();
  }

  private renderWorkshop(): void {
    const { stats, stock, upgrades } = this.host;
    const current = stats.tool;

    this.panel.appendChild(sectionTitle('Equipada'));
    this.panel.appendChild(
      toolCard(current.color, current.name, current.description, [
        `Poder ${current.miningPower}`,
        `Velocidade ${current.miningSpeed.toFixed(2)}x`,
        `Tier ${current.tier}`,
      ])
    );

    const next = upgrades.next;
    this.panel.appendChild(sectionTitle('Proxima melhoria'));
    if (!next) {
      const p = document.createElement('div');
      p.className = 'log-list';
      p.textContent = 'Voce ja tem a melhor picareta do prototipo.';
      this.panel.appendChild(p);
    } else {
      this.panel.appendChild(
        toolCard(next.color, next.name, next.description, [
          `Poder ${current.miningPower} → ${next.miningPower}`,
          `Velocidade ${current.miningSpeed.toFixed(2)}x → ${next.miningSpeed.toFixed(2)}x`,
          `Tier ${next.tier}`,
        ])
      );

      const cost = document.createElement('div');
      cost.className = 'cost';
      for (const [id, qty] of Object.entries(next.cost)) {
        const rid = id as ResourceId;
        const have = stock.count(rid);
        const span = document.createElement('span');
        span.className = have >= (qty ?? 0) ? 'ok' : 'miss';
        span.textContent = `${RESOURCES[rid].name}: ${have}/${qty}`;
        cost.appendChild(span);
      }
      this.panel.appendChild(cost);

      const btn = document.createElement('button');
      btn.className = 'btn primary';
      btn.textContent = 'MELHORAR PICARETA';
      btn.disabled = !upgrades.canAfford();
      btn.addEventListener('click', () => {
        if (upgrades.tryUpgrade()) {
          Haptics.ui();
          this.render();
        }
      });
      this.panel.appendChild(btn);
    }

    this.panel.appendChild(sectionTitle('Estoque da base'));
    const grid = document.createElement('div');
    grid.className = 'stock-grid';
    const entries = stock.entries().filter(([, qty]) => qty > 0);
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'log-list';
      empty.textContent = 'Nada entregue ainda. Minere e leve ate o deposito.';
      this.panel.appendChild(empty);
    } else {
      for (const [id, qty] of entries) {
        const item = document.createElement('div');
        item.className = 'stock-item';
        item.innerHTML = `<span class="dot" style="width:10px;height:10px;border-radius:3px;background:${RESOURCES[id].color}"></span> ${RESOURCES[id].name}: <b>${qty}</b>`;
        grid.appendChild(item);
      }
      this.panel.appendChild(grid);
    }

    const money = document.createElement('div');
    money.className = 'row';
    money.innerHTML = `<span>Moedas</span><b>${stock.money}</b>`;
    this.panel.appendChild(money);
  }

  /**
   * Larga o cache do PWA e recarrega.
   *
   * Tira o registro do service worker E apaga os caches: so um dos dois nao
   * resolve, porque o registro sozinho volta a servir o que ja esta guardado.
   * Salva antes, porque recarregar no meio de uma sessao sem salvar seria
   * trocar um problema por outro pior.
   */
  private async forcarAtualizacao(botao: HTMLButtonElement): Promise<void> {
    botao.disabled = true;
    botao.textContent = 'Buscando...';
    try {
      // Mesmo caminho que o `main.ts` usa para salvar antes de uma troca de
      // versao: o painel nao recebe o Game, e abrir um furo no contrato dele
      // so para isto seria pior do que a leitura pontual aqui.
      (window as unknown as { game?: { save(): void } }).game?.save();
    } catch {
      /* salvar e melhor-esforco: a atualizacao nao pode travar aqui */
    }
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const nomes = await caches.keys();
        await Promise.all(nomes.map((n) => caches.delete(n)));
      }
    } catch {
      /* sem cache para limpar: recarregar ja e o bastante */
    }
    // `reload()` sozinho pode ser servido do cache do navegador; a busca com
    // carimbo de tempo garante documento novo.
    const u = new URL(window.location.href);
    u.searchParams.set('v', String(Date.now()));
    window.location.replace(u.toString());
  }

  private renderSettings(): void {
    const info = this.host.progressInfo();

    this.panel.appendChild(sectionTitle('Registro do pai'));
    const list = document.createElement('ul');
    list.className = 'log-list';
    if (info.clues.length === 0 && info.npcs.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Nenhuma pista encontrada ainda.';
      list.appendChild(li);
    }
    for (const c of info.clues) {
      const li = document.createElement('li');
      li.textContent = `• ${c}`;
      list.appendChild(li);
    }
    for (const n of info.npcs) {
      const li = document.createElement('li');
      li.textContent = `• ${n} resgatado`;
      list.appendChild(li);
    }
    this.panel.appendChild(list);

    this.panel.appendChild(sectionTitle('Expedicao'));
    this.panel.appendChild(row('Blocos minerados', String(info.blocksMined)));
    this.panel.appendChild(row('Profundidade maxima', `${Math.round(info.deepest)} m`));
    this.panel.appendChild(row('Tempo de jogo', formatTime(info.playTime)));

    this.panel.appendChild(sectionTitle('Opcoes'));
    this.panel.appendChild(
      switchRow('Som', AudioSystem.enabled, (on) => {
        AudioSystem.enabled = on;
        if (on) AudioSystem.unlock();
      })
    );
    this.panel.appendChild(
      switchRow('Vibracao', Haptics.enabled, (on) => {
        Haptics.enabled = on;
        if (on) Haptics.ui();
      })
    );
    this.panel.appendChild(
      switchRow('Controles na tela', this.host.isTouchVisible(), () => this.host.onToggleTouch())
    );
    this.panel.appendChild(
      switchRow('Mostrar FPS', CONFIG.debug.showFps, (on) => {
        CONFIG.debug.showFps = on;
      })
    );
    // Tremor de tela incomoda gente diferente de jeitos diferentes; e um ajuste,
    // nao um numero fixo escondido no codigo.
    this.panel.appendChild(this.qualidadeRow());
    this.panel.appendChild(this.shakeRow());

    /*
     * QUAL VERSAO ESTA RODANDO — e o botao de forcar a troca.
     *
     * "Nao vi mudanca nenhuma" e uma frase impossivel de investigar sem isto:
     * nao da para saber se o deploy nao chegou, se o PWA ficou preso numa
     * versao velha ou se a mudanca e que nao presta. Com o carimbo na tela, a
     * pergunta vira conferir um numero.
     */
    this.panel.appendChild(sectionTitle('Versao'));
    const carimbo = typeof __VERSAO__ === 'string' ? __VERSAO__ : 'dev';
    this.panel.appendChild(row('Build', carimbo));
    const forcar = document.createElement('button');
    forcar.className = 'btn';
    forcar.textContent = 'Buscar atualizacao agora';
    forcar.addEventListener('click', () => {
      Haptics.ui();
      void this.forcarAtualizacao(forcar);
    });
    this.panel.appendChild(forcar);

    this.panel.appendChild(sectionTitle('Desenvolvimento — habilidades'));
    const devGrid = document.createElement('div');
    devGrid.className = 'dev-grid';
    // "Desbloquear tudo" saiu: com tudo ligado de uma vez o jogo nao tem mais
    // nada para contar, e os numeros deixam de dizer se o balanceamento presta.
    const devButtons: [string, () => void][] = [
      ['+1 ponto', () => this.host.dev.addPoint(1)],
      ['+10 pontos', () => this.host.dev.addPoint(10)],
      ['Resetar skills', () => this.host.dev.resetSkills()],
      ['Testar jackpot', () => this.host.dev.testProc('jackpot')],
      ['Testar critico', () => this.host.dev.testProc('blockCritical')],
      ['Testar fratura', () => this.host.dev.testProc('fracture')],
      ['Profundidade 250 m', () => this.host.dev.setDepth(250)],
      ['Chamar criatura', () => this.host.dev.spawnCreature?.('morcego')],
      ['Chamar guardiao', () => this.host.dev.spawnCreature?.('guardiao_cristal')],
      ['Levar 25 de dano', () => this.host.dev.hurtPlayer?.(25)],
    ];
    for (const [label, fn] of devButtons) {
      const b = document.createElement('button');
      b.className = 'btn dev';
      b.textContent = label;
      b.addEventListener('click', () => {
        fn();
        Haptics.ui();
      });
      devGrid.appendChild(b);
    }
    this.panel.appendChild(devGrid);

    this.panel.appendChild(sectionTitle('Desenvolvimento — save'));
    const reset = document.createElement('button');
    reset.className = 'btn danger';
    reset.textContent = 'APAGAR SAVE E RECOMECAR';
    let armed = false;
    reset.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        reset.textContent = 'TEM CERTEZA? TOQUE DE NOVO';
        setTimeout(() => {
          armed = false;
          reset.textContent = 'APAGAR SAVE E RECOMECAR';
        }, 3000);
        return;
      }
      this.close();
      this.host.onResetSave();
    });
    this.panel.appendChild(reset);

    const hint = document.createElement('div');
    hint.className = 'log-list';
    hint.style.marginTop = '10px';
    hint.innerHTML =
      'Teclado: <b>A/D</b> mover · <b>W/S</b> mirar · <b>Espaco</b> pular · <b>J</b> ou clique minerar · <b>E</b> interagir';
    this.panel.appendChild(hint);
  }
}

function sectionTitle(text: string): HTMLElement {
  const h = document.createElement('h5');
  h.textContent = text;
  return h;
}

function row(label: string, value: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'row';
  el.innerHTML = `<span>${label}</span><b>${value}</b>`;
  return el;
}

function switchRow(label: string, initial: boolean, onChange: (on: boolean) => void): HTMLElement {
  const el = document.createElement('div');
  el.className = 'row';
  const span = document.createElement('span');
  span.textContent = label;
  const btn = document.createElement('button');
  let on = initial;
  const sync = () => {
    btn.className = `switch ${on ? 'on' : ''}`;
    btn.textContent = on ? 'LIGADO' : 'DESLIGADO';
  };
  sync();
  btn.addEventListener('click', () => {
    on = !on;
    onChange(on);
    sync();
  });
  el.appendChild(span);
  el.appendChild(btn);
  return el;
}

function toolCard(color: string, name: string, desc: string, stats: string[]): HTMLElement {
  const el = document.createElement('div');
  el.className = 'tool-card';
  el.innerHTML = `
    <span class="icon" style="background:${color}"></span>
    <span class="info">
      <span class="name">${name}</span>
      <div class="desc">${desc}</div>
      <div class="stats">${stats.join(' · ')}</div>
    </span>`;
  return el;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${String(s).padStart(2, '0')}s`;

}
