# Order Kopi — Feature Improvement Plan

> Last updated: 2026-05-07
> Status: Planning

---

## Overview

Plan ini berisi fitur-fitur improvement yang diidentifikasi dari audit komprehensif
(database schema, frontend UX, edge functions) dan riset kompetitor
(Kopi Kenangan, Starbucks, Joe Coffee, Roast Rewards).

Prioritas diurutkan berdasarkan **impact terhadap revenue & retention**.

---

## Sprint 1: Retention & Loyalty (Week 1)

**Goal:** Ubah app dari transactional → retention-focused

### 1.1 Loyalty Points & Tier System

**Problem:** Customer order, bayar, pergi. Zero retention mechanism.

**Spec:**
- Tabel baru: `loyalty_accounts` (id, session_token, points, tier, total_spent, created_at, updated_at)
- Tabel baru: `point_transactions` (id, account_id, order_id, points_earned, points_spent, source, created_at)
- Tier system:
  - Bronze (0 pts): 1x multiplier, points expire 6 bulan
  - Silver (200 pts): 1.5x multiplier, 1 free size upgrade/bulan
  - Gold (600 pts): 2x multiplier, free customization/bulan
  - Obsidian (2000 pts): 3x multiplier, early access new items
- Poin earned = floor(order_total / 1000) * tier_multiplier
- Display points balance & tier di homepage (badge icon)
- Display points earned di checkout confirmation

**Files to create/modify:**
- `supabase/migrations/015_add_loyalty_system.sql`
- `src/lib/LoyaltyContext.jsx` — context provider
- `src/components/LoyaltyBadge.jsx` — tier badge di header
- `src/components/LoyaltyBanner.jsx` — points earned notification
- `src/pages/Home.jsx` — add loyalty section
- `src/pages/Checkout.jsx` — show points preview

**Effort:** 3-4 hari

---

### 1.2 Quick Reorder

**Problem:** 15-20% peningkatan frekuensi order dari repeat customers. Sekarang harus browse menu ulang setiap kali.

**Spec:**
- Tabel baru: `order_templates` (id, session_token, items_json, label, last_used_at, created_at)
- "Order Lagi" section di homepage — tampil 3 order terakhir
- 1-tap reorder: langsung add semua item ke cart
- Jika product sudah unavailable, skip & show warning
- Cart drawer: "Order dari riwayat" button

**Files to create/modify:**
- `supabase/migrations/016_add_order_templates.sql`
- `src/components/QuickReorder.jsx` — horizontal scroll section
- `src/pages/Home.jsx` — add QuickReorder section
- `src/lib/OrderContext.jsx` — add reorder function

**Effort:** 1-2 hari

---

### 1.3 Per-Customer Voucher Limit

**Problem:** 1 session token bisa pakai voucher berkali-kali selama usage_count < usage_limit.

**Spec:**
- Tabel baru: `voucher_redemptions` (id, voucher_id, session_token, order_id, created_at)
- UNIQUE constraint on (voucher_id, session_token) — 1 voucher per customer
- Update `validate_and_use_voucher` RPC: check voucher_redemptions sebelum increment
- Update `create_order_atomic` RPC: log redemption setelah order created
- Frontend: show "Sudah digunakan" badge jika customer sudah pakai voucher

**Files to create/modify:**
- `supabase/migrations/017_add_voucher_redemptions.sql`
- `supabase/migrations/013_atomic_order_and_voucher_rpc.sql` — update function
- `src/lib/useVoucher.js` — handle "already used" response

**Effort:** 0.5 hari

---

## Sprint 2: Operations & Convenience (Week 2)

**Goal:** Tingkatkan operational efficiency & customer convenience

### 2.1 Pre-Order / Scheduled Pickup

**Problem:** Gak bisa order untuk pickup nanti. Miss market office worker.

**Spec:**
- Add column: `orders.scheduled_at TIMESTAMPTZ DEFAULT NULL`
- Add column: `orders.is_preorder BOOLEAN DEFAULT FALSE`
- Checkout flow: toggle "Ambil nanti" → time picker (minimum 30 menit dari sekarang, max 7 hari)
- Admin dashboard: tab "Pre-Order" terpisah dengan scheduled time
- Telegram notif: include scheduled_at di message
- Auto-cancel: extended timeout untuk pre-order (60 menit setelah scheduled_at, bukan created_at)

**Files to create/modify:**
- `supabase/migrations/018_add_preorder.sql`
- `src/pages/Checkout.jsx` — add time picker
- `src/lib/OrderContext.jsx` — pass scheduled_at
- `src/pages/Admin.jsx` — pre-order tab
- `supabase/functions/auto-cancel/index.ts` — update timeout logic
- `supabase/functions/_shared/telegram.ts` — include scheduled info

**Effort:** 2-3 hari

---

### 2.2 Stock / Inventory Management

