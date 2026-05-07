# Kustomisasi

## Ganti Warna Utama (Branding)

Setiap client bisa mengubah warna utama aplikasi sesuai branding toko mereka, langsung dari admin dashboard — **tanpa ubah kode**.

### Cara Ganti Warna

1. Login sebagai admin
2. Buka **Settings → Branding**
3. Pilih salah satu:
   - **8 preset warna** — klik langsung
   - **Custom color** — gunakan color picker atau input hex code manual (contoh: `#6F4E37`)
4. Lihat **preview** di bawah untuk memastikan warna sesuai
5. Klik **Simpan Branding**

### Preset Warna

| Warna | Hex | Cocok Untuk |
|-------|-----|-------------|
| Hijau Tua | `#006041` | Default, kesan natural |
| Coklat Kopi | `#6F4E37` | Coffee shop klasik |
| Navy | `#1E3A5F` | Premium, profesional |
| Merah Maroon | `#800020` | Elegan, hangat |
| Ungu | `#5B2C6F` | Modern, unik |
| Biru | `#1A5276` | Segar, trustworthy |
| Hitam | `#1C1C1C` | Minimalis, luxury |
| Terralogos | `#CC5500` | Hangat, energetic |

### Yang Berubah Otomatis

Saat warna utama diubah, semua elemen berikut ikut berubah secara dinamis:

| Elemen | Contoh |
|--------|--------|
| Tombol utama | "Tambah ke Keranjang", "Konfirmasi Bayar" |
| Harga | Rp 25.000 |
| Badge status | "Menunggu", "Diproses" |
| Link & teks highlight | Nama toko, link navigasi |
| Background accent | Estimasi waktu, info card |
| Shadow | Card elevation dengan warna brand |
| Border focus | Input field focus ring |

### Custom Hex Code

Jika warna preset tidak cocok, input manual hex code:
- Format: `#RRGGBB` (contoh: `#FF6B35`)
- Gunakan [color picker online](https://colorpicker.me) untuk cari hex code
- Pastikan kontras warna cukup terang agar teks putih tetap terbaca

### Developer: Override Manual

Jika perlu override warna secara manual di kode, edit `src/index.css`:

```css
@theme {
  --color-primary: #006041;
  --color-primary-dark: #004D34;
  --color-primary-light: #007A52;
}
```

> **Catatan:** Override manual di CSS akan ditimpa oleh warna yang disimpan di database. Untuk mengubah warna permanen, gunakan admin dashboard.

---

## Ganti Font

1. Edit `index.html`, ganti link Google Fonts
2. Edit `src/index.css`, ganti `--font-sans`

Contoh ganti ke font lain:
```html
<!-- index.html -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```css
/* index.css */
--font-sans: 'Inter', sans-serif;
```

---

## Tambah Menu

Login sebagai admin, buka **Kelola Menu**, klik tombol **"+"** untuk tambah produk baru.

### Field Produk
- **Nama:** Nama produk (contoh: "Cappuccino")
- **Kategori:** Pilih atau buat kategori baru
- **Harga:** Harga dasar (Regular Ice)
- **Harga Large:** Opsional, harga untuk ukuran Large Ice (+Rp 7.000 otomatis ditampilkan)
- **Foto:** Upload gambar produk (WebP recommended)
- **Diskon:** Set diskon % (opsional, harga coret otomatis muncul)

### Opsi Kustomisasi (Otomatis)
Setiap produk minuman otomatis punya opsi:
- **Ukuran Cup:** Regular Ice / Large Ice (+Rp 7.000)
- **Sweetness:** Normal Sweet / Less Sweet
- **Ice Cube:** Normal Ice / Less Ice / More Ice

---

## Tambah Cabang

Login sebagai admin, buka **Kelola Cabang**, tambah cabang baru.

---

## Ganti Logo

Login sebagai admin, buka **Settings → Branding**, upload logo toko.

> Logo akan muncul di header aplikasi.

---

## Ganti QRIS Image

Login sebagai admin, buka **Settings → Branding**, upload gambar QRIS static baru.

---

## Ganti Jam Operasional

Login sebagai admin, buka **Settings**, atur jam buka dan tutup per hari.

> Toko otomatis ditutup di luar jam operasional. Customer tetap bisa lihat menu tapi tidak bisa order.

---

## Setup Telegram Notifikasi

1. Buat bot via [@BotFather](https://t.me/BotFather) di Telegram
2. Dapatkan **Bot Token**
3. Dapatkan **Chat ID** (kirim pesan ke bot, lalu akses `https://api.telegram.org/bot<TOKEN>/getUpdates`)
4. Set secrets di Supabase:
```bash
npx supabase secrets set TELEGRAM_BOT_TOKEN=your-bot-token TELEGRAM_CHAT_ID=your-chat-id
```
5. Deploy edge function:
```bash
npx supabase functions deploy confirm-payment --no-verify-jwt
```

Setelah setup, admin akan mendapat notifikasi Telegram setiap kali pembayaran dikonfirmasi.

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) |
| Icons | Lucide React |
| Font | Plus Jakarta Sans |
| Hosting | Netlify (atau platform lain yang support SPA) |
| PWA | vite-plugin-pwa |
