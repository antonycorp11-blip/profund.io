# Caderno de Assets

Estilo fechado: **cartoon HD 2x** — arte gerada grande, desenhada reduzida no jogo.

## Como funciona (leia 1 minuto, economiza horas)

São **3 pedidos** numa mesma conversa do ChatGPT:

| Pedido | O que sai | Formato |
|---|---|---|
| 1 | 10 texturas de bloco | 10 imagens separadas 1024×1024 |
| 2 | 5 texturas de bloco | 5 imagens separadas 1024×1024 |
| 3 | 1 folha do personagem | 1 imagem 1024×1024 com 16 quadros |

Por que blocos separados e personagem em folha: textura separada sai em 1024px cheios e você
regenera uma sozinha se ficar ruim. Já o personagem **precisa** estar numa única imagem, senão
cada quadro sai com um boneco ligeiramente diferente e a animação treme.

**Use a mesma conversa nos 3 pedidos** — a coerência de estilo vem daí.

### Depois de gerar

1. Baixe as imagens **na ordem em que aparecem** e salve assim:
   ```
   arte-bruta/blocos/01.png ... 15.png     (ordem exata das listas abaixo)
   arte-bruta/sheet_character.png
   ```
2. Rode:
   ```bash
   npm run slice-assets
   ```
   O script reduz para 128px, corta a folha do personagem em 16 quadros, remove fundo
   magenta/branco se vier chapado, grava tudo em `public/art/` e imprime o mapa do que foi
   para onde — dá para conferir num relance.
3. `npm run dev` e a arte já está no jogo.

**Variações (opcional, recomendado):** repita os pedidos 1 e 2 mais duas vezes e salve em
`arte-bruta/blocos-v2/` e `arte-bruta/blocos-v3/`. O jogo sorteia entre as 3 por posição —
é o que tira a cara de papel de parede. Com uma leva só o jogo já funciona.

> **Não precisa ser seamless.** Cada bloco é uma peça independente com borda visível,
> estilo Terraria. A emenda entre tiles faz parte do visual.

---

## PEDIDO 1 — 10 texturas de bloco

```
Gere 10 IMAGENS SEPARADAS, uma para cada item numerado da lista, para um jogo 2D de mineração
em arte cartoon pintada à mão, qualidade de jogo mobile premium.

REGRAS IGUAIS PARA AS 10 IMAGENS:
- Cada imagem é quadrada 1024x1024 e representa UM bloco do cenário.
- A textura preenche a imagem inteira, de borda a borda, vista de frente, sem perspectiva.
- Iluminação uniforme vinda do canto superior esquerdo, sem ponto de luz forte.
- SEM moldura, SEM contorno escuro nas bordas, SEM sombra externa, SEM vinheta, SEM brilho
  de borda: o motor do jogo desenha o topo iluminado e a sombra de baixo depois.
  Se a arte já vier com borda, os blocos viram grade de azulejo na tela.
- SEM texto, SEM números, SEM marca d'água, SEM fundo diferente da própria textura.
- As 10 imagens precisam parecer do mesmo jogo: mesma paleta, mesmo nível de detalhe,
  mesma espessura de pincelada.

AS 10 IMAGENS, nesta ordem:
1. TERRA — solo marrom compactado com pedrinhas e raízes finas. Base #6b4a2f,
   torrões escuros #54381f, grãos claros #83603f. Granular, como um corte de terra escavada.
2. SOLO COM GRAMA — o quarto superior da imagem é uma faixa de grama musgosa (#5f9440 a
   #4f7d34) com algumas folhas transbordando para baixo; os outros três quartos são a mesma
   terra #6b4a2f com pedrinhas. Grama SÓ no topo, nunca nas laterais nem embaixo.
3. PEDRA — rocha cinza sólida com rachaduras sutis e pontinhos minerais. Base #5c5c66,
   fendas #46464f, luz #74747f. Densa e dura, não é entulho solto.
4. PEDRA PROFUNDA — basalto escuro e frio das profundezas, mais fechado que a pedra comum,
   lascas azuladas. Base #3b3b46, fendas #2b2b33, luz #50505e.
5. VEIO DE CARVÃO — pedra cinza #5a5a64 com 4 pepitas pretas gordas de carvão #1f1f25
   incrustadas, luz de borda #3d3d47, facetadas e levemente brilhantes, com pedra visível
   entre elas. O carvão tem que saltar aos olhos contra a rocha, alto contraste.
6. VEIO DE COBRE — pedra cinza #5a5a64 com 4 pepitas de cobre laranja #c0713a,
   brilho #f0b077, leve brilho metálico e um toque de pátina verde. Alto contraste.
7. VEIO DE FERRO — pedra cinza #55555f com 4 pepitas de ferro cinza-prateado #b9c2cc,
   brilho quase branco #eef3f8, metálico fosco, bordas levemente enferrujadas.
8. VEIO DE OURO — pedra cinza escura #4e4e58 com 4 pepitas de ouro #d9a828, brilho #ffe9a3,
   halo quente suave em volta delas, claramente precioso e chamativo.
9. CRISTAL BRUTO — rocha roxo-acinzentada escura #413b52 com 3 cristais violeta crescendo
   dela, cristal #8c5ce0 com núcleo luminoso #e0c8ff, facetados e geométricos, o brilho
   interno ilumina a rocha em volta. Mágico e raro.
10. TIJOLO ANTIGO — bloco de pedra entalhada de uma civilização perdida, pedra cinza-esverdeada
    #4a5352, juntas de argamassa apertadas, linhas geométricas gravadas e desgastadas, lascas
    e musgo nas frestas. Feito por alguém, não é rocha natural.
```

