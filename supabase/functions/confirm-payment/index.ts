import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendTelegramNotification, formatOrderNotification } from '../_shared/telegram.ts';
import { getClientIP, checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limiting (admin endpoints: allow 30 req/min)
    const clientIP = getClientIP(req);
    const retryAfter = checkRateLimit(clientIP, 30);
    if (retryAfter !== null) {
      return rateLimitResponse(retryAfter, corsHeaders);
    }

    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch order with items
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('*, order_items(product_name, qty, size, sweetness, ice_cube, price_at_order)')
      .eq('id', order_id)
      .single();

    if (findError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order.status !== 'pending_payment' && order.status !== 'pending_verification') {
      return new Response(
        JSON.stringify({ error: 'Order is not pending payment or verification', status: order.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to paid with optimistic locking (prevent double-confirm)
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', order_id)
      .in('status', ['pending_payment', 'pending_verification'])
      .select()
      .single();

    if (updateError || !updated) {
      return new Response(
        JSON.stringify({ error: 'Failed to update order — may already be processed' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send Telegram notification
    try {
      const message = formatOrderNotification({
        id: order.id,
        customer_name: order.customer_name,
        note: order.note,
        total: order.total,
        payment_method: order.payment_method,
        items: order.order_items,
      });
      await sendTelegramNotification(message);
    } catch (tgErr) {
      console.error('Telegram notification failed:', tgErr);
    }

    return new Response(
      JSON.stringify({ success: true, order_id, new_status: 'paid' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('confirm-payment error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
