import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const STATUS_LABELS = {
  pending: 'Pendiente', paid: 'Pagado', preparing: 'En preparación',
  shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado',
};
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700', paid: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700', shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
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
    <div>
      <h1 className="text-2xl font-semibold text-charcoal mb-6">Pedidos</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
              <th className="p-4">Pedido</th><th className="p-4">Cliente</th><th className="p-4">Total</th><th className="p-4">Estado</th><th className="p-4">Fecha</th>
            </tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} onClick={() => viewDetail(o.id)}
                  className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${selected === o.id ? 'bg-gold/5' : ''}`}>
                  <td className="p-4 font-medium">{o.order_number}</td>
                  <td className="p-4 text-gray-600">{o.user_email}</td>
                  <td className="p-4">{formatPrice(o.total)}</td>
                  <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[o.status]}`}>{o.status_display}</span></td>
                  <td className="p-4 text-gray-500 text-xs">{new Date(o.created_at).toLocaleDateString('es-PE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="text-center py-10 text-gray-500">No hay pedidos</p>}
        </div>

        <div>
          {detail ? (
            <div className="bg-white rounded-lg p-6 shadow-sm sticky top-6">
              <h2 className="text-lg font-semibold text-charcoal mb-2">{detail.order_number}</h2>
              <p className="text-sm text-gray-500 mb-4">{detail.user_name} ({detail.user_email})</p>

              <div className="space-y-2 mb-4">
                {detail.items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.quantity}× {item.watch_name}</span>
                    <span>{formatPrice(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 mb-4">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatPrice(detail.subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span>IGV</span><span>{formatPrice(detail.tax)}</span></div>
                <div className="flex justify-between font-semibold mt-1"><span>Total</span><span>{formatPrice(detail.total)}</span></div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Estado actual</p>
                <span className={`text-xs px-3 py-1 rounded-full ${STATUS_COLORS[detail.status]}`}>{detail.status_display}</span>
              </div>

              {TRANSITIONS[detail.status]?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Cambiar estado:</p>
                  <div className="flex gap-2 flex-wrap">
                    {TRANSITIONS[detail.status].map((s) => (
                      <button key={s} onClick={() => updateStatus(detail.id, s)}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gold hover:text-gold transition-colors">
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500">Envío: {detail.shipping_street}, {detail.shipping_city}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 shadow-sm text-center text-sm text-gray-500">
              Selecciona un pedido para ver los detalles
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
