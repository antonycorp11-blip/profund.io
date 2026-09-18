/**
 * Encaixes CONFERIDOS A MAO — este aqui e escrito por gente.
 *
 * `characterAnchors.ts` e gerado por `npm run medir-encaixes` e some a cada
 * medicao. Aqui fica o que a medicao nao consegue achar sozinha, e o que ela
 * acha ERRADO com cara de certo. Quem manda e este arquivo.
 *
 * Por que ele precisa existir: a medicao nunca responde "nao sei". Ela sempre
 * encontra algum borrao de pele e devolve um ponto. O teste de plausibilidade
 * pega o absurdo — punho na altura do pe, cabeca na metade de baixo — mas nao
 * pega o plausivel-e-falso. Na tira de mira ela devolveu y = -0,337 nos DEZ
 * quadros, um numero perfeitamente razoavel, enquanto o punho de verdade vai
 * de -0,272 a -0,512: ela achou a mesma manchinha de pele perto do quadril
 * toda vez. Nenhuma regra automatica ia reprovar aquilo.
 *
 * Mesmas coordenadas do arquivo gerado: fracao da altura desenhada, zero na
 * linha dos pes, x para a frente, y negativo para cima.
 */

import type { Encaixe, EncaixesDoQuadro } from './characterAnchors';

type Correcao = Partial<Record<keyof EncaixesDoQuadro, Encaixe>>;

/**
 * O PUNHO DA TIRA DE MIRA.
 *
 * Estes dez vieram de isolar o BLOB DA MAO — um preenchimento a partir da
 * ponta do braco, limitado a nove pixels de raio — e depois de renderizar as
 * armas na mao e olhar uma a uma. Sao a unica medida do projeto que ja passou
 * pelos olhos, e por isso ficam aqui em vez de ficar no arquivo gerado, que a
 * proxima medicao apaga.
 *
 * Um valor por QUADRO, e nao um por direcao: andando de arma em punho o corpo
 * usa os quadros 8-9, que tem o braco a frente. Escolher a ancora pela mira do
 * jogador, e nao pelo desenho na tela, fazia a arma saltar para fora da mao.
 *
 * Os quadros vao em pares: 0-1 frente, 2-3 cima, 4-5 baixo, 6-7 recuo,
 * 8-9 andando.
 */
const PUNHO_DA_MIRA: Encaixe[] = [
  { x: 0.21, y: -0.398 },
  { x: 0.209, y: -0.401 },
  { x: 0.233, y: -0.512 },
  { x: 0.225, y: -0.512 },
  { x: 0.192, y: -0.276 },
  { x: 0.19, y: -0.272 },
  { x: 0.153, y: -0.408 },
  { x: 0.218, y: -0.403 },
  { x: 0.209, y: -0.401 },
  { x: 0.211, y: -0.402 },
];

export const ENCAIXES_CORRIGIDOS: Record<string, (Correcao | null)[]> = {
  aim: PUNHO_DA_MIRA.map((punho) => ({ punho })),
};
