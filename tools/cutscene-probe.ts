/*
 * Sonda das cutscenes: a cena tem tudo que promete?
 *
 *   npm run cutscene
 *
 * O QUE ELA GUARDA, e por que cada coisa.
 *
 * Uma cena e um roteiro apontando para arquivos. Os dois jeitos de ela quebrar
 * sao silenciosos: um caminho de arte errado da um retangulo vazio (o
 * navegador nao reclama de `background-image` que nao carrega), e uma fala
 * perdida ao dividir o texto em beats simplesmente nao e dita — e ninguem
 * percebe, porque a conversa continua fazendo sentido sem ela.
 *
 * O segundo e o que mais me preocupa: eu peguei vinte e sete linhas escritas e
 * reparti em cinco beats a mao. Conferir isso lendo e como eu erraria.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { CUTSCENES, CUTSCENE_PROLOGO } from '../src/data/cutscenes';
import { PROLOGUE } from '../src/data/prologue';

let falhas = 0;
const ok = (cond: boolean, titulo: string, detalhe = ''): boolean => {
  if (cond) console.log(`  ok   ${titulo}`);
  else {
    falhas++;
    console.log(`  FALHA ${titulo}${detalhe ? ` — ${detalhe}` : ''}`);
  }
  return cond;
};

console.log('\nTODA ARTE CITADA EXISTE');
{
  const faltando: string[] = [];
  for (const cena of CUTSCENES) {
    for (const b of cena.beats) {
      for (const c of b.camadas) {
        const p = path.resolve('public/art', c.arte);
        if (!fs.existsSync(p)) faltando.push(`${cena.id}: ${c.arte}`);
      }
    }
  }
  ok(
    faltando.length === 0,
    'nenhuma camada aponta para arquivo que nao existe',
    faltando.join(', ')
  );
}

console.log('\nO RECORTE DE TIRA BATE COM A IMAGEM');
/*
 * `character/idle.png` sao oito quadros de 128 lado a lado. Pedir o quadro 9,
 * ou dizer que a celula tem 96, desenha meio boneco — e meio boneco parado
 * numa cena de abertura e o tipo de coisa que passa despercebida por quem
 * escreveu e salta aos olhos de quem joga.
 */
{
  const erros: string[] = [];
  for (const cena of CUTSCENES) {
    for (const b of cena.beats) {
      for (const c of b.camadas) {
        if (!c.quadro) continue;
        const p = path.resolve('public/art', c.arte);
        if (!fs.existsSync(p)) continue;
        const img = PNG.sync.read(fs.readFileSync(p));
        const quadros = img.width / c.quadro.lado;
        if (!Number.isInteger(quadros)) {
          erros.push(`${c.arte}: ${img.width}px nao divide por celula de ${c.quadro.lado}`);
        } else if (c.quadro.indice < 0 || c.quadro.indice >= quadros) {
          erros.push(`${c.arte}: quadro ${c.quadro.indice} nao existe (a tira tem ${quadros})`);
        }
        if (img.height !== c.quadro.lado) {
          erros.push(`${c.arte}: a tira tem ${img.height}px de altura, a celula diz ${c.quadro.lado}`);
        }
      }
    }
  }
  ok(erros.length === 0, 'todo quadro pedido existe na tira', erros.join(' · '));
}

console.log('\nO PROLOGO NAO PERDEU NENHUMA FALA');
/*
 * A comparacao e com `/data/prologue.ts`, que e o texto que a BIBLIA definiu.
 * Nao basta contar: uma linha trocada de lugar muda quem responde a quem.
 */
{
  const naCena = CUTSCENE_PROLOGO.beats.flatMap((b) => b.falas);
  ok(
    naCena.length === PROLOGUE.length,
    `a cena diz as ${PROLOGUE.length} falas escritas`,
    `a cena tem ${naCena.length}`
  );
  const divergentes: string[] = [];
  for (let i = 0; i < Math.min(naCena.length, PROLOGUE.length); i++) {
    if (naCena[i].speaker !== PROLOGUE[i].speaker || naCena[i].text !== PROLOGUE[i].text) {
      divergentes.push(`${i + 1}: "${naCena[i].text.slice(0, 40)}..."`);
    }
  }
  ok(divergentes.length === 0, 'as falas estao na mesma ordem e com o mesmo texto', divergentes.join(' · '));
}

console.log('\nCADA BEAT TEM O QUE MOSTRAR E O QUE DIZER');
{
  const problemas: string[] = [];
  for (const cena of CUTSCENES) {
    cena.beats.forEach((b, i) => {
      if (b.camadas.length === 0) problemas.push(`${cena.id}[${i}]: sem camada — tela preta`);
      if (b.falas.length === 0) problemas.push(`${cena.id}[${i}]: sem fala — passa em branco`);
      /*
       * A duracao e o tempo do MOVIMENTO das camadas, e o jogador avanca o
       * texto no toque. Se o movimento acabar muito antes das falas, a cena
       * congela no meio da conversa; por isso ela nao pode ser curta demais
       * para a quantidade de linhas. Dois segundos por fala e o piso de quem
       * le rapido.
       */
      const piso = b.falas.length * 2;
      if (b.duracao < piso) {
        problemas.push(
          `${cena.id}[${i}]: ${b.duracao}s de movimento para ${b.falas.length} falas ` +
            `(a imagem para antes da conversa acabar; minimo ${piso}s)`
        );
      }
    });
  }
  ok(problemas.length === 0, 'nenhum beat vazio, nenhum congelando no meio', problemas.join(' · '));
}

console.log('\nO ENQUADRAMENTO CABE NA TELA');
{
  const fora: string[] = [];
  for (const cena of CUTSCENES) {
    cena.beats.forEach((b, i) => {
      for (const c of b.camadas) {
        for (const [nome, q] of [['de', c.de], ['para', c.para]] as const) {
          if (!q) continue;
          if (q.x < -0.2 || q.x > 1.2 || q.y < -0.2 || q.y > 1.2) {
            fora.push(`${cena.id}[${i}] ${c.arte} (${nome}): centro em ${q.x},${q.y}`);
          }
          if (q.escala <= 0 || q.escala > 3) {
            fora.push(`${cena.id}[${i}] ${c.arte} (${nome}): escala ${q.escala}`);
          }
        }
      }
    });
  }
  ok(fora.length === 0, 'nenhuma camada enquadrada fora da tela', fora.join(' · '));
}

console.log(falhas === 0 ? '\nas cenas estao inteiras.\n' : `\n${falhas} falha(s).\n`);
process.exit(falhas > 0 ? 1 : 0);
