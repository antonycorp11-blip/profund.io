# Plano de trajes, bots e efeitos

Documento de produção. A ideia é gastar uma sessão gerando arte com a lista
pronta, em vez de decidir o que gerar no meio da geração.

Tudo aqui sai da `BIBLIA.md` — cidades, faixas de profundidade e o perigo de
cada uma. Nenhum traje foi inventado solto: cada um responde a uma coisa que
tenta te matar naquela profundidade, e a maioria vem de uma cidade que o
jogador precisa alcançar antes.

---

## 1. Antes de gerar: três regras que valem para tudo

**Uma sessão por traje, do começo ao fim.** Cada traje são ~10 folhas. Geradas
em sessões diferentes, o traço deriva e o mesmo personagem muda de cara ao
trocar de roupa. Escala e linha dos pés eu conserto no cortador; traço não.
Gere o traje inteiro de uma vez, usando as folhas anteriores como referência.

**O corpo nu é a régua.** Toda folha nova é normalizada contra ele: escala pelo
quadro em pé, pés na linha 119. É por isso que a IA pode entregar tamanhos
diferentes sem estragar nada.

**Cada traje é um personagem completo.** Não há variante por recoloração — foi
decidido que nenhum traje é comum a ponto de merecer só uma pintura nova. Isso
significa que o traje muda a silhueta, e por isso os encaixes de capacete,
mochila e ferramenta são **remedidos naquele corpo**. Numa armadura o ombro é
mais alto e as costas mais largas; com encaixe fixo a mochila afundaria no
peitoral.

---

## 2. As folhas de cada traje

Dez por traje. Esta lista é fixa — vale para o corpo nu e para todos os dez.

| # | folha | quadros | o que é |
|---|---|---|---|
| 1 | `idle` | 9 | parado, respirando |
| 2 | `walk` | 10 | ciclo de caminhada, passada ampla |
| 3 | `jump` | 9 | agachar, impulso, ápice, queda, pouso, recuperar |
| 4 | `mine` | 12 | golpe de picareta, punho vazio |
| 5 | `climb` | 8 | escalada em perfil, sem parede |
| 6 | `aim` | 10 | mira: frente, cima, baixo, recuo, andando |
| 7 | `aim_baixa` | 10 | andar com o braço baixado |
| 8 | `arranca` | 5 | sair da parada para a caminhada |
| 9 | `freia` | 5 | da caminhada para a parada |
| 10 | `gira` | 6 | pivô de perfil direito para perfil esquerdo |

**Regra que vale nas dez:** cabeça descoberta, mãos nuas, mãos vazias. Capacete,
mochila e ferramenta são peças separadas — se vierem desenhados no corpo, o
sistema de encaixe morre e volta a ser um traje por combinação.

Exceção: os trajes selados (7, 8, 10) têm capacete **integrado**, e aí ele faz
parte do corpo. São os únicos. Está marcado na ficha de cada um.

---

## 3. Os dez trajes

Raridade: **comum** (2) · **incomum** (2) · **raro** (3) · **épico** (1) ·
**lendário** (2)

| # | traje | raridade | onde | responde a |
|---|---|---|---|---|
| 1 | Roupa de Mina | comum | 0 m, início | nada — é a régua |
| 2 | Couro Batido | comum | ~180 m, Marta | primeiras criaturas |
| 3 | Correia Dupla | incomum | 560 m, Blockia | carga e escalada |
| 4 | Chapa Pneumática | incomum | 980 m, Ferrúria | queda de rocha |
| 5 | Casaco de Forja | raro | 900 m, Zona de Magma | calor |
| 6 | Manto Ressonante | raro | 1.380 m, Lumora | cristal instável |
| 7 | Selado Vigília | raro | 1.720 m, Véspera | gás |
| 8 | Nadir Abissal | épico | 1.780 m, Abismo | pressão e corrosão |
| 9 | Traje de Santiago | lendário | achado, não comprado | — |
| 10 | Casca Vael | lendário | pós-portal, Veyra | oxigênio da superfície |

---

### 1. Roupa de Mina — comum
**É o corpo nu que já existe.** Camisa e calça azuis, botas de couro, cinto
simples. Está aqui na lista porque é a régua de proporção de todos os outros, e
porque é o traje com que Elias desce na primeira vez.

*Silhueta:* magra, sem volume nenhum.
*Efeito:* nenhum. É o contraste que faz os outros parecerem equipamento.

---

### 2. Couro Batido — comum
Feito na oficina da Marta, na superfície, com o que sobra. Couro grosso rebitado
sobre a mesma roupa, joelheira e cotoveleira de placa.

*Silhueta:* levemente mais largo no peito e nos ombros. Ainda humano.
*Paleta:* marrom curtido, rebite de latão, azul da roupa aparecendo por baixo.
*Efeito:* **nenhum ativo.** Só poeira de passo, que já é do jogo.

> É de propósito que os dois primeiros não brilhem. Se o traje inicial tem
> partícula, o jogador não tem para onde subir.

---

