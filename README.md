# Moncef Gastronomia — Cardápio e demonstração

[Cardápio informativo ao vivo](https://m20513703-art.github.io/moncef-gastronomia-cardapio/)

## Protótipo de delivery e PDV

- `delivery.html` — navegação por categorias, carrinho, personalização de pizzas e açaí, checkout demonstrativo.
- `pdv.html` — fila de pedidos, venda de balcão, cadastro/edição/indisponibilidade de produtos e configuração de horário/taxa.
- `app.js` — lógica compartilhada entre as duas telas.
- `catalog.json` — itens e preços derivados do cardápio já fornecido.
- `delivery-pdv.css` — estilos das duas telas.

A demonstração grava produtos, pedidos e configurações no armazenamento local do navegador. As telas sincronizam apenas no mesmo navegador/aparelho; não há servidor, banco de dados, cobrança, envio à loja nem autenticação do PDV. Não use dados reais de clientes. Para operação real em vários aparelhos, receber pedidos e proteger o PDV, será necessário backend e banco de dados.

Os dados de horários e taxa vêm com valores de exemplo e precisam ser confirmados pela Moncef. A divisão de pizzas meio a meio usa temporariamente o preço do sabor mais caro; confirmar a regra comercial. Fotos de produtos são ilustrativas.
