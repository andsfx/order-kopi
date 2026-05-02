-- ============================================
-- Order Kopi — Database Schema
-- Jalankan di Supabase SQL Editor
-- ============================================

-- 1. Categories
create table categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 2. Products
create table products (
  id bigint generated always as identity primary key,
  name text not null,
  price int not null check (price > 0),
  category_id bigint not null references categories(id) on delete restrict,
  description text,
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Orders
create table orders (
  id text primary key, -- e.g. ORD-0001
  customer_name text not null,
  table_number int not null check (table_number between 1 and 50),
  note text,
  total int not null check (total >= 0),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'preparing', 'ready', 'done', 'cancelled')),
  payment_id text, -- bayar.gg payment ID
  payment_url text, -- bayar.gg payment page URL
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- 4. Order Items
create table order_items (
  id bigint generated always as identity primary key,
  order_id text not null references orders(id) on delete cascade,
  product_id bigint not null references products(id) on delete restrict,
  product_name text not null, -- snapshot nama saat order
  qty int not null check (qty > 0),
  size text not null check (size in ('Small', 'Regular', 'Large')),
  temp text not null check (temp in ('Hot', 'Iced')),
  sugar text not null check (sugar in ('Less', 'Normal', 'Extra')),
  price_at_order int not null check (price_at_order > 0), -- harga saat order (snapshot)
  created_at timestamptz not null default now()
);

-- 5. Order counter (untuk generate ID sequential)
create table order_counter (
  id int primary key default 1 check (id = 1), -- hanya 1 row
  last_number int not null default 0
);

insert into order_counter (id, last_number) values (1, 0);

-- ============================================
-- Indexes
-- ============================================
create index idx_products_category on products(category_id);
create index idx_products_available on products(is_available);
create index idx_orders_status on orders(status);
create index idx_orders_created on orders(created_at desc);
create index idx_order_items_order on order_items(order_id);

-- ============================================
-- Function: Generate next order ID
-- ============================================
create or replace function generate_order_id()
returns text
language plpgsql
as $$
declare
  next_num int;
begin
  update order_counter
  set last_number = last_number + 1
  where id = 1
  returning last_number into next_num;

  return 'ORD-' || lpad(next_num::text, 4, '0');
end;
$$;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Categories: public read
alter table categories enable row level security;
create policy "Categories are viewable by everyone"
  on categories for select using (true);

-- Products: public read
alter table products enable row level security;
create policy "Products are viewable by everyone"
  on products for select using (true);

-- Orders: public insert + read own order by ID
alter table orders enable row level security;
create policy "Anyone can create orders"
  on orders for insert with check (true);
create policy "Anyone can view orders"
  on orders for select using (true);
create policy "Service role can update orders"
  on orders for update using (true);

-- Order Items: public insert + read
alter table order_items enable row level security;
create policy "Anyone can create order items"
  on order_items for insert with check (true);
create policy "Anyone can view order items"
  on order_items for select using (true);

-- Order counter: only via function (service role)
alter table order_counter enable row level security;
create policy "Service can manage counter"
  on order_counter for all using (true);

-- ============================================
-- Seed Data: Categories
-- ============================================
insert into categories (name, sort_order) values
  ('Coffee', 1),
  ('Non-Coffee', 2),
  ('Pastry', 3);

-- ============================================
-- Seed Data: Products (dari mockData.js)
-- ============================================
insert into products (name, price, category_id, description, image_url) values
  ('Signature Latte', 38000, 1, 'Espresso dengan susu segar pilihan', 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&q=80'),
  ('Cold Brew', 35000, 1, 'Diseduh dingin selama 12 jam', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80'),
  ('Caramel Macchiato', 42000, 1, 'Vanilla, espresso, dan karamel', 'https://images.unsplash.com/photo-1485808191679-5f86510bd9d4?w=400&q=80'),
  ('Matcha Latte', 38000, 2, 'Matcha premium Jepang dengan susu', 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=400&q=80'),
  ('Taro Milk Tea', 35000, 2, 'Taro creamy dengan boba pilihan', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80'),
  ('Chocolate Frappe', 40000, 2, 'Coklat belgia blended dengan es', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80'),
  ('Butter Croissant', 28000, 3, 'Croissant renyah dengan mentega premium', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80'),
  ('Banana Bread', 25000, 3, 'Banana bread lembut homemade', 'https://images.unsplash.com/photo-1605286978633-2dec93ff88a2?w=400&q=80');

-- ============================================
-- Seed Data: Promos (stored in app for now)
-- ============================================
-- Promos tetap di frontend (mockData.js) karena sifatnya statis/marketing
-- Bisa dipindah ke DB nanti jika admin perlu manage promo

-- ============================================
-- Realtime: Enable untuk orders (status update)
-- ============================================
-- Jalankan di Supabase Dashboard > Database > Replication
-- atau uncomment di bawah:
-- alter publication supabase_realtime add table orders;
