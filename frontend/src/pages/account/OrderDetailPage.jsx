import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { PageHero } from '../../components/common/SectionHeader';
import Reveal from '../../components/common/Reveal';
import OrderPieces from '../../components/checkout/OrderPieces';
import ReceiptNotice from '../../components/checkout/ReceiptNotice';

const statusVariant = { pending: 'warn', paid: 'info', preparing: 'accent', shipped: 'info', delivered: 'success', cancelled: 'danger' };
const stages = [{ key: 'pending', label: 'Pedido recibido' }, { key: 'paid', label: 'Pago registrado' }, { key: 'preparing', label: 'En preparación' }, { key: 'shipped', label: 'En camino' }, { key: 'delivered', label: 'Entregado' }];

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(p);
  useEffect(() => {
    api.get(`/orders/${orderNumber}/`).then(({ data }) => setOrder(data)).catch(() => {}).finally(() => setLoading(false));
  }, [orderNumber]);
  if (loading) return <LoadingSpinner text="Cargando pedido..." />;
  if (!order) return <><PageHero eyebrow="Pedidos" title={<>Pedido no <em>encontrado</em></>} /><div className="container section--tight"><Link to="/pedidos" className="btn-link">Volver a mis pedidos</Link></div></>;
  const currentStage = stages.findIndex((stage) => stage.key === order.status);
  return (
    <>
      <PageHero eyebrow="Detalle del pedido" title={<>Pedido <em>{order.order_number}</em></>} description={`Realizado el ${new Date(order.created_at).toLocaleDateString('es-PE')}`}>
        <div className="flex flex-wrap items-center gap-5">
          <span className={`badge badge--${statusVariant[order.status] || 'accent'}`}>{order.status_display}</span>
          <Link to="/pedidos" className="btn-link"><ArrowLeft size={16} /> Mis pedidos</Link>
        </div>
      </PageHero>
      <div className="container section--tight grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="grid gap-6">
          <Reveal className="card">
            <p className="eyebrow eyebrow--accent mb-3">Su selección</p>
            <h2 className="card-title mb-6">Piezas del pedido</h2>
            <OrderPieces items={order.items} />
          </Reveal>
          <Reveal delay={80} className="card">
            <p className="eyebrow eyebrow--accent mb-3">Destino</p>
            <h2 className="card-title mb-5">Dirección de envío</h2>
            <p className="text-dim">{order.shipping_street}<br />{order.shipping_city}, {order.shipping_state} {order.shipping_postal_code}<br />{order.shipping_country}</p>
          </Reveal>
          {order.payment && <Reveal delay={120} className="card">
            <p className="eyebrow eyebrow--accent mb-3">Transacción</p>
            <h2 className="card-title mb-5">Pago</h2>
            <dl className="spec-list">
              <div className="spec-row"><dt>Método</dt><dd>{order.payment.method_display}</dd></div>
              <div className="spec-row"><dt>Referencia</dt><dd className="num">{order.payment.reference}</dd></div>
              <div className="spec-row"><dt>Monto</dt><dd className="price">{formatPrice(order.payment.amount)}</dd></div>
            </dl>
            {order.payment.is_demo && <p className="body-sm mt-4">Pago de demostración académica</p>}
            <ReceiptNotice order={order} className="mt-6" />
          </Reveal>}
        </div>
        <div className="grid gap-6 lg:sticky lg:top-24">
          <Reveal delay={100} className="card">
            <p className="eyebrow eyebrow--accent mb-3">Importes</p>
            <h2 className="card-title mb-5">Total del pedido</h2>
            <dl className="spec-list">
              <div className="spec-row"><dt>Subtotal</dt><dd className="num">{formatPrice(order.subtotal)}</dd></div>
              <div className="spec-row"><dt>IGV (18 %)</dt><dd className="num">{formatPrice(order.tax)}</dd></div>
              <div className="spec-row"><dt>Total</dt><dd className="price price--lg">{formatPrice(order.total)}</dd></div>
            </dl>
          </Reveal>
          <Reveal delay={160} className="card">
            <p className="eyebrow eyebrow--accent mb-3">Seguimiento</p>
            <h2 className="card-title mb-6">Recorrido</h2>
            {order.status === 'cancelled' ? <span className="badge badge--danger">Pedido cancelado</span> : (
              <ol className="grid gap-0">
                {stages.map((stage, i) => <li key={stage.key} className="flex gap-4">
                  <div className="flex flex-col items-center"><span className={`badge badge--plain ${i <= currentStage ? 'badge--accent' : ''}`}>{String(i + 1).padStart(2, '0')}</span>{i < stages.length - 1 && <span className="divider w-px min-h-8" />}</div>
                  <span className={i <= currentStage ? 'text-dim pt-0.5' : 'text-mute pt-0.5'}>{stage.label}</span>
                </li>)}
              </ol>
            )}
          </Reveal>
        </div>
      </div>
    </>
  );
}
