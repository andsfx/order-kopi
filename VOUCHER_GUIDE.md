
---

## Sistem Voucher & Diskon

Order Kopi mendukung 2 jenis diskon: **Diskon Produk** (per item) dan **Voucher** (per transaksi).

### Diskon Produk

Admin bisa set diskon persentase untuk produk individual.

**Cara Setting:**
1. Login ke Admin → Menu
2. Edit produk → isi field **Diskon (%)**
3. Preview harga diskon muncul otomatis
4. Save → Produk tampil dengan badge diskon di customer

**Tampilan Customer:**
- Badge merah `-20%` di pojok produk
- Harga asli dicoret: ~~Rp 30.000~~
- Harga diskon: **Rp 24.000** (warna hijau)

**Contoh:**
```
Cappuccino Regular
-20%  ← Badge merah
Rp 24.000  ← Harga diskon (hijau)
~~Rp 30.000~~  ← Harga asli (coret)
```

---

### Voucher System

Voucher memberikan diskon tambahan di level transaksi (cart total).

#### Tipe Voucher

**1. Buy 1 Get 1 (BOGO)**
- Beli 2 item → Item termurah gratis
- Beli 4 item → 2 item termurah gratis
- Contoh: Beli Cappuccino (Rp 30.000) + Latte (Rp 25.000) → Latte gratis

**2. Fixed Discount (Rp)**
- Potongan harga tetap dari total belanja
- Contoh: Voucher DISKON10K → Diskon Rp 10.000

**3. Percentage Discount (%)**
- Potongan persentase dari total belanja
- Contoh: Voucher HEMAT20 → Diskon 20%

#### Cara Membuat Voucher (Admin)

1. Login ke Admin → **Voucher**
2. Klik **Tambah Voucher**
3. Isi form:
   - **Kode:** Nama voucher (e.g., BOGO50, DISKON10K)
   - **Tipe:** Pilih BOGO / Fixed Rp / Percentage %
   - **Nilai Diskon:** 
     - BOGO: Kosongkan (otomatis)
     - Fixed: Masukkan nominal (e.g., 10000 untuk Rp 10.000)
     - Percentage: Masukkan angka (e.g., 20 untuk 20%)
   - **Min. Pembelian:** Minimum total belanja (e.g., Rp 50.000)
   - **Limit Penggunaan:** Berapa kali voucher bisa dipakai (e.g., 100)
   - **Periode Valid:** Dari tanggal X sampai Y
4. Klik **Simpan**

**Preview Diskon:**
Form menampilkan preview real-time:
```
Contoh: Total belanja Rp 62.000
Diskon: -Rp 29.000 (BOGO)
Total akhir: Rp 33.000
```

#### Cara Pakai Voucher (Customer)

1. Tambah produk ke keranjang
2. Klik **Lanjut ke Checkout**
3. Di bagian **Punya Voucher?**, masukkan kode (e.g., BOGO50)
4. Klik **Gunakan**
5. Jika valid, diskon langsung muncul:
   ```
   Subtotal:        Rp 62.000
   Diskon (BOGO50): -Rp 29.000
   ─────────────────────────────
   Total:           Rp 33.000
   ```
6. Klik **Buat Pesanan**

#### Validasi Voucher

Voucher otomatis divalidasi:
- ✅ **Expiry:** Voucher harus masih dalam periode valid
- ✅ **Usage Limit:** Voucher belum mencapai batas penggunaan
- ✅ **Min Purchase:** Total belanja harus ≥ minimum pembelian
- ✅ **Active Status:** Voucher harus dalam status aktif

**Error Messages:**
- "Voucher tidak ditemukan" → Kode salah atau voucher dihapus
- "Voucher sudah kadaluarsa" → Melewati tanggal valid_to
- "Voucher sudah habis" → Usage count = usage limit
- "Minimum belanja Rp 50.000" → Total belanja < min_purchase

#### Sample Vouchers

Order Kopi include 3 sample vouchers (valid 30 hari):

| Kode | Tipe | Diskon | Min. Belanja | Limit |
|------|------|--------|--------------|-------|
| **BOGO50** | Buy 1 Get 1 | Item termurah gratis | Rp 50.000 | 100x |
| **DISKON10K** | Fixed | Rp 10.000 | Rp 30.000 | 50x |
| **HEMAT20** | Percentage | 20% | Rp 40.000 | 75x |

#### Tracking Usage

Admin bisa monitor penggunaan voucher:
- Dashboard Voucher menampilkan **45/100 digunakan**
- Klik voucher untuk lihat detail order yang pakai voucher
- Voucher otomatis inactive saat usage_count = usage_limit

#### Technical Details

**Race Condition Prevention:**
- Atomic increment di database level
- Jika 2 user pakai voucher bersamaan, hanya 1 yang berhasil jika limit habis

**Database Schema:**
```sql
vouchers (
  id, code, type, discount_value, 
  min_purchase, usage_limit, usage_count,
  valid_from, valid_to, is_active
)

orders (
  ..., voucher_id, discount_amount
)
```

**Voucher Flow:**
1. Customer input kode → Validasi (expiry, limit, min purchase)
2. Calculate discount (BOGO/Fixed/Percentage)
3. Apply to cart → Show breakdown
4. Checkout → Save voucher_id + discount_amount to order
5. Increment usage_count (atomic)

---

### Kombinasi Diskon Produk + Voucher

Diskon produk dan voucher **bisa digabung**:

**Contoh:**
1. Cappuccino Regular: ~~Rp 30.000~~ → **Rp 24.000** (diskon produk 20%)
2. Latte Regular: ~~Rp 28.000~~ → **Rp 22.400** (diskon produk 20%)
3. Subtotal: Rp 46.400
4. Voucher DISKON10K: -Rp 10.000
5. **Total: Rp 36.400**

Customer dapat **double benefit**: diskon produk + voucher!

---

### Troubleshooting Voucher

#### Voucher tidak bisa digunakan

**Solusi:**
1. Cek periode valid di Admin → Voucher
2. Cek usage limit (mungkin sudah habis)
3. Pastikan total belanja ≥ minimum pembelian
4. Cek status voucher (harus Active)

#### Diskon tidak muncul di keranjang

**Solusi:**
1. Refresh halaman
2. Cek apakah voucher sudah di-apply (ada badge hijau)
3. Cek console browser (F12) untuk error

#### Usage count tidak bertambah

**Solusi:**
1. Cek apakah order berhasil dibuat
2. Cek database: `select * from orders where voucher_id is not null`
3. Cek Edge Function logs untuk error

---
