# UI/UX Design Prompt — Order Kopi

## Project Overview

**Order Kopi** adalah aplikasi pemesanan kopi online mobile-first untuk coffee shop. Customer bisa browse menu, customisasi minuman, checkout dengan QRIS, dan track pesanan real-time. Admin punya dashboard untuk manage pesanan, menu, voucher, dan laporan penjualan.

---

## Design System

### Brand Personality
- **Tone:** Hangat, ramah, modern tapi tidak kaku — seperti kedai kopi neighborhood yang nyaman
- **Vibe:** Clean minimal dengan sentuhan organic (rounded corners, soft shadows, warm colors)
- **Audience:** Coffee shop customer (18-40 tahun, urban), barista/admin toko

### Color System

Warna utama bisa diganti per-client (dynamic branding). Default:

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#006041` | Tombol utama, harga, link, badge, accent |
| `primary-dark` | `#004D34` | Hover state, tebal |
| `primary-light` | `#007A52` | Active state |
| `surface` | `#FFFFFF` | Background utama |
| `surface-secondary` | `#F7FAF9` | Background input, section alt |
| `surface-accent` | `#E7F0EE` | Background highlight card |
| `text-primary` | `#373737` | Judul, teks penting |
| `text-secondary` | `#6B7280` | Subtitle, label |
| `text-muted` | `#9CA3AF` | Placeholder, hint |
| `border` | `#E5E7EB` | Border default |
| `border-light` | `#F3F4F6` | Divider subtle |
| `success` | `#059669` | Konfirmasi, status positif |
| `error` | `#DC2626` | Error, danger, cancel |
| `warning` | `#D97706` | Peringatan |

**Dynamic Color Rule:** Saat primary berubah, `primary-dark` (-8% lightness), `primary-light` (+8% lightness), `surface-accent` (primary hue, desaturated +55% lightness), dan `shadow-float` (primary hue, 15% alpha) otomatis dihitung dari HSL.

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Page Title | Plus Jakarta Sans | 20px | Bold (700) |
| Section Title | Plus Jakarta Sans | 14px | Semibold (600) |
| Body Text | Plus Jakarta Sans | 14px | Medium (500) |
| Caption/Label | Plus Jakarta Sans | 12px | Medium (500) |
| Small/Muted | Plus Jakarta Sans | 11px | Regular (400) |
| Price | Plus Jakarta Sans | 14px | Bold (700) |
| Big Price | Plus Jakarta Sans | 24px | Bold (700) |

### Spacing & Layout

- **Max width:** `max-w-lg` (512px) untuk customer pages, `max-w-4xl` (896px) untuk admin
- **Page padding:** `px-4` (16px) horizontal
- **Card padding:** `p-4` atau `p-5` (16-20px)
- **Card gap:** `gap-3` atau `gap-4` (12-16px)
- **Section gap:** `mt-4` (16px) antar section

### Border Radius

