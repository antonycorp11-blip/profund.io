# Caderno de Assets — Leva 1 (personagem + blocos)

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
