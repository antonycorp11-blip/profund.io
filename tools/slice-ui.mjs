#!/usr/bin/env node
/**
 * Fatia as folhas de interface em arquivos soltos.
 *
 *   npm run slice-ui
 *
 * Entrada:  arte-bruta/ui/NN-nome.png   — dez pecas em duas fileiras de cinco
 * Saida:    public/art/<destino>/<nome>.png
 *
 * NAO corta por grade fixa, e isso nao e capricho: as folhas voltam do gerador
 * com as pecas em posicoes irregulares — uma fileira aperta mais a esquerda,
 * outra sobra a direita, e um asset as vezes e um conjunto de quatro pedacos
 * separados (as cantoneiras). Cortar em celulas iguais decepava metade delas.
 *
 * Entao o corte e por CONTEUDO: acha as fileiras pela projecao do alfa, acha as
 * pecas dentro de cada fileira do mesmo jeito, e se sobrar peca demais junta as
 * mais proximas ate dar cinco. Depois cada peca sai recortada no proprio
 * contorno, centralizada num quadrado e reduzida ao tamanho de uso.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

/** Alfa abaixo disto e halo/sujeira, nao desenho. */
const LIMIAR = 24;

const FOLHAS = [
  {
    arq: '01-nav.png', destino: 'hud', tamanho: 192,
    nomes: ['nav_skills', 'nav_atributos', 'nav_guia', 'nav_tecnologia', 'nav_ajustes',
            'pin', 'vida', 'moeda', 'ponto', 'lampiao'],
  },
  {
    arq: '02-molduras.png', destino: 'hud/moldura', tamanho: 256,
    nomes: ['retrato', 'placa', 'barra_recursos', 'cartao_missao', 'minimapa',
            'botao_grande', 'botao_medio', 'botao_pequeno', 'tarja', 'calha'],
  },
  {
    arq: '03-minerios.png', destino: 'ui', tamanho: 160,
    nomes: ['coal', 'copper', 'iron', 'gold', 'crystal',
            'stone', 'ruby', 'relic', 'voidstone', 'coal_coke'],
  },
  {
    arq: '04-habilidades.png', destino: 'skills', tamanho: 192,
    // Os cinco primeiros sao as habilidades ATIVAS que o jogo ja tem; os cinco
    // ultimos ficam guardados para quando os nos da arvore existirem.
    nomes: ['blast', 'drill', 'shock', 'recall', 'sense',
            'precise', 'stoneshield', 'jetpack', 'beacon', 'breaker'],
  },
  {
    arq: '05-estados.png', destino: 'hud', tamanho: 128,
    nomes: ['selo', 'cadeado', 'confere', 'chevron', 'cantoneiras',
            'atencao', 'recarga', 'carga', 'pergaminho', 'ornamento'],
  },
  {
    arq: '06-mapa.png', destino: 'hud/mapa', tamanho: 128,
    nomes: ['jogador', 'base', 'pista', 'pergaminho', 'mineiro',
            'guardiao', 'toupeira', 'copia', 'selo', 'cidade'],
  },
  {
    arq: '07-chassi.png', destino: 'hud/chassi', tamanho: 320,
    nomes: ['painel', 'painel_lateral', 'aba_off', 'aba_on', 'cartao',
            'cartao_sel', 'cartao_bloq', 'botao_primario', 'botao_secundario', 'botao_inativo'],
  },
  {
    arq: '08-equipamento.png', destino: 'equip', tamanho: 192,
    nomes: ['eq_traje_couro', 'eq_traje_placas', 'eq_traje_termico', 'eq_mochila_carga', 'eq_asas',
            'eq_jato', 'eq_capacete', 'eq_lanterna', 'eq_botas', 'eq_picareta'],
  },
  {
    arq: '09-encaixes.png', destino: 'hud/encaixe', tamanho: 192,
    nomes: ['vazio', 'aceso', 'no', 'cabo', 'plataforma',
            'escudo', 'vida', 'forca', 'mobilidade', 'recarga'],
  },
  {
    arq: '10-caderno.png', destino: 'journal/papel', tamanho: 256,
    nomes: ['livro', 'pagina', 'aba', 'fita', 'clipe',
            'durex', 'polaroid', 'cafe', 'carimbo', 'lapis'],
  },
];

