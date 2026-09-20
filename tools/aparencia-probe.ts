import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { orientacaoDaArte } from '../src/player/PlayerSprite';
import { Equipment, TRAJE_INICIAL, TRAJES_DE_CIDADE } from '../src/systems/Equipment';

function ok(condicao: unknown, mensagem: string): asserts condicao {
  if (!condicao) throw new Error(mensagem);
}

// A caminhada antiga olha para a esquerda. Aplicar esse dado ao traje novo
// foi o que fez Elias caminhar de costas para o comando.
ok(orientacaoDaArte(-1, true) === 1, 'traje novo herdou a orientacao da folha antiga');
ok(orientacaoDaArte(-1, false) === -1, 'corpo antigo perdeu sua orientacao propria');

ok(!TRAJES_DE_CIDADE.includes(TRAJE_INICIAL as never), 'uma roupa de cidade voltou a ser inicial');

const atributos = { setSource() {}, removeSource() {} };
const equipamento = new Equipment(atributos as never, { money: 0 } as never);
ok(equipamento.equippedIn('corpo') === TRAJE_INICIAL, 'jogo novo nasceu com o corpo errado');
equipamento.fromJSON({ owned: [...TRAJES_DE_CIDADE], equipped: { corpo: TRAJES_DE_CIDADE[1] } });
for (const id of TRAJES_DE_CIDADE) ok(!equipamento.has(id), `save antigo manteve ${id} liberado`);
ok(equipamento.equippedIn('corpo') === TRAJE_INICIAL, 'save antigo continuou com roupa de cidade');
const roupaComprada = TRAJES_DE_CIDADE[0];
equipamento.fromJSON({
  owned: [TRAJE_INICIAL, roupaComprada],
  equipped: { corpo: roupaComprada },
  appearanceVersion: 2,
});
ok(equipamento.has(roupaComprada), 'roupa de cidade comprada sumiu ao recarregar');
ok(equipamento.equippedIn('corpo') === roupaComprada, 'roupa comprada foi retirada ao recarregar');

// Parado e andando precisam ocupar a mesma altura. Esta comparacao usa o PNG
// publicado, portanto reprova se o cortador voltar a encolher uma das folhas.
function alturas(nome: string): number[] {
  const png = PNG.sync.read(fs.readFileSync(path.resolve(`public/art/trajes/inicial/${nome}.png`)));
  ok(png.width === 1024 && png.height === 128, `${nome}: folha fora de 8x128`);
  return Array.from({ length: 8 }, (_, quadro) => {
    let minY = 128, maxY = -1;
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      if (png.data[(y * png.width + quadro * 128 + x) * 4 + 3] < 10) continue;
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    return maxY - minY + 1;
  });
}
const media = (valores: number[]) => valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
ok(Math.abs(media(alturas('idle')) - media(alturas('walk'))) <= 2, 'heroi muda de tamanho ao andar');
ok(alturas('climb').every((altura) => altura > 90), 'escalada perdeu parte do corpo no recorte');

console.log('  aparencia do heroi: orientacao e traje inicial coerentes');