---

## PEDIDO 2 — 5 texturas de bloco

```
Agora gere mais 5 IMAGENS SEPARADAS, com exatamente as mesmas regras e o mesmo estilo das
10 anteriores (1024x1024, textura preenchendo tudo, luz do canto superior esquerdo,
sem moldura, sem borda, sem sombra externa, sem texto).

11. MADEIRA DA BASE — tábuas horizontais de escoramento de mina, madeira marrom quente
    #7a5533, frestas escuras #5d3f25, luz #96683f, veios visíveis, duas cabeças de prego
    de ferro. Robusta e bem construída.
12. ROCHA-MÃE — rocha quase preta e indestrutível, base #26262c com fraturas #35353d,
    pesada e maciça, pouquíssimo detalhe.

As três últimas são FUNDO DE GALERIA: a parede lá no fundo de um túnel já escavado.
Precisam ser visivelmente MAIS ESCURAS e MAIS CHAPADAS que os blocos sólidos, para o jogador
entender na hora que ali é espaço vazio por onde ele anda. Sem brilho, sem destaque,
contraste baixíssimo, como se estivessem na sombra.
13. FUNDO DE TERRA — parede de fundo de túnel de terra, base #3a2718.
14. FUNDO DE PEDRA — parede de fundo de túnel de pedra, base #2c2c33, marcas fracas de picareta.
15. FUNDO PROFUNDO — parede de fundo quase preta, base #1e1e25, textura mal visível, opressiva.
```

---

## PEDIDO 3 — folha do personagem (1 imagem)

> Na mesma conversa, depois dos blocos.

