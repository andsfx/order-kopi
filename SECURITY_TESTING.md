# Security Testing Guide - Session Token Implementation

## Overview
This guide helps you verify that the session token security implementation is working correctly.

## Prerequisites
1. Database migration has been run (`supabase/migrations/001_add_session_token.sql`)
2. Frontend code has been updated with session token integration
3. Application is running locally or deployed

---

## Test 1: Session Token Generation

**Goal:** Verify that each customer gets a unique session token

**Steps:**
1. Open browser DevTools (F12) → Console tab
2. Run: `localStorage.getItem('order_session_token')`
3. Expected: Should return a UUID string (e.g., `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`)
4. Run: `localStorage.getItem('order_session_expiry')`
5. Expected: Should return a timestamp (e.g., `"1714752000000"`)

**Pass Criteria:** ✅ Both values exist and are valid

---

## Test 2: Order Ownership Isolation

**Goal:** Verify that customers can only access their own orders

**Steps:**
1. **Create Order A:**
   - Place an order (e.g., "Customer A")
   - Note the Order ID (e.g., `ORD-0001`)
   - Note the session token: `localStorage.getItem('order_session_token')`

2. **Simulate Different Customer:**
   - Open DevTools → Console
   - Run: `localStorage.setItem('order_session_token', 'fake-token-12345')`
   - Try to access Order A: Navigate to `/order/ORD-0001`

3. **Expected Result:**
   - Order should NOT be found
   - Page should show "Pesanan Tidak Ditemukan"

4. **Restore Original Token:**
   - Run: `localStorage.setItem('order_session_token', '<original-token>')`
   - Refresh page
   - Order should now be visible ✅

**Pass Criteria:** ✅ Order is only accessible with correct session token

---

## Test 3: Prevent Unauthorized Order Updates

**Goal:** Verify that customers cannot update other people's orders

**Steps:**
1. **Create Order B:**
   - Place another order (e.g., "Customer B")
   - Note Order ID (e.g., `ORD-0002`)

2. **Try to Update Order B with Wrong Token:**
   - Open DevTools → Console
   - Run:
   ```javascript
   const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
   const supabase = createClient(
     'YOUR_SUPABASE_URL',
     'YOUR_SUPABASE_ANON_KEY'
   );
   
   // Try to cancel Order B with fake token
   localStorage.setItem('order_session_token', 'fake-token-99999');
   const { data, error } = await supabase
     .from('orders')
     .update({ status: 'cancelled' })
     .eq('id', 'ORD-0002');
   
   console.log('Error:', error);
   console.log('Data:', data);
   ```

3. **Expected Result:**
   - `error` should be present (permission denied)
   - `data` should be `null` or empty
   - Order status should NOT change

**Pass Criteria:** ✅ Update fails with permission error

---

## Test 4: Admin Can Access All Orders

**Goal:** Verify that authenticated admin can access all orders

**Steps:**
1. Login as admin (`/login`)
2. Navigate to Admin Dashboard (`/admin`)
3. Expected: Should see ALL orders, regardless of session token

**Pass Criteria:** ✅ Admin sees all orders

---

## Test 5: Rate Limiting

**Goal:** Verify that rate limiting prevents spam orders

**Steps:**
1. **Check Initial Status:**
   - Open DevTools → Console
   - Run:
   ```javascript
   const { getRateLimitStatus } = await import('/src/lib/rateLimit.js');
   console.log(getRateLimitStatus());
   ```
   - Expected: `{ count: 0, remaining: 5, resetAt: <timestamp> }`

2. **Place 5 Orders Rapidly:**
   - Place 5 orders in quick succession
   - Each should succeed

3. **Try 6th Order:**
   - Attempt to place another order
   - Expected: Error message "Terlalu banyak pesanan. Silakan coba lagi dalam X menit."

4. **Reset Rate Limit (for testing):**
   ```javascript
   const { resetRateLimit } = await import('/src/lib/rateLimit.js');
   resetRateLimit();
   ```

**Pass Criteria:** ✅ 6th order is blocked with rate limit error

---

## Test 6: Token Expiry

**Goal:** Verify that expired tokens are automatically refreshed

**Steps:**
1. **Set Token to Expire Soon:**
   - Open DevTools → Console
   - Run:
   ```javascript
   const now = Date.now();
   const expiry = now + 5000; // Expire in 5 seconds
   localStorage.setItem('order_session_expiry', expiry.toString());
   ```

2. **Wait 6 Seconds**

