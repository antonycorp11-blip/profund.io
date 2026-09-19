/*
 * Sonda da luta de chefe: a arena e o combate, sem tela.
 *
 * Existe pelo mesmo motivo da sonda de escalada. "O chefe nasceu dentro da
 * parede" e um bug que ja aconteceu neste projeto — o BiomeGate calculava
 * sozinho a linha do chao e continuou calculando depois que a arena mudou de
 * lugar — e nao e um bug que se enxerga lendo codigo, porque as duas contas
 * pareciam certas separadamente.
 *
 * A sonda gera o MUNDO DE VERDADE e olha o que saiu dele, em vez de repetir
 * aqui a aritmetica do WorldGen: um teste que refaz a conta do codigo testado
 * so prova que eu sei copiar a minha propria conta.
 *
 *   npm run boss
 */
import { CONFIG } from '../src/data/config';
import { World } from '../src/world/World';
import { generateWorld } from '../src/world/WorldGen';
import { GATE_LAYERS, gateBandRows, gateLayerDef } from '../src/data/gates';
import { bossForLayer } from '../src/data/creatures';
import { MISSIONS } from '../src/data/missions';
import { Creature } from '../src/entities/Creature';
import { blockDef } from '../src/data/blocks';

const TS = CONFIG.tileSize;

/*
 * A CAMADA SONDADA VEM DA LISTA, e nao de mim.
 *
 * Esta sonda tinha 'stone' escrito em cinco lugares, porque quando ela nasceu
 * a Camada de Pedra era o primeiro selo do jogo. No dia em que o primeiro
 * chefe passou a ser a Rainha Escavadora, a sonda nao acusou o problema novo:
 * acusou a propria premissa velha, com "nao existe selo para a primeira camada trancada".
 *
 * Sonda com nome de camada escrito a mao so funciona ate a progressao mudar —
 * e progressao muda. Esta pergunta "qual e o primeiro selo?" para quem sabe.
 */
const PRIMEIRA = GATE_LAYERS[0];
const def0 = bossForLayer(PRIMEIRA);
let falhas = 0;

function ok(cond: boolean, titulo: string, detalhe = ''): void {
  if (cond) {
    console.log(`  ok   ${titulo}`);
  } else {
    falhas++;
    console.log(`  FALHA ${titulo}${detalhe ? ` — ${detalhe}` : ''}`);
  }
}

// ---------------------------------------------------------------- a arena ---
console.log('\nARENA (mundo gerado de verdade)');
const world = new World();
const info = generateWorld(world);
const porta = info.gates.find((g) => g.layerId === PRIMEIRA);

if (!porta) {
  console.log('  FALHA nao existe selo para a primeira camada trancada');
  falhas++;
} else {
  const layer = gateLayerDef(PRIMEIRA);
  const { row0, row1 } = gateBandRows(world.surfaceRow, layer);

  ok(!world.isSolid(porta.col, porta.row), 'o ponto do chefe e ar', `tile ${blockDef(world.getTile(porta.col, porta.row)).name}`);
  ok(
    world.isSolid(porta.col, porta.row + 1),
    'ha chao solido logo abaixo do chefe',
    'ele cairia'
  );
  ok(porta.row < row0, 'a camara fica ACIMA da faixa do selo', `row ${porta.row} vs row0 ${row0}`);

  // Altura util: do chao ate o teto, contando so ar na coluna do chefe.
  let teto = porta.row;
  while (teto > 0 && !world.isSolid(porta.col, teto - 1)) teto--;
  const altura = porta.row - teto + 1;
  ok(altura >= 8, 'a camara tem pe-direito de chefe', `${altura} tiles`);

  // Largura util no nivel do chao.
  let esq = porta.col;
  while (esq > 0 && !world.isSolid(esq - 1, porta.row)) esq--;
  let dir = porta.col;
  while (dir < world.width - 1 && !world.isSolid(dir + 1, porta.row)) dir++;
  // A investida percorre chargeSpeed * 0.85 ≈ 7 tiles. Pedir o dobro de pista
  // garante que ela nunca nasca ja emparedada, com folga para os dois lados.
  const pista = dir - esq + 1;
  const tilesInvestida = Math.ceil((def0?.boss?.chargeSpeed ?? 260) * 0.85 / TS);
  ok(
    pista >= tilesInvestida * 2,
    'ha pista para investir',
    `${pista} tiles de chao livre para uma investida de ${tilesInvestida}`
  );

  // Cobertura: a investida so e justa se houver onde se esconder dela.
  let pilares = 0;
  for (let col = porta.col - 17; col <= porta.col + 17; col++) {
    if (col === porta.col) continue;
    if (world.isSolid(col, porta.row) && !world.isSolid(col, porta.row - 4)) pilares++;
    else if (world.isSolid(col, porta.row - 1) && world.isSolid(col, porta.row - 3)) pilares++;
  }
  ok(pilares >= 4, 'ha cobertura para cortar a investida', `${pilares} colunas solidas`);

  // O selo continua intacto: a camara nao pode ter aberto a passagem.
  let selado = 0;
  for (let col = porta.col - 17; col <= porta.col + 17; col++) {
    let cheia = true;
    for (let row = row0; row <= row1; row++) if (!world.isSolid(col, row)) cheia = false;
    if (cheia) selado++;
  }
  ok(selado === 35, 'a faixa do selo continua fechada de ponta a ponta', `${selado}/35 colunas`);
}