### 3. Correia Dupla — incomum
De Blockia. A cidade vive de carga, e o traje é um arreio: correias cruzadas no
peito, bolsos de ferramenta na coxa, sola de borracha para escada.

*Silhueta:* peito cruzado por duas correias largas, coxas volumosas de bolso.
*Paleta:* lona cru, couro escuro, latão.
*Efeito:* **candeia de cinto** — uma chama pequena presa no quadril que balança
com o passo e joga luz quente no chão. É o primeiro traje com luz própria.

---

### 4. Chapa Pneumática — incomum
De Ferrúria. Placas de aço rebitadas sobre um forro acolchoado, com mangueiras
curtas ligando ombro e cotovelo. A cidade industrializou o subterrâneo.

*Silhueta:* ombreira quadrada e alta, peitoral de placa, antebraço grosso.
*Paleta:* aço escovado, ferrugem nas juntas, forro cinza-chumbo.
*Efeito:* **escape de vapor** — jatos curtos de vapor branco saindo do ombro e
do joelho a cada aterrissagem e a cada dois ou três segundos parado.

---

### 5. Casaco de Forja — raro
Para a Zona de Magma. Manta pesada tratada, com placa refletiva no peito e uma
viseira curta. Não é vedado — ainda dá para ver o rosto.

*Silhueta:* volumoso e pesado, gola alta, barra longa que balança.
*Paleta:* preto fuliginoso, placa cor de bronze queimado, costura laranja.
*Efeito:* **brasa nas costuras** — as linhas do traje pulsam num laranja fraco,
mais forte quanto mais fundo. Solta fagulha ao correr.

---

### 6. Manto Ressonante — raro
De Lumora. Tecido escuro com lascas de cristal cravadas no peito, nos punhos e
na coluna. Elas respondem ao minério por perto.

*Silhueta:* esguia, capuz baixo, manto curto que abre atrás quando ele corre.
*Paleta:* azul-noite profundo, cristal ciano, fio prateado.
*Efeito:* **ressonância** — os cristais brilham e soltam faísca ciano quando há
minério raro perto; quanto mais perto, mais rápido o pulso. Deixa um rastro
curto de luz ao andar.

---

### 7. Selado Vigília — raro · capacete integrado
De Véspera. O primeiro traje realmente fechado: capacete de vidro curvo, filtro
no peito, luva selada no punho. A cidade inteira vive de filtrar ar.

*Silhueta:* cabeça arredondada e grande, caixa de filtro no peito, cano grosso
do queixo ao peito.
*Paleta:* lona verde-oliva, metal opaco, vidro âmbar iluminado por dentro.
*Efeito:* **respiração** — o filtro solta uma baforada de vapor a cada poucos
segundos e o vidro do capacete embaça e limpa no ritmo. Luz âmbar interna
desenha o rosto por trás do vidro.

---

### 8. Nadir Abissal — épico · capacete integrado
Para o Abismo. Armadura de pressão de verdade: anéis reforçados no tronco e nos
membros, como um escafandro. Pesado e lento de ler.

*Silhueta:* a mais larga de todas. Anéis segmentados nos braços e nas pernas,
gorjal alto, botas com peso.
*Paleta:* metal cinza-azulado escurecido, junta de cobre, vidro fundo quase preto.
*Efeito:* **pressão** — ao aterrissar, um anel de poeira se abre no chão. Bolhas
sobem das juntas. Uma luz fria varre o visor lentamente.

---

### 9. Traje de Santiago — lendário · **não se compra**
Encontrado, não fabricado. É a peça que responde a pergunta que o prólogo abre.
Remendado com pedaço de todas as cidades: uma ombreira de Ferrúria, correia de
Blockia, cristal de Lumora costurado na manga. Ele passou por todas.

*Silhueta:* desencontrada de propósito — cada lado do corpo é de uma origem.
Lê como uma coisa montada ao longo de anos, não comprada.
*Paleta:* tudo desbotado. As cores das quatro cidades, gastas até quase cinza.
*Efeito:* **discreto.** Só a lasca de cristal na manga pulsa, devagar, fora de
ritmo com tudo. O traje mais importante do jogo é o menos vistoso.

> A raridade dele não vem de brilhar mais. Vem do jogador reconhecer, peça por
> peça, que o pai esteve em todos os lugares aonde ele acabou de chegar.

---

### 10. Casca Vael — lendário · capacete integrado
Do outro lado do portal. Os Vael não conseguem ficar na superfície de Veyra sem
traje selado — este é um deles, adaptado para um corpo humano. Nada nele foi
feito por mão humana.

*Silhueta:* orgânica e assimétrica. Placas que parecem carapaça, não chapa.
Nenhuma linha reta, nenhum rebite.
*Paleta:* casca cinza-esverdeada iridescente, veios internos em branco-azulado.
*Efeito:* **veios vivos** — as linhas internas correm devagar pelo corpo, como
circulação. Em vez de fagulha, solta um esporo luminoso que sobe. O visor não
tem vidro: tem uma membrana que abre e fecha.

---

## 4. Os bots

