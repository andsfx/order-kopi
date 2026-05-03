# 🔧 Order Kopi - Security & Performance Fixes

**Project:** https://github.com/andsfx/order-kopi  
**Priority:** 🔴 URGENT → 🟡 HIGH → 🟢 MEDIUM → ⚪ LOW

---

## 🔴 URGENT FIXES (Do First!)

### 1. Fix Order Update Policy (CRITICAL SECURITY HOLE)

**Problem:** Anyone (including anonymous users) can update orders, change status, total, payment method.

**File:** `supabase/setup.sql` (or run in Supabase SQL Editor)

```sql
-- ❌ REMOVE THIS DANGEROUS POLICY
drop policy if exists "Anyone can update orders" on orders;

-- ✅ ADD THIS SECURE POLICY
create policy "Only authenticated users can update orders"
  on orders for update 
  using (auth.role() = 'authenticated');
```

**Test:**
1. Logout dari admin
2. Coba update order via browser console:
```js
await supabase.from('orders').update({ status: 'done' }).eq('id', 'ORD-0001')
// Should fail with permission error
```

---

### 2. Deploy Auto-Cancel Edge Function

**Problem:** Orders stuck in `pending_payment` forever, no auto-cleanup.

**File:** `supabase/functions/auto-cancel/index.ts` (already exists in repo)

**Steps:**
1. Setup Supabase CLI:
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

2. Deploy function:
```bash
supabase functions deploy auto-cancel --no-verify-jwt
```

3. Setup Cron Job in Supabase Dashboard:
   - Go to Database → Extensions → Enable `pg_cron`
   - Run this SQL:
```sql
select cron.schedule(
  'auto-cancel-orders',
  '*/15 * * * *', -- Every 15 minutes
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-cancel',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

**Or use external cron (easier):**
- Setup cron job di server/GitHub Actions yang hit endpoint setiap 15 menit
- Endpoint: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-cancel`

---

## 🟡 HIGH PRIORITY (This Week)

### 3. Add Customer Tracking

**Problem:** No way to track which customer made which order.

**Migration SQL:**
```sql
-- Add customer_email column
alter table orders add column customer_email text;

-- Add index for faster lookups
create index idx_orders_customer_email on orders(customer_email);

-- Update RLS policy to allow customers to view their own orders
create policy "Customers can view their own orders"
  on orders for select
  using (
    customer_email = auth.jwt() ->> 'email'
    or auth.role() = 'authenticated' -- Admin can see all
  );
```

**Frontend Changes:**

**File:** `src/pages/Checkout.jsx`
```jsx
// Add email input field
<input
  type="email"
  placeholder="Email (opsional, untuk tracking pesanan)"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
/>

// Update order creation
const { data: order, error } = await supabase
  .from('orders')
  .insert({
    id: orderId,
    customer_name: name,
    customer_email: email || null, // Add this
    table_number: tableNumber,
    // ... rest
  });
```

**New Page:** `src/pages/MyOrders.jsx`
```jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.email) return;

    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_email', user.email)
        .order('created_at', { ascending: false });
      
      setOrders(data || []);
    };

    fetchOrders();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Pesanan Saya</h1>
      {orders.map(order => (
        <div key={order.id} className="border rounded-lg p-4 mb-4">
          <p className="font-semibold">{order.id}</p>
          <p className="text-sm text-gray-600">{order.status}</p>
          <p className="text-sm">Total: Rp {order.total.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
```

---

### 4. Add Pagination to Admin Dashboard

**Problem:** Loading all orders at once = slow when 1000+ orders.

**File:** `src/pages/Admin.jsx`

