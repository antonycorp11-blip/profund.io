# Auditoria do protótipo — Legado das Profundezas 0.1

## 1. Estrutura dos arquivos

```
index.html                  canvas + camada de UI
public/
  manifest.webmanifest      PWA (fullscreen, landscape)
  sw.js                     service worker (cache simples; trocar por precache no build final)
  icons/icon.svg
src/
  main.ts                   bootstrap + registro do service worker
  style.css                 toda a UI (HUD, diálogo, painéis, controles virtuais, safe areas)

  data/                     ► TUDO que é balanceamento vive aqui
    config.ts               constantes de render, física, mineração, drops, mundo, luz, save
    blocks.ts               definição de cada bloco (hp, drop, raridade, profundidade, tier...)
    resources.ts            recursos coletáveis (valor, peso, raridade, cor)
    tools.ts                picaretas: poder, velocidade, alcance, custo do upgrade
    quota.ts                cota da base
    story.ts                salas feitas à mão, diálogos, pista e NPC resgatável

  core/
    Game.ts                 orquestrador: monta o mundo, roda o loop, conecta os sistemas
    camera.ts               follow suave, limites de mundo, shake, conversões tela↔mundo
    events.ts               barramento de eventos tipado (gameplay emite, UI/áudio escutam)
    math.ts / rng.ts        utilidades e ruído determinístico (hash, value noise, fbm)

  world/
    World.ts                tilemap destrutível (Uint8Array), dano, overrides p/ save
    WorldGen.ts             relevo, cavernas, veios, base na superfície, salas de história
    TileRenderer.ts         cache por chunk em canvas offscreen + rachaduras

  player/
    Player.ts               física AABB, pulo variável, animação e desenho
    PlayerStats.ts          stats derivados (base + ferramenta)

  mining/MiningSystem.ts    mira, dano, feedback, drops — o núcleo do jogo

  entities/
    Interactable.ts         contrato do botão AGIR
    Base.ts                 Depósito, Oficina e cenário da superfície
    ClueObject.ts           a marca do pai
    RescueNpc.ts            NPC preso → livre → caminhando → seguro
    DropManager.ts          drops físicos com ímã e coleta

  fx/
    Particles.ts            pool fixo (estilhaços, faíscas, poeira)
    FloatingText.ts         "+2 Carvão", nomes de minério raro
    Lighting.ts             escuridão por profundidade + luzes recortadas
    Haptics.ts              navigator.vibrate com throttle

  input/
    InputManager.ts         teclado + mouse + virtual → uma única "intenção"
    TouchControls.ts        joystick dinâmico e botões

  systems/
    Inventory.ts            mochila com capacidade
    BaseStock.ts            estoque + dinheiro + histórico entregue
    QuotaSystem.ts          progresso da cota
    UpgradeSystem.ts        compra de picareta
    SaveSystem.ts           localStorage versionado
    AudioSystem.ts          eventos → amostra registrada OU sintetizador provisório

  ui/
    HUD.ts                  recursos, mochila, profundidade, cota, prompt, toasts, botão SUBIR
    DialogUI.ts             caixa de diálogo com efeito de digitação
    PanelUI.ts              oficina, registro de pistas, estatísticas, opções, reset
```

Regras de arquitetura respeitadas:
- Nenhum sistema de gameplay importa UI. A comunicação é por `Events`.
- Nenhum bloco é um objeto — o mundo inteiro são arrays tipados.
- Áudio é desacoplado: `AudioSystem.registerSample('mine_pedra', url)` troca o sintetizador
  por arquivos reais sem tocar em gameplay.
- Sprites podem substituir os `render()` dos placeholders sem alterar lógica.

## 2. Sistemas criados

| Sistema | Estado |
|---|---|
| Movimentação + colisão + câmera | ✅ coyote time, jump buffer, corte de pulo, shake |
| Mineração | ✅ raycast, tiers de ferramenta, rachaduras, flash, partículas, som, haptic |
| Blocos destrutíveis | ✅ 13 tipos data-driven, dano regenerativo, drops por chance |
| Drops e coleta | ✅ física, quique, ímã, texto flutuante |
| Inventário / capacidade | ✅ peso por recurso, aviso de mochila cheia |
| Entrega e estoque | ✅ depósito na base, moedas, histórico |
| Cota | ✅ progresso por recurso na HUD + feedback de conclusão |
| Oficina | ✅ 5 picaretas, custo em recursos, desbloqueio de blocos por tier |
| Geração de mundo | ✅ relevo, cavernas, veios que ficam mais ricos com a profundidade |
| Narrativa | ✅ pista do pai (62 m) + NPC resgatável (118 m) com máquina de estados |
| Iluminação | ✅ escuridão por profundidade, lanterna, cristais/ouro emissivos |
| Save | ✅ posição, tiles alterados, mochila, estoque, upgrades, pistas, NPC, stats |
| Retorno à superfície | ✅ botão de segurar (evita ficar preso em poço vertical) |
| PWA | ✅ manifest landscape + service worker (produção) |
| UI mobile | ✅ joystick dinâmico, botões grandes, safe areas, ajuste para telas baixas |

## 3. Controles

