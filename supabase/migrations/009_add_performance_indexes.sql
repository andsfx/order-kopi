-- Migration: Add Performance Indexes for QRIS Static
-- Created: 2026-05-06
-- Purpose: Optimize query performance for order verification and analytics

-- ============================================================================
-- INDEX 1: Pending Verification Orders
-- ============================================================================
-- Optimizes queries that fetch orders awaiting manual verification
-- Used by: Admin dashboard, verification queue
CREATE INDEX IF NOT EXISTS idx_orders_pending_verification 
ON orders(status, created_at) 
WHERE status = 'pending_verification';

COMMENT ON INDEX idx_orders_pending_verification IS 
'Partial index for pending verification queue - filters by status and sorts by creation time';

-- ============================================================================
-- INDEX 2: Unique Code Lookups
-- ============================================================================
-- Optimizes unique code verification queries (daily scope)
-- Used by: Auto-verification system, payment matching
CREATE INDEX IF NOT EXISTS idx_orders_unique_code_date 
ON orders(unique_code, DATE(created_at));

COMMENT ON INDEX idx_orders_unique_code_date IS 
'Composite index for unique code lookups within date range - prevents cross-day collisions';

-- ============================================================================
-- INDEX 3: Auto-Verified Orders Analytics
-- ============================================================================
-- Optimizes analytics queries for auto-verification success rate
-- Used by: Analytics dashboard, reporting
CREATE INDEX IF NOT EXISTS idx_orders_auto_verified 
ON orders(auto_verified, verified_at) 
WHERE auto_verified = true;

COMMENT ON INDEX idx_orders_auto_verified IS 
'Partial index for auto-verified orders - tracks verification timestamps for analytics';

-- ============================================================================
-- INDEX 4: Fraud Detection Queries
-- ============================================================================
-- Optimizes fraud detection queries (duplicate customer checks)
-- Used by: Fraud detection system, customer verification
CREATE INDEX IF NOT EXISTS idx_orders_customer_verification 
ON orders(customer_name, phone, auto_verified, created_at);

COMMENT ON INDEX idx_orders_customer_verification IS 
'Composite index for fraud detection - identifies suspicious patterns by customer identity';

-- ============================================================================
-- INDEX 5: Payment Proof Status
-- ============================================================================
-- Optimizes queries for orders with uploaded payment proofs
-- Used by: Auto-cancel function, verification workflow
CREATE INDEX IF NOT EXISTS idx_orders_payment_proof_status 
ON orders(status, payment_proof_url, created_at)
WHERE payment_proof_url IS NOT NULL;

COMMENT ON INDEX idx_orders_payment_proof_status IS 
'Partial index for orders with payment proof - prevents auto-cancellation of submitted proofs';

-- ============================================================================
-- ANALYZE TABLES
-- ============================================================================
-- Update table statistics for query planner optimization
ANALYZE orders;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify index creation and usage

-- Check all indexes on orders table
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'orders';

-- Check index sizes
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   pg_size_pretty(pg_relation_size(indexrelid)) as index_size
-- FROM pg_stat_user_indexes
-- WHERE tablename = 'orders'
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- Test query performance (pending verification)
-- EXPLAIN ANALYZE
-- SELECT * FROM orders 
-- WHERE status = 'pending_verification' 
-- ORDER BY created_at DESC 
-- LIMIT 50;

-- Test query performance (unique code lookup)
-- EXPLAIN ANALYZE
-- SELECT * FROM orders 
-- WHERE unique_code = '123' 
-- AND DATE(created_at) = CURRENT_DATE;
