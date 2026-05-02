import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendTelegramNotification, formatOrderNotification } from '../_shared/telegram.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  // bayar.gg sends POST with JSON body on successful payment
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();
    console.log('Webhook received:', JSON.stringify(payload));

    // bayar.gg webhook callback payload:
    // { event: "payment.paid", invoice_id, status, amount, final_amount, paid_at, customer_name, ... }
    const paymentId = String(payload.invoice_id || payload.id || payload.payment_id || '');
    const status = payload.status || '';
    const event = payload.event || '';

    console.log('Payment ID:', paymentId, 'Status:', status, 'Event:', event);

    // Only process successful payments
    if (status !== 'paid' && event !== 'payment.paid') {
      console.log('Ignoring non-paid webhook:', status, event);
      return new Response(JSON.stringify({ received: true, action: 'ignored' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find order by payment_id
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('*, order_items(product_name, qty, size, temp, sugar, price_at_order)')
      .eq('payment_id', paymentId)
      .single();

    if (findError || !order) {
      console.error('Order not found for payment_id:', paymentId);
      // Try matching by description (fallback)
      return new Response(
        JSON.stringify({ received: true, error: 'Order not found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update order status to 'paid'
    if (order.status === 'pending_payment') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Failed to update order:', updateError);
      }

      // Send Telegram notification
      try {
        const message = formatOrderNotification({
          id: order.id,
          customer_name: order.customer_name,
          table_number: order.table_number,
          note: order.note,
          total: order.total,
          items: order.order_items,
        });
        await sendTelegramNotification(message);
        console.log('Telegram notification sent for', order.id);
      } catch (tgErr) {
        console.error('Telegram notification failed:', tgErr);
        // Don't fail the webhook because of Telegram
      }
    }

    return new Response(
      JSON.stringify({ received: true, order_id: order.id, new_status: 'paid' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