| Element | Radius | Tailwind |
|---------|--------|----------|
| Card/Section | 16px | `rounded-2xl` |
| Button | 12px | `rounded-xl` |
| Pill Button | 999px | `rounded-full` |
| Badge | 999px | `rounded-full` |
| Input | 12px | `rounded-xl` |
| Drawer handle | 999px | `rounded-full` |
| Product image | 0 (inside card) | — |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-card` | `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)` | Card default |
| `shadow-elevated` | `0 4px 12px rgba(0,0,0,0.08)` | Card hover |
| `shadow-float` | `0 8px 24px rgba(primary, 0.15)` | Floating cart, modal |

### Icon System

- **Library:** Lucide React
- **Size scale:** 12px (badge), 14px (inline/button), 16px (label), 18px (header), 20px (section icon), 24px (loading)
- **Style:** Outline, 1.5px stroke, consistent with Tailwind aesthetic

---

## Component Patterns

### Cards
```
White background, rounded-2xl, shadow-card, p-5
Hover: shadow-elevated, -translate-y-0.5 (subtle lift)
Active: scale-[0.97] (press feedback)
```

### Buttons

| Type | Style |
|------|-------|
| **Primary** | `bg-primary text-white rounded-xl px-4 py-2.5 font-semibold` |
| **Primary Pill** | `bg-primary text-white rounded-full px-6 py-2.5 font-semibold` |
| **Secondary** | `bg-surface-secondary text-text-secondary rounded-xl px-4 py-2.5` |
| **Danger** | `bg-red-500 text-white rounded-xl px-3 py-2` |
| **Ghost** | `bg-primary/10 text-primary rounded-full w-8 h-8` (icon button) |

**Interaction:** `active:scale-[0.98]` atau `active:scale-95` pada semua button

### Input Fields
```
bg-surface-secondary rounded-xl px-4 py-2.5 text-sm
border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/20
placeholder:text-text-muted
```

### Status Badges
```
rounded-full text-xs font-semibold px-3 py-1
Contoh warna:
- pending_payment: bg-amber-100 text-amber-700
- paid/preparing: bg-blue-100 text-blue-700
- ready: bg-emerald-100 text-emerald-700
- done: bg-gray-100 text-gray-600
- cancelled: bg-red-100 text-red-600
```

### Toast Notifications
```
Fixed top-right, rounded-xl shadow-lg
Success: bg-emerald-600 text-white with CheckCircle icon
Error: bg-red-500 text-white with AlertCircle icon
Auto-dismiss 3 detik, slide-up animation
```

### Bottom Sheet / Drawer
```
Fixed bottom, rounded-t-[28px], max-h-[85vh]
Drag handle: w-10 h-1 rounded-full bg-border, centered
Backdrop: bg-black/50
Animation: slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1)
```

### Floating Cart Button
```
Fixed bottom-5 left-5 right-5, max-w-lg mx-auto
bg-primary text-white rounded-2xl px-5 py-4
shadow-[0_8px_32px_rgba(primary,0.25)]
Active: scale-[0.98]
Slide-up animation saat muncul
```

---

## Page Layouts

### Customer — Menu (Home)
```
┌─────────────────────────┐
│ 🏪 Store Name    🔍 🔔  │ ← Sticky header
├─────────────────────────┤
│ 🏷️ Promo Banner (scroll)│
├─────────────────────────┤
│ Semua | Coffee | Non-... │ ← Horizontal tab filter
├─────────────────────────┤
│ ┌────┐ ┌────┐           │
│ │ 📷 │ │ 📷 │           │ ← Product grid (2 cols)
│ │Name │ │Name │           │    square image, name,
│ │Rp25k│ │Rp30k│           │    price, + button
│ └────┘ └────┘           │
│ ┌────┐ ┌────┐           │
│ │    │ │    │           │
│ └────┘ └────┘           │
├─────────────────────────┤
│ 🛒 3 item    Rp 75.000  │ ← Floating cart bar
└─────────────────────────┘
```

### Customer — Product Detail (Bottom Sheet)
```
┌─────────────────────────┐
│     ─── (drag handle)    │
│ ┌─────────────────────┐ │
│ │                     │ │ ← Product image (large)
│ │       📷            │ │
│ └─────────────────────┘ │
│ Cappuccino              │ ← Product name (bold)
│ Espresso dengan susu... │ ← Description (muted)
│                         │
│ ── Diskon -20% ──       │ ← Discount badge
│ Rp 29.000  Rp 23.200    │ ← Original + discounted price
│                         │
│ Ukuran Cup              │
│ [Regular Ice] [Large +7K]│ ← Option selector (pill buttons)
│                         │
│ Sweetness               │
│ [Normal Sweet] [Less]   │
│                         │
│ Ice Cube                │
│ [Normal] [Less] [More]  │
│                         │
│ ┌─────────────────────┐ │
│ │  + Tambah ke Keranjang│ │ ← Full-width primary button
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Customer — Order Status
```
┌─────────────────────────┐
│ ← Status Pesanan        │ ← Sticky header
├─────────────────────────┤
│       ORD-0001          │ ← Order ID (large, primary color)
│   7 Mei 2026, 10:30     │
├─────────────────────────┤
│ Scan QRIS untuk Bayar   │
│                         │
│     ┌───────────┐       │
│     │  📷 QRIS  │       │ ← QRIS image (224x224px)
│     └───────────┘       │
│                         │
│ Total yang harus dibayar│
│     Rp 50.123           │ ← Big price, primary color
│  Termasuk kode unik 123 │ ← Subtitle
├─────────────────────────┤
│ 💳 → ⏳ → ☕ → ✅ → 🎉  │ ← Status stepper (horizontal)
│ Bayar  Tunggu Buat Siap  │
├─────────────────────────┤
│ Info Pelanggan          │
│ Nama    John            │
├─────────────────────────┤
│ Item Pesanan            │
│ Cappuccino ×1      29k  │
│ Regular Ice · Normal ·  │ ← Options line
│                         │
│ Total  Rp 50.123        │ ← amountToPay + kode unik
├─────────────────────────┤
│ 📤 Share via WhatsApp   │
└─────────────────────────┘
```

### Admin — Dashboard
```
┌─────────────────────────────────────────┐
│ ☰  Order Kopi Admin          🚪 Logout │ ← Sidebar header
├──────────┬──────────────────────────────┤
│ 📋 Pesanan│                              │
│ 🍽️ Menu   │  [Semua] [Bayar] [Proses]..│ ← Status filter tabs
│ 🏷️ Voucher│                              │
│ 📊 Laporan│  ┌──────────────────────┐   │
│ 📢 Promo  │  │ ORD-0001      💳 Bayar│   │ ← Order card
│ 🏪 Cabang │  │ John   10:30         │   │
│ ⚙️ Setting │  │ Cappuccino ×1  29k  │   │
│           │  │ Latte ×2      60k    │   │
│           │  │ Rp 89.000            │   │
│           │  │ [Batalkan] [Konfirmasi]│   │
│           │  └──────────────────────┘   │
└──────────┴──────────────────────────────┘
```

