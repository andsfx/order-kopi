-- ============================================
-- MIGRATION: Fix Voucher Usage Race Condition
-- ============================================
-- Adds atomic increment function to prevent race condition
-- when multiple users apply same voucher simultaneously.
--
-- Date: 2026-05-05
-- ============================================

-- Create atomic increment function
create or replace function increment_voucher_usage(p_voucher_id bigint)
returns void as $$
begin
  update vouchers 
  set usage_count = usage_count + 1 
  where id = p_voucher_id 
  and usage_count < usage_limit;
  
  -- If no rows updated, voucher limit reached
  if not found then
    raise exception 'Voucher usage limit reached';
  end if;
end;
$$ language plpgsql security definer;
