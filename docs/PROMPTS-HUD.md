# Prompts de arte — HUD

Seis prompts, dez assets cada. Cada prompt gera UMA folha em grade, para
recortar depois. Todos partem do mesmo bloco de estilo — cole o bloco junto com
o prompt, sempre, senao a segunda folha nao combina com a primeira.

Escopo: **so o HUD que fica por cima do jogo**. Telas cheias (Equipamento,
Tecnologia, Guia, Atributos) ficam para depois; elas ja tem layout proprio e
misturar as duas coisas numa leva so garante que nenhuma das duas fecha.

---

## Bloco de estilo (cole em TODOS os prompts)

```
ESTILO (obrigatorio em todos os assets desta folha):
Arte de interface para um jogo 2D de mineracao subterranea, estilo pintado
digital semi-realista com volume suave — nao e pixel art, nao e vetor chapado,
nao e 3D renderizado. Referencia de acabamento: UI de jogo mobile premium
com metal dourado trabalhado sobre fundo de caverna escura.

PALETA (use exatamente estas cores):
- ouro claro  #F5D98A   (luz e bordas internas)
- ouro medio  #E8B44A   (metal principal)
- bronze      #8A5F22   (sombra do metal, linha externa)
- preto-terra #16110C   (fundo de painel)
- carvao      #241B13   (fundo de painel, topo do gradiente)
- vermelho    #C4332A   (vida)
- azul        #4A9FD8   (movimento, pular)
- roxo        #A855F7   (cristal, energia)
- ambar-brilho #FFC453  (brilho de estado ativo)

REGRAS:
- Fundo 100% TRANSPARENTE (PNG com alpha). Sem cartao, sem moldura da folha,
  sem sombra projetada fora do objeto.
- Luz vindo de CIMA E DA ESQUERDA, igual em todos os assets.
- Sem nenhum TEXTO, sem letra, sem numero, sem marca d'agua dentro dos assets.
- Cada asset centralizado na propria celula, com ~8% de margem livre.
- Silhueta legivel a 32 px: forma cheia, contorno grosso, no maximo tres tons
  por objeto mais um brilho.
- Nada de gradiente arco-iris, nada de neon exagerado, nada de estilo cartoon
  infantil. O tom e "ferramenta de trabalho bem cuidada", nao "brinquedo".
```

---

## Prompt 1 — Icones de navegacao e leitura (10)

Vao no topo da tela (os cinco botoes) e nos cartoes de estado.

```
[COLE O BLOCO DE ESTILO AQUI]

Gere UMA imagem PNG de 1280x512 px, fundo transparente, contendo uma grade de
5 colunas por 2 linhas. Cada celula tem 256x256 px e contem UM icone, sem
moldura e sem fundo proprio. Ordem da esquerda para a direita, de cima para
baixo:

1. Picareta cruzada com uma chave inglesa, vista de tres quartos (menu de
   habilidades)
2. Braco flexionado de mineiro, manga arregacada, musculo marcado (atributos)
3. Caderno de campo aberto, paginas envelhecidas, fita marcadora (guia)
4. Capacete de mineiro com visor e lanterna frontal acesa (tecnologia)
5. Engrenagem de seis dentes com furo central (ajustes)
6. Alfinete de mapa gordo, base arredondada (localizacao)
7. Coracao cheio, levemente facetado como gema (vida)
8. Moeda de ouro com picareta gravada em relevo (dinheiro)
9. Losango de cristal roxo com brilho interno (ponto de habilidade)
10. Lanterna de mineiro pendurada pela alca, chama visivel (exploracao)

Todos os dez com o MESMO peso visual e o mesmo tamanho aparente. Icones de 1 a
5 e 6: metal dourado. 7 vermelho, 8 ouro, 9 roxo, 10 metal com chama ambar.
```

---

## Prompt 2 — Molduras e placas do HUD (10)

Sao as pecas que emolduram tudo. **Desenhe cada uma podendo ser esticada pelo
meio** (9-slice): cantos ornamentados, bordas repetiveis, centro liso.

```
[COLE O BLOCO DE ESTILO AQUI]

Gere UMA imagem PNG de 1536x768 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 307x384 px. Cada celula contem UMA moldura de interface
vazia, vista de frente, sem perspectiva, sem nada escrito dentro:

1. Moldura quadrada de retrato, 1:1, canto superior esquerdo com um rebite
   maior, interior escuro vazio
2. Placa horizontal comprida e baixa, tipo faixa, pontas chanfradas (nome e
   nivel)
3. Barra longa horizontal dividida em cinco compartimentos iguais por
   separadores finos de metal (contador de recursos)
4. Painel retangular grande com dobradica no topo e um pequeno anel de
   pendurar (cartao de missao)
5. Painel quase quadrado com cantos reforcados por cantoneiras (minimapa)
6. Botao redondo grande, anel duplo de metal dourado, interior escuro
7. Botao redondo medio, anel simples, interior escuro
8. Botao redondo pequeno, anel fino, interior escuro
9. Tarja horizontal estreita de aviso, pontas em ponta de flecha (mensagem)
10. Calha de barra de progresso: trilho vazio, fundo afundado, borda metalica

Todas as dez com a mesma espessura de borda e o mesmo brilho de metal. O
interior de todas e um preto-terra quase opaco, levemente mais claro no topo.
```

---

## Prompt 3 — Minerios e materiais (10)

Substituem os cinco icones que ja existem em `public/art/ui/` e completam a
lista ate o abismo. Nomes de arquivo iguais aos de hoje: `coal.png`,
`copper.png`, `iron.png`, `gold.png`, `crystal.png`, `stone.png`.