Ver tabela no [README](README.md#controles).
Reservados e visíveis mas desativados: **DASH** e **GADGET**.

## 4. Variáveis configuráveis (onde mexer para ajustar o "feel")

`src/data/config.ts`
- `tileSize`, `metersPerTile`
- `render.targetTilesY` — zoom efetivo (quantos tiles cabem na vertical em qualquer tela)
- `camera.lerp`, `lookAheadX/Y`, `shakeDecay`, `maxShake`
- `physics.gravity`, `maxFallSpeed`, `coyoteTime`, `jumpBuffer`, `jumpCutMultiplier`, acelerações e atritos
- `player.stats` — `miningPower`, `miningSpeed`, `moveSpeed`, `jumpForce`, `inventoryCapacity`, `lightRadius`
- `player.miningRange`, `magnetRadius`, `pickupRadius`, `interactRadius`
- `mining.hitsPerSecondBase`, `crackStages`, `damageResetDelay/Rate`, `shakeOnHit/Break`
- `drops.*` — gravidade, quique, atrito, velocidade do ímã, tempo de vida
- `particles.max/hitCount/breakCount`
- `world.width/height/surfaceRow/seed/chunkSize`
- `base.centerCol/shaftWidth/shaftDepth`
- `light.darkStartDepth/darkFullDepth/maxDarkness`
- `haptics.*`, `save.autosaveIntervalSec`, `debug.*`

`src/data/blocks.ts` — por bloco: `hp`, `drop`, `dropMin/Max`, `dropChance`, `rarity`, `value`,
`minDepth`, `maxDepth`, `minTool`, `veinChance`, `veinSizeMin/Max`, cores e `sfxMaterial`.

`src/data/tools.ts` — poder, velocidade, alcance, tier e custo de cada picareta.
`src/data/quota.ts` — o que a base pede.
`src/data/story.ts` — posição das salas, textos dos diálogos, comportamento do NPC.

## 4b. Pipeline de arte (leva 1 aplicada)

```
arte-bruta/                      entrada bruta da IA (fora do git)
  blocos/01..15.png              15 texturas 1254x1254
  sheet_character.png            folha 4x4 do heroi
  sheet_cracks.png               folha 2x2 de rachaduras
  sheet_icones.png               folha 3x2 de icones de recurso
  _substituidos/                 versoes antigas guardadas
      ↓  npm run slice-assets  (tools/slice-assets.mjs)
public/art/
  blocks/<chave>_<variacao>.png  128x128 opaco
  character/miner_sheet.png      512x512, 4x4 quadros de 128, alpha
  fx/cracks.png                  256x256, 4 estagios de 128, alpha
  ui/<recurso>.png               64x64, alpha
```

O que o cortador resolve sozinho:
- reduz por media de area (sem serrilhado) e pre-multiplica alpha (sem halo escuro);
- detecta se a folha ja tem transparencia; se nao, recorta fundo chapado (magenta/branco);
- **alinha os pes** de cada quadro do heroi numa linha comum (a IA erra ate 22 px, o que
  faria o personagem tremer ao andar);
- aceita a mesma folha em grades diferentes (4x4 heroi, 2x2 rachadura, 3x2 icones);
- mapeia arquivo -> bloco pela ordem OU pelo nome, e imprime o mapa para conferencia.

O que o motor faz com a arte:
- `src/data/art.ts` e o manifesto; `ART.enabled = false` volta tudo para os placeholders (A/B);
- textura ausente nao e erro: cada sistema cai no desenho vetorial antigo;
- cada tile **espelha** conforme a posicao no mundo (4 arranjos a partir de 1 textura) —
  sem isso, blocos de minerio repetem em padrao diagonal na tela;
- a **paleta das particulas e extraida da propria textura** no carregamento, com o minerio
  forcado na mistura: trocar a arte troca a cor dos estilhacos, sem tocar em codigo;
- o fundo de galeria leva um escurecimento fixo por cima, garantindo que "buraco" nunca
  se confunda com "parede" por mais bonita que a textura seja;
- o cache de chunk sobe para 64 px por tile (`ART.tileArtScale`) quando ha arte HD.

Leva 2 aplicada: 4 fundos de parallax (ceu + 3 camadas de caverna) e 6 objetos da base
(galpao, deposito, oficina, entrada da mina, poste, carrinho).

O parallax so aparece em **caverna aberta**: se o vao esta a menos de 3 tiles de um bloco
solido, continua valendo a parede rente. E o que separa "cavei um tunel" de "cheguei numa
caverna" (`ART.openCaveRadius`).

Minerio nao usa mais textura pronta: o motor pinta a rocha da camada e **carimba os icones de
minerio ja recortados** em posicao, rotacao e tamanho sorteados pela posicao do tile
(`ART.oreStamp`). Nenhum bloco de minerio fica igual a outro, e o veio combina com a rocha da
profundidade em que nasce.

Ainda em placeholder: NPC Jonas, a marca do pai, icones das 5 picaretas e todo o audio.

## 4c. Arvore de atributos e habilidades

```
src/data/attributes.ts     ~70 atributos com base, formato, teto e flag `live`
src/data/skills.ts         definicao dos nos (id, ramo, custo, requisitos, modificadores)
src/systems/Attributes.ts  camada de modificadores (flat/percentAdd/percentMultiply/override/unlock/proc)
src/systems/Procs.ts       sistema de chance reutilizavel, com cooldown e protecoes por tag
src/systems/SkillTree.ts   niveis, pontos, requisitos, flags de historia, reset e save
src/ui/SkillTreeUI.ts      tela com abas por categoria, arrastar, zoom e painel de detalhe
```

Como funciona:
- **Nada e hardcoded.** Trocar 10% por 8% e editar `skills.ts`. A logica nao sabe numeros.
- **Nenhuma skill escreve no atributo base.** Cada nivel registra uma *fonte* de modificadores
  em `Attributes`; reset e recalculo sao so remover fontes. A ferramenta equipada e mais uma
  fonte ('tool'), exatamente como uma skill.
- Formula: `(base + flat) * (1 + soma percentAdd) * produto(1 + percentMultiply)`, com
  `override` substituindo e tetos por atributo (nada de critico 300%).
- **Tags de bloco** (`soil`, `stone`, `hardStone`, `ore`, `rareOre`, `ancient`, `quest`...)
  definem onde cada efeito vale. Fratura nunca racha estrutura antiga, jackpot so em minerio,
  nenhum proc toca bloco `indestructible`/`quest`/`boss`.
- **Quantidade logica separada da visual**: um jackpot multiplica o recurso por 6 mas cria no
  maximo 12 entidades fisicas — o resto e particula.
- **Pontos vem de descer e explorar**: 1 a cada 25 m novos de profundidade, 1 por pista,
  2 por resgate, 2 pela cota. Nunca por matar.
- **Legado** nao usa pontos: e liberado por flags de historia e nunca e resetado.
- Save tolera skills novas e ignora ids que nao existem mais.

Primeira leva implementada (25 nos): poder, velocidade, dano em rocha dura e em minerio,
critico (3 niveis) e multiplicador, fratura, coleta (velocidade/raio/ima), rendimento,
sorte, jackpot, mochila, peso, velocidade, salto, controle aereo, lanterna, deteccao de
minerio raro, alcance — mais os dois primeiros nos de Legado.

Ferramentas de dev em Ajustes: +1/+10 pontos, desbloquear tudo, resetar, forcar jackpot,
critico e fratura, e pular para 250 m.

## 4d. Mapa, exploracao e camadas

```
src/data/layers.ts          camadas: nome, cor, rocha, ambiente, cavernas e TABELA DE MINERIO
src/systems/Exploration.ts  memoria do mapa (1 bit por tile) + pontos de interesse
src/ui/MapRenderer.ts       desenho compartilhado do mundo conhecido
src/ui/Minimap.ts           minimapa da HUD (redesenha so ao trocar de tile)
src/ui/MapScreen.ts         tela cheia: arrastar, zoom, regua de profundidade, lista de lugares
```

**Exploracao** e guardada como bitset — o mundo inteiro (120x260) cabe em ~4 KB, entao o mapa
completo vai no save sem incha-lo. O raio revelado sai do atributo `mapRevealRadius`,
que a skill Cartografo aumenta.

**Pontos de interesse** sao registrados pela historia (pistas, NPCs), pela base e pelos limites
de camada. Ficam escondidos ate o jogador passar perto, e a lista lateral do mapa leva a
camera ate eles — que era o pedido: voltar a um lugar da historia sem se perder.

**Camadas** deixaram de ser so uma troca de textura. Cada uma define:
- `ambient` — a cor do escuro. E o que mais comunica "estou noutro lugar".
- `darkness` — teto de escuridao proprio.
- `caveBonus` — cavernas maiores conforme desce (10% de vao no solo, 28% nas profundezas).
- `ores` — **tabela de minerio exclusiva**. O carvao domina em cima e some embaixo; ferro,
  ouro e cristal so existem de verdade na camada de cristal.
- `strata` — uma faixa de rocha diferente marcando a entrada da camada.
- `rockKey` / `backwall` — rocha base dos veios e textura de galeria.

Composicao medida no mundo gerado:

| Camada | Carvao | Cobre | Ferro | Ouro | Cristal | Vao |
|---|---|---|---|---|---|---|
| Solo 0-6 m | 4,4% | — | — | — | — | 10% |
| Pedra 20-60 m | 7,5% | 2,9% | 1,0% | — | — | 20% |
| Pedra 80-115 m | 9,7% | 3,1% | 1,4% | — | — | 14% |
| Cristal 130-175 m | 1,5% | 2,0% | 8,1% | 2,8% | 3,8% | 16% |
| Cristal 190-235 m | 1,7% | 2,7% | 9,0% | 2,2% | 4,0% | 28% |

Ao cruzar um limite, um cartao anuncia a camada e a frase dela.

## 4e. Mundo de 2 km, relogio, tecnologia e copias

**Profundidade.** O mundo passou de 260 para 2080 tiles: **2060 m jogaveis**, com as camadas
nas profundidades do GDD (Solo 0, Pedra 50, Cristal 200, Minerais 500, Magma 900, Ruinas 1300,
Abismo 1700, Portal 1960). 249.600 tiles no total.

**Rocha por camada sem arte nova.** Cada camada define `tint`: a textura de pedra e recolorida
em tempo de carga com o modo `color` do canvas, que troca matiz preservando o relevo. Cristal
fica roxo, Minerais azul-petroleo, Magma vermelho, Ruinas verde, Abismo violeta. O mesmo
mecanismo gera os icones dos 3 recursos novos (Rubi, Reliquia, Pedra do Vazio) a partir dos
icones existentes.

**Densidade de minerio** subiu de ~11% para 30-45% conforme a camada — antes a maior parte do
que se quebrava era pedra sem graca.

**Relogio** (`TimeSystem`): hora, dia e semana. Move o ceu entre as tres artes (dia/entardecer/
noite), escurece a superficie a noite e vai alimentar a cota semanal. 10 min reais = 1 dia.

**Pesquisa e Tecnologia** (`TechTree` + `TechScreen`): paga com recurso do estoque, nao com
ponto de habilidade — progressao paralela a arvore de atributos. Ja abriga a Copiadora, os
upgrades de picareta (saiu da oficina antiga) e o refino, que multiplica o valor das entregas.

**Copias** (`Clone` + `CloneManager`): cada copia mina, coleta e entrega sozinha.
- Foco configuravel: minerar, coletar ou os dois.
- Filtro por recurso: a copia so procura o que voce marcar.
- Raio de area de trabalho e entrega automatica.
- Cor propria por copia, tingindo a folha do heroi (zero arte nova).
- Bloco no caminho e minerado: a copia abre o proprio tunel em vez de travar.
- Longe do deposito, a carga **sobe pelo poco** com barra de progresso, em vez de pathing de
  centenas de metros. E o lugar onde o elevador vai entrar depois.
- Anti-travamento: sem progresso por 9 s, volta para o ponto de origem.

## 4f. Automacao: esteiras, elevadores, armazens e refinarias

```
src/data/structures.ts       definicao de cada estrutura (custo, tech, velocidade, capacidade)
src/systems/Automation.ts    a rede: construir, transportar, entregar, salvar
src/world/StructureRenderer  desenho vetorial (arte final entra depois, um metodo por tipo)
src/ui/BuildMode.ts          modo construir: barra, fantasma de posicao, config do armazem
```

**Regra unica da rede:** nao existe grafo. Quando um item chega ao fim de uma estrutura, ele e
oferecido ao tile seguinte na direcao do transporte. Isso torna a rede trivial de construir,
de salvar e de depurar — e faz a linha se comportar como o jogador espera olhando para ela.

Tres comportamentos que valem a pena conhecer:

1. **Linha quebrada derruba o item no chao.** Nada some silenciosamente: se a esteira termina no
   nada, o recurso cai e fica visivel. O erro se explica sozinho.
2. **Armazem com filtro e um separador.** Ele pega o que e dele e deixa o resto seguir (ate 4
   armazens em sequencia). E assim que se monta "armazens de recursos separados" ao longo de
   uma unica linha, sem entupir.
3. **Refinaria transforma, nao so multiplica.** Carvao, ouro e cristal que passam por ela viram
   Coque, Barra de Ouro e Prisma de Cristal (`REFINE_RECIPES` em `/data/structures.ts`) — menos
   quantidade, mais valor por unidade. Minerio sem receita (ferro, cobre, pedra, rubi...)
   continua no comportamento antigo: so multiplica pela quantidade (`refineryYield`), para nao
   quebrar linha ja construida. **A Picareta das Profundezas (a melhor) agora custa Barra de
   Ouro**, nao ouro cru — e o que da proposito real a refinaria: sem ela, essa picareta nunca
   fica ao alcance.

**Copia custa moeda, nao recurso.** Pagar com minerio bruto competia direto com
a cota da semana — imprimir uma copia atrasava a entrega. Em moeda, a copia
vira o destino natural do dinheiro que ja sobra da venda. Primeira copia: 900,
e cada uma seguinte custa 1,6x a anterior. A propria copiadora ja vem montada
(o custo do pilar de automacao esta nas copias, nao na maquina).

**A copia caca trabalho sozinha.** Tres correcoes que a tiraram do lugar:

1. **Cavar para baixo.** `moveToward` so abria caminho para o lado e para cima.
   Impressa na base, a copia nao tinha como chegar na mina.
2. **Alvo alcancavel.** Ela nao pula nem escala: perseguir bloco acima da
   cabeca virava sobe-e-cai eterno. Agora so mira bloco na altura dela ou
   abaixo (vizinho de cima ainda vale, que esta ao alcance do braco).
3. **Uma caixa, nao duas.** A busca era a intersecao de duas caixas (ao redor
   do posto E ao redor da copia) e podia dar vazio mesmo com minerio em volta.
   Agora a area e uma so, ao redor do posto.

E **migracao**: a cada 5 s ela conta quanto minerio ainda ha na area; abaixo de
3, procura um deposito melhor num raio de 40 tiles (preferindo mais fundo) e
muda o posto para la. Sem nada no raio, desce 12 tiles e abre caminho. Sem isto
a copia impressa na base passava a vida raspando terra, que nao solta nada.

Medido: impressa na base, em 17 s ela desceu ate 17 m, encheu a mochila (30) e
entregou — a cota da semana saiu de 0 para 15/90 sem o jogador tocar em nada.

**Copias usam a rede.** Ao encher, a copia procura uma entrada (esteira ou armazem) num raio de
16 tiles e joga a carga la. Se nao houver rede por perto, cai no comportamento antigo de enviar
pelo poco. E o caminho de evolucao que o GDD descreve: manual -> envio -> linha industrial.

**Tecnologia** libera cada estrutura (`build:conveyor`, `build:lift`, `build:storage`,
`build:refinery`) e os upgrades de velocidade e rendimento. Construir custa recurso do estoque;
remover devolve metade.

Teste de ponta a ponta (21 elevadores + 13 esteiras + refinaria + armazem dedicado a ouro):
20 carvao entraram e 36 sairam na base (refino), 4 ouro foram capturados pelo armazem filtrado
e enviados, e o cristal passou direto pelo armazem sem travar a linha.

## 4g. Criaturas, combate e vida

```
src/data/creatures.ts        bestiario (6 criaturas) + CREATURE_CONFIG
src/entities/Creature.ts     IA curta, fisica propria, desenho vetorial
src/systems/CreatureManager  postos de guardiao, populacao de ambiente, ataque, save
src/systems/Vitals.ts        vida do jogador, iframes, morte e cura
```

**Dez bichos com arte propria**, cada um em 5 animacoes (parado, andar, atacar,
levar dano, morrer). A fauna troca ANTES da rocha: cada bicho aparece em duas ou
tres camadas vizinhas, entao descer sempre apresenta algo novo antes de o
cenario mudar.

| camada | quem mora la |
|---|---|
| superficie | nenhuma (a superficie e segura) |
| pedra (50 m) | Toupeira Mineira, Larva Palida, Morcego Rubro, Aranha Violeta |
| cristal (200 m) | Morcego, Aranha, Cogumelo Venenoso, Casco de Cristal |
| minerais (500 m) | Aranha, Cogumelo, Casco de Cristal, Limo Acido |
| magma (900 m) | Vespa Ignea, Escaravelho de Magma, Limo |
| ruinas (1300 m) | Vespa, Escaravelho, Limo, Casco de Cristal, Alma Perdida |
| abismo (1700 m) | Escaravelho, Limo, Alma Perdida |
| portal (1960 m) | Alma Perdida |

Vida e dano sobem com a profundidade: 34/6 na toupeira, 220/30 na alma. Tres
bichos VOAM (morcego, vespa, alma): ignoram gravidade, perseguem em linha reta e
nascem no vao, nao no chao — morcego andando pelo chao so mostra que ele e um
bloco com asas.

**Duas populacoes, propositos diferentes.**

1. **Ambiente** (toupeira, morcego, besouro, verme, elemental): nasce e some ao redor do jogador
   conforme a camada, so abaixo de 8 m. Da vida a caverna e cobra atencao, nada mais.
2. **Guardioes**: fixos. A geracao varre o mundo procurando aglomerados de minerio raro e planta
   um Guardiao de Cristal ali — **89 postos** na semente atual, um a cada ~23 m. Acordam quando o
   jogador chega a 420 px, entram no mapa como marcador de chefe e brilham no escuro.
   E o que da sentido ao combate: **a recompensa fica atras deles**, nao espalhada.

**Nao existe botao de ataque.** O mesmo golpe da picareta atinge criatura e bloco — mirar decide
qual. A criatura tem prioridade no golpe em que for atingida (cone de 0,25 de produto escalar na
direcao da mira), entao acertar uma criatura nunca e acidente.

**Morrer nao e brutal** (GDD §20). Ao chegar a zero: 1,8 s caido com vinheta vermelha, resgate
para a base, vida cheia, 2 s de invulneravel e perda de **35 % da carga da mochila**. Habilidade,
tecnologia, mapa, base e estruturas ficam intactos. A base cura 26 de vida por segundo ate 6 m de
profundidade — sair da mina sempre vale a pena.

**A aba Sobrevivencia deixou de ser vazia.** Sete nos novos (dois ramos):
`Couro Grosso` (+100 de vida total), `Casco de Mineiro` (ate 26 % de defesa), `Folego Longo`
(regeneracao andando), `Pe Firme` (resistencia a empurrao), `Picareta de Guerra` (dano de 10 ->
~34), `Ponto Cego` (critico) e `Cacador de Guardioes` (dano extra em guardiao, exige 300 m).

Teste de ponta a ponta: guardiao de 260 de vida morto em 26 golpes a dano base, dropou cristal,
deu +1 ponto de habilidade, marcou o posto como limpo (nao renasce) e o marcador do mapa como
resolvido. Morte testada com 20 carvao e 10 ferro na mochila: sobraram 13 e 7, jogador voltou a
0 m com 100/100 de vida.

**Criatura emparedada nao trava.** Se o vao fechar em cima dela, ela tenta subir por 2,5 s;
depois some (ambiente) ou volta ao posto (guardiao).

## 4g-bis. Nivel e XP

```
src/systems/Progression.ts   xp, nivel, curva e ponto por nivel
```

Profundidade e historia dao pontos em saltos raros; entre um salto e outro o
jogador ficava sem nada acontecendo. O nivel e o pingo constante: cada bloco
quebrado, cada entrega, cada criatura e cada metro novo empurram a barra, e
cada nivel vale 1 ponto de habilidade.

Curva `baseXp * nivel^1.35`: nivel 2 custa 90, nivel 3 custa 231, nivel 4 custa
397. Medido: 40 blocos de terra/pedra = 44 XP, entao o primeiro nivel sai em
~80 blocos e os seguintes esticam sem travar.

O ponto vem do nivel, e o nivel vem de JOGAR — nunca de gastar dinheiro nem de
esperar o relogio.

## 4g-ter. Toupeiras coletoras e mina que se refaz

```
src/data/collectors.ts        precos, melhorias e numeros das toupeiras
src/entities/Collector.ts     a toupeira: buscar, atravessar rocha, voltar
src/systems/CollectorManager  contratacao, melhorias em moeda, entrega
```

**Por que existem.** Com a mochila cheia o jogador sobe deixando recurso no
chao — e boa parte disso ele nunca volta para buscar. A toupeira e barata (50
moedas a primeira), nao mina e nao briga: so recolhe o que ficou para tras.

**Ela atravessa a rocha, nao cava.** Nao colide com nada e desce reto, o que
lhe permite ir buscar a 300 m e voltar sem depender de poco nenhum. Dentro da
pedra anda a 55% da velocidade, levanta poeira e ganha um halo escuro — o
trabalho dela precisa ser visto, nao ser um numero que sobe sozinho. A melhoria
`Dentes de Diamante` faz a rocha por onde ela passa ceder de vez: o tunel fica
aberto e o que estava dentro cai para ela mesma recolher.

**Nunca param enquanto houver minerio solto:** o raio de busca cobre o mapa.

Medido: contratada na base, desceu a 85 m em 20 s atravessando rocha, recolheu
24 de ouro e entregou — 624 no estoque sem o jogador sair do lugar.

**Copia nao depende mais de camara.** A mesma maquina imprime quantas o jogador
conseguir pagar; o freio e o preco (900, x1,6 a cada uma).

### A mina se refaz

So MINERIO volta, entre 260 e 400 s depois de quebrado, no maximo 8 por
segundo e nunca a menos de 150 px do jogador. Corredor aberto continua aberto:
encher o caminho de pedra de novo seria punir quem construiu passagem. Sem
isso a mina virava casca vazia e todo mundo — jogador e ajudantes — tinha que
andar cada vez mais longe para achar o mesmo carvao.

Medido: veio de 24 blocos quebrado, 24 de volta, com tempos diferentes para o
veio nao reaparecer inteiro de uma vez.

## 4g-quater. Equipamento e a divisao da economia

```
src/data/equipment.ts       catalogo: 11 itens em 4 slots
src/systems/Equipment.ts    o que foi comprado e o que esta vestido
```

**A regra da economia**, que ficou clara agora:

| moeda | ponto de atributo |
|---|---|
| equipamento, habilidades ativas, copias, toupeiras | arvore de atributos |
| vem de entregar (seu, das copias, das toupeiras) | vem de descer, da historia e de subir de nivel |
| abundante | raro |

Cada uma compra um tipo de progresso diferente, e a economia passa a ter onde
ser gasta — antes o dinheiro so servia para a oficina.

**Slots:** cabeca, corpo, costas, pes. Um item ativo por slot. Comprar ja veste;
trocar nao custa nada — cobrar pela troca so faria o jogador evitar
experimentar. Itens aparecem na loja conforme a profundidade ja alcancada.

Dois efeitos precisaram virar de verdade para os itens nao mentirem:
`climbStamina` deixou de ser numero fixo no CONFIG e virou atributo (botas e
mochila a jato mexem nele), e `glide` e uma flag nova que segura a queda a 42%
da velocidade (asas e jato). Item que promete o que o motor nao faz e pior que
item nenhum.

### Entregar passou a ser uma regra so

`BaseStock.deliver()` guarda o recurso E paga por ele. A regra estava escrita em
tres lugares e um deles esquecia de pagar: o jogador entregando virava moeda,
mas copia e toupeira so enchiam o estoque. Trabalho de ajudante rende dinheiro
igual ao seu.

Medido: toupeira trouxe 12 de ouro e o saldo foi de 950 para 1454.

## 4h. Habilidades ativas — Choque, Broca e Volta Rapida

```
src/systems/ActiveSkills.ts   cargas, recarga e estado (molde para as proximas)
src/mining/ShockChain.ts      a corrente: escolha de alvos e desenho dos raios
```

Tres habilidades, duas formas de gasto (descritas em `/data/activeSkills.ts`):

| habilidade | forma | o que faz |
|---|---|---|
| Choque | cargas | corrente que salta entre blocos, preferindo o mesmo material |
| Broca | cargas | cada martelada abre um tunel na direcao da mira |
| Volta Rapida | canalizada | 3 s parado e a mina te devolve na base |

Subir de nivel e so somar modificador: nenhuma precisa de codigo novo para
ficar melhor. Um botao por habilidade no pad, e habilidade nao aprendida nao
ocupa espaco.

**Contrato das de carga:** apertar liga N marteladas com o efeito; quando as marteladas
acabam, comeca a recarga. Nao e passivo que dispara sozinho — o jogador escolhe
QUANDO gastar, e e essa escolha que faz a habilidade valer alguma coisa.

**A corrente prefere o mesmo material.** Cada salto pontua os vizinhos por
distancia (contra) e por ser do mesmo bloco de origem (a favor, peso 3). Bater
numa pedra solta rende pouco; bater no meio de um veio de ferro derruba o veio.
E o que transforma a habilidade em ferramenta de exploracao em vez de "dano em
area": ela desenha a forma do deposito.

Protecoes de sempre: `indestructible`, `quest` e `boss` nunca sao alvo, e ha
teto de blocos por martelada (`CONFIG.skills.shockMaxTargets`).

**Quatro niveis:** desbloqueia -> +2 saltos e +12% de forca -> +2 marteladas e
-4 s de recarga -> +3 saltos, +1 de alcance e +18% de forca. No nivel 3 medido:
6 saltos, 5 marteladas, 12 s de recarga.

Uma armadilha que custou um teste: ler a definicao do bloco DEPOIS de aplicar o
dano devolve ar, e o bloco quebrava sem soltar nada. Quem quebra bloco de fora
do golpe normal recebe o `BlockDef` de antes.

## 4i. Publicacao (Vercel + PWA)

```
vercel.json              headers de cache por tipo de arquivo
vite.config.ts           plugin que carimba o BUILD_ID no service worker
public/sw.js             3 estrategias de cache (ver abaixo)
tools/make-icons.mjs     gera os PNG do PWA a partir da folha do personagem
```

O service worker usa **network-first** para o documento (deploy novo aparece no primeiro
carregamento), **cache-first** para `/assets/*` (nome com hash, nunca serve versao velha) e
**stale-while-revalidate** para arte e icones. Cada build carimba um `BUILD_ID` novo, entao o
cache anterior e apagado no `activate` — sem celular preso em versao antiga.

Icones: `npm run icons` recorta o primeiro quadro de `miner_sheet.png` e escreve 192, 512,
maskable 512 e apple-touch 180. Nenhuma arte nova foi necessaria.

## 4j. Chefes de bioma: o limitador de progressao

```
src/data/gates.ts         geometria do selo (linhas e coluna da arena)
src/data/creatures.ts     os 6 chefes (campo `bossOfLayer`)
src/systems/BiomeGate.ts  estado por camada, abertura do selo, save
src/world/WorldGen.ts     passo 3b: esculpe selo + arena
src/world/World.ts        openGateBand()
```

**O problema.** Com picareta boa, pedra e minerio cediam quase igual em toda
profundidade: dava para chegar nas Ruinas Antigas (1300 m) em poucos minutos.
A mina tinha 2 km de conteudo e nenhuma razao para o jogador ficar em nenhum
andar.

**A regra, sem excecao.** Uma camada so abre quando DUAS coisas acontecem:

1. o chefe fixo daquela camada morre;
2. TODO mineiro preso naquela camada foi resgatado.

Antes disso, uma faixa de 6 tiles de `SEAL` (indestrutivel) atravessa o mundo
inteiro na fronteira. Nao ha desvio: o selo recusa picareta, Broca, Choque,
fratura e ate a toupeira que atravessa rocha — todos ja checavam
`indestructible`/`quest`/`boss` antes de tocar num tile.

**A arena e a unica porta.** No meio do selo, na coluna do poco principal
(col 70), o WorldGen escava uma sala de 9x4: paredes e piso continuam selados,
so o teto tem 3 colunas de rocha normal para o jogador cavar e cair dentro. O
chefe espera em cima do piso selado — ele guarda literalmente a saida.

Quando as duas condicoes batem, o selo INTEIRO vira ar (nao so a arena). Isso
importa por um motivo pratico: copia e toupeira cavam sozinhas em qualquer
coluna, e ficariam presas para sempre num selo parcial.

**Os seis, na ordem em que se encontra:**

| camada | chefe | vida | onde o selo fica |
|---|---|---|---|
| Pedra (50 m) | Golem de Escombros | 320 | 44–49 m |
| Cristal (200 m) | Arauto de Quartzo | 700 | 194–199 m |
| Minerais (500 m) | Automato Enferrujado | 1150 | 494–499 m |
| Magma (900 m) | Fundidor Incandescente | 1750 | 894–899 m |
| Ruinas (1300 m) | Escriba Selado | 2500 | 1294–1299 m |
| Abismo (1700 m) | Eco do Portal | 3600 | 1694–1699 m |

Cada um paga pontos de habilidade (2 a 5) e moedas (500 a 7000), e reaparece
NUNCA: chefe morto nao volta em sessao nenhuma.

**Save barato.** O WorldGen sempre gera tudo selado (ele e deterministico e nao
sabe de save). O save guarda so dois booleanos por camada; ao carregar,
`reopenSavedGates()` reabre as faixas ja vencidas. Gravar os tiles daria
centenas de diferencas por selo — assim sao 12 booleanos no total.

Testado de ponta a ponta: selo fechado bloqueia; matar o chefe sozinho NAO
abre (Jonas ainda preso); resgatar Jonas abre a faixa inteira no mesmo frame;
recarregar mantem aberto e nao ressuscita o Golem; jogo novo volta com os 6.

### A rocha tambem endurece

`LayerDef.hpMultiplier` multiplica o HP de todo bloco daquela camada: 1x na
superficie e na pedra, 1,35 no cristal, 1,75 nos minerais, 2,3 no magma, 3 nas
ruinas, 3,9 no abismo. A MESMA pedra fica mais dura conforme desce, sem
duplicar bloco por bloco. `World.effectiveHp()` e publico porque a mira e a
toupeira precisam da mesma conta — senao a barra de rachadura mente.

### A historia parou de ser "o pai esta no fundo"

Cinco mineiros novos (um por camada) e cinco pistas novas montam um fio que
NAO se resolve nesta leva:

- **Helena** (cristal, 260 m) — geologa do "Setor 3"; o pai liderava a equipe.
- **Baptista** (minerais, 600 m) — mecanico; achou pecas que nenhuma fabrica
  conhecida fez.
- **Ferreira** (magma, 980 m) — a empresa mandou continuar DEPOIS de o Setor 3
  parar de responder.
- **Corvo** (ruinas, 1400 m) — batedor; "as ruinas contam quem entra".
- **A Voz** (abismo, 1780 m) — nao lembra o proprio nome. Fala de um homem que
  "escolheu ficar", e nao confirma se era o pai.

As pistas fecham o circulo: diario do Setor 3 (230 m), peca sem origem
(560 m), registro da expedicao com o nome do pai numa "equipe avancada"
(940 m), inscricao nao-humana (1340 m) e o gravador do pai (1740 m): *"se voce
esta ouvindo isso, nao abra a porta"*.

O jogador termina esta leva sabendo que o pai **nao se perdeu** — foi mandado,
e depois escolheu ficar guardando alguma coisa. Que coisa, e o gancho da
proxima.

## 5. Problemas conhecidos

0. **Tremor de tela somava impactos.** Com mineracao rapida a camera ficava
   presa no teto e era impossivel jogar. Agora `addShake` pega o MAIOR impacto
   em vez de somar, o teto caiu de 10 para 5,5 e existe ajuste do jogador
   (Ajustes -> Tremor da tela: Nenhum / Pouco / Normal).
1. **Engasgo ao repintar muitos chunks de uma vez** (~20 ms no primeiro frame após carregar o save
   ou virar a tela). Solução futura: repintar no máximo N chunks por frame.
2. **Sem áudio final.** O `AudioSystem` sintetiza os sons; é feedback funcional, não arte sonora.
3. **Criaturas sem arte e sem som proprio.** Silhueta vetorial por tipo; o feedback de combate
   usa o sintetizador. E o proximo pedido de arte mais barato em ganho por hora.
3b. **Combate e simples de proposito**: sem esquiva, sem bloqueio, sem projetil. A criatura anda,
   sobe degrau e bate. Guardiao nao voa nem cava — se o jogador se fechar numa toca, ele espera.
4. **NPC com IA mínima**: anda em linha reta até o ponto seguro; se o caminho estiver bloqueado,
   considera que chegou.
5. **Regeneração de dano do bloco** (3,5 s) pode surpreender quem troca de alvo — é intencional,
   mas precisa de validação em playtest.
6. **Service worker sem precache**: cacheia sob demanda (o primeiro acesso offline so tem o que
   ja foi visitado). Versionado por build, entao nao serve versao velha — mas um precache da
   lista de arte ainda melhoraria o primeiro voo offline.
7. **Save por seed + diferenças**: mudar `CONFIG.world.seed` ou o algoritmo de geração invalida
   saves antigos (o jogo detecta e ignora, sem quebrar).
8. **Pedra comum ainda ocupa mochila** (35 % de chance de drop). Pode irritar; é o primeiro
   número a testar em playtest.
8b. **Uma variação por bloco.** O espelhamento disfarça, mas terra/pedra/fundos ainda repetem
   em areas grandes. Gerar `_1` e `_2` para esses 6 e o maior ganho visual restante.
9. **Sem tela inicial / menu** — o jogo entra direto na base.
10. **`noUnusedLocals` ligado**, mas não há lint/formatter configurado (sem ESLint/Prettier).
11. **Os 6 chefes de bioma nao tem arte.** Sao silhuetas vetoriais; dois reaproveitam a arte de
   `cristalino` e `alma`. Como agora eles sao o momento mais importante de cada camada, subiram
   para o topo da fila de arte — a frente das criaturas comuns.
12. **Chefe luta igual criatura comum**, so que com mais vida: anda, sobe degrau e bate. Sem fase,
   sem ataque especial, sem area. Funciona, mas um "guardiao" merece pelo menos uma segunda fase.
13. **Os 6 mineiros perdidos sao visualmente identicos** (`RescueNpc.render()` e vetor com cores
   fixas). Helena, Baptista, Corvo e A Voz tem historias bem diferentes e a mesma silhueta.
14. **Cidades subterraneas ainda nao existem** — os prompts estao em ASSETS.md, a geracao nao.
   As Ruinas Antigas continuam sendo rocha tingida de verde com minerio melhor.

## 6. Próximo passo recomendado

**Playtest da nova curva.** Tudo que entrou nesta leva (rocha que endurece, selo de bioma,
refino) existe para responder uma frase do dono do jogo: *"cheguei na zona das ruinas antigas
bem rapido"*. So jogando da para saber se agora esta dificil ou chato.

O teste tem um alvo claro: **quanto tempo leva para abrir o primeiro selo** (matar o Golem de
Escombros aos 50 m e resgatar Jonas aos 118 m). Se for menos de 10 minutos, `hpMultiplier` da
pedra e a vida do Golem estao baixos demais.

Na ordem, depois do teste:

1. **Ajustar `hpMultiplier` e a vida dos chefes.** Os dois numeros novos que controlam o ritmo
   inteiro, em `src/data/layers.ts` e `src/data/creatures.ts`. Mexer neles antes de mexer em
   qualquer outra coisa.
2. **Arte dos 6 chefes.** Viraram o climax de cada camada e sao vetor. Prompts prontos em
   ASSETS.md.
3. **Segunda fase de chefe.** Abaixo de 40 % de vida, algo muda — velocidade, invocacao, area.
   Hoje a luta e uma barra descendo.
4. **Retratos dos mineiros perdidos.** Seis historias, uma silhueta. Prompts em ASSETS.md.
5. **Cidades subterraneas nas Ruinas.** O maior salto de "lugar" que falta no mundo.
6. **Som real.** O sintetizador cobre tudo, mas som e metade da sensacao de impacto.
7. **Tela inicial + tutorial de 30 segundos.** Hoje o jogo entra direto na base.

Nao adicionar sistema novo antes do item 1 estar aprovado.

## 7. A biblia narrativa e o que o codigo precisa mudar

`BIBLIA.md` (v1.0, 15/09/2026) e a fonte canonica de historia. O .docx original
esta em `docs/`. **Quando o codigo discordar dela, o codigo esta errado.**

Esta secao existe porque boa parte da historia foi escrita no codigo ANTES da
biblia chegar. Ela registra o que bate, o que colide e em que ordem consertar.

### O que bate (e bate bem)

As profundidades das camadas foram escolhidas sem conhecer a biblia e cairam
quase em cima das cidades dela. Isso e sorte, e vale preservar:

| camada no codigo | prof. | local na biblia | prof. |
|---|---|---|---|
| Camada de Pedra | 50 | Solo Antigo / Pedra Fria | 0–360 |
| Cavernas de Cristal | 200 | Pedra Fria / Posto Nove | ~320 |
| Profundezas Minerais | 500 | **BLOCKIA** | 600 |
| Zona de Magma | 900 | **FERRURIA** | 980 |
| Ruinas Antigas | 1300 | **LUMORA** | 1380 |
| Abismo | 1700 | **VESPERA** | 1720 |
| O Portal | 1960 | Camara da Porta | 1960 |

Nao mexer nesses numeros. O selo de bioma ja cai exatamente onde a biblia
coloca a entrada de cada cidade — o selo vira, literalmente, o portao da
cidade.

O bestiario tambem bate: morcego, aranha, cogumelo, limo (slime toxico),
cristalino (caranguejo cristalino), vespa, escaravelho (escorpiao de lava) e
alma (apariciao espectral) existem nos dois lados. Falta o **verme de tunel**.

### O que colide (em ordem de urgencia)

1. **`npc_helena` tem o nome da mae do protagonista.** Na biblia, Helena
   Ramires e a mae de Elias e fica na superficie. Ter uma geologa Helena a
   260 m e um erro que so piora conforme a historia cresce. **Renomear ja.**

2. **O selo exige "resgatar todos os mineiros perdidos". A biblia proibe esse
   enquadramento.** Pilar 2.2, com todas as letras: os habitantes *"nao devem
   ser tratados como coitados esperando resgate"* — as geracoes seguintes
   **escolheram** ficar. A maquina do `BiomeGate` esta certa; a ficcao em cima
   dela esta errada. A segunda condicao deve virar **confianca da cidade**
   (secao 7 da biblia define Confianca / Influencia / Legado). Mara Avelar nao
   quer ser salva: ela quer prova de que Elias nao vai repetir Santiago — e
   exatamente a missao M9.

3. **O pai nao tem nome no codigo, e tem ficha completa na biblia.** Santiago
   Ramires, 38 no desaparecimento, brilhante e obsessivo. O jogador e **Elias
   Ramires**, 22. Hoje o jogo trata os dois como anonimos.

4. **O "Setor 3" foi inventado por mim e nao existe na biblia.** As 6 pistas em
   `src/data/story.ts` contam uma expedicao de empresa com maquinario antigo.
   A biblia conta outra coisa, melhor: **John sumiu onze dias antes e Santiago
   desceu atras dele.** As 12 Paginas do Caderno (secao 14) substituem as
   pistas inventadas — sao o colecionavel canonico.

5. **Os 6 chefes sao invencao minha.** A biblia nomeia tres: **Rainha
   Escavadora** (420–500 m), **Colosso Prismatico** (Lumora) e **Guardiao da
   Porta** (final), mais uma criatura que emerge do Abismo em Vespera. Os meus
   nao contradizem nada — mas os nomes canonicos tem que existir primeiro.

6. **Escopo.** A biblia descreve 16h40 de campanha com 4 cidades, reputacao em
   tres eixos, 36 missoes principais e 20 submissoes. O jogo hoje e um loop de
   mineracao com cota. Isso nao e um problema a resolver — e o mapa de anos de
   trabalho. Ver a ordem abaixo.

### Ordem de reconciliacao

Barato e faz diferenca imediata:

1. Renomear `npc_helena`. Nomear Elias e Santiago no jogo.
2. Trocar a segunda condicao do selo de "resgatar N" para "confianca da
   cidade". Nada da maquina muda; muda o texto e a fonte do contador.
3. Substituir as 6 pistas inventadas pelas **Paginas do Caderno** canonicas
   (12 paginas, secao 14 da biblia) e criar a tela de leitura.
4. Renomear os chefes que tem equivalente canonico.

Medio, e o proximo salto real do jogo:

5. **Blockia a 600 m** como primeiro hub subterraneo de verdade: Mara, Silas,
   Nina, Breno, Irene, Afonso, Lio. Os prompts de cidade subterranea da leva 3
   em `ASSETS.md` ja servem para isso — mas devem ser refeitos com o nome
   Blockia e o lema *"A pedra nos fechou uma porta e nos construimos uma casa."*
6. Reputacao por cidade (Confianca / Influencia / Legado).
7. Sistema de missoes em arquivo de dados, como pede a secao 27 da biblia.

Longo, nao comecar agora: Ferruria, Lumora, Vespera, cutscenes, radio, Veyra.

### Regra permanente

Antes de criar NPC, cidade, chefe, item ou missao: **procurar na biblia
primeiro**. Se existe, usar o nome e a profundidade de la. Se nao existe, e
invencao — e invencao tem que ser declarada como invencao, nunca apresentada
como se fosse canone.