```jsx
import { useState, useEffect } from 'react';

const ORDERS_PER_PAGE = 20;

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })
        .range(page * ORDERS_PER_PAGE, (page + 1) * ORDERS_PER_PAGE - 1);

      if (data) {
        setOrders(data);
        setHasMore(data.length === ORDERS_PER_PAGE);
      }
    };

    fetchOrders();
  }, [page]);

  return (
    <div>
      {/* Order list */}
      {orders.map(order => (
        <OrderCard key={order.id} order={order} />
      ))}

      {/* Pagination */}
      <div className="flex gap-2 justify-center mt-4">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-4 py-2">Page {page + 1}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={!hasMore}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

### 5. Add Rate Limiting

**Option A: Supabase Edge Function (Recommended)**

**File:** `supabase/functions/create-order/index.ts`
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Simple in-memory rate limiter (use Redis for production)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 5; // 5 orders per minute
const WINDOW_MS = 60 * 1000;

serve(async (req) => {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();

  // Check rate limit
  const limit = rateLimits.get(ip);
  if (limit) {
    if (now < limit.resetAt) {
      if (limit.count >= RATE_LIMIT) {
        return new Response(
          JSON.stringify({ error: 'Too many requests' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
      limit.count++;
    } else {
      rateLimits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    }
  } else {
    rateLimits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }

  // Process order creation
  const body = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data, error } = await supabase
    .from('orders')
    .insert(body)
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify(data),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
```

**Option B: Client-side (Quick Fix)**

**File:** `src/lib/useRateLimit.js`
```js
const RATE_LIMIT_KEY = 'order_rate_limit';
const MAX_ORDERS = 5;
const WINDOW_MS = 60 * 1000;

export function useRateLimit() {
  const checkRateLimit = () => {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();

    if (!stored) {
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({
        count: 1,
        resetAt: now + WINDOW_MS
      }));
      return true;
    }

    const { count, resetAt } = JSON.parse(stored);

    if (now > resetAt) {
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({
        count: 1,
        resetAt: now + WINDOW_MS
      }));
      return true;
    }

    if (count >= MAX_ORDERS) {
      return false;
    }

    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({
      count: count + 1,
      resetAt
    }));
    return true;
  };

  return { checkRateLimit };
}
```

**Usage in Checkout.jsx:**
```jsx
import { useRateLimit } from '../lib/useRateLimit';

export default function Checkout() {
  const { checkRateLimit } = useRateLimit();

  const handleSubmit = async () => {
    if (!checkRateLimit()) {
      toast.error('Terlalu banyak pesanan. Tunggu 1 menit.');
      return;
    }

    // ... rest of order creation
  };
}
```

---

## 🟢 MEDIUM PRIORITY (This Month)

### 6. Add Soft Delete

**Migration SQL:**
```sql
-- Add deleted_at column to all tables
alter table orders add column deleted_at timestamptz;
alter table products add column deleted_at timestamptz;
alter table reviews add column deleted_at timestamptz;

-- Update RLS policies to exclude soft-deleted records
drop policy "Anyone can view orders" on orders;
create policy "Anyone can view active orders"
  on orders for select
  using (deleted_at is null);

-- Create admin-only policy to view deleted records
create policy "Authenticated users can view deleted orders"
  on orders for select
  using (auth.role() = 'authenticated');

-- Update delete policies to do soft delete
drop policy "Authenticated users can delete orders" on orders;
create policy "Authenticated users can soft delete orders"
  on orders for update
  using (auth.role() = 'authenticated')
  with check (deleted_at is not null);
```

**Frontend Helper:**
```js
// src/lib/softDelete.js
export async function softDelete(table, id) {
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  return { error };
}

// Usage
import { softDelete } from '../lib/softDelete';

const handleDelete = async (orderId) => {
  const { error } = await softDelete('orders', orderId);
  if (!error) {
    toast.success('Pesanan dihapus');
  }
};
```

---

### 7. Add Inventory Management

