-- Add fraud detection columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS needs_manual_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fraud_score INTEGER DEFAULT 0;

-- Add index for fraud detection queries
CREATE INDEX IF NOT EXISTS idx_orders_session_token_created 
ON orders(session_token, created_at DESC) 
WHERE auto_verified = true;

CREATE INDEX IF NOT EXISTS idx_orders_manual_review 
ON orders(needs_manual_review) 
WHERE needs_manual_review = true;

-- Comments
COMMENT ON COLUMN orders.needs_manual_review IS 'Flag for orders requiring manual review due to fraud detection';
COMMENT ON COLUMN orders.fraud_score IS 'Fraud risk score (0-100), higher = more suspicious';
