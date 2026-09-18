/**
 * Encaixes CONFERIDOS A MAO — este aqui e escrito por gente.
 *
 * `characterAnchors.ts` e gerado por `npm run medir-encaixes` e some a cada
 * medicao. Aqui fica o que a medicao nao consegue achar sozinha, e o que ela
 * acha ERRADO com cara de certo. Quem manda e este arquivo.
 *
 * ESTA VAZIO, E ISSO E O RESULTADO ESPERADO.
 *
 * Ele nasceu carregando as dez ancoras do punho da tira de mira, medidas a mao
 * na arte antiga porque o detector nao tinha como acerta-las: naquela arte o
 * heroi usava LUVA e CAPACETE, entao nao havia pele de mao nem de craneo para
 * achar, e a medicao devolvia a mesma manchinha de pele perto do quadril nos
 * dez quadros.
 *
 * Com o heroi nu — cabeca e maos descobertas — a medicao passou de 13 quadros
 * reprovados para 1. As ancoras a mao deixaram de ser a fonte confiavel e
 * viraram o contrario: numeros da arte VELHA sobrescrevendo a medicao da arte
 * NOVA, com proporcoes diferentes.
 *
 * Entao o lugar continua aqui, de porta aberta, para o dia em que uma peca
 * nova precisar de um encaixe que a maquina erre. Mas encaixe a mao que ninguem
 * precisa e divida: ele nao acompanha a arte quando ela muda.
 */

import type { Encaixe, EncaixesDoQuadro } from './characterAnchors';

type Correcao = Partial<Record<keyof EncaixesDoQuadro, Encaixe>>;

export const ENCAIXES_CORRIGIDOS: Record<string, (Correcao | null)[]> = {};
