# Feirinha 🧺

App (PWA, gratuito) para a feira do mês: despensa que se lembra do que vocês compram, lista que nunca começa do zero e Modo Mercado com lista + calculadora na mesma tela.

## O que já faz

- **Despensa**: catálogo da casa separado por lugar (geladeira, armário, área de serviço…). Cada item tem quantidade padrão, corredor, mercado preferido e itens que “andam juntos”.
- **Estoque estimado**: o app aprende quanto vocês consomem por dia (pelo histórico) e vai descontando sozinho. Não precisa lembrar de atualizar; quando atualiza (“Acabou” / “−1” / revisão), a estimativa é corrigida.
- **Atalhos pra “acabou”**: botão na tela inicial, “+ Adicionar” em todas as telas e atalhos do ícone instalado (`?acao=acabou`, `?acao=adicionar`, `?tela=mercado`, `?add=detergente`).
- **Revisão da despensa**: cômodo por cômodo, com Tem / Pouco / Acabou. O que o app acha que acabou já vem marcado e a lista sai pronta.
- **Colar lista antiga**: entende “4 arroz”, “detergente 2”, “1kg de tomate”.
- **Modo Mercado**: total fixo no topo, saldo do ticket e quanto passa em dinheiro, itens na ordem dos corredores do mercado, teclado de preço (digita 649 → R$ 6,49), “mesmo preço da última vez”, arrastar → pegou / ← não tinha, extras marcados à parte.
- **Não esqueceu?**: antes da feira, lembra dos itens que vocês sempre levam ou que devem estar acabando.
- **Pendentes**: o que não tinha no mercado continua na lista como “faltou no mercado”.
- **Resumo**: gasto do mês (ticket × dinheiro), média mensal, gasto por categoria, extras, e por item: consumo por mês, gasto por mês, de quantos em quantos dias repõe e variação de preço.

## Rodar

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera dist/ (site estático + service worker)
```

No ar em **https://feirinha-six.vercel.app** (Vercel, deploy automático a cada push na branch principal).

## Lista compartilhada

Os dados ficam no navegador e, quando a casa é criada em Ajustes → Compartilhar a casa, também num Supabase. O convite é um link com um código secreto (`?casa=…`); quem abre entra na mesma casa.

Para ligar:

1. Rodar `supabase/feirinha.sql` no projeto (cria só `feirinha_records` e as funções `feirinha_push`/`feirinha_pull`).
2. Definir na Vercel `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY` (chave pública/anon) e fazer um novo deploy.

Sem essas variáveis o app funciona igual, só sem a parte de compartilhar.

## Receitas e porções

Aba Receitas: receitas prontas pensadas pro que a casa compra (quanto de carne gastam e quanto rendem), a conta de quantas refeições a carne em casa + na lista rende até a próxima feira, e receitas salvas do Instagram/TikTok (no Android, "Compartilhar → Feirinha").

## Nota fiscal (NFC-e)

O QR code da nota aponta pra página pública da Sefaz. `api/nfce.js` (função da Vercel, região São Paulo) busca essa página e devolve os itens; o app liga cada produto a um item da despensa (entende abreviações como "DETERG", "CR LEITE") e lembra a escolha. Serve pra preencher os preços da compra em andamento ou salvar uma compra nova.

O leitor segue o layout padrão do portal da NFC-e usado pela maioria dos estados. Se um estado usar outro formato, a função responde "não consegui ler os itens desse estado" com o endereço, pra ajustar o `parseNota`.
