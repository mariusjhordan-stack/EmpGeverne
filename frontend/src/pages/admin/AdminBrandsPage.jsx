import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', country: '', is_active: true });
  const [saving, setSaving] = useState(false);

  const fetchBrands = () => {
    setLoading(true);
    api.get('/catalog/admin/brands/').then(({ data }) => setBrands(data.results || data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchBrands(); }, []);

  const generateSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.slug) payload.slug = generateSlug(payload.name);
      if (editMode === 'new') {
        await api.post('/catalog/admin/brands/', payload);
        toast.success('Marca creada');
      } else {
        await api.put(`/catalog/admin/brands/${editMode}/`, payload);
        toast.success('Marca actualizada');
      }
      setEditMode(null);
      fetchBrands();
    } catch (err) {
      toast.error(JSON.stringify(err.response?.data || 'Error'));
    } finally { setSaving(false); }
  };

  const deleteBrand = async (id, name) => {
    if (!confirm(`¿Eliminar marca "${name}"?`)) return;
    try {
      await api.delete(`/catalog/admin/brands/${id}/`);
      toast.success('Marca eliminada');
      fetchBrands();
    } catch { toast.error('No se puede eliminar: tiene relojes asociados'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-charcoal">Marcas</h1>
        <button onClick={() => { setEditMode('new'); setForm({ name: '', slug: '', description: '', country: '', is_active: true }); }}
          className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-white px-4 py-2 rounded-lg text-sm"><Plus size={16} /> Nueva marca</button>
      </div>

      {editMode && (
        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs text-gray-500 mb-1">Nombre</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Slug</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">País</label>
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Descripción</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm mt-4"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Activa</label>
          <div className="flex gap-3 mt-4">
            <button onClick={save} disabled={saving} className="bg-gold text-white px-6 py-2 rounded-lg text-sm disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
            <button onClick={() => setEditMode(null)} className="border border-gray-200 text-gray-600 px-6 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
            <th className="p-4">Nombre</th><th className="p-4">País</th><th className="p-4">Relojes</th><th className="p-4">Estado</th><th className="p-4">Acciones</th>
          </tr></thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="border-b border-gray-50">
                <td className="p-4 font-medium">{b.name}</td>
                <td className="p-4 text-gray-600">{b.country}</td>
                <td className="p-4">{b.watch_count || 0}</td>
                <td className="p-4">{b.is_active ? <span className="text-green-600 text-xs">Activa</span> : <span className="text-gray-400 text-xs">Inactiva</span>}</td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => { setEditMode(b.id); setForm(b); }} className="text-gray-400 hover:text-blue-600"><Pencil size={16} /></button>
                  <button onClick={() => deleteBrand(b.id, b.name)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
