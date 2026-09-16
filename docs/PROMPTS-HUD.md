# Prompts de arte

Duas partes, e elas fazem coisas diferentes:

- **Parte 1 — folhas de pecas** (13 blocos, 130 assets): cada bloco devolve dez
  pecas soltas em grade, com fundo transparente, para recortar e usar no jogo.
  Sao os arquivos de verdade.
- **Parte 2 — telas inteiras** (10 blocos): cada bloco devolve UMA tela cheia
  montada, 16:9, como os mocks. Nao vao para o jogo — servem de alvo: e delas
  que sai a decisao de onde cada coisa fica, e e contra elas que se confere se
  as pecas da Parte 1 ficaram certas.

A diferenca mais importante entre as duas: na Parte 1 texto e PROIBIDO, na
Parte 2 o texto faz parte do desenho e esta escrito em cada prompt.

---

# Parte 1 — Folhas de pecas

Treze blocos prontos para copiar. **Cada bloco e um texto so**: cole inteiro no
chat, sem montar nada, e volta uma folha com dez assets em grade para recortar.

A ordem importa pouco, com uma excecao: **gere o Prompt 7 antes dos 8 a 13**. E
ele que fixa o acabamento das telas cheias, e vale ter a referencia na mao
quando as outras vierem.

Se a folha voltar com rotulo escrito embaixo dos icones (acontece), reclame uma
vez: "refaca sem nenhum texto na imagem". Se vier tudo grudado num objeto so,
peca em duas metades de cinco.

---

## Prompt 1 — HUD: icones de navegacao e leitura

Os cinco botoes do topo da tela e os icones dos cartoes de estado.

```
ESTILO (vale para todos os assets desta imagem):
Arte de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista com volume suave, acabamento de UI de jogo mobile premium: metal
dourado trabalhado sobre fundo de caverna escura. NAO e pixel art, NAO e vetor
chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA (use exatamente estas cores):
ouro claro #F5D98A - ouro medio #E8B44A - bronze #8A5F22 - preto-terra #16110C
- carvao #241B13 - vermelho #C4332A - azul #4A9FD8 - roxo #A855F7 - ambar
#FFC453 - papel envelhecido #E8D9B8.

REGRAS OBRIGATORIAS:
- Fundo 100% TRANSPARENTE (PNG com alpha). Sem cartao de fundo, sem moldura da
  folha, sem sombra projetada para fora do objeto.
- Luz sempre vindo de CIMA E DA ESQUERDA, igual em todos.
- NENHUM texto, letra, numero, rotulo, legenda ou marca d'agua em lugar nenhum
  da imagem. Nem dentro dos assets, nem embaixo deles.
- Um asset por celula, centralizado, com cerca de 8% de margem livre.
- Silhueta legivel em tamanho pequeno: forma cheia, contorno escuro grosso, no
  maximo tres tons por objeto mais um brilho.
- Mesmo peso visual e mesmo tamanho aparente entre os dez.

Gere UMA imagem PNG de 1280x512 px, fundo transparente, com uma grade de 5
colunas por 2 linhas. Cada celula tem 256x256 px e contem UM icone solto, sem
moldura e sem fundo proprio. Ordem da esquerda para a direita, de cima para
baixo:

1. Picareta cruzada com uma chave inglesa, vista de tres quartos, metal dourado
2. Braco flexionado de mineiro com a manga arregacada, musculo marcado, dourado
3. Caderno de campo aberto, paginas envelhecidas, fita marcadora vermelha
4. Capacete de mineiro com visor e lanterna frontal acesa, metal dourado
5. Engrenagem de seis dentes com furo central, metal dourado
6. Alfinete de mapa gordo de base arredondada, metal dourado
7. Coracao cheio levemente facetado como uma gema, vermelho #C4332A
8. Moeda de ouro com uma picareta gravada em relevo
9. Losango de cristal roxo #A855F7 com brilho interno
10. Lanterna de mineiro pendurada pela alca, chama ambar visivel
```

---

## Prompt 2 — HUD: molduras e placas

As pecas que emolduram o HUD. Precisam esticar pelo meio (9-slice): cantos
ornamentados, bordas repetiveis, centro liso.

```
ESTILO (vale para todos os assets desta imagem):
Arte de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista com volume suave, acabamento de UI de jogo mobile premium: metal
dourado trabalhado sobre fundo de caverna escura. NAO e pixel art, NAO e vetor
chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA (use exatamente estas cores):
ouro claro #F5D98A - ouro medio #E8B44A - bronze #8A5F22 - preto-terra #16110C
- carvao #241B13 - vermelho #C4332A - azul #4A9FD8 - roxo #A855F7 - ambar
#FFC453 - papel envelhecido #E8D9B8.

REGRAS OBRIGATORIAS:
- Fundo 100% TRANSPARENTE (PNG com alpha). Sem cartao de fundo, sem moldura da
  folha, sem sombra projetada para fora do objeto.
- Luz sempre vindo de CIMA E DA ESQUERDA, igual em todos.
- NENHUM texto, letra, numero, rotulo, legenda ou marca d'agua em lugar nenhum
  da imagem. Nem dentro dos assets, nem embaixo deles.
- Um asset por celula, centralizado, com cerca de 8% de margem livre.
- Silhueta legivel em tamanho pequeno: forma cheia, contorno escuro grosso, no
  maximo tres tons por objeto mais um brilho.
- Mesmo peso visual e mesmo tamanho aparente entre os dez.

Gere UMA imagem PNG de 1536x768 px, fundo transparente, com uma grade de 5
colunas por 2 linhas, celulas de 307x384 px. Cada celula contem UMA moldura de
interface VAZIA, vista de frente, sem perspectiva, com o interior preto-terra
quase opaco e levemente mais claro no topo:

1. Moldura quadrada de retrato, proporcao 1:1, rebite maior no canto superior esquerdo
2. Placa horizontal comprida e baixa, tipo faixa, com as duas pontas chanfradas
3. Barra longa horizontal dividida em cinco compartimentos iguais por separadores finos de metal
4. Painel retangular vertical com dobradica no topo e um pequeno anel de pendurar
5. Painel quase quadrado com os quatro cantos reforcados por cantoneiras de metal
6. Botao redondo grande com anel duplo de metal dourado e interior escuro
7. Botao redondo medio com anel simples e interior escuro
8. Botao redondo pequeno com anel fino e interior escuro
9. Tarja horizontal estreita com as pontas em ponta de flecha
10. Calha de barra de progresso: trilho vazio, fundo afundado, borda metalica

Todas as dez com a mesma espessura de borda e o mesmo brilho de metal.
```

---

## Prompt 3 — HUD: minerios e materiais

Substituem os cinco que ja existem em `public/art/ui/` e completam a lista.

```
ESTILO (vale para todos os assets desta imagem):
Arte de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista com volume suave, acabamento de UI de jogo mobile premium: metal
dourado trabalhado sobre fundo de caverna escura. NAO e pixel art, NAO e vetor
chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA (use exatamente estas cores):
ouro claro #F5D98A - ouro medio #E8B44A - bronze #8A5F22 - preto-terra #16110C
- carvao #241B13 - vermelho #C4332A - azul #4A9FD8 - roxo #A855F7 - ambar
#FFC453 - papel envelhecido #E8D9B8.

REGRAS OBRIGATORIAS:
- Fundo 100% TRANSPARENTE (PNG com alpha). Sem cartao de fundo, sem moldura da
  folha, sem sombra projetada para fora do objeto.
- Luz sempre vindo de CIMA E DA ESQUERDA, igual em todos.
- NENHUM texto, letra, numero, rotulo, legenda ou marca d'agua em lugar nenhum
  da imagem. Nem dentro dos assets, nem embaixo deles.
- Um asset por celula, centralizado, com cerca de 8% de margem livre.
- Silhueta legivel em tamanho pequeno: forma cheia, contorno escuro grosso, no
  maximo tres tons por objeto mais um brilho.
- Mesmo peso visual e mesmo tamanho aparente entre os dez.

Gere UMA imagem PNG de 1280x512 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 256x256 px. Cada celula tem UM punhado de minerio solto
visto de tres quartos, como item de inventario: pedras soltas agrupadas, NAO um
bloco quadrado, NAO minerio preso dentro da rocha. Mesmo angulo e mesma altura
de pilha nos dez:

1. Carvao: tres pedacos pretos foscos com brilho azulado fraco nas quinas
2. Cobre: pedacos laranja-avermelhados com veios esverdeados de oxidacao
3. Ferro: pedacos cinza-prata com faces metalicas planas
4. Ouro: pepitas douradas arredondadas com brilho quente forte
5. Cristal: prismas roxos translucidos com luz vindo de dentro
6. Pedra: cascalho cinza comum, fosco, sem brilho nenhum
7. Rubi: cristais vermelhos facetados de brilho profundo
8. Reliquia: fragmento de ceramica antiga com entalhe geometrico dourado
9. Pedra do vazio: cristal preto-azulado que parece absorver a luz, contorno arroxeado
10. Coque: briquetes de carvao processado, acinzentados, com brasa laranja viva nas frestas
```

