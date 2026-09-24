import EN from './en.json';

/**
 * Traducao na SAIDA, e nao na fonte.
 *
 * O jogo tem mais de mil e quinhentas frases espalhadas em dado e UI.
 * Embrulhar cada uma numa `t()` seria mexer em quase todo arquivo — o custo
 * que se quis evitar. Em vez disso o texto e trocado onde ele aparece:
 *  - no DOM, por um MutationObserver que traduz cada no de texto novo;
 *  - no canvas, embrulhando `fillText`;
 *  - no dialogo e na cena, que escrevem letra por letra (ver `t` la).
 *
 * O dicionario (`en.json`) sai de `npm run i18n-extrair`, que le a fonte e
 * lista o que falta. Frase com pedaco variavel e molde: "Faltam {0} m". O
 * pedaco que casou e traduzido de novo, entao "Falar com Jonas" e "Base do
 * Cristal foi..." resolvem sozinhos.
 *
 * Portugues e o idioma da fonte: com ele, nada disto roda.
 */
export type Idioma = 'pt' | 'en';
const CHAVE = 'profundio:idioma';

function lerIdioma(): Idioma {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === 'pt' || salvo === 'en') return salvo;
  } catch {
    /* sem storage: cai no idioma do aparelho */
  }
  return typeof navigator !== 'undefined' && /^pt/i.test(navigator.language) ? 'pt' : 'en';
}

export const idioma: Idioma = lerIdioma();

/** Troca e recarrega: a tela inteira e montada de novo no idioma novo. */
export function trocarIdioma(novo: Idioma): void {
  try {
    localStorage.setItem(CHAVE, novo);
  } catch {
    /* sem storage, a troca vale so ate recarregar */
  }
  const game = (window as unknown as { game?: { save(): void } }).game;
  try {
    game?.save();
  } catch {
    /* salvar e melhor-esforco */
  }
  window.location.reload();
}

const exatos = new Map<string, string>(Object.entries(EN as Record<string, string>));
/*
 * A UI poe muito nome em caixa alta no codigo (`nome.toUpperCase()`), e
 * "BOT SIMPLES" nao e a chave "Bot Simples". Mesma frase, outra caixa.
 */
const maiusculos = new Map<string, string>();
for (const [pt, en] of exatos) maiusculos.set(pt.toUpperCase(), en.toUpperCase());

interface Molde {
  re: RegExp;
  ordem: number[];
  saida: string;
}
/*
 * Moldes, do mais especifico (mais texto fixo) para o mais generico. Molde
 * com menos de tres letras fixas nao entra: "{0} {1}" casaria com tudo.
 */