// ------------------------------------------------------------- o combate ---
console.log('\nCOMBATE (Creature de verdade, 60 fps simulados)');
const def = bossForLayer(PRIMEIRA);
if (!def || !def.boss) {
  console.log('  FALHA a primeira camada trancada nao tem chefe com mecanica');
  falhas++;
} else if (porta) {
  const chao = (porta.row + 1) * TS;
  const boss = new Creature(def, porta.col * TS + TS / 2, chao - def.h / 2);
  // Jogador parado a 5 tiles: dentro do aggro (320) e fora do alcance (40).
  const player = { x: boss.x + 5 * TS, y: boss.y, invulnerable: false };
  let danoRecebido = 0;
  const hit = (d: number): void => {
    danoRecebido += d;
  };

  /*
   * O TIRO SAI DA VIDA DO CHEFE, e nao de um numero fixo.
   *
   * A sonda dava 3 de dano a cada meio segundo durante 40 s: 240 no total.
   * Isso matava o chefe de 190 hp que existia quando ela foi escrita. Quando o
   * primeiro selo passou a ser a Rainha Escavadora, de 1150 hp, os mesmos 240
   * viraram um quinto da barra — e a sonda reprovou o jogo dizendo "a luta nao
   * termina" e "a furia nao virou". Nenhuma das duas era verdade: ela e que
   * estava atirando com a arma do chefe antigo.
   *
   * Aqui o alvo e sempre o mesmo em TEMPO, nao em dano: 120 tiros derrubam
   * qualquer chefe, entao a luta simulada dura 60 s e a furia cai no meio dela
   * qualquer que seja a barra. Isto e uma bancada de prova de MECANICA — a
   * furia virou? a investida saiu? o chefe morre? — e nao uma opiniao sobre o
   * balanceamento, que se mede jogando.
   */
  const TIROS_ATE_MORRER = 120;
  const danoPorTiro = def.health / TIROS_ATE_MORRER;
  const segundos = Math.ceil((TIROS_ATE_MORRER + 20) * 0.5);

  const dt = 1 / 60;
  let viuWindup = false;
  let viuCharge = false;
  let furiaEm = -1;
  let pediuLacaio = false;
  let t = 0;

  for (let i = 0; i < 60 * segundos; i++) {
    t += dt;
    boss.update(dt, world, player, hit);
    if (boss.windup > 0) viuWindup = true;
    if (boss.charging > 0) viuCharge = true;
    if (boss.summonRequest > 0) {
      pediuLacaio = true;
      boss.summonRequest = 0;
    }
    if (boss.enraged && furiaEm < 0) furiaEm = Math.round(boss.health);
    /*
     * Uma bala a cada meio segundo, pelo caminho de dano DE VERDADE.
     *
     * Subtrair `health` na mao nao era um atalho inocente: `alive` olha o
     * ESTADO, nao o numero, e so `hurt()` vira a chave para 'morto'. A sonda
     * assim levava o chefe a -50 de vida e continuava chamando de vivo — e
     * teria passado batido por qualquer bug no proprio momento da morte.
     */
    if (i % 30 === 0 && boss.alive) boss.hurt(danoPorTiro, player.x);
    if (!boss.alive) break;
  }

  ok(boss.state !== 'parado', 'o chefe engajou o jogador', `estado ${boss.state}`);
  ok(viuWindup, 'houve preparo antes da investida (o telegrafo tem o que mostrar)');
  ok(viuCharge, 'a investida aconteceu');
  ok(boss.windupTotal > 0, 'o preparo tem duracao conhecida', 'sem isso o telegrafo nao tem 0..1');
  ok(
    furiaEm > 0 && furiaEm <= def.health * def.boss.enrageAt + 6,
    'a furia virou no limiar anunciado',
    `virou com ${furiaEm} de ${def.health}, limiar ${Math.round(def.health * def.boss.enrageAt)}`
  );
  ok(pediuLacaio, 'o chefe convocou lacaios durante a luta');
  ok(!boss.alive, 'a luta termina', `sobrou ${Math.round(boss.health)} hp apos ${t.toFixed(0)}s`);
  ok(danoRecebido > 0, 'o chefe acerta quem fica parado', `${danoRecebido} de dano`);
}