```
Agora crie UMA ÚNICA IMAGEM: a folha de animação do personagem deste mesmo jogo,
mantendo exatamente o mesmo estilo de arte das texturas anteriores.

FORMATO OBRIGATÓRIO:
- Imagem quadrada 1024x1024.
- Grade perfeita de 4 colunas x 4 linhas = 16 quadros iguais de 256x256.
- FUNDO 100% TRANSPARENTE (PNG com canal alpha). Se não for possível transparência,
  use fundo rosa-magenta puro #FF00FF chapado, sem nenhuma variação de tom.
- SEM linhas de grade, SEM moldura, SEM texto, SEM números, SEM sombra no chão.
- O personagem aparece INTEIRO dentro de cada quadro, SEMPRE de perfil virado para a DIREITA.
- Em TODOS os quadros: os pés tocam a mesma linha horizontal, a 116 pixels do topo do quadro
  (ou seja, perto da base), e o corpo fica centralizado na horizontal. Isso é essencial:
  a animação treme se a altura dos pés mudar entre os quadros.
- É O MESMÍSSIMO personagem nos 16 quadros: mesmo capacete, mesmas cores, mesmas proporções,
  mesmo rosto. Só a pose muda. Trate como folha de animação de um único personagem.

O PERSONAGEM:
Jovem minerador de desenho animado, proporções atarracadas e simpáticas (cabeça grande,
corpo curto e robusto, botas grandes), expressão determinada e amigável.
Capacete amarelo #e8b33a com lanterna frontal acesa #fff3c4, macacão de trabalho azul #4a7ba8,
calça azul mais escura #3c5a78, pele quente #e8c39a, luvas e botas de couro marrom,
bolsa pequena na cintura. Carrega uma picareta de cabo de madeira e cabeça de ferro cinza #d8dde3.
Luz vinda do canto superior esquerdo.

OS 16 QUADROS, na ordem de leitura (esquerda para direita, de cima para baixo):

LINHA 1 — ciclo de caminhada para a direita, 4 quadros que emendam em loop:
1. Contato: perna direita à frente tocando o chão, braço esquerdo à frente.
2. Passagem: pernas juntas embaixo do corpo, corpo no ponto mais alto.
3. Contato: perna esquerda à frente tocando o chão, braço direito à frente.
4. Passagem: pernas juntas, corpo no ponto mais alto, espelhando o quadro 2.

LINHA 2
5. PARADO A: em pé relaxado, picareta apoiada no ombro, peito cheio de ar.
6. PARADO B: mesmíssima pose, apenas o peito um pouco mais baixo (respiração) —
   diferença mínima em relação ao quadro 5.
7. PULANDO: corpo esticado para cima, pernas dobradas para trás, um braço erguido.
8. CAINDO: pernas esticadas buscando o chão, braços abertos para equilíbrio.

LINHA 3 — mineração:
9.  PREPARAÇÃO: picareta erguida bem acima e atrás da cabeça, corpo torcido acumulando força.
    (este quadro serve para os três golpes)
10. IMPACTO LATERAL: picareta totalmente estendida para a DIREITA na altura do peito,
    corpo jogado para frente, pose de impacto forte e legível.
11. IMPACTO PARA BAIXO: picareta cravando o chão entre os pés, joelhos dobrados,
    corpo curvado para baixo.
12. IMPACTO PARA CIMA: picareta cravando o teto acima da cabeça, corpo esticado para cima,
    olhando para cima.

LINHA 4
13. AGACHADO: pousando de um salto, joelhos bem dobrados, corpo comprimido.
14. COMEMORANDO: um braço erguido segurando uma pepita, sorriso aberto.
15. CARREGANDO: andando curvado com a bolsa cheia e pesada nas costas.
16. Deixe este quadro completamente vazio (só fundo transparente ou magenta).
```

---

## FORMATO ATUAL DO PERSONAGEM — tiras de animação

**Este é o formato em uso.** A folha 4x4 do PEDIDO 3 continua no repositório só
como rede de segurança: se um arquivo de tira faltar, aquele estado volta a
usá-la sozinho.

Uma imagem por animação, quadros lado a lado na horizontal, fundo transparente.
Salve em `arte-bruta/personagem/` e rode `npm run slice-assets`.

| arquivo | quadros | o que desenhar |
|---|---|---|
| `idle.png` | 8 | parado respirando, picareta na mão |
| `walk.png` | 8 | ciclo de caminhada completo |
| `jump.png` | 8 | agachar → impulso → subir → ápice → cair → pousar |
| `mine.png` | 8 | erguer a picareta → golpe → recuperar |
| `climb.png` | 8 | escalando de frente para a parede |

**O que o fatiador resolve sozinho** (não perca tempo com isso ao gerar):

- **Espaçamento irregular.** Os quadros são achados pela ocupação das colunas,
  não por divisão em partes iguais.
- **Picareta encostando no quadro vizinho.** Quando dois quadros se colam, o
  corte cai na coluna com menos pixels do trecho — o cabo fino da picareta — e
  não no meio do corpo.
- **Escala.** Todas as tiras são medidas juntas e recebem a MESMA escala; sem
  isso o herói mudaria de tamanho ao trocar de animação.
- **Alinhamento.** Cada quadro é ancorado pelos pés, com o centro horizontal
  medido nas pernas (não na caixa de conteúdo, senão a picareta esticada
  empurraria o corpo para o lado).

**O que você precisa garantir:**

1. Todos os quadros da mesma tira com o personagem **do mesmo tamanho** e
   **virado para a direita** (o motor espelha para a esquerda).
