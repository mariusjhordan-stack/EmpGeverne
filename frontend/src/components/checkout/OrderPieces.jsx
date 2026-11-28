import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import Reveal from '../common/Reveal';

const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(p);

/** Piezas de un pedido con su foto (la del catálogo), marca, referencia, cantidad e importe. */
export default function OrderPieces({ items = [], compact = false }) {
  const well = compact ? 'h-16 w-16' : 'h-20 w-20';
  return (
    <div>
      <div className="divider" />
      {items.map((item, i) => {
        const photo = item.watch_image
          ? <img src={item.watch_image} alt={item.watch_name} className="!object-contain" loading="lazy" />
          : <div className="grid h-full place-items-center"><Package size={22} className="text-mute" /></div>;
        return (
          <Reveal key={item.id} delay={Math.min(i, 5) * 70}>
            <div className={`flex items-center gap-4 ${compact ? 'py-4' : 'py-5'}`}>
              {item.watch_slug
                ? <Link to={`/catalogo/${item.watch_slug}`} className={`media-well ${well} shrink-0`} aria-label={`Ver ${item.watch_name}`}>{photo}</Link>
                : <div className={`media-well ${well} shrink-0`}>{photo}</div>}
              <div className="min-w-0 flex-1">
                <p className="eyebrow truncate">{item.watch_brand} · Ref. {item.watch_reference}</p>
                <p className={`${compact ? 'card-title' : 'display-sm'} mt-1`}>{item.watch_name}</p>
                <p className="body-sm mt-1">{item.quantity} × <span className="num">{formatPrice(item.unit_price)}</span></p>
              </div>
              <span className="price shrink-0">{formatPrice(item.subtotal)}</span>
            </div>
            <div className="divider" />
          </Reveal>
        );
      })}
    </div>
  );
}
