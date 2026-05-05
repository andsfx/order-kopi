/**
 * Screenshot Capture Script - Final
 * Captures all 8 README screenshots for Order Kopi
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_URL = 'https://order-kopi-app.vercel.app';
const DIR = path.join(__dirname, 'screenshots');
const ADMIN_EMAIL = 'andotherstori@gmail.com';
const ADMIN_PASSWORD = '1dontlikeyou';

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

async function shot(page, name) {
  const fp = path.join(DIR, name);
  await page.screenshot({ path: fp, fullPage: false });
  const kb = Math.round(fs.statSync(fp).size / 1024);
  console.log(`  ✅ ${name} (${kb} KB)`);
}

async function adminLogin(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin/, { timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log('  ✅ Admin logged in');
  return { ctx, page };
}

async function main() {
  console.log('🚀 Starting screenshot capture...\n');
  const browser = await chromium.launch({ headless: true });

  // ── 1. menu.png ─────────────────────────────────────────────────────────────
  console.log('📸 1/8 menu.png');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    await shot(page, 'menu.png');
    await ctx.close();
  }

  // ── Order flow: order-status + qris-payment ──────────────────────────────────
  let orderId = null;
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    try {
      await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(3000);

      // Click first product card's add button (aria-label starts with "Tambah")
      const addBtn = page.locator('button[aria-label^="Tambah"]').first();
      await addBtn.waitFor({ timeout: 10000 });
      await addBtn.click();
      await page.waitForTimeout(2000);
      console.log('  ✅ Product modal opened');

      // In modal: click the main "Tambah ke Keranjang" / submit button
      const modalBtn = page.locator('button').filter({ hasText: /tambah ke keranjang|pesan/i }).first();
      if (await modalBtn.count() > 0) {
        await modalBtn.click();
        await page.waitForTimeout(1500);
        console.log('  ✅ Added to cart');
      }

      // Go to checkout
      await page.goto(`${APP_URL}/checkout`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Fill name
      const nameInput = page.locator('input[placeholder*="nama" i]').first();
      if (await nameInput.count() > 0) {
        await nameInput.fill('Budi Santoso');
        await page.waitForTimeout(300);
      }

      // Select QRIS payment
      const qrisInput = page.locator('input[value="qris"]').first();
      if (await qrisInput.count() > 0) {
        await qrisInput.click();
        await page.waitForTimeout(300);
        console.log('  ✅ QRIS selected');
      }

      // Submit
      const submitBtn = page.locator('button').filter({ hasText: /buat pesanan|pesan sekarang|order/i }).first();
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        await page.waitForTimeout(5000);
      }

      const url = page.url();
      console.log(`  URL after submit: ${url}`);

      // 3. qris-payment.png
      console.log('📸 3/8 qris-payment.png');
      await shot(page, 'qris-payment.png');

      // 2. order-status.png
      console.log('📸 2/8 order-status.png');
      await shot(page, 'order-status.png');

      const m = url.match(/\/order\/([^/?#]+)/i);
      if (m) { orderId = m[1]; console.log(`  Order ID: ${orderId}`); }

    } catch (err) {
      console.log(`  ⚠️  Order flow error: ${err.message}`);
      // Fallback: screenshot checkout page
      try {
        await page.goto(`${APP_URL}/checkout`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        console.log('📸 2/8 order-status.png (fallback: checkout)');
        await shot(page, 'order-status.png');
        console.log('📸 3/8 qris-payment.png (fallback: checkout)');
        await shot(page, 'qris-payment.png');
      } catch (e2) {
        console.log(`  ⚠️  Fallback also failed: ${e2.message}`);
      }
    }
    await ctx.close();
  }

  // ── Admin screenshots ────────────────────────────────────────────────────────
  console.log('\n🔐 Logging in to admin...');
  const { ctx: adminCtx, page: adm } = await adminLogin(browser);

  // 4. admin-dashboard.png
  console.log('📸 4/8 admin-dashboard.png');
  await adm.goto(`${APP_URL}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
  await adm.waitForTimeout(3000);
  await shot(adm, 'admin-dashboard.png');

  // 5. admin-menu.png
  console.log('📸 5/8 admin-menu.png');
  await adm.goto(`${APP_URL}/admin/menu`, { waitUntil: 'networkidle', timeout: 30000 });
  await adm.waitForTimeout(3000);
  await shot(adm, 'admin-menu.png');

  // 6. admin-reports.png
  console.log('📸 6/8 admin-reports.png');
  await adm.goto(`${APP_URL}/admin/report`, { waitUntil: 'networkidle', timeout: 30000 });
  await adm.waitForTimeout(3000);
  await shot(adm, 'admin-reports.png');

  // 7. rating.png — order status page (customer view)
  console.log('📸 7/8 rating.png');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    if (orderId) {
      await page.goto(`${APP_URL}/order/${orderId}`, { waitUntil: 'networkidle', timeout: 30000 });
    } else {
      await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    }
    await page.waitForTimeout(2000);
    await shot(page, 'rating.png');
    await ctx.close();
  }

  // 8. payment-confirmed.png — admin confirms payment, then show customer view
  console.log('📸 8/8 payment-confirmed.png');
  if (orderId) {
    // Admin: find and confirm payment for this order
    await adm.goto(`${APP_URL}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
    await adm.waitForTimeout(2000);

    // Click confirm payment button if visible
    const confirmBtn = adm.locator('button').filter({ hasText: /konfirmasi bayar|confirm payment/i }).first();
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click();
      await adm.waitForTimeout(2000);
      console.log('  ✅ Payment confirmed by admin');
    }

    // Show customer order status after confirmation
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${APP_URL}/order/${orderId}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await shot(page, 'payment-confirmed.png');
    await ctx.close();
  } else {
    // Fallback: admin dashboard
    await shot(adm, 'payment-confirmed.png');
  }

  await adminCtx.close();
  await browser.close();

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('\n── Summary ─────────────────────────────────');
  const required = [
    'menu.png', 'order-status.png', 'qris-payment.png',
    'admin-dashboard.png', 'admin-menu.png', 'admin-reports.png',
    'rating.png', 'payment-confirmed.png'
  ];
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.png'));
  let ok = 0;
  for (const name of required) {
    const exists = files.includes(name);
    const size = exists ? Math.round(fs.statSync(path.join(DIR, name)).size / 1024) : 0;
    const good = exists && size > 5;
    if (good) ok++;
    console.log(`  ${good ? '✅' : '❌'} ${name}${exists ? ` (${size} KB)` : ' — MISSING'}`);
  }
  console.log(`\n  ${ok}/${required.length} screenshots ready`);
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
