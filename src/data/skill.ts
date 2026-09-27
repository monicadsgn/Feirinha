/**
 * Skill do claude.ai pra Feirinha. O app monta o arquivo com o link da casa
 * (código secreto + nome de quem usa) já preenchido; a pessoa baixa e sobe
 * em claude.ai → Configurações → Capacidades → Skills.
 */
export function skillMarkdown(base: string, me: string): string {
  return `---
name: feirinha
description: Salva receitas e anota itens no app Feirinha da casa de ${me}. Use SEMPRE que ${me} mandar print, foto, carrossel, quadro de vídeo, link ou texto de receita ("salva essa receita", "joga na Feirinha", "guarda pra depois"), print de lista de compras, ou pedir pra anotar o que acabou ou o que comprar ("acabou o arroz", "coloca café na lista"). Também quando ela disser "Feirinha".
---

# Feirinha

A Feirinha é o app de despensa, lista da feira e receitas da casa de ${me}. Esta skill lê o que ela manda e gera um **link de um toque** que grava direto na casa (sincroniza com o celular dela e do marido).

Link da casa (tem um código secreto: nunca mostre por inteiro fora do botão, nunca repita em outro lugar):

\`\`\`
${base}
\`\`\`

## 1. Receita (print, foto, carrossel, quadro de vídeo, texto ou link)

1. Leia **todas** as imagens com atenção (cada slide do carrossel, o quadro do vídeo, a legenda). Não invente ingrediente nem quantidade: se algo não aparece, deixe sem quantidade.
2. Monte o texto da receita assim (em português, curto):

\`\`\`
Ingredientes:
- 500 g de carne moída
- 4 batatas
- 1 caixa de creme de leite
Modo de preparo:
1. ...
2. ...
\`\`\`

   - Um ingrediente por linha, com quantidade e unidade quando houver ("2 ovos", "1 xícara de farinha de trigo", "sal a gosto").
   - Modo de preparo em no máximo 8 passos curtos.
3. Escolha um **nome** curto e claro (ex.: "Escondidinho de carne moída"), não a primeira frase da legenda.
4. Se der pra saber, a **refeição**: \`cafe\`, \`almoco\` ou \`jantar\` (pode ser mais de uma, separadas por vírgula).
5. Monte o link com Python (ferramenta de código), pra codificar certo acentos e quebras de linha:

\`\`\`python
from urllib.parse import quote
base = "${base}"
url = base + "&nome=" + quote(nome) + "&texto=" + quote(texto)
if refeicao: url += "&refeicao=" + quote(refeicao)
if link_do_post: url += "&link=" + quote(link_do_post)
print(url)
\`\`\`

   Se o link passar de 7000 caracteres, encurte o modo de preparo.
6. Responda com um resumo curto (nome + ingredientes) e o botão em markdown:
   **[🧺 Salvar no Feirinha](URL)**
   Diga que é só tocar: abre uma página confirmando "Receita salva" e ela aparece em Receitas → Salvas no app.

## 2. Anotar na lista (o que acabou ou o que comprar)

Serve pra frases ("acabou o detergente e o arroz") e pra print de lista de compras.

1. Monte uma frase de comando em português simples:
   - o que **acabou**: \`acabou detergente, arroz e feijão\`
   - o que **comprar**: \`coloca 2 pacotes de café, 1 kg de queijo, papel higiênico\`
   Use vírgula entre os itens. Números podem ser algarismos.
2. Link: \`base + "&voz=" + quote(frase)\` (mesmo Python do item 1).
3. Responda com a lista entendida e o botão **[🧺 Anotar na Feirinha](URL)**.

## Regras

- Português do Brasil, respostas curtas.
- Uma receita por botão. Se mandarem várias receitas, gere um botão pra cada.
- Não mostre o link cru; só o botão.
- Se não der pra ler a imagem, peça outro print mais de perto em vez de adivinhar.
`
}
