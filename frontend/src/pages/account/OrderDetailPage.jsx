import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(p);

  useEffect(() => {
    api.get(`/orders/${orderNumber}/`)
      .then(({ data }) => setOrder(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) return <LoadingSpinner text="Cargando pedido..." />;
  if (!order) return <div className="max-w-4xl mx-auto px-4 py-10"><p className="text-gray-500">Pedido no encontrado</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link to="/pedidos" className="flex items-center gap-2 text-sm text-gray-500 hover:text-charcoal mb-8">
        <ArrowLeft size={16} /> Mis pedidos
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-2xl text-charcoal">Pedido {order.order_number}</h1>
        <span className="text-sm px-4 py-1.5 rounded-full bg-gold/10 text-gold-dark">{order.status_display}</span>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-charcoal mb-4">PRODUCTOS</h2>
        <div className="space-y-3">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium">{item.watch_name}</p>
                <p className="text-xs text-gray-500">{item.watch_brand} · Ref. {item.watch_reference}</p>
              </div>
              <div className="text-right">
                <p className="text-sm">{item.quantity} × {formatPrice(item.unit_price)}</p>
                <p className="text-sm font-semibold">{formatPrice(item.subtotal)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t mt-4 pt-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">IGV</span><span>{formatPrice(order.tax)}</span></div>
          <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>{formatPrice(order.total)}</span></div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-charcoal mb-3">DIRECCIÓN DE ENVÍO</h2>
          <p className="text-sm text-gray-600">{order.shipping_street}</p>
          <p className="text-sm text-gray-600">{order.shipping_city}, {order.shipping_state} {order.shipping_postal_code}</p>
          <p className="text-sm text-gray-600">{order.shipping_country}</p>
        </div>
        {order.payment && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-charcoal mb-3">PAGO</h2>
            <p className="text-sm text-gray-600">Método: {order.payment.method === 'demo_card' ? 'Tarjeta de demostración' : 'Transferencia de demostración'}</p>
            <p className="text-sm text-gray-600">Referencia: {order.payment.reference}</p>
            <p className="text-sm text-gray-600">Monto: {formatPrice(order.payment.amount)}</p>
            {order.payment.is_demo && <p className="text-xs text-amber-600 mt-2">Pago de demostración académica</p>}
          </div>
        )}
      </div>
    </div>
  );
}