**Problem:** No stock tracking. Products sold out tapi masih muncul di menu. Manual toggle is_available.

**Spec:**
- Add column: `products.stock_quantity INT DEFAULT NULL` (NULL = unlimited)
- Add column: `products.low_stock_threshold INT DEFAULT 5`
- Auto-set `is_available = false` saat stock_quantity = 0
- Admin UI: stock management per product (set quantity, toggle unlimited)
- Low stock warning badge di admin menu list
- Order creation: validate stock > 0 sebelum insert, decrement on success
- Edge function / RPC: `decrement_stock(p_product_id, p_qty)` with atomic check

**Files to create/modify:**
- `supabase/migrations/019_add_stock_management.sql`
- `src/pages/AdminMenu.jsx` — add stock fields
- `src/pages/Home.jsx` — show "Habis" badge & disable add button
- `supabase/migrations/019_add_stock_management.sql` — trigger + RPC

**Effort:** 2-3 hari

---

### 2.3 Push Notification (Customer)

**Problem:** Customer harus refresh halaman manual buat cek status. Gak ada real-time alert ke HP.

**Spec:**
- Integrate OneSignal (free tier: unlimited subscribers, 10k push/month)
- Or Firebase Cloud Messaging (FCM) — free, unlimited
- Flow:
  1. Customer buka order status page → prompt "Izinkan notifikasi?"
  2. Subscribe ke topic `order_{order_id}`
  3. Saat status berubah → edge function kirim push via OneSignal API
  4. Customer klik notif → buka OrderStatus page
- Notifikasi events: payment_confirmed, order_processing, order_ready, order_done

**Files to create/modify:**
- `src/lib/NotificationContext.jsx` — OneSignal/FCM wrapper
- `src/pages/OrderStatus.jsx` — prompt & subscribe
- `supabase/functions/confirm-payment/index.ts` — send push
- `supabase/functions/_shared/pushNotification.ts` — shared module
- Tambah env var: `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`

**Effort:** 2-3 hari

---

## Sprint 3: Engagement & Intelligence (Week 3)

**Goal:** Gamifikasi & business intelligence

### 3.1 Streak Bonus & Daily Reward

**Problem:** No gamification. Customer gak ada incentive buat balik besoknya.

**Spec:**
- Add table: `customer_streaks` (id, session_token, current_streak, longest_streak, last_order_date, created_at, updated_at)
- Streak logic:
  - Order hari ini → current_streak++
  - Skip 1 hari → reset to 0
  - Milestone bonus:
    - 3 hari: +10 poin
    - 7 hari: +40 poin
    - 14 hari: +100 poin
    - 30 hari: +200 poin
- Streak counter display di homepage (🔥 icon + "3 hari berturut-turut!")
- RPC: `update_streak(p_session_token)` — dipanggil dari create_order_atomic

**Files to create/modify:**
- `supabase/migrations/020_add_streak_system.sql`
- `src/components/StreakCounter.jsx` — fire icon + counter
- `src/pages/Home.jsx` — add streak section

**Effort:** 1-2 hari

---

### 3.2 Favorites / Saved Customization

**Problem:** Customer kopi order item yang sama setiap hari tapi harus re-customize (size, temp, sugar) setiap kali.

**Spec:**
- Add table: `favorites` (id, session_token, product_id, customization_json, label, created_at)
- customization_json: `{ size: "Regular", temp: "Iced", sugar: "Less" }`
- UI: "♡" button di product card → save as favorite
- Homepage: "Favorit Kamu" section (horizontal scroll, 1-tap add to cart)
- Cart: favorite items shown with pre-filled options

**Files to create/modify:**
- `supabase/migrations/021_add_favorites.sql`
- `src/components/FavoriteButton.jsx` — heart toggle
- `src/components/FavoritesSection.jsx` — homepage section
- `src/pages/Home.jsx` — add favorites section
- `src/lib/CartContext.jsx` — add from favorite

**Effort:** 1 hari

---

### 3.3 Advanced Sales Report

**Problem:** Laporan sekarang cuma total per hari. Belum ada insight yang actionable.

**Spec:**
- Tab baru di AdminReport: "Analytics"
- Metrics:
  - Revenue per item (top 10 best sellers)
  - Average order value (AOV)
  - Repeat customer rate
  - Peak hour heatmap (orders per hour, visual grid)
  - Profit margin per item (butuh cost_price field di products)
  - Customer lifetime value distribution
  - Voucher ROI (discount given vs incremental revenue)
- Add column: `products.cost_price INT DEFAULT NULL` — for margin calc
- RPC: `get_sales_analytics(p_date_from, p_date_to)` — return aggregated data
- Chart library: Recharts (lightweight) atau reuse existing chart component

**Files to create/modify:**
- `supabase/migrations/022_add_analytics.sql` — cost_price + RPC
- `src/pages/AdminReport.jsx` — add Analytics tab
- `src/components/SalesAnalytics.jsx` — new analytics dashboard

