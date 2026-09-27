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

Os dados ficam no navegador (localStorage), e dá pra fazer backup em Ajustes. Todo registro já tem `id` + `updatedAt` para a sincronização entre os dois celulares, que é o próximo passo.

## Próximos passos

1. Sincronizar entre os celulares do casal (Supabase no plano grátis).
2. Receitas de café da manhã e jantar com o que foi comprado.
3. Ler o QR code da nota fiscal (NFC-e) para preencher os preços sozinho.
