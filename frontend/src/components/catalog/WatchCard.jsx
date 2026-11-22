import { Link } from 'react-router-dom';

export default function WatchCard({ watch }) {
  const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(p);

  return (
    <Link to={`/catalogo/${watch.slug}`} className="product-card group">
      <div className="product-image-wrap aspect-square overflow-hidden">
        {watch.primary_image ? (
          <img src={watch.primary_image} alt={watch.name} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-700 ease-out" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        )}
      </div>
      <div className="product-info">
        <p className="text-[.62rem] text-gold tracking-[.15em] uppercase mb-2">{watch.brand_name}</p>
        <h3 className="product-name text-charcoal mb-3 line-clamp-1 group-hover:text-gold transition-colors duration-300">{watch.name}</h3>
        <div className="flex items-center justify-between">
          <span className="product-price">{formatPrice(watch.price)}</span>
          {watch.stock === 0 && <span className="text-xs text-red-500">Agotado</span>}
        </div>
      </div>
    </Link>
  );
}