**Migration SQL:**
```sql
-- Add stock column
alter table products add column stock int default 999;
alter table products add column track_stock boolean default false;

-- Add constraint
alter table products add constraint stock_non_negative check (stock >= 0);

-- Create function to decrement stock
create or replace function decrement_stock()
returns trigger
language plpgsql
security definer
as $$
begin
  update products
  set stock = stock - new.qty
  where id = new.product_id
    and track_stock = true;

  -- Auto-disable product if out of stock
  update products
  set is_available = false
  where id = new.product_id
    and track_stock = true
    and stock <= 0;

  return new;
end;
$$;

-- Create trigger
create trigger on_order_item_created
  after insert on order_items
  for each row
  execute function decrement_stock();
```

**Frontend Changes:**

**File:** `src/pages/AdminMenu.jsx`
```jsx
// Add stock fields to product form
<div>
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={trackStock}
      onChange={(e) => setTrackStock(e.target.checked)}
    />
    Track Stock
  </label>
</div>

{trackStock && (
  <input
    type="number"
    placeholder="Stock"
    value={stock}
    onChange={(e) => setStock(parseInt(e.target.value))}
    min="0"
    className="w-full px-4 py-3 border rounded-xl"
  />
)}
```

**File:** `src/pages/Home.jsx`
```jsx
// Show stock status
<ProductCard
  product={product}
  outOfStock={product.track_stock && product.stock <= 0}
/>

// In ProductCard component
{outOfStock && (
  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
    Habis
  </div>
)}
```

---

### 8. Setup CI/CD with GitHub Actions

**File:** `.github/workflows/deploy.yml`
```yaml
name: Deploy to Netlify

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      # Uncomment when tests are added
      # - name: Run tests
      #   run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/master' || github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: './dist'
          production-deploy: true
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

**Setup Secrets in GitHub:**
1. Go to repo Settings → Secrets and variables → Actions
2. Add secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `NETLIFY_AUTH_TOKEN` (get from Netlify)
   - `NETLIFY_SITE_ID` (get from Netlify)

---

### 9. Migrate to TypeScript

**Step 1: Install TypeScript**
```bash
npm install -D typescript @types/react @types/react-dom
```

**Step 2: Create `tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 3: Rename files gradually**
```bash
# Start with types
mv src/lib/supabase.js src/lib/supabase.ts

# Add types
export type Order = {
  id: string;
  customer_name: string;
  customer_email?: string;
  table_number?: number;
  note?: string;
  total: number;
  status: 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'done' | 'cancelled';
  payment_method: 'qris' | 'cash';
  branch_id?: number;
  created_at: string;
};

export type Product = {
  id: number;
  name: string;
  price: number;
  price_small?: number;
  price_large?: number;
  category_id: number;
  description?: string;
  image_url?: string;
  is_available: boolean;
  stock?: number;
  track_stock?: boolean;
};
```

---

## ⚪ LOW PRIORITY (Nice to Have)

### 10. Add Tests

**Install Vitest:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**File:** `vite.config.js`
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

**File:** `src/test/setup.ts`
```ts
import '@testing-library/jest-dom';
```

**Example Test:** `src/components/ProductCard.test.jsx`
```jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProductCard from './ProductCard';

describe('ProductCard', () => {
  it('renders product name', () => {
    const product = {
      id: 1,
      name: 'Caramel Latte',
      price: 28000,
      category_id: 1,
      is_available: true,
    };

    render(<ProductCard product={product} />);
    expect(screen.getByText('Caramel Latte')).toBeInTheDocument();
  });

  it('shows out of stock badge when stock is 0', () => {
    const product = {
      id: 1,
      name: 'Caramel Latte',
      price: 28000,
      category_id: 1,
      is_available: true,
      track_stock: true,
      stock: 0,
    };

    render(<ProductCard product={product} outOfStock />);
    expect(screen.getByText('Habis')).toBeInTheDocument();
  });
});
```

**Run tests:**
```bash
npm run test
```

---

### 11. Image Optimization

**Install library:**
```bash
npm install react-lazy-load-image-component
```