```
[COLE O BLOCO DE ESTILO AQUI]

Gere UMA imagem PNG de 1280x512 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 256x256 px. Cada celula tem UM punhado de minerio solto
visto de tres quartos, como um item de inventario — pedras soltas agrupadas,
NAO um bloco quadrado, NAO um minerio dentro de pedra:

1. Carvao — tres pedacos pretos foscos, brilho azulado fraco nas quinas
2. Cobre — pedacos laranja-avermelhados com veios esverdeados de oxidacao
3. Ferro — pedacos cinza-prata com faces metalicas planas
4. Ouro — pulgas douradas arredondadas, brilho quente forte
5. Cristal — prismas roxos translucidos, luz interna
6. Pedra — cascalho cinza comum, fosco, sem brilho
7. Rubi — cristais vermelhos facetados, brilho profundo
8. Reliquia — fragmento de ceramica antiga com entalhe geometrico dourado
9. Pedra do vazio — cristal preto-azulado que parece absorver a luz, contorno
   arroxeado
10. Coque — briquetes de carvao processado, cinzas, com brasa laranja viva nas
    frestas

Cada punhado ocupa a celula inteira com folga. Mesmo angulo e mesma altura de
pilha nos dez, para ficarem alinhados lado a lado numa barra.
```

---

## Prompt 4 — Icones das habilidades ativas (10)

Vao dentro dos botoes redondos pequenos e no cinto. Arquivo em
`public/art/skills/<nome>.png`.

```
[COLE O BLOCO DE ESTILO AQUI]

Gere UMA imagem PNG de 1280x512 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 256x256 px. Cada celula tem UM emblema de habilidade:
simbolo cheio e centralizado, sem moldura, sem circulo de fundo, legivel a
48 px:

1. Detonacao — carga explosiva com estilhacos de rocha voando para fora,
   clarao laranja no centro
2. Broca — ponta de broca helicoidal apontando para a direita, faiscas na ponta
3. Choque — raio eletrico azul saltando em ziguezague entre dois blocos
4. Volta rapida — silhueta correndo dentro de uma seta circular de retorno
5. Faro — ouvido encostado numa pedra, tres ondas concentricas saindo dela
6. Golpe preciso — mira sobre uma rachadura em forma de estrela na rocha
7. Escudo de pedra — escudo feito de placas de rocha sobrepostas
8. Jato — mochila a jato com dois bicos e chama curta para baixo
9. Farol — feixe de luz conico saindo de uma lanterna, iluminando poeira
10. Quebra-rochas — punho fechado de metal batendo e trincando a pedra

Cores por funcao: 1 e 6 laranja-quente, 3 e 9 azul, 2 e 10 metal dourado,
4 azul-claro, 5 branco-frio, 7 cinza-pedra, 8 laranja com metal.
```

---

## Prompt 5 — Estados, avisos e adornos (10)

As pecas pequenas que dizem o que esta acontecendo. Todas minusculas na tela —
exagere a silhueta.

```
[COLE O BLOCO DE ESTILO AQUI]

Gere UMA imagem PNG de 1280x512 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 256x256 px:

1. Selo circular vermelho de notificacao, liso, com brilho interno (aviso novo)
2. Cadeado fechado de metal escuro, grosso e atarracado (bloqueado)
3. Marca de confirmacao grossa, verde-oliva metalico (concluido)
4. Seta chevron apontando para a direita, chapa de metal dourado (abrir)
5. Quatro cantoneiras formando um quadrado aberto (expandir o mapa)
6. Triangulo de atencao com uma exclamacao, ambar (aviso)
7. Anel de recarga: circulo aberto com um arco preenchido em ambar (cooldown)
8. Selo pequeno em forma de gota com brilho (contador de cargas)
9. Pergaminho enrolado amarrado com cordao (missao)
10. Ornamento de canto: volutas de metal dourado formando um L, para encaixar
    no canto superior esquerdo de um painel

O item 10 deve ser desenhado APENAS no canto superior esquerdo, para eu
espelhar nos outros tres cantos.
```

---

## Prompt 6 — Marcadores do minimapa (10)

Bem pequenos na tela (12 a 18 px). Silhueta e cor fazem todo o trabalho.

```
[COLE O BLOCO DE ESTILO AQUI]

Gere UMA imagem PNG de 1280x512 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 256x256 px. Cada celula tem UM marcador de mapa visto de
frente, forma simples e cheia, contorno escuro grosso de 3 px para destacar
sobre qualquer fundo:

1. Jogador — losango branco-ambar com halo suave
2. Base — casinha de madeira com telhado de duas aguas
3. Pista — pegada de bota
4. Pergaminho — pagina dobrada com um canto virado
5. Mineiro preso — capacete de mineiro com uma mao erguida ao lado
6. Guardiao — cracio de criatura com chifres curtos, vermelho
7. Toupeira — focinho de toupeira de perfil, marrom
8. Copia — pequeno automato de cabeca redonda, azul-metal
9. Selo — placa circular lacrada com um X em relevo, roxo
10. Cidade — silhueta de tres torres com janelas acesas, ambar

Todos com o mesmo tamanho aparente e o mesmo peso de contorno. Sem sombra
projetada — eles sao carimbados em cima de um mapa.
```

---

## Depois de gerar

1. Recorte cada folha na grade indicada (as celulas sao todas do mesmo tamanho,
   entao um recorte automatico resolve — ver `tools/slice-*.mjs`, que ja fazem
   isso para as outras folhas do projeto).
2. Minerios vao para `public/art/ui/<chave>.png` — mesmos nomes de hoje.
3. Habilidades vao para `public/art/skills/<nome>.png`.
4. Icones de navegacao, molduras, estados e marcadores sao novos: `public/art/hud/`.
5. Nada quebra se um arquivo faltar — o jogo cai no desenho vetorial de sempre
   (ver o topo de `src/data/art.ts`). Da para trocar de peca em peca.
