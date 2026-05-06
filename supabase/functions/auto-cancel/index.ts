import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find orders that are pending_payment and older than 15 minutes
    // EXCLUDE orders with payment_proof_url (customer has submitted proof)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: expiredOrders, error: findError } = await supabase
      .from('orders')
      .select('id, customer_name, total, created_at')
      .eq('status', 'pending_payment')
      .is('payment_proof_url', null)  // Only cancel orders WITHOUT payment proof
      .lt('created_at', fifteenMinutesAgo);

    if (findError) {
      console.error('Error finding expired orders:', findError);
      return new Response(
        JSON.stringify({ error: 'An error occurred while processing your request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No expired orders found', cancelled: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderIds = expiredOrders.map((o) => o.id);

    // Cancel orders and log audit trail
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        cancelled_reason: 'auto_timeout',
        cancelled_at: new Date().toISOString()
      })
      .in('id', orderIds);

    if (updateError) {
      console.error('Error cancelling orders:', updateError);
      return new Response(
        JSON.stringify({ error: 'An error occurred while processing your request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log audit events for each cancelled order
    for (const order of expiredOrders) {
      await supabase.from('audit_logs').insert({
        event_type: 'order_auto_cancelled',
        order_id: order.id,
        details: {
          reason: 'Payment timeout (15 min)',
          customer_name: order.customer_name,
          total: order.total,
          created_at: order.created_at
        },
        created_at: new Date().toISOString()
      });
    }

    console.log(`Auto-cancelled ${orderIds.length} orders: ${orderIds.join(', ')}`);

    return new Response(
      JSON.stringify({ message: 'Expired orders cancelled', cancelled: orderIds.length, order_ids: orderIds }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('auto-cancel error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
