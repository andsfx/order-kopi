# Work Plan: Migrate from Cashi.id to QRIS Static with Unique Code Verification

## TL;DR
- **Current Problem**: Cashi.id fees = 3-5% per transaction (~Rp 2M/month for 1000 orders)
- **Solution**: QRIS Static with unique 3-digit code verification
- **Cost Savings**: Rp 2M/month → Rp 0 (100% savings)
- **Implementation Time**: 4-5 hours
- **Auto-verification Rate**: Target 80%+

---

## Executive Summary

### Current State
- Using Cashi.id dynamic QRIS payment gateway
- Transaction fees: 3-5% per order
- Monthly cost for 1000 orders: ~Rp 2,000,000
- Auto-confirmation via webhook
- Edge Functions: create-cashi-payment, cashi-webhook

### Target State
- QRIS Static image (uploaded by admin)
- Unique 3-digit code per order (e.g., Rp 50,123 for Rp 50,000 order)
- Customer uploads payment proof
- Auto-verification based on amount matching
- Manual verification fallback for admin
- Zero transaction fees

### Business Impact
- **Cost Reduction**: Rp 24M/year savings
- **Operational**: Slight increase in manual verification workload (20% of orders)
- **Customer Experience**: Minimal change (still QRIS-based)
- **Risk**: Low (can revert to Cashi.id if needed)

---

## Context & Background

### Why Migrate?
1. **Cost**: Cashi.id fees are unsustainable at scale
2. **Control**: Own the payment flow end-to-end
3. **Simplicity**: Static QRIS is simpler than dynamic QRIS
4. **Flexibility**: Can switch QRIS providers anytime

### How Unique Code Works
1. Order total: Rp 50,000
2. System generates random 3-digit code: 123
3. Customer pays: Rp 50,123
4. Customer uploads payment proof (screenshot)
5. System extracts amount from proof
6. If amount matches (50,123), auto-approve
7. If not, admin manually verifies

### Technical Architecture

`
Customer Order
    ↓
Generate unique 3-digit code (100-999)
    ↓
Display QRIS + Instructions (Pay Rp XX,XXX)
    ↓
Customer scans QRIS & pays exact amount
    ↓
Customer uploads payment proof (screenshot)
    ↓
System extracts amount from image (OCR or manual input)
    ↓
Auto-verify if amount matches
    ↓
Admin manually verifies if auto-verification fails
`

---

## Work Objectives

### Core Objective
Replace Cashi.id dynamic QRIS with QRIS Static payment system featuring automatic verification via unique 3-digit code matching.

### Success Criteria
- [ ] Zero transaction fees
- [ ] Auto-verification works for 80%+ of orders
- [ ] Admin can upload/update QRIS image easily
- [ ] Customer experience remains smooth
- [ ] All Cashi.id code completely removed
- [ ] System is production-ready with tests

### Non-Goals
- OCR implementation (Phase 2 - customer manually enters amount for now)
- Multi-QRIS support (single QRIS for now)
- Payment gateway integration (pure static QRIS)

---

## Detailed Implementation Plan

### Phase 1: Database Schema Updates (30 min)

#### 1.1 Add Columns to orders Table

```sql
-- Migration: 007_add_qris_static_fields.sql

-- Add unique code and payment proof fields to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unique_code VARCHAR(3);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_amount_entered INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_verified BOOLEAN DEFAULT FALSE;

-- Create index for unique code lookups
CREATE INDEX IF NOT EXISTS idx_orders_unique_code ON orders(unique_code);

-- Add check constraint for unique code (3 digits)
ALTER TABLE orders ADD CONSTRAINT chk_unique_code_format 
  CHECK (unique_code IS NULL OR unique_code ~ '^[0-9]{3}$');
```

#### 1.2 Create settings Table for QRIS Management

