import { createContext, useContext, useState, useEffect, useMemo } from 'react';

const CartContext = createContext(null);
const CART_STORAGE_KEY = 'order-kopi-cart';
const MAX_QTY = 20;

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function getPrice(product, size) {
    let basePrice;
    if (size === 'Small' && product.price_small != null) basePrice = product.price_small;
    else if (size === 'Large' && product.price_large != null) basePrice = product.price_large;
    else basePrice = product.price;

    // Apply discount if exists
    if (product.discount_percent && product.discount_percent > 0) {
      return Math.round(basePrice * (1 - product.discount_percent / 100));
    }
    return basePrice;
  }

  function addItem(product, options) {
    setItems((prev) => {
      const key = `${product.id}-${options.size}-${options.temp}-${options.sugar}`;
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        if (existing.qty >= MAX_QTY) return prev;
        return prev.map((i) => i.key === key ? { ...i, qty: i.qty + 1 } : i);
      }
      const price = getPrice(product, options.size);
      return [...prev, { key, product, options, price, qty: 1 }];
    });
  }

  function removeItem(key) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateQty(key, qty) {
    if (qty <= 0) {
      removeItem(key);
      return;
    }
    if (qty > MAX_QTY) return;
    setItems((prev) => prev.map((i) => i.key === key ? { ...i, qty } : i));
  }

  function clearCart() {
    setItems([]);
  }

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, i) => sum + (i.price ?? i.product.price) * i.qty, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart harus digunakan di dalam CartProvider');
  }
  return ctx;
}
