import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', is_active: true });
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    setLoading(true);
    api.get('/catalog/admin/collections/').then(({ data }) => setCollections(data.results || data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.slug) payload.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (editMode === 'new') {
        await api.post('/catalog/admin/collections/', payload);
        toast.success('Colección creada');
      } else {
        await api.put(`/catalog/admin/collections/${editMode}/`, payload);
        toast.success('Colección actualizada');
      }
      setEditMode(null);
      fetch();
    } catch (err) {
      toast.error(JSON.stringify(err.response?.data || 'Error'));
    } finally { setSaving(false); }
  };

  const deleteCollection = async (id, name) => {
    if (!confirm(`¿Eliminar colección "${name}"?`)) return;
    try { await api.delete(`/catalog/admin/collections/${id}/`); toast.success('Eliminada'); fetch(); }
    catch { toast.error('No se puede eliminar'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-charcoal">Colecciones</h1>
        <button onClick={() => { setEditMode('new'); setForm({ name: '', slug: '', description: '', is_active: true }); }}
          className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-white px-4 py-2 rounded-lg text-sm"><Plus size={16} /> Nueva colección</button>
      </div>

      {editMode && (
        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs text-gray-500 mb-1">Nombre</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Slug</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold" /></div>
            <div className="md:col-span-2"><label className="block text-xs text-gray-500 mb-1">Descripción</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gold" /></div>
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
            <th className="p-4">Nombre</th><th className="p-4">Relojes</th><th className="p-4">Estado</th><th className="p-4">Acciones</th>
          </tr></thead>
          <tbody>
            {collections.map((c) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="p-4 font-medium">{c.name}</td>
                <td className="p-4">{c.watch_count || 0}</td>
                <td className="p-4">{c.is_active ? <span className="text-green-600 text-xs">Activa</span> : <span className="text-gray-400 text-xs">Inactiva</span>}</td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => { setEditMode(c.id); setForm(c); }} className="text-gray-400 hover:text-blue-600"><Pencil size={16} /></button>
                  <button onClick={() => deleteCollection(c.id, c.name)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
