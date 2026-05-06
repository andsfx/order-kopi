-- Add columns for QRIS Static payment with 4-digit unique codes
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS unique_code VARCHAR(4),
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS payment_amount_entered INTEGER,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_verified BOOLEAN DEFAULT false;

-- CRITICAL: Add unique constraint to prevent collisions
-- Unique code must be unique within same day
CREATE UNIQUE INDEX idx_orders_unique_code_date 
ON orders(unique_code, DATE(created_at))
WHERE unique_code IS NOT NULL;

-- Performance indexes
CREATE INDEX idx_orders_pending_verification 
ON orders(status) 
WHERE status = 'pending_verification';

CREATE INDEX idx_orders_auto_verified 
ON orders(auto_verified) 
WHERE auto_verified = true;

-- Add check constraint for 4-digit codes (1000-9999)
ALTER TABLE orders 
ADD CONSTRAINT check_unique_code_format 
CHECK (unique_code ~ '^[1-9][0-9]{3}$');

-- Comments
COMMENT ON COLUMN orders.unique_code IS '4-digit verification code (1000-9999) for payment matching';
COMMENT ON COLUMN orders.payment_proof_url IS 'URL to uploaded payment proof image';
COMMENT ON COLUMN orders.payment_amount_entered IS 'Amount entered by customer (total + unique_code)';
COMMENT ON COLUMN orders.verified_by IS 'Admin who verified the payment';
COMMENT ON COLUMN orders.verified_at IS 'Timestamp when payment was verified';
COMMENT ON COLUMN orders.auto_verified IS 'Whether payment was auto-verified by system';
