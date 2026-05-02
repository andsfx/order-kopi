import { useState, useRef, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, X, AlertTriangle } from 'lucide-react';
import { promos, promoThemes } from '../lib/mockData';
import { useProducts } from '../lib/useProducts';
import { useCart } from '../lib/CartContext';
import { useStoreStatus } from '../lib/useStoreStatus';
import ProductCard from '../components/ProductCard';
import FloatingCart from '../components/FloatingCart';
import CartDrawer from '../components/CartDrawer';
import { useEscapeKey, useBodyScrollLock } from '../lib/useEscapeKey';

export default function Home() {
  const { products, categories, loading, error } = useProducts();
  const { isOpen, loading: storeLoading } = useStoreStatus();
  const [activeCategory, setActiveCategory] = useState(null); // null = use first category when loaded
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [options, setOptions] = useState({ size: 'Regular', temp: 'Iced', sugar: 'Normal' });
  const [showCart, setShowCart] = useState(false);
  const { addItem } = useCart();
  const promoRef = useRef(null);

  useEscapeKey(() => setSelectedProduct(null), !!selectedProduct);
  useBodyScrollLock(!!selectedProduct || showCart);

  // Default to first real category (not "Semua") when products load
  const effectiveCategory = activeCategory || (categories.length > 1 ? categories[1] : 'Semua');

  const filtered = useMemo(() => {
    if (search.trim()) {
      // When searching, search across ALL categories
      return products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    return products.filter((p) => {
      return effectiveCategory === 'Semua' || p.category === effectiveCategory;
    });
  }, [products, effectiveCategory, search]);

  function getSelectedPrice() {
    if (!selectedProduct) return 0;
    if (options.size === 'Small' && selectedProduct.price_small != null) return selectedProduct.price_small;
    if (options.size === 'Large' && selectedProduct.price_large != null) return selectedProduct.price_large;
    return selectedProduct.price;
  }

  // Get available sizes for a product
  function getAvailableSizes(product) {
    if (!product) return [];
    const sizes = [];
    if (product.price_small != null) sizes.push('Small');
    sizes.push('Regular');
    if (product.price_large != null) sizes.push('Large');
    return sizes;
  }

  function handleAddToCart() {
    if (!selectedProduct) return;
    addItem(selectedProduct, options);
    setSelectedProduct(null);
    setOptions({ size: 'Regular', temp: 'Iced', sugar: 'Normal' });
  }

  function scrollPromo(dir) {
    if (!promoRef.current) return;
    promoRef.current.scrollBy({ left: dir * 260, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border-light px-4 py-3">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-text-primary">Order Kopi</h1>
          <div className="relative mt-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Cari menu..."
              aria-label="Cari menu"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-secondary text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4">
        {/* Store Closed Banner */}
        {!storeLoading && !isOpen && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700 text-sm">Toko sedang tutup</p>
              <p className="text-xs text-red-500 mt-0.5">Pesanan tidak dapat dilakukan saat ini.</p>
            </div>
          </div>
        )}

        {/* Promo Banner */}
        <section className="mt-4 relative">
          <div ref={promoRef} className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
            {promos.map((promo) => (
              <div
                key={promo.id}
                className={`flex-shrink-0 w-64 h-32 rounded-2xl bg-gradient-to-r ${promoThemes[promo.theme]} relative overflow-hidden snap-start`}
              >
                <div className="absolute inset-0 p-4 flex flex-col justify-end z-10">
                  <p className="text-white font-bold text-sm">{promo.title}</p>
                  <p className="text-white/80 text-xs mt-0.5">{promo.subtitle}</p>
                </div>
                <img
                  src={promo.image_url}
                  alt={promo.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => scrollPromo(-1)}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow hidden sm:block"
            aria-label="Promo sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scrollPromo(1)}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow hidden sm:block"
            aria-label="Promo berikutnya"
          >
            <ChevronRight size={16} />
          </button>
        </section>

        {/* Kategori */}
        <section className="mt-5 sticky top-[72px] z-30 bg-white pt-1 pb-2 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  effectiveCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-surface-secondary text-text-secondary hover:bg-surface-accent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Grid Produk */}
        {!loading && !error && filtered.length > 0 && !search.trim() && (
          <div className="mt-3 mb-2 flex items-center justify-between">
            <h2 className="font-bold text-text-primary text-sm">{effectiveCategory}</h2>
            <span className="text-xs text-text-muted">{filtered.length} menu</span>
          </div>
        )}
        <section className={`${!loading && !error && filtered.length > 0 && !search.trim() ? '' : 'mt-4'} grid grid-cols-2 gap-3`}>
          {loading ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-[var(--shadow-card)] animate-pulse">
                  <div className="w-full aspect-square bg-surface-secondary" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-surface-secondary rounded w-3/4" />
                    <div className="h-3 bg-surface-secondary rounded w-1/2" />
                    <div className="h-4 bg-surface-secondary rounded w-1/3" />
                  </div>
                </div>
              ))}
            </>
          ) : error ? (
            <div className="col-span-2 text-center py-12">
              <AlertTriangle size={32} className="text-warning mx-auto" />
              <p className="text-red-500 text-sm mt-2">Gagal memuat menu</p>
              <p className="text-text-muted text-xs mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 bg-primary text-white px-5 py-2 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                Coba Lagi
              </button>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={setSelectedProduct}
              />
            ))
          ) : (
            <p className="col-span-2 text-center text-text-muted text-sm py-12">
              Menu tidak ditemukan
            </p>
          )}
        </section>
      </main>

      {/* Floating Cart */}
      <FloatingCart onCheckout={() => setShowCart(true)} />

      {/* Cart Drawer */}
      <CartDrawer open={showCart} onClose={() => setShowCart(false)} />

      {/* Modal Opsi Produk */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setSelectedProduct(null)}
        >
           <div
            className="bg-white w-full max-w-lg rounded-t-[28px] p-5 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-border" /></div>
            <div className="flex justify-end mb-2">
              <button onClick={() => setSelectedProduct(null)} className="p-1.5 rounded-xl bg-surface-secondary text-text-secondary" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-4">
              <img
                src={selectedProduct.image_url}
                alt={selectedProduct.name}
                className="w-24 h-24 rounded-2xl object-cover"
              />
              <div>
                <h2 className="font-bold text-lg text-text-primary">{selectedProduct.name}</h2>
                <p className="text-sm text-text-muted mt-0.5">{selectedProduct.description}</p>
                <p className="text-primary font-bold mt-1">
                  Rp {getSelectedPrice().toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {/* Opsi Size */}
            {selectedProduct.category !== 'Pastry' && selectedProduct.category !== 'Fore Deli' && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-text-primary mb-2">Ukuran</p>
                <div className="flex gap-2">
                  {getAvailableSizes(selectedProduct).map((s) => (
                    <button
                      key={s}
                      onClick={() => setOptions((o) => ({ ...o, size: s }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                        options.size === s
                          ? 'bg-primary text-white'
                          : 'bg-surface-secondary text-text-secondary'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Opsi Suhu */}
            {selectedProduct.category !== 'Pastry' && (
              <div className="mt-3">
                <p className="text-sm font-semibold text-text-primary mb-2">Suhu</p>
                <div className="flex gap-2">
                  {['Hot', 'Iced'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setOptions((o) => ({ ...o, temp: t }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                        options.temp === t
                          ? 'bg-primary text-white'
                          : 'bg-surface-secondary text-text-secondary'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Opsi Gula */}
            {selectedProduct.category !== 'Pastry' && (
              <div className="mt-3">
                <p className="text-sm font-semibold text-text-primary mb-2">Gula</p>
                <div className="flex gap-2">
                  {['Less', 'Normal', 'Extra'].map((g) => (
                    <button
                      key={g}
                      onClick={() => setOptions((o) => ({ ...o, sugar: g }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                        options.sugar === g
                          ? 'bg-primary text-white'
                          : 'bg-surface-secondary text-text-secondary'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={!isOpen}
              className="w-full mt-5 bg-primary text-white py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform shadow-[var(--shadow-float)] disabled:opacity-50 disabled:active:scale-100"
            >
              {isOpen ? 'Tambah ke Keranjang' : 'Toko Sedang Tutup'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
