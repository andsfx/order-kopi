import { ShoppingBag } from 'lucide-react';
import { useCart } from '../lib/CartContext';

export default function FloatingCart({ onCheckout }) {
  const { totalItems, totalPrice } = useCart();

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 right-5 z-50 max-w-lg mx-auto">
      <button
        onClick={onCheckout}
        className="w-full bg-primary text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-float)] active:scale-[0.98] transition-transform duration-150"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2">
            <ShoppingBag size={18} />
          </div>
          <span className="font-semibold text-sm">{totalItems} item</span>
        </div>
        <span className="font-bold text-sm">
          Rp {totalPrice.toLocaleString('id-ID')}
        </span>
        <div className="bg-white/20 rounded-lg px-3 py-1"><span className="font-semibold text-xs">Checkout</span></div>
      </button>
    </div>
  );
}
