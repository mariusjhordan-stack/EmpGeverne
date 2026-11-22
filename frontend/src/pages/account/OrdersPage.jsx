import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SectionHeader from '../../components/common/SectionHeader';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(p);

  useEffect(() => {
    api.get('/orders/')
      .then(({ data }) => setOrders(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Cargando pedidos..." />;

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-blue-100 text-blue-700',
    preparing: 'bg-purple-100 text-purple-700',
    shipped: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="page-wrap orders-page editorial-section animate-fade-in">
      <SectionHeader titleAs="h1" eyebrow="Su actividad" title={<>Mis <em>pedidos</em></>} />
      {orders.length === 0 ? (
        <div className="empty-state text-center py-20">
          <Package className="mx-auto mb-4 text-gray-300" size={48} />
          <p className="text-gray-500 mb-4">No tienes pedidos aún</p>
          <Link to="/catalogo" className="text-sm text-gold hover:text-gold-dark">Explorar catálogo</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} to={`/pedidos/${order.order_number}`}
              className="order-row block bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-charcoal">{order.order_number}</span>
                <span className={`text-xs px-3 py-1 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                  {order.status_display}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{new Date(order.created_at).toLocaleDateString('es-PE')}</span>
                <span className="font-medium text-charcoal">{formatPrice(order.total)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
