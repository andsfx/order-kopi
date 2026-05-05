# 🚀 Manual Deployment Guide - Cashi.id Integration

**Project:** Order Kopi  
**Supabase Project ID:** kmmxfqqpoipeqdcvtljv  
**Region:** Singapore (ap-southeast-1)

---

## ⚠️ Prerequisites

Kamu perlu:
1. Akses ke Supabase Dashboard (https://supabase.com/dashboard)
2. Login dengan akun yang punya akses ke project `kmmxfqqpoipeqdcvtljv`

---

## 📋 Step-by-Step Deployment

### **Step 1: Set Environment Variables**

1. Buka https://supabase.com/dashboard/project/kmmxfqqpoipeqdcvtljv
2. Klik **Settings** (sidebar kiri bawah)
3. Klik **Edge Functions**
4. Scroll ke **Secrets**
5. Add 2 secrets:

```
Name: CASHI_API_KEY
Value: your_cashi_api_key_here
```

```
Name: CASHI_WEBHOOK_SECRET
Value: your_cashi_webhook_secret_here
```

6. Click **Save** untuk masing-masing

---

### **Step 2: Deploy Edge Functions via Dashboard**

#### **Function 1: create-cashi-payment**

1. Buka https://supabase.com/dashboard/project/kmmxfqqpoipeqdcvtljv/functions
2. Click **Create a new function**
3. Function name: `create-cashi-payment`
4. Copy-paste code dari: `supabase/functions/create-cashi-payment/index.ts`
5. **Uncheck** "Verify JWT" (karena dipanggil dari frontend)
6. Click **Deploy function**

#### **Function 2: cashi-webhook**

1. Masih di halaman Functions
2. Click **Create a new function**
3. Function name: `cashi-webhook`
4. Copy-paste code dari: `supabase/functions/cashi-webhook/index.ts`
5. **Uncheck** "Verify JWT" (karena dipanggil dari Cashi.id)
6. Click **Deploy function**

---

### **Step 3: Get Webhook URL**

Setelah deploy, kamu akan dapat URL:

```
https://kmmxfqqpoipeqdcvtljv.supabase.co/functions/v1/create-cashi-payment
https://kmmxfqqpoipeqdcvtljv.supabase.co/functions/v1/cashi-webhook
```

---

### **Step 4: Setup Webhook di Cashi.id**

1. Login ke https://cashi.id/dashboard
2. Buka **Settings** atau **Webhooks**
3. Add new webhook:
   - **URL:** `https://kmmxfqqpoipeqdcvtljv.supabase.co/functions/v1/cashi-webhook`
   - **Events:** Select `payment.success` atau `payment.paid`
   - **Secret:** `your_cashi_webhook_secret_here` (same as CASHI_WEBHOOK_SECRET)
4. Click **Save**

---

### **Step 5: Test Payment Flow**

1. Buka app: https://order-kopi-app.netlify.app
2. Order kopi
3. Pilih **QRIS** sebagai payment method
4. Click **Buat Pesanan**
5. Halaman Order Status akan muncul dengan QRIS dynamic dari Cashi.id
6. Scan QRIS dengan GoPay/OVO/DANA
7. Bayar
8. Order otomatis jadi "paid" dalam 1-2 detik! ✅

---

## 🔍 Troubleshooting

### **Issue: Function deployment gagal**

**Solusi:**
- Pastikan code di-copy lengkap (tidak ada yang terpotong)
- Check syntax error di editor
- Pastikan "Verify JWT" di-uncheck

### **Issue: QRIS tidak muncul**

**Solusi:**
1. Check browser console (F12) untuk error
2. Verify Edge Function `create-cashi-payment` sudah deployed
3. Check Supabase Logs:
   - Dashboard → Edge Functions → Logs
   - Cari error di `create-cashi-payment`

### **Issue: Payment tidak auto-confirm**

**Solusi:**
1. Verify webhook URL sudah di-setup di Cashi.id
2. Check Supabase Logs untuk `cashi-webhook`
3. Pastikan webhook secret benar
4. Test webhook dengan Cashi.id webhook tester

---

## 📊 Monitoring

### **Check Edge Function Logs:**

1. Buka https://supabase.com/dashboard/project/kmmxfqqpoipeqdcvtljv/functions
2. Click function name (create-cashi-payment atau cashi-webhook)
3. Tab **Logs**
4. Filter by time range
5. Look for errors (red) atau success (green)

### **Check Database:**

```sql
-- Check orders dengan payment_id dari Cashi
SELECT id, payment_id, payment_url, status, paid_at 
FROM orders 
WHERE payment_method = 'qris' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check audit logs untuk payment confirmation
SELECT * FROM audit_logs 
WHERE action = 'STATUS_CHANGE' 
AND field_name = 'status' 
AND new_value = 'paid'
ORDER BY created_at DESC 
LIMIT 10;
```

---

## ✅ Verification Checklist

Setelah deploy, verify:

- [ ] Environment variables (CASHI_API_KEY, CASHI_WEBHOOK_SECRET) sudah di-set
- [ ] Function `create-cashi-payment` deployed & accessible
- [ ] Function `cashi-webhook` deployed & accessible
- [ ] Webhook URL registered di Cashi.id dashboard
- [ ] Test order dengan QRIS berhasil
- [ ] Dynamic QRIS muncul di OrderStatus page
- [ ] Payment auto-confirm setelah bayar
- [ ] Audit log mencatat payment confirmation
- [ ] Cash payment masih works

---

## 🎯 Expected Results

**Before (Static QRIS):**
- Admin upload QRIS manual
- Customer scan static QRIS
- Admin check GoPay app
- Admin click "Konfirmasi Bayar"
- Order jadi "paid"

**After (Cashi.id Dynamic):**
- Customer order → Dynamic QRIS auto-generated
- Customer scan & bayar
- Webhook auto-confirm
- Order jadi "paid" (NO MANUAL STEP!) ✅

---

## 📞 Support

Kalau ada issue:
1. Check Supabase Logs first
2. Check browser console (F12)
3. Verify webhook di Cashi.id dashboard
4. Check database untuk payment_id & payment_url

---

**Good luck with deployment!** 🚀
