import { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/customers/')
      .then(({ data }) => setCustomers(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Cargando clientes..." />;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-charcoal mb-6">Clientes</h1>
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
            <th className="p-4">Email</th><th className="p-4">Nombre</th><th className="p-4">Pedidos</th><th className="p-4">Registro</th><th className="p-4">Estado</th>
          </tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="p-4 font-medium">{c.email}</td>
                <td className="p-4 text-gray-600">{c.first_name} {c.last_name}</td>
                <td className="p-4">{c.order_count}</td>
                <td className="p-4 text-gray-500 text-xs">{new Date(c.date_joined).toLocaleDateString('es-PE')}</td>
                <td className="p-4">{c.is_active ? <span className="text-green-600 text-xs">Activo</span> : <span className="text-red-500 text-xs">Inactivo</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && <p className="text-center py-10 text-gray-500">No hay clientes registrados</p>}
      </div>
    </div>
  );
}
