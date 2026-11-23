import { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Reveal from '../../components/common/Reveal';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/dashboard/customers/').then(({ data }) => setCustomers(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <LoadingSpinner text="Cargando clientes..." />;
  return (
    <div className="grid gap-7">
      <div><p className="eyebrow eyebrow--accent mb-3">Comunidad</p><h2 className="display-md">Clientes <em>registrados</em> <span className="num text-mute align-middle">{customers.length}</span></h2></div>
      <Reveal className="table-wrap">
        <table className="table">
          <thead><tr><th>Correo</th><th>Nombre</th><th>Pedidos</th><th>Registro</th><th>Estado</th></tr></thead>
          <tbody>{customers.map((c) => <tr key={c.id}>
            <td>{c.email}</td><td>{c.first_name} {c.last_name}</td><td className="num">{c.order_count}</td>
            <td className="body-sm">{new Date(c.date_joined).toLocaleDateString('es-PE')}</td>
            <td><span className={`badge badge--${c.is_active ? 'success' : 'danger'}`}>{c.is_active ? 'Activo' : 'Inactivo'}</span></td>
          </tr>)}</tbody>
        </table>
        {customers.length === 0 && <p className="empty-state text-mute">No hay clientes registrados.</p>}
      </Reveal>
    </div>
  );
}