**File:** `src/components/ProductCard.jsx`
```jsx
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

export default function ProductCard({ product }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <LazyLoadImage
        src={product.image_url}
        alt={product.name}
        effect="blur"
        className="w-full h-48 object-cover"
      />
      {/* ... rest */}
    </div>
  );
}
```

---

### 12. Promo Code System

**Migration SQL:**
```sql
create table promo_codes (
  id bigint generated always as identity primary key,
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value int not null check (discount_value > 0),
  min_purchase int default 0,
  max_discount int,
  usage_limit int,
  usage_count int default 0,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table promo_codes enable row level security;

create policy "Anyone can view active promo codes"
  on promo_codes for select
  using (is_active = true and now() between valid_from and coalesce(valid_until, 'infinity'));

create policy "Authenticated users can manage promo codes"
  on promo_codes for all
  using (auth.role() = 'authenticated');

-- Add promo_code to orders
alter table orders add column promo_code text references promo_codes(code);
alter table orders add column discount_amount int default 0;
```

**Frontend:** `src/pages/Checkout.jsx`
```jsx
const [promoCode, setPromoCode] = useState('');
const [discount, setDiscount] = useState(0);

const applyPromo = async () => {
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', promoCode.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error || !data) {
    toast.error('Kode promo tidak valid');
    return;
  }

  // Check validity
  const now = new Date();
  if (data.valid_until && new Date(data.valid_until) < now) {
    toast.error('Kode promo sudah kadaluarsa');
    return;
  }

  if (data.usage_limit && data.usage_count >= data.usage_limit) {
    toast.error('Kode promo sudah habis digunakan');
    return;
  }

  if (data.min_purchase && cartTotal < data.min_purchase) {
    toast.error(`Minimal pembelian Rp ${data.min_purchase.toLocaleString()}`);
    return;
  }

  // Calculate discount
  let discountAmount = 0;
  if (data.discount_type === 'percentage') {
    discountAmount = Math.floor(cartTotal * data.discount_value / 100);
    if (data.max_discount) {
      discountAmount = Math.min(discountAmount, data.max_discount);
    }
  } else {
    discountAmount = data.discount_value;
  }

  setDiscount(discountAmount);
  toast.success(`Diskon Rp ${discountAmount.toLocaleString()} diterapkan!`);
};

// Update total
const finalTotal = cartTotal - discount;
```

---

## 📋 Checklist

Copy this to track your progress:

```markdown
## 🔴 URGENT
- [ ] Fix order update policy (security hole)
- [ ] Deploy auto-cancel Edge Function
- [ ] Setup cron job for auto-cancel

## 🟡 HIGH
- [ ] Add customer_email to orders table
- [ ] Create MyOrders page
- [ ] Add pagination to Admin dashboard
- [ ] Implement rate limiting (client-side or Edge Function)

## 🟢 MEDIUM
- [ ] Add soft delete to orders/products/reviews
- [ ] Add inventory management (stock tracking)
- [ ] Setup GitHub Actions CI/CD
- [ ] Migrate to TypeScript

## ⚪ LOW
- [ ] Add unit tests with Vitest
- [ ] Optimize images with lazy loading
- [ ] Implement promo code system
```

---

## 🚀 Quick Start

1. **Clone repo:**
```bash
git clone https://github.com/andsfx/order-kopi.git
cd order-kopi
```

2. **Create new branch:**
```bash
git checkout -b fix/security-and-performance
```

3. **Start with URGENT fixes:**
   - Open Supabase SQL Editor
   - Run the order policy fix
   - Deploy auto-cancel function

4. **Test locally:**
```bash
npm install
npm run dev
```

5. **Commit & push:**
```bash
git add .
git commit -m "fix: security holes and add rate limiting"
git push origin fix/security-and-performance
```

6. **Create PR and merge**

---

## 📞 Need Help?

Kalau ada yang stuck atau butuh bantuan implementasi, ping me! 🚀

**Good luck fixing! 💪**
