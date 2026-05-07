const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') || '';

const isTelegramConfigured = !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);

if (!isTelegramConfigured) {
  console.warn('Telegram notifications disabled: TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID not set');
}

export async function sendTelegramNotification(message: string): Promise<boolean> {
  if (!isTelegramConfigured) {
    console.warn('Telegram notification skipped: not configured');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Telegram error:', err);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Telegram notification failed:', error);
    return false;
  }
}

export function formatOrderNotification(order: {
  id: string;
  customer_name: string;
  note: string | null;
  total: number;
  payment_method?: string;
  items: Array<{ product_name: string; qty: number; size: string; temp: string; sugar: string; price_at_order: number }>;
}) {
  const itemLines = order.items
    .map((i) => `  • ${i.product_name} ×${i.qty} (${i.size}, ${i.temp}, ${i.sugar}) — Rp ${(i.price_at_order * i.qty).toLocaleString('id-ID')}`)
    .join('\n');

  const paymentLabel = order.payment_method === 'cash' ? '💵 Bayar di Kasir' : '💳 QRIS';

  return `🔔 <b>Pesanan Baru Masuk!</b>

📋 <b>${order.id}</b>
👤 ${order.customer_name}
🏷️ Takeaway${order.note ? `\n📝 ${order.note}` : ''}

🛒 <b>Item:</b>
${itemLines}

💰 <b>Total: Rp ${order.total.toLocaleString('id-ID')}</b>
💳 <b>Pembayaran:</b> ${paymentLabel}

✅ Pembayaran sudah dikonfirmasi!`;
}
