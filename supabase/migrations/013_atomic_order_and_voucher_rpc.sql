-- ============================================
-- MIGRATION: Atomic order creation RPC
-- ============================================
-- Replaces the multi-step client-side order creation with
-- a single atomic database function that handles:
-- - Generate order ID
-- - Insert order with all fields
-- - Insert order items
-- - Increment voucher usage
-- - All in one transaction
--
-- Date: 2026-05-07
-- ============================================

CREATE OR REPLACE FUNCTION create_order_atomic(
  p_customer_name TEXT,
  p_total INT,
  p_unique_code TEXT,
  p_amount_to_pay INT,
  p_session_token TEXT,
  p_items JSONB,
  p_note TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'qris',
  p_branch_id BIGINT DEFAULT NULL,
  p_voucher_id BIGINT DEFAULT NULL,
  p_discount_amount INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_order_id TEXT;
  v_item JSONB;
  v_items_to_insert JSONB := '[]'::JSONB;
BEGIN
  -- 1. Generate order ID atomically
  UPDATE order_counter
  SET last_number = last_number + 1
  WHERE id = 1
  RETURNING 'ORD-' || lpad(last_number::text, 4, '0') INTO v_order_id;

  -- 2. Insert order
  INSERT INTO orders (
    id, customer_name, note, total, unique_code, amount_to_pay,
    status, payment_method, branch_id, session_token,
    voucher_id, discount_amount
  ) VALUES (
    v_order_id, p_customer_name, p_note, p_total, p_unique_code, p_amount_to_pay,
    'pending_payment', p_payment_method, p_branch_id, p_session_token,
    p_voucher_id, p_discount_amount
  );

  -- 3. Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, product_id, product_name, qty, size, temp, sugar, price_at_order
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::bigint,
      v_item->>'product_name',
      (v_item->>'qty')::int,
      v_item->>'size',
      v_item->>'temp',
      v_item->>'sugar',
      (v_item->>'price_at_order')::int
    );
  END LOOP;

  -- 4. Voucher usage already incremented by validate_and_use_voucher RPC

  -- Return order data
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'status', 'pending_payment',
    'total', p_total,
    'amount_to_pay', p_amount_to_pay,
    'unique_code', p_unique_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION create_order_atomic(
  TEXT, INT, TEXT, INT, TEXT, JSONB, TEXT, TEXT, BIGINT, BIGINT, INT
) TO anon;
GRANT EXECUTE ON FUNCTION create_order_atomic(
  TEXT, INT, TEXT, INT, TEXT, JSONB, TEXT, TEXT, BIGINT, BIGINT, INT
) TO authenticated;

-- ============================================
-- ALSO: Atomic voucher validate + increment
-- ============================================

CREATE OR REPLACE FUNCTION validate_and_use_voucher(
  p_code TEXT,
  p_cart_total INT,
  p_session_token TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_voucher RECORD;
  v_discount INT;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Find voucher by code (case-insensitive)
  SELECT * INTO v_voucher
  FROM vouchers
  WHERE code ILIKE p_code
  AND is_active = true
  LIMIT 1;

  IF NOT found THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Kode voucher tidak ditemukan');
  END IF;

  -- Check validity period
  IF v_now < v_voucher.valid_from THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Voucher belum berlaku');
  END IF;

  IF v_now > v_voucher.valid_to THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Voucher sudah kadaluarsa');
  END IF;

  -- Check usage limit
  IF v_voucher.usage_count >= v_voucher.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Voucher sudah habis digunakan');
  END IF;

  -- Check minimum purchase
  IF p_cart_total < v_voucher.min_purchase THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Minimum pembelian Rp ' || v_voucher.min_purchase::text);
  END IF;

  -- Calculate discount
  CASE v_voucher.type
    WHEN 'fixed' THEN
      v_discount := LEAST(v_voucher.discount_value, p_cart_total);
    WHEN 'percentage' THEN
      v_discount := ROUND(p_cart_total * v_voucher.discount_value / 100);
    WHEN 'bogo' THEN
      v_discount := 0; -- BOGO discount calculated client-side based on cart items
    ELSE
      v_discount := 0;
  END CASE;

  -- Atomically increment usage (with check)
  UPDATE vouchers
  SET usage_count = usage_count + 1
  WHERE id = v_voucher.id
  AND usage_count < usage_limit;

  IF NOT found THEN
    -- Race condition: someone else used it between our check and increment
    RETURN jsonb_build_object('valid', false, 'error', 'Voucher sudah habis digunakan');
  END IF;

  -- Return voucher data with discount
  RETURN jsonb_build_object(
    'valid', true,
    'error', NULL,
    'voucher', jsonb_build_object(
      'id', v_voucher.id,
      'code', v_voucher.code,
      'type', v_voucher.type,
      'discount_value', v_voucher.discount_value,
      'min_purchase', v_voucher.min_purchase,
      'discount_amount', v_discount
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_and_use_voucher(TEXT, INT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_and_use_voucher(TEXT, INT, TEXT) TO authenticated;
