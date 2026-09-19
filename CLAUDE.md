# Profundio — como se trabalha aqui

Jogo 2D mobile-landscape de mineração, exploração e mistério. TypeScript +
Canvas2D + Vite, **zero dependência de runtime**. Alvo: celular deitado,
**852×393**. Publica em `profundio.vercel.app` a cada push na `main` — e há
testadores do outro lado, então `main` é produção.

## A regra que manda em tudo: audite com ferramenta, não com leitura

Este projeto já perdeu horas com bugs que *pareciam* certos lendo o código.
Toda regra estrutural virou um verificador executável. Quando você encontrar um
bug de estrutura, **a reprodução vira sonda permanente** — não se conserta e
segue.

```bash
npm run verify     # o portão: tipos + todas as sondas + build
```

| comando | o que ele prova |
|---|---|
| `npm run auditar` | a cadeia de missões e o mundo em volta dela não se contradizem |
| `npm run cidade` | Blockia é percorrível **a pé**, nível por nível, sem ilha |
| `npm run praca` | a mobília de Blockia não se atropela nem sai do terraço |
| `npm run cerca` | nada que anda atravessa um selo |
| `npm run covil` | os encontros opcionais existem no mundo gerado |
| `npm run offline` | o rendimento do turno da noite bate com o jogo rodando |
| `npm run lotacao` | a frota cheia cabe no orçamento de quadro |
| `npm run boss` / `climb` | a arena e o movimento, no mundo gerado de verdade |

### Três armadilhas que já custaram caro aqui

1. **Verificador que copia a premissa do verificado não verifica nada.** Já
   aconteceu duas vezes: a auditoria tinha `377` e `278` escritos à mão,
   copiados do texto que ela deveria conferir. **Nenhum número de sonda pode
   ser digitado — todos saem do dado.**
2. **Teste que passa por não testar.** Já aconteceu três vezes (`ok(x || true)`,
   comparar dois retângulos de tamanho zero, `ok` devolvendo `void` num
   `if (!ok(...)) continue`). Ao escrever sonda, **prove que ela reprova** —
   quebre a coisa de propósito e veja a falha.
3. **Afrouxar o limite para o teste passar.** Quando uma sonda acusa, primeiro
   verifique se a acusação está certa. Duas vezes a sonda estava errada e o
   jogo certo; a correção foi trocar a *pergunta*, nunca relaxar o limite.

## Cânone

`BIBLIA.md` manda na história. Elias Ramires (22) procura o pai, Santiago, que
sumiu há 14 anos — atrás de John Calder, que sumiu 11 dias antes dele. Quatro
cidades subterrâneas são **porteiras**: abaixo de cada uma, só a picareta dela
quebra a rocha, e a cidade só a entrega a quem a serviu.

`docs/CADEIA-DE-MISSOES.md` tem a cadeia inteira em ordem.

## Arte

`arte-bruta/` (299 MB) **não está no git** — vive só na máquina do dono. Os
recortes ficam em `public/art/`, e esses **estão** versionados. Consequência
prática: os cortadores (`npm run slice-blockia`, `slice-trajes`, etc.) **não
rodam na nuvem**, só quando arte nova chega na máquina local.

Regra do cortador: **meça a folha antes de cortar.** A grade que se pede nunca
é a grade que vem. Dentro de cada célula, o recorte final é a caixa apertada do
que tem pixel.

Prompts de arte vão **colados no chat**, em bloco de código, um por imagem.
Arquivo `.md` não substitui.

## Código

- Comentários em português, **sem acento** no código (o `.md` pode ter).
- Comentário explica **por quê**, não o quê. Quando algo já quebrou, o
  comentário conta o que quebrou e como se mediu.
- CSS: **especificidade vence cascata.** Regra nova no fim do arquivo perde
  para regra antiga mais específica — já aconteceu três vezes. `npm run
  quem-ganha` diz qual regra vence uma propriedade.
- A UI é desenhada em espaço virtual 1518×700 e entregue por `zoom:
  var(--ui-zoom)`. Medida em px na tela sai ~56% do pretendido; use
  `--toque: calc(30px / var(--ui-zoom))` para alvo de toque real.

## Commits

Mensagem conta **o que quebrava e por quê**, não a lista de arquivos. Título
curto e concreto. Termina com:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

## Não fazer sem pedir

- Não commitar `arte-bruta/`, `.env*` nem `.vercel/`.
- Não subir vídeo nem asset pesado: o repo publica na frente dos testadores.
- O portão de senha do jogo é **cortina, não segurança**. Não trate como tal.
