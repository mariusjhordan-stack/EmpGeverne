import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowUpRight } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { PageHero } from '../../components/common/SectionHeader';
import Reveal from '../../components/common/Reveal';
import Button from '../../components/common/Button';

const statusVariant = { pending: 'warn', paid: 'info', preparing: 'accent', shipped: 'info', delivered: 'success', cancelled: 'danger' };

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(p);
  useEffect(() => {
    api.get('/orders/').then(({ data }) => setOrders(data.results || data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <LoadingSpinner text="Cargando pedidos..." />;
  return (
    <>
      <PageHero eyebrow="Su actividad" title={<>Mis <em>pedidos</em></>} description="El recorrido de cada pieza hasta sus manos." />
      <div className="container section--tight">
        {orders.length === 0 ? (
          <Reveal className="empty-state">
            <Package size={40} strokeWidth={1} className="text-accent" />
            <h2 className="display-sm">Aún no tiene <em>pedidos</em></h2>
            <Button as={Link} to="/catalogo">Explorar catálogo</Button>
          </Reveal>
        ) : (
          <div className="grid gap-4">
            {orders.map((order, i) => (
              <Reveal key={order.id} delay={Math.min(i, 5) * 70}>
                <Link to={`/pedidos/${order.order_number}`} className="card card--hover flex flex-wrap items-center justify-between gap-5">
                  <div className="grid gap-2">
                    <span className="eyebrow">Pedido</span>
                    <span className="num text-accent">{order.order_number}</span>
                    <span className="body-sm">{new Date(order.created_at).toLocaleDateString('es-PE')}</span>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-8">
                    <span className="body-sm">{order.item_count} {order.item_count === 1 ? 'pieza' : 'piezas'}</span>
                    <span className="price">{formatPrice(order.total)}</span>
                    <span className={`badge badge--${statusVariant[order.status] || 'accent'}`}>{order.status_display}</span>
                    <ArrowUpRight size={18} className="text-accent" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
