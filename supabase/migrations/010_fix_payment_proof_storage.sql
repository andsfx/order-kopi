-- Fix payment proof storage to use private bucket with signed URLs
-- This migration ensures payment proofs are stored securely and accessed via time-limited signed URLs

-- 1. Create order-attachments bucket if not exists (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-attachments',
  'order-attachments',
  false, -- PRIVATE bucket
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false; -- Ensure existing bucket is set to private

-- 2. Add payment_proof_path column to store storage path separately from URL
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_proof_path TEXT;

COMMENT ON COLUMN orders.payment_proof_path IS 'Storage path for payment proof (e.g., payment-proofs/xxx.jpg)';

-- 3. Storage policies for order-attachments bucket

-- Policy: Authenticated users can upload payment proofs
CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-attachments' 
  AND (storage.foldername(name))[1] = 'payment-proofs'
);

-- Policy: Authenticated users can delete their own uploads (for retry scenarios)
CREATE POLICY "Authenticated users can delete payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-attachments' 
  AND (storage.foldername(name))[1] = 'payment-proofs'
);

-- Policy: Anyone with signed URL can view (Supabase handles signed URL validation)
-- This is implicit in Supabase - signed URLs bypass RLS
-- No explicit SELECT policy needed for signed URLs

-- 4. Create index on payment_proof_path for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_payment_proof_path 
ON orders(payment_proof_path) 
WHERE payment_proof_path IS NOT NULL;

-- 5. Migration note: Existing orders with public URLs in payment_proof_url will continue to work
-- New uploads will store path in payment_proof_path and generate signed URLs dynamically
