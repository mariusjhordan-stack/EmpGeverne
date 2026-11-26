import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock } from 'lucide-react';

export const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p);

const isRender = (url) => /\/3d\//.test(url ?? '');

/* Inclina la lámina hacia el mouse y mueve el reflejo (solo con mouse). */
function tilt(e) {
  if (e.pointerType !== 'mouse') return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width;
  const py = (e.clientY - r.top) / r.height;
  el.style.setProperty('--ry', `${((px - 0.5) * 7).toFixed(2)}deg`);
  el.style.setProperty('--rx', `${((0.5 - py) * 7).toFixed(2)}deg`);
  el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
  el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
}
function untilt(e) {
  const el = e.currentTarget;
  el.style.setProperty('--rx', '0deg');
  el.style.setProperty('--ry', '0deg');
}

/** Lámina del reloj: render 3D de frente y, al pasar el mouse, el detalle. */
export default function WatchCard({ watch, index }) {
  const primary = watch.primary_image;
  const alt = isRender(primary) ? watch.secondary_image : null;
  return (
    <Link to={`/catalogo/${watch.slug}`} className="product-card group" aria-label={`${watch.brand_name} ${watch.name}`} data-cursor="Ver">
      <div className="product-card__media" onPointerMove={tilt} onPointerLeave={untilt}>
        {watch.stock === 0 && <span className="badge badge--danger product-card__tag">Agotado</span>}
        {watch.stock > 0 && watch.is_featured && <span className="badge badge--accent product-card__tag">Destacado</span>}
        {index !== undefined && <span className="product-card__no" aria-hidden="true">N° {String(index + 1).padStart(3, '0')}</span>}
        {primary
          ? <img src={primary} alt="" loading="lazy" className={isRender(primary) ? '' : 'is-photo'} />
          : <div className="absolute inset-0 grid place-items-center text-mute"><Clock size={48} strokeWidth={1} /></div>}
        {alt && <img src={alt} alt="" loading="lazy" className="alt" />}
        <span className="product-card__sheen" aria-hidden="true" />
        <span className="product-card__cta" aria-hidden="true">Descubrir la pieza <ArrowUpRight size={15} /></span>
      </div>
      <div className="product-card__meta">
        <div className="min-w-0">
          <p className="product-card__brand">{watch.brand_name}{watch.reference ? <span className="opacity-60"> · {watch.reference}</span> : null}</p>
          <h3 className="product-card__name line-clamp-2">{watch.name}</h3>
        </div>
        <span className="price shrink-0 pt-5">{formatPrice(watch.price)}</span>
      </div>
    </Link>
  );
}
