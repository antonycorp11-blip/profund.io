/*
 * Sonda de escalada: o jogo inteiro, sem tela.
 *
 * Existe porque "trava no cantinho" e um bug que eu nao consigo achar lendo
 * codigo e nao consigo pedir para o jogador medir. Aqui cada cenario e um
 * mapinha de texto, o `Player` de verdade roda dentro dele com um comando
 * fixo, e no fim a sonda diz se ele chegou ao G. Um cenario que falha e um bug
 * reproduzivel; um que passa nao volta a quebrar sem alguem ficar sabendo.
 *
 *   npm run climb
 */
import { CONFIG } from '../src/data/config';
import { BLOCK_IDS } from '../src/data/blocks';
import { Player } from '../src/player/Player';

const TS_ = CONFIG.tileSize;

class MapaTeste {
  readonly tileSize = TS_;
  readonly linhas: string[];
  constructor(mapa: string) {
    this.linhas = mapa.split('\n').filter((l) => l.length > 0);
  }
  private solidoCel(c: number, r: number): boolean {
    if (r < 0 || r >= this.linhas.length) return true;
    const linha = this.linhas[r];
    if (c < 0 || c >= linha.length) return true;
    return linha[c] === '#';
  }
  /**
   * Tile numerico, para quem pergunta pelo bloco e nao pela solidez.
   *
   * A sonda so precisava de `isSolid` ate a escada existir. Quando o `Player`
   * passou a consultar `getTile` para saber se esta numa escada, ela quebrou —
   * e foi bom: e exatamente o tipo de mudanca de interface que passa batida
   * num jogo e aparece como "o boneco nao sobe mais" uma semana depois.
   *
   * 'H' no mapa e escada. Assim da para escrever cenario com escada aqui.
   */
  getTile(c: number, r: number): number {
    if (r < 0 || r >= this.linhas.length) return BLOCK_IDS.BEDROCK;
    const linha = this.linhas[r];
    if (c < 0 || c >= linha.length) return BLOCK_IDS.BEDROCK;
    const ch = linha[c];
    if (ch === 'H') return BLOCK_IDS.LADDER;
    return ch === '#' ? BLOCK_IDS.STONE : BLOCK_IDS.AIR;
  }

  isSolid(c: number, r: number): boolean {
    return this.solidoCel(c, r);
  }
  isSolidAtPixel(x: number, y: number): boolean {
    return this.solidoCel(Math.floor(x / TS_), Math.floor(y / TS_));
  }
  rectCollides(x: number, y: number, w: number, h: number): boolean {
    const c0 = Math.floor(x / TS_);
    const c1 = Math.floor((x + w - 0.001) / TS_);
    const r0 = Math.floor(y / TS_);
    const r1 = Math.floor((y + h - 0.001) / TS_);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) if (this.solidoCel(c, r)) return true;
    }
    return false;
  }
  acha(ch: string): { c: number; r: number } | null {
    for (let r = 0; r < this.linhas.length; r++) {
      const c = this.linhas[r].indexOf(ch);
      if (c >= 0) return { c, r };
    }
    return null;
  }
}

/** Atributos suficientes para andar e escalar; nada de arvore aqui. */
const STATS = {
  moveSpeed: 150,
  jumpForce: 430,
  airControl: 1,
  climbSpeed: 145,
  climbStamina: CONFIG.player.climb.stamina,
  carryMovePenalty: 0,
};

class EntradaFalsa {
  axisX = 0;
  axisY = 0;
  private press = new Set<string>();
  private rel = new Set<string>();
  wasPressed(b: string): boolean {
    return this.press.has(b);
  }
  wasReleased(b: string): boolean {
    return this.rel.has(b);
  }
  fim(): void {
    this.press.clear();
    this.rel.clear();
  }
  aperta(b: string): void {
    this.press.add(b);
  }
}

interface Cenario {
  nome: string;
  mapa: string;
  /** Comando por segundo de simulacao: o que o dedo faz. */
  comando: (t: number) => { x: number; y: number; pula?: boolean };
  segundos?: number;
  /** Cenario que TEM que travar: o jogo precisa continuar dizendo nao. */
  esperaFalhar?: boolean;
}