3. **Place New Order:**
   - Order should succeed
   - Check token: `localStorage.getItem('order_session_token')`
   - Expected: New token generated (different from before)

**Pass Criteria:** ✅ New token is generated after expiry

---

## Test 7: Cross-Browser Isolation

**Goal:** Verify that orders are isolated per browser/device

**Steps:**
1. **Browser A:**
   - Place order (e.g., `ORD-0003`)
   - Note session token

2. **Browser B (or Incognito):**
   - Try to access `ORD-0003`
   - Expected: "Pesanan Tidak Ditemukan"

3. **Browser B:**
   - Place own order (e.g., `ORD-0004`)
   - Should only see `ORD-0004`, not `ORD-0003`

**Pass Criteria:** ✅ Orders are isolated per browser

---

## Test 8: Cancel Order Security

**Goal:** Verify that only order owner can cancel

**Steps:**
1. **Create Order C:**
   - Place order with status `pending_payment`
   - Note Order ID (e.g., `ORD-0005`)

2. **Try to Cancel with Wrong Token:**
   - Open DevTools → Console
   - Run:
   ```javascript
   localStorage.setItem('order_session_token', 'wrong-token');
   ```
   - Navigate to `/order/ORD-0005`
   - Click "Batalkan Pesanan"

3. **Expected Result:**
   - Cancel should fail
   - Alert: "Gagal membatalkan pesanan"

4. **Restore Correct Token:**
   - Set correct token
   - Refresh page
   - Click "Batalkan Pesanan"
   - Expected: Cancel succeeds ✅

**Pass Criteria:** ✅ Cancel only works with correct token

---

## Test 9: Database RLS Policy Verification

**Goal:** Verify RLS policies are active in Supabase

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Run:
```sql
-- Check if session_token column exists
select column_name, data_type 
from information_schema.columns 
where table_name = 'orders' and column_name = 'session_token';

-- Check RLS policies
select policyname, cmd, qual 
from pg_policies 
where tablename = 'orders';
```

3. **Expected Policies:**
   - `Anyone can create orders` (INSERT)
   - `Customers can view their own orders` (SELECT)
   - `Customers can update their own orders` (UPDATE)
   - `Authenticated users can delete orders` (DELETE)

**Pass Criteria:** ✅ All policies exist and are correct

---

## Test 10: Performance Test

**Goal:** Verify that session token doesn't impact performance

**Steps:**
1. Open DevTools → Network tab
2. Place an order
3. Check request to `/rest/v1/orders`:
   - Should complete in <500ms
   - No additional round trips for token validation

**Pass Criteria:** ✅ No performance degradation

---

## Common Issues & Solutions

### Issue 1: "Permission denied" on all operations
**Cause:** RLS policies not applied correctly
**Solution:** Re-run migration SQL in Supabase SQL Editor

### Issue 2: Orders visible across browsers
**Cause:** Session token not being sent with requests
**Solution:** Verify `getSessionToken()` is called in OrderContext

### Issue 3: Rate limit not working
**Cause:** localStorage blocked or disabled
**Solution:** Check browser privacy settings, enable localStorage

### Issue 4: Token not persisting
**Cause:** localStorage quota exceeded
**Solution:** Clear old data: `localStorage.clear()`

---

## Security Checklist

Before deploying to production, verify:

- [ ] Migration SQL has been run in production Supabase
- [ ] All tests above pass
- [ ] Session tokens are unique per customer
- [ ] Orders are isolated (cannot access other's orders)
- [ ] Rate limiting prevents spam
- [ ] Admin can access all orders
- [ ] Tokens expire after 24 hours
- [ ] Cancel order requires correct token
- [ ] RLS policies are active in database
- [ ] No performance degradation

---

## Rollback Plan

If issues are found in production:

1. **Immediate:** Run rollback SQL from migration file
2. **Restore old policies:** (TEMPORARY - still insecure)
```sql
drop policy if exists "Customers can view their own orders" on orders;
drop policy if exists "Customers can update their own orders" on orders;
create policy "Anyone can view orders" on orders for select using (true);
create policy "Anyone can update orders" on orders for update using (true);
```
3. **Investigate:** Check logs, test locally
4. **Fix:** Apply corrected migration
5. **Re-deploy:** Test again before enabling

---

## Support

If you encounter issues during testing:
1. Check browser console for errors
2. Verify Supabase connection
3. Review migration SQL execution logs
4. Test with fresh browser session (incognito)