const moldes: Molde[] = [...exatos.entries()]
  .filter(([pt]) => /\{\d+\}/.test(pt) && pt.replace(/\{\d+\}/g, '').replace(/[^A-Za-zÀ-ú]/g, '').length >= 3)
  .sort((a, b) => b[0].replace(/\{\d+\}/g, '').length - a[0].replace(/\{\d+\}/g, '').length)
  .map(([pt, en]) => {
    const ordem: number[] = [];
    const fonte = pt
      .split(/(\{\d+\})/)
      .map((p) => {
        const m = /^\{(\d+)\}$/.exec(p);
        if (m) {
          ordem.push(Number(m[1]));
          return '(.*?)';
        }
        return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('');
    return { re: new RegExp(`^${fonte}$`, 's'), ordem, saida: en };
  });

/*
 * Cache de tudo que ja passou por aqui, inclusive do que NAO tinha traducao:
 * o canvas pede o mesmo texto sessenta vezes por segundo.
 */
const cache = new Map<string, string>();

function traduzirNucleo(s: string, profundidade: number): string {
  const direto = exatos.get(s) ?? (s === s.toUpperCase() ? maiusculos.get(s) : undefined);
  if (direto !== undefined) return direto;
  if (profundidade > 2 || s.length > 400) return s;
  for (const m of moldes) {
    const achou = m.re.exec(s);
    if (!achou) continue;
    return m.saida.replace(/\{(\d+)\}/g, (_, n: string) => {
      const i = m.ordem.indexOf(Number(n));
      const pedaco = i >= 0 ? achou[i + 1] ?? '' : '';
      return traduzirNucleo(pedaco, profundidade + 1);
    });
  }
  /*
   * Texto montado de pedacos com separador — "Titulo: etapa", "a · b". O
   * molde "{0}: {1}" nao entra (casaria com tudo), entao cada lado e
   * traduzido por conta propria.
   */
  for (const sep of [': ', ' · ', ' — ', ' – ']) {
    const i = s.indexOf(sep);
    if (i <= 0) continue;
    const a = traduzirNucleo(s.slice(0, i), profundidade + 1);
    const b = traduzirNucleo(s.slice(i + sep.length), profundidade + 1);
    if (a !== s.slice(0, i) || b !== s.slice(i + sep.length)) return a + sep + b;
  }
  return s;
}

/** Traduz um texto de tela. Em portugues, devolve o proprio texto. */
export function t(s: string): string {
  if (idioma === 'pt' || !s) return s;
  const guardado = cache.get(s);
  if (guardado !== undefined) return guardado;
  // Espaco das pontas fica como estava: o DOM junta nos com ele.
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s)!;
  const miolo = m[2].replace(/\s+/g, ' ');
  const traduzido = miolo ? m[1] + traduzirNucleo(miolo, 0) + m[3] : s;
  const saida = traduzido === m[1] + miolo + m[3] ? s : traduzido;
  if (cache.size > 5000) cache.clear();
  cache.set(s, saida);
  return saida;
}

const ATRIBUTOS = ['title', 'placeholder', 'aria-label'];
/** Nos marcados com `data-sem-traducao` (texto que se digita letra por letra) ficam de fora. */
const pular = (el: Element | null) => !!el?.closest('[data-sem-traducao], script, style');

function traduzirArvore(raiz: Node): void {
  if (raiz.nodeType === Node.TEXT_NODE) {
    const no = raiz as Text;
    if (pular(no.parentElement)) return;
    const novo = t(no.data);
    if (novo !== no.data) no.data = novo;
    return;
  }
  if (raiz.nodeType !== Node.ELEMENT_NODE && raiz.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (raiz.nodeType === Node.ELEMENT_NODE && pular(raiz as Element)) return;
  const comAtributo = [
    ...(raiz.nodeType === Node.ELEMENT_NODE ? [raiz as Element] : []),
    ...(raiz as Element | DocumentFragment).querySelectorAll('[title],[placeholder],[aria-label]'),
  ];
  for (const el of comAtributo) {
    if (pular(el)) continue;
    for (const a of ATRIBUTOS) {
      const v = el.getAttribute(a);
      if (v) {
        const novo = t(v);
        if (novo !== v) el.setAttribute(a, novo);
      }
    }
  }
  const andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  for (let n = andar.nextNode(); n; n = andar.nextNode()) traduzirArvore(n);
}

/** Liga a traducao na pagina. Chamar o quanto antes, antes de montar a UI. */
export function instalarTraducao(): void {
  document.documentElement.lang = idioma === 'en' ? 'en' : 'pt-BR';
  if (idioma === 'pt') return;

  traduzirArvore(document.body);
  new MutationObserver((mudancas) => {
    for (const m of mudancas) {
      if (m.type === 'characterData') traduzirArvore(m.target);
      else if (m.type === 'attributes') {
        const el = m.target as Element;
        const v = el.getAttribute(m.attributeName!);
        if (v && !pular(el)) {
          const novo = t(v);
          if (novo !== v) el.setAttribute(m.attributeName!, novo);
        }
      } else m.addedNodes.forEach(traduzirArvore);
    }
  }).observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATRIBUTOS,
  });

  // Canvas: rotulos do mapa, textos flutuantes, balao de grito.
  const proto = CanvasRenderingContext2D.prototype;
  const original = proto.fillText;
  proto.fillText = function (texto: string, x: number, y: number, max?: number) {
    const tr = typeof texto === 'string' ? t(texto) : texto;
    if (max === undefined) original.call(this, tr, x, y);
    else original.call(this, tr, x, y, max);
  };
  const medir = proto.measureText;
  proto.measureText = function (texto: string) {
    return medir.call(this, typeof texto === 'string' ? t(texto) : texto);
  };
}