---

## Prompt 4 — HUD: emblemas das habilidades ativas

Vao dentro dos botoes redondos pequenos e no cinto.

```
ESTILO (vale para todos os assets desta imagem):
Arte de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista com volume suave, acabamento de UI de jogo mobile premium: metal
dourado trabalhado sobre fundo de caverna escura. NAO e pixel art, NAO e vetor
chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA (use exatamente estas cores):
ouro claro #F5D98A - ouro medio #E8B44A - bronze #8A5F22 - preto-terra #16110C
- carvao #241B13 - vermelho #C4332A - azul #4A9FD8 - roxo #A855F7 - ambar
#FFC453 - papel envelhecido #E8D9B8.

REGRAS OBRIGATORIAS:
- Fundo 100% TRANSPARENTE (PNG com alpha). Sem cartao de fundo, sem moldura da
  folha, sem sombra projetada para fora do objeto.
- Luz sempre vindo de CIMA E DA ESQUERDA, igual em todos.
- NENHUM texto, letra, numero, rotulo, legenda ou marca d'agua em lugar nenhum
  da imagem. Nem dentro dos assets, nem embaixo deles.
- Um asset por celula, centralizado, com cerca de 8% de margem livre.
- Silhueta legivel em tamanho pequeno: forma cheia, contorno escuro grosso, no
  maximo tres tons por objeto mais um brilho.
- Mesmo peso visual e mesmo tamanho aparente entre os dez.

Gere UMA imagem PNG de 1280x512 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 256x256 px. Cada celula tem UM emblema de habilidade:
simbolo cheio e centralizado, SEM moldura e SEM circulo de fundo, legivel a
48 px:

1. Carga explosiva com estilhacos de rocha voando para fora e clarao laranja no centro
2. Ponta de broca helicoidal apontando para a direita, faiscas na ponta, metal dourado
3. Raio eletrico azul saltando em ziguezague entre dois blocos de pedra
4. Silhueta correndo dentro de uma seta circular de retorno, azul-claro
5. Ouvido encostado numa pedra com tres ondas concentricas saindo dela, branco-frio
6. Mira sobre uma rachadura em forma de estrela na rocha, laranja-quente
7. Escudo feito de placas de rocha sobrepostas, cinza-pedra
8. Mochila a jato de dois bicos com chama curta apontando para baixo
9. Feixe conico de luz saindo de uma lanterna e iluminando poeira, azul
10. Punho fechado de metal batendo e trincando a pedra, dourado
```

---

## Prompt 5 — HUD: estados, avisos e adornos

Pecas minusculas na tela. Exagere a silhueta.

```
ESTILO (vale para todos os assets desta imagem):
Arte de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista com volume suave, acabamento de UI de jogo mobile premium: metal
dourado trabalhado sobre fundo de caverna escura. NAO e pixel art, NAO e vetor
chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA (use exatamente estas cores):
ouro claro #F5D98A - ouro medio #E8B44A - bronze #8A5F22 - preto-terra #16110C
- carvao #241B13 - vermelho #C4332A - azul #4A9FD8 - roxo #A855F7 - ambar
#FFC453 - papel envelhecido #E8D9B8.

REGRAS OBRIGATORIAS:
- Fundo 100% TRANSPARENTE (PNG com alpha). Sem cartao de fundo, sem moldura da
  folha, sem sombra projetada para fora do objeto.
- Luz sempre vindo de CIMA E DA ESQUERDA, igual em todos.
- NENHUM texto, letra, numero, rotulo, legenda ou marca d'agua em lugar nenhum
  da imagem. Nem dentro dos assets, nem embaixo deles.
- Um asset por celula, centralizado, com cerca de 8% de margem livre.
- Silhueta legivel em tamanho pequeno: forma cheia, contorno escuro grosso, no
  maximo tres tons por objeto mais um brilho.
- Mesmo peso visual e mesmo tamanho aparente entre os dez.

Gere UMA imagem PNG de 1280x512 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 256x256 px:

1. Selo circular vermelho liso de notificacao, com brilho interno
2. Cadeado fechado de metal escuro, grosso e atarracado
3. Marca de confirmacao grossa em verde-oliva metalico
4. Seta chevron apontando para a direita, feita de chapa de metal dourado
5. Quatro cantoneiras de metal formando um quadrado aberto no meio
6. Triangulo de atencao com uma exclamacao, ambar
7. Anel de recarga: circulo aberto com um arco preenchido em ambar
8. Selo pequeno em forma de gota com brilho, dourado
9. Pergaminho enrolado amarrado com um cordao
10. Ornamento de canto: volutas de metal dourado formando um L

O item 10 deve ser desenhado APENAS na orientacao de canto superior esquerdo.
```

---

## Prompt 6 — HUD: marcadores do minimapa

Aparecem com 12 a 18 px. Silhueta e cor fazem todo o trabalho.

```
ESTILO (vale para todos os assets desta imagem):
Arte de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista com volume suave, acabamento de UI de jogo mobile premium: metal
dourado trabalhado sobre fundo de caverna escura. NAO e pixel art, NAO e vetor
chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA (use exatamente estas cores):
ouro claro #F5D98A - ouro medio #E8B44A - bronze #8A5F22 - preto-terra #16110C
- carvao #241B13 - vermelho #C4332A - azul #4A9FD8 - roxo #A855F7 - ambar
#FFC453 - papel envelhecido #E8D9B8.

REGRAS OBRIGATORIAS:
- Fundo 100% TRANSPARENTE (PNG com alpha). Sem cartao de fundo, sem moldura da
  folha, sem sombra projetada para fora do objeto.
- Luz sempre vindo de CIMA E DA ESQUERDA, igual em todos.
- NENHUM texto, letra, numero, rotulo, legenda ou marca d'agua em lugar nenhum
  da imagem. Nem dentro dos assets, nem embaixo deles.
- Um asset por celula, centralizado, com cerca de 8% de margem livre.
- Silhueta legivel em tamanho pequeno: forma cheia, contorno escuro grosso, no
  maximo tres tons por objeto mais um brilho.
- Mesmo peso visual e mesmo tamanho aparente entre os dez.

Gere UMA imagem PNG de 1280x512 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 256x256 px. Cada celula tem UM marcador de mapa visto de
frente, forma simples e cheia, com contorno escuro grosso para destacar sobre
qualquer fundo. SEM sombra projetada:

1. Losango branco-ambar com um halo suave em volta
2. Casinha de madeira com telhado de duas aguas
3. Pegada de bota
4. Pagina dobrada com um canto virado
5. Capacete de mineiro com uma mao erguida ao lado
6. Cranio de criatura com chifres curtos, vermelho
7. Focinho de toupeira de perfil, marrom
8. Pequeno automato de cabeca redonda, azul-metal
9. Placa circular lacrada com um X em relevo, roxo
10. Silhueta de tres torres com janelas acesas, ambar
```

---

## Prompt 7 — Telas cheias: o chassi comum

Serve para TODAS as telas cheias (Equipamento, Tecnologia, Guia, Atributos,
Automacao). Gere esta antes das outras: e ela que define o acabamento.

