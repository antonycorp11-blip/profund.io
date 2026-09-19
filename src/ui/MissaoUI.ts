import { Events } from '../core/events';

/**
 * O CARTAZ DA MISSAO: chegada e conclusao.
 *
 * Antes disto, missao nova era uma troca silenciosa de texto num card do
 * canto da tela. Quem estava minerando nao via; quem via nao sabia que aquilo
 * tinha mudado. E concluir uma missao virava um toast de tres segundos, sem
 * dizer o que se ganhou.
 *
 * O pedido foi direto: "quando recebe a missao pela primeira vez voce pode
 * colocar um baita de um texto grande dizendo o que tem que fazer, e o
 * botaozinho para fechar. Concluiu a missao? Da mesma forma: nome da missao e
 * concluida, voce ganhou tanto de XP, tanto de moeda."
 *
 * A parte que nao foi pedida e importa: alem do OBJETIVO, o cartaz diz o
 * PORQUE. Objetivo e tarefa ("derrube a Mae dos Esporos"); porque e o que faz
 * alguem descer ("seu pai desceu por aqui, e enquanto ela estiver de pe voce
 * nao desce mais um metro"). Sem o porque, o jogo empurra o jogador para
 * baixo sem nunca dizer o que ha la.
 */
export class MissaoUI {
  private wrap: HTMLDivElement;
  private fila: (() => void)[] = [];
  private mostrando = false;

  constructor(parent: HTMLElement) {
    this.wrap = document.createElement('div');
    this.wrap.className = 'missao-wrap';
    parent.appendChild(this.wrap);

    Events.on('mission:nova', (p) =>
      this.enfileirar(() =>
        this.mostrar({
          selo: 'NOVO OBJETIVO',
          tom: 'nova',
          titulo: p.title,
          objetivo: p.goal,
          porque: p.porque,
          rodape: p.depth > 0 ? `Por volta dos ${p.depth} m` : '',
          premios: [],
        })
      )
    );

    Events.on('mission:done', (p) =>
      this.enfileirar(() =>
        this.mostrar({
          selo: 'MISSAO CONCLUIDA',
          tom: 'feita',
          titulo: p.title,
          objetivo: p.text,
          porque: '',
          rodape: '',
          premios: [
            ...(p.money ? [{ icone: '✦', valor: `+${p.money.toLocaleString('pt-BR')}`, nome: 'moedas' }] : []),
            ...(p.points ? [{ icone: '✧', valor: `+${p.points}`, nome: p.points > 1 ? 'pontos' : 'ponto' }] : []),
          ],
        })
      )
    );
  }

  /**
   * Tira o cartaz e esvazia a fila.
   *
   * Chamado ao carregar um mundo: abrir o jogo nao pode parecer que uma
   * missao acabou de chegar, e um cartaz herdado da partida anterior seria a
   * primeira coisa que o jogador veria.
   */
  fechar(): void {
    this.fila.length = 0;
    this.mostrando = false;
    this.wrap.classList.remove('on');
  }

  /**
   * Um cartaz de cada vez.
   *
   * Concluir uma missao quase sempre destrava a proxima no mesmo quadro, e os
   * dois eventos chegam juntos. Sem fila, o "NOVO OBJETIVO" apagaria o
   * "CONCLUIDA" antes de alguem ler — justamente a recompensa que o cartaz
   * veio entregar.
   */
  private enfileirar(f: () => void): void {
    this.fila.push(f);
    if (!this.mostrando) this.proximo();
  }

  private proximo(): void {
    const f = this.fila.shift();
    if (!f) {
      this.mostrando = false;
      return;
    }
    this.mostrando = true;
    f();
  }

  private mostrar(d: {
    selo: string;
    tom: 'nova' | 'feita';
    titulo: string;
    objetivo: string;
    porque: string;
    rodape: string;
    premios: { icone: string; valor: string; nome: string }[];
  }): void {
    this.wrap.innerHTML = `
      <div class="missao-cartaz ${d.tom}">
        <span class="missao-selo">${d.selo}</span>
        <b class="missao-titulo">${d.titulo}</b>
        <p class="missao-objetivo">${d.objetivo}</p>
        ${d.porque ? `<p class="missao-porque">${d.porque}</p>` : ''}
        ${
          d.premios.length
            ? `<div class="missao-premios">${d.premios
                .map(
                  (p) =>
                    `<span class="missao-premio"><i>${p.icone}</i><b>${p.valor}</b><small>${p.nome}</small></span>`
                )
                .join('')}</div>`
            : ''
        }
        ${d.rodape ? `<span class="missao-rodape">${d.rodape}</span>` : ''}
        <button class="missao-ok" type="button">ENTENDI</button>
      </div>`;
    this.wrap.classList.add('on');

    const fechar = (): void => {
      this.wrap.classList.remove('on');
      window.setTimeout(() => this.proximo(), 240);
    };
    (this.wrap.querySelector('.missao-ok') as HTMLElement).addEventListener('click', fechar);
    /*
     * O FUNDO TAMBEM FECHA, mas o cartaz nao.
     *
     * Tocar fora e o gesto que todo mundo tenta primeiro. Tocar DENTRO nao
     * pode fechar: o dedo encosta no texto enquanto se le, e perder o cartaz
     * no meio da leitura e pior do que ele nao ter aparecido.
     */
    this.wrap.addEventListener('pointerdown', (e) => {
      if (e.target === this.wrap) fechar();
    });
  }
}
