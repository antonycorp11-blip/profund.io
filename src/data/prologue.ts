import type { DialogLine } from './story';

/**
 * Prologo (BIBLIA.md, ATO 0 — "O Homem Que Desceu Demais").
 *
 * O jogo abria sem dizer que o pai sumiu. O jogador cavava, entregava cota e
 * so muito depois alguem mencionava Santiago — a historia inteira ficava
 * pendurada em nada.
 *
 * Roda uma vez, na primeira sessao, antes do primeiro golpe de picareta. Faz
 * tres coisas, nessa ordem, porque essa e a ordem em que elas importam:
 * quem e o pai, por que a mina reabriu, e o que acontece se a cota falhar.
 */
export const PROLOGUE: DialogLine[] = [
  { speaker: 'Santiago (gravacao)', text: '"Se esta ouvindo isso, provavelmente eu fiz exatamente o que todo mundo disse para eu nao fazer."' },
  { speaker: 'Elias', text: 'Meu pai dizia que uma mina conta a verdade para quem tem paciencia de escutar.' },
  { speaker: 'Elias', text: 'Eu tinha oito anos quando ele entrou na Mina do Vale e nao voltou.' },
  { speaker: 'Elias', text: 'Disseram que houve um desabamento. Disseram que procuraram.' },
  { speaker: 'Elias', text: 'Depois disseram que continuar procurando so faria mais gente desaparecer.' },
  { speaker: 'Helena', text: 'Eu achei que tivesse jogado isso fora.' },
  { speaker: 'Elias', text: 'O caderno era dele?' },
  { speaker: 'Helena', text: 'Era. E eu devia ter queimado.' },
  { speaker: 'Elias', text: 'Tem mapas aqui. Profundidades. Uma marca a vinte e seis metros.' },
  { speaker: 'Helena', text: 'Tem obsessoes.' },
  /*
   * OS DOIS OBJETOS.
   *
   * A picareta reserva nao precisa de explicacao: todo mineiro tem duas. O
   * REVOLVER precisa — e e justamente por isso que ele entra aqui, e nao numa
   * loja. Um mineiro que guarda uma arma junto da ferramenta esta dizendo que
   * sabia de alguma coisa la embaixo, e Helena nao tem a resposta.
   *
   * E a primeira semente dos guardioes: quando o jogador encontrar um, vai
   * lembrar que o pai ja sabia.
   */
  { speaker: 'Helena', text: 'Tem mais coisa na caixa. Eu nunca mexi.' },
  { speaker: 'Elias', text: 'A picareta reserva dele.' },
  { speaker: 'Helena', text: 'Essa eu esperava.' },
  { speaker: 'Elias', text: '...e um revolver.' },
  { speaker: 'Helena', text: 'Esse nao.' },
  { speaker: 'Elias', text: 'Para que um mineiro leva arma para dentro de uma mina?' },
  { speaker: 'Helena', text: 'Foi o que eu perguntei. Ele mudou de assunto.' },
  { speaker: 'Helena', text: 'Duas vezes.' },
  { speaker: 'Elias', text: 'A mina esta fechada ha quatorze anos. Eu falei com o dono.' },
  { speaker: 'Helena', text: 'E ele abriu assim, de graca?' },
  { speaker: 'Elias', text: 'Cota toda semana. Enquanto eu entregar, a mina fica aberta.' },
  { speaker: 'Helena', text: 'E quando voce nao entregar?' },
  { speaker: 'Elias', text: 'Ai ele fecha. E eu nao volto mais la dentro.' },
  { speaker: 'Helena', text: 'Se voce for, me promete uma coisa.' },
  { speaker: 'Elias', text: 'Eu volto.' },
  { speaker: 'Helena', text: 'Nao. Nao promete o que seu pai prometeu.' },
  { speaker: 'Helena', text: 'So nao desapareca em silencio.' },
];

/** Fim de run: a semana virou sem a cota. */
export const MINE_CLOSED: DialogLine[] = [
  { speaker: 'Capataz', text: 'Semana fechada. A cota nao veio.' },
  { speaker: 'Elias', text: 'Eu preciso de mais tempo la embaixo.' },
  { speaker: 'Capataz', text: 'Foi o que seu pai disse. Duas vezes.' },
  { speaker: 'Capataz', text: 'A mina fecha hoje. O acordo era esse.' },
  { speaker: 'Elias', text: '...' },
  { speaker: 'Elias', text: 'Entao eu comeco de novo.' },
];
