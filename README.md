# Legado das Profundezas

Jogo 2D de mineração, exploração e automação — **mobile landscape**, feito em
**TypeScript + Canvas2D + Vite**, sem engine e sem nenhuma dependência de runtime.

Um filho desce na mina onde o pai desapareceu. Cava, encontra pistas, resgata quem ficou para
trás, monta uma operação industrial lá embaixo — e desce mais.

## Rodar local

```bash
npm install
npm run dev
```

O Vite escuta em `0.0.0.0`, então dá para abrir no celular pelo IP da máquina
(`http://192.168.x.x:5173`) na mesma rede.

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | checa tipos e gera `dist/` |
| `npm run preview` | serve o `dist/` como a Vercel serviria |
| `npm run typecheck` | só a checagem de tipos |
| `npm run slice-assets` | fatia a arte bruta em `public/art` |
| `npm run icons` | regenera os ícones do PWA |

## Publicar na Vercel

O repositório já vem pronto (`vercel.json` + plugin que versiona o service worker).

1. **vercel.com → Add New → Project → Import Git Repository** e escolha este repo.
2. A Vercel detecta Vite sozinha. Se pedir, confirme:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **Deploy**. Cada `git push` na branch principal publica de novo.

Pela CLI, se preferir:

```bash
npx vercel --prod
```

### Testar no celular

Abra a URL da Vercel no navegador do telefone, gire para **paisagem** e use
**Compartilhar → Adicionar à Tela de Início** (iOS) ou **Instalar app** (Android).
Instalado, ele abre em tela cheia, trava em landscape e funciona offline depois da primeira
visita. Os controles de toque aparecem sozinhos.

> O save fica no `localStorage` do aparelho — celular e desktop têm progressos separados.
> Para zerar: **☰ Ajustes → Apagar save**.

## Controles

| Ação | Mobile | Teclado / Mouse |
|---|---|---|
| Mover | joystick virtual (metade esquerda, aparece onde o dedo tocar) | `A`/`D` ou setas |
| Mirar | direção do joystick | `W`/`S` ou mover o mouse |
| Minerar / atacar | botão **MINERAR** (segurar) | `J`, `X` ou botão esquerdo |
| Pular | botão **PULAR** | `Espaço`, `K`, `Z` |
| Escalar | encostar na parede segurando ↑ | idem |
| Interagir | botão **AGIR** | `E`, `F`, `Enter` |
| Mapa completo | tocar no minimapa | idem |
| Tecnologia / Habilidades / Construir / Ajustes | botões ⚗ ✦ ⛏ ☰ na HUD | idem |

Dá para forçar os controles de toque em **Ajustes → Controles na tela**.

## O que existe

**Mundo.** 2 km de profundidade (120 × 2080 tiles), 8 camadas com rocha, minérios, cor de luz e
faixas de estrato próprios. Tilemap destrutível em arrays tipados, render por chunks com cache
offscreen. Geração determinística: o save guarda a semente + as diferenças.

**Mineração.** Mira por raycast, rachaduras progressivas, críticos, fratura, jackpot, veio rico —
tudo por sorteio com proteção de tag (nada destrói bloco de missão ou indestrutível).

**Progressão.** Árvore de 36 habilidades em 6 categorias sobre uma camada de modificadores
`(base + plano) × (1 + Σ%) × Π(1 + %)`, com pontos vindos de profundidade e história —
nunca de matar. Tecnologia com picaretas, copiadora, refino e estruturas.

**Automação.** Cópias do protagonista mineram sozinhas com foco e filtro configuráveis; esteiras,
elevadores, armazéns filtrados e refinarias levam a carga até a base. Gerador queima carvão e a
energia multiplica a velocidade da linha.

**Pressão.** Cota semanal que escala, relógio de dia/noite, e criaturas que guardam os depósitos
generosos. Morrer custa 35 % da mochila e o tempo de descer de novo — nunca progressão. Cada
bloco fica mais duro conforme desce, e um **chefe fixo por bioma** trava a passagem: só se avança
depois de matá-lo e resgatar todo mineiro preso naquela camada.

**Refino.** Carvão, ouro e cristal viram coque, barra e prisma dentro da Refinaria — a melhor
picareta só se compra com ouro refinado, então a linha de automação deixa de ser opcional.

**Apresentação.** Arte real em blocos, herói animado, ícones e cenário; iluminação por
profundidade; PWA landscape instalável.

Auditoria completa, variáveis configuráveis e próximos passos: [`DOCUMENTACAO.md`](DOCUMENTACAO.md) ·
Pipeline de arte: [`ASSETS.md`](ASSETS.md).
