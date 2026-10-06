# Moncef Gastronomia — cardápio público e PDV

Site estático publicado no GitHub Pages, com catálogo base de 215 produtos em `catalog.json` e sincronização online pelo projeto Supabase **Moncef Gastronomia** (`uhkxgicwpfigapjuifsn`, região São Paulo).

## Arquitetura

- `delivery.html` é o cardápio público. Carrega `catalog.json`, aplica as alterações públicas da tabela `product_overrides` e lê `store_settings` no Supabase. Os pedidos são gravados em `orders` — não há envio de pedidos pelo WhatsApp.
- `pdv.html` é área restrita. O operador entra com uma conta Supabase Auth previamente convidada e precisa também estar na lista `pdv_admins`; o cliente não pode criar contas pelo site. Uma sessão válida e a função `is_pdv_admin()` são verificadas antes de exibir o PDV.
- O PDV lê e altera pedidos, catálogo e configurações no banco. Realtime notifica alterações do cardápio, configurações e pedidos ao painel e cardápio aberto.
- O histórico local do cliente guarda itens, ID e token aleatório privado de acompanhamento. O navegador consulta somente a função `get_public_order_status(id, token)`, que devolve status e totais seguros; a tabela de pedidos e dados pessoais do cliente não têm leitura pública.
- A senha é criada pelo convite seguro enviado por Supabase Auth e nunca fica armazenada no código. A chave `sb_publishable_…` no JavaScript é uma chave pública de frontend. **Não inserir chave `service_role`, senha do banco ou outros segredos em arquivos públicos.**

## Publicação e configuração

1. Execute `supabase-schema.sql` no SQL Editor do Supabase antes de usar o site; em migrações, mantenha RLS e funções revisadas. A política de leitura pública de `product_overrides` deve ser `USING (true)` para que itens pausados sejam vistos como indisponíveis e não reapareçam do catálogo base.
2. Em Supabase Authentication → URL Configuration, configurar Site URL como `https://m20513703-art.github.io/moncef-gastronomia-cardapio/` e permitir explicitamente `https://m20513703-art.github.io/moncef-gastronomia-cardapio/pdv.html`. Os convites de operador devem usar esse redirect. Reenviar o convite se um link antigo apontar para localhost.
3. Convide cada operador individualmente pelo painel Supabase, confirme o UUID em `auth.users` e autorize-o em `public.pdv_admins`. Não compartilhar senhas. Remova o acesso temporário de demonstração quando o proprietário da loja assumir o painel.
4. Hospedagem estática e Supabase são serviços distintos. Confirme implantação GitHub Pages, convite aceito, acesso protegido, leitura/gravação online, políticas e atualização entre aparelhos antes de operar com clientes.

## Valores ainda pendentes

Horário inicialmente informado: todos os dias, 18:00–23:00. Taxa de entrega e preço de combinação meio a meio continuam a confirmar pela equipe. O sistema não deve convertê-los em valores finais até serem informados pela Moncef.

## Nota operacional

Antes da operação real, validar contato/endereço e política de dados do negócio, limitar abusos de envio de pedidos públicos (por exemplo, controles anti-spam apropriados), definir preço e taxa de entrega, confirmar o convite/credenciais do proprietário e testar o fluxo com a loja. A chave pública não substitui RLS. O PDV mostra dados pessoais de pedidos apenas a usuários autorizados.