const RAIZ = path.resolve(process.cwd());
const ENTRADA = path.join(RAIZ, 'arte-bruta/ui');
const SAIDA = path.join(RAIZ, 'public/art');

/** Faixas de pixel ocupadas numa projecao, separadas por vazio. */
function faixas(ocupado) {
  const out = [];
  let ini = -1;
  for (let i = 0; i < ocupado.length; i++) {
    if (ocupado[i] && ini < 0) ini = i;
    if (!ocupado[i] && ini >= 0) {
      out.push([ini, i - 1]);
      ini = -1;
    }
  }
  if (ini >= 0) out.push([ini, ocupado.length - 1]);
  return out;
}

/**
 * Divide uma faixa no ponto mais VAZIO dela.
 *
 * Nem sempre sobra uma linha de pixel totalmente transparente entre as duas
 * fileiras — na folha de navegacao o cabo da lanterna encosta no capacete de
 * cima e as duas viram uma faixa so. Quando isso acontece nao ha vao para achar,
 * so um estrangulamento: corta-se onde passa menos desenho, procurando apenas
 * no miolo para nao decepar a primeira nem a ultima peca.
 */
function dividirNoEstreito(faixa, contagem) {
  const [a, b] = faixa;
  const margem = Math.floor((b - a) * 0.3);
  let corte = -1;
  let menor = Infinity;
  for (let i = a + margem; i <= b - margem; i++) {
    if (contagem[i] < menor) {
      menor = contagem[i];
      corte = i;
    }
  }
  if (corte < 0) return [faixa];
  return [[a, corte - 1], [corte + 1, b]];
}

/**
 * Junta as faixas mais proximas ate sobrarem `alvo`.
 *
 * E o que salva as cantoneiras: sao quatro pedacos soltos que formam UM asset,
 * e sem isto a fileira devolveria oito pecas em vez de cinco.
 */
function juntarAte(fs_, alvo, contagem) {
  let lista = fs_.map((f) => [...f]);
  // Faltando faixa: parte a mais GORDA no ponto mais estreito dela.
  while (lista.length < alvo && contagem) {
    let maior = 0;
    for (let i = 1; i < lista.length; i++) {
      if (lista[i][1] - lista[i][0] > lista[maior][1] - lista[maior][0]) maior = i;
    }
    const partes = dividirNoEstreito(lista[maior], contagem);
    if (partes.length < 2) break;
    lista = [...lista.slice(0, maior), ...partes, ...lista.slice(maior + 1)];
  }
  while (lista.length > alvo) {
    let melhor = 0;
    let menor = Infinity;
    for (let i = 0; i < lista.length - 1; i++) {
      const vao = lista[i + 1][0] - lista[i][1];
      if (vao < menor) {
        menor = vao;
        melhor = i;
      }
    }
    lista[melhor] = [lista[melhor][0], lista[melhor + 1][1]];
    lista.splice(melhor + 1, 1);
  }
  return lista;
}

/** Reamostra por media de area. So reduz, que e o unico caso aqui. */
function reduzir(src, sw, sh, dst, dw, dh) {
  const ex = sw / dw;
  const ey = sh / dh;
  for (let y = 0; y < dh; y++) {
    const y0 = Math.floor(y * ey);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * ey));
    for (let x = 0; x < dw; x++) {
      const x0 = Math.floor(x * ex);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * ex));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * sw + sx) * 4;
          const al = src[i + 3] / 255;
          // Premultiplica: sem isso a borda puxa a cor do transparente e o
          // contorno fica com uma franja escura.
          r += src[i] * al;
          g += src[i + 1] * al;
          b += src[i + 2] * al;
          a += src[i + 3];
          n++;
        }
      }
      const j = (y * dw + x) * 4;
      const am = a / n;
      const f = am > 0 ? 255 / am : 0;
      dst[j] = Math.min(255, Math.round((r / n) * f));
      dst[j + 1] = Math.min(255, Math.round((g / n) * f));
      dst[j + 2] = Math.min(255, Math.round((b / n) * f));
      dst[j + 3] = Math.round(am);
    }
  }
}