2. Fundo transparente ou chapado (branco/preto uniforme).
3. Nada de sombra no chão, brilho da lanterna projetado ou partículas — o motor
   desenha isso por cima.

**Como o jogo escolhe o quadro:** pelo estado físico, não por um timer solto.
O pulo segue a velocidade vertical real, a mineração segue o arco do golpe, a
caminhada e a escalada seguem a distância percorrida. Por isso a animação
"obedece" ao controle em vez de andar sozinha.

As cópias da copiadora usam as mesmas tiras, recoloridas em tempo de execução —
elas são o protagonista, então precisam ser o mesmo desenho.

## CRIATURAS — folha 6x5

Uma imagem por bicho, `arte-bruta/criaturas/<nome>.png`, fundo transparente.
Grade de **6 quadros na horizontal x 5 linhas**, nesta ordem de cima para baixo:

| linha | animação |
|---|---|
| 1 | parado |
| 2 | andando |
| 3 | atacando |
| 4 | levando dano |
| 5 | morrendo |

Rode `npm run slice-assets`. Saem 5 tiras por bicho em
`public/art/creatures/<nome>_<animação>.png`.

**O que o fatiador resolve:** as linhas são achadas por banda (o espaço entre
elas varia), e cada fronteira de coluna cai na **coluna com menos pixels** perto
da posição ideal — em bicho largo os quadros se encostam e não existe lacuna
limpa. Depois de cortar, só o **maior aglomerado** de cada célula é mantido:
sem isso a lasca do vizinho entra na caixa de conteúdo e encolhe o bicho todo.

**O que você garante:** bicho virado para a **direita**, mesmo tamanho em todos
os quadros da mesma folha, sem sombra no chão (o motor desenha).

## Paleta oficial (use nos prompts futuros)

| Uso | Hex |
|---|---|
| Terra | `#6b4a2f` / `#54381f` / `#83603f` |
| Pedra | `#5c5c66` / `#46464f` / `#74747f` |
| Pedra profunda | `#3b3b46` |
| Carvão | `#1f1f25` |
| Cobre | `#c0713a` → `#f0b077` |
| Ferro | `#b9c2cc` → `#eef3f8` |
| Ouro | `#d9a828` → `#ffe9a3` |
| Cristal | `#8c5ce0` → `#e0c8ff` |
| Tijolo antigo | `#4a5352` |
| Madeira | `#7a5533` |
| Rocha-mãe | `#26262c` |
| Fundo de galeria | `#3a2718` / `#2c2c33` / `#1e1e25` |
| Herói: pele / capacete / macacão | `#e8c39a` / `#e8b33a` / `#4a7ba8` |
| Destaque de UI | `#ffc453` |

## O que o motor já faz (NÃO desenhe na arte)

Brilho no topo e sombra embaixo de cada bloco · rachaduras em 4 estágios · flash branco de
impacto · partículas, poeira e faíscas · sombra elíptica sob o personagem · escuridão por
profundidade e lanterna · espelhamento para a esquerda.

## Leva 2 (depois que esta entrar)

Ícones de recurso (carvão, cobre, ferro, ouro, cristal, pedra) · ícones das 5 picaretas para a
oficina · cenário da superfície (galpão, depósito, entrada da mina) · NPC Jonas · a marca do pai.

---

# Leva 3 — Chefes, cidades subterraneas e os personagens coringa

Esta leva nasceu de um problema de jogo, nao de um problema visual: o jogador
chegava nas Ruinas Antigas rapido demais e o fundo da mina nao parecia um
*lugar*. A resposta foi um chefe guardiao por bioma e uma historia que nao se
resolve descendo. Agora esses momentos precisam de cara.

**Ordem de prioridade**, se voce so tiver tempo para uma coisa: PEDIDO 4
(chefes) antes de tudo. Eles sao o climax de cada camada e hoje sao silhueta.

---

## PEDIDO 4 — os 6 chefes guardioes (folha 6x5, uma por chefe)

Mesmo formato das criaturas comuns: **uma imagem por chefe**, grade de 6 quadros
na horizontal x 5 linhas (parado / andando / atacando / levando dano / morrendo),
fundo transparente, bicho virado para a **direita**, mesmo tamanho em todos os
quadros. Salve em `arte-bruta/criaturas/<id>.png` com o id exato da tabela.