```
ESTILO (vale para todos os assets desta imagem):
Arte de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista com volume suave, acabamento de UI de jogo mobile premium: metal
dourado trabalhado sobre fundo de caverna escura. NAO e pixel art, NAO e vetor
chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA (use exatamente estas cores):
ouro claro #F5D98A - ouro medio #E8B44A - bronze #8A5F22 - preto-terra #16110C
- carvao #241B13 - vermelho #C4332A - azul #4A9FD8 - roxo #A855F7 - ambar
#FFC453 - papel envelhecido #E8D9B8.

REGRAS OBRIGATORIAS:
- Fundo 100% TRANSPARENTE (PNG com alpha). Sem cartao de fundo, sem moldura da
  folha, sem sombra projetada para fora do objeto.
- Luz sempre vindo de CIMA E DA ESQUERDA, igual em todos.
- NENHUM texto, letra, numero, rotulo, legenda ou marca d'agua em lugar nenhum
  da imagem. Nem dentro dos assets, nem embaixo deles.
- Um asset por celula, centralizado, com cerca de 8% de margem livre.
- Silhueta legivel em tamanho pequeno: forma cheia, contorno escuro grosso, no
  maximo tres tons por objeto mais um brilho.
- Mesmo peso visual e mesmo tamanho aparente entre os dez.

Gere UMA imagem PNG de 1536x768 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 307x384 px. Cada celula contem UMA peca de interface
VAZIA, de frente, sem perspectiva e sem nada escrito:

1. Painel grande de conteudo: moldura dourada dupla, interior preto-terra, cantos com rebite
2. Painel lateral estreito de detalhe, mesma familia, borda interna mais fina
3. Aba de navegacao INATIVA: pilula horizontal de metal escurecido, borda bronze fosca
4. Aba de navegacao ATIVA: a mesma pilula em ouro aceso, com brilho ambar por dentro
5. Cartao de item em repouso: retangulo vertical, borda fina, interior carvao
6. Cartao de item SELECIONADO: o mesmo retangulo com borda dourada grossa e halo ambar
7. Cartao de item BLOQUEADO: o mesmo retangulo acinzentado, dessaturado, borda apagada
8. Botao primario: retangulo largo de ouro escovado com bisel alto
9. Botao secundario: retangulo largo de metal escuro com borda dourada fina
10. Botao desabilitado: retangulo largo cinza-chumbo, fosco, sem brilho

As dez pecas precisam parecer o mesmo conjunto: mesma espessura de borda,
mesmo raio de canto, mesmo material.
```

---

## Prompt 8 — Equipamento: os itens vestiveis

Os icones dos cartoes de equipamento.

```
ESTILO (vale para todos os assets desta imagem):
Arte de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista com volume suave, acabamento de UI de jogo mobile premium: metal
dourado trabalhado sobre fundo de caverna escura. NAO e pixel art, NAO e vetor
chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA (use exatamente estas cores):
ouro claro #F5D98A - ouro medio #E8B44A - bronze #8A5F22 - preto-terra #16110C
- carvao #241B13 - vermelho #C4332A - azul #4A9FD8 - roxo #A855F7 - ambar
#FFC453 - papel envelhecido #E8D9B8.

REGRAS OBRIGATORIAS:
- Fundo 100% TRANSPARENTE (PNG com alpha). Sem cartao de fundo, sem moldura da
  folha, sem sombra projetada para fora do objeto.
- Luz sempre vindo de CIMA E DA ESQUERDA, igual em todos.
- NENHUM texto, letra, numero, rotulo, legenda ou marca d'agua em lugar nenhum
  da imagem. Nem dentro dos assets, nem embaixo deles.
- Um asset por celula, centralizado, com cerca de 8% de margem livre.
- Silhueta legivel em tamanho pequeno: forma cheia, contorno escuro grosso, no
  maximo tres tons por objeto mais um brilho.
- Mesmo peso visual e mesmo tamanho aparente entre os dez.

Gere UMA imagem PNG de 1280x512 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 256x256 px. Cada celula tem UMA peca de equipamento vista
de tres quartos, como item de inventario, apoiada no nada, SEM manequim e SEM
corpo dentro:

1. Colete de couro grosso e gasto, costura aparente, fivelas de bronze
2. Peitoral de placas de aco rebitadas, pesado, com arranhoes de uso
3. Traje acolchoado de forro grosso com tiras reforcadas e gola alta
4. Mochila de lona marrom bem grande, varios bolsos e fivelas
5. Par de asas de planador dobraveis, armacao de metal e tecido bege
6. Mochila a jato de dois bicos cromados com chama curta acesa
7. Capacete de mineiro reforcado com lanterna frontal apagada
8. Lanterna de cabeca com cinta elastica e lente acesa em ambar
9. Par de botas de couro com sola cravada e bico de aco
10. Picareta de mineiro com cabo de madeira gasto e cabeca de metal
```

---

## Prompt 9 — Equipamento: boneco, encaixes e atributos

A metade esquerda da tela de Equipamento.

```
ESTILO (vale para todos os assets desta imagem):
Arte de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista com volume suave, acabamento de UI de jogo mobile premium: metal
dourado trabalhado sobre fundo de caverna escura. NAO e pixel art, NAO e vetor
chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA (use exatamente estas cores):
ouro claro #F5D98A - ouro medio #E8B44A - bronze #8A5F22 - preto-terra #16110C
- carvao #241B13 - vermelho #C4332A - azul #4A9FD8 - roxo #A855F7 - ambar
#FFC453 - papel envelhecido #E8D9B8.

REGRAS OBRIGATORIAS:
- Fundo 100% TRANSPARENTE (PNG com alpha). Sem cartao de fundo, sem moldura da
  folha, sem sombra projetada para fora do objeto.
- Luz sempre vindo de CIMA E DA ESQUERDA, igual em todos.
- NENHUM texto, letra, numero, rotulo, legenda ou marca d'agua em lugar nenhum
  da imagem. Nem dentro dos assets, nem embaixo deles.
- Um asset por celula, centralizado, com cerca de 8% de margem livre.
- Silhueta legivel em tamanho pequeno: forma cheia, contorno escuro grosso, no
  maximo tres tons por objeto mais um brilho.
- Mesmo peso visual e mesmo tamanho aparente entre os dez.

Gere UMA imagem PNG de 1280x512 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 256x256 px:

1. Moldura quadrada de encaixe VAZIO: borda dourada, interior escuro, silhueta pontilhada por dentro
2. A mesma moldura de encaixe PREENCHIDA: borda mais grossa e brilho ambar em volta
3. No de conexao: pequeno circulo de metal dourado com furo central
4. Trecho de cabo de conexao: linha dourada curta com um leve arco e pontas arredondadas
5. Plataforma de pedra redonda, vista de tres quartos, para o personagem ficar em cima
6. Emblema de escudo vazio, metal dourado, para servir de brasao
7. Icone de coracao cheio, vermelho, com brilho quente
8. Icone de espada curta cruzada com uma picareta, metal prata
9. Icone de bota de caminhada de perfil, couro marrom
10. Icone de raio dentro de um circulo, ambar
```

---

## Prompt 10 — Guia de Campo: a papelaria

O caderno do Santiago. Aqui a familia visual muda: papel e tinta, nao metal.

```
ESTILO (vale para todos os assets desta imagem):
Arte de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista com volume suave, acabamento de UI de jogo mobile premium: metal
dourado trabalhado sobre fundo de caverna escura. NAO e pixel art, NAO e vetor
chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA (use exatamente estas cores):
ouro claro #F5D98A - ouro medio #E8B44A - bronze #8A5F22 - preto-terra #16110C
- carvao #241B13 - vermelho #C4332A - azul #4A9FD8 - roxo #A855F7 - ambar
#FFC453 - papel envelhecido #E8D9B8.

REGRAS OBRIGATORIAS:
- Fundo 100% TRANSPARENTE (PNG com alpha). Sem cartao de fundo, sem moldura da
  folha, sem sombra projetada para fora do objeto.
- Luz sempre vindo de CIMA E DA ESQUERDA, igual em todos.
- NENHUM texto, letra, numero, rotulo, legenda ou marca d'agua em lugar nenhum
  da imagem. Nem dentro dos assets, nem embaixo deles.
- Um asset por celula, centralizado, com cerca de 8% de margem livre.
- Silhueta legivel em tamanho pequeno: forma cheia, contorno escuro grosso, no
  maximo tres tons por objeto mais um brilho.
- Mesmo peso visual e mesmo tamanho aparente entre os dez.

Gere UMA imagem PNG de 1280x512 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 256x256 px. Tudo em papel envelhecido #E8D9B8, couro
marrom escuro e tinta sepia, SEM nenhuma palavra escrita:

1. Livro de couro marrom ABERTO e vazio, visto de cima, duas paginas em branco
2. Pagina solta de papel envelhecido com as bordas rasgadas
3. Aba de caderno de couro, formato de lingueta, para sair pela lateral
4. Fita marcadora de tecido vermelho descendo com a ponta em V
5. Clipe de papel de metal enferrujado
6. Pedaco de fita adesiva envelhecida, semitransparente, colada em diagonal
7. Moldura de foto polaroid VAZIA, branca e amarelada pelo tempo
8. Mancha de cafe redonda e translucida sobre o papel
9. Carimbo circular de tinta sepia, borrado, com uma picareta no centro
10. Lapis de carpinteiro gasto, apontado, deitado
```

---

## Prompt 11 — Tecnologia: pesquisa e bancada

A tela de pesquisa: prancheta, instrumento, bancada.

