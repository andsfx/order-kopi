import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const BAYARGG_API_KEY = Deno.env.get('BAYARGG_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order from DB using service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(product_name, qty, price_at_order)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order.status !== 'pending_payment') {
      return new Response(
        JSON.stringify({ error: 'Order already paid or cancelled', status: order.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build description
    const itemDesc = order.order_items
      .map((i: { product_name: string; qty: number }) => `${i.product_name} x${i.qty}`)
      .join(', ');

    // Webhook URL = this project's payment-webhook function
    const webhookUrl = `${SUPABASE_URL}/functions/v1/payment-webhook`;

    // Determine redirect URL (back to order status page)
    // Use the origin from the request or fallback
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
    const redirectUrl = origin ? `${origin}/order/${order_id}` : '';

    // Create payment via bayar.gg API
    const bayarRes = await fetch('https://www.bayar.gg/api/create-payment.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': BAYARGG_API_KEY,
      },
      body: JSON.stringify({
        amount: order.total,
        description: `Order Kopi ${order_id} — ${itemDesc}`,
        customer_name: order.customer_name,
        callback_url: webhookUrl,
        redirect_url: redirectUrl || undefined,
        payment_method: 'qris',
        use_qris_converter: true,
      }),
    });

    const bayarData = await bayarRes.json();
    console.log('bayar.gg response:', JSON.stringify(bayarData));

    if (!bayarData.success) {
      console.error('bayar.gg error:', bayarData);
      return new Response(
        JSON.stringify({ error: 'Payment creation failed', detail: bayarData.error || bayarData.message }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // bayar.gg response: { success, data: { invoice_id, payment_url, qris_dynamic_image_url, ... } }
    const paymentData = bayarData.data || {};
    const paymentId = paymentData.invoice_id || null;
    const paymentUrl = paymentData.payment_url || null;

    await supabase
      .from('orders')
      .update({
        payment_id: String(paymentId),
        payment_url: paymentUrl,
      })
      .eq('id', order_id);

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentId,
        payment_url: paymentUrl,
        qris_image_url: paymentData.qris_dynamic_image_url || paymentData.qris_static_image_url || null,
        qris_string: paymentData.qris_dynamic_string || paymentData.qris_string || null,
        final_amount: paymentData.final_amount || null,
        expires_at: paymentData.expires_at || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('create-payment error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
