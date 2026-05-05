import { Plus } from 'lucide-react';

const PLACEHOLDER_IMG = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23e2e8f0" width="400" height="300"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="14">No Image</text></svg>';

export default function ProductCard({ product, onClick }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(product);
    }
  }

  const hasDiscount = product.discount_percent && product.discount_percent > 0;
  const discountedPrice = hasDiscount
    ? Math.round(product.price * (1 - product.discount_percent / 100))
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(product)}
      onKeyDown={handleKeyDown}
      className="bg-white rounded-2xl overflow-hidden shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      <div className="relative">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full aspect-square object-cover"
          loading="lazy"
          onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
        />
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            -{product.discount_percent}%
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold text-text-primary text-sm leading-tight">{product.name}</p>
        <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{product.description}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col">
            {hasDiscount ? (
              <>
                <span className="text-[11px] text-text-muted line-through leading-none">
                  Rp {product.price.toLocaleString('id-ID')}
                </span>
                <span className="text-primary font-bold text-sm leading-tight">
                  Rp {discountedPrice.toLocaleString('id-ID')}
                </span>
              </>
            ) : (
              <span className="text-primary font-bold text-sm">
                Rp {product.price.toLocaleString('id-ID')}
              </span>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(product); }}
            className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center hover:bg-primary hover:text-white active:scale-90 transition-all duration-150"
            aria-label={`Tambah ${product.name}`}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