```
ESTILO (vale para todos os assets desta imagem):
Arte de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista com volume suave, acabamento de UI de jogo mobile premium: metal
dourado trabalhado sobre fundo de caverna escura. NAO e pixel art, NAO e vetor
chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA (use exatamente estas cores):
ouro claro #F5D98A - ouro medio #E8B44A - bronze #8A5F22 - preto-terra #16110C
- carvao #241B13 - vermelho #C4332A - azul #4A9FD8 - roxo #A855F7 - ambar
#FFC453 - papel envelhecido #E8D9B8.

REGRAS OBRIGATORIAS:
- Fundo 100% TRANSPARENTE (PNG com alpha). Sem cartao de fundo, sem moldura da
  folha, sem sombra projetada para fora do objeto.
- Luz sempre vindo de CIMA E DA ESQUERDA, igual em todos.
- NENHUM texto, letra, numero, rotulo, legenda ou marca d'agua em lugar nenhum
  da imagem. Nem dentro dos assets, nem embaixo deles.
- Um asset por celula, centralizado, com cerca de 8% de margem livre.
- Silhueta legivel em tamanho pequeno: forma cheia, contorno escuro grosso, no
  maximo tres tons por objeto mais um brilho.
- Mesmo peso visual e mesmo tamanho aparente entre os dez.

Gere UMA imagem PNG de 1280x512 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 256x256 px:

1. Frasco de laboratorio com liquido azul brilhante e bolhas
2. Prancheta de projeto com papel azul de blueprint preso por um grampo
3. Quadro-negro pequeno com moldura de madeira, superficie vazia
4. Compasso de desenho aberto sobre uma regua
5. Par de engrenagens entrelacadas, uma dourada e uma de aco
6. Bancada de oficina de madeira vista de tres quartos, tampo vazio
7. Ampulheta de bronze com areia dourada caindo
8. Lampada incandescente acesa com filamento em espiral
9. Carimbo retangular de aprovado, metal dourado, superficie lisa
10. Rolo de planta de engenharia parcialmente desenrolado, papel azulado
```

---

## Prompt 12 — Automacao: ajudantes e controles

A tela das copias e das toupeiras.

```
ESTILO (vale para todos os assets desta imagem):
Arte de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista com volume suave, acabamento de UI de jogo mobile premium: metal
dourado trabalhado sobre fundo de caverna escura. NAO e pixel art, NAO e vetor
chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA (use exatamente estas cores):
ouro claro #F5D98A - ouro medio #E8B44A - bronze #8A5F22 - preto-terra #16110C
- carvao #241B13 - vermelho #C4332A - azul #4A9FD8 - roxo #A855F7 - ambar
#FFC453 - papel envelhecido #E8D9B8.

REGRAS OBRIGATORIAS:
- Fundo 100% TRANSPARENTE (PNG com alpha). Sem cartao de fundo, sem moldura da
  folha, sem sombra projetada para fora do objeto.
- Luz sempre vindo de CIMA E DA ESQUERDA, igual em todos.
- NENHUM texto, letra, numero, rotulo, legenda ou marca d'agua em lugar nenhum
  da imagem. Nem dentro dos assets, nem embaixo deles.
- Um asset por celula, centralizado, com cerca de 8% de margem livre.
- Silhueta legivel em tamanho pequeno: forma cheia, contorno escuro grosso, no
  maximo tres tons por objeto mais um brilho.
- Mesmo peso visual e mesmo tamanho aparente entre os dez.

Gere UMA imagem PNG de 1280x512 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 256x256 px:

1. Retrato de toupeira mineradora simpatica de tres quartos, pelo marrom, capacete pequeno com lanterna
2. Retrato de automato mineiro de cabeca redonda e visor azul aceso, chassi de aco
3. O mesmo automato com chassi de cobre e visor laranja
4. O mesmo automato com chassi roxo escuro e visor violeta
5. Interruptor deslizante LIGADO: trilho arredondado verde com o botao a direita
6. Interruptor deslizante DESLIGADO: trilho arredondado cinza com o botao a esquerda
7. Controle deslizante: trilho horizontal fino com um botao redondo de metal no meio
8. Vagonete de mina cheio de minerio, visto de tres quartos
9. Caixote de madeira fechado com cintas de metal
10. Placa de madeira rustica pendurada por duas correntes, superficie vazia
```

---

## Prompt 13 — Atributos: o ninho

A arvore de atributos, desenhada como um ninho de formigas escavado.

```
ESTILO (vale para todos os assets desta imagem):
Arte de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista com volume suave, acabamento de UI de jogo mobile premium: metal
dourado trabalhado sobre fundo de caverna escura. NAO e pixel art, NAO e vetor
chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA (use exatamente estas cores):
ouro claro #F5D98A - ouro medio #E8B44A - bronze #8A5F22 - preto-terra #16110C
- carvao #241B13 - vermelho #C4332A - azul #4A9FD8 - roxo #A855F7 - ambar
#FFC453 - papel envelhecido #E8D9B8.

REGRAS OBRIGATORIAS:
- Fundo 100% TRANSPARENTE (PNG com alpha). Sem cartao de fundo, sem moldura da
  folha, sem sombra projetada para fora do objeto.
- Luz sempre vindo de CIMA E DA ESQUERDA, igual em todos.
- NENHUM texto, letra, numero, rotulo, legenda ou marca d'agua em lugar nenhum
  da imagem. Nem dentro dos assets, nem embaixo deles.
- Um asset por celula, centralizado, com cerca de 8% de margem livre.
- Silhueta legivel em tamanho pequeno: forma cheia, contorno escuro grosso, no
  maximo tres tons por objeto mais um brilho.
- Mesmo peso visual e mesmo tamanho aparente entre os dez.

Gere UMA imagem PNG de 1280x512 px, fundo transparente, grade de 5 colunas por
2 linhas, celulas de 256x256 px. Os itens de 1 a 5 sao ANEIS VAZIOS vistos de
frente, todos do mesmo diametro, para eu encaixar um icone dentro depois:

1. Anel de camara APRENDIDA: borda dourada grossa acesa, interior escuro, halo ambar
2. Anel de camara DISPONIVEL: borda dourada fina, interior escuro, brilho fraco pulsante
3. Anel de camara BLOQUEADA: borda de pedra cinza fosca, interior preto, sem brilho
4. Anel de camara NO MAXIMO: borda dourada dupla com pequenos entalhes em volta
5. Anel de camara SELECIONADA: borda dourada grossa com quatro cantoneiras destacadas fora dela
6. Trecho de galeria escavada RETO: tunel horizontal curto de terra escura com parede mais clara
7. Trecho de galeria escavada em CURVA suave, mesma terra, mesma parede
8. Trecho de galeria ACESA: o mesmo tunel reto com luz ambar quente vindo de dentro
9. Placa de camara: pequena tabuleta de metal dourado com as pontas chanfradas, superficie vazia
10. Retalho de parede de terra escavada, textura de terra batida com raizes finas
```


---

# Parte 2 — Telas inteiras

Um bloco, uma tela cheia montada em 16:9. Sao ALVO, nao arquivo do jogo: e
delas que sai a decisao de onde cada coisa fica, e e contra elas que se confere
se as pecas da Parte 1 sairam certas.

Aqui o texto FAZ PARTE do desenho e esta escrito em cada prompt, em portugues.
Gere a Tela 1 primeiro: e a que mais aparece no video, e as outras nove herdam
o acabamento dela.

---

## Tela 1 — HUD em jogo

A unica que fica por cima do jogo. E a que mais aparece no video.