function roda(cen: Cenario): { ok: boolean; nota: string } {
  const mundo = new MapaTeste(cen.mapa);
  const p0 = mundo.acha('P');
  const g = mundo.acha('G');
  if (!p0 || !g) return { ok: false, nota: 'mapa sem P ou G' };

  const player = new Player(STATS as never);
  // Pes no fundo do tile do P, corpo centrado nele.
  player.x = p0.c * TS_ + (TS_ - CONFIG.player.width) / 2;
  player.y = (p0.r + 1) * TS_ - CONFIG.player.height - 0.01;

  const input = new EntradaFalsa();
  const dt = 1 / 60;
  const total = cen.segundos ?? 6;
  let melhor = Infinity;
  let pulando = false;
  /*
   * Guarda contra o velho "TP pro lado".
   *
   * O eixo X tem regua curta de proposito: foi lateralmente que o jogador foi
   * arremessado, e nenhum movimento honesto passa de uns poucos pixels por
   * quadro. Na vertical a regua e de um tile, porque o degrau automatico sobe
   * um tile de uma vez — isso e um pulinho, nao um teleporte, e e o que faz
   * andar em terreno picado nao virar escalada.
   */
  let maiorX = 0;
  let maiorY = 0;
  for (let t = 0; t < total; t += dt) {
    const cmd = cen.comando(t);
    input.axisX = cmd.x;
    input.axisY = cmd.y;
    if (cmd.pula && !pulando) input.aperta('jump');
    pulando = !!cmd.pula;

    const antesX = player.x;
    const antesY = player.y;
    player.update(dt, input as never, mundo as never);
    input.fim();
    maiorX = Math.max(maiorX, Math.abs(player.x - antesX));
    maiorY = Math.max(maiorY, Math.abs(player.y - antesY));
    if (maiorX > 8) return { ok: false, nota: `TELEPORTE lateral: ${maiorX.toFixed(1)} px num quadro` };
    if (maiorY > TS_ + 4) return { ok: false, nota: `TELEPORTE vertical: ${maiorY.toFixed(1)} px num quadro` };

    const alvoX = g.c * TS_ + TS_ / 2;
    const alvoY = g.r * TS_ + TS_ / 2;
    const d = Math.hypot(player.cx - alvoX, player.cy - alvoY);
    melhor = Math.min(melhor, d);
    if (d < TS_ * 0.9) {
      return {
        ok: true,
        nota: `chegou em ${t.toFixed(1)}s (maior passo ${maiorX.toFixed(1)} px em X, ${maiorY.toFixed(1)} em Y)`,
      };
    }
  }
  const col = Math.floor(player.cx / TS_);
  const lin = Math.floor(player.cy / TS_);
  return {
    ok: false,
    nota: `parou em (col ${col}, lin ${lin}), a ${Math.round(melhor / TS_)} tiles do G`,
  };
}

// Dedo padrao: andar para a direita colado na parede, pedindo para subir.
const subirDireita = () => ({ x: 1, y: -1 });
// Andar para a direita sem pedir subida: so o degrau automatico resolve.
const soAndar = () => ({ x: 1, y: 0 });
/** Sobe agarrado por `t0` segundos e depois sai andando para o lado. */
const subirDepoisSair = (t0: number) => (t: number) =>
  t < t0 ? { x: 1, y: -1 } : { x: 1, y: 0 };
/** Sobe reto (chamine) e depois sai pelo lado. */
const chamineDepoisSair = (t0: number) => (t: number) =>
  t < t0 ? { x: 0, y: -1 } : { x: 1, y: 0 };

