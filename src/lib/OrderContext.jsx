import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { getSessionToken } from './sessionToken';
import { generateUniqueCode } from './generateUniqueCode';
import { logOrderCreation, logStatusChange } from './auditLog';

const OrderContext = createContext(null);

function transformOrder(order) {
  return {
    id: order.id,
    customer: {
      name: order.customer_name,
      note: order.note,
    },
    total: order.total,
    status: order.status,
    createdAt: order.created_at,
    paymentUrl: order.payment_url,
    paymentMethod: order.payment_method || 'qris',
    items: (order.order_items || []).map((item) => ({
      key: `${item.product_id}-${item.size}-${item.temp}-${item.sugar}`,
      product: {
        id: item.product_id,
        name: item.product_name,
        price: item.price_at_order,
        image_url: item.products?.image_url,
      },
      price: item.price_at_order,
      options: {
        size: item.size,
        temp: item.temp,
        sugar: item.sugar,
      },
      qty: item.qty,
    })),
  };
}

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all orders (for admin only — gated by auth in useEffect)
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .order('created_at', { ascending: false })
      .range(0, 99);

    if (!error && data) {
      setOrders(data.map(transformOrder));
    }
    setLoading(false);
  }, []);

  // Subscribe to realtime — only when authenticated (admin)
  useEffect(() => {
    let channel;
    let cancelled = false;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return; // Customer — don't fetch all orders

      await fetchOrders();
      if (cancelled) return;

      channel = supabase
        .channel(`admin-orders-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => { if (!cancelled) fetchOrders(); }
        )
        .subscribe();
    }

    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // Place a new order (insert into Supabase)
  async function placeOrder(cartItems, customerInfo, appliedVoucher = null, voucherDiscount = 0) {
    // Get or create session token for this customer
    const sessionToken = getSessionToken();
    
    const { data: counterData, error: counterError } = await supabase
      .rpc('generate_order_id');

    if (counterError) {
      throw new Error('Gagal membuat order: ' + counterError.message);
    }

    const orderId = counterData;
    const subtotal = cartItems.reduce((sum, i) => sum + (i.price ?? i.product.price) * i.qty, 0);
    const finalTotal = Math.max(0, subtotal - voucherDiscount);

    // Generate 4-digit unique code for QRIS Static payment verification
    // IMPORTANT: Use finalTotal (after discount) for unique code calculation
    const uniqueCode = generateUniqueCode(orderId, finalTotal);
    const amountToPay = finalTotal + parseInt(uniqueCode);

    // Insert order with session token, voucher, and unique code
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        customer_name: customerInfo.name,
        note: customerInfo.note || null,
        total: finalTotal,
        unique_code: uniqueCode,
        amount_to_pay: amountToPay,
        discount_amount: voucherDiscount || 0,
        status: 'pending_payment',
        payment_method: customerInfo.paymentMethod || 'qris',
        branch_id: customerInfo.branchId || null,
        session_token: sessionToken,
        voucher_id: appliedVoucher?.id || null,
        discount_amount: voucherDiscount || 0,
      });

    if (orderError) {
      throw new Error('Gagal menyimpan order: ' + orderError.message);
    }

    // If payment method is QRIS, create Cashi.id payment
    let paymentUrl = null;
    let paymentId = null;
    
    if (customerInfo.paymentMethod === 'qris') {
      try {
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-cashi-payment', {
          body: {
            order_id: orderId,
            amount: total,
            customer_name: customerInfo.name,
          },
        });

        if (paymentError) {
          console.error('Failed to create Cashi payment:', paymentError);
          // Continue without payment URL - will show error to user
        } else if (paymentData) {
          paymentUrl = paymentData.payment_url; // Cashi.id returns base64 QRIS image
          paymentId = paymentData.payment_id;
          
          // Update order with payment details
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              payment_id: paymentId,
              payment_url: paymentUrl,
            })
            .eq('id', orderId);
            
          if (updateError) {
            console.error('Failed to update order with payment details:', updateError);
          }
        }
      } catch (error) {
        console.error('Error creating Cashi payment:', error);
        // Continue without payment URL
      }
    }

    // Insert order items
    const items = cartItems.map((item) => ({
      order_id: orderId,
      product_id: item.product.id,
      product_name: item.product.name,
      qty: item.qty,
      size: item.options.size,
      temp: item.options.temp,
      sugar: item.options.sugar,
      price_at_order: item.price ?? item.product.price,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(items);

    if (itemsError) {
      // Rollback: delete orphaned order
      await supabase.from('orders').delete().eq('id', orderId);
      throw new Error('Gagal menyimpan item order: ' + itemsError.message);
    }

    // Increment voucher usage count if voucher was used (atomic to prevent race condition)
    if (appliedVoucher) {
      const { error: voucherError } = await supabase.rpc('increment_voucher_usage', { 
        p_voucher_id: appliedVoucher.id 
      });
      
      if (voucherError) {
        console.error('Failed to increment voucher usage:', voucherError);
        // Don't fail the order, just log the error
      }
    }

    // Log order creation to audit log
    await logOrderCreation(orderId, {
      customer_name: customerInfo.name,
      total,
      payment_method: customerInfo.paymentMethod || 'qris',
      branch_id: customerInfo.branchId
    }, sessionToken);

    return {
      id: orderId,
      customer: customerInfo,
      total,
      status: 'pending_payment',
      paymentMethod: customerInfo.paymentMethod || 'qris',
      createdAt: new Date().toISOString(),
      items: cartItems,
    };
  }

  // Update order status (for admin)
  async function updateStatus(orderId, newStatus) {
    // Get current status before updating (for audit log)
    const currentOrder = orders.find(o => o.id === orderId);
    const oldStatus = currentOrder?.status;

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error('Gagal update status:', error);
      return;
    }

    // Log status change to audit log
    if (oldStatus && oldStatus !== newStatus) {
      await logStatusChange(orderId, oldStatus, newStatus, 'admin');
      
      // Log manual verification events
      if (oldStatus === 'pending_verification' && newStatus === 'paid') {
        await supabase
          .from('audit_logs')
          .insert({
            order_id: orderId,
            event_type: 'manual_verification_approved',
            event_data: {
              previous_status: oldStatus,
              new_status: newStatus
            },
            actor_type: 'admin'
          });
      } else if (oldStatus === 'pending_verification' && newStatus === 'cancelled') {
        await supabase
          .from('audit_logs')
          .insert({
            order_id: orderId,
            event_type: 'manual_verification_rejected',
            event_data: {
              previous_status: oldStatus,
              new_status: newStatus
            },
            actor_type: 'admin'
          });
      }
    }

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  }

  // Get single order by ID — wrapped in useCallback to prevent infinite re-renders
  const getOrder = useCallback(async (orderId) => {
    // Check local state first
    const local = orders.find((o) => o.id === orderId);
    if (local) return local;

    // Get session token to verify ownership
    const sessionToken = getSessionToken();

    // Fetch from DB - RLS policy handles access via x-session-token header
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      console.error('getOrder error:', error);
      return null;
    }
    if (!data) return null;
    return transformOrder(data);
  }, [orders]);

  // Upload payment proof and verify payment
  async function uploadPaymentProof(orderId, file, amountEntered) {
    try {
      const sessionToken = getSessionToken();
      
      // 1. Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}_${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error('Gagal upload bukti pembayaran: ' + uploadError.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('order-attachments')
        .getPublicUrl(filePath);

      // 2. Call verify-payment Edge Function
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: {
          orderId,
          paymentProofUrl: publicUrl,
          amountEntered: parseInt(amountEntered, 10),
          sessionToken
        }
      });

      if (error) {
        throw new Error('Gagal verifikasi pembayaran: ' + error.message);
      }

      // 3. Return result
      return {
        success: data.success,
        autoVerified: data.auto_verified,
        needsManualReview: data.needs_manual_review,
        fraudScore: data.fraud_score,
        message: data.message,
        error: data.error
      };
    } catch (error) {
      console.error('Upload payment proof error:', error);
      throw error;
    }
  }

  return (
    <OrderContext.Provider value={{ orders, loading, placeOrder, updateStatus, getOrder, fetchOrders, uploadPaymentProof }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) {
    throw new Error('useOrders harus digunakan di dalam OrderProvider');
  }
  return ctx;
}
