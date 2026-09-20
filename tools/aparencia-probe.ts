import { orientacaoDaArte } from '../src/player/PlayerSprite';
import { Equipment, TRAJE_BLOCKIA, TRAJE_INICIAL } from '../src/systems/Equipment';

function ok(condicao: unknown, mensagem: string): asserts condicao {
  if (!condicao) throw new Error(mensagem);
}

// A caminhada antiga olha para a esquerda. Aplicar esse dado ao traje novo
// foi o que fez Elias caminhar de costas para o comando.
ok(orientacaoDaArte(-1, true) === 1, 'traje novo herdou a orientacao da folha antiga');
ok(orientacaoDaArte(-1, false) === -1, 'corpo antigo perdeu sua orientacao propria');

// Blockia e uma recompensa de progressao; nunca pode voltar a nascer equipada.
ok(TRAJE_INICIAL !== TRAJE_BLOCKIA, 'o traje de Blockia voltou a ser o inicial');

const atributos = { setSource() {}, removeSource() {} };
const equipamento = new Equipment(atributos as never, { money: 0 } as never);
ok(equipamento.equippedIn('corpo') === TRAJE_INICIAL, 'jogo novo nasceu com o corpo errado');
equipamento.fromJSON({ owned: [TRAJE_BLOCKIA], equipped: { corpo: TRAJE_BLOCKIA } });
ok(!equipamento.has(TRAJE_BLOCKIA), 'save antigo manteve Blockia liberado antes da hora');
ok(equipamento.equippedIn('corpo') === TRAJE_INICIAL, 'save antigo continuou vestido de Blockia');

console.log('  aparencia do heroi: orientacao e traje inicial coerentes');
