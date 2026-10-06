-- Moncef Gastronomia: catálogo editável, pedidos e configuração com RLS.
-- O cardápio base continua em catalog.json; esta tabela guarda apenas alterações.

create table if not exists public.product_overrides (
  product_id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id boolean primary key default true check (id),
  open_time text not null default '18:00',
  close_time text not null default '23:00',
  delivery_fee numeric(10,2),
  is_open boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id, open_time, close_time, delivery_fee, is_open)
values (true, '18:00', '23:00', null, true)
on conflict (id) do nothing;

create table if not exists public.orders (
  id text primary key,
  channel text not null check (channel in ('Delivery', 'Balcão')),
  status text not null default 'Novo' check (status in ('Novo', 'Em preparo', 'Pronto', 'Saiu para entrega', 'Concluído', 'Cancelado')),
  created_at timestamptz not null default now(),
  customer jsonb not null default '{}'::jsonb check (jsonb_typeof(customer) = 'object'),
  payment text not null default '',
  change_for text not null default '',
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2),
  total numeric(10,2),
  fee_pending boolean not null default true,
  total_pending boolean not null default true,
  price_pending boolean not null default false,
  tracking_token text unique,
  updated_at timestamptz not null default now()
);

create table if not exists public.pdv_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists product_overrides_touch_updated_at on public.product_overrides;
create trigger product_overrides_touch_updated_at before update on public.product_overrides
for each row execute function public.touch_updated_at();
drop trigger if exists store_settings_touch_updated_at on public.store_settings;
create trigger store_settings_touch_updated_at before update on public.store_settings
for each row execute function public.touch_updated_at();
drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at before update on public.orders
for each row execute function public.touch_updated_at();

create or replace function public.is_pdv_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.pdv_admins where user_id = auth.uid()); $$;
revoke all on function public.is_pdv_admin() from public;
grant execute on function public.is_pdv_admin() to authenticated;

-- Public order tracking: only returns a safe summary when the customer has the secret token.
create or replace function public.get_public_order_status(p_order_id text, p_tracking_token text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'id', id, 'status', status, 'created_at', created_at,
    'subtotal', subtotal, 'delivery_fee', delivery_fee, 'total', total,
    'fee_pending', fee_pending, 'total_pending', total_pending
  )
  from public.orders
  where id = p_order_id and tracking_token = p_tracking_token
  limit 1;
$$;
revoke all on function public.get_public_order_status(text, text) from public;
grant execute on function public.get_public_order_status(text, text) to anon, authenticated;

alter table public.product_overrides enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders enable row level security;
alter table public.pdv_admins enable row level security;

revoke all on public.product_overrides, public.store_settings, public.orders, public.pdv_admins from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.product_overrides, public.store_settings to anon, authenticated;
grant insert on public.orders to anon;
grant select, insert, update, delete on public.product_overrides, public.store_settings, public.orders to authenticated;

-- Customers can read catalog overrides and store hours, never customer/order rows.
drop policy if exists product_overrides_public_read on public.product_overrides;
create policy product_overrides_public_read on public.product_overrides
for select to anon using (true);
drop policy if exists product_overrides_admin_all on public.product_overrides;
create policy product_overrides_admin_all on public.product_overrides
for all to authenticated using (public.is_pdv_admin()) with check (public.is_pdv_admin());

drop policy if exists store_settings_public_read on public.store_settings;
create policy store_settings_public_read on public.store_settings
for select to anon using (id = true);
drop policy if exists store_settings_admin_all on public.store_settings;
create policy store_settings_admin_all on public.store_settings
for all to authenticated using (public.is_pdv_admin()) with check (public.is_pdv_admin());

drop policy if exists orders_public_delivery_insert on public.orders;
create policy orders_public_delivery_insert on public.orders
for insert to anon with check (
  channel = 'Delivery' and status = 'Novo'
  and tracking_token is not null and length(tracking_token) >= 32
  and length(trim(coalesce(customer ->> 'name', ''))) between 1 and 120
  and length(trim(coalesce(customer ->> 'phone', ''))) between 8 and 40
  and length(trim(coalesce(customer ->> 'address', ''))) between 3 and 500
  and jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 100
);
drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders
for all to authenticated using (public.is_pdv_admin()) with check (public.is_pdv_admin());

-- Keep rows available to Supabase Realtime so menu and PDV stay in sync across devices.
alter table public.product_overrides replica identity full;
alter table public.store_settings replica identity full;
alter table public.orders replica identity full;
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_overrides') then
      alter publication supabase_realtime add table public.product_overrides;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'store_settings') then
      alter publication supabase_realtime add table public.store_settings;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
      alter publication supabase_realtime add table public.orders;
    end if;
  end if;
end $$;

-- Temporary PDV access for Mateus; replace/remove when the restaurant owner takes over.
insert into public.pdv_admins (user_id)
values ('a884d7c5-9f4c-4e60-9623-1aa86ba122c0')
on conflict (user_id) do nothing;
