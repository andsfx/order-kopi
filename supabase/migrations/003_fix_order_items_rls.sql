-- ============================================
-- MIGRATION: Fix order_items RLS Policy
-- ============================================
-- This migration fixes the order_items RLS policy to prevent cross-session data leakage.
-- The original "Anyone can view order items" policy allowed unrestricted access.
--
-- Run this in Supabase SQL Editor for EXISTING databases.
-- For new databases, the secure policy is already in setup.sql.
--
-- Date: 2026-05-05
-- ============================================

-- Step 1: Drop the insecure policy (if it exists)
drop policy if exists "Anyone can view order items" on order_items;

-- Step 2: Create secure policy that restricts access to session token owner
-- Policy: Customers can only view order items for their own orders (by session token)
-- Admin (authenticated users) can view all order items
create policy "Customers can view their own order items"
  on order_items for select
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
      and orders.session_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    or auth.role() = 'authenticated'
  );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration was successful:

-- 1. List all policies on order_items table
-- select policyname, cmd, qual 
-- from pg_policies 
-- where tablename = 'order_items';

-- Expected result:
-- - "Anyone can create order items" (INSERT)
-- - "Customers can view their own order items" (SELECT) - with session_token check
-- - "Authenticated users can delete order items" (DELETE)

-- 2. Test cross-session isolation (requires two test orders with different session tokens)
-- See .sisyphus/evidence/task-3-rls-isolation.json for test script

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- Uncomment and run this if you need to rollback:

-- drop policy if exists "Customers can view their own order items" on order_items;
-- 
-- -- Restore old policy (INSECURE - only for rollback)
-- create policy "Anyone can view order items" 
--   on order_items for select using (true);