```
Gere UMA folha de sprites para um chefe de um jogo 2D de mineracao em arte
cartoon pintada a mao, qualidade de jogo mobile premium.

FORMATO (igual para todos os chefes):
- Imagem 1536x1280, fundo TRANSPARENTE.
- Grade de 6 colunas x 5 linhas. Cada celula tem UM quadro da animacao.
- Linha 1 parado (respirando), linha 2 andando, linha 3 atacando,
  linha 4 levando dano, linha 5 morrendo/desmoronando.
- A criatura ocupa a MESMA altura em todos os 30 quadros e olha para a DIREITA.
- SEM sombra no chao, SEM particula, SEM brilho projetado, SEM texto,
  SEM moldura, SEM fundo: o motor desenha tudo isso por cima.
- Contorno escuro fino e legivel: no jogo ele aparece com 2x a altura do
  jogador, mas sobre rocha escura.

ESTE CHEFE: <cole o bloco da tabela abaixo>

LEITURA A DISTANCIA: mesmo com 10% do tamanho da imagem, precisa dar para
dizer onde e a cabeca, onde e o golpe, e de que camada ele e — a cor de
destaque dele tem que gritar isso.
```

| id do arquivo | camada | descricao para colar no prompt |
|---|---|---|
| `boss_golem_escombros` | Pedra (50 m) | Golem de Escombros: monte de pedra cinza `#5c5c66` e vigas de madeira quebrada `#7a5533` do proprio andaime da mina, juntados numa figura corcunda de bracos enormes e pernas curtas. Nao tem rosto — dois pontos de luz ambar `#ffc453` fazem o lugar dos olhos. Parece a mina se levantando para se defender. |
| `boss_arauto_quartzo` | Cristal (200 m) | Arauto de Quartzo: figura esguia e ereta feita de quartzo roxo translucido `#8c5ce0` -> `#e0c8ff`, com lascas flutuando presas ao corpo. Cabeca e um unico prisma sem face. Luz interna pulsante. Elegante, quase cerimonial — nao e um bicho, e uma coisa que foi *feita*. |
| `boss_automato_enferrujado` | Minerais (500 m) | Automato Enferrujado: maquina humanoide de metal `#b9c2cc` tomado de ferrugem `#c0713a`, engrenagens expostas, um dos bracos terminando em broca. Postura pesada e desengoncada, como se funcionasse ha tempo demais. Uma placa apagada no peito, ilegivel. Tecnologia que nao bate com a epoca. |
| `boss_fundidor_incandescente` | Magma (900 m) | Fundidor Incandescente: massa de rocha preta `#26262c` rachada com magma vivo `#c24a1e` -> `#ffc453` correndo por dentro das fendas. Ombros largos, bracos que terminam em pocas derretidas escorrendo. As rachaduras abrem quando ele ataca. |
| `boss_escriba_selado` | Ruinas (1300 m) | Escriba Selado: figura alta e magra de tijolo antigo `#4a5352` com traje de pedra entalhado de simbolos verdes `#2f9a7a` que brilham fraco. No lugar do rosto, uma placa lisa com uma unica inscricao. Segura um bastao-estilete. Postura de quem esta *registrando* voce, nao lutando. |
| `boss_eco_portal` | Abismo (1700 m) | Eco do Portal: silhueta quase humana feita de vazio roxo-escuro `#3a2352` com bordas que se desfazem em fiapos de luz `#9a4fe0`. Dentro do peito, um anel de luz — igual ao portal. E grande e curvado, e alguma coisa nele lembra um mineiro de capacete, so que errado. Perturbador sem ser sangrento. |

> O Eco do Portal e o unico que pode lembrar uma pessoa. E de proposito, e a
> duvida que o jogo nunca responde. **Nao** o desenhe com rosto reconhecivel.

---

## PEDIDO 5 — cidades subterraneas (7 pecas de cenario)

Isto **nao** e bloco de mina. Sao pecas grandes de construcao, desenhadas para
serem repetidas e empilhadas formando ruas, fachadas e pracas dentro das
Ruinas Antigas (1300 m) e do Abismo (1700 m).