```sql
-- Create settings table if not exists
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read settings (for QRIS display)
CREATE POLICY "Anyone can read settings"
  ON settings FOR SELECT USING (TRUE);

-- Policy: Only authenticated users can manage settings
CREATE POLICY "Authenticated users can manage settings"
  ON settings FOR ALL USING (auth.role() = 'authenticated');

-- Insert default QRIS setting
INSERT INTO settings (key, value) 
VALUES ('qris_image_url', '')
ON CONFLICT (key) DO NOTHING;
```

#### 1.3 Update Audit Log for Payment Verification

```sql
-- Add new event types to audit_logs
-- (Assuming audit_logs table already exists from 002_add_audit_logging.sql)

-- No schema changes needed, just document new event types:
-- - 'payment_proof_uploaded'
-- - 'payment_auto_verified'
-- - 'payment_manually_verified'
-- - 'payment_verification_failed'
```

---

### Phase 2: Admin QRIS Management (1 hour)

#### 2.1 Update AdminSettings.jsx

**Features to Add:**
- QRIS image upload section
- Preview uploaded QRIS
- Delete/replace QRIS functionality
- Save QRIS URL to settings table

**UI Mockup:**
```
┌─────────────────────────────────────┐
│ QRIS Static Management              │
├─────────────────────────────────────┤
│ Current QRIS:                       │
│ [QRIS Image Preview]                │
│                                     │
│ [Upload New QRIS] [Delete]          │
│                                     │
│ ℹ️ Recommended: 500x500px, max 2MB  │
└─────────────────────────────────────┘
```

**Code Changes:**

```jsx
// Add to AdminSettings.jsx

// State
const [qrisUrl, setQrisUrl] = useState(settings.qris_image_url || '');
const [uploadingQris, setUploadingQris] = useState(false);

// Upload handler
async function handleUploadQris(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    addToast('File harus berupa gambar', 'error');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    addToast('Ukuran file maksimal 2MB', 'error');
    return;
  }

  setUploadingQris(true);
  const fileName = qris-.;

  const { error } = await supabase.storage
    .from('store-assets')
    .upload(fileName, file, { upsert: true });

  if (error) {
    addToast('Gagal upload QRIS', 'error');
    setUploadingQris(false);
    return;
  }

  const { data: urlData } = supabase.storage
    .from('store-assets')
    .getPublicUrl(fileName);

  await updateSetting('qris_image_url', urlData.publicUrl);
  setQrisUrl(urlData.publicUrl);
  setUploadingQris(false);
  addToast('QRIS berhasil diupload');
}

// Delete handler
async function handleDeleteQris() {
  if (!confirm('Hapus QRIS? Customer tidak bisa bayar sampai QRIS baru diupload.')) return;
  
  await updateSetting('qris_image_url', '');
  setQrisUrl('');
  addToast('QRIS dihapus');
}
```

#### 2.2 Supabase Storage Setup

```bash
# Create storage bucket for store assets (if not exists)
# Run in Supabase SQL Editor:

INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

# Set storage policy
CREATE POLICY "Anyone can view store assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'store-assets');

CREATE POLICY "Authenticated users can upload store assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'store-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete store assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'store-assets' AND auth.role() = 'authenticated');
```

---

### Phase 3: Unique Code Generation (30 min)

#### 3.1 Create Utility Function

**File:** src/lib/uniqueCode.js

