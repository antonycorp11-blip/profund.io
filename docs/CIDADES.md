# Cidades — o esqueleto

Blockia é a primeira cidade feita como **planta de dados**. Ferrúria, Lumora e
Véspera usam o mesmo esqueleto: cada uma é um arquivo novo em `src/data/cidades/`.

## Onde fica cada coisa

| arquivo | o que faz |
|---|---|
| `src/data/cidade.ts` | os tipos: piso, escada, prédio, mobília, morador, água, cascata, sala, ponte quebrada, elevador, saída |
| `src/data/cidades/blockia.ts` | a planta de Blockia |
| `src/world/cidade/geometria.ts` | as contas de posição (linha de um piso, lugar de um morador, porta, sala) |
| `src/world/cidade/escavar.ts` | escava a planta no mundo e aplica o estado da história (porta, ponte, galeria, alçapão) |
| `src/world/cidade/CidadeRenderer.ts` | desenha a cidade: passarelas, balcões, ponte de arcos, casas, lanternas, água, cascata, elevador |

## As regras que as sondas cobram

- **Tudo é indestrutível.** Rocha, laje, tábua e água da cidade não cedem à picareta.
- **Escada de mão na ponta do piso de cima**, nunca no meio (escada no meio vira
  buraco onde se cai andando).
- **Nada sólido nas duas linhas do corpo** acima de um piso. Prédio e mobília são
  desenho, não tile.
- **Prédio e mobília não escondem escada, elevador nem alçapão** (são desenhados
  por cima dos tiles).
- **Todo piso, morador e obra se alcança a pé a partir da porta.**

`npm run cidade` e `npm run praca` conferem isso no mundo gerado.

## Arte

Os prédios são desenhados em código enquanto não há arte. Se existir
`public/art/<pasta>/predio_<tipo>.png` (e o id estiver na lista `blockia` de
`src/data/art.ts`), a arte substitui o desenho daquele tipo sem mexer em código.
Tipos: `casa`, `guarita`, `arquivo`, `conselho`, `clinica`, `oficina`, `forja`.

## Para fazer a próxima cidade

1. Copie `src/data/cidades/blockia.ts` e troque pisos, prédios, moradores e mobília.
2. Ponha as bordas da caverna no `CONFIG` (como `CONFIG.blockia`) e chame
   `escavarCidade` no `WorldGen`.
3. Crie um `CidadeRenderer` com a planta nova no `Game`.
4. Rode `npm run cidade` e `npm run praca` apontando para a planta nova.
