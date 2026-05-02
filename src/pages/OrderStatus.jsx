import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Coffee, Package, ArrowLeft, Loader2, CreditCard, XCircle, Search } from 'lucide-react';
import { useOrders } from '../lib/OrderContext';
import { supabase } from '../lib/supabase';

const STEPS = [
  { key: 'pending_payment', label: 'Bayar', icon: CreditCard },
  { key: 'paid', label: 'Menunggu', icon: Clock },
  { key: 'preparing', label: 'Diproses', icon: Coffee },
  { key: 'ready', label: 'Siap', icon: Package },
  { key: 'done', label: 'Selesai', icon: CheckCircle },
];

export default function OrderStatus() {
  const { orderId } = useParams();
  const { getOrder } = useOrders();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // Fetch order on mount
  useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      const data = await getOrder(orderId);
      setOrder(data);
      setLoading(false);
    }
    fetchOrder();
  }, [orderId, getOrder]);

  // Subscribe to realtime updates for this order
  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: payload.new.status,
              paymentUrl: payload.new.payment_url,
              paymentMethod: payload.new.payment_method || prev.paymentMethod,
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="ml-2 text-text-muted text-sm">Memuat pesanan...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
        <Search size={32} className="text-text-muted" />
        <h1 className="text-xl font-bold text-text-primary mt-4">Pesanan Tidak Ditemukan</h1>
        <p className="text-text-secondary mt-2 text-sm">Order ID &quot;{orderId}&quot; tidak tersedia.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 bg-primary text-white px-6 py-2.5 rounded-full text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          Kembali ke Menu
        </button>
      </div>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen bg-white pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border-light px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-full bg-surface-secondary text-text-secondary active:scale-95 transition-transform"
            aria-label="Kembali"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Status Pesanan</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 mt-4">
        {/* Order ID Card */}
        <section className="bg-white rounded-2xl p-5 shadow-sm text-center">
          <p className="text-sm text-text-muted tracking-wider uppercase">Order ID</p>
          <p className="text-2xl font-bold text-primary mt-1">{order.id}</p>
          <p className="text-xs text-text-muted mt-1">
            {new Date(order.createdAt).toLocaleString('id-ID')}
          </p>
        </section>

        {/* Payment Section (if pending payment) */}
        {order.status === 'pending_payment' && (
          <section className="mt-4 bg-white rounded-2xl p-5 shadow-sm">
            {order.paymentMethod === 'cash' ? (
              <>
                <h2 className="font-bold text-text-primary mb-1 text-center">💵 Bayar di Kasir</h2>
                <div className="mt-4 bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-text-secondary">Total yang harus dibayar</p>
                  <p className="text-2xl font-bold text-primary mt-0.5">
                    Rp {order.total.toLocaleString('id-ID')}
                  </p>
                </div>
                <p className="text-sm text-text-secondary text-center mt-3">
                  Silakan bayar di kasir. Pesanan akan diproses setelah pembayaran dikonfirmasi.
                </p>
              </>
            ) : (
              <>
                <h2 className="font-bold text-text-primary mb-1 text-center">Scan QRIS untuk Bayar</h2>
                <p className="text-xs text-text-muted text-center mb-4">
                  Gunakan GoPay, OVO, DANA, ShopeePay, atau mobile banking
                </p>
                <div className="flex justify-center">
                  <img
                    src="/qris.jpg"
                    alt="QRIS GoPay Merchant"
                    className="w-56 h-56 object-contain rounded-xl border border-border"
                  />
                </div>
                <div className="mt-4 bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-text-secondary">Total yang harus dibayar</p>
                  <p className="text-2xl font-bold text-primary mt-0.5">
                    Rp {order.total.toLocaleString('id-ID')}
                  </p>
                </div>
                <p className="text-xs text-text-muted text-center mt-3">
                  Setelah bayar, tunggu admin mengkonfirmasi pembayaran kamu.
                  Halaman ini akan otomatis update.
                </p>
              </>
            )}
          </section>
        )}

        {/* Cancel Button (if pending payment) */}
        {order.status === 'pending_payment' && (
          <section className="mt-4">
            <button
              disabled={cancelling}
              onClick={async () => {
                if (!window.confirm('Yakin ingin membatalkan pesanan ini?')) return;
                setCancelling(true);
                try {
                  const { error } = await supabase
                    .from('orders')
                    .update({ status: 'cancelled' })
                    .eq('id', order.id);
                  if (error) throw error;
                  setOrder((prev) => ({ ...prev, status: 'cancelled' }));
                } catch {
                  alert('Gagal membatalkan pesanan');
                } finally {
                  setCancelling(false);
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl font-semibold text-sm active:scale-95 transition-transform disabled:opacity-60 border border-red-200"
            >
              {cancelling ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              Batalkan Pesanan
            </button>
          </section>
        )}

        {/* Status Stepper */}
        <section className="mt-4 bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-text-primary mb-4">Status</h2>
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={step.key} className="flex flex-col items-center flex-1 relative">
                  {idx > 0 && (
                    <div
                      className={`absolute top-4 right-1/2 w-full h-0.5 -z-10 ${
                        idx <= currentIdx ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                      isActive ? 'bg-primary text-white' : 'bg-surface-secondary text-text-muted'
                    } ${isCurrent ? 'scale-110' : ''}`}
                  >
                    <Icon size={16} />
                  </div>
                  <p
                    className={`text-xs mt-1.5 font-medium ${
                      isActive ? 'text-primary' : 'text-text-muted'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Customer Info */}
        <section className="mt-4 bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-text-primary mb-3">Info Pelanggan</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Nama</span>
              <span className="font-medium text-text-primary">{order.customer.name}</span>
            </div>
            {order.customer.note && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Catatan</span>
                <span className="font-medium text-text-primary text-right max-w-[60%]">{order.customer.note}</span>
              </div>
            )}
          </div>
        </section>

        {/* Items */}
        <section className="mt-4 bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-text-primary mb-3">Item Pesanan</h2>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.key} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-text-primary">
                    {item.product.name} <span className="text-text-muted">&times;{item.qty}</span>
                  </p>
                  <p className="text-xs text-text-muted">
                    {item.options.size} &middot; {item.options.temp} &middot; {item.options.sugar}
                  </p>
                </div>
                <p className="font-semibold text-text-primary">
                  Rp {((item.price ?? item.product.price) * item.qty).toLocaleString('id-ID')}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border-light flex items-center justify-between">
            <span className="font-semibold text-text-primary">Total</span>
            <span className="text-lg font-bold text-primary">
              Rp {order.total.toLocaleString('id-ID')}
            </span>
          </div>
        </section>

        {/* Pesan Lagi */}
        <button
          onClick={() => navigate('/')}
          className="w-full mt-6 bg-primary text-white py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform shadow-[var(--shadow-float)]"
        >
          Pesan Lagi
        </button>
      </main>
    </div>
  );
}