```javascript
/**
 * Generate a unique 3-digit code for order verification
 * @returns {string} 3-digit code (100-999)
 */
export function generateUniqueCode() {
  return String(Math.floor(Math.random() * 900) + 100);
}

/**
 * Calculate total amount with unique code
 * @param {number} orderTotal - Original order total
 * @param {string} uniqueCode - 3-digit unique code
 * @returns {number} Total with unique code appended
 */
export function calculateTotalWithCode(orderTotal, uniqueCode) {
  return orderTotal * 1000 + parseInt(uniqueCode);
}

/**
 * Extract unique code from payment amount
 * @param {number} paymentAmount - Amount paid by customer
 * @returns {string} Extracted 3-digit code
 */
export function extractUniqueCode(paymentAmount) {
  return String(paymentAmount % 1000).padStart(3, '0');
}

/**
 * Verify if payment amount matches order
 * @param {number} orderTotal - Original order total
 * @param {string} uniqueCode - Expected unique code
 * @param {number} paymentAmount - Amount paid by customer
 * @returns {boolean} True if matches
 */
export function verifyPaymentAmount(orderTotal, uniqueCode, paymentAmount) {
  const expectedAmount = calculateTotalWithCode(orderTotal, uniqueCode);
  return paymentAmount === expectedAmount;
}
```

#### 3.2 Update Order Creation Logic

**File:** src/pages/Checkout.jsx (or wherever orders are created)

```jsx
import { generateUniqueCode } from '../lib/uniqueCode';

// When creating order
async function handleCreateOrder() {
  const uniqueCode = generateUniqueCode();
  
  const { data, error } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      customer_name: customerName,
      total: orderTotal,
      unique_code: uniqueCode,
      payment_method: 'qris',
      status: 'pending_payment',
      // ... other fields
    })
    .select()
    .single();
    
  if (error) {
    addToast('Gagal membuat order', 'error');
    return;
  }
  
  // Redirect to order status page
  navigate(/order/);
}
```

---

### Phase 4: Customer Payment Flow (1.5 hours)

#### 4.1 Update OrderStatus.jsx

**Features to Add:**
- Display QRIS static image
- Show payment instructions with unique code
- Calculate and display total with unique code
- Payment proof upload form
- Amount input field (manual entry for now)
- Submit button with loading state

**UI Mockup:**

```
┌──────────────────────────────────────┐
│ Order #ORD-0001                      │
│ Status: Menunggu Pembayaran          │
├──────────────────────────────────────┤
│ Total: Rp 50,000                     │
│ Kode Unik: 123                       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ BAYAR TEPAT: Rp 50,123               │
├──────────────────────────────────────┤
│ [QRIS Image]                         │
│                                      │
│ Cara Bayar:                          │
│ 1. Scan QRIS di atas                 │
│ 2. Masukkan nominal: Rp 50,123       │
│ 3. Bayar & screenshot bukti          │
│ 4. Upload bukti di bawah             │
├──────────────────────────────────────┤
│ Upload Bukti Pembayaran:             │
│ [Choose File] [Preview]              │
│                                      │
│ Nominal yang dibayar:                │
│ [Rp 50,123]                          │
│                                      │
│ [Submit Bukti Pembayaran]            │
└──────────────────────────────────────┘
```

**Code Changes:**