```
ESTILO:
Mockup de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista, acabamento de UI de jogo mobile premium: metal dourado
trabalhado sobre caverna escura, iluminacao quente de lampiao. NAO e pixel art,
NAO e vetor chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA: ouro claro #F5D98A, ouro medio #E8B44A, bronze #8A5F22, preto-terra
#16110C, carvao #241B13, vermelho #C4332A, azul #4A9FD8, roxo #A855F7, ambar
#FFC453, papel envelhecido #E8D9B8.

FORMATO: uma unica imagem 1920x1080 px (16:9), tela cheia, sem moldura de
navegador, sem moldura de celular, sem maquete de dispositivo.

TIPOGRAFIA: fonte sem serifa condensada e forte para titulos e botoes, em caixa
alta; texto corrido em sem serifa normal. Todo o texto em PORTUGUES, exatamente
como escrito abaixo. Nada de texto inventado, nada de lorem ipsum, nada de
palavra em ingles.

Desenhe a TELA DE JOGO de um jogo de mineracao 2D de vista lateral, com o
cenario aparecendo por tras da interface.

CENARIO DE FUNDO: uma caverna de cristal a 236 metros de profundidade, parede
de rocha roxa escura com veios de cristal violeta brilhando e pepitas de ouro.
No terco esquerdo, uma cabana de madeira iluminada por dentro, construida sobre
uma plataforma de tabuas. Um mineiro de capacete com lanterna acesa em pe na
plataforma, de perfil, visto de corpo inteiro e pequeno na tela.

BARRA DO TOPO (igual em todas as telas): a esquerda, retrato quadrado de um
mineiro jovem de capacete com lanterna, ao lado o nome "SANTIAGO RAMIRES", a
linha "NV 15", uma barra de vida vermelha marcando 200/200 e uma barra de
experiencia dourada marcando 2.340 / 4.500 (53%); ao lado, um cartao "SALDO DA
BASE" com moeda dourada e o numero 3.918. No centro do topo, uma barra
horizontal ornamentada com cinco contadores de minerio: carvao 25, cobre 41,
ferro 18, ouro 7, cristal 142. A direita, cinco botoes quadrados com icone e
rotulo embaixo: SKILLS (picareta), ATRIBUTOS (braco flexionado, com um ponto
vermelho de aviso no canto), GUIA (caderno), TECNOLOGIA (capacete com
lanterna), AJUSTES (engrenagem).

A ESQUERDA, abaixo da barra: um cartao de missao com um pergaminho desenhado no
canto, o rotulo pequeno "MISSAO PRINCIPAL", o titulo "Nas Profundezas Minerais",
o texto "Tem mais um preso e a Pagina 02, a 560 m.", a linha "Chegue a 560 m" e
uma barra de progresso dourada marcando "236 / 560".

A DIREITA, abaixo da barra: um painel de minimapa com o titulo "CAVERNAS DE
CRISTAL" e um alfinete de mapa, a palavra "MAPA" no canto, um mapa em miniatura
de tuneis escavados em tons de roxo e ambar com um marcador verde no meio, e
embaixo "PROFUNDIDADE 236 m" e "Proxima em 264 m". Logo abaixo, um cartao
estreito com um focinho de toupeira e o texto "Copia 3 - Procurando trabalho
novo...".

NO CANTO INFERIOR DIREITO: um botao redondo grande e dourado com uma picareta e
o rotulo "MINERAR"; a esquerda dele um botao redondo azul menor com uma
silhueta correndo e o rotulo "PULAR"; e acima dos dois, em leque, quatro botoes
redondos pequenos com rotulo embaixo: "DETONACAO" (explosao laranja), "BROCA"
(bota marrom), "CHOQUE" (raio amarelo), "VOLTA RAPIDA" (corredor azul).

Deixe o meio da tela LIVRE de interface: e por ali que o jogador ve o jogo.
```

---

## Tela 2 — Equipamento

Meia tela de boneco, meia de vitrine.

```
ESTILO:
Mockup de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista, acabamento de UI de jogo mobile premium: metal dourado
trabalhado sobre caverna escura, iluminacao quente de lampiao. NAO e pixel art,
NAO e vetor chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA: ouro claro #F5D98A, ouro medio #E8B44A, bronze #8A5F22, preto-terra
#16110C, carvao #241B13, vermelho #C4332A, azul #4A9FD8, roxo #A855F7, ambar
#FFC453, papel envelhecido #E8D9B8.

FORMATO: uma unica imagem 1920x1080 px (16:9), tela cheia, sem moldura de
navegador, sem moldura de celular, sem maquete de dispositivo.

TIPOGRAFIA: fonte sem serifa condensada e forte para titulos e botoes, em caixa
alta; texto corrido em sem serifa normal. Todo o texto em PORTUGUES, exatamente
como escrito abaixo. Nada de texto inventado, nada de lorem ipsum, nada de
palavra em ingles.

Desenhe a TELA DE EQUIPAMENTO, cheia, sobre um fundo de caverna escura
desfocada com lampioes acesos e cristais roxos.

BARRA DO TOPO (igual em todas as telas): a esquerda, retrato quadrado de um
mineiro jovem de capacete com lanterna, ao lado o nome "SANTIAGO RAMIRES", a
linha "NV 15", uma barra de vida vermelha marcando 200/200 e uma barra de
experiencia dourada marcando 2.340 / 4.500 (53%); ao lado, um cartao "SALDO DA
BASE" com moeda dourada e o numero 3.918. No centro do topo, uma barra
horizontal ornamentada com cinco contadores de minerio: carvao 25, cobre 41,
ferro 18, ouro 7, cristal 142. A direita, cinco botoes quadrados com icone e
rotulo embaixo: SKILLS (picareta), ATRIBUTOS (braco flexionado, com um ponto
vermelho de aviso no canto), GUIA (caderno), TECNOLOGIA (capacete com
lanterna), AJUSTES (engrenagem).

METADE ESQUERDA: o titulo grande "EQUIPAMENTO" com o subtitulo "Prepare-se para
cavar mais fundo." e um emblema de escudo dourado ao lado. No centro, um
mineiro jovem de corpo inteiro, de frente, com capacete de lanterna, mochila e
botas, em pe sobre uma plataforma de pedra. Em volta dele, cinco cartoes de
encaixe ligados a ele por cabos dourados que brilham, cada um com o icone da
peca e a linha "Nv 1": "TRAJE" a esquerda, "CAPACETE" acima, "FERRAMENTA" a
direita em cima, "MOCHILA" a esquerda embaixo, "ESPECIAL" a direita embaixo.
Embaixo de tudo, uma faixa com o titulo "SEUS ATRIBUTOS COM EQUIPAMENTOS" e
cinco leituras lado a lado: "200 Vida", "41 Forca", "123 Mobilidade", "34%
Defesa", "118% Recarga". No canto inferior esquerdo, um botao "VOLTAR" com uma
seta.

METADE DIREITA: um painel alto com quatro abas no topo — "TRAJES" (ativa),
"MOCHILAS", "FERRAMENTAS", "ESPECIAIS" — e uma grade de seis cartoes de item em
duas linhas. Cada cartao tem o desenho da peca, o nome, duas linhas de
descricao, uma lista curta de efeitos com icone e um botao embaixo. Os seis, em
ordem: "Traje de Couro" com o botao "EQUIPADO" e uma marca de confirmacao no
canto; "Traje de Placas" com "EQUIPAR"; "Traje Termico" com um botao de cadeado
e o texto "Chegue a 700 m"; "Mochila Cargueira" com "EQUIPAR"; "Asas de
Planador" com "EQUIPAR"; "Mochila a Jato" com "EQUIPAR".
```

---

## Tela 3 — Atributos — o ninho

A arvore inteira num mapa so, escavada como um ninho de formigas.

```
ESTILO:
Mockup de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista, acabamento de UI de jogo mobile premium: metal dourado
trabalhado sobre caverna escura, iluminacao quente de lampiao. NAO e pixel art,
NAO e vetor chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA: ouro claro #F5D98A, ouro medio #E8B44A, bronze #8A5F22, preto-terra
#16110C, carvao #241B13, vermelho #C4332A, azul #4A9FD8, roxo #A855F7, ambar
#FFC453, papel envelhecido #E8D9B8.

FORMATO: uma unica imagem 1920x1080 px (16:9), tela cheia, sem moldura de
navegador, sem moldura de celular, sem maquete de dispositivo.

TIPOGRAFIA: fonte sem serifa condensada e forte para titulos e botoes, em caixa
alta; texto corrido em sem serifa normal. Todo o texto em PORTUGUES, exatamente
como escrito abaixo. Nada de texto inventado, nada de lorem ipsum, nada de
palavra em ingles.

Desenhe a TELA DE ATRIBUTOS, cheia.

BARRA DO TOPO (igual em todas as telas): a esquerda, retrato quadrado de um
mineiro jovem de capacete com lanterna, ao lado o nome "SANTIAGO RAMIRES", a
linha "NV 15", uma barra de vida vermelha marcando 200/200 e uma barra de
experiencia dourada marcando 2.340 / 4.500 (53%); ao lado, um cartao "SALDO DA
BASE" com moeda dourada e o numero 3.918. No centro do topo, uma barra
horizontal ornamentada com cinco contadores de minerio: carvao 25, cobre 41,
ferro 18, ouro 7, cristal 142. A direita, cinco botoes quadrados com icone e
rotulo embaixo: SKILLS (picareta), ATRIBUTOS (braco flexionado, com um ponto
vermelho de aviso no canto), GUIA (caderno), TECNOLOGIA (capacete com
lanterna), AJUSTES (engrenagem).

Abaixo da barra, a esquerda, o titulo "ATRIBUTOS" com o subtitulo "EVOLUA SEU
EXPLORADOR". A direita do titulo, um cartao pequeno com uma picareta e o texto
"PONTOS DISPONIVEIS 2".

FAIXA DE ABAS logo abaixo: "Mineracao" (ativa, dourada), "Coleta", "Movimento",
"Sobrevivencia", "Legado", cada uma com um icone pequeno.

CENTRO E ESQUERDA, ocupando dois tercos da largura: uma parede de terra e rocha
escavada, e sobre ela uma teia de camaras redondas ligadas por TUNEIS cavados —
nao por linhas retas. As camaras ligadas ja conquistadas tem anel dourado aceso
e um tunel iluminado por dentro; as ainda fechadas tem anel de pedra cinza e o
tunel apagado. Cada camara tem um icone dentro e um contador pequeno embaixo,
como "3/3" ou "0/3". Espalhe umas doze camaras em tres fileiras irregulares,
com nomes curtos embaixo de cada uma: "Forca da Picareta", "Detonacao",
"Broca", "Quebra Rochas", "Mais Minerio", "Mineracao Especializada", "Golpe
Preciso", "Raio de Impacto", "Ponto Fraco", "Choque", "Volta Rapida", "O Ninho".

TERCO DIREITO: um painel de detalhe com o rotulo "MINERACAO", o nome
"Detonacao", a linha "Nivel 3/4", duas linhas de descricao, um quadro "EFEITOS
ATUAIS" com quatro leituras, um quadro "PROXIMO NIVEL (4/4)" com quatro
leituras e os ganhos em verde, a linha "CUSTO 18" e um botao dourado grande
"MELHORAR".
```

