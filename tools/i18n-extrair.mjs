#!/usr/bin/env node
/**
 * Extrai todo texto de tela do codigo para o dicionario de traducao.
 *
 *   npm run i18n-extrair
 *
 * O jogo nao passa texto por uma funcao `t()` — sao milhares de strings
 * espalhadas em dado e UI, e embrulhar uma por uma seria o custo que se quis
 * evitar. Em vez disso o texto e traduzido NA SAIDA (ver /src/i18n/i18n.ts):
 * no DOM, no canvas e no dialogo. Este script le a fonte com o compilador do
 * TypeScript e lista cada string que parece frase; as que ainda nao estao em
 * `en.json` vao para `pendentes.json`, que e o que falta traduzir.
 *
 * Template com `${x}` vira molde: "Faltam {0} m". O pedaco variavel e
 * traduzido de novo por conta propria em tempo de execucao.
 */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = 'src';
const DIC = 'src/i18n/en.json';
// Gerado, fora do git: e a lista do que falta, nao parte do jogo.
const PEND = 'node_modules/.cache/i18n-pendentes.json';

/* Propriedades e chamadas cujo texto e identificador, nunca frase de tela. */
const PROP_ID = new Set(['id', 'kind', 'key', 'layer', 'color', 'tint', 'cor', 'icon', 'src', 'type', 'tone', 'sfx', 'base', 'bonus', 'resource', 'drop', 'material', 'behavior', 'flag', 'requires', 'unlockFlag', 'completionFlag', 'markerId', 'npc', 'lado', 'category', 'slot', 'art', 'sheet', 'sprite', 'anim', 'font', 'cls', 'className', 'classe', 'tag', 'nav', 'painel', 'aba', 'estilo']);
const CALL_ID = /^(on|off|emit|querySelector|querySelectorAll|getElementById|closest|matches|add|remove|toggle|contains|setAttribute|getAttribute|removeAttribute|addEventListener|removeEventListener|hasStoryFlag|setStoryFlag|getItem|setItem|removeItem|createElement|blockByKey|creatureDef|techDef|toolByKey|require|abrir|fechar|play|has|get|set|delete|split|join|replace|startsWith|endsWith|includes|padStart|toFixed|dataset|mark)$/;