```jsx
// OrderStatus.jsx

import { useState, useEffect } from 'react';
import { calculateTotalWithCode } from '../lib/uniqueCode';

export default function OrderStatus() {
  const [order, setOrder] = useState(null);
  const [qrisUrl, setQrisUrl] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [amountEntered, setAmountEntered] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchOrder();
    fetchQrisUrl();
  }, []);

  async function fetchQrisUrl() {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'qris_image_url')
      .single();
    
    setQrisUrl(data?.value || '');
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    
    // Pre-fill amount with expected amount
    const expectedAmount = calculateTotalWithCode(order.total, order.unique_code);
    setAmountEntered(String(expectedAmount));
  }

  async function handleSubmitProof() {
    if (!proofFile) {
      addToast('Pilih file bukti pembayaran', 'error');
      return;
    }
    if (!amountEntered) {
      addToast('Masukkan nominal yang dibayar', 'error');
      return;
    }

    setUploading(true);

    // Upload proof to storage
    const fileName = payment-proof--.;
    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(fileName, proofFile);

    if (uploadError) {
      addToast('Gagal upload bukti', 'error');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('payment-proofs')
      .getPublicUrl(fileName);

    // Update order with proof and amount
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_proof_url: urlData.publicUrl,
        payment_amount_entered: parseInt(amountEntered),
        status: 'verifying', // New status for pending verification
      })
      .eq('id', order.id);

    if (updateError) {
      addToast('Gagal submit bukti', 'error');
      setUploading(false);
      return;
    }

    // Call auto-verification function
    await supabase.functions.invoke('verify-payment', {
      body: { order_id: order.id }
    });

    setUploading(false);
    addToast('Bukti pembayaran berhasil diupload');
    fetchOrder(); // Refresh order status
  }

  const totalWithCode = order ? calculateTotalWithCode(order.total, order.unique_code) : 0;

  return (
    <div>
      {/* ... existing order details ... */}
      
      {order?.status === 'pending_payment' && (
        <div className="payment-section">
          <div className="total-display">
            <p>Total: Rp {order.total.toLocaleString()}</p>
            <p>Kode Unik: {order.unique_code}</p>
            <h2>BAYAR TEPAT: Rp {totalWithCode.toLocaleString()}</h2>
          </div>

          {qrisUrl && (
            <img src={qrisUrl} alt="QRIS" className="qris-image" />
          )}

          <div className="instructions">
            <h3>Cara Bayar:</h3>
            <ol>
              <li>Scan QRIS di atas</li>
              <li>Masukkan nominal: Rp {totalWithCode.toLocaleString()}</li>
              <li>Bayar & screenshot bukti</li>
              <li>Upload bukti di bawah</li>
            </ol>
          </div>

          <div className="proof-upload">
            <label>
              Upload Bukti Pembayaran:
              <input type="file" accept="image/*" onChange={handleFileChange} />
            </label>

            {proofPreview && (
              <img src={proofPreview} alt="Preview" className="proof-preview" />
            )}

            <label>
              Nominal yang dibayar:
              <input
                type="number"
                value={amountEntered}
                onChange={(e) => setAmountEntered(e.target.value)}
                placeholder={totalWithCode}
              />
            </label>

            <button onClick={handleSubmitProof} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Submit Bukti Pembayaran'}
            </button>
          </div>
        </div>
      )}

      {order?.status === 'verifying' && (
        <div className="verifying-status">
          <p>⏳ Bukti pembayaran sedang diverifikasi...</p>
          <p>Anda akan menerima notifikasi setelah pembayaran dikonfirmasi.</p>
        </div>
      )}
    </div>
  );
}
```

#### 4.2 Create Storage Bucket for Payment Proofs

```sql
-- Run in Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can upload payment proofs
CREATE POLICY "Anyone can upload payment proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs');

-- Policy: Authenticated users can view payment proofs
CREATE POLICY "Authenticated users can view payment proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');
```

---

### Phase 5: Auto-Verification Edge Function (1 hour)

#### 5.1 Create erify-payment Edge Function

