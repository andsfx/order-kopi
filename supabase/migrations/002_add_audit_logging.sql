-- ============================================
-- MIGRATION: Add Audit Logging
-- ============================================
-- This migration adds audit logging for order changes
-- Tracks who changed what, when, and from what value to what value
--
-- Run this in Supabase SQL Editor
-- Date: 2026-05-03
-- ============================================

-- Step 1: Create audit_logs table
create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  
  -- What was changed
  table_name text not null,
  record_id text not null, -- Order ID or other record identifier
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE')),
  
  -- Who made the change
  user_id uuid references auth.users(id) on delete set null,
  user_email text, -- Cached for display (in case user is deleted)
  user_type text not null check (user_type in ('admin', 'customer', 'system')),
  session_token text, -- For customer actions
  
  -- What changed
  field_name text, -- Which field was changed (e.g., 'status', 'total')
  old_value text, -- Previous value (JSON string for complex values)
  new_value text, -- New value (JSON string for complex values)
  
  -- Additional context
  ip_address inet, -- IP address of the user (if available)
  user_agent text, -- Browser/device info
  metadata jsonb, -- Additional context (e.g., reason for change)
  
  -- When
  created_at timestamptz not null default now()
);

-- Step 2: Create indexes for fast queries
create index idx_audit_logs_table_record on audit_logs(table_name, record_id);
create index idx_audit_logs_user_id on audit_logs(user_id);
create index idx_audit_logs_created_at on audit_logs(created_at desc);
create index idx_audit_logs_action on audit_logs(action);
create index idx_audit_logs_session_token on audit_logs(session_token);

-- Step 3: Enable RLS
alter table audit_logs enable row level security;

-- Step 4: RLS Policies

-- Only authenticated users (admin) can view audit logs
create policy "Authenticated users can view audit logs"
  on audit_logs for select
  using (auth.role() = 'authenticated');

-- Only authenticated users (admin) can insert audit logs
-- Note: In production, you might want to use a service role for this
create policy "Authenticated users can insert audit logs"
  on audit_logs for insert
  with check (auth.role() = 'authenticated');

-- Prevent deletion of audit logs (immutable)
-- No delete policy = no one can delete

-- Prevent updates to audit logs (immutable)
-- No update policy = no one can update

-- Step 5: Create helper function to log order changes
create or replace function log_order_change(
  p_order_id text,
  p_action text,
  p_field_name text default null,
  p_old_value text default null,
  p_new_value text default null,
  p_user_type text default 'system',
  p_session_token text default null,
  p_metadata jsonb default null
)
returns bigint
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_log_id bigint;
begin
  -- Get current user info if authenticated
  v_user_id := auth.uid();
  if v_user_id is not null then
    select email into v_user_email from auth.users where id = v_user_id;
  end if;

  -- Insert audit log
  insert into audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    user_email,
    user_type,
    session_token,
    field_name,
    old_value,
    new_value,
    metadata
  ) values (
    'orders',
    p_order_id,
    p_action,
    v_user_id,
    v_user_email,
    p_user_type,
    p_session_token,
    p_field_name,
    p_old_value,
    p_new_value,
    p_metadata
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;

-- Grant execute to authenticated users
grant execute on function log_order_change to authenticated;

-- Step 6: Create view for easy querying
create or replace view audit_logs_with_details as
select 
  al.id,
  al.table_name,
  al.record_id,
  al.action,
  al.user_email,
  al.user_type,
  al.field_name,
  al.old_value,
  al.new_value,
  al.metadata,
  al.created_at,
  -- Join with orders to get order details
  o.customer_name,
  o.total as order_total,
  o.status as current_status
from audit_logs al
left join orders o on al.record_id = o.id
where al.table_name = 'orders'
order by al.created_at desc;

-- Grant select on view to authenticated users
grant select on audit_logs_with_details to authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration was successful:

-- 1. Check if audit_logs table exists
-- select table_name from information_schema.tables 
-- where table_name = 'audit_logs';

-- 2. Check indexes
-- select indexname from pg_indexes 
-- where tablename = 'audit_logs';

-- 3. Test logging function
-- select log_order_change(
--   'ORD-0001',
--   'STATUS_CHANGE',
--   'status',
--   'pending_payment',
--   'paid',
--   'admin',
--   null,
--   '{"reason": "Payment confirmed"}'::jsonb
-- );

-- 4. View audit logs
-- select * from audit_logs_with_details limit 10;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- Uncomment and run these if you need to rollback:

-- drop view if exists audit_logs_with_details;
-- drop function if exists log_order_change;
-- drop policy if exists "Authenticated users can view audit logs" on audit_logs;
-- drop policy if exists "Authenticated users can insert audit logs" on audit_logs;
-- drop table if exists audit_logs;