---

## Tela 4 — Tecnologia

Bancada de pesquisa: grade a esquerda, prancheta a direita.

```
ESTILO:
Mockup de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista, acabamento de UI de jogo mobile premium: metal dourado
trabalhado sobre caverna escura, iluminacao quente de lampiao. NAO e pixel art,
NAO e vetor chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA: ouro claro #F5D98A, ouro medio #E8B44A, bronze #8A5F22, preto-terra
#16110C, carvao #241B13, vermelho #C4332A, azul #4A9FD8, roxo #A855F7, ambar
#FFC453, papel envelhecido #E8D9B8.

FORMATO: uma unica imagem 1920x1080 px (16:9), tela cheia, sem moldura de
navegador, sem moldura de celular, sem maquete de dispositivo.

TIPOGRAFIA: fonte sem serifa condensada e forte para titulos e botoes, em caixa
alta; texto corrido em sem serifa normal. Todo o texto em PORTUGUES, exatamente
como escrito abaixo. Nada de texto inventado, nada de lorem ipsum, nada de
palavra em ingles.

Desenhe a TELA DE TECNOLOGIA, cheia, sobre um fundo de caverna com caixotes,
lampioes e um quadro-negro pendurado.

BARRA DO TOPO (igual em todas as telas): a esquerda, retrato quadrado de um
mineiro jovem de capacete com lanterna, ao lado o nome "SANTIAGO RAMIRES", a
linha "NV 15", uma barra de vida vermelha marcando 200/200 e uma barra de
experiencia dourada marcando 2.340 / 4.500 (53%); ao lado, um cartao "SALDO DA
BASE" com moeda dourada e o numero 3.918. No centro do topo, uma barra
horizontal ornamentada com cinco contadores de minerio: carvao 25, cobre 41,
ferro 18, ouro 7, cristal 142. A direita, cinco botoes quadrados com icone e
rotulo embaixo: SKILLS (picareta), ATRIBUTOS (braco flexionado, com um ponto
vermelho de aviso no canto), GUIA (caderno), TECNOLOGIA (capacete com
lanterna), AJUSTES (engrenagem).

Abaixo da barra, a esquerda, o titulo "TECNOLOGIA" com o subtitulo "PESQUISE,
MELHORE, CAVE MAIS FUNDO" e um icone de capacete com lanterna. Ao lado, rabiscos
de giz na parede, como anotacoes de oficina.

FAIXA DE ABAS: "Copiadora" (ativa), "Toupeiras", "Copias", "Ferramentas",
"Refino", "Equipamento".

DOIS TERCOS DA ESQUERDA: uma grade de seis cartoes de pesquisa em duas linhas.
Cada cartao tem um icone quadrado, o nome, a linha "NIVEL x/4", duas linhas de
descricao, uma fileira de custos com icone de minerio e numero, e um botao
"PESQUISAR" com um frasco de laboratorio. Os seis: "Choque NIVEL 3/4", "Broca
NIVEL 1/4", "Detonacao NIVEL 3/4", "Faro NIVEL 0/4", "Volta Rapida NIVEL 1/3" e
"Mochila Cargueira NIVEL 2/4" — este ultimo com o botao verde "PESQUISADA" e
uma marca de confirmacao.

TERCO DIREITO: um painel sobre papel de blueprint azulado, com o nome "Choque",
a linha "NIVEL 3/4", uma ilustracao grande de uma picareta dourada com uma
corrente eletrica azul saltando para blocos de pedra, tres linhas de descricao,
uma faixa com as leituras atuais, um bloco "PROXIMO NIVEL", um bloco "CUSTO DA
PESQUISA" com tres custos e um botao dourado grande "PESQUISAR".
```

---

## Tela 5 — Guia de Campo

Aqui a familia visual muda inteira: papel e tinta, nao metal.

```
ESTILO:
Mockup de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista, acabamento de UI de jogo mobile premium: metal dourado
trabalhado sobre caverna escura, iluminacao quente de lampiao. NAO e pixel art,
NAO e vetor chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA: ouro claro #F5D98A, ouro medio #E8B44A, bronze #8A5F22, preto-terra
#16110C, carvao #241B13, vermelho #C4332A, azul #4A9FD8, roxo #A855F7, ambar
#FFC453, papel envelhecido #E8D9B8.

FORMATO: uma unica imagem 1920x1080 px (16:9), tela cheia, sem moldura de
navegador, sem moldura de celular, sem maquete de dispositivo.

TIPOGRAFIA: fonte sem serifa condensada e forte para titulos e botoes, em caixa
alta; texto corrido em sem serifa normal. Todo o texto em PORTUGUES, exatamente
como escrito abaixo. Nada de texto inventado, nada de lorem ipsum, nada de
palavra em ingles.

Desenhe a TELA DO GUIA DE CAMPO, cheia: um caderno de couro marrom ABERTO
ocupando quase a tela toda, visto de cima, sobre um fundo de caverna escura
desfocada.

BARRA DO TOPO (igual em todas as telas): a esquerda, retrato quadrado de um
mineiro jovem de capacete com lanterna, ao lado o nome "SANTIAGO RAMIRES", a
linha "NV 15", uma barra de vida vermelha marcando 200/200 e uma barra de
experiencia dourada marcando 2.340 / 4.500 (53%); ao lado, um cartao "SALDO DA
BASE" com moeda dourada e o numero 3.918. No centro do topo, uma barra
horizontal ornamentada com cinco contadores de minerio: carvao 25, cobre 41,
ferro 18, ouro 7, cristal 142. A direita, cinco botoes quadrados com icone e
rotulo embaixo: SKILLS (picareta), ATRIBUTOS (braco flexionado, com um ponto
vermelho de aviso no canto), GUIA (caderno), TECNOLOGIA (capacete com
lanterna), AJUSTES (engrenagem).

O caderno tem duas paginas de papel envelhecido, com dobras, manchas de terra e
bordas gastas. Costura e cantoneiras de metal na lombada. Uma fita marcadora
vermelha desce da lombada ate embaixo.

BORDA ESQUERDA: seis abas de couro saindo para fora do caderno, empilhadas
verticalmente, cada uma com um icone e um nome: "Objetivo", "Anotacoes" (com um
ponto vermelho de aviso), "Pistas" (destacada, mais para fora que as outras),
"Pessoas", "Bichos", "Lugares".

PAGINA ESQUERDA: o titulo manuscrito "Guia de Campo" com a linha menor "de
Santiago Ramires", um desenho a tinta de uma montanha no canto e a frase
inclinada "Toda pedra tem uma historia. - S. R.". Abaixo, uma lista de sete
entradas, cada uma com um pequeno desenho a tinta, um titulo, uma linha de
descricao e a profundidade a direita: "Uma voz na pedra - 0 m" (destacada em
amarelo), "A marca do pai - 26 m", "Uma voz na pedra - 219 m", "Pontos de
habilidade - 300 m", "Trilhos reparados - 112 m", "Um brilho adiante - 264 m",
"Caverna desconhecida - 560 m".

PAGINA DIREITA: o titulo "Uma voz na pedra" com "0 m" ao lado, tres linhas de
texto manuscrito, uma foto polaroid presa com fita adesiva mostrando uma fenda
na rocha com luz dourada saindo, uma legenda a mao embaixo dela, um quadro
"Pistas relacionadas" com duas entradas, e no canto uma anotacao inclinada a
lapis com um desenho de lampiao.

Todo o texto em tinta sepia, escrito a mao, legivel.
```

