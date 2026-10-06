# Moncef Gastronomia — cardápio, delivery e PDV local

[Site](https://m20513703-art.github.io/moncef-gastronomia-cardapio/) · [Cardápio interativo](https://m20513703-art.github.io/moncef-gastronomia-cardapio/delivery.html) · [PDV local](https://m20513703-art.github.io/moncef-gastronomia-cardapio/pdv.html)

## Páginas e arquivos

- `index.html` — página inicial inspirada na referência visual da Pizzaria Dom Juan, com status de funcionamento e atalhos.
- `delivery.html` — catálogo por categorias, opções e personalizações, carrinho, formulário e histórico de pedidos.
- `pdv.html` — fila de pedidos, vendas de balcão, produtos, disponibilidade e configurações.
- `app.js` — lógica compartilhada entre cardápio e PDV.
- `catalog.json` — catálogo de produtos e opções.
- `delivery-pdv.css` — estilos das telas de delivery e PDV.

## Funcionamento e limitações

Sem Supabase/backend, o cardápio grava os pedidos no `localStorage` do navegador. O pedido aparece na fila do PDV **somente se o cardápio e o PDV forem usados no mesmo navegador e aparelho**. Celulares e computadores diferentes não sincronizam; o histórico e o status também ficam locais. Os dados de contato e entrega digitados ficam guardados nesse navegador.

Horário informado: todos os dias, das 18h às 23h. Taxa de entrega e regra de preço para pizza meio a meio ainda precisam ser confirmadas pela Moncef; o PDV marca o total como pendente até a equipe confirmar. As fotos dos produtos são ilustrativas quando não identificam imagens próprias dos itens.