const CENARIOS: Cenario[] = [
  {
    nome: 'degrau de 1 tile, andando',
    mapa: ['..........', '..........', '.P......G.', '###...####', '..########'].join('\n'),
    comando: soAndar,
  },
  {
    nome: 'parede de 3 tiles, escalando',
    mapa: [
      '.........',
      '.......G.',
      '......###',
      '......###',
      '.P....###',
      '#########',
    ].join('\n'),
    comando: subirDireita,
    segundos: 8,
  },
  {
    nome: 'CANTINHO: parede de 3 tiles com teto logo acima da borda',
    mapa: [
      '#########',
      '......G##',
      '......###',
      '......###',
      '.P....###',
      '#########',
    ].join('\n'),
    comando: subirDireita,
    segundos: 8,
  },
  {
    nome: 'CANTINHO: sair da chamine por um tunel lateral no topo',
    mapa: [
      '###########',
      '###.....G##',
      '###.#######',
      '###.#######',
      '###P#######',
      '###########',
    ].join('\n'),
    comando: chamineDepoisSair(2.2),
    segundos: 10,
  },
  {
    nome: 'CANTINHO: chamine que termina numa quina, saida so no ultimo tile',
    mapa: [
      '###########',
      '###....G###',
      '####.######',
      '####.######',
      '####P######',
      '###########',
    ].join('\n'),
    comando: chamineDepoisSair(2.2),
    segundos: 10,
  },
  {
    nome: 'CANTINHO: pilar de 1 tile de largura no topo da parede',
    mapa: [
      '.........',
      '......G..',
      '......#..',
      '......#..',
      '.P....#..',
      '#########',
    ].join('\n'),
    comando: subirDepoisSair(2.5),
    segundos: 9,
  },
  {
    nome: 'CANTINHO: degrau de 2 tiles em nicho (teto 3 acima do chao)',
    mapa: [
      '#########',
      '.....G.##',
      '.....####',
      '.P...####',
      '#########',
    ].join('\n'),
    comando: subirDireita,
    segundos: 8,
  },
  {
    nome: 'CANTINHO: sair de uma cova de 1 tile andando',
    mapa: [
      '.........',
      '.........',
      '.....G...',
      '####.####',
      '#########',
    ].join('\n').replace('.....G...', '....PG...'),
    comando: soAndar,
    segundos: 6,
  },
  {
    nome: 'CANTINHO: degrau de 1 tile com o teto logo acima da cabeca',
    mapa: [
      '#########',
      '#########',
      '.....G###',
      '.P...####',
      '#########',
    ].join('\n'),
    comando: soAndar,
    segundos: 6,
  },
  {
    nome: 'parede de 3 tiles SEM pedir para subir: tem que continuar barrando',
    mapa: [
      '.........',
      '.......G.',
      '......###',
      '......###',
      '.P....###',
      '#########',
    ].join('\n'),
    comando: soAndar,
    segundos: 6,
    esperaFalhar: true,
  },
  {
    nome: 'vao sem piso do outro lado: sair da chamine NAO pode jogar no vazio',
    mapa: [
      '###########',
      '###...##.G#',
      '###.####..#',
      '###.####..#',
      '###P####..#',
      '###########',
    ].join('\n'),
    comando: chamineDepoisSair(2.2),
    segundos: 8,
    esperaFalhar: true,
  },
  {
    /*
     * A ESCADA SOBE, e da para sair no topo.
     *
     * O caso que motivou o objeto: na arena o jogador cai seis tiles da sacada
     * e, sem escada, so sai escalando parede com vigor — depois de uma luta de
     * chefe, provavelmente machucado. Perder pela SAIDA e nao pela briga e a
     * pior forma de perder.
     *
     * 'H' e escada. O comando e so segurar para cima e depois andar para o
     * lado, que e o que o jogador faz sem pensar.
     */
    nome: 'escada: sobe sem vigor e sai pelo topo',
    mapa: [
      '#########',
      '#.....G.#',
      '#.H######',
      '#.H######',
      '#.H######',
      '#.H######',
      '#.H######',
      '#PH######',
      '#########',
    ].join('\n'),
    comando: (t: number) => (t < 2.2 ? { x: 0.4, y: -1 } : { x: 1, y: 0 }),
    segundos: 7,
  },
  {
    nome: 'escada de degraus de 1 tile, andando',
    mapa: [
      '.........',
      '.......G.',
      '......##.',
      '.....###.',
      '.P..####.',
      '#########',
    ].join('\n'),
    comando: soAndar,
    segundos: 8,
  },
];

let falhas = 0;
console.log('\nSONDA DE ESCALADA\n');
for (const cen of CENARIOS) {
  const r = roda(cen);
  const passou = cen.esperaFalhar ? !r.ok : r.ok;
  if (!passou) falhas++;
  console.log(`${passou ? '  ok  ' : ' FALHA'}  ${cen.nome}\n         ${r.nota}`);
}
console.log(
  falhas === 0
    ? '\ntodos os cantos passaram.\n'
    : `\n${falhas} cenario(s) travando.\n`
);
process.exit(falhas === 0 ? 0 : 1);