---

## Tela 6 — Automacao

Copias e toupeiras trabalhando. E a tela que mostra que o jogo anda sozinho.

```
ESTILO:
Mockup de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista, acabamento de UI de jogo mobile premium: metal dourado
trabalhado sobre caverna escura, iluminacao quente de lampiao. NAO e pixel art,
NAO e vetor chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA: ouro claro #F5D98A, ouro medio #E8B44A, bronze #8A5F22, preto-terra
#16110C, carvao #241B13, vermelho #C4332A, azul #4A9FD8, roxo #A855F7, ambar
#FFC453, papel envelhecido #E8D9B8.

FORMATO: uma unica imagem 1920x1080 px (16:9), tela cheia, sem moldura de
navegador, sem moldura de celular, sem maquete de dispositivo.

TIPOGRAFIA: fonte sem serifa condensada e forte para titulos e botoes, em caixa
alta; texto corrido em sem serifa normal. Todo o texto em PORTUGUES, exatamente
como escrito abaixo. Nada de texto inventado, nada de lorem ipsum, nada de
palavra em ingles.

Desenhe a TELA DE AUTOMACAO, cheia, sobre um fundo de caverna com vigas de
madeira, lampioes e caixotes.

NO TOPO, uma faixa de abas: "Copiadora" (ativa), "Toupeiras", "Copias",
"Ferramentas", "Refino", "Equipamento", e um botao de fechar no canto direito.

A ESQUERDA DO TOPO: uma placa de madeira rustica pendurada por correntes com o
titulo "AUTOMACAO" e o subtitulo "SEUS AJUDANTES NAO PARAM", com um mineiro
jovem desenhado ao lado segurando uma prancheta.

FAIXA DE ESTADO abaixo: cinco leituras lado a lado, cada uma com icone, numero
grande e rotulo pequeno: um automato azul com "3/99 COPIAS ATIVAS"; uma
toupeira marrom com "8/16 TOUPEIRAS ATIVAS"; um vagonete com "644 CARGAS EM
VIAGEM"; um caixote com "27 ENTREGAS HOJE"; e um botao redondo verde aceso com
"TUDO OK - TRABALHANDO NORMALMENTE".

METADE ESQUERDA: um painel com o titulo "COPIAS ATIVAS (3/99)", o subtitulo
"Mineram, coletam e entregam automaticamente." e um botao "+ NOVA COPIA". Tres
cartoes empilhados, cada um com o retrato de um pequeno automato de visor azul,
o nome "Copia 1", "Copia 2", "Copia 3", uma etiqueta de estado ("TRABALHANDO"
em verde, "INDO ENTREGAR" em ambar), um campo "FOCO" com um minerio, um
controle deslizante "AREA DE TRABALHO" com o valor em tiles, a profundidade, o
total entregue, um botao "VER ROTA" e um interruptor verde ligado.

METADE DIREITA: um painel com o titulo "TOUPEIRAS ATIVAS (8/16)", o subtitulo
"Escavam tuneis e trazem recursos para a base." e um botao "CONTRATAR". Tres
cartoes empilhados, cada um com o retrato de uma toupeira mineradora de
capacete, o nome "Toupeira 1", "Toupeira 2", "Toupeira 3", uma etiqueta
("ESCAVANDO" em verde, "INDO BUSCAR" em ambar), quatro leituras em linha
(CARGA MAX., RECURSO, DISTANCIA, ENTREGAS), uma barra de progresso colorida e
uma linha de estado como "Voltando para a base...".

RODAPE: a esquerda, "A mineracao nunca para!" com a linha menor "Seus ajudantes
trabalham mesmo quando voce estiver explorando."; no centro, um cartao de dica
com uma lampada acesa.
```

---

## Tela 7 — Skills — habilidades ativas

O cinto de quatro e a vitrine de todas.

```
ESTILO:
Mockup de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista, acabamento de UI de jogo mobile premium: metal dourado
trabalhado sobre caverna escura, iluminacao quente de lampiao. NAO e pixel art,
NAO e vetor chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA: ouro claro #F5D98A, ouro medio #E8B44A, bronze #8A5F22, preto-terra
#16110C, carvao #241B13, vermelho #C4332A, azul #4A9FD8, roxo #A855F7, ambar
#FFC453, papel envelhecido #E8D9B8.

FORMATO: uma unica imagem 1920x1080 px (16:9), tela cheia, sem moldura de
navegador, sem moldura de celular, sem maquete de dispositivo.

TIPOGRAFIA: fonte sem serifa condensada e forte para titulos e botoes, em caixa
alta; texto corrido em sem serifa normal. Todo o texto em PORTUGUES, exatamente
como escrito abaixo. Nada de texto inventado, nada de lorem ipsum, nada de
palavra em ingles.

Desenhe a TELA DE SKILLS, cheia, sobre um fundo de caverna com cristais roxos
e um lampiao aceso.

BARRA DO TOPO (igual em todas as telas): a esquerda, retrato quadrado de um
mineiro jovem de capacete com lanterna, ao lado o nome "SANTIAGO RAMIRES", a
linha "NV 15", uma barra de vida vermelha marcando 200/200 e uma barra de
experiencia dourada marcando 2.340 / 4.500 (53%); ao lado, um cartao "SALDO DA
BASE" com moeda dourada e o numero 3.918. No centro do topo, uma barra
horizontal ornamentada com cinco contadores de minerio: carvao 25, cobre 41,
ferro 18, ouro 7, cristal 142. A direita, cinco botoes quadrados com icone e
rotulo embaixo: SKILLS (picareta), ATRIBUTOS (braco flexionado, com um ponto
vermelho de aviso no canto), GUIA (caderno), TECNOLOGIA (capacete com
lanterna), AJUSTES (engrenagem).

TERCO ESQUERDO: um painel com o titulo "SKILLS ATIVAS" e o subtitulo "EQUIPE 4
HABILIDADES", e quatro encaixes redondos grandes em dois pares, cada um com um
emblema aceso e o nome embaixo: "DETONACAO NV 3" (explosao laranja), "BROCA NV
1" (bota marrom), "CHOQUE NV 3" (raio amarelo), "VOLTA RAPIDA NV 1" (corredor
azul). Abaixo, uma placa de madeira rustica com as palavras empilhadas "CAVE /
EXPLORE / EVOLUA / VA MAIS FUNDO!".

CENTRO: um painel com o titulo "TODAS AS SKILLS", o subtitulo "DESBLOQUEIE,
MELHORE E PERSONALIZE SEU ESTILO" e um cartao pequeno com "2 pontos de
habilidade" e um botao de mais. Abaixo, uma grade de seis cartoes em duas
linhas. Cada cartao tem um emblema redondo, o nome, a linha "NIVEL x/4", duas
linhas de descricao e uma linha de numeros. Tres deles trazem uma etiqueta
"PRONTA" no canto; dois trazem um cadeado; um botao embaixo diz "APRENDER" com
um custo em moedas e outro diz "MELHORAR". Os seis: "Detonacao NIVEL 3/4",
"Broca NIVEL 1/4", "Choque NIVEL 3/4", "Faro NIVEL 0/4", "Volta Rapida NIVEL
1/3", "Golpe Preciso NIVEL 0/3".

TERCO DIREITO: um painel de detalhe com o emblema grande de "Detonacao", a
etiqueta "PRONTA", a linha "NIVEL 3/4", uma frase em destaque "Uma boa explosao
resolve muitos problemas.", tres linhas de descricao, quatro leituras com icone
(raio de explosao, dano, cargas, recarga), um bloco "PROXIMO NIVEL (4/4)" com
quatro ganhos em verde, e um botao dourado grande "MELHORAR" com um custo em
moedas.
```

---

## Tela 8 — Mapa da mina

Corte vertical do mundo. E onde o jogador entende onde ele esta.

