-- Retro Hall (Supabase) minimal schema for:
-- - Auth profiles
-- - Store products
-- - Events + attendees
-- - Notifications
-- - Table reservations
--
-- Notes:
-- 1) Run this in Supabase SQL Editor.
-- 2) If you already have some tables, comment out duplicates.

-- =========
-- Profiles
-- =========

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  bio text default '',
  trade_in_credit numeric default 0,
  total_sales integer default 0,
  updated_at timestamptz default now()
);

-- Push notifications token (Expo)
alter table if exists public.user_profiles add column if not exists expo_push_token text;

alter table public.user_profiles enable row level security;

create policy if not exists "profiles read own" on public.user_profiles
  for select to authenticated
  using (auth.uid() = id);

-- Admins can read all profiles (used for broadcasts and business admin tools).
create policy if not exists "profiles admin read" on public.user_profiles
  for select to authenticated
  using (exists (select 1 from public.admin_users a where a.id = auth.uid()));

create policy if not exists "profiles upsert own" on public.user_profiles
  for insert to authenticated
  with check (auth.uid() = id);

create policy if not exists "profiles update own" on public.user_profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============
-- Admin users
-- ============

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);


-- Admin roles (owner/staff)
alter table if exists public.admin_users add column if not exists role text default 'staff';
alter table public.admin_users enable row level security;

create policy if not exists "admins read own" on public.admin_users
  for select to authenticated
  using (auth.uid() = id);

-- Owners can manage admin users (promote/demote staff).
create policy if not exists "admin_users owner read all" on public.admin_users
  for select to authenticated
  using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.role = 'owner'));

create policy if not exists "admin_users owner manage" on public.admin_users
  for all to authenticated
  using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.role = 'owner'))
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.role = 'owner'));


-- ========
-- Products
-- ========

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  system text not null,
  category text not null,
  description text default '',
  condition text default 'Good',
  stock_qty integer default 0,
  low_stock_threshold integer default 3,
  featured boolean default false,
  image_url text,
  price numeric not null,
  created_at timestamptz default now()
);

alter table public.products enable row level security;

-- Product identifiers (SKU/Barcode) and purchasing metadata (cost/supplier)
alter table if exists public.products
  add column if not exists sku text,
  add column if not exists barcode text,
  add column if not exists cost_price numeric,
  add column if not exists supplier text;

-- Keep identifiers unique when provided
create unique index if not exists products_sku_unique on public.products (sku) where sku is not null and sku <> '';
create unique index if not exists products_barcode_unique on public.products (barcode) where barcode is not null and barcode <> '';


-- Anyone can read products.
create policy if not exists "products public read" on public.products
  for select
  using (true);

-- Only admins can insert/update/delete products.
create policy if not exists "products admin write" on public.products
  for all to authenticated
  using (exists (select 1 from public.admin_users a where a.id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid()));

-- ======
-- Orders
-- ======
-- Minimal commerce flow (no payments yet): users create order requests,
-- admins confirm/fulfill/cancel/refund.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  status text default 'pending',
  total numeric default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Push notifications token (Expo)
alter table if exists public.user_profiles add column if not exists expo_push_token text;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  created_at timestamptz default now()
);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Users can read their own orders
create policy if not exists "orders read own" on public.orders
  for select to authenticated
  using (auth.uid() = user_id);

-- Users can create their own orders
create policy if not exists "orders create own" on public.orders
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own orders (e.g., cancel while pending)
create policy if not exists "orders update own" on public.orders
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admin can read/update all orders
create policy if not exists "orders admin read" on public.orders
  for select to authenticated
  using (exists (select 1 from public.admin_users a where a.id = auth.uid()));

create policy if not exists "orders admin update" on public.orders
  for update to authenticated
  using (exists (select 1 from public.admin_users a where a.id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid()));

-- Users can read their own order items (via order ownership)
create policy if not exists "order_items read own" on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

-- Users can insert order items only for their own orders
create policy if not exists "order_items insert own" on public.order_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

-- Admin can read all order items
create policy if not exists "order_items admin read" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.admin_users a where a.id = auth.uid()));

-- ======
-- Events
-- ======

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  date timestamptz not null,
  location text not null,
  max_attendees integer default 16,
  game_type text default 'TCG',
  image_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.events enable row level security;

-- Anyone can read events.
create policy if not exists "events public read" on public.events
  for select
  using (true);

-- Only admins can create/update/delete events.
create policy if not exists "events admin write" on public.events
  for all to authenticated
  using (exists (select 1 from public.admin_users a where a.id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid()));

-- =================
-- Event attendees
-- =================

create table if not exists public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (event_id, user_id)
);

alter table public.event_attendees enable row level security;

create policy if not exists "attendees read for event" on public.event_attendees
  for select
  using (true);