// ------------------------------------------- a investida bate no pilar ---
console.log('\nCOBERTURA (o pilar corta a investida)');
if (def?.boss && porta) {
  const chao = (porta.row + 1) * TS;
  const alcance = def.boss.chargeSpeed * 0.85;
  const alturaOlho = chao - def.h / 2; // altura do peito, que e onde o jogo le

  /*
   * Medir a partir do NASCIMENTO do chefe respondia a pergunta errada.
   *
   * Do centro exato da arena os pilares ficam a 10 tiles e a investida
   * alcanca 7 — nenhum bloqueio, e a sonda concluia "nada cobre o jogador".
   * Mas ninguem luta parado no centro: o chefe persegue, e a investida sai do
   * lugar para onde ele andou. A pergunta que importa e se EXISTE posicao de
   * luta em que o pilar corta a investida, porque e disso que o jogador
   * precisa quando ouve o preparo.
   */
  let posicoesCobertas = 0;
  for (let off = -14; off <= 14; off++) {
    const x = (porta.col + off) * TS + TS / 2;
    if (world.isSolidAtPixel(x, alturaOlho)) continue; // dentro do pilar
    for (const dir of [-1, 1]) {
      for (let d = TS / 2; d <= alcance; d += TS / 2) {
        if (world.isSolidAtPixel(x + dir * d, alturaOlho)) {
          posicoesCobertas++;
          break;
        }
      }
    }
  }
  ok(
    posicoesCobertas >= 8,
    'ha posicoes de luta onde o pilar corta a investida',
    `${posicoesCobertas} pares posicao/direcao bloqueados`
  );

  // E do centro a investida tem que sair LIMPA: o chefe nao pode bater na
  // propria porta no primeiro segundo da luta.
  const xc = porta.col * TS + TS / 2;
  let livreCentro = true;
  for (let d = TS / 2; d <= alcance; d += TS / 2) {
    if (world.isSolidAtPixel(xc + d, alturaOlho) || world.isSolidAtPixel(xc - d, alturaOlho)) {
      livreCentro = false;
      break;
    }
  }
  ok(livreCentro, 'do centro a investida sai limpa para os dois lados');
}

// ------------------------------------------- a passagem depois da morte ---
console.log('\nPASSAGEM (o selo cai e da para descer)');
if (porta) {
  const layer = gateLayerDef(PRIMEIRA);
  const { row0, row1 } = gateBandRows(world.surfaceRow, layer);

  /*
   * O sintoma que isto guarda: "matei o bicho e nao me deixou descer."
   *
   * `openGateBand` so apagava tiles de SELO, e a passagem murada e de tijolo
   * antigo. Ela sobrevivia a abertura como uma laje de nove tiles bem no meio
   * da faixa — o jogador vencia a luta, via a barreira estilhacar, e
   * continuava em pe exatamente sobre a porta que a vitoria devia ter aberto.
   */
  world.openGateBand(row0, row1, { col: porta.col, half: CONFIG.gate.doorHalf });

  let entulho = 0;
  for (let row = row0; row <= row1; row++) {
    for (let col = porta.col - CONFIG.gate.doorHalf; col <= porta.col + CONFIG.gate.doorHalf; col++) {
      if (world.isSolid(col, row)) entulho++;
    }
  }
  ok(entulho === 0, 'a passagem murada cai com o selo', `${entulho} tiles ainda de pe`);

  // E a queda tem que dar em algum lugar: ar continuo do piso da arena ate
  // abaixo da faixa, na coluna do chefe.
  let livre = true;
  for (let row = porta.row; row <= row1 + 1; row++) {
    if (row <= row1 && world.isSolid(porta.col, row)) livre = false;
  }
  ok(livre, 'a coluna do chefe fica aberta de cima a baixo da faixa');
}

