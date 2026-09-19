# Assets de Blockia — o que gerar, onde cai, para que serve

Blockia hoje é desenhada com a arte das **ruínas genéricas** (`ruin_brick`, `plank`,
`dirt`, `lamp`). Funciona como geometria e falha como lugar: a primeira cidade viva
em 600 m de mina tem exatamente a mesma textura de um corredor abandonado.

Esta lista dá a ela uma identidade própria.

## O que a geometria já garante (não invente contra isso)

Medidas reais, lidas de `CONFIG.blockia` e `src/world/Blockia.ts`:

| | valor |
|---|---|
| tile no jogo | **32 px** (arte gerada a 128 px, reduzida) |
| caverna | 100 tiles de largura × 108 de altura (col 132–232, 560–668 m) |
| níveis | praça (piso) + **4 terraços**, 8 tiles de desnível, 14 de largura cada |
| terraços | encostam na torre de escada à direita, crescem para a esquerda |
| construções | **abertas embaixo** — arcada, nunca caixa (`calcar()` abre as 2 linhas do corpo acima de todo piso, doa a quem doer) |
| luz | lâmpada no teto a cada 5 colunas, nos decks a cada 7, no piso a cada 6 |
| porta | coluna 130, no nível do piso |

**A regra que manda em tudo:** o que diz "aqui mora gente" é **janela, telhado e luz
acesa** — nunca muro na altura do joelho. Muro fechado já quebrou a cidade uma vez
(27 células andáveis medidas, nenhuma passarela alcançável).

## Paleta

Blockia é **âmbar quente contra azul frio**. O âmbar é vida (lampião, forja, janela);
o azul é a cidade vista de longe e a água. Fora disso, pedra fria e madeira escura.

| | hex |
|---|---|
| luz de lampião | `#ffc453` |
| lanterna azul | `#9affd8` |
| tijolo de Blockia | `#6b5442` |
| madeira de passarela | `#8a6a44` |
| óxido / cobre velho | `#4e7a72` |
| escuro de fundo | `#16181a` |

---

## PEDIDO 1 — 7 texturas de bloco (7 imagens separadas, 1024×1024)

| # | arquivo | destino | onde aparece |
|---|---|---|---|
| 1 | `blockia_brick_0.png` | `public/art/blocks/` | parede e fachada da cidade |
| 2 | `blockia_brick_1.png` | `public/art/blocks/` | variação úmida (sorteada por posição) |
| 3 | `blockia_backwall_0.png` | `public/art/blocks/` | parede de fundo atrás dos terraços |
| 4 | `blockia_deck_0.png` | `public/art/blocks/` | tábua das 4 passarelas |
| 5 | `blockia_floor_0.png` | `public/art/blocks/` | calçamento da praça |
| 6 | `blockia_horta_0.png` | `public/art/blocks/` | terra cultivada (16 tiles de horta) |
| 7 | `blockia_abobada_0.png` | `public/art/blocks/` | rocha do teto, com veio azul |

Salvar em `arte-bruta/blockia/blocos/01..07.png`, na ordem.

## PEDIDOS 2–11 — folhas (1 imagem cada, grade declarada)

| # | folha | grade | destino |
|---|---|---|---|
| 2 | Fachadas | 1024², 2×2 de 512 | `public/art/blockia/fachada_*.png` |
| 3 | Estrutura e apoios | 1024², 4×4 de 256 | `public/art/blockia/estrutura_*.png` |
| 4 | Lanternas azuis | 1024², 2×2 de 512 | `public/art/blockia/luz_*.png` |
| 5 | Mercado da Ponte | 1024², 2×2 de 512 | `public/art/blockia/mercado_*.png` |
| 6 | Ferraria do Silas | 1024², 2×2 de 512 | `public/art/blockia/forja_*.png` |
| 7 | Elevador do Breno | 1024², 2×2 de 512 | `public/art/blockia/elevador_*.png` |
| 8 | Água, horta e cisternas | 1024², 4×4 de 256 | `public/art/blockia/agua_*.png` |
| 9 | Vida cotidiana | 1024², 4×4 de 256 | `public/art/blockia/vida_*.png` |
| 10 | A Porta | 1024², 2×2 de 512 | `public/art/blockia/porta_*.png` |
| 11 | Fundo da caverna | 2048×1024, inteiro | `public/art/bg/blockia.png` |

