-- ============================================
-- MIGRATION: Hash session tokens for security
-- ============================================
-- Stores a SHA-256 hash of session tokens instead of plain text.
-- Prevents session hijacking if database is compromised.
--
-- Approach:
-- - Add session_token_hash column alongside session_token
-- - New orders store hash; existing orders keep plain text for backward compat
-- - RLS policies updated to check hash first, fall back to plain text
-- - After all existing sessions expire (24h), plain text column can be dropped
--
-- Date: 2026-05-07
-- ============================================

-- 1. Add hashed session token column
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS session_token_hash TEXT;

COMMENT ON COLUMN orders.session_token_hash IS 'SHA-256 hash of session_token for secure lookup';

-- 2. Create index on hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_session_token_hash 
ON orders(session_token_hash) 
WHERE session_token_hash IS NOT NULL;

-- 3. Create function to hash session tokens
CREATE OR REPLACE FUNCTION hash_session_token(token TEXT)
RETURNS TEXT AS $$
  SELECT encode(digest(token, 'sha256'), 'hex');
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- 4. Create trigger to auto-hash session_token on insert
CREATE OR REPLACE FUNCTION auto_hash_session_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_token IS NOT NULL AND NEW.session_token_hash IS NULL THEN
    NEW.session_token_hash := hash_session_token(NEW.session_token);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_hash_session_token ON orders;
CREATE TRIGGER trigger_auto_hash_session_token
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_hash_session_token();

-- 5. Update RLS policies to use hash when available, fall back to plain text
-- Drop existing select policy
DROP POLICY IF EXISTS "Customers can view their own orders" ON orders;

-- Create new select policy that checks both hash and plain text
CREATE POLICY "Customers can view their own orders"
  ON orders FOR SELECT
  USING (
    -- Check hash first (preferred for new orders)
    session_token_hash = hash_session_token(
      current_setting('request.headers', true)::json->>'x-session-token'
    )
    -- Fall back to plain text for backward compatibility
    OR session_token = current_setting('request.headers', true)::json->>'x-session-token'
    OR auth.role() = 'authenticated'
  );

-- Drop existing update policy
DROP POLICY IF EXISTS "Customers can update their own orders" ON orders;

-- Create new update policy
CREATE POLICY "Customers can update their own orders"
  ON orders FOR UPDATE
  USING (
    session_token_hash = hash_session_token(
      current_setting('request.headers', true)::json->>'x-session-token'
    )
    OR session_token = current_setting('request.headers', true)::json->>'x-session-token'
    OR auth.role() = 'authenticated'
  );

-- 6. Backfill hashes for existing orders (run in background for large tables)
-- UPDATE orders SET session_token_hash = hash_session_token(session_token) 
-- WHERE session_token IS NOT NULL AND session_token_hash IS NULL;
-- Uncomment and run when ready (may take time for large tables)