```
ESTILO:
Mockup de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista, acabamento de UI de jogo mobile premium: metal dourado
trabalhado sobre caverna escura, iluminacao quente de lampiao. NAO e pixel art,
NAO e vetor chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA: ouro claro #F5D98A, ouro medio #E8B44A, bronze #8A5F22, preto-terra
#16110C, carvao #241B13, vermelho #C4332A, azul #4A9FD8, roxo #A855F7, ambar
#FFC453, papel envelhecido #E8D9B8.

FORMATO: uma unica imagem 1920x1080 px (16:9), tela cheia, sem moldura de
navegador, sem moldura de celular, sem maquete de dispositivo.

TIPOGRAFIA: fonte sem serifa condensada e forte para titulos e botoes, em caixa
alta; texto corrido em sem serifa normal. Todo o texto em PORTUGUES, exatamente
como escrito abaixo. Nada de texto inventado, nada de lorem ipsum, nada de
palavra em ingles.

Desenhe a TELA DE MAPA, cheia, de um jogo de mineracao 2D.

NO TOPO: uma faixa com o titulo "MAPA DA MINA" a esquerda e, ao lado, as
leituras "236 m", "Cavernas de Cristal", "proxima camada em 264 m" e "38%
explorado". A direita, dois botoes pequenos de alternar vista e um botao de
fechar.

CENTRO E ESQUERDA: um CORTE VERTICAL da mina, visto de lado, mostrando a
superficie no topo e a profundidade descendo. Os tuneis ja escavados aparecem
como vaos claros recortados na rocha; o que nao foi explorado fica preto. Uma
regua de profundidade corre na lateral esquerda marcando 0 m, 100 m, 200 m,
300 m. Faixas horizontais de cor separam as camadas: marrom na superficie,
cinza na pedra, roxo no cristal. Um marcador verde brilhante mostra o jogador.
Espalhe marcadores pequenos pelo mapa: casinhas para bases, pegadas para
pistas, capacetes para mineiros, caveiras vermelhas para guardioes.

TERCO DIREITO: um painel com o titulo "LUGARES CONHECIDOS" e uma lista agrupada
por camada. Sob "SOLO SUPERFICIAL": "Base - 0 m" e "Entrada da mina - 1 m".
Sob "CAVERNAS DE CRISTAL": "Base do Cristal - 236 m". Cada item com um
emblema redondo colorido a esquerda. Abaixo da lista, um bloco "CAMADAS" com
cinco linhas, cada uma com um ponto colorido, um nome e uma profundidade; as
ja alcancadas acesas, as demais apagadas.
```

---

## Tela 9 — Painel da base de extracao

A operacao que roda sozinha la embaixo.

```
ESTILO:
Mockup de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista, acabamento de UI de jogo mobile premium: metal dourado
trabalhado sobre caverna escura, iluminacao quente de lampiao. NAO e pixel art,
NAO e vetor chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA: ouro claro #F5D98A, ouro medio #E8B44A, bronze #8A5F22, preto-terra
#16110C, carvao #241B13, vermelho #C4332A, azul #4A9FD8, roxo #A855F7, ambar
#FFC453, papel envelhecido #E8D9B8.

FORMATO: uma unica imagem 1920x1080 px (16:9), tela cheia, sem moldura de
navegador, sem moldura de celular, sem maquete de dispositivo.

TIPOGRAFIA: fonte sem serifa condensada e forte para titulos e botoes, em caixa
alta; texto corrido em sem serifa normal. Todo o texto em PORTUGUES, exatamente
como escrito abaixo. Nada de texto inventado, nada de lorem ipsum, nada de
palavra em ingles.

Desenhe o PAINEL DA BASE DE EXTRACAO, cheio, sobre um fundo de camara
escavada a 236 metros, com vigas de madeira, tubulacao e um refinador aceso
desfocado ao fundo.

NO TOPO do painel: o titulo "BASE DO CRISTAL" e um botao de fechar.

PRIMEIRO BLOCO: uma faixa com uma fogueira acesa a esquerda, o numero "65 de
fogo" e a linha menor "o refinador esta trabalhando". Ao lado, dois cartoes
grandes lado a lado, cada um com um numero grande e um rotulo pequeno: "74 -
refinado / min" e "37 - subindo / min".

SEGUNDO BLOCO: dois quadros empilhados. "BRUTO NO DEPOSITO" com cinco
etiquetas de minerio e quantidade: 1632 Carvao, 346 Ouro, 550 Ferro, 660 Pedra.
"REFINADO PRONTO" com tres etiquetas: 0 Coque, 0 Barra de Ouro, 0 Prisma de
Cristal.

TERCEIRO BLOCO: o titulo "O QUE FAZER COM O REFINADO" e um controle deslizante
horizontal dourado no meio, com os rotulos "guardar para construir 50%" a
esquerda e "subir e virar moeda 50%" a direita.

QUARTO BLOCO: o titulo "TOUPEIRAS", duas etiquetas "0 nesta base" e "1 de 17
vagas", a linha "Elas descarregam neste deposito. Contratada aqui, comeca
aqui." e um botao dourado largo "CONTRATAR - 295".

QUINTO BLOCO: o titulo "MAQUINAS" e cinco linhas empilhadas, cada uma com o
nome da maquina a esquerda, uma etiqueta "NIVEL I" ou "NIVEL II" a direita e
uma linha de estado embaixo: "Refinador", "Deposito Bruto", "Esteira de
Entrada", "Esteira de Saida", "Elevador de Carga".
```

---

## Tela 10 — Fim de semana — a cota

O momento em que a mina fecha ou continua aberta. E a tela mais dramatica do jogo.

```
ESTILO:
Mockup de interface para um jogo 2D de mineracao subterranea. Pintura digital
semi-realista, acabamento de UI de jogo mobile premium: metal dourado
trabalhado sobre caverna escura, iluminacao quente de lampiao. NAO e pixel art,
NAO e vetor chapado, NAO e render 3D, NAO e cartoon infantil.

PALETA: ouro claro #F5D98A, ouro medio #E8B44A, bronze #8A5F22, preto-terra
#16110C, carvao #241B13, vermelho #C4332A, azul #4A9FD8, roxo #A855F7, ambar
#FFC453, papel envelhecido #E8D9B8.

FORMATO: uma unica imagem 1920x1080 px (16:9), tela cheia, sem moldura de
navegador, sem moldura de celular, sem maquete de dispositivo.

TIPOGRAFIA: fonte sem serifa condensada e forte para titulos e botoes, em caixa
alta; texto corrido em sem serifa normal. Todo o texto em PORTUGUES, exatamente
como escrito abaixo. Nada de texto inventado, nada de lorem ipsum, nada de
palavra em ingles.

Desenhe a TELA DE FECHAMENTO DA SEMANA, cheia, de um jogo de mineracao.

FUNDO: a boca da mina vista de fora, ao anoitecer. Um portao de madeira e metal,
trilhos saindo do tunel, um lampiao aceso na entrada, montanhas escuras ao
fundo e um ceu roxo-alaranjado de fim de tarde. O fundo aparece escurecido por
tras do painel.

NO CENTRO: um painel grande de moldura dourada, com o rotulo pequeno no topo
"SEMANA 3 - FECHAMENTO" e o titulo grande "COTA ENTREGUE" em ouro aceso.
Abaixo, tres linhas de recurso, cada uma com o icone do minerio, o nome, a
quantidade entregue sobre a pedida e uma barra de progresso cheia e dourada:
"Carvao 134 / 134", "Ferro 35 / 35", "Pedra 266 / 266".

Abaixo das linhas, uma faixa de recompensa com tres leituras lado a lado, cada
uma com icone: "+ 1.540 moedas", "+ 2 pontos de habilidade", "SEMANA 4
LIBERADA".

Abaixo, uma frase do capataz entre aspas, em italico: "A mina continua aberta.
Ate a proxima segunda."

NO RODAPE do painel: um botao dourado largo "CONTINUAR" e, ao lado, um botao
secundario menor "VER O QUADRO".

No canto inferior direito da tela, fora do painel, a frase pequena "DIA 7 / 7 -
SEMANA FECHADA".
```

---

## Onde cada coisa entra

| Folha | Destino |
|---|---|
| 1, 2, 5, 6 | `public/art/hud/` — novo |
| 3 | `public/art/ui/` — mesmos nomes de hoje (`coal.png`, `copper.png`...) |
| 4 | `public/art/skills/<nome>.png` |
| 7 | `public/art/hud/chassi/` — usada por todas as telas cheias |
| 8, 9 | `public/art/equip/` |
| 10 | `public/art/journal/` |
| 11 | `public/art/tech/` |
| 12 | `public/art/auto/` |
| 13 | `public/art/tree/` |

Recorte: as celulas sao todas do mesmo tamanho, entao um recorte automatico
resolve — os `tools/slice-*.mjs` do projeto ja fazem exatamente isso para as
outras folhas.

Nada quebra se um arquivo faltar: o jogo cai no desenho vetorial de sempre (a
regra esta no topo de `src/data/art.ts`). Da para trocar peca por peca e ver no
jogo na hora, sem esperar as treze folhas ficarem prontas.
