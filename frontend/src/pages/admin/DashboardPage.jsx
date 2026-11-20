import { useState, useEffect } from 'react';
import { Watch, Package, Users, TrendingUp, AlertTriangle, Tags } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(p);

  useEffect(() => {
    api.get('/dashboard/stats/')
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Cargando dashboard..." />;
  if (!stats) return <p className="text-gray-500">Error al cargar estadísticas</p>;

  const cards = [
    { label: 'Relojes', value: stats.total_watches, icon: Watch, color: 'text-blue-600 bg-blue-50' },
    { label: 'Sin stock', value: stats.out_of_stock, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'Pedidos', value: stats.total_orders, icon: Package, color: 'text-purple-600 bg-purple-50' },
    { label: 'Pendientes', value: stats.pending_orders, icon: Package, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Clientes', value: stats.total_customers, icon: Users, color: 'text-green-600 bg-green-50' },
    { label: 'Marcas', value: stats.total_brands, icon: Tags, color: 'text-indigo-600 bg-indigo-50' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-charcoal mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-lg p-4 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon size={20} />
            </div>
            <p className="text-2xl font-semibold text-charcoal">{c.value}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-gold" />
          <h2 className="text-lg font-semibold text-charcoal">Ingresos Totales</h2>
        </div>
        <p className="text-3xl font-semibold text-charcoal">{formatPrice(stats.total_revenue)}</p>
        <p className="text-xs text-gray-500 mt-1">De pedidos confirmados</p>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-charcoal mb-4">Pedidos Recientes</h2>
        {stats.recent_orders?.length === 0 ? (
          <p className="text-sm text-gray-500">No hay pedidos aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 border-b">
                <th className="pb-3">Pedido</th><th className="pb-3">Cliente</th><th className="pb-3">Total</th><th className="pb-3">Estado</th><th className="pb-3">Fecha</th>
              </tr></thead>
              <tbody>
                {stats.recent_orders.map((o) => (
                  <tr key={o.order_number} className="border-b border-gray-50">
                    <td className="py-3 font-medium">{o.order_number}</td>
                    <td className="py-3 text-gray-600">{o.customer}</td>
                    <td className="py-3">{formatPrice(o.total)}</td>
                    <td className="py-3"><span className="text-xs px-2 py-1 rounded-full bg-gray-100">{o.status_display}</span></td>
                    <td className="py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString('es-PE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