**File:** supabase/functions/verify-payment/index.ts

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const { order_id } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (fetchError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Calculate expected amount
    const expectedAmount = order.total * 1000 + parseInt(order.unique_code);

    // Check if payment amount matches
    const isMatch = order.payment_amount_entered === expectedAmount;

    if (isMatch) {
      // Auto-verify
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          auto_verified: true,
        })
        .eq('id', order_id);

      // Log audit
      await supabase.from('audit_logs').insert({
        event_type: 'payment_auto_verified',
        order_id: order_id,
        metadata: {
          expected_amount: expectedAmount,
          actual_amount: order.payment_amount_entered,
        },
      });

      return new Response(
        JSON.stringify({ success: true, auto_verified: true }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      // Mark for manual verification
      await supabase
        .from('orders')
        .update({ status: 'verifying' })
        .eq('id', order_id);

      // Log audit
      await supabase.from('audit_logs').insert({
        event_type: 'payment_verification_pending',
        order_id: order_id,
        metadata: {
          expected_amount: expectedAmount,
          actual_amount: order.payment_amount_entered,
          mismatch: true,
        },
      });

      return new Response(
        JSON.stringify({ success: true, auto_verified: false, requires_manual: true }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

#### 5.2 Deploy Edge Function

```bash
npx supabase functions deploy verify-payment --no-verify-jwt
```

---

### Phase 6: Admin Verification Panel (1 hour)

#### 6.1 Create AdminPaymentVerification.jsx

**Features:**
- List orders with status 'verifying'
- Show payment proof image
- Show expected vs actual amount
- Approve/reject buttons
- Auto-verified indicator

**UI Mockup:**

```
┌────────────────────────────────────────────────┐
│ Verifikasi Pembayaran                          │
├────────────────────────────────────────────────┤
│ Order #ORD-0001 | John Doe | Rp 50,123         │
│ Expected: Rp 50,123 | Entered: Rp 50,123 ✅    │
│ [View Proof] [Approve] [Reject]                │
├────────────────────────────────────────────────┤
│ Order #ORD-0002 | Jane Doe | Rp 75,456         │
│ Expected: Rp 75,456 | Entered: Rp 75,000 ❌    │
│ [View Proof] [Approve] [Reject]                │
└────────────────────────────────────────────────┘
```

**Code:**

```jsx
// AdminPaymentVerification.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { calculateTotalWithCode, verifyPaymentAmount } from '../lib/uniqueCode';

export default function AdminPaymentVerification() {
  const [orders, setOrders] = useState([]);
  const [selectedProof, setSelectedProof] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPendingOrders();
    
    // Subscribe to realtime updates
    const subscription = supabase
      .channel('orders-verification')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: 'status=eq.verifying'
      }, fetchPendingOrders)
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  async function fetchPendingOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'verifying')
      .order('created_at', { ascending: false });

    setOrders(data || []);
  }

  async function handleApprove(orderId) {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    await supabase.from('audit_logs').insert({
      event_type: 'payment_manually_verified',
      order_id: orderId,
      user_id: user.id,
    });

    setLoading(false);
    fetchPendingOrders();
    addToast('Pembayaran disetujui');
  }

  async function handleReject(orderId) {
    if (!confirm('Tolak pembayaran ini?')) return;
    
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from('orders')
      .update({
        status: 'pending_payment',
        payment_proof_url: null,
        payment_amount_entered: null,
      })
      .eq('id', orderId);

    await supabase.from('audit_logs').insert({
      event_type: 'payment_verification_rejected',
      order_id: orderId,
      user_id: user.id,
    });

    setLoading(false);
    fetchPendingOrders();
    addToast('Pembayaran ditolak');
  }

  return (
    <div className="admin-verification">
      <h1>Verifikasi Pembayaran</h1>
      
      {orders.length === 0 && (
        <p>Tidak ada pembayaran yang perlu diverifikasi</p>
      )}

      {orders.map((order) => {
        const expectedAmount = calculateTotalWithCode(order.total, order.unique_code);
        const isMatch = order.payment_amount_entered === expectedAmount;

        return (
          <div key={order.id} className="verification-card">
            <div className="order-info">
              <h3>Order #{order.id}</h3>
              <p>{order.customer_name}</p>
              <p>Total: Rp {order.total.toLocaleString()}</p>
              <p>Kode Unik: {order.unique_code}</p>
            </div>

            <div className="amount-comparison">
              <p>Expected: Rp {expectedAmount.toLocaleString()}</p>
              <p>Entered: Rp {order.payment_amount_entered?.toLocaleString()}</p>
              {isMatch ? <span className="match">✅ Match</span> : <span className="mismatch">❌ Mismatch</span>}
            </div>

            <div className="actions">
              <button onClick={() => setSelectedProof(order.payment_proof_url)}>
                View Proof
              </button>
              <button onClick={() => handleApprove(order.id)} disabled={loading}>
                Approve
              </button>
              <button onClick={() => handleReject(order.id)} disabled={loading}>
                Reject
              </button>
            </div>
          </div>
        );
      })}

      {selectedProof && (
        <div className="proof-modal" onClick={() => setSelectedProof(null)}>
          <img src={selectedProof} alt="Payment Proof" />
        </div>
      )}
    </div>
  );
}
```

#### 6.2 Add Route to Admin Panel

```jsx
// App.jsx or router config

import AdminPaymentVerification from './pages/AdminPaymentVerification';

// Add route
<Route path="/admin/verification" element={<AdminPaymentVerification />} />
```

#### 6.3 Add Navigation Link

```jsx
// Admin.jsx or AdminNav component

<Link to="/admin/verification">
  Verifikasi Pembayaran
  {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
</Link>
```

---

### Phase 7: Remove Cashi.id Integration (30 min)

#### 7.1 Delete Edge Functions

```bash
# Delete Cashi.id Edge Functions
npx supabase functions delete create-cashi-payment
npx supabase functions delete cashi-webhook
```

#### 7.2 Remove Frontend Code

**Files to Update:**
- src/pages/Checkout.jsx - Remove Cashi.id payment creation logic
- src/pages/OrderStatus.jsx - Remove Cashi.id QRIS display logic
- src/lib/supabase.js - Remove Cashi.id function calls

**Search & Remove:**
```bash
# Search for Cashi.id references
grep -r "cashi" src/
grep -r "create-cashi-payment" src/
grep -r "cashi-webhook" src/
```

#### 7.3 Clean Up Environment Variables

**File:** .env

```bash
# Remove these lines:
# VITE_CASHI_API_KEY=xxx
# VITE_CASHI_WEBHOOK_SECRET=xxx
```

**Supabase Secrets:**
```bash
# Remove secrets (optional, can keep for rollback)
npx supabase secrets unset CASHI_API_KEY
npx supabase secrets unset CASHI_WEBHOOK_SECRET
```

#### 7.4 Update Documentation

**Files to Update:**
- CASHI_INTEGRATION.md - Mark as deprecated or delete
- README.md - Update payment section
- DEPLOY_CASHI_MANUAL.md - Delete

**Create New Documentation:**
- QRIS_STATIC_GUIDE.md - Document new QRIS Static system

---

### Phase 8: Testing & Deployment (30 min)

#### 8.1 Unit Tests

**File:** src/lib/uniqueCode.test.js

```javascript
import { describe, it, expect } from 'vitest';
import {
  generateUniqueCode,
  calculateTotalWithCode,
  extractUniqueCode,
  verifyPaymentAmount,
} from './uniqueCode';

describe('uniqueCode', () => {
  it('generates 3-digit code', () => {
    const code = generateUniqueCode();
    expect(code).toMatch(/^[0-9]{3}$/);
    expect(parseInt(code)).toBeGreaterThanOrEqual(100);
    expect(parseInt(code)).toBeLessThanOrEqual(999);
  });

  it('calculates total with code', () => {
    expect(calculateTotalWithCode(50000, '123')).toBe(50123);
    expect(calculateTotalWithCode(75000, '456')).toBe(75456);
  });

  it('extracts unique code from payment', () => {
    expect(extractUniqueCode(50123)).toBe('123');
    expect(extractUniqueCode(75456)).toBe('456');
  });

  it('verifies payment amount', () => {
    expect(verifyPaymentAmount(50000, '123', 50123)).toBe(true);
    expect(verifyPaymentAmount(50000, '123', 50000)).toBe(false);
  });
});
```

#### 8.2 Integration Tests

**Test Scenarios:**
1. ✅ Admin uploads QRIS image
2. ✅ Customer creates order with unique code
3. ✅ Customer uploads payment proof
4. ✅ Auto-verification succeeds (amount matches)
5. ✅ Auto-verification fails (amount mismatch)
6. ✅ Admin manually approves payment
7. ✅ Admin manually rejects payment

#### 8.3 Manual Testing Checklist

- [ ] Upload QRIS in admin settings
- [ ] Create test order
- [ ] Verify unique code is generated
- [ ] Verify total with code is displayed correctly
- [ ] Upload payment proof
- [ ] Enter correct amount → auto-verify
- [ ] Enter wrong amount → manual verification
- [ ] Admin approves payment
- [ ] Admin rejects payment
- [ ] Check audit logs

#### 8.4 Deployment Steps

```bash
# 1. Run database migration
npx supabase db push

# 2. Deploy Edge Function
npx supabase functions deploy verify-payment --no-verify-jwt

# 3. Build frontend
npm run build

# 4. Deploy to production (Netlify/Vercel)
npm run deploy

# 5. Verify production
# - Upload QRIS
# - Create test order
# - Test payment flow
```

---

## Database Schema Reference

### Updated orders Table

```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  table_number INT,
  note TEXT,
  total INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  payment_method TEXT NOT NULL DEFAULT 'qris',
  branch_id BIGINT,
  payment_id TEXT,
  payment_url TEXT,
  paid_at TIMESTAMPTZ,
  session_token TEXT,
  voucher_id BIGINT,
  discount_amount INT DEFAULT 0,
  
  -- NEW FIELDS
  unique_code VARCHAR(3),
  payment_proof_url TEXT,
  payment_amount_entered INT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  auto_verified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### New settings Table

```sql
CREATE TABLE settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);
```

---

## API Endpoints

### Edge Functions

#### 1. erify-payment
**Endpoint:** POST /functions/v1/verify-payment

**Request:**
```json
{
  "order_id": "ORD-0001"
}
```

**Response (Auto-verified):**
```json
{
  "success": true,
  "auto_verified": true
}
```

**Response (Manual verification required):**
```json
{
  "success": true,
  "auto_verified": false,
  "requires_manual": true
}
```

---

## UI/UX Flow Diagrams

### Customer Payment Flow

```
1. Customer places order
   ↓
2. System generates unique 3-digit code (e.g., 123)
   ↓
3. Display QRIS + Instructions
   - Total: Rp 50,000
   - Kode Unik: 123
   - BAYAR TEPAT: Rp 50,123
   ↓
4. Customer scans QRIS
   ↓
5. Customer enters Rp 50,123 in payment app
   ↓
6. Customer pays & takes screenshot
   ↓
7. Customer uploads screenshot
   ↓
8. Customer enters amount paid (Rp 50,123)
   ↓
9. System auto-verifies
   ↓
10a. If match → Order status = 'paid' ✅
10b. If mismatch → Order status = 'verifying' ⏳
   ↓
11. Admin manually verifies (if needed)
```

### Admin Verification Flow

```
1. Admin opens Verification Panel
   ↓
2. See list of orders with status 'verifying'
   ↓
3. For each order:
   - View payment proof
   - Compare expected vs actual amount
   - Approve or Reject
   ↓
4a. Approve → Order status = 'paid'
4b. Reject → Order status = 'pending_payment'
```

---

## Risk Assessment & Mitigation

### Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Customer enters wrong amount | Medium | High (20%) | Clear instructions, pre-filled amount |
| Payment proof upload fails | High | Low (5%) | Retry mechanism, error handling |
| Admin overwhelmed with manual verifications | Medium | Medium (15%) | Improve auto-verification accuracy |
| QRIS image not uploaded | High | Low (1%) | Validation, admin reminder |
| Customer confusion with unique code | Medium | Medium (10%) | Clear UI, examples, help text |

### Rollback Plan

If QRIS Static fails:
1. Re-enable Cashi.id Edge Functions
2. Revert frontend to Cashi.id flow
3. Keep QRIS Static code for future retry
4. Estimated rollback time: 30 minutes

---

## Success Metrics

### KPIs to Track

1. **Cost Savings**
   - Target: Rp 2M/month → Rp 0
   - Measure: Monthly transaction fees

2. **Auto-Verification Rate**
   - Target: 80%+
   - Measure: (Auto-verified orders / Total orders) * 100

3. **Manual Verification Time**
   - Target: < 5 minutes per order
   - Measure: Average time from upload to approval

4. **Customer Satisfaction**
   - Target: No increase in complaints
   - Measure: Customer feedback, support tickets

5. **Order Completion Rate**
   - Target: No decrease
   - Measure: (Paid orders / Total orders) * 100

---

## Post-Launch Monitoring

### Week 1
- [ ] Monitor auto-verification rate daily
- [ ] Track manual verification workload
- [ ] Collect customer feedback
- [ ] Fix critical bugs immediately

### Week 2-4
- [ ] Analyze success metrics
- [ ] Optimize auto-verification logic
- [ ] Improve UI based on feedback
- [ ] Document lessons learned

### Month 2+
- [ ] Consider OCR implementation (Phase 2)
- [ ] Add multi-QRIS support (Phase 3)
- [ ] Explore other payment methods (Phase 4)

---

## Phase 2 Ideas (Future)

### OCR Integration
- Use Tesseract.js or Google Vision API
- Auto-extract amount from payment proof
- Reduce manual entry errors

### Multi-QRIS Support
- Support multiple QRIS (different banks)
- Customer chooses preferred QRIS
- Admin manages multiple QRIS images

### Payment Reminders
- Send WhatsApp reminder after 10 minutes
- Auto-cancel after 30 minutes
- Re-order functionality

---

## Appendix

### A. File Structure

```
order-kopi/
├── src/
│   ├── lib/
│   │   ├── uniqueCode.js (NEW)
│   │   └── uniqueCode.test.js (NEW)
│   ├── pages/
│   │   ├── AdminSettings.jsx (UPDATED)
│   │   ├── AdminPaymentVerification.jsx (NEW)
│   │   ├── Checkout.jsx (UPDATED)
│   │   └── OrderStatus.jsx (UPDATED)
├── supabase/
│   ├── functions/
│   │   ├── verify-payment/ (NEW)
│   │   ├── create-cashi-payment/ (DELETE)
│   │   └── cashi-webhook/ (DELETE)
│   ├── migrations/
│   │   └── 007_add_qris_static_fields.sql (NEW)
├── QRIS_STATIC_GUIDE.md (NEW)
└── CASHI_INTEGRATION.md (DEPRECATED)
```

### B. Environment Variables

**Before:**
```bash
VITE_SUPABASE_URL=xxx
VITE_SUPABASE_ANON_KEY=xxx
VITE_CASHI_API_KEY=xxx
VITE_CASHI_WEBHOOK_SECRET=xxx
```

**After:**
```bash
VITE_SUPABASE_URL=xxx
VITE_SUPABASE_ANON_KEY=xxx
# Cashi.id variables removed
```

### C. Supabase Storage Buckets

1. **store-assets** (public)
   - QRIS images
   - Store logos
   - Other branding assets

2. **payment-proofs** (private)
   - Customer payment screenshots
   - Only accessible by authenticated users

### D. Audit Log Event Types

**New Events:**
- payment_proof_uploaded
- payment_auto_verified
- payment_manually_verified
- payment_verification_rejected
- payment_verification_failed

---

## Conclusion

This migration will save Rp 24M/year while maintaining a smooth customer experience. The unique code system is simple, effective, and requires minimal manual intervention (target 80% auto-verification).

**Estimated Timeline:**
- Development: 4-5 hours
- Testing: 1 hour
- Deployment: 30 minutes
- **Total: 6 hours**

**Next Steps:**
1. Review this plan with team
2. Get approval from stakeholders
3. Schedule implementation window
4. Execute migration
5. Monitor for 1 week
6. Iterate based on feedback

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-06  
**Author:** Order Kopi Team  
**Status:** Ready for Implementation
