import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { PageHero } from '../../components/common/SectionHeader';
import Reveal from '../../components/common/Reveal';
import Button from '../../components/common/Button';

export default function CartPage() {
  const { cart, loading, updateQuantity, removeItem, clearCart } = useCart();
  const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(p);
  if (loading) return <LoadingSpinner text="Cargando carrito..." />;
  const items = cart?.items || [];

  return (
    <>
      <PageHero eyebrow="Su selección" title={<>Carrito de <em>compras</em></>} description="Revise las piezas seleccionadas antes de continuar." />
      <div className="container section--tight">
        {items.length === 0 ? (
          <Reveal className="empty-state">
            <ShoppingBag size={40} strokeWidth={1} className="text-accent" />
            <h2 className="display-sm">Su carrito está <em>vacío</em></h2>
            <p className="text-dim">Descubra la pieza que acompañará su próxima historia.</p>
            <Button as={Link} to="/catalogo">Explorar catálogo <ArrowRight size={16} /></Button>
          </Reveal>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div>
              <Reveal className="flex items-center justify-between gap-4 mb-6">
                <p className="eyebrow">{items.length} {items.length === 1 ? 'pieza' : 'piezas'}</p>
                <button onClick={clearCart} className="btn-link text-accent">Vaciar carrito</button>
              </Reveal>
              <div className="divider" />
              {items.map((item, i) => (
                <Reveal key={item.id} delay={Math.min(i, 5) * 70}>
                  <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 py-6 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center">
                    <div className="media-well h-24 w-24">
                      {item.watch_image ? <img src={item.watch_image} alt={item.watch_name} className="p-2" /> : <div className="grid h-full place-items-center body-sm">Sin imagen</div>}
                    </div>
                    <div className="min-w-0">
                      <p className="eyebrow eyebrow--accent">{item.watch_brand}</p>
                      <Link to={`/catalogo/${item.watch_slug}`} className="display-sm block mt-2">{item.watch_name}</Link>
                      <p className="body-sm mt-2"><span className="num">{formatPrice(item.watch_price)}</span> por unidad</p>
                      <button onClick={() => removeItem(item.id)} className="btn-link body-sm mt-3"><Trash2 size={14} /> Quitar</button>
                    </div>
                    <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end">
                      <p className="price">{formatPrice(item.subtotal)}</p>
                      <div className="flex items-center gap-2">
                        <button aria-label={`Reducir ${item.watch_name}`} onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="btn-icon"><Minus size={14} /></button>
                        <span className="num min-w-6 text-center">{item.quantity}</span>
                        <button aria-label={`Aumentar ${item.watch_name}`} onClick={() => updateQuantity(item.id, Math.min(item.watch_stock, item.quantity + 1))} className="btn-icon"><Plus size={14} /></button>
                      </div>
                    </div>
                  </div>
                  <div className="divider" />
                </Reveal>
              ))}
            </div>
            <Reveal delay={150} className="card lg:sticky lg:top-24">
              <p className="eyebrow eyebrow--accent mb-4">Resumen de compra</p>
              <h2 className="card-title mb-6">Su selección</h2>
              <div className="spec-list mb-6">
                <div className="spec-row"><span>Piezas</span><span className="num">{items.reduce((sum, item) => sum + item.quantity, 0)}</span></div>
                <div className="spec-row"><span>Total</span><span className="price price--lg">{formatPrice(cart?.total || 0)}</span></div>
              </div>
              <Button as={Link} to="/checkout" size="lg" block>Continuar al pago <ArrowRight size={17} /></Button>
            </Reveal>
          </div>
        )}
      </div>
    </>
  );
}