function pareceFrase(s) {
  const t = s.trim();
  if (t.length < 2) return false;
  if (!/[A-Za-zÀ-ú]/.test(t)) return false;
  if (/^[#.]?[a-z0-9]+([_:\-/.][a-z0-9]+)+$/i.test(t) && !/\s/.test(t)) return false; // ids, caminhos, classes
  if (/^(https?:|\.\/|\/|data:)/.test(t)) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(t)) return false;
  if (/^(rgba?|hsla?)\(/.test(t)) return false;
  if (/^[a-z]+[A-Z][A-Za-z]*$/.test(t)) return false; // camelCase
  if (/^[a-z_]+$/.test(t) && t.length < 3) return false;
  // Uma palavra so: vale se for capitalizada ou maiuscula (ENTRAR, Mochila).
  if (!/\s/.test(t) && !/^[A-ZÀ-Ú]/.test(t) && !/[à-ú]/.test(t)) return false;
  if (/^\d+(px|%|s|ms|em|rem|vh|vw)?$/.test(t)) return false;
  if (/\b(sans-serif|system-ui|monospace|serif)\b/.test(t)) return false; // fonte do canvas
  if (/^\((pointer|prefers|max-|min-)/.test(t)) return false; // media query
  if (/[{};]\s*$/.test(t) && /:\s*[^ ]+;/.test(t)) return false; // css
  return true;
}

const decode = (s) =>
  s.replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&times;/g, '×');

/** Quebra nas tags HTML: cada pedaco de texto vira um no do DOM separado. */
function pedacos(s) {
  return decode(s)
    .split(/<[^>]*>/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p && pareceFrase(p.replace(/\{\d+\}/g, 'x')) && /[A-Za-zÀ-ú]{2}/.test(p.replace(/\{\d+\}/g, '')));
}

const achados = new Set();
function guarda(texto) {
  for (const p of pedacos(texto)) achados.add(p);
  // Atributo de tela dentro de HTML escrito em template: title, aria-label.
  for (const m of texto.matchAll(/(?:title|aria-label|placeholder)="([^"]+)"/g)) {
    if (pareceFrase(m[1].replace(/\{\d+\}/g, 'x'))) achados.add(decode(m[1]).trim());
  }
}

/* Atribuicao a propriedade que nunca e texto de tela: `el.className = ...`. */
const ALVO_ID = /^(className|cssText|transform|boxShadow|background|filter|id|src|href)$/;

function contextoId(node) {
  const pai = node.parent;
  if (!pai) return false;
  if (ts.isBinaryExpression(pai) && pai.operatorToken.kind === ts.SyntaxKind.EqualsToken && pai.right === node) {
    const alvo = pai.left;
    if (ts.isPropertyAccessExpression(alvo) && ALVO_ID.test(alvo.name.text)) return true;
  }
  // Mensagem de console e de erro e para quem desenvolve, nao para o jogador.
  if (ts.isNewExpression(pai) && pai.expression.getText() === 'Error') return true;
  if (ts.isCallExpression(pai) && /^console\./.test(pai.expression.getText())) return true;
  if (ts.isPropertyAssignment(pai) && pai.initializer === node && /^(className|class)$/.test(pai.name.getText())) return true;
  if (ts.isImportDeclaration(pai) || ts.isExportDeclaration(pai)) return true;
  if (ts.isPropertyAssignment(pai) && pai.initializer === node) {
    const nome = pai.name.getText().replace(/['"]/g, '');
    if (PROP_ID.has(nome)) return true;
  }
  if (ts.isPropertyAssignment(pai) && pai.name === node) return true;
  if (ts.isElementAccessExpression(pai)) return true;
  if (ts.isCallExpression(pai) && pai.arguments[0] === node) {
    const f = pai.expression;
    const nome = ts.isPropertyAccessExpression(f) ? f.name.text : ts.isIdentifier(f) ? f.text : '';
    if (CALL_ID.test(nome)) return true;
  }
  if (ts.isBinaryExpression(pai) && /===|!==|==|!=/.test(pai.operatorToken.getText())) return true;
  if (ts.isCaseClause(pai)) return true;
  // Pedaco de soma: a frase inteira ja foi guardada pela `visita`.
  if (ts.isBinaryExpression(pai) && pai.operatorToken.kind === ts.SyntaxKind.PlusToken) return true;
  if (ts.isLiteralTypeNode(pai)) return true;
  return false;
}

/*
 * Concatenacao vira uma frase so: `'Falar com ' + nome` e "Falar com {0}", e
 * frase longa quebrada em duas linhas com `+` chega inteira na tela.
 */
function partesDaSoma(node, out) {
  if (ts.isParenthesizedExpression(node)) return partesDaSoma(node.expression, out);
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    partesDaSoma(node.left, out);
    partesDaSoma(node.right, out);
    return;
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) out.push({ lit: node.text });
  else if (ts.isTemplateExpression(node)) {
    out.push({ lit: node.head.text });
    for (const span of node.templateSpans) { out.push({ var: true }); out.push({ lit: span.literal.text }); }
  } else out.push({ var: true });
}

function visita(node) {
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken &&
    !(ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind === ts.SyntaxKind.PlusToken)
  ) {
    const partes = [];
    partesDaSoma(node, partes);
    if (partes.some((p) => p.lit && /[A-Za-zÀ-ú]{2}/.test(p.lit))) {
      let n = 0;
      guarda(partes.map((p) => (p.var ? `{${n++}}` : p.lit)).join(''));
      // Os pedacos soltos tambem, para o caso de cada um ir para um no.
    }
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    if (!contextoId(node)) guarda(node.text);
  } else if (ts.isTemplateExpression(node) && !contextoId(node)) {
    let s = node.head.text;
    node.templateSpans.forEach((span, i) => {
      s += `{${i}}` + span.literal.text;
    });
    // Moldes: o pedaco fixo precisa ter texto de verdade.
    guarda(s);
  }
  ts.forEachChild(node, visita);
}

function varre(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) varre(p);
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts') && !p.includes('i18n')) {
      const src = ts.createSourceFile(p, fs.readFileSync(p, 'utf8'), ts.ScriptTarget.Latest, true);
      visita(src);
    }
  }
}
varre(RAIZ);
// O HTML de entrada (portao).
for (const m of fs.readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, '').matchAll(/>([^<]+)</g)) {
  guarda(m[1]);
}

// Molde que so tem placeholder e pontuacao nao serve para nada.
const lista = [...achados].filter((s) => s.replace(/\{\d+\}/g, '').replace(/[^A-Za-zÀ-ú]/g, '').length >= 2).sort();
const dic = fs.existsSync(DIC) ? JSON.parse(fs.readFileSync(DIC, 'utf8')) : {};
const pend = lista.filter((s) => !(s in dic));
fs.mkdirSync(path.dirname(PEND), { recursive: true });
fs.writeFileSync(PEND, JSON.stringify(pend, null, 0).replace(/","/g, '",\n"'));
console.log(`${lista.length} textos no codigo · ${lista.length - pend.length} traduzidos · ${pend.length} pendentes (${PEND})`);
