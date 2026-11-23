import { useState, useEffect } from 'react';
import { Watch, Package, Users, TrendingUp, AlertTriangle, Tags } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Reveal from '../../components/common/Reveal';

const statusVariant = { pending: 'warn', paid: 'info', preparing: 'accent', shipped: 'info', delivered: 'success', cancelled: 'danger' };

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(p);
  useEffect(() => {
    api.get('/dashboard/stats/').then(({ data }) => setStats(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <LoadingSpinner text="Cargando panel..." />;
  if (!stats) return <div className="alert alert--danger">Error al cargar estadísticas</div>;
  const cards = [
    { label: 'Relojes', value: stats.total_watches, icon: Watch },
    { label: 'Sin stock', value: stats.out_of_stock, icon: AlertTriangle },
    { label: 'Pedidos', value: stats.total_orders, icon: Package },
    { label: 'Pendientes', value: stats.pending_orders, icon: Package },
    { label: 'Clientes', value: stats.total_customers, icon: Users },
    { label: 'Marcas', value: stats.total_brands, icon: Tags },
  ];
  return (
    <div className="grid gap-8">
      <div><p className="eyebrow eyebrow--accent mb-3">Vista general</p><h2 className="display-md">El pulso de <em>Cronos</em></h2></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c, i) => <Reveal key={c.label} delay={i * 70} className="card kpi">
          <c.icon size={20} strokeWidth={1.5} className="text-accent" />
          <span className="eyebrow">{c.label}</span>
          <span className="kpi__value num">{c.value}</span>
        </Reveal>)}
      </div>
      <Reveal delay={100} className="card">
        <div className="flex items-center gap-3 mb-5"><TrendingUp size={20} className="text-accent" /><span className="eyebrow">Ingresos totales</span></div>
        <p className="kpi__value num">{formatPrice(stats.total_revenue)}</p>
        <p className="body-sm mt-3">De pedidos confirmados</p>
      </Reveal>
      <Reveal delay={160}>
        <h2 className="display-sm mb-5">Pedidos <em>recientes</em></h2>
        {stats.recent_orders?.length === 0 ? <div className="card text-mute">No hay pedidos aún.</div> : <div className="table-wrap">
          <table className="table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>{stats.recent_orders.map((o) => <tr key={o.order_number}>
              <td className="num">{o.order_number}</td><td>{o.customer}</td><td className="price">{formatPrice(o.total)}</td>
              <td><span className={`badge badge--${statusVariant[o.status] || 'accent'}`}>{o.status_display}</span></td>
              <td className="body-sm">{new Date(o.created_at).toLocaleDateString('es-PE')}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </Reveal>
    </div>
  );
}
