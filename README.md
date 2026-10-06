# Moncef Gastronomia — cardápio e solicitação de delivery

[Site](https://m20513703-art.github.io/moncef-gastronomia-cardapio/) · [Cardápio interativo](https://m20513703-art.github.io/moncef-gastronomia-cardapio/delivery.html) · [PDV demonstrativo](https://m20513703-art.github.io/moncef-gastronomia-cardapio/pdv.html)

## Páginas e arquivos

- `index.html` — página inicial e atalhos para o cardápio interativo, WhatsApp, Instagram, informações e histórico.
- `delivery.html` — catálogo por categorias, seleção de opções e personalizações, carrinho, histórico local e formulário de solicitação. Finalizar prepara uma mensagem para o WhatsApp da Moncef; o cliente ainda precisa revisar e tocar em **Enviar**.
- `pdv.html` — demonstração local de vendas de balcão, fila, cadastro/edição/disponibilidade de produtos e configurações. Não é integrado ao WhatsApp nem sincroniza entre dispositivos.
- `app.js` — lógica das telas de delivery e PDV.
- `catalog.json` — catálogo de produtos e opções.
- `delivery-pdv.css` — estilos das telas de delivery e PDV.

## Limitações e dados comerciais

O site estático não possui servidor ou banco de dados. O histórico do cardápio fica apenas no navegador/aparelho em que a solicitação foi preparada; não informa se a mensagem foi enviada, não acompanha o status real do pedido e não sincroniza com o PDV. Para receber pedidos e atualizar status entre aparelhos, além de proteger o acesso ao PDV, é necessário implementar um backend e banco de dados.

Horário informado: todos os dias, das 18h às 23h. Taxa de entrega e regra de preço para pizza meio a meio ainda precisam ser confirmadas pela Moncef; por isso o cardápio informa que esses valores serão confirmados no WhatsApp. As fotos de produtos são ilustrativas quando não identificam imagens próprias dos itens.