O jogo já tem quatro tipos (`src/data/bots.ts`), com o que cada um coleta e a
que profundidade aparece. A arte atual é provisória.

| bot | libera em | coleta | identidade visual |
|---|---|---|---|
| Simples | 0 m | pedra, carvão | lata amassada, uma antena, uma garra |
| Reforçado | 60 m | + cobre, ferro | braço de cobre, dois olhos, esteira |
| Profundo | 200 m | + ouro | blindado, aletas de calor, quatro patas |
| Prisma | 420 m | cristal, rubi | chassi fino com núcleo de cristal, flutua |

**Cada bot precisa de 4 folhas:**

| folha | quadros | o que é |
|---|---|---|
| `parado` | 6 | ocioso, esperando ordem |
| `anda` | 8 | deslocamento (esteira, patas ou flutuando) |
| `coleta` | 8 | o gesto de pegar o minério do chão |
| `carrega` | 8 | andando com a caçamba cheia — visivelmente mais pesado |

Vistos de **lado**, igual ao herói, mesma célula, fundo transparente.

**Efeitos por bot:**

- **Simples** — antena pisca vermelho devagar. Solta fumacinha quando a caçamba
  enche. É sucata e tem que parecer.
- **Reforçado** — esteira levanta poeira. Faísca curta na garra ao quebrar pedra.
- **Profundo** — aletas brilham vermelho quando trabalha muito tempo seguido; se
  esfriam paradas. Luz de varredura no chão à frente.
- **Prisma** — não toca o chão. Núcleo pulsa, e a sombra no chão pulsa junto.
  Solta lasca de luz ao coletar. É o único silencioso.

> A escada dos bots é a mesma dos trajes: o primeiro não tem efeito bonito, tem
> fumaça de coisa velha. O último flutua e brilha. A diferença entre eles é o
> que faz o jogador querer o próximo.

---

## 5. Efeitos e partículas — como isso funciona de verdade

**Partícula não é uma folha de animação.** É código: um emissor que cria dezenas
de cópias de uma imagem pequenina, cada uma com posição, velocidade, giro e
tempo de vida próprios. O que precisa ser gerado são os **átomos** — as imagens
pequenas que o emissor multiplica.

Isso é bom: uma folha de 8 átomos alimenta todos os efeitos dos dez trajes.

**Átomos a gerar — uma folha só, 12 peças pequenas em fundo transparente:**

| # | átomo | usado por |
|---|---|---|
| 1 | faísca alongada | Forja, Reforçado |
| 2 | brasa redonda com rastro | Forja |
| 3 | baforada de vapor branco | Pneumática, Vigília |
| 4 | nuvem de poeira baixa | todos, ao aterrissar |
| 5 | anel de choque no chão | Nadir |
| 6 | lasca de cristal luminosa | Ressonante, Prisma |
| 7 | bolha | Nadir |
| 8 | esporo luminoso | Vael |
| 9 | fumaça escura de motor | Simples |
| 10 | clarão redondo suave | qualquer luz pulsante |
| 11 | risco de luz fino (rastro) | Ressonante |
| 12 | fagulha minúscula | genérico |

Os átomos saem **brancos ou cinza claro**, sem cor própria: o código tinge cada
um na cor do efeito. Assim a mesma faísca serve para o laranja da forja e o
ciano do cristal, e trocar a cor de um traje não pede imagem nova.

**O que é folha de animação e não partícula:** o vidro do capacete embaçando, a
membrana do Vael abrindo, os veios correndo. Essas são partes do corpo e vão
desenhadas nas próprias folhas do traje.

---

## 6. Ordem de geração

Do mais simples para o mais complexo, porque cada traje serve de referência
para o seguinte e é melhor derivar o difícil do fácil que o contrário.

1. **Terminar o corpo nu** — faltam `walk` refeita, `climb` em perfil,
   `aim_baixa`, `arranca`, `freia`, `gira`, `jump` novo. São as folhas 2, 5 e
   7 a 10. **Isto vem primeiro de tudo**, porque é a régua.
2. **Folha de átomos** — uma imagem, destrava o efeito dos dez.
3. **Bots** (4 × 4 folhas) — menores, mais rápidos, e dão retorno visível cedo.
4. **Trajes 2, 3, 4** — os humanos, sem capacete integrado.
5. **Trajes 5, 6** — primeiros com efeito forte.
6. **Trajes 7, 8, 10** — selados, capacete integrado.
7. **Traje 9 (Santiago)** — por último de propósito: ele é montado com pedaços
   dos outros, então precisa que os outros existam para poder citá-los.

---

## 7. O que eu faço quando a arte chegar

- `slice-heroi` fatia e normaliza cada traje na sua pasta
- `medir-encaixes` remede cabeça, costas e punho **naquele corpo**
- `conferir-vestir` desenha os quadros vestidos para eu olhar antes de ligar
- código novo: os estados `arranca`, `freia`, `gira` e `aim_baixa`, que ainda
  não existem — hoje o jogo só pergunta "parado ou andando?"
- código novo: o sistema de partículas e o emissor por traje