create policy if not exists "attendees join" on public.event_attendees
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy if not exists "attendees leave" on public.event_attendees
  for delete to authenticated
  using (auth.uid() = user_id);

-- ==============
-- Notifications
-- ==============

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'general',
  related_id uuid,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy if not exists "notifications read own" on public.notifications
  for select to authenticated
  using (auth.uid() = user_id);

create policy if not exists "notifications insert own" on public.notifications
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Allow admins to insert notifications for any user (used for broadcasts).
create policy if not exists "notifications admin insert" on public.notifications
  for insert to authenticated
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid()));

create policy if not exists "notifications update own" on public.notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==================
-- Broadcast messages
-- ==================
-- Stores a single record per broadcast (admin audit trail).
create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  message text not null,
  type text default 'broadcast',
  created_at timestamptz default now()
);

alter table public.broadcasts enable row level security;

-- Admins can read/write broadcasts.
create policy if not exists "broadcasts admin read" on public.broadcasts
  for select to authenticated
  using (exists (select 1 from public.admin_users a where a.id = auth.uid()));

create policy if not exists "broadcasts admin write" on public.broadcasts
  for all to authenticated
  using (exists (select 1 from public.admin_users a where a.id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid()));

-- ==================
-- Table reservations
-- ==================

create table if not exists public.table_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  reservation_date date not null,
  time_slot text not null,
  party_size integer not null,
  notes text,
  status text default 'active',
  created_at timestamptz default now()
);

alter table public.table_reservations enable row level security;

create policy if not exists "reservations read own" on public.table_reservations
  for select to authenticated
  using (auth.uid() = user_id);

create policy if not exists "reservations create own" on public.table_reservations
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy if not exists "reservations update own" on public.table_reservations
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================
-- Admin upgrades (optional)
-- ============================
-- These ALTERs are safe to re-run.

alter table public.table_reservations
  add column if not exists table_number integer;

alter table public.table_reservations
  add column if not exists cancel_reason text;

-- Recommended statuses: active | cancelled | completed | no_show

-- Allow admins to read all reservations.
create policy if not exists "reservations admin read" on public.table_reservations
  for select to authenticated
  using (exists (select 1 from public.admin_users a where a.id = auth.uid()));

-- Allow admins to update any reservation (assign table/status/notes).
create policy if not exists "reservations admin update" on public.table_reservations
  for update to authenticated
  using (exists (select 1 from public.admin_users a where a.id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid()));

-- ============================
-- Table-number conflict prevention
-- ============================
-- Prevent double-booking the same table number for the same date + time slot
-- (only applies to ACTIVE reservations where table_number is set).
create unique index if not exists table_reservations_unique_table_slot
  on public.table_reservations (reservation_date, time_slot, table_number)
  where status = 'active' and table_number is not null;

-- =========================
-- Stripe payments upgrades
-- =========================
-- Safe to re-run.
alter table public.orders
  add column if not exists stripe_checkout_session_id text;

alter table public.orders
  add column if not exists stripe_checkout_url text;

alter table public.orders
  add column if not exists stripe_payment_intent_id text;

create index if not exists orders_user_status_idx on public.orders (user_id, status);


-- =========================
-- Atomic order + stock reservation RPC
-- =========================
-- Creates an order request for the authenticated user and (if in stock) decrements stock atomically.
-- If the item is out of stock, it creates a preorder request without decrementing stock.
-- Returns: order_id, is_preorder, reserved, message
create or replace function public.create_order_request(
  p_product_id uuid,
  p_quantity integer default 1
)
returns table (
  order_id uuid,
  is_preorder boolean,
  reserved boolean,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_price numeric;
  v_stock integer;
  v_total numeric;
  v_order_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Invalid quantity';
  end if;

  -- Lock the product row to prevent race conditions.
  select price, stock_qty
    into v_price, v_stock
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  v_total := coalesce(v_price, 0) * p_quantity;

  if coalesce(v_stock, 0) >= p_quantity then
    update public.products
      set stock_qty = stock_qty - p_quantity
    where id = p_product_id;

    is_preorder := false;
  else
    is_preorder := true;
  end if;

  insert into public.orders (user_id, status, total, notes)
  values (
    v_user,
    'pending',
    v_total,
    case when is_preorder then 'Preorder request' else 'Order request' end
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, unit_price)
  values (v_order_id, p_product_id, p_quantity, coalesce(v_price, 0));

  order_id := v_order_id;
  reserved := not is_preorder;
  message := case when is_preorder then 'Preorder created' else 'Order created' end;

  return next;
end;
$$;

revoke all on function public.create_order_request(uuid, integer) from public;
grant execute on function public.create_order_request(uuid, integer) to authenticated;