```
Gere 7 IMAGENS SEPARADAS de pecas de cenario para uma cidade subterranea
abandonada, num jogo 2D de mineracao em arte cartoon pintada a mao, qualidade
de jogo mobile premium, vista LATERAL de corte (como Terraria), sem
perspectiva.

REGRAS IGUAIS PARA AS 7:
- Cada imagem e 1024x1024, a arte preenche de borda a borda.
- Peca pensada para LADRILHAR: a metade esquerda encaixa na metade direita da
  mesma peca. Continuidade e mais importante que composicao bonita.
- SEM moldura, SEM vinheta, SEM contorno externo escuro, SEM sombra projetada
  para fora, SEM texto legivel em nenhum alfabeto real.
- Paleta fria e apagada: tijolo antigo #4a5352, pedra profunda #3b3b46,
  rocha-mae #26262c, verde-limo #2f9a7a. UMA cor quente so, usada com
  parcimonia: #ffc453.
- Iluminacao uniforme do canto superior esquerdo. O motor faz a escuridao por
  profundidade e a luz da lanterna — nao pinte holofote nem feixe.
- Nada de gente, nada de esqueleto, nada de sangue.

REGRA DE CLIMA (a mais importante): esta cidade foi ABANDONADA COM PRESSA, nao
destruida numa guerra. Coisas ficaram no lugar. Uma porta aberta. Uma escada
que ainda funciona. Isso assusta mais que escombro.

AS 7 PECAS:
1. PAREDE DE FACHADA — bloco de tijolo antigo com juntas largas, uma janela
   quadrada vazia e escura, marcas de agua escorrida.
2. PAREDE LISA DE RUA — mesma alvenaria sem abertura, para preencher entre as
   fachadas. Mais simples de proposito.
3. PISO DE PRACA — lajota grande gasta, algumas soltas, limo verde nas frestas.
4. COLUNA — fuste entalhado de cima a baixo, para empilhar em altura qualquer;
   o topo e a base precisam casar com a propria peca.
5. ARCO / PORTAL DE RUA — vao em arco cheio, batente entalhado, escuridao
   solida do outro lado.
6. TELHADO / BEIRAL — cobertura em degraus que fecha o topo de uma fachada e
   encosta na rocha.
7. ESCADARIA — degraus largos em diagonal, desgastados no meio de tanto uso.
```

Salve em `arte-bruta/cidade/01.png` ... `07.png`, na ordem da lista.

**Por que 7 e nao 20:** com fachada + parede lisa + piso + coluna + arco +
beiral + escada da para montar quarteirao, rua, praca e viela. Peca demais
antes do gerador existir e trabalho jogado fora.

---

## PEDIDO 6 — os personagens coringa (folha 4x4, um por personagem)

Sao os mineiros perdidos: cada um entrega uma peca da historia do pai e some do
mapa. Hoje os 6 sao o **mesmo boneco vetorial** — e o pior problema narrativo do
jogo, porque a historia depende de eles parecerem pessoas diferentes.

```
Gere UMA folha de sprites de um personagem humano para um jogo 2D de mineracao
em arte cartoon pintada a mao, qualidade de jogo mobile premium.

FORMATO:
- Imagem 1024x1024, fundo TRANSPARENTE.
- Grade de 4 colunas x 4 linhas:
  linha 1 = ENCOLHIDO (preso, sentado, esperando socorro) — 4 quadros de
            respiracao, quase parado;
  linha 2 = LEVANTANDO / reagindo ao ser encontrado;
  linha 3 = FALANDO (gesto de mao, 4 quadros em loop);
  linha 4 = ANDANDO embora, de costas para a camera, saindo de cena.
- Mesma altura em todos os 16 quadros. Virado para a DIREITA (menos a linha 4).
- Corpo inteiro, proporcao levemente cartoon: cabeca grande, mao grande,
  leitura facil em tamanho pequeno.
- SEM sombra no chao, SEM feixe de lanterna, SEM particula, SEM texto,
  SEM fundo.
- Todos usam capacete de mineiro com lampada APAGADA (o motor acende).
  Roupa suja, gasta, funcional.

ESTE PERSONAGEM: <cole o bloco da tabela abaixo>

REGRA DE ELENCO: os 6 precisam parecer o mesmo jogo e pessoas DIFERENTES —
silhueta diferente, idade diferente, cor de traje diferente. Se voce cobrir a
cara de todos, ainda tem que dar para dizer quem e quem.
```