Salvar em `arte-bruta/blockia/<nome>.png`.

---

---

## CHEGOU — estado em 19/09

Sete folhas entregues, **48 peças cortadas** por `npm run slice-blockia`, e a
camada que faltava (`BlockiaRenderer` + `blockiaProps.ts`) está escrita. Blockia
deixou de ser desenhada com a textura das ruínas genéricas.

| folha | peças | onde ficou |
|---|---|---|
| `porta.png` | 4 | ainda **não posicionada** (a porta é um tile hoje) |
| `vida.png` | 16 | praça e os quatro terraços |
| `agua.png` | 16 | terraço da Dra. Irene + a horta da praça |
| `elevador.png` | 4 | terraço do Breno |
| `forja.png` | 4 | ferraria do Silas, ponta esquerda da praça |
| `mercado.png` | 4 | Mercado da Ponte, em cima das barracas de tile |
| `fundo.png` | 1 | `public/art/bg/blockia.png` — **ainda não ligado** |

`npm run praca` confere o encaixe: sobreposição entre peças, canteiro fora da
terra, peça pendurada além da ponta do terraço. A primeira leva de posições que
eu escrevi tinha **seis sobreposições** e nenhuma delas quebrava nada — arte não
tem colisão, então elas ficariam ali até alguém andar até lá e ver.

### Feito desde então

1. ~~Textura do lampião~~ — `npm run lampiao` compõe `lamp_0.png` da arte que o
   projeto já tinha (a cabeça do lampião da entrada da mina, assentada na pedra
   com halo quente). Os quadrados amarelos acabaram. Se um dia vier uma textura
   desenhada de propósito, ela sobrescreve o arquivo e nada mais muda.
2. ~~O fundo~~ — `blockia.png` é desenhado como **fundo de lugar**, não de
   profundidade: inteiro, sem ladrilhar, com parallax curto. A troca acontece
   12 tiles antes da parede, então a vista já está lá quando você cruza a porta.
3. ~~A porta~~ — tem dois estados **e fecha de verdade**. A passagem nasce
   selada; bater nela abre a conversa ("Elias. Elias Ramires." / "Ramires.") e
   só então os tiles viram ar.

### A planta da cidade foi refeita

Era uma escada só: quatro terraços de largura igual, na mesma parede, subindo
sempre para o mesmo lado, sobre um piso chapado de 100 colunas. Agora:

| | antes | agora |
|---|---|---|
| superfícies andáveis | 5 | **14** |
| torres | 1 | **2**, subindo uma contra a outra |
| larguras de terraço | 1 | **7** |
| piso da praça | plano | **3 patamares** com rampas de 1 tile |
| volta | não | **ponte** sobre o átrio, no alto |

`npm run cidade` percorre a cidade **a pé** — anda, sobe 1 tile, cai, e agora
também sobe escada — e reprova qualquer nível que vire ilha.

## O que era meu depois que a arte chegar

Honestidade sobre o custo: **os pedidos 1 e 11 entram sozinhos** no que já existe —
bloco é bloco, fundo é fundo, o pipeline já sabe.

Os pedidos **2 a 10 não têm onde cair hoje.** Blockia é esculpida só em tiles; não
existe camada de decoração que desenhe um prop numa posição da cidade. Falta escrever
um `BlockiaRenderer`, no molde do `BaseCampRenderer`, e uma lista de onde cada peça
fica. É trabalho meu, não seu — mas é trabalho, e não quero que a arte chegue e fique
parada numa pasta sem eu ter avisado.

Também vale medir a folha antes de cortar, e não brigar com ela: a folha das ruínas
não veio na grade pedida, e medir onde ela realmente se divide custou um arquivo —
pedir de novo teria custado uma geração inteira.
