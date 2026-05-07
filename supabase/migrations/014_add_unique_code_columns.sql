-- Add unique_code and amount_to_pay columns to orders table
-- These are needed for QRIS static payment verification

ALTER TABLE orders ADD COLUMN IF NOT EXISTS unique_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_to_pay INTEGER;

COMMENT ON COLUMN orders.unique_code IS '4-digit unique code for QRIS payment verification';
COMMENT ON COLUMN orders.amount_to_pay IS 'Total amount customer must pay (total + unique_code)';

-- Backfill existing orders where possible
UPDATE orders SET 
  unique_code = SUBSTRING(id FROM 4 FOR 4),
  amount_to_pay = total
WHERE unique_code IS NULL AND amount_to_pay IS NULL;
