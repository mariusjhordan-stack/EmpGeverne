import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Reveal from '../../components/common/Reveal';

const STATUS_LABELS = {
  pending: 'Pendiente', paid: 'Pagado', preparing: 'En preparación',
  shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado',
};
const STATUS_COLORS = {
  pending: 'warn', paid: 'info', preparing: 'accent', shipped: 'info',
  delivered: 'success', cancelled: 'danger',
};
const TRANSITIONS = {
  pending: ['paid', 'cancelled'], paid: ['preparing', 'cancelled'],
  preparing: ['shipped'], shipped: ['delivered'], delivered: [], cancelled: [],
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const formatPrice = (p) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(p);

  const fetchOrders = () => {
    setLoading(true);
    api.get('/orders/admin/list/').then(({ data }) => setOrders(data.results || data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchOrders(); }, []);

  const viewDetail = async (id) => {
    setSelected(id);
    try {
      const { data } = await api.get(`/orders/admin/${id}/`);
      setDetail(data);
    } catch { toast.error('Error al cargar pedido'); }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/orders/admin/${id}/status/`, { status: newStatus });
      toast.success(`Estado actualizado a "${STATUS_LABELS[newStatus]}"`);
      fetchOrders();
      if (detail) viewDetail(id);
    } catch (err) {
      toast.error(err.response?.data?.errors?.status?.[0] || 'Error');
    }
  };

  if (loading) return <LoadingSpinner text="Cargando pedidos..." />;

  return (
    <div className="grid gap-7">
      <div><p className="eyebrow eyebrow--accent mb-3">Operaciones</p><h2 className="display-md">Pedidos <em>recibidos</em> <span className="num text-mute align-middle">{orders.length}</span></h2></div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <Reveal className="table-wrap">
          <table className="table">
            <thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>{orders.map((o) => <tr key={o.id} onClick={() => viewDetail(o.id)} className="cursor-pointer" style={selected === o.id ? { background: 'var(--champagne-dim)' } : undefined}>
              <td className="num text-accent">{o.order_number}</td><td>{o.user_email}</td><td className="price">{formatPrice(o.total)}</td>
              <td><span className={`badge badge--${STATUS_COLORS[o.status] || 'accent'}`}>{o.status_display}</span></td>
              <td className="body-sm">{new Date(o.created_at).toLocaleDateString('es-PE')}</td>
            </tr>)}</tbody>
          </table>
          {orders.length === 0 && <p className="empty-state text-mute">No hay pedidos.</p>}
        </Reveal>
        <Reveal delay={90} className="xl:sticky xl:top-24">
          {detail ? <div className="card">
            <p className="eyebrow eyebrow--accent mb-3">Detalle del pedido</p>
            <h3 className="card-title num mb-2">{detail.order_number}</h3>
            <p className="body-sm mb-6">{detail.user_name} ({detail.user_email})</p>
            <div className="grid gap-3 mb-6">{detail.items?.map((item) => <div key={item.id} className="flex justify-between gap-3 body-sm"><span>{item.quantity} × {item.watch_name}</span><span className="price">{formatPrice(item.subtotal)}</span></div>)}</div>
            <dl className="spec-list mb-6">
              <div className="spec-row"><dt>Subtotal</dt><dd className="num">{formatPrice(detail.subtotal)}</dd></div>
              <div className="spec-row"><dt>IGV</dt><dd className="num">{formatPrice(detail.tax)}</dd></div>
              <div className="spec-row"><dt>Total</dt><dd className="price">{formatPrice(detail.total)}</dd></div>
            </dl>
            <p className="eyebrow mb-2">Estado actual</p>
            <span className={`badge badge--${STATUS_COLORS[detail.status] || 'accent'}`}>{detail.status_display}</span>
            {TRANSITIONS[detail.status]?.length > 0 && <div className="mt-6">
              <p className="field-label mb-3">Cambiar estado</p>
              <div className="flex flex-wrap gap-2">{TRANSITIONS[detail.status].map((s) => <button key={s} onClick={() => updateStatus(detail.id, s)} className="btn btn-ghost btn-sm">{STATUS_LABELS[s]}</button>)}</div>
            </div>}
            <div className="divider my-6" />
            <p className="body-sm">Envío: {detail.shipping_street}, {detail.shipping_city}</p>
          </div> : <div className="card empty-state text-mute">Seleccione un pedido para ver los detalles.</div>}
        </Reveal>
      </div>
    </div>
  );
}
