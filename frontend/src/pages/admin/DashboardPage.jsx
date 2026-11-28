import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Watch, Package, Users, Tags, ArrowUpRight, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Reveal from '../../components/common/Reveal';

const statusVariant = { pending: 'warn', paid: 'info', preparing: 'accent', shipped: 'info', delivered: 'success', cancelled: 'danger' };
const statusMeta = [
  { key: 'pending', label: 'Pendientes', color: '#c9a227' },
  { key: 'paid', label: 'Pagados', color: '#86591a' },
  { key: 'preparing', label: 'En preparación', color: '#b88a4a' },
  { key: 'shipped', label: 'Enviados', color: '#5d6b7a' },
  { key: 'delivered', label: 'Entregados', color: '#3f7a52' },
  { key: 'cancelled', label: 'Cancelados', color: '#a94436' },
];

const money = (p, digits = 2) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(Number(p) || 0);

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

/** Gráfico de área de las ventas de 14 días (SVG propio, sin librerías). */
function SalesChart({ days }) {
  const W = 640, H = 180, PAD = 6;
  const values = days.map((d) => Number(d.revenue));
  const max = Math.max(...values, 1);
  const x = (i) => PAD + (i * (W - PAD * 2)) / Math.max(days.length - 1, 1);
  const y = (v) => H - PAD - (v / max) * (H - PAD * 2 - 18);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  const fmt = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="admin-chart" preserveAspectRatio="none" role="img" aria-label="Ventas de los últimos 14 días">
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d6b779" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#d6b779" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => <line key={t} x1="0" x2={W} y1={H * t} y2={H * t} stroke="rgba(242,239,232,.08)" strokeDasharray="3 5" />)}
        <path d={area} fill="url(#salesFill)" />
        <path d={line} fill="none" stroke="#d6b779" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {values.map((v, i) => v > 0 && <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill="#0c0c0e" stroke="#d6b779" strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
      </svg>
      <div className="admin-chart__axis"><span>{fmt(days[0].date)}</span><span>{fmt(days[Math.floor(days.length / 2)].date)}</span><span>Hoy</span></div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/dashboard/stats/').then(({ data }) => setStats(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const statusRows = useMemo(() => {
    if (!stats) return [];
    const total = Object.values(stats.orders_by_status || {}).reduce((a, b) => a + b, 0) || 1;
    return statusMeta.map((s) => ({ ...s, count: stats.orders_by_status?.[s.key] || 0, pct: ((stats.orders_by_status?.[s.key] || 0) / total) * 100 }));
  }, [stats]);

  if (loading) return <LoadingSpinner text="Cargando panel..." />;
  if (!stats) return <div className="alert alert--danger">Error al cargar estadísticas</div>;

  const week = stats.sales_by_day?.slice(-7).reduce((a, d) => a + Number(d.revenue), 0) || 0;
  const kpis = [
    { label: 'Pedidos', value: stats.total_orders, note: `${stats.pending_orders} pendientes`, icon: Package, to: '/admin/pedidos' },
    { label: 'Clientes', value: stats.total_customers, note: 'cuentas registradas', icon: Users, to: '/admin/clientes' },
    { label: 'Relojes activos', value: stats.active_watches, note: `${stats.out_of_stock} sin stock`, icon: Watch, to: '/admin/relojes', warn: stats.out_of_stock > 0 },
    { label: 'Casas', value: stats.total_brands, note: 'marcas activas', icon: Tags, to: '/admin/marcas' },
  ];
  const today = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow eyebrow--accent mb-3">Vista general · <span className="capitalize">{today}</span></p>
          <h2 className="display-md">{greeting()}, <em>{user?.first_name || 'Administrador'}</em></h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/pedidos" className="btn btn-ghost btn-sm">Ver pedidos</Link>
          <Link to="/admin/relojes" className="btn btn-sm">Gestionar relojes</Link>
        </div>
      </div>

      <Reveal className="admin-hero">
        <div className="admin-hero__head">
          <div>
            <p className="admin-hero__label">Ingresos confirmados</p>
            <p className="admin-hero__value">{money(stats.total_revenue)}</p>
          </div>
          <dl className="admin-hero__facts">
            <div><dt>Últimos 7 días</dt><dd>{money(week, 0)}</dd></div>
            <div><dt>Ticket promedio</dt><dd>{money(stats.avg_ticket, 0)}</dd></div>
            <div><dt>Pedidos pagados</dt><dd>{stats.paid_orders}</dd></div>
          </dl>
        </div>
        {stats.sales_by_day?.length > 0 && <SalesChart days={stats.sales_by_day} />}
      </Reveal>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <Reveal key={k.label} delay={i * 60}>
            <Link to={k.to} className="admin-kpi">
              <span className="admin-kpi__icon"><k.icon size={18} strokeWidth={1.6} /></span>
              <span className="admin-kpi__label">{k.label}</span>
              <span className="admin-kpi__value num">{k.value}</span>
              <span className={`admin-kpi__note ${k.warn ? 'is-warn' : ''}`}>{k.note}</span>
              <ArrowUpRight size={15} className="admin-kpi__go" />
            </Link>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Reveal className="card admin-panel">
          <p className="eyebrow eyebrow--accent mb-2">Pedidos</p>
          <h3 className="card-title mb-5">Por estado</h3>
          <div className="admin-stack" aria-hidden="true">
            {statusRows.filter((s) => s.count).map((s) => <span key={s.key} style={{ width: `${s.pct}%`, background: s.color }} />)}
          </div>
          <ul className="mt-5 grid gap-3">
            {statusRows.map((s) => (
              <li key={s.key} className="flex items-center gap-3 text-sm">
                <span className="admin-dot" style={{ background: s.color }} />
                <span className="flex-1 text-dim">{s.label}</span>
                <span className="num">{s.count}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={80} className="card admin-panel">
          <p className="eyebrow eyebrow--accent mb-2">Ventas</p>
          <h3 className="card-title mb-5">Más vendidos</h3>
          {stats.top_watches?.length ? (
            <ol className="grid gap-4">
              {stats.top_watches.map((w, i) => (
                <li key={w.id ?? w.name} className="flex items-center gap-3">
                  <span className="admin-rank">{String(i + 1).padStart(2, '0')}</span>
                  <span className="admin-thumb">{w.image && <img src={w.image} alt="" />}</span>
                  <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{w.name}</strong><small className="text-mute">{w.brand} · {w.units} u.</small></span>
                  <span className="num text-sm">{money(w.revenue, 0)}</span>
                </li>
              ))}
            </ol>
          ) : <p className="body-sm">Aún no hay ventas confirmadas.</p>}
        </Reveal>

        <Reveal delay={160} className="card admin-panel">
          <p className="eyebrow eyebrow--accent mb-2">Inventario</p>
          <h3 className="card-title mb-5">Stock bajo</h3>
          {stats.low_stock?.length ? (
            <ul className="grid gap-4">
              {stats.low_stock.map((w) => (
                <li key={w.id} className="flex items-center gap-3">
                  <span className="admin-thumb">{w.image && <img src={w.image} alt="" />}</span>
                  <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{w.name}</strong><small className="text-mute">{w.brand}</small></span>
                  <span className={`badge ${w.stock === 0 ? 'badge--danger' : 'badge--warn'}`}>{w.stock === 0 ? 'Agotado' : `${w.stock} u.`}</span>
                </li>
              ))}
            </ul>
          ) : <p className="body-sm flex items-center gap-2"><AlertTriangle size={14} /> Todo el catálogo tiene stock.</p>}
          <Link to="/admin/relojes" className="btn-link mt-6">Reponer stock</Link>
        </Reveal>
      </div>

      <Reveal className="card admin-panel">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="eyebrow eyebrow--accent mb-2">Actividad</p><h3 className="card-title">Pedidos recientes</h3></div>
          <Link to="/admin/pedidos" className="btn-link">Ver todos</Link>
        </div>
        {stats.recent_orders?.length === 0 ? <p className="body-sm">No hay pedidos aún.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th className="text-right">Total</th></tr></thead>
              <tbody>{stats.recent_orders.map((o) => (
                <tr key={o.order_number}>
                  <td className="num">{o.order_number}</td>
                  <td><span className="block">{o.customer_name || o.customer}</span>{o.customer_name && <small className="text-mute">{o.customer}</small>}</td>
                  <td className="body-sm">{new Date(o.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td><span className={`badge badge--${statusVariant[o.status] || 'accent'}`}>{o.status_display}</span></td>
                  <td className="price text-right">{money(o.total)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Reveal>
    </div>
  );
}