| id do arquivo | onde | quem e |
|---|---|---|
| `npc_jonas` | Pedra, 118 m | Jonas: homem de meia idade, corpo largo, barba curta grisalha, macacao azul `#4a7ba8` desbotado igual ao do heroi. O mineiro comum, o primeiro rosto amigo. Cansado, mas de pe. |
| `npc_helena` | Cristal, 260 m | Helena: geologa, 30 e poucos, magra e alta, jaleco de campo bege por cima do macacao, oculos de protecao na testa, uma bolsa de amostras cheia de lascas roxas `#8c5ce0`. Postura de quem estava trabalhando, nao fugindo. |
| `npc_baptista` | Minerais, 600 m | Baptista: mecanico mais velho, baixo e atarracado, macacao laranja-ferrugem `#c0713a` coberto de graxa, cinto de ferramentas pesado, uma peca de metal estranha `#b9c2cc` debaixo do braco que ele nao larga. |
| `npc_ferreira` | Magma, 980 m | Ferreira: capataz, ombros quadrados, traje termico grosso cinza-escuro com faixas refletivas apagadas, cracha da empresa no peito, prancheta amassada na mao. O unico que parece estar seguindo ordens ate agora. |
| `npc_corvo` | Ruinas, 1400 m | Corvo: batedor jovem e magro, sem macacao de empresa — roupa remendada, capuz, corda enrolada no ombro, faca curta. Agachado, pronto para correr. Nao trabalha para ninguem. |
| `npc_ultima_luz` | Abismo, 1780 m | A Voz: figura encurvada de traje irreconhecivel de tao gasto, coberta de poeira clara, capacete velho de um modelo que ninguem mais usa. Rosto quase todo na sombra da aba. Nao esta ferida e nao parece com pressa. Poderia ser qualquer pessoa — e esse e o ponto. |

> **A Voz nao pode ser identificavel como o pai e nao pode ser claramente
> outra pessoa.** Se o desenho responder essa pergunta, o desenho esta errado.

Rode `npm run slice-assets` depois de salvar.

## Leva 4 (depois desta)

Entrada da cidade subterranea (peca unica, momento de "cheguei") · mobilia solta
(carrinho de minerio virado, lampiao, caixote) · o gravador do pai como item ·
a porta selada do fim · retrato de busto dos 6 mineiros para o balao de dialogo.


---

## NPCs — folhas 5x3 (leva real, ja no jogo)

Dez folhas entregues em 16/09/2026, uma por personagem, em
`arte-bruta/npcs/<id>.png`. Grade de **5 colunas x 3 linhas**: linha 1 parado,
linhas 2 e 3 andando.

```bash
npm run slice-npcs
```

Saem duas tiras de 5 quadros por personagem em `public/art/npc/`:
`<id>_idle.png` e `<id>_walk.png`.

**O que o fatiador resolve:** cortar na grade exata nao serve, porque cada
personagem ocupa uma parte diferente da propria celula — cada quadro sairia com
um deslocamento proprio e a animacao tremeria. Entao ele recorta cada quadro
pelo CONTEUDO (caixa do que nao e transparente), aplica a MESMA escala em toda
a tira (a referencia e o quadro mais alto, senao o personagem cresce e encolhe
enquanto anda) e alinha todos pelos PES.

| id do arquivo | quem e | onde |
|---|---|---|
| `mara_avelar` | Primeira Lanterna | Blockia |
| `silas_arcos` | ferreiro | Blockia |
| `nina_candeia` | Mercado da Ponte | Blockia |
| `breno_torga` | mestre dos elevadores | Blockia |
| `irene_salles` | medica | Blockia |
| `afonso_greda` | arquivista | Blockia |
| `lio` | 11 anos | Blockia |
| `npc_jonas` | mineiro preso | 38 m |
| `npc_vilma` | mineira presa | 260 m |
| `npc_teo` | mineiro preso | 600 m |

Faltam folhas para `npc_ozias`, `npc_braga` e `npc_ultima_luz` — esses tres
continuam como silhueta vetorial, sem quebrar nada.

Para adicionar mais: solte a folha em `arte-bruta/npcs/<id>.png`, acrescente o
id em `ART.npcArts` (`/data/art.ts`) e rode o fatiador.