**Effort:** 2-3 hari

---

## Sprint 4: Expansion & Polish (Week 4+)

**Goal:** Expand market & polish UX

### 4.1 Group Ordering

- 1 orang start group order → get shareable link
- Setiap participant add items ke shared cart
- Host pays for all (or split bill)
- Need: `group_orders` table, invite link generation, real-time sync

**Effort:** 3-4 hari

---

### 4.2 Allergen & Dietary Filter

- Add column: `products.allergens TEXT[]` — array of allergen tags
- Add column: `products.dietary_tags TEXT[]` — vegan, gluten-free, sugar-free, dll
- Homepage: filter chips for dietary preferences
- Save preference to localStorage → auto-filter on return

**Effort:** 1 hari

---

### 4.3 Email Notification

- Integrate Resend (free tier: 100 emails/day)
- Events: order_confirmed, order_ready, order_done
- Need: customer email field di checkout (optional)
- HTML email template dengan branding toko

**Effort:** 1-2 hari

---

### 4.4 Gift Cards / e-Voucher

- Tabel baru: `gift_cards` (id, code, amount, purchased_by, redeemed_by, purchased_at, redeemed_at)
- Admin: create gift cards with custom amounts
- Customer: redeem di checkout sebagai payment method
- 60% penerima spend lebih dari nilai card

**Effort:** 2-3 hari

---

### 4.5 Multi-language (i18n)

- Integrate react-i18next
- Extract semua hardcoded Indonesian text ke locale files
- Support: Indonesian (default), English
- Language switcher di settings
- Product descriptions per language (JSONB column)

**Effort:** 2-3 hari

---

### 4.6 Dark Mode

- Extend Tailwind config dengan dark: variants
- Add useDarkMode hook (localStorage persistence)
- Toggle di header
- Semua component perlu audit dark mode colors

**Effort:** 1-2 hari

---

### 4.7 Subscription Plan

- "Rp 150.000/bulan = 1 kopi/hari"
- Need: subscription billing, recurring payment, daily redemption
- Integrate with Midtrans/Xendit untuk auto-debit (optional, bisa manual renew)
- Complex — but high value recurring revenue

**Effort:** 3-4 hari

---

### 4.8 QR Table Ordering

- Setiap meja punya QR code unik → redirect ke /order?table=5
- Pre-fill table_number di checkout
- Admin: manage tables, view active orders per table
- Reduce kasir queue, increase table turnover

**Effort:** 2-3 hari

---

## Technical Debt (Parallel)

Issues yang bisa dikerjakan bersamaan dengan sprint di atas:

| Issue | Detail | Effort |
|-------|--------|--------|
| PWA Service Worker | Offline = blank page sekarang. Add vite-plugin-pwa. | 0.5 hari |
| Cart Persistence | Cart hilang kalau refresh. Save ke localStorage. | 0.5 hari |
| Empty States | Halaman kosong cuma angka 0. Add ilustrasi + CTA. | 1 hari |
| Review Dedup | 1 customer bisa review order yang sama berkali-kali. Add UNIQUE constraint. | 0.5 hari |
| Optimistic UI | Action nunggu server response. Add optimistic updates di Cart & Order. | 1-2 hari |
| Accessibility | Skip-to-content, aria-live, focus trapping, keyboard nav di modal. | 1-2 hari |

---

## Database Migration Roadmap

| Migration | Feature | Tables/Columns |
|-----------|---------|----------------|
| 015 | Loyalty System | `loyalty_accounts`, `point_transactions` |
| 016 | Quick Reorder | `order_templates` |
| 017 | Voucher Redemptions | `voucher_redemptions` |
| 018 | Pre-Order | `orders.scheduled_at`, `orders.is_preorder` |
| 019 | Stock Management | `products.stock_quantity`, `products.low_stock_threshold` |
| 020 | Streak System | `customer_streaks` |
| 021 | Favorites | `favorites` |
| 022 | Analytics | `products.cost_price`, `get_sales_analytics()` RPC |

---

## KPI Targets

| Metric | Current | Target (After Sprint 1-3) |
|--------|---------|---------------------------|
| Repeat Order Rate | ~10% | 30%+ |
| Average Order Frequency | 1x/week | 3x/week |
| Customer Lifetime Value | Rp 50k | Rp 200k |
| Auto-verification Rate | 80% | 85%+ |
| Admin Time per Order | 2 min | 1 min |
| Monthly Active Users | - | Track via loyalty accounts |

---

## Notes

- Semua sprint bisa di-shuffle sesuai prioritas bisnis
- Migration numbering mengikuti yang sudah ada (015+)
- Setiap sprint termasuk testing & deployment
- Fitur yang butuh 3rd party service (OneSignal, Resend) perlu signup dulu
- Semua fitur harus backward-compatible (session token system tetap jalan)
