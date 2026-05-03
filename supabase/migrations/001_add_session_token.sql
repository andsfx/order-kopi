-- ============================================
-- MIGRATION: Add Session Token Security
-- ============================================
-- This migration adds session token support for anonymous order tracking
-- and updates RLS policies to secure order access.
--
-- Run this in Supabase SQL Editor for EXISTING databases.
-- For new databases, use the updated setup.sql instead.
--
-- Date: 2026-05-03
-- ============================================

-- Step 1: Add session_token column to orders table
alter table orders add column if not exists session_token text;

-- Step 2: Create index for faster lookups
create index if not exists idx_orders_session_token on orders(session_token);

-- Step 3: Drop old insecure policies
drop policy if exists "Anyone can update orders" on orders;
drop policy if exists "Anyone can view orders" on orders;

-- Step 4: Create new secure policies

-- Policy: Customers can only view their own orders (by session token)
-- Admin (authenticated users) can view all orders
create policy "Customers can view their own orders"
  on orders for select
  using (
    session_token = current_setting('request.headers', true)::json->>'x-session-token'
    or auth.role() = 'authenticated'
  );

-- Policy: Customers can only update their own orders
-- Admin (authenticated users) can update all orders
create policy "Customers can update their own orders"
  on orders for update
  using (
    session_token = current_setting('request.headers', true)::json->>'x-session-token'
    or auth.role() = 'authenticated'
  );

-- Policy: Customers can only cancel their own pending orders
-- This is more restrictive - only allows cancellation of pending_payment orders
create policy "Customers can cancel their own pending orders"
  on orders for update
  using (
    session_token = current_setting('request.headers', true)::json->>'x-session-token'
    and status = 'pending_payment'
  )
  with check (
    status = 'cancelled'
  );

-- Step 5: Keep the insert policy (customers need to create orders)
-- This policy should already exist, but we'll recreate it to be safe
drop policy if exists "Anyone can create orders" on orders;
create policy "Anyone can create orders"
  on orders for insert
  with check (true);

-- Step 6: Keep the delete policy (only admin can delete)
-- This policy should already exist
drop policy if exists "Authenticated users can delete orders" on orders;
create policy "Authenticated users can delete orders"
  on orders for delete
  using (auth.role() = 'authenticated');

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration was successful:

-- 1. Check if session_token column exists
-- select column_name, data_type 
-- from information_schema.columns 
-- where table_name = 'orders' and column_name = 'session_token';

-- 2. Check if index exists
-- select indexname from pg_indexes 
-- where tablename = 'orders' and indexname = 'idx_orders_session_token';

-- 3. List all policies on orders table
-- select policyname, cmd, qual, with_check 
-- from pg_policies 
-- where tablename = 'orders';

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- Uncomment and run these if you need to rollback:

-- drop policy if exists "Customers can view their own orders" on orders;
-- drop policy if exists "Customers can update their own orders" on orders;
-- drop policy if exists "Customers can cancel their own pending orders" on orders;
-- drop index if exists idx_orders_session_token;
-- alter table orders drop column if exists session_token;

-- -- Restore old policies (INSECURE - only for rollback)
-- create policy "Anyone can view orders" on orders for select using (true);
-- create policy "Anyone can update orders" on orders for update using (true);
