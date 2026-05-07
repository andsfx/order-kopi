-- ============================================
-- MIGRATION: Fix order_counter RLS Policy
-- ============================================
-- The original policy "Anyone can use counter" allows full
-- SELECT/INSERT/UPDATE/DELETE on the counter table.
-- This means anon users could reset or manipulate order numbering.
--
-- Fix: Restrict to SECURITY DEFINER function access only.
-- Anon users can only call generate_order_id() (which uses
-- SECURITY DEFINER to access the counter).
--
-- Date: 2026-05-07
-- ============================================

-- Drop the permissive policy
DROP POLICY IF EXISTS "Anyone can use counter" ON order_counter;

-- Only authenticated users (admin) can view the counter
CREATE POLICY "Authenticated users can view counter"
  ON order_counter FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only the SECURITY DEFINER function can modify the counter
-- (No INSERT/UPDATE/DELETE policy for anon or authenticated users)
-- The generate_order_id() function runs as SECURITY DEFINER,
-- so it bypasses RLS when updating the counter.

-- Grant direct access only to postgres and service role
REVOKE ALL ON order_counter FROM anon;
REVOKE ALL ON order_counter FROM authenticated;

-- Allow authenticated users to SELECT (for admin dashboard)
GRANT SELECT ON order_counter TO authenticated;

-- The SECURITY DEFINER function already has access via postgres role