### Admin — Settings (Branding)
```
┌─────────────────────────┐
│ ← Pengaturan            │
├─────────────────────────┤
│ 🎨 Branding             │
│                         │
│ Nama Toko               │
│ [Order Kopi          ]  │
│                         │
│ Warna Utama             │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐│
│ │ 🟢│ │ 🟤│ │ 🔵│ │ 🔴││ ← 8 preset color swatches
│ └───┘ └───┘ └───┘ └───┘│    in 4-column grid
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐│
│ │ 🟣│ │ 🔷│ │ ⚫│ │ 🟠││
│ └───┘ └───┘ └───┘ └───┘│
│                         │
│ [🎨] [#006041       ]   │ ← Color picker + hex input
│                         │
│ Preview:                │
│ [Tombol Utama] Rp 25k  │ ← Live preview
│                         │
│ [    Simpan Branding  ] │
├─────────────────────────┤
│ Logo / QRIS / WhatsApp  │
│ Password / Reset / Info │
└─────────────────────────┘
```

---

## Animation & Motion

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Page transition | fade-in + translateY(8px) | 250ms | ease-out |
| Card list stagger | translateY(12px) + fade | 300ms | ease-out, 50ms delay per card |
| Bottom sheet | translateY(100%) → 0 | 300ms | cubic-bezier(0.32, 0.72, 0, 1) |
| Toast | slide-up from bottom | 300ms | cubic-bezier(0.32, 0.72, 0, 1) |
| Button press | scale(0.98) | 150ms | transition-transform |
| Cart count | scale(1) → 1.15 → 1 | 250ms | ease-out |
| Skeleton loading | shimmer gradient | 1500ms | infinite |

**Reduced motion:** `prefers-reduced-motion: reduce` → all animations 0.01ms

---

## Interaction Patterns

### Product Selection Flow
1. Tap product card → bottom sheet slides up
2. Select options (Ukuran Cup, Sweetness, Ice Cube) → pill buttons, one active per group
3. Tap "Tambah ke Keranjang" → toast confirmation, sheet closes
4. Floating cart bar appears with count + total

### Checkout Flow
1. Tap floating cart → cart drawer slides up from bottom
2. Review items, adjust qty (±), apply voucher
3. Tap "Lanjut ke Checkout" → checkout page
4. Fill customer name, note, select branch, payment method (QRIS/Cash)
5. Tap "Buat Pesanan" → order created → redirect to OrderStatus

### Payment Flow
1. OrderStatus shows QRIS image + amount to pay (with unique code)
2. Customer scans QRIS, pays exact amount
3. Upload payment proof (photo)
4. Auto-verification or admin manual confirm
5. Status stepper updates in real-time

### Admin Order Management
1. Dashboard shows orders grouped by status tabs
2. Tap "Konfirmasi Bayar" on pending order → payment confirmed
3. Tap status arrow → advance to next status (preparing → ready → done)
4. WhatsApp notification sent on confirm

---

## Responsive Strategy

| Breakpoint | Layout |
|------------|--------|
| < 640px (mobile) | Single column, bottom sheet, floating cart |
| 640-768px | Same as mobile, slightly more spacing |
| 768px+ | Admin sidebar visible, wider cards |
| 1024px+ | Admin: sidebar + main content, max-w-4xl |

**Mobile-first:** All customer-facing pages designed for 375px width. Admin dashboard responsive with collapsible sidebar.

---

## Accessibility

- All interactive elements have `role` and `aria-label`
- Keyboard navigation: Tab through cards, Enter/Space to activate
- Focus visible: `focus-visible:ring-2 focus-visible:ring-primary/30`
- Color contrast: primary on white meets WCAG AA
- Reduced motion support
- Touch targets minimum 44x44px (buttons min h-8 w-8 with padding)

---

## Dark Mode

Currently not supported. Color system is light-only. If implementing dark mode in the future, all surface/text colors need dark counterparts.

---

## File Structure Reference

```
src/
├── components/
│   ├── ProductCard.jsx      → Menu item card (image, name, price, +)
│   ├── CartDrawer.jsx       → Bottom sheet cart
│   ├── FloatingCart.jsx     → Sticky bottom cart bar
│   ├── Toast.jsx            → Notification toasts
│   ├── PaymentProofUpload.jsx → Photo upload with camera access
│   ├── ErrorBoundary.jsx    → Full-screen error fallback
│   └── ...
├── pages/
│   ├── Home.jsx             → Menu + category filter + search
│   ├── Checkout.jsx         → Customer info + order summary
│   ├── OrderStatus.jsx      → QRIS + status stepper + items
│   ├── Login.jsx            → Admin login
│   ├── Admin.jsx            → Order dashboard
│   ├── AdminMenu.jsx        → Product CRUD
│   ├── AdminVoucher.jsx     → Voucher CRUD
│   ├── AdminSettings.jsx    → Branding (color picker!) + config
│   └── ...
└── index.css                → Design tokens (CSS variables)
```