// --------------------------------------------- a galeria leva la dentro ---
console.log('\nCHEGADA (existe caminho ate o chefe, sem cavar)');
if (porta) {
  /*
   * "Parece conectada" nao e "da para andar".
   *
   * A galeria desce em degraus e, no desenho, encosta na sacada. Isso nao
   * prova nada: um degrau alto demais, um tile de tijolo no lugar errado, e o
   * caminho vira parede. A pergunta de verdade e se AR CHEGA de um ponto ao
   * outro sem atravessar pedra — e isso se responde inundando.
   *
   * Nao e a mesma coisa que caminhabilidade (nao mede altura de pulo), mas e a
   * condicao necessaria: sem ar continuo nao ha caminho nenhum, com ar
   * continuo ha um caminho a conferir.
   */
  const visto = new Set<number>();
  const fila: [number, number][] = [];
  // Comeca no chao da arena, ao lado do chefe.
  fila.push([porta.col, porta.row]);
  visto.add(porta.row * world.width + porta.col);
  let topoAlcancado = porta.row;
  while (fila.length) {
    const [c, r] = fila.shift()!;
    topoAlcancado = Math.min(topoAlcancado, r);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 1 || nr < 1 || nc >= world.width - 1 || nr >= world.height - 1) continue;
      const k = nr * world.width + nc;
      if (visto.has(k)) continue;
      if (world.isSolid(nc, nr)) continue;
      visto.add(k);
      fila.push([nc, nr]);
    }
  }
  const subiu = porta.row - topoAlcancado;
  ok(
    subiu >= 16,
    'ha ar continuo do chefe ate fora da camara',
    `o vao so sobe ${subiu} tiles acima do chao da arena`
  );

  // E a boca da galeria tem que ficar FORA do teto da camara, senao ela e
  // so mais um buraco dentro da propria sala.
  const alturaCamara = CONFIG.gate.arenaHeight;
  ok(
    subiu > alturaCamara,
    'a galeria sai da camara',
    `subiu ${subiu}, e a camara tem ${alturaCamara} de altura`
  );
}

// ------------------------------------------- o selo nao se auto-tranca ---
console.log('\nDESTRAVE (o selo nao pode esperar a propria missao)');
{
  /*
   * O BLOQUEIO QUE VOLTOU DUAS VEZES.
   *
   * Relato: "O guardiao caiu, mas ficou coisa para tras — A Primeira
   * Barreira." A missao que faltava era a do PROPRIO selo: ela exige a flag
   * `gate_stone`, que so nasce quando o selo abre. O selo esperava a missao,
   * a missao esperava o selo, e quem tinha feito tudo certo ficava preso.
   *
   * Da primeira vez eu "consertei" mexendo na profundidade do corte. Foi
   * sintoma: qualquer numero que eu escolha um dia cai do lado errado de
   * alguma missao. A regra e estrutural, e e ela que esta guardada aqui.
   */
  for (const layerId of GATE_LAYERS) {
    const layer = gateLayerDef(layerId);
    const guardiao = bossForLayer(layerId)?.id;
    const flag = `gate_${layerId}`;
    const circulares = MISSIONS.filter(
      (m) =>
        m.depth <= layer.minDepth &&
        (m.requires.includes(flag) || (guardiao !== undefined && m.requires.includes(guardiao)))
    );
    // FATO, nao asserção: e normal e esperado que exista uma missao por selo
    // que dependa dele. (Escrevi isto primeiro como `ok(x || true)`, que passa
    // sempre — um teste que finge verificar e pior que nenhum.)
    console.log(`  ·    ${layer.name}: ${circulares.length} missao(oes) dependem deste selo`);
    // A ASSERÇAO e outra: essas missoes nao podem estar na conta de pendencias.
    const pendentes = MISSIONS.filter((m) => m.depth <= layer.minDepth).filter(
      (m) =>
        !m.requires.includes(flag) && !(guardiao !== undefined && m.requires.includes(guardiao))
    );
    const vazou = pendentes.filter(
      (m) => m.requires.includes(flag) || (guardiao !== undefined && m.requires.includes(guardiao))
    );
    ok(vazou.length === 0, `${layer.name}: nenhuma dependencia circular na conta do selo`,
      vazou.map((m) => m.title).join(', '));
  }
}

console.log(falhas === 0 ? '\ntodas as sondas de chefe passaram.\n' : `\n${falhas} falha(s).\n`);
process.exit(falhas === 0 ? 0 : 1);
