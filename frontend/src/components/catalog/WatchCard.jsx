import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock } from 'lucide-react';

export const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p);

export default function WatchCard({ watch }) {
  return (
    <Link to={`/catalogo/${watch.slug}`} className="product-card group" aria-label={`${watch.brand_name} ${watch.name}`}>
      <div className="product-card__media">
        {watch.stock === 0 && <span className="badge badge--danger product-card__tag">Agotado</span>}
        {watch.stock > 0 && watch.is_featured && <span className="badge badge--plain product-card__tag" style={{ color: '#141413', borderColor: 'rgba(20,20,19,.2)' }}>Destacado</span>}
        {watch.primary_image
          ? <img src={watch.primary_image} alt="" loading="lazy" />
          : <div className="absolute inset-0 grid place-items-center text-[#77746d]"><Clock size={48} strokeWidth={1} /></div>}
        <span className="product-card__cta" aria-hidden="true">Ver pieza <ArrowUpRight size={15} /></span>
      </div>
      <div className="product-card__meta">
        <div className="min-w-0">
          <p className="product-card__brand">{watch.brand_name}</p>
          <h3 className="product-card__name line-clamp-2">{watch.name}</h3>
        </div>
        <span className="price shrink-0 pt-5">{formatPrice(watch.price)}</span>
      </div>
    </Link>
  );
}