let total = 0;
for (const folha of FOLHAS) {
  const caminho = path.join(ENTRADA, folha.arq);
  if (!fs.existsSync(caminho)) {
    console.log(`  (pulando ${folha.arq}: ainda nao chegou)`);
    continue;
  }
  const png = PNG.sync.read(fs.readFileSync(caminho));
  const { width: W, height: H, data } = png;
  const opaco = (x, y) => data[(y * W + x) * 4 + 3] > LIMIAR;

  const linhasOcupadas = new Array(H).fill(false);
  const linhasContagem = new Array(H).fill(0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!opaco(x, y)) continue;
      linhasOcupadas[y] = true;
      linhasContagem[y]++;
    }
  }
  const fileiras = juntarAte(faixas(linhasOcupadas), 2, linhasContagem);

  const pecas = [];
  for (const [y0, y1] of fileiras) {
    const colsOcupadas = new Array(W).fill(false);
    const colsContagem = new Array(W).fill(0);
    for (let x = 0; x < W; x++) {
      for (let y = y0; y <= y1; y++) {
        if (!opaco(x, y)) continue;
        colsOcupadas[x] = true;
        colsContagem[x]++;
      }
    }
    for (const [x0, x1] of juntarAte(faixas(colsOcupadas), 5, colsContagem)) {
      pecas.push({ x0, x1, y0, y1 });
    }
  }
  if (pecas.length !== 10) {
    console.log(`  ! ${folha.arq}: achei ${pecas.length} pecas, esperava 10`);
  }

  const dir = path.join(SAIDA, folha.destino);
  fs.mkdirSync(dir, { recursive: true });

  pecas.forEach((p, i) => {
    const nome = folha.nomes[i];
    if (!nome) return;
    // Contorno justo dentro da celula achada.
    let ax0 = p.x1, ay0 = p.y1, ax1 = p.x0, ay1 = p.y0;
    for (let y = p.y0; y <= p.y1; y++) {
      for (let x = p.x0; x <= p.x1; x++) {
        if (!opaco(x, y)) continue;
        if (x < ax0) ax0 = x;
        if (x > ax1) ax1 = x;
        if (y < ay0) ay0 = y;
        if (y > ay1) ay1 = y;
      }
    }
    const w = ax1 - ax0 + 1;
    const h = ay1 - ay0 + 1;
    // Quadrado com folga: o mesmo enquadramento em todos deixa os icones
    // alinhados quando ficam lado a lado numa barra.
    const lado = Math.round(Math.max(w, h) * 1.1);
    const quad = Buffer.alloc(lado * lado * 4, 0);
    const ox = Math.floor((lado - w) / 2);
    const oy = Math.floor((lado - h) / 2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const s = ((ay0 + y) * W + (ax0 + x)) * 4;
        const d = ((oy + y) * lado + (ox + x)) * 4;
        quad[d] = data[s];
        quad[d + 1] = data[s + 1];
        quad[d + 2] = data[s + 2];
        quad[d + 3] = data[s + 3];
      }
    }
    const alvo = folha.tamanho;
    const saida = new PNG({ width: alvo, height: alvo });
    reduzir(quad, lado, lado, saida.data, alvo, alvo);
    fs.writeFileSync(path.join(dir, `${nome}.png`), PNG.sync.write(saida));
    total++;
  });
  console.log(`  ${folha.arq} -> ${folha.destino}/ (${pecas.length})`);
}
console.log(`\n${total} arquivos gravados.`);